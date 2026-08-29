from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


FRAME_WIDTH = 96
FRAME_HEIGHT = 160
FRAME_COUNT = 8
COLUMNS = 8
ROWS = 1
FPS = 12
FRAME_DURATION_MS = 83
PIXEL_SIZE = 3
IMPACT_POINT = (48, 154)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(data)
    os.replace(temporary, path)


def atomic_write_text(path: Path, value: str) -> None:
    atomic_write_bytes(path, value.encode("utf-8"))


def atomic_write_json(path: Path, value: Any) -> None:
    atomic_write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def clean_transparent_rgb(image: Image.Image) -> Image.Image:
    array = np.asarray(image.convert("RGBA")).copy()
    array[array[:, :, 3] == 0, :3] = 0
    return Image.fromarray(array, mode="RGBA")


def alpha_composite_clipped(canvas: Image.Image, source: Image.Image, x: int, y: int) -> None:
    left = max(0, x)
    top = max(0, y)
    right = min(canvas.width, x + source.width)
    bottom = min(canvas.height, y + source.height)
    if right <= left or bottom <= top:
        return
    crop = source.crop((left - x, top - y, right - x, bottom - y))
    canvas.alpha_composite(crop, (left, top))


def build_frames(
    coin: Image.Image,
    motion: str,
) -> tuple[list[Image.Image], tuple[int, ...], tuple[int, ...]]:
    if motion == "spin":
        widths = (
            coin.width,
            max(3, round(coin.width * 0.25)),
            round(coin.width * 0.625),
            coin.width,
            round(coin.width * 0.625),
            max(3, round(coin.width * 0.25)),
            round(coin.width * 0.625),
            coin.width,
        )
    else:
        widths = (coin.width,) * FRAME_COUNT
    y_positions = (
        -coin.height,
        -coin.height + 10,
        -30,
        -12,
        10,
        38,
        70,
        IMPACT_POINT[1] - coin.height,
    )
    frames: list[Image.Image] = []
    for y, width in zip(y_positions, widths, strict=True):
        frame = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
        phase = coin.resize((width, coin.height), Image.Resampling.NEAREST)
        x = round((FRAME_WIDTH - phase.width) / 2)
        alpha_composite_clipped(frame, phase, x, y)
        frames.append(clean_transparent_rgb(frame))
    return frames, widths, y_positions


def approved_palette(source: Image.Image) -> tuple[tuple[int, int, int, int], ...]:
    source_colors = {
        tuple(int(value) for value in pixel)
        for row in np.asarray(source.convert("RGBA"))
        for pixel in row
        if int(pixel[3]) > 0
    }
    required_colors = {
        (77, 43, 54, 255),
        (226, 125, 36, 255),
        (255, 208, 69, 255),
        (255, 239, 135, 255),
    }
    if not required_colors.issubset(source_colors):
        raise ValueError("approved coin palette is incomplete")
    return (
        (77, 43, 54, 255),
        (226, 125, 36, 255),
        (255, 208, 69, 255),
        (255, 239, 135, 255),
    )


def build_yuan_coin(source: Image.Image) -> Image.Image:
    dark, orange, gold, light = approved_palette(source)
    grid = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    pixels = grid.load()
    for y in range(16):
        for x in range(16):
            distance = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if distance <= 7.45:
                pixels[x, y] = dark
            if distance <= 6.45:
                pixels[x, y] = orange
            if distance <= 5.55:
                pixels[x, y] = gold

    for x, y in ((4, 3), (5, 3), (3, 4), (4, 4)):
        pixels[x, y] = light

    yen_pixels = {
        (5, 4), (10, 4),
        (6, 5), (9, 5),
        (7, 6), (8, 6),
        (7, 7), (8, 7),
        *{(x, 8) for x in range(5, 11)},
        (7, 9), (8, 9),
        *{(x, 10) for x in range(5, 11)},
        (7, 11), (8, 11),
        (7, 12), (8, 12),
    }
    for x, y in yen_pixels:
        pixels[x, y] = dark

    return grid.resize((16 * PIXEL_SIZE, 16 * PIXEL_SIZE), Image.Resampling.NEAREST)


def build_platformer_coin(source: Image.Image) -> Image.Image:
    dark, orange, gold, light = approved_palette(source)
    grid = Image.new("RGBA", (14, 18), (0, 0, 0, 0))
    pixels = grid.load()
    for y in range(18):
        for x in range(14):
            ellipse = ((x - 6.5) / 6.5) ** 2 + ((y - 8.5) / 8.5) ** 2
            if ellipse <= 1.0:
                pixels[x, y] = dark
            if ellipse <= 0.80:
                pixels[x, y] = orange
            if ellipse <= 0.61:
                pixels[x, y] = gold

    for x, y in ((4, 3), (5, 3), (3, 4), (4, 4), (3, 5)):
        pixels[x, y] = light
    for y in range(4, 14):
        pixels[6, y] = light
        pixels[7, y] = orange
    pixels[6, 3] = gold
    pixels[7, 3] = orange
    pixels[6, 14] = gold
    pixels[7, 14] = orange
    return grid.resize((14 * PIXEL_SIZE, 18 * PIXEL_SIZE), Image.Resampling.NEAREST)


