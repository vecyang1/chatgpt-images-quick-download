const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const { findChromeExecutable } = require("./visual-smoke.js");

const root = path.resolve(__dirname, "..");

async function main() {
  const chrome = findChromeExecutable();
  assert(chrome, "Google Chrome or Chromium binary was not found. Set CHROME_BIN to run the extension E2E smoke.");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cgqid-extension-e2e-"));
  const keyPath = path.join(tmpDir, "key.pem");
  const certPath = path.join(tmpDir, "cert.pem");
  createCertificate({ keyPath, certPath });

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    },
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(buildPage(server.address().port));
    }
  );

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const debugPort = await getFreePort();
  const chromeProcess = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--ignore-certificate-errors",
      "--window-size=900,700",
      "--window-position=-12000,-12000",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${path.join(tmpDir, "profile")}`,
      "--host-resolver-rules=MAP chatgpt.com 127.0.0.1",
      `https://chatgpt.com:${port}/images`
    ],
    { stdio: "ignore" }
  );

  try {
    const client = await connectToPage(debugPort);
    const loaded = await evaluateWithNavigationRetry(client, `
      new Promise((resolve) => {
        const started = Date.now();
        const tick = () => {
          const image = document.querySelector("img");
          if (location.hostname === "chatgpt.com" && image?.complete && image.naturalWidth >= 128) {
            resolve(true);
            return;
          }

          if (Date.now() - started > 5000) {
            resolve(false);
            return;
          }

          setTimeout(tick, 100);
        };

        tick();
      })
    `);
    assert.equal(loaded, true, "synthetic ChatGPT image page did not finish loading");
    const helperSource = fs.readFileSync(path.join(root, "src", "imageTargets.js"), "utf8");
    const contentSource = fs.readFileSync(path.join(root, "content.js"), "utf8");
    await client.evaluate(`
      {
        const chrome = {
          runtime: {
            onMessage: { addListener() {} },
            sendMessage: async (message) => {
              document.body.dataset.runtimeDownloadCount = String(
                Number(document.body.dataset.runtimeDownloadCount || 0) + 1
              );
              document.body.dataset.runtimeDownloadUrls = [
                document.body.dataset.runtimeDownloadUrls || "",
                message?.url || ""
              ]
                .filter(Boolean)
                .join("|");
              return { ok: true };
            }
          }
        };
        ${helperSource}
        ${contentSource}
      }
      //# sourceURL=cgqid-content-e2e.js
    `);
    const dom = await client.evaluate(`
      new Promise((resolve) => {
        setTimeout(() => {
          const button = document.querySelector(".cgqid-button");
          if (button?.getAttribute("data-cgqid-bound") === "true") {
            document.body.dataset.overlayBound = "true";
            button.remove();
          }
        }, 1200);

        setTimeout(() => {
          const button = document.querySelector(".cgqid-button");
          if (button?.getAttribute("data-cgqid-bound") === "true") {
            document.body.dataset.restored = "true";
            button.click();
          }
        }, 2400);

        setTimeout(() => {
          const selectors = Array.from(document.querySelectorAll(".cgqid-select"));
          document.body.dataset.bulkControls = String(selectors.length);
          selectors.slice(0, 2).forEach((selector) => selector.click());

          const countText = document.querySelector(".cgqid-bulk-count")?.textContent || "";
          document.body.dataset.bulkCountText = countText;
          document.querySelector(".cgqid-bulk-download")?.click();
        }, 5000);

        setTimeout(() => {
          document.body.dataset.bulkSaveCount = document.body.dataset.nativeSaveCount || "0";
        }, 7900);

        setTimeout(() => {
          const downloadAll = document.querySelector(".cgqid-library-download-all");
          document.body.dataset.downloadAllControl = downloadAll?.textContent?.trim() || "";
          downloadAll?.click();
        }, 8500);

        setTimeout(() => resolve(document.documentElement.outerHTML), 18000);
      })
    `);

    assert.match(dom, /data-overlay-bound="true"/, "overlay button should be injected with the current binding marker");
    assert.match(dom, /data-restored="true"/, "overlay should self-heal after the page removes the first button");
    assert.match(dom, /data-bulk-controls="3"/, "bulk select controls should be injected for every image tile");
    assert.match(dom, /data-bulk-count-text="2 selected"/, "bulk toolbar should show the selected image count");
    assert.match(dom, /data-native-saved="true"/, "native viewer Save button should be clicked");
    assert.match(dom, /data-native-closed="true"/, "native viewer should be closed after Save");
    assert.match(dom, /data-bulk-save-count="3"/, "bulk download should save both selected images after the single-image click");
    assert.match(dom, /data-download-all-control="Download all"/, "library header should include a Download all control");
    assert.match(dom, /data-lazy-appended="true"/, "Download all should scroll the library to discover more images");
    assert.doesNotMatch(dom, /data-runtime-download-count="[1-9]/, "Download all should not use direct URL fallback for thumbnails");
    assert.doesNotMatch(
      dom,
      /data-runtime-download-urls="[^"]*thumb-only\.png/,
      "Download all should not download thumbnail-only grid URLs"
    );
    const datasetSummary = (dom.match(/data-[a-z-]+="[^"]*"/g) || []).join(" ");
    assert.match(
      dom,
      /data-native-save-count="5"/,
      `Download all should skip duplicate and already downloaded targets: ${datasetSummary}`
    );
    await client.close();
  } finally {
    chromeProcess.kill("SIGTERM");
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("Extension content E2E smoke passed.");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function connectToPage(debugPort) {
  const endpoint = `http://127.0.0.1:${debugPort}/json/list`;
  const started = Date.now();
  let page;

  while (Date.now() - started < 10000) {
    try {
      const targets = await fetch(endpoint).then((response) => response.json());
      page = targets.find((target) => target.type === "page" && target.url.includes("chatgpt.com"));
      if (page?.webSocketDebuggerUrl) break;
    } catch {
      // Chrome is still starting.
    }

    await wait(120);
  }

  assert(page?.webSocketDebuggerUrl, "Chrome DevTools page target was not available.");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message || "CDP command failed"));
    else resolve(message.result);
  });

  function call(method, params = {}) {
    const commandId = ++id;
    socket.send(JSON.stringify({ id: commandId, method, params }));
    return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }));
  }

  await call("Runtime.enable");

  return {
    async evaluate(expression) {
      const result = await call("Runtime.evaluate", {
        awaitPromise: true,
        expression,
        returnByValue: true
      });

      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.exception?.description ||
            result.exceptionDetails.exception?.value ||
            result.exceptionDetails.text ||
            "Runtime evaluation failed"
        );
      }

      return result.result.value;
    },
    close() {
      socket.close();
    }
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evaluateWithNavigationRetry(client, expression) {
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await client.evaluate(expression);
    } catch (error) {
      lastError = error;
      if (!/context was destroyed|Cannot find context/i.test(String(error?.message || error))) throw error;
      await wait(500);
    }
  }

  throw lastError;
}

