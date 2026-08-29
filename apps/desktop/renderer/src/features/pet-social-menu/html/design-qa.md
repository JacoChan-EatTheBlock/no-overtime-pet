# Pet / Social / Menu standalone HTML — Design QA

## Scope

- Standalone pages:
  - `00-default-pet.html`
  - `02-friend-pet-strip.html`
  - `08-friends-management.html`
  - `18-quick-menu.html`
- Shared implementation:
  - `pet-social-menu.css`
  - `pet-social-menu.js`
- Product-owned UI only. Windows wallpaper, desktop icons, taskbar, tray, and window chrome are not implemented and are excluded from fidelity findings.

## Authority and normalization

- Reference visuals:
  - `design/image2-ui-v1/00-default-desktop-pet.png`
  - `design/image2-ui-v1/02-friends-desktop-row.png`
  - `design/image2-ui-v2-comments/04-friends-hide-from-selected.png`
  - `design/image2-ui-v2-comments/07-tray-visibility-submenu.png`
- Browser: Codex in-app browser.
- Authority CSS viewport: `1487 × 1058` at device scale factor `1`.
- 08 and 18 references were normalized to `1487 × 1058` before comparison.
- Implementation screenshots:
  - `design-qa/00-implementation.png`
  - `design-qa/02-implementation.png`
  - `design-qa/08-implementation.png`
  - `design-qa/18-implementation.png`
- Same-viewport full comparisons:
  - `design-qa/00-comparison-full.png`
  - `design-qa/02-comparison-full.png`
  - `design-qa/08-comparison-full.png`
  - `design-qa/18-comparison-full.png`
- Product-surface focus comparisons:
  - `design-qa/00-comparison-focus.png`
  - `design-qa/02-comparison-focus.png`
  - `design-qa/08-comparison-focus.png`
  - `design-qa/18-comparison-focus.png`
- Contact sheet: `design-qa/comparison-contact-sheet.png`.

## Fidelity findings and fixes

### Pass 1

- P1 / layout: 00 inherited the shell-free canvas but sat below the source product anchor.
- P1 / content: the first 18 draft used generic menu rows rather than the authority wording and hierarchy.
- P2 / spacing: the 02 pager sat on the pet row instead of above it.
- Fixes: anchored the 00 pet to the same absolute product position; restored the 18 menu labels, order, task bubble, mute value, exit warning, and submenu copy; raised the 02 pager and aligned the five-seat strip.

### Pass 2

- P1 / copy and product semantics: the first 08 draft used alternate names and helper copy instead of the revised authority content.
- P2 / image treatment: friend states needed motion semantics without status-color recoloring, and the composite references did not contain ready-to-use standalone character files.
- Fixes: aligned 08 title, friend code, list, requests, privacy copy, selected-friend actions, and one-way “不对其展示”; extracted the reference characters to transparent canvases, cropped them into individual PNG assets, and kept every 02 pet and caption on its source color treatment while preserving `WORKING`, `MEETING`, `SLACKING`, `AWAY`, `CLOCKED_OUT`, and `OFFLINE` motion values.

### Pass 3

- P1 / viewport resilience: at `1120 × 760`, the 08 window extended 24px below the viewport.
- Fix: reduced only the compact-stage outer padding. The final window bounds are `left 40 / top 18 / right 1080 / bottom 738`, with no body overflow.

After the final pass, no actionable P0, P1, or P2 findings remain inside the standalone HTML and current-asset scope.

## Typography, color, imagery, and icons

- Font stack follows the shared UI specification: PingFang SC, Microsoft YaHei, Noto Sans CJK SC, system UI, sans-serif.
- Long Chinese copy uses the readable UI font; pixel character comes from stepped dark-brown surfaces, hard shadows, compact density, pixel artwork, and icons.
- Warm surfaces, teal emphasis, dark-brown borders, danger red, success green, and disabled values use the shared reconstruction tokens.
- Pixel artwork uses `image-rendering: pixelated` / `crisp-edges`, the repository `capybara/idle.png`, and source-derived transparent friend PNGs without hue, saturation, brightness, grayscale, or opacity state filters.
- The built-in image editor performed background extraction on the two authority composites; deterministic nearest-neighbor crops produced the final `192 × 192` desk-character and `64 × 64` avatar assets. Source, process, intended use, and license boundary are recorded in `assets/friends/README.md`.
- Standard controls use unmodified Tabler SVG assets copied from the installed `@tabler/icons` package; source and MIT license are recorded in `icons/README.md` and `icons/LICENSE.tabler.txt`.

## Interaction checks

- 00: pet click changed `aria-pressed` to `true` and stable state to `pet-selected`.
- 02: next-page click changed the label to `好友 6–10/12` and state to `page-2`; first-page pets used the source-derived character cutouts, no state recoloring, and independent motion values.
- 08: “不对其展示” changed state to `hidden-from-selected`; the selected friend stayed in the 8-row list and the reverse direction remained unchanged. One request could be accepted without removing the other; add-friend mock feedback cleared the submitted value.
- 18: disabling activity sharing left local friend-pet display enabled; hiding the pet did not change either visibility setting; mute and submenu controls changed only their own mock state.
- Browser console: no warnings or errors on the checked paths.
- Compact desktop: 08 and 18 fit at `1120 × 760` without page overflow.

## Automated validation

- `npm test`: 3 files, 18 tests passed.
- `npm run typecheck`: passed.
- `npm run build:renderer`: passed.
- Asset diagnostics: all source-derived runtime PNGs are RGBA at `192 × 192` or `64 × 64`; every corner is fully transparent and each asset contains both transparent and opaque pixels.

## Residual boundaries

- P3 / reviewed-motion follow-up: state GIF files do not yet exist as approved runtime assets. `PET_MOTION_ASSET_PATHS` intentionally falls back to the source-derived static character PNG for each friend. Later reviewed GIF paths can be registered by `<friend id>:<motion>` without changing page structure or state semantics.
- The HTML pages mock renderer interactions only. They do not implement real networking, the Windows system tray, transparent-window placement, mixed-DPI multi-display behavior, virtual desktops, fullscreen visibility policy, or click-through behavior.

final result: passed
