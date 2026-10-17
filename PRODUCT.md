# Product

## Register

product

## Users

People using ChatGPT Images or generated-image chat threads who need to save several full-size generated images quickly without opening every tile by hand.

## Product Purpose

ChatGPT Images Quick Download adds low-interruption download controls directly on ChatGPT generated image tiles and on the ChatGPT Images library heading. Success means users can save one, several selected, or all currently discoverable full-size library images with fewer clicks while the extension preserves ChatGPT's native full-size Save flow whenever possible.

## Brand Personality

Quiet, precise, trustworthy.

## Anti-references

Do not create a busy gallery manager, overlap ChatGPT's native hover controls, broaden extension permissions, collect page data, or replace native ChatGPT flows when a small overlay can do the job.

## Design Principles

- Stay out of the image until the user needs a control.
- Prefer native full-size Save behavior before URL fallbacks.
- Keep batch operations explicit through selected images and visible counts.
- Let all-gallery downloads scroll-discover lazy-loaded images, require a matched native full-size viewer control, then deduplicate so repeated targets are not saved again in the same page session.
- Preserve narrow security and privacy boundaries.
- Self-heal around ChatGPT SPA rerenders instead of asking users to babysit the extension.

## Accessibility & Inclusion

Controls should be keyboard reachable, labeled for assistive technology, visible on focus, and understandable without color alone. Motion should be short and state-based.
