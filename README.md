# ChatGPT Images Quick Download

<p align="center">
  <img src="docs/logo.png" alt="ChatGPT Images Quick Download logo" width="140">
</p>

Small unpacked Chrome extension for ChatGPT Images and generated images inside normal ChatGPT chats.

It adds a tiny transparent download icon and a batch-select checkbox on each generated image, plus a `Download all` button beside the `My images` heading. Hover an image, click the icon for one file, select several images, or let the gallery button scroll-load and download unique images together. The extension automatically uses ChatGPT's native full-size Save flow so you do not have to open each image and click inside it by hand.

## Why

ChatGPT shows generated images in both the Images gallery and normal chat threads, but saving full-size files normally takes extra clicks per image. This extension adds the missing one-click affordance while staying out of the way of ChatGPT's native hover controls.

## UX

- Per-image floating download button, top-right of each target image.
- Per-image batch-select checkbox, top-left of each target image, with a floating `Download selected` toolbar that uses ChatGPT's native full-size viewer `Save` path.
- `Download all` button beside `My images` on `https://chatgpt.com/images`; it scrolls the gallery to discover lazy-loaded images, deduplicates by stable download key, and only uses ChatGPT's native full-size viewer `Save` path.
- Does not overlap ChatGPT's native bottom hover controls such as `Edit` and share/open.
- Transparent by default, stronger on hover/focus, so the gallery stays clean.
- Works on `https://chatgpt.com/images` and `https://chatgpt.com/c/...` conversation pages.
- Uses ChatGPT's native fullscreen `Save` button when available, which downloads the full-size PNG into Chrome's normal Downloads location.
- Works with infinite scroll by rescanning new images automatically.
- Uses the best `srcset` candidate when the page exposes multiple image sizes.
- Popup includes `Download visible` and `Rescan` as backup controls.

## Install

### Community install

1. Open the latest [GitHub release](https://github.com/vecyang1/chatgpt-images-quick-download/releases).
2. Download `chatgpt-images-quick-download-vX.Y.Z.zip`.
3. Unzip it somewhere stable on your Mac or PC.
4. Open `chrome://extensions/`.
5. Enable `Developer mode`.
6. Click `Load unpacked`.
7. Select the unzipped extension folder.
8. Open `https://chatgpt.com/images` or a ChatGPT conversation with generated images.
9. Hover an image and click the small download icon, select several checkboxes and click `Download selected`, or use `Download all` beside `My images`.

### Developer install

Clone the repository and load the project folder directly:

```bash
git clone https://github.com/vecyang1/chatgpt-images-quick-download.git
```

Then use the same `chrome://extensions/` > `Load unpacked` flow and select the cloned `chatgpt-images-quick-download` folder.

## Privacy

- No analytics.
- No remote server.
- No page data collection.
- Runs only on `chatgpt.com` and uses Chrome's downloads API only to save images.
- The manifest does not request broad host permissions; fallback URL downloads are additionally allowlisted in code.

## Files

```text
manifest.json          Chrome MV3 config
background.js          Validates and saves fallback image URLs
content.js             Adds image overlay buttons, selection controls, and batch download UI
content.css            Transparent floating controls, batch toolbar, and toast UI
popup.html/css/js      Small status and visible-download popup
icons/                 Generated extension logo and Chrome icon sizes
src/imageTargets.js    Tested URL, filename, and filtering helpers
test/                  Node tests
scripts/package-extension.js
scripts/e2e-extension-smoke.js
scripts/validate-extension.js
scripts/visual-smoke.js
docs/overlay-visual-smoke.png
docs/AGENT_HANDOFF.md
```

## Verify

```bash
npm test
npm run validate
npm run visual-smoke
npm run e2e:extension
npm run package
```

`npm run package` creates `dist/chatgpt-images-quick-download-vX.Y.Z.zip` and a `.sha256` checksum. The `dist/` folder is intentionally ignored by git.

## Notes

- The extension content script is scoped to `chatgpt.com`, not all websites.
- Direct URL fallback downloads are saved under `Downloads/ChatGPT Images/`; the primary native-save path keeps ChatGPT's normal filename and destination.
- `Download all` only sees images ChatGPT can load into the current page. It auto-scrolls to ask the gallery for more items, then stops after the list stays stable.
- Batch actions skip tiles when the full-size viewer control cannot be matched. They do not fall back to direct gallery URLs because those can be small thumbnail or preview assets.
- Blob/data image URLs use an in-page fallback download because Chrome's background download API cannot always access page-owned blob URLs.
- If ChatGPT changes the gallery markup, click the extension popup's `Rescan`; if the image still has a normal `<img>` element and is gallery-sized, it should be detected.

## Troubleshooting

- If no icon appears, reload the ChatGPT tab after loading or updating the extension.
- If an icon appears but nothing downloads, try the popup's `Rescan`, then hover the image again.
- If Chrome blocks the extension after an update, remove the old unpacked extension and load the folder again.
