# Agent Handoff Notes

## Why The 0.4.x Release Felt Stronger

The release felt better because it treated the extension like a small production product instead of a loose unpacked script.

- It fixed real failure modes from review before polishing the public surface.
- It proved behavior with layered checks: unit tests, manifest validation, visual smoke, synthetic ChatGPT content E2E, local package creation, GitHub CI, and GitHub Release assets.
- It kept security explicit: no broad host permissions, URL allowlisting in both content/background paths, safe filenames, and MIME checks after download completion.
- It separated active-profile truth from source truth. The user's Chrome profile can keep an older unpacked content script until `chrome://extensions` reloads the extension, so repo/source verification and active-profile verification must be reported separately.
- It made the community path concrete: release zip, checksum, install instructions, issue template, PR template, contributor notes, repo topics, and release notes.

## Future Release Loop

Use this loop for meaningful changes:

1. Define the target behavior in one sentence and the failure modes that would embarrass the project in public.
2. Ask for or run a focused review pass on reliability, security/privacy, UX, and release packaging.
3. Fix the highest-risk issues before doing cosmetic or community polish.
4. Add or update tests at the right layer:
   - pure helpers: `node --test`
   - manifest/package rules: `npm run validate` and package tests
   - overlay layout: `npm run visual-smoke`
   - injected content behavior: `npm run e2e:extension`
5. Keep the active Chrome profile honest:
   - real ChatGPT profile checks are valuable for user-session proof
   - if the loaded unpacked extension is stale, do not treat that as source failure
   - ask the user to reload the unpacked extension in `chrome://extensions` before retesting that profile
6. Package before release, not after release.
7. Push `main`, watch CI, tag only when `main` is coherent.
8. After tagging, watch the release workflow and confirm the zip plus checksum are attached.
9. Update release notes with install steps and the highest-value safety/UX changes.
10. Leave a short handoff note if a lesson will matter to future agents.

## What Not To Change Automatically

- Do not bump `CHANGELOG.md` or the extension version for docs-only operational notes unless the docs are part of a public release promise.
- Do not add code just to encode a lesson when a checklist or runbook is clearer.
- Do not broaden permissions to make tests easier.
- Do not bypass browser automation policy to operate `chrome://extensions`; ask for manual reload when needed.

## Verification Baseline

Run the complete local gate before claiming a release-ready change:

```bash
npm run check
npm audit --audit-level=moderate
node --check background.js content.js popup.js src/imageTargets.js scripts/*.js
git diff --check
```

`npm run check` covers unit tests, manifest validation, visual smoke, synthetic ChatGPT content E2E, and deterministic zip packaging.

For docs-only changes, `git diff --check` plus a targeted read-through is enough unless the docs reference commands or version state that may have drifted.

## Chrome Reload Caveat

When this project is loaded as an unpacked Chrome extension, Chrome can keep an older content script active until the extension is reloaded in `chrome://extensions`. Reloading a ChatGPT tab alone may not prove the newest local source is active.

For current-source proof, check for the `data-cgqid-bound="true"` marker on `.cgqid-button` after injection. Older builds can show a button without that marker.

The Codex Chrome automation policy blocks operating `chrome://extensions`, so do not bypass that restriction. If the active user profile still has an old script, verify the repo with `npm run check`, then ask the user to reload the unpacked extension manually before live-profile retesting.

## Safety Invariants

- Keep `manifest.json` free of broad `host_permissions`.
- Keep background downloads restricted to allowlisted ChatGPT/OpenAI image surfaces and generated safe filenames.
- Treat present non-image MIME types, especially `text/html`, as download failures even if the filename extension looks like an image.
- Scope native `Save` and `Close` clicks to the fullscreen/dialog viewer root.
- Keep all-gallery downloads on the existing content-script path: scroll the ChatGPT Images page to discover lazy-loaded tiles, require the native full-size viewer `Save` path, deduplicate by stable image key, and avoid new page-data collection or broader permissions.

## Chrome Web Store (CWS) Publishing Pipeline

When releasing a new version to the Chrome Web Store:

1. **Manifest Constraint Invariant:**
   - The `manifest.json` `description` field MUST NOT exceed 132 characters (strictly enforced by CWS API).
   - This invariant is guarded by `node scripts/validate-extension.js` in `npm run check`.
2. **Store Assets Standard (Zero-Alpha):**
   - Store Icon: 128x128 24-bit PNG.
   - Screenshots: 1280x800 24-bit PNG (1-5 screenshots, zero alpha channel).
   - Small Promo Tile: 440x280 24-bit PNG (zero alpha channel).
   - Marquee Promo Tile: 1400x560 24-bit PNG (zero alpha channel).
   - Assets are deterministically generated by `node scripts/generate-cws-assets.js` and stored under `cws-assets/`.
3. **Packaging Protocol:**
   - Run `npm run check` which produces `dist/chatgpt-images-quick-download-v<version>.zip` excluding git, tests, docs, and scratch files.
4. **Developer Console & Account Ownership:**
   - **Publisher Name:** `Vec Yang`
   - **Publisher ID:** `a192d1b2-927d-4d30-929f-f85f73992e56`
   - **Item ID:** `koloagmleifopacalpjkpmbcgapkgblh`
   - **Console URL:** `https://chrome.google.com/webstore/devconsole/a192d1b2-927d-4d30-929f-f85f73992e56`
   - **1Password Reference:** `icwj75zkxeite36wzvmma74jri` in `Agent Automation` vault.
   - **Memory Vault Link:** `tools/chrome_web_store_publisher.md` in 2nd Brain Memory Center.
5. **Reviewer Test Instructions (testcredentials):**
   - Test instructions are saved under the console's `testcredentials` route explaining how to test using free ChatGPT accounts.