def save_strip(frames: list[Image.Image], path: Path) -> None:
    strip = Image.new(
        "RGBA",
        (FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * ROWS),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * FRAME_WIDTH, 0))
    clean_transparent_rgb(strip).save(path, format="PNG", optimize=True)


def gif_palette(coin: Image.Image) -> tuple[list[int], dict[tuple[int, int, int, int], int]]:
    colors = sorted(
        {
            tuple(int(value) for value in pixel)
            for row in np.asarray(coin.convert("RGBA"))
            for pixel in row
            if int(pixel[3]) > 0
        }
    )
    if len(colors) > 255:
        raise ValueError("coin contains too many colors for deterministic GIF palette")
    palette = [0, 0, 0]
    mapping: dict[tuple[int, int, int, int], int] = {}
    for index, color in enumerate(colors, start=1):
        palette.extend(color[:3])
        mapping[color] = index
    palette.extend([0] * (768 - len(palette)))
    return palette, mapping


def to_palette_frame(
    frame: Image.Image,
    palette: list[int],
    mapping: dict[tuple[int, int, int, int], int],
) -> Image.Image:
    rgba = np.asarray(frame.convert("RGBA"))
    indexed = np.zeros((FRAME_HEIGHT, FRAME_WIDTH), dtype=np.uint8)
    for color, palette_index in mapping.items():
        mask = np.all(rgba == np.asarray(color, dtype=np.uint8), axis=2)
        indexed[mask] = palette_index
    image = Image.fromarray(indexed, mode="P")
    image.putpalette(palette)
    image.info["transparency"] = 0
    return image


def save_transparent_gif(frames: list[Image.Image], coin: Image.Image, path: Path) -> None:
    palette, mapping = gif_palette(coin)
    gif_frames = [to_palette_frame(frame, palette, mapping) for frame in frames]
    durations = [140] + [FRAME_DURATION_MS] * (FRAME_COUNT - 2) + [220]
    gif_frames[0].save(
        path,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )


def checkerboard(size: tuple[int, int], cell: int = 8) -> Image.Image:
    image = Image.new("RGBA", size, (232, 228, 235, 255))
    draw = ImageDraw.Draw(image)
    darker = (205, 199, 211, 255)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=darker)
    return image


