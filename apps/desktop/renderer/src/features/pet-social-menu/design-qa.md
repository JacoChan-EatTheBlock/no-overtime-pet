# Pet / Social / Menu Design QA

## Comparison Targets

- Source visual truth:
  - `design/image2-ui-v1/00-default-desktop-pet.png`
  - `design/image2-ui-v1/02-friends-desktop-row.png`
  - `design/image2-ui-v2-comments/04-friends-hide-from-selected.png`
  - `design/image2-ui-v2-comments/07-tray-visibility-submenu.png`
- Browser-rendered implementation evidence:
  - `design-qa/implementation-00-final.png`
  - `design-qa/implementation-02-final.png`
  - `design-qa/implementation-08-final.png`
  - `design-qa/implementation-18-final.png`
- Full-view combined comparisons:
  - `design-qa/comparison-00-final.png`
  - `design-qa/comparison-02-final.png`
  - `design-qa/comparison-08-final.png`
  - `design-qa/comparison-18-final.png`
- Focused product-surface comparisons:
  - `design-qa/comparison-00-focus.png`
  - `design-qa/comparison-02-focus.png`
  - `design-qa/comparison-08-focus.png`
  - `design-qa/comparison-18-focus.png`
- Contact sheet: `design-qa/comparison-contact-sheet.png`

## Normalization

- Browser: Codex in-app browser.
- CSS viewport: `1487 × 1058`.
- Source pixels:
  - 00 and 02: `1487 × 1058`.
  - 08: `1484 × 1060`, normalized to `1487 × 1058` for comparison.
  - 18: `1503 × 1046`, normalized to `1487 × 1058` for comparison.
- Implementation pixels: `1487 × 1058` for all four captures.
- Device scale factor: `1`.
- Full-view comparisons place the normalized source and implementation side by side at the same pixel size.
- Windows wallpaper, taskbar, tray, desktop icons, and window controls are excluded from fidelity findings because they are not product UI. The implementation uses a neutral QA canvas instead of simulating them.

## States

- 00: default pet, idle and visible.
- 02: first friend page, five visible seats and pagination.
- 08: accepted-friend list, two incoming requests, selected friend still receiving the owner's projection.
- 18: quick menu with the visibility submenu open and both independent checkboxes checked.

## Required Fidelity Surfaces

- Fonts and typography: the feature uses the shared PingFang / Microsoft YaHei / Noto CJK stack with explicit reference-aligned sizes, weights, line heights, and dense control labels. Long Chinese copy remains a readable UI font; pixel character comes from hard outlines, stepped surfaces, compact rhythm, and artwork rather than a low-legibility display font.
- Spacing and layout rhythm: the 00 pet anchor, 02 right-bottom row, 08 `1100 × 820` window, and 18 menu/submenu cluster align to the source product surfaces. The 02 row no longer clips its final seat. The 08 grid, header, add-friend form, row menus, request actions, and bottom actions follow the source proportions.
- Colors and visual tokens: warm surfaces, dark-brown stepped borders, teal actions, danger red, and hard shadows use the shared tokens. Per Magnus's latest decision, every 02 friend pet and status caption uses one consistent source color treatment instead of status-dependent recoloring or grayscale.
- Image quality and asset fidelity: all visible characters use the repository's original-color, nearest-neighbor capybara still. No CSS recoloring remains. Every friend carries an independent `PetMotion` value; missing motion resources resolve to the static idle asset, allowing later GIF paths to be registered without changing the row structure.
- Copy and content: the privacy action remains the one-way “不对其展示”; the friend relationship and reverse projection remain unchanged. The two visibility settings remain independent and use the confirmed wording.
- Icons and controls: Tabler supplies standard UI icons. Buttons, menus, fields, custom-drawn checkbox surfaces, focus states, and disabled states retain semantic DOM controls. The 08 row action now matches the separate bordered ellipsis plus chevron treatment in the source.
- Accessibility and responsiveness: controls have labels and focus treatment; image alt text is present where meaningful. The fixed authority viewport passed, and the constrained desktop fallback remains in place below `1120 × 760`.

## Comparison History

### Pass 1 — User feedback

- P1: 02 differentiated friends through CSS hue, saturation, brightness, grayscale, and opacity instead of motion.
- P1: typography and controls read as a soft modern web UI rather than the reference's dense product-owned pixel surface.
- P2: 18 used a modern teal native checkbox fill instead of the source's hard outlined checkbox.
- Fixes: removed all pet color filters and muted-seat effects; added explicit motion semantics with static fallback; calibrated type size, weight, hard text shadows, borders, straight corners, hard shadows, menu density, and outlined checkboxes.

### Pass 2

- P2: after unifying the character asset, the fifth 02 seat touched the viewport edge and the row width exceeded the source crop.
- P2: 08 header spacing, main column split, add-friend action width, request actions, row menu shape, and selected-friend actions still drifted from the source.
- Fixes: resized and re-anchored the five-seat row without recoloring; restored the source-height `1100 × 820` window; aligned the header icon, `516px` left column, action widths, separate ellipsis/chevron row control, informational copy, and bottom actions.

### Pass 3

- Re-captured 00, 02, 08, and 18 at `1487 × 1058`.
- Opened the source and revised implementation together in the full and focused comparisons.
- No actionable P0, P1, or P2 differences remain within the approved renderer/mock scope and currently available character assets.

## Interaction and Runtime Checks

- 02: activating “下一组好友” changed the stable state to `page-2`.
- 08: activating “不对其展示” changed the state to `hidden-from-selected` while “小灰” remained in the accepted-friend list.
- 18: unchecking “允许好友查看我的活动状态” left “在桌面显示好友桌宠” checked.
- Browser console: no warnings or errors during the checked interaction path.
- Automated checks: 11 React tests passed; TypeScript checks passed; renderer build passed.

## Residual Follow-up Polish

- P3 / asset follow-up: add distinct working, meeting, slacking, away, clocked-out, and offline GIF files to `PET_MOTION_ASSET_PATHS` when those reviewed assets exist. Until then, original-color idle artwork is the intentional fallback.
- Real macOS menu-bar invocation, transparent-window placement, multi-display behavior, Retina/non-Retina switching, Spaces, Stage Manager, and click-through behavior remain outside this renderer-only QA.

final result: passed
