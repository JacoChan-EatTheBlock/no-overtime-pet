# Friend character asset provenance

These files are UI-prototype assets derived from the project authority images after Magnus approved cropping or generation when no standalone source image exists.

## Sources

- Desk characters: `design/image2-ui-v1/02-friends-desktop-row.png`
- Friend and request avatars: `design/image2-ui-v2-comments/04-friends-hide-from-selected.png`

## Process

1. The built-in image generation editor removed the composite UI/background while preserving the source character artwork on an alpha canvas.
2. The extracted alpha canvases were cropped into individual PNG files and placed on fixed transparent `192 × 192` desk-character or `64 × 64` avatar canvases.
3. Crops use nearest-neighbor resampling and are rendered with `image-rendering: pixelated`.

The full extraction evidence remains in `../extracted/`. `asset-contact-sheet.png` records the final crop set.

## Runtime boundary

These PNGs are static UI-prototype fallbacks, not a new animation format. Reviewed character GIFs can later be registered in `PET_MOTION_ASSET_PATHS` by `<friend id>:<motion>` without changing the HTML layout or inventing a parallel sprite runtime.

The source composites are project reference material. These derived assets are not claimed as independently cleared for commercial distribution.