def save_contact_sheet(frames: list[Image.Image], path: Path) -> None:
    cell_width = FRAME_WIDTH + 8
    cell_height = FRAME_HEIGHT + 8
    sheet = Image.new("RGB", (cell_width * 4, cell_height * 2), (40, 28, 48))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = (index % 4) * cell_width + 4
        y = (index // 4) * cell_height + 4
        preview = checkerboard(frame.size)
        preview.alpha_composite(frame)
        sheet.paste(preview.convert("RGB"), (x, y))
        draw.text((x + 4, y + 4), f"{index:02d}", fill=(77, 43, 54))
    sheet.save(path, format="PNG", optimize=True)


def foreground_bbox(frame: Image.Image) -> list[int] | None:
    alpha = np.asarray(frame.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(alpha >= 128)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def build(source_coin: Path, output_dir: Path, coin_style: str, motion: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    source = clean_transparent_rgb(Image.open(source_coin).convert("RGBA"))
    if source.size != (18, 18):
        raise ValueError(f"expected the approved 18x18 coin source, got {source.size}")

    atomic_write_bytes(output_dir / "coin-source.png", source_coin.read_bytes())
    coin_builder = build_platformer_coin if coin_style == "platformer" else build_yuan_coin
    coin = clean_transparent_rgb(coin_builder(source))
    coin_path = output_dir / "coin-large.png"
    coin.save(coin_path, format="PNG", optimize=True)

    frames, frame_widths, y_positions = build_frames(coin, motion)
    frame_dir = output_dir / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for existing in frame_dir.glob("frame-*.png"):
        existing.unlink()
    for index, frame in enumerate(frames):
        frame.save(frame_dir / f"frame-{index:02d}.png", format="PNG", optimize=True)

    strip_path = output_dir / "NANG_FEE_COIN_DROP-strip.png"
    gif_path = output_dir / "preview-transparent.gif"
    contact_path = output_dir / "contact-sheet-alpha.png"
    save_strip(frames, strip_path)
    save_transparent_gif(frames, coin, gif_path)
    save_contact_sheet(frames, contact_path)

    manifest = {
        "schemaVersion": "1.0-prototype",
        "effectId": "NANG_FEE_COIN_DROP",
        "assetVersion": output_dir.name,
        "renderLayer": "FOREGROUND_EFFECT",
        "compositionMode": "ALPHA_OVER",
        "coinStyle": "ORIGINAL_CLASSIC_PLATFORMER_GOLD_COIN" if coin_style == "platformer" else "ORIGINAL_YUAN_PIXEL_COIN",
        "animationStyle": "STRAIGHT_DROP" if motion == "straight" else "PICKUP_SPIN_DROP",
        "texture": strip_path.name,
        "scaleMode": "NEAREST",
        "frame": {
            "width": FRAME_WIDTH,
            "height": FRAME_HEIGHT,
            "count": FRAME_COUNT,
            "columns": COLUMNS,
            "rows": ROWS,
            "fps": FPS,
            "durationMs": FRAME_DURATION_MS,
        },
        "loop": False,
        "target": {
            "characterAnchor": "head",
            "effectImpactPoint": {"x": IMPACT_POINT[0], "y": IMPACT_POINT[1]},
        },
        "eventFrames": {"impact": [7]},
        "contentHashSha256": sha256_file(strip_path),
        "preview": {
            "file": gif_path.name,
            "transparent": True,
            "runtimeAsset": False,
        },
    }
    atomic_write_json(output_dir / "effect-manifest.prototype.json", manifest)

    arrays = [np.asarray(frame.convert("RGBA")) for frame in frames]
    corner_alpha = [
        [
            int(array[0, 0, 3]),
            int(array[0, -1, 3]),
            int(array[-1, 0, 3]),
            int(array[-1, -1, 3]),
        ]
        for array in arrays
    ]
    transparent_rgb_zero = [
        bool(np.all(array[array[:, :, 3] == 0, :3] == 0)) for array in arrays
    ]
    bottom_six_rows_transparent = [
        bool(np.all(array[-6:, :, 3] == 0)) for array in arrays
    ]
    bboxes = [foreground_bbox(frame) for frame in frames]
    opaque_counts = [int((array[:, :, 3] >= 128).sum()) for array in arrays]
    strip = Image.open(strip_path).convert("RGBA")
    strip_array = np.asarray(strip)
    structural_pass = (
        strip.size == (FRAME_WIDTH * COLUMNS, FRAME_HEIGHT)
        and all(all(value == 0 for value in corners) for corners in corner_alpha)
        and all(transparent_rgb_zero)
        and all(bottom_six_rows_transparent)
        and bboxes[0] is None
        and all(box is not None for box in bboxes[1:])
        and bool(np.all(strip_array[strip_array[:, :, 3] == 0, :3] == 0))
    )
    atomic_write_json(
        output_dir / "qa.json",
        {
            "generatedAt": now_iso(),
            "structuralPass": structural_pass,
            "manualReviewRequired": True,
            "manualReviewItems": [
                "coin reads as deliberately oversized but not comedic-impact exaggerated",
                "coin body reads as an original classic platform-game gold coin without copying a specific game sprite",
                "fall direction is immediately readable and the coin itself does not rotate",
                "no character, desk, shadow, backdrop, bruise, or impact prop is present",
                "last frame aligns naturally to each character head anchor",
            ],
            "source": {
                "file": "coin-source.png",
                "sha256": sha256_file(output_dir / "coin-source.png"),
            },
            "output": {
                "coinSize": list(coin.size),
                "coinStyle": coin_style,
                "motion": motion,
                "frameSize": [FRAME_WIDTH, FRAME_HEIGHT],
                "frameCount": FRAME_COUNT,
                "stripSize": list(strip.size),
                "layout": {"columns": COLUMNS, "rows": ROWS, "order": "left-to-right"},
                "yPositions": list(y_positions),
                "frameCoinWidths": list(frame_widths),
                "impactPoint": list(IMPACT_POINT),
                "foregroundBoxes": bboxes,
                "opaquePixelCounts": opaque_counts,
                "cornerAlpha": corner_alpha,
                "transparentRgbZero": transparent_rgb_zero,
                "bottomSixRowsTransparent": bottom_six_rows_transparent,
                "stripSha256": sha256_file(strip_path),
                "gifSha256": sha256_file(gif_path),
            },
        },
    )
    print(f"GENERATED structural_pass={structural_pass}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a character-independent falling coin effect strip.")
    parser.add_argument("--source-coin", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--coin-style", choices=["yuan", "platformer"], default="yuan")
    parser.add_argument("--motion", choices=["straight", "spin"], default="spin")
    args = parser.parse_args()
    build(args.source_coin.resolve(), args.output_dir.resolve(), args.coin_style, args.motion)


if __name__ == "__main__":
    main()
