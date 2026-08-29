# Task Schedule UI Design QA

## Comparison target

- Source visual truth:
  - `design/image2-ui-v1/01-click-todo-panel.png`
  - `design/image2-ui-v2-comments/01-task-auto-ai.png`
  - `design/image2-ui-v2-comments/02-ai-confirm-suggestions.png`
  - `design/image2-ui-v1/07-schedule-commitment.png`
  - `design/image2-ui-v1/12-clockout-confirmation.png`
  - `design/image2-ui-v1/13-clockout-success.png`
- Final implementation evidence:
  - `design/qa/task-schedule/01-task-bubble-final.png`
  - `design/qa/task-schedule/05-task-list-final.png`
  - `design/qa/task-schedule/06-ai-analysis-final.png`
  - `design/qa/task-schedule/07-schedule-draft-final.png`
  - `design/qa/task-schedule/12-clockout-confirm-final.png`
  - `design/qa/task-schedule/13-clockout-success-final.png`
- State: the six stable states named by the UI reconstruction specification: task bubble, task capture, AI proposal, schedule draft, clock-out confirmation, and successful settlement.

## Viewport and normalization

- CSS viewport: 1487 × 1058.
- Source pixels: 1487 × 1058 for every reference image.
- Implementation pixels: 1487 × 1058 for every final screenshot.
- Density normalization: none required; the explicit browser viewport and PNG pixel dimensions are 1:1, equivalent to device scale factor 1 for this comparison.
- The Windows wallpaper, desktop icons, native title-bar controls, and taskbar in the historical references were excluded from product-UI judgment because current project rules explicitly defer Windows and prohibit reconstructing system chrome. The app-owned surface, content, and pet placement were compared at the same full viewport.

## Full-view comparison evidence

- 01: bubble frame position and size, title baseline, primary/secondary buttons, five-segment commitment progress, next-task row, footer metrics, tail, and pet anchor were compared together.
- 05: main frame, left task list, tab widths, task-row rhythm, right capture panel, field sizes, labels, CTA stack, and pet anchor were compared together.
- 06: modal frame, header, AI disclaimer, task summary, proposal table, subtask table, footer actions, and pet anchor were compared together.
- 07: main frame, time labels, schedule-block heights, right commitment panel, warning, CTA stack, and pet anchor were compared together.
- 12: confirmation frame, progress block, incomplete-task list, three messages, action buttons, adjustment card, and pet anchor were compared together.
- 13: result frame, success mark, display heading, settlement rows, timeline, actions, settlement hint, and celebrating pet were compared together.

## Focused region comparison evidence

- Typography: headings, small labels, task rows, form labels, buttons, warning copy, and settlement rows were inspected at original resolution. The implementation now uses an explicit CJK UI font stack, screen-specific font sizes, controlled weights, line heights, and display-letter spacing instead of browser-default heading weights.
- Controls and surfaces: buttons, inputs, selects, status chips, progress segments, schedule blocks, internal borders, and drop shadows were inspected at original resolution. Final controls use square corners, hard stepped shadows, crisp icon strokes, and feature-scoped pixel borders.
- Image quality: the existing transparent idle capybara remains pixel-rendered on screens 01/05/06/07/12. Screen 13 uses `apps/desktop/renderer/public/assets/capybara/celebrate.png`, a transparent 256 × 256 image generated from the authoritative idle identity and the reference celebration pose, then inspected against the final screenshot.
- Copy/content: all app-owned reference copy is represented or adapted to the approved product contracts. No per-task “交给 AI 分析” action appears; task creation proceeds directly to the AI proposal state.

## Findings

- No actionable P0, P1, or P2 visual mismatch remains at the formal 1487 × 1058 viewport.
- [P3] The reference uses a few bespoke bitmap glyphs (clipboard, robot, success seal) while the implementation uses the existing Tabler icon family with crisp square strokes. This remains a minor icon-art refinement, not a layout, typography, usability, or product-flow blocker.
- [P3] Font rasterization may differ slightly on a real Apple Silicon Mac because this QA capture was rendered on Windows. The explicit stack prioritizes Microsoft YaHei UI for reference matching and falls back to PingFang SC on macOS.

## Comparison history

### Pass 1

- Earlier findings: [P1] the frame used the existing pixel surface, but internal buttons, fields, dividers, shadows, and icons still read as a conventional web UI; [P2] several windows and pet anchors drifted from the references.
- Fixes: introduced feature-scoped square controls, stepped hard shadows, crisp SVG strokes, stronger pixel dividers, and first-round frame/content positioning.
- Post-fix evidence: `design/qa/task-schedule/*-pass-2.png`.

