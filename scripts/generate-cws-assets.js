const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "cws-assets");
fs.mkdirSync(outDir, { recursive: true });

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const css = fs.readFileSync(path.join(root, "content.css"), "utf8");

function renderAsset({ html, width, height, outputPath }) {
  const tmpHtml = path.join(os.tmpdir(), `cws-render-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmpHtml, html, "utf8");
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cws-render-profile-"));

  try {
    execFileSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-component-update",
        "--mute-audio",
        `--user-data-dir=${profileDir}`,
        `--window-size=${width},${height}`,
        `--screenshot=${outputPath}`,
        `file://${tmpHtml}`
      ],
      { stdio: "ignore", timeout: 20000 }
    );
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
    try { fs.unlinkSync(tmpHtml); } catch {}
  }
}

// 1. Screenshot 1: Single Image 1-Click Download (1280x800)
const screenshot1Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${css}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #18181b;
      color: #ececec;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 1280px;
      height: 800px;
      overflow: hidden;
      display: flex;
    }
    .sidebar {
      width: 260px;
      background: #111113;
      border-right: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 15px;
      color: #fff;
      padding: 8px 10px;
    }
    .brand svg { width: 22px; height: 22px; fill: #10a37f; }
    .chat-item {
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13.5px;
      color: #a1a1aa;
      cursor: pointer;
    }
    .chat-item.active {
      background: #27272a;
      color: #fff;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .header {
      height: 56px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .model-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 16px;
      color: #fff;
    }
    .content-area {
      flex: 1;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .prompt-box {
      font-size: 16px;
      color: #f4f4f5;
      background: #27272a;
      padding: 16px 20px;
      border-radius: 14px;
      max-width: 760px;
      align-self: flex-end;
    }
    .response-box {
      display: flex;
      gap: 18px;
      max-width: 900px;
    }
    .bot-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #10a37f;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bot-avatar svg { width: 18px; height: 18px; fill: #fff; }
    .image-card-container {
      display: flex;
      gap: 20px;
      margin-top: 8px;
    }
    .image-tile {
      width: 340px;
      height: 340px;
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border: 1px solid #3f3f46;
    }
    .art-bg-1 {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 40% 30%, #ec4899 0%, #8b5cf6 50%, #1e1b4b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .art-bg-2 {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 60% 40%, #06b6d4 0%, #3b82f6 50%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .art-symbol {
      width: 160px;
      height: 160px;
      opacity: 0.9;
    }
    .feature-tag {
      position: absolute;
      top: 20px;
      right: 28px;
      background: #10a37f;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(16,163,127,0.35);
    }
    .hero-banner {
      position: absolute;
      bottom: 24px;
      left: 60px;
      right: 60px;
      background: rgba(39, 39, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hero-title {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .hero-desc {
      font-size: 13px;
      color: #a1a1aa;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M22.28 9.87a5.98 5.98 0 0 0-.5-4.57 6.07 6.07 0 0 0-4.73-3.25 6 6 0 0 0-5.32 1.4A6.05 6.05 0 0 0 7.3 2.1a6.07 6.07 0 0 0-4.73 3.25 5.99 5.99 0 0 0 .5 8.92 6.07 6.07 0 0 0 .5 4.57 6.07 6.07 0 0 0 4.73 3.25 6 6 0 0 0 5.32-1.4 6.05 6.05 0 0 0 4.43 1.35 6.07 6.07 0 0 0 4.73-3.25 5.99 5.99 0 0 0-.5-8.92z"/></svg>
      <span>ChatGPT</span>
    </div>
    <div class="chat-item active">Neon Crystal Prism Art</div>
    <div class="chat-item">Cyberpunk Cityscape 4K</div>
    <div class="chat-item">Botanical Garden Macro</div>
  </div>
  <div class="main">
    <div class="header">
      <div class="model-badge">ChatGPT 4o</div>
    </div>
    <div class="content-area">
      <div class="prompt-box">
        Create an ethereal glowing neon crystal prism refracting rainbow light beams in deep space.
      </div>
      <div class="response-box">
        <div class="bot-avatar">
          <svg viewBox="0 0 24 24"><path d="M22.28 9.87a5.98 5.98 0 0 0-.5-4.57 6.07 6.07 0 0 0-4.73-3.25 6 6 0 0 0-5.32 1.4A6.05 6.05 0 0 0 7.3 2.1a6.07 6.07 0 0 0-4.73 3.25 5.99 5.99 0 0 0 .5 8.92 6.07 6.07 0 0 0 .5 4.57 6.07 6.07 0 0 0 4.73 3.25 6 6 0 0 0 5.32-1.4 6.05 6.05 0 0 0 4.43 1.35 6.07 6.07 0 0 0 4.73-3.25 5.99 5.99 0 0 0-.5-8.92z"/></svg>
        </div>
        <div>
          <p style="font-size: 15px; margin-bottom: 12px; color: #d4d4d8;">Here are the generated full-size crystal prism visuals:</p>
          <div class="image-card-container">
            <div class="image-tile cgqid-host" style="opacity: 1;">
              <div class="art-bg-1">
                <svg class="art-symbol" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="3">
                  <polygon points="50 10, 90 85, 10 85" />
                  <polygon points="50 25, 75 75, 25 75" stroke="#ec4899" stroke-width="2" />
                </svg>
              </div>
              <button class="cgqid-select" type="button" aria-label="Select"><span class="cgqid-select-box"></span></button>
              <button class="cgqid-button" type="button" aria-label="Download" style="opacity: 1 !important; transform: scale(1.1);">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="image-tile cgqid-host">
              <div class="art-bg-2">
                <svg class="art-symbol" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="3">
                  <circle cx="50" cy="50" r="38" />
                  <polygon points="50 12, 88 50, 50 88, 12 50" stroke="#38bdf8" stroke-width="2" />
                </svg>
              </div>
              <button class="cgqid-select" type="button"><span class="cgqid-select-box"></span></button>
              <button class="cgqid-button" type="button" style="opacity: 0.85;">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="hero-banner">
      <div>
        <div class="hero-title">1-Click Full-Size Image Download</div>
        <div class="hero-desc">Hover any ChatGPT generated image tile to instantly save the uncompressed original full-resolution asset.</div>
      </div>
      <div class="feature-tag" style="position: static;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Instant Save
      </div>
    </div>
  </div>
</body>
</html>`;

// 2. Screenshot 2: Batch Select & Bulk Download (1280x800)
const screenshot2Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${css}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #18181b;
      color: #ececec;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 1280px;
      height: 800px;
      overflow: hidden;
      display: flex;
    }
    .main {
      flex: 1;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .title-group h1 {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
    }
    .title-group p {
      font-size: 14px;
      color: #a1a1aa;
      margin-top: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-top: 10px;
    }
    .tile {
      height: 240px;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      border: 1px solid #3f3f46;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }
    .t1 { background: linear-gradient(135deg, #f43f5e, #fb923c); }
    .t2 { background: linear-gradient(135deg, #a855f7, #6366f1); }
    .t3 { background: linear-gradient(135deg, #06b6d4, #10b981); }
    .t4 { background: linear-gradient(135deg, #f59e0b, #e11d48); }
    .hero-banner {
      position: absolute;
      bottom: 24px;
      left: 60px;
      right: 60px;
      background: rgba(39, 39, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hero-title { font-size: 18px; font-weight: 700; color: #fff; }
    .hero-desc { font-size: 13px; color: #a1a1aa; margin-top: 2px; }
  </style>
</head>
<body data-cgqid-bulk-active="true">
  <div class="main">
    <div class="header-bar">
      <div class="title-group">
        <h1>Batch Image Selection</h1>
        <p>Select multiple images across conversations or your library and download them simultaneously.</p>
      </div>
      <button class="cgqid-library-download-all" type="button">
        <span>Download all (4)</span>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div class="grid">
      <div class="tile t1 cgqid-host" data-cgqid-selected="true">
        <button class="cgqid-select" type="button" role="checkbox" aria-checked="true"><span class="cgqid-select-box"></span></button>
        <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
      </div>
      <div class="tile t2 cgqid-host" data-cgqid-selected="true">
        <button class="cgqid-select" type="button" role="checkbox" aria-checked="true"><span class="cgqid-select-box"></span></button>
        <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
      </div>
      <div class="tile t3 cgqid-host" data-cgqid-selected="true">
        <button class="cgqid-select" type="button" role="checkbox" aria-checked="true"><span class="cgqid-select-box"></span></button>
        <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
      </div>
      <div class="tile t4 cgqid-host">
        <button class="cgqid-select" type="button" role="checkbox" aria-checked="false"><span class="cgqid-select-box"></span></button>
        <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
      </div>
    </div>

    <!-- Floating bulk action bar -->
    <div class="cgqid-bulk-bar" style="bottom: 120px !important;">
      <span class="cgqid-bulk-count">3 images selected</span>
      <button class="cgqid-bulk-download" type="button">Download selected</button>
      <button class="cgqid-bulk-clear" type="button">Clear selection</button>
    </div>

    <div class="hero-banner">
      <div>
        <div class="hero-title">Floating Batch Action Bar</div>
        <div class="hero-desc">Tick checkboxes to batch download multiple images simultaneously with automatic sorting and safe deduplication.</div>
      </div>
      <div style="background:#10a37f;color:#fff;font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;">
        Zero Hassle
      </div>
    </div>
  </div>
</body>
</html>`;

// 3. Screenshot 3: Library Download All (1280x800)
const screenshot3Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${css}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #18181b;
      color: #ececec;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 1280px;
      height: 800px;
      overflow: hidden;
      padding: 40px 60px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .library-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 1px solid #27272a;
    }
    .library-title {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 30px;
    }
    .card {
      height: 260px;
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      border: 1px solid #3f3f46;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .c1 { background: radial-gradient(circle at 50% 50%, #8b5cf6, #1e1b4b); }
    .c2 { background: radial-gradient(circle at 50% 50%, #ec4899, #4c0519); }
    .c3 { background: radial-gradient(circle at 50% 50%, #10b981, #064e3b); }
    .hero-banner {
      position: absolute;
      bottom: 24px;
      left: 60px;
      right: 60px;
      background: rgba(39, 39, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hero-title { font-size: 18px; font-weight: 700; color: #fff; }
    .hero-desc { font-size: 13px; color: #a1a1aa; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="library-header">
    <div class="library-title">
      <span>My images</span>
      <button class="cgqid-library-download-all" type="button" style="transform: scale(1.1); margin-left: 20px;">
        <span>Download all</span>
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div style="color: #a1a1aa; font-size: 14px;">128 items in library</div>
  </div>

  <div class="grid">
    <div class="card c1 cgqid-host">
      <button class="cgqid-select" type="button"><span class="cgqid-select-box"></span></button>
      <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
    </div>
    <div class="card c2 cgqid-host">
      <button class="cgqid-select" type="button"><span class="cgqid-select-box"></span></button>
      <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
    </div>
    <div class="card c3 cgqid-host">
      <button class="cgqid-select" type="button"><span class="cgqid-select-box"></span></button>
      <button class="cgqid-button" type="button"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg></button>
    </div>
  </div>

  <div class="hero-banner">
    <div>
      <div class="hero-title">Auto-Scroll Library Discovery</div>
      <div class="hero-desc">One click scroll-loads all lazy-loaded library tiles, verifies full-size native links, and saves every unique piece cleanly.</div>
    </div>
    <div style="background:#10a37f;color:#fff;font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;">
      Full Library Export
    </div>
  </div>
</body>
</html>`;

// 4. Screenshot 4: Extension Popup & Privacy (1280x800)
const popupCss = fs.readFileSync(path.join(root, "popup.css"), "utf8");
const screenshot4Html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${popupCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #121214;
      color: #ececec;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 1280px;
      height: 800px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 60px;
      padding: 60px;
    }
    .feature-list {
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,163,127,0.15);
      border: 1px solid #10a37f;
      color: #10a37f;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      width: fit-content;
    }
    .feature-list h1 {
      font-size: 36px;
      font-weight: 800;
      line-height: 1.2;
      color: #fff;
    }
    .feature-list p {
      font-size: 16px;
      color: #a1a1aa;
      line-height: 1.6;
    }
    .perks {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }
    .perk-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      color: #e4e4e7;
    }
    .perk-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #27272a;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #10a37f;
      flex-shrink: 0;
    }
    .popup-wrapper {
      transform: scale(1.35);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border: 1px solid #3f3f46;
      border-radius: 16px;
    }
  </style>
</head>
<body>
  <div class="feature-list">
    <div class="badge">Privacy-First Architecture</div>
    <h1>Lightweight, Safe & Zero Data Collection</h1>
    <p>Operates entirely locally inside your browser. No external API calls, no third-party tracking, and no broad host permissions.</p>
    <div class="perks">
      <div class="perk-item">
        <div class="perk-icon">✓</div>
        <span>Native full-resolution image quality preservation</span>
      </div>
      <div class="perk-item">
        <div class="perk-icon">✓</div>
        <span>Automatic collision avoidance with native ChatGPT controls</span>
      </div>
      <div class="perk-item">
        <div class="perk-icon">✓</div>
        <span>Works seamlessly across chat threads & My Images library</span>
      </div>
      <div class="perk-item">
        <div class="perk-icon">✓</div>
        <span>Safe, sortable timestamped filenames</span>
      </div>
    </div>
  </div>

  <div class="popup-wrapper">
    <main class="panel" style="width: 280px;">
      <header>
        <div class="mark" aria-hidden="true"></div>
        <div>
          <h1>Quick Download</h1>
          <p id="status" style="color: #10a37f; font-weight: 500;">Active · 6 images detected</p>
        </div>
      </header>
      <div class="actions">
        <button id="downloadVisible" type="button">Download visible (6)</button>
        <button id="rescan" type="button" class="secondary">Rescan</button>
      </div>
      <p class="hint">Hover an image tile, select checkboxes, or use Download all beside My images to scroll-load and save unique images.</p>
    </main>
  </div>
</body>
</html>`;

// 5. Promo Small (440x280)
const promoSmallHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 80% 20%, #10a37f 0%, #064e3b 40%, #09090b 100%);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 440px;
      height: 280px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 28px;
      position: relative;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content h1 {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.2;
      margin-top: 10px;
    }
    .content p {
      font-size: 13px;
      color: #d1d5db;
      margin-top: 6px;
      line-height: 1.4;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #a7f3d0;
      font-weight: 500;
    }
    .glow-circle {
      position: absolute;
      right: -30px;
      bottom: -30px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%);
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div>
    <div class="badge">Chrome Extension</div>
    <div class="content">
      <h1>ChatGPT Images<br>Quick Download</h1>
      <p>1-Click & batch download full-size AI images directly from ChatGPT.</p>
    </div>
  </div>
  <div class="footer">
    <span>★ High Speed</span>
    <span>★ Native Quality</span>
    <span>★ 100% Free</span>
  </div>
  <div class="glow-circle"></div>
</body>
</html>`;

// 6. Promo Marquee (1400x560)
const promoMarqueeHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 85% 30%, #10a37f 0%, #064e3b 45%, #09090b 100%);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 1400px;
      height: 560px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 100px;
      position: relative;
    }
    .left {
      max-width: 620px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .left h1 {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.15;
    }
    .left p {
      font-size: 18px;
      color: #d1d5db;
      line-height: 1.6;
    }
    .features {
      display: flex;
      gap: 24px;
      margin-top: 10px;
    }
    .feat {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #a7f3d0;
    }
    .preview-card {
      width: 440px;
      height: 380px;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 20px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.6);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .pc-header {
      height: 48px;
      background: #27272a;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .pc-body {
      flex: 1;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: radial-gradient(circle at 50% 50%, #1e1b4b, #0f172a);
      align-items: center;
      justify-content: center;
    }
    .btn-demo {
      background: #10a37f;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      padding: 10px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(16,163,127,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="left">
    <div class="badge">Official Chrome Extension</div>
    <h1>ChatGPT Images<br>Quick Download</h1>
    <p>Effortlessly save full-resolution AI images from ChatGPT. One-click instant save, batch select, and full library export.</p>
    <div class="features">
      <div class="feat">✓ 1-Click Download</div>
      <div class="feat">✓ Batch Selection</div>
      <div class="feat">✓ Zero Tracking</div>
    </div>
  </div>

  <div class="preview-card">
    <div class="pc-header">
      <div class="dot" style="background: #ef4444;"></div>
      <div class="dot" style="background: #f59e0b;"></div>
      <div class="dot" style="background: #10b981;"></div>
    </div>
    <div class="pc-body">
      <div style="font-size: 48px;">🎨</div>
      <div style="font-size: 16px; font-weight: 600; color: #fff;">Full-Resolution Asset</div>
      <div class="btn-demo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M5 19h14"/></svg>
        Download image
      </div>
    </div>
  </div>
</body>
</html>`;

console.log("Generating screenshot 1 (1280x800)...");
renderAsset({
  html: screenshot1Html,
  width: 1280,
  height: 800,
  outputPath: path.join(outDir, "screenshot-1-single-download.png")
});

console.log("Generating screenshot 2 (1280x800)...");
renderAsset({
  html: screenshot2Html,
  width: 1280,
  height: 800,
  outputPath: path.join(outDir, "screenshot-2-batch-select.png")
});

console.log("Generating screenshot 3 (1280x800)...");
renderAsset({
  html: screenshot3Html,
  width: 1280,
  height: 800,
  outputPath: path.join(outDir, "screenshot-3-download-all.png")
});

console.log("Generating screenshot 4 (1280x800)...");
renderAsset({
  html: screenshot4Html,
  width: 1280,
  height: 800,
  outputPath: path.join(outDir, "screenshot-4-popup-settings.png")
});

console.log("Generating promo small (440x280)...");
renderAsset({
  html: promoSmallHtml,
  width: 440,
  height: 280,
  outputPath: path.join(outDir, "promo-small-440x280.png")
});

console.log("Generating promo marquee (1400x560)...");
renderAsset({
  html: promoMarqueeHtml,
  width: 1400,
  height: 560,
  outputPath: path.join(outDir, "promo-marquee-1400x560.png")
});

// Copy icon
fs.copyFileSync(path.join(root, "icons", "icon128.png"), path.join(outDir, "icon-128.png"));

console.log("All CWS assets generated successfully in:", outDir);
