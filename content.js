(function chatGPTImagesQuickDownload() {
  const helpers = globalThis.ChatGPTImagesDownloader;
  if (!helpers) return;

  const DECORATED_ATTR = "data-cgqid-decorated";
  const HOST_ATTR = "data-cgqid-host";
  const BUTTON_BOUND_ATTR = "data-cgqid-bound";
  const SELECT_BOUND_ATTR = "data-cgqid-select-bound";
  const SELECTED_ATTR = "data-cgqid-selected";
  const BULK_BAR_ID = "cgqid-bulk-bar";
  const LIBRARY_DOWNLOAD_ALL_CLASS = "cgqid-library-download-all";
  const LIBRARY_DOWNLOAD_ALL_BOUND_ATTR = "data-cgqid-library-download-all-bound";
  const LIBRARY_DISCOVERY_MAX_PASSES = 80;
  const LIBRARY_DISCOVERY_STABLE_PASSES = 4;
  const LIBRARY_DISCOVERY_WAIT_MS = 700;
  const DOWNLOAD_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 19h14" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
    </svg>
  `;

  let scanQueued = false;
  let latestPath = location.pathname;
  let toastTimer;
  const selectedHosts = new Set();
  const downloadedKeys = new Set();

  function isSupportedPage() {
    return helpers.isSupportedChatGPTSurface(location);
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;

    const run = () => {
      scanQueued = false;
      scanImages();
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(run);
    } else if (window.requestAnimationFrame) {
      window.requestAnimationFrame(run);
    } else {
      window.setTimeout(run, 0);
    }
  }

  function scanImages() {
    if (!isSupportedPage()) {
      clearSelectedHosts();
      removeLibraryDownloadAllButtons();
      return;
    }

    const root = document.querySelector("main") || document.querySelector('[role="main"]') || document.body;
    const images = Array.from(root.querySelectorAll("img"));
    let decorated = 0;

    for (const image of images) {
      if (!shouldDecorate(image)) {
        image.removeAttribute(DECORATED_ATTR);
        continue;
      }

      if (decorateImage(image)) decorated += 1;
    }

    cleanupStaleDecorations(root);

    if (decorated) {
      document.documentElement.dataset.cgqidReady = "true";
    }

    updateBulkBar();
    syncLibraryDownloadAllButton();
  }

  function shouldDecorate(image) {
    const rect = image.getBoundingClientRect();
    const inNavigation = Boolean(image.closest("nav, aside, [role='navigation'], [aria-label*='sidebar' i]"));
    if (
      !helpers.isLikelyTargetImage({
        width: rect.width,
        height: rect.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        inNavigation
      })
    ) {
      return false;
    }

    const host = findHost(image);
    const urls = helpers.rankDownloadUrls({
      imageLike: image,
      candidateUrls: collectCandidateUrls(host || image)
    });

    return Boolean(urls.length || findNativeOpenButton(image, host));
  }

  function decorateImage(image) {
    const host = findHost(image);
    if (!host) return false;

    image.setAttribute(DECORATED_ATTR, "true");
    host.setAttribute(HOST_ATTR, "true");
    host.classList.add("cgqid-host");

    const buttons = Array.from(host.children).filter((child) => child.classList?.contains("cgqid-button"));
    const reusableButton = buttons.find((button) => button.getAttribute(BUTTON_BOUND_ATTR) === "true");
    const button = reusableButton || createDownloadButton(host);
    const selectors = Array.from(host.children).filter((child) => child.classList?.contains("cgqid-select"));
    const reusableSelector = selectors.find((selector) => selector.getAttribute(SELECT_BOUND_ATTR) === "true");
    const selector = reusableSelector || createSelectButton(host);

    for (const staleButton of buttons) {
      if (staleButton !== button) staleButton.remove();
    }

    for (const staleSelector of selectors) {
      if (staleSelector !== selector) staleSelector.remove();
    }

    if (!reusableButton) host.appendChild(button);
    if (!reusableSelector) host.appendChild(selector);
    syncSelectControl(host, selector);

    return true;
  }

  function createDownloadButton(host) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cgqid-button";
    button.setAttribute(BUTTON_BOUND_ATTR, "true");
    button.setAttribute("aria-label", "Download this image");
    button.title = "Download this image";
    button.innerHTML = DOWNLOAD_ICON;

    button.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const image = findCurrentImageForHost(host);
        if (!image) {
          showToast("No downloadable image URL found.");
          return;
        }

        await downloadImage(image, button);
      },
      true
    );

    return button;
  }

  function createSelectButton(host) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cgqid-select";
    button.setAttribute(SELECT_BOUND_ATTR, "true");
    button.setAttribute("role", "checkbox");
    button.setAttribute("aria-checked", "false");
    button.setAttribute("aria-label", "Select this image for batch download");
    button.title = "Select this image";
    button.innerHTML = '<span class="cgqid-select-box" aria-hidden="true"></span>';

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const image = findCurrentImageForHost(host);
        if (!image) {
          setHostSelected(host, false);
          showToast("No downloadable image URL found.");
          return;
        }

        setHostSelected(host, !selectedHosts.has(host));
      },
      true
    );

    return button;
  }

  function cleanupStaleDecorations(root) {
    const hosts = Array.from(root.querySelectorAll(`[${HOST_ATTR}]`));

    for (const host of hosts) {
      if (!(host instanceof HTMLElement)) continue;

      const image = findCurrentImageForHost(host);
      if (image) continue;

      for (const button of Array.from(host.children)) {
        if (button.classList?.contains("cgqid-button") || button.classList?.contains("cgqid-select")) {
          button.remove();
        }
      }

      selectedHosts.delete(host);
      host.removeAttribute(HOST_ATTR);
      host.removeAttribute(SELECTED_ATTR);
      host.classList.remove("cgqid-host");
    }

    updateBulkBar();
  }

  function setHostSelected(host, selected) {
    if (!(host instanceof HTMLElement)) return;

    if (selected) {
      selectedHosts.add(host);
      host.setAttribute(SELECTED_ATTR, "true");
    } else {
      selectedHosts.delete(host);
      host.removeAttribute(SELECTED_ATTR);
    }

    syncSelectControl(host);
    updateBulkBar();
  }

  function syncSelectControl(host, control = host?.querySelector?.(".cgqid-select")) {
    if (!(host instanceof HTMLElement) || !(control instanceof HTMLElement)) return;

    const selected = selectedHosts.has(host);
    control.setAttribute("aria-checked", selected ? "true" : "false");
    control.title = selected ? "Deselect this image" : "Select this image";
  }

  function clearSelectedHosts() {
    for (const host of Array.from(selectedHosts)) {
      if (host instanceof HTMLElement) {
        selectedHosts.delete(host);
        host.removeAttribute(SELECTED_ATTR);
        syncSelectControl(host);
      }
    }

    updateBulkBar();
  }

  function getSelectedItems() {
    const items = [];

    for (const host of Array.from(selectedHosts)) {
      if (!(host instanceof HTMLElement) || !host.isConnected) {
        selectedHosts.delete(host);
        continue;
      }

      const image = findCurrentImageForHost(host);
      if (!image) {
        setHostSelected(host, false);
        continue;
      }

      items.push({ host, image });
    }

    return items;
  }

  function ensureBulkBar() {
    let bar = document.getElementById(BULK_BAR_ID);
    if (bar) return bar;

    bar = document.createElement("div");
    bar.id = BULK_BAR_ID;
    bar.className = "cgqid-bulk-bar";
    bar.hidden = true;
    bar.innerHTML = `
      <span class="cgqid-bulk-count">0 selected</span>
      <button class="cgqid-bulk-download" type="button">Download selected</button>
      <button class="cgqid-bulk-clear" type="button" aria-label="Clear selected images">Clear</button>
    `;

    bar.querySelector(".cgqid-bulk-download")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      downloadSelectedImages(event.currentTarget);
    });

    bar.querySelector(".cgqid-bulk-clear")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearSelectedHosts();
    });

    document.documentElement.appendChild(bar);
    return bar;
  }

  function updateBulkBar() {
    const items = getSelectedItemsWithoutValidation();
    const bar = document.getElementById(BULK_BAR_ID) || (items.length ? ensureBulkBar() : null);

    document.documentElement.dataset.cgqidBulkActive = items.length ? "true" : "false";
    if (!bar) return;

    const count = bar.querySelector(".cgqid-bulk-count");
    const downloadButton = bar.querySelector(".cgqid-bulk-download");
    if (count) count.textContent = `${items.length} selected`;
    if (downloadButton) downloadButton.disabled = !items.length;
    bar.hidden = !items.length;
  }

  function getSelectedItemsWithoutValidation() {
    return Array.from(selectedHosts).filter((host) => host instanceof HTMLElement && host.isConnected);
  }

  async function downloadSelectedImages(triggerButton) {
    const items = getSelectedItems();
    if (!items.length) {
      showToast("No selected images.");
      return { downloaded: 0 };
    }

    triggerButton?.classList.add("cgqid-busy");
    triggerButton?.setAttribute("disabled", "true");

    let downloaded = 0;
    try {
      for (const { host, image } of items) {
        const button = host.querySelector(".cgqid-button") || triggerButton;
        const ok = await downloadImage(image, button, { nativeOnly: true, quiet: true });
        if (ok) downloaded += 1;
        await wait(140);
      }

      showToast(downloaded ? `Started ${downloaded} selected downloads.` : "Could not download selected images.");
      clearSelectedHosts();
      return { downloaded };
    } finally {
      triggerButton?.classList.remove("cgqid-busy");
      triggerButton?.removeAttribute("disabled");
      updateBulkBar();
    }
  }

  function syncLibraryDownloadAllButton() {
    if (!isImagesLibraryPage()) {
      removeLibraryDownloadAllButtons();
      return;
    }

    const title = findLibraryTitle();
    if (!title) {
      removeLibraryDownloadAllButtons();
      return;
    }

    const existingButtons = Array.from(document.querySelectorAll(`.${LIBRARY_DOWNLOAD_ALL_CLASS}`));
    let button =
      existingButtons.find(
        (candidate) =>
          candidate.parentElement === title && candidate.getAttribute(LIBRARY_DOWNLOAD_ALL_BOUND_ATTR) === "true"
      ) || existingButtons.find((candidate) => candidate.getAttribute(LIBRARY_DOWNLOAD_ALL_BOUND_ATTR) === "true");

    if (!button) {
      button = createLibraryDownloadAllButton();
    }

    if (button.parentElement !== title) {
      title.appendChild(button);
    }

    removeLibraryDownloadAllButtons(button);

    const count = getAllDownloadableItems({ requireNative: true, skipDownloaded: true }).length;
    const busy = button.dataset.cgqidBusy === "true";
    button.disabled = busy || !count;
    button.title = count ? `Download ${count} unique loaded images` : "No new loaded images found";
    button.setAttribute(
      "aria-label",
      count ? `Download all ${count} unique loaded images` : "No new loaded images found"
    );
  }

  function createLibraryDownloadAllButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = LIBRARY_DOWNLOAD_ALL_CLASS;
    button.setAttribute(LIBRARY_DOWNLOAD_ALL_BOUND_ATTR, "true");
    button.innerHTML = `<span>Download all</span>${DOWNLOAD_ICON}`;

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        downloadAllLibraryImages(button);
      },
      true
    );

    return button;
  }

  async function downloadAllLibraryImages(triggerButton) {
    if (triggerButton.dataset.cgqidBusy === "true") return { downloaded: 0 };

    triggerButton.dataset.cgqidBusy = "true";
    triggerButton.classList.add("cgqid-busy");
    triggerButton.disabled = true;
    setLibraryDownloadAllButtonLabel(triggerButton, "Scanning...");

    let downloaded = 0;
    try {
      await discoverAllLibraryImages();

      const items = getAllDownloadableItems({ requireNative: true, skipDownloaded: true });
      if (!items.length) {
        showToast("No new images found.");
        return { downloaded: 0 };
      }

      setLibraryDownloadAllButtonLabel(triggerButton, "Downloading...");

      for (const { host, image } of items) {
        const button = host?.querySelector?.(".cgqid-button") || triggerButton;
        const ok = await downloadImage(image, button, { nativeOnly: true, quiet: true });
        if (ok) {
          downloaded += 1;
          const key = getImageDownloadKey(image, host);
          if (key) downloadedKeys.add(key);
        }
        await wait(140);
      }

      showToast(downloaded ? `Started ${downloaded} unique downloads.` : "Could not download loaded images.");
      return { downloaded };
    } finally {
      delete triggerButton.dataset.cgqidBusy;
      triggerButton.classList.remove("cgqid-busy");
      triggerButton.disabled = false;
      setLibraryDownloadAllButtonLabel(triggerButton, "Download all");
      syncLibraryDownloadAllButton();
    }
  }

  async function discoverAllLibraryImages() {
    if (!isImagesLibraryPage()) return { discovered: getAllDownloadableItems().length };

    const originalX = window.scrollX;
    const originalY = window.scrollY;
    let previousCount = getAllDownloadableItems().length;
    let previousHeight = getDocumentScrollHeight();
    let stablePasses = 0;

    for (let pass = 0; pass < LIBRARY_DISCOVERY_MAX_PASSES; pass += 1) {
      window.scrollTo(0, getDocumentScrollHeight());
      await wait(LIBRARY_DISCOVERY_WAIT_MS);
      scanImages();

      const count = getAllDownloadableItems().length;
      const height = getDocumentScrollHeight();
      const bottomReached = Math.ceil(window.scrollY + window.innerHeight) >= height - 2;
      const changed = count > previousCount || height > previousHeight;

      stablePasses = changed ? 0 : stablePasses + 1;
      previousCount = count;
      previousHeight = height;

      if (bottomReached && stablePasses >= LIBRARY_DISCOVERY_STABLE_PASSES) break;
    }

    window.scrollTo(originalX, originalY);
    await wait(120);
    scanImages();

    return { discovered: getAllDownloadableItems().length };
  }

  function getDocumentScrollHeight() {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      document.documentElement.offsetHeight,
      document.body?.offsetHeight || 0
    );
  }

  function setLibraryDownloadAllButtonLabel(button, label) {
    const text = button?.querySelector?.("span");
    if (text) text.textContent = label;
  }

  function rememberDownloadedImage(image, host) {
    const key = getImageDownloadKey(image, host);
    if (key) downloadedKeys.add(key);
  }

  function getAllDownloadableItems({ requireNative = false, skipDownloaded = false } = {}) {
    const images = Array.from(document.querySelectorAll(`img[${DECORATED_ATTR}="true"]`));
    const seen = new Set();
    const items = [];

    for (const image of images) {
      const host = image.closest(`[${HOST_ATTR}]`) || findHost(image);
      const currentImage = findCurrentImageForHost(host) || image;
      if (!currentImage) continue;
      if (requireNative && !findNativeOpenButton(currentImage, host)) continue;

      const key = getImageDownloadKey(currentImage, host);
      if (!key || seen.has(key)) continue;
      if (skipDownloaded && downloadedKeys.has(key)) continue;

      seen.add(key);
      items.push({ host, image: currentImage, key });
    }

    return items;
  }

  function getImageDownloadKey(image, host) {
    const urls = helpers.rankDownloadUrls({
      imageLike: image,
      candidateUrls: collectCandidateUrls(host || image)
    });

    if (urls[0]) return `url:${urls[0]}`;

    const renderedUrl = helpers.normalizeCandidateUrl(helpers.chooseBestImageUrl(image));
    if (renderedUrl) return `rendered:${renderedUrl}`;

    return `element:${getElementOrdinal(host || image)}`;
  }

  function getElementOrdinal(element) {
    if (!(element instanceof Element)) return "unknown";

    let index = 0;
    let node = element;
    while ((node = node.previousElementSibling)) index += 1;

    const parent = element.parentElement;
    if (!parent) return `${element.tagName.toLowerCase()}:${index}`;

    return `${getElementOrdinal(parent)}>${element.tagName.toLowerCase()}:${index}`;
  }

  function isImagesLibraryPage() {
    return location.hostname === "chatgpt.com" && location.pathname.startsWith("/images");
  }

  function findLibraryTitle() {
    const headings = Array.from(document.querySelectorAll("main h1, main h2, h1, h2"));

    return (
      headings.find((heading) => /^my images\b/i.test(getDirectText(heading))) ||
      headings.find((heading) => /^my images\b/i.test(String(heading.textContent || "").trim()))
    );
  }

  function getDirectText(element) {
    return Array.from(element?.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function removeLibraryDownloadAllButtons(keepButton = null) {
    for (const button of Array.from(document.querySelectorAll(`.${LIBRARY_DOWNLOAD_ALL_CLASS}`))) {
      if (button !== keepButton) button.remove();
    }
  }

  function findCurrentImageForHost(host) {
    if (!host) return null;

    const images = Array.from(host.querySelectorAll?.("img") || []);
    return images.find((candidate) => shouldDecorate(candidate)) || null;
  }

  function findHost(image) {
    let node = image.parentElement;
    let depth = 0;
    const imageRect = image.getBoundingClientRect();

    while (node && node !== document.body && depth < 5) {
      if (node instanceof HTMLElement && !["SOURCE"].includes(node.tagName)) {
        const rect = node.getBoundingClientRect();
        const widthRatio = rect.width / Math.max(1, imageRect.width);
        const heightRatio = rect.height / Math.max(1, imageRect.height);

        if (widthRatio >= 0.9 && heightRatio >= 0.9 && widthRatio <= 2.4 && heightRatio <= 2.4) {
          return node;
        }
      }

      node = node.parentElement;
      depth += 1;
    }

    return image.parentElement instanceof HTMLElement ? image.parentElement : null;
  }

  async function downloadImage(image, button, { nativeOnly = false, quiet = false } = {}) {
    const initialHost = image.closest(`[${HOST_ATTR}]`) || findHost(image);
    const targetImage = findCurrentImageForHost(initialHost) || image;
    const host = targetImage.closest(`[${HOST_ATTR}]`) || initialHost || findHost(targetImage);
    const urls = helpers.rankDownloadUrls({
      imageLike: targetImage,
      candidateUrls: collectCandidateUrls(host || targetImage)
    });

    button?.classList.add("cgqid-busy");

    try {
      const nativeDownloaded = await downloadViaNativeViewer(targetImage, host);
      if (nativeDownloaded) {
        rememberDownloadedImage(targetImage, host);
        if (!quiet) showToast("Full-size image download started.");
        return true;
      }

      if (nativeOnly) {
        if (!quiet) showToast("No full-size image control found.");
        return false;
      }

      if (!urls.length) {
        if (!quiet) showToast("No downloadable image URL found.");
        return false;
      }

      const index = getVisibleTargetImages().indexOf(targetImage) + 1 || 1;

      for (const url of urls) {
        const filename = helpers.buildDownloadFilename({ url, index });
        const downloaded = await tryDownloadUrl(url, filename);
        if (downloaded) {
          rememberDownloadedImage(targetImage, host);
          if (!quiet) showToast("Image download started.");
          return true;
        }
      }

      throw new Error("Chrome could not download any candidate image URL.");
    } catch (error) {
      console.warn("[ChatGPT Images Quick Download]", error);
      if (!quiet) showToast("Could not download this image.");
      return false;
    } finally {
      button?.classList.remove("cgqid-busy");
    }
  }

  async function downloadViaNativeViewer(image, host) {
    const openButton = findNativeOpenButton(image, host);
    if (!openButton) return false;

    const existingRoots = new Set(findNativeViewerRoots());
    openButton.click();

    const viewerRoot = await waitForElement(() => {
      return findNativeViewerRoots().find((root) => !existingRoots.has(root)) || null;
    }, 5000);
    if (!viewerRoot) return false;

    const saveButton = await waitForElement(() => findNativeSaveButton(viewerRoot), 3000);
    if (!saveButton) {
      closeNativeViewer(viewerRoot);
      return false;
    }

    saveButton.click();
    await wait(1200);
    closeNativeViewer(viewerRoot);

    return true;
  }

  function findNativeOpenButton(image, host) {
    const roots = helpers.uniqueElements([
      host,
      image.closest?.("button"),
      host?.parentElement,
      image.parentElement,
      image.parentElement?.parentElement
    ]).filter((root) => isNativeOpenSearchRoot(root, image));

    for (const root of roots) {
      const buttons = helpers.uniqueElements([
        root instanceof HTMLButtonElement ? root : null,
        ...Array.from(root?.querySelectorAll?.("button") || [])
      ]);
      const openButton = buttons.find((button) => {
        return !isExtensionControl(button) && helpers.isNativeOpenImageControl(button) && isControlNearImage(button, image);
      });

      if (openButton) return openButton;
    }

    return null;
  }

  function isNativeOpenSearchRoot(root, image) {
    if (!(root instanceof HTMLElement) || !(image instanceof HTMLElement)) return false;
    if (root === image || root.contains(image)) {
      if (root instanceof HTMLButtonElement) return true;

      const imageRect = image.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const widthRatio = rootRect.width / Math.max(1, imageRect.width);
      const heightRatio = rootRect.height / Math.max(1, imageRect.height);

      return widthRatio <= 2.4 && heightRatio <= 2.4;
    }

    return false;
  }

  function isControlNearImage(control, image) {
    if (!(control instanceof HTMLElement) || !(image instanceof HTMLElement)) return false;
    if (isControlInSameImageContainer(control, image)) return true;

    const imageRect = image.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
    if (!controlRect.width || !controlRect.height) return false;

    const expanded = {
      bottom: imageRect.bottom + Math.max(80, imageRect.height * 0.35),
      left: imageRect.left - Math.max(80, imageRect.width * 0.35),
      right: imageRect.right + Math.max(80, imageRect.width * 0.35),
      top: imageRect.top - Math.max(80, imageRect.height * 0.35)
    };

    return !(
      controlRect.right < expanded.left ||
      controlRect.left > expanded.right ||
      controlRect.bottom < expanded.top ||
      controlRect.top > expanded.bottom
    );
  }

  function isControlInSameImageContainer(control, image) {
    let node = control.parentElement;
    let depth = 0;
    const imageRect = image.getBoundingClientRect();

    while (node && node !== document.body && depth < 6) {
      if (node.contains(image)) {
        const rect = node.getBoundingClientRect();
        const widthRatio = rect.width / Math.max(1, imageRect.width);
        const heightRatio = rect.height / Math.max(1, imageRect.height);
        return widthRatio <= 2.4 && heightRatio <= 2.4;
      }

      node = node.parentElement;
      depth += 1;
    }

    return false;
  }

  function findNativeSaveButton(viewerRoot) {
    const candidates = Array.from(viewerRoot?.querySelectorAll?.("button") || []).filter((button) => {
      return (
        !button.disabled &&
        !isExtensionControl(button) &&
        isVisibleElement(button) &&
        helpers.isNativeSaveControl(button)
      );
    });

    return candidates.length === 1 ? candidates[0] : null;
  }

  function closeNativeViewer(viewerRoot) {
    const closeButton = Array.from(viewerRoot?.querySelectorAll?.("button") || []).find((button) => {
      return !button.disabled && isVisibleElement(button) && helpers.isNativeCloseViewerControl(button);
    });

    closeButton?.click();
  }

  function findNativeViewerRoots() {
    const saveButtons = Array.from(document.querySelectorAll("button")).filter((button) => {
      return !button.disabled && isVisibleElement(button) && helpers.isNativeSaveControl(button);
    });

    return helpers.uniqueElements(saveButtons.map(findDialogLikeRoot).filter(Boolean)).filter(isVisibleElement);
  }

  function findDialogLikeRoot(element) {
    let node = element?.parentElement;

    while (node && node !== document.body) {
      const role = node.getAttribute("role");
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const coversViewport =
        style.position === "fixed" && rect.width >= innerWidth * 0.35 && rect.height >= innerHeight * 0.35;

      if (role === "dialog" || node.getAttribute("aria-modal") === "true" || coversViewport) {
        return node;
      }

      node = node.parentElement;
    }

    return null;
  }

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) return false;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isExtensionControl(element) {
    return Boolean(
      element?.closest?.(
        ".cgqid-button, .cgqid-select, .cgqid-bulk-bar, .cgqid-toast, .cgqid-library-download-all"
      )
    );
  }

  function waitForElement(getElement, timeout = 3000) {
    const started = Date.now();

    return new Promise((resolve) => {
      const tick = () => {
        const element = getElement();
        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - started >= timeout) {
          resolve(null);
          return;
        }

        window.setTimeout(tick, 80);
      };

      tick();
    });
  }

  async function tryDownloadUrl(url, filename) {
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      downloadInPage(url, filename);
      return true;
    }

    const response = await chrome.runtime.sendMessage({
      type: "CGQID_DOWNLOAD",
      url,
      filename
    });

    return Boolean(response?.ok);
  }

  function downloadInPage(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
  }

  function getVisibleTargetImages() {
    return Array.from(document.querySelectorAll(`img[${DECORATED_ATTR}="true"]`)).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    });
  }

  function getStatus() {
    const all = Array.from(document.querySelectorAll(`img[${DECORATED_ATTR}="true"]`));
    const isSupported = isSupportedPage();
    return {
      isImagesPage: isSupported,
      isSupportedPage: isSupported,
      decoratedCount: all.length,
      visibleCount: getVisibleTargetImages().length
    };
  }

  async function downloadVisibleImages() {
    const images = getVisibleTargetImages();
    const urls = helpers.uniqueUrls(
      images.map((image) => {
        const host = image.closest(`[${HOST_ATTR}]`) || findHost(image);
        return helpers.rankDownloadUrls({
          imageLike: image,
          candidateUrls: collectCandidateUrls(host || image)
        })[0];
      })
    );

    for (const [index, url] of urls.entries()) {
      const filename = helpers.buildDownloadFilename({ url, index: index + 1 });

      if (url.startsWith("blob:") || url.startsWith("data:")) {
        downloadInPage(url, filename);
      } else {
        await chrome.runtime.sendMessage({ type: "CGQID_DOWNLOAD", url, filename });
      }

      await wait(140);
    }

    showToast(urls.length ? `Started ${urls.length} downloads.` : "No visible images found.");
    return { downloaded: urls.length };
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function collectCandidateUrls(root) {
    const urls = [];
    const elements = [root, ...Array.from(root?.querySelectorAll?.("*") || [])].filter(Boolean);

    for (const element of elements) {
      if (isExtensionControl(element)) continue;

      for (const attr of element.attributes || []) {
        if (!helpers.isCandidateUrlAttribute(attr.name, attr.value)) continue;
        collectUrlsFromText(attr.value, urls);
      }

      if (element instanceof HTMLImageElement) {
        urls.push(element.currentSrc, element.src);
        collectUrlsFromText(element.srcset, urls);
      }

      if (element instanceof HTMLSourceElement) {
        urls.push(element.src);
        collectUrlsFromText(element.srcset, urls);
      }

      const background = getComputedStyle(element).backgroundImage;
      collectUrlsFromText(background, urls);
    }

    return helpers.uniqueUrls(urls);
  }

  function collectUrlsFromText(text, urls) {
    if (!text || typeof text !== "string") return;

    const srcsetParts = text
      .split(",")
      .map((part) => part.trim().split(/\s+/)[0])
      .filter((part) => /^https?:\/\//i.test(part));

    urls.push(...srcsetParts);

    const urlMatches = text.match(/https?:\/\/[^"'\\s,)]+/gi) || [];
    urls.push(...urlMatches.map((url) => url.replace(/&amp;/g, "&")));

    const cssMatches = [...text.matchAll(/url\\((['"]?)(.*?)\\1\\)/gi)];
    urls.push(...cssMatches.map((match) => match[2]).filter((url) => /^https?:\/\//i.test(url)));
  }

  function showToast(message) {
    let toast = document.querySelector(".cgqid-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cgqid-toast";
      document.documentElement.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("cgqid-toast-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("cgqid-toast-visible"), 1700);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;

    if (message.type === "CGQID_GET_STATUS") {
      queueScan();
      sendResponse(getStatus());
      return false;
    }

    if (message.type === "CGQID_RESCAN") {
      scanImages();
      sendResponse(getStatus());
      return false;
    }

    if (message.type === "CGQID_DOWNLOAD_VISIBLE") {
      downloadVisibleImages().then(sendResponse);
      return true;
    }

    return false;
  });

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("scroll", queueScan, { passive: true });
  window.addEventListener("resize", queueScan, { passive: true });

  window.setInterval(() => {
    if (latestPath !== location.pathname) {
      latestPath = location.pathname;
      queueScan();
    }
  }, 800);

  queueScan();
})();