### Pass 2

- Earlier findings: [P2] heading/body weight and scale did not match the reference density; the task capture panel was too narrow, the clock-out confirmation vertical rhythm was compressed, and the success screen used the idle pose.
- Fixes: calibrated the explicit CJK font stack, title/body/button sizes and weights; corrected task-panel grid width, confirmation spacing, screen/pet anchors, success title/timeline geometry, and added the transparent celebration asset.
- Post-fix evidence: the six `design/qa/task-schedule/*-final.png` files listed above.

## Primary interactions and console

- Covered interactions: task filtering and creation; automatic transition into AI analysis; adopt/edit/reject/re-analyse; schedule lock/duration/commitment controls; task completion; clock-out return/adjust/confirm; successful and incomplete settlement outcomes.
- Browser capture passes reported no console errors or warnings. The final asset loaded successfully in the rendered success screenshot.
- Automated interaction coverage is recorded in `apps/desktop/renderer/src/features/task-schedule/TaskScheduleFlow.test.tsx`.

## Residual validation boundaries

- Verified: six formal stable states at 1487 × 1058, frontend-only state transitions, mock data, focused typography/control/image comparisons, and absence of the deleted per-task AI entry.
- Not verified: real Apple Silicon font rasterization, packaged Electron window behavior, backend persistence, live AI analysis, cross-process IPC, or system desktop/taskbar integration. These are outside this UI-only task.

final result: passed

---

# Task Schedule Standalone HTML Design QA

## Comparison target

- Product references: the same six authoritative task and schedule images listed above.
- Standalone implementation: `apps/desktop/renderer/src/features/task-schedule-html/`.
- Final implementation screenshots: `design/qa/task-schedule-html/final/`.
- Same-viewport reference/implementation pairs: `design/qa/task-schedule-html/comparisons-final/`.
- Equal-size product-window crops: `design/qa/task-schedule-html/focused-final/`.
- Six-screen review matrix: `design/qa/task-schedule-html/contact-final.png`.

## Viewport and normalization

- CSS viewport and implementation capture: 1487 × 1058, device scale factor 1.
- References were normalized to the same 1487 × 1058 comparison canvas only where their source PNG was one pixel narrower or taller.
- Each full-view comparison places the reference on the left and the standalone HTML render on the right.
- Windows wallpaper, desktop icons, taskbar and native window chrome are intentionally absent from the HTML render; they are outside the app-owned UI and outside the current macOS MVP boundary.

## Findings and fixes

- Pass 1 [P1]: generic headline glyphs made the task, AI, schedule and success screens feel like a conventional web UI. Fixed by extracting the authoritative pixel clipboard, robot, calendar and success artwork and preserving pixel rendering.
- Pass 1 [P2]: flat surface fill and a smooth speech-bubble tail weakened the reference's pixel character. Fixed with a warm radial surface, stepped frame geometry, hard shadows and a stepped tail.
- Pass 2 [P1]: the success mark flexed vertically and collided with the heading. Fixed with a non-shrinking success-art slot and rebalanced display-title spacing.
- Pass 3 [P2]: the schedule timeline panel started too far left and enclosed the hour labels, unlike the reference. Fixed by reserving the reference's external hour gutter and matching the timeline/commitment column widths.
- Pass 4 [P2]: the success heading color and stroke density were lighter than the reference. Fixed with the measured dark blue-black title color, controlled CJK font stack, weight and sub-pixel stroke.
- Final review: no actionable P0, P1 or P2 mismatch remains at the formal viewport.

## Primary interactions and console

- Browser-verified: completed-task filtering returns 2 visible tasks; cancel prevents an empty task submission; form data reaches the AI page through query parameters.
- Browser-verified: reject all marks 7 suggestions, re-analyse restores all 7, edit reveals the inline editor, and confirm enters the schedule page.
- Browser-verified: commitment checkbox count changes from 5 to 4; duration adjustment publishes the expected Mock status.
- Browser-verified: two task completions reach 5/5 and disable the completion action; clock-out adjustment and successful settlement status both update.
- Browser console at the end of the full flow: 0 errors, 0 warnings.

## Residual validation boundaries

- Verified: all six standalone HTML states, same-viewport and equal-size product-window comparisons, core Mock interactions, local navigation, typography and app-owned pixel artwork.
- Not verified: real Apple Silicon/PingFang rasterization, packaged Electron transparency, backend persistence, live AI, scheduling services, or OS desktop/taskbar integration.

final result: passed