function createCertificate({ keyPath, certPath }) {
  const openssl = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      "/CN=chatgpt.com"
    ],
    { encoding: "utf8" }
  );

  if (openssl.error?.code === "ENOENT") {
    throw new Error("The `openssl` command was not found. Install openssl to run the extension E2E smoke.");
  }

  if (openssl.status !== 0) {
    throw new Error(openssl.stderr || "openssl failed to create a temporary certificate.");
  }
}

function buildPage(port) {
  const imageA =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="#214"/><circle cx="320" cy="250" r="150" fill="#f8d8c8"/></svg>'
    );
  const imageB =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="#123"/><rect x="160" y="160" width="320" height="320" fill="#d8f8e8"/></svg>'
    );
  const imageC =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="#321"/><path d="M120 520 320 120 520 520Z" fill="#d8e8f8"/></svg>'
    );

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { background: #090909; margin: 0; }
      h2 { color: white; font: 600 28px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 72px 80px 0; }
      main { display: flex; gap: 24px; padding: 28px 80px 80px; }
      .spacer { height: 1200px; }
      .tile { height: 360px; position: relative; width: 360px; }
      img { display: block; height: 360px; object-fit: cover; width: 360px; }
      .native-edit { bottom: 24px; left: 24px; position: absolute; }
      .native-share { bottom: 24px; position: absolute; right: 24px; }
      #viewer { background: rgba(0,0,0,.82); inset: 0; position: fixed; }
      #viewer[hidden] { display: none; }
    </style>
  </head>
  <body>
    <h2>My images</h2>
    <main>
      ${[imageA, imageA, imageB]
        .map(
          (image, index) => `
            <div class="tile">
              <img alt="Generated smoke image ${index + 1}" src="${image}">
              <button aria-label="Open image in full view" class="open"></button>
              <button class="native-edit">Edit</button>
              <button class="native-share">Share</button>
            </div>
          `
        )
        .join("")}
    </main>
    <div class="spacer"></div>
    <div aria-modal="true" hidden id="viewer" role="dialog">
      <button id="save">Save</button>
      <button aria-label="Close fullscreen view" id="close">Close</button>
    </div>
    <script>
      const openButtons = Array.from(document.querySelectorAll(".open"));
      const viewerElement = document.getElementById("viewer");
      const saveButton = document.getElementById("save");
      const closeButton = document.getElementById("close");

      openButtons.forEach((openButton) => openButton.addEventListener("click", () => {
        viewerElement.hidden = false;
      }));
      saveButton.addEventListener("click", () => {
        document.body.dataset.nativeSaveCount = String(Number(document.body.dataset.nativeSaveCount || 0) + 1);
        document.body.dataset.nativeSaved = "true";
      });
      closeButton.addEventListener("click", () => {
        document.body.dataset.nativeCloseCount = String(Number(document.body.dataset.nativeCloseCount || 0) + 1);
        document.body.dataset.nativeClosed = "true";
        viewerElement.hidden = true;
      });
      window.addEventListener("scroll", () => {
        if (document.body.dataset.lazyAppended === "true" || window.scrollY < 300) return;
        document.body.dataset.lazyAppended = "true";
        const tileWithNativeOpen = document.createElement("div");
        tileWithNativeOpen.className = "tile";
        tileWithNativeOpen.innerHTML = \`
          <img alt="Generated smoke image 4" src="${imageC}">
          <button aria-label="Open image in full view" class="open"></button>
          <button class="native-edit">Edit</button>
          <button class="native-share">Share</button>
        \`;
        tileWithNativeOpen.querySelector(".open").addEventListener("click", () => {
          viewerElement.hidden = false;
        });
        document.querySelector("main").appendChild(tileWithNativeOpen);

        const thumbnailOnlyTile = document.createElement("div");
        thumbnailOnlyTile.className = "tile";
        thumbnailOnlyTile.innerHTML = \`
          <img alt="Thumbnail-only smoke image" src="https://chatgpt.com:${port}/thumb-only.png">
          <button class="native-edit">Edit</button>
          <button class="native-share">Share</button>
        \`;
        document.querySelector("main").appendChild(thumbnailOnlyTile);
      }, { passive: true });
    </script>
  </body>
</html>`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
