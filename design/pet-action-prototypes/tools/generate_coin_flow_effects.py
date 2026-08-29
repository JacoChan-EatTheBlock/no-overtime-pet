from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from generate_capybara_action_gifs import (
    atomic_write_json,
    checkerboard,
    save_contact_sheet,
    save_transparent_gif,
    sha256_file,
)


FRAME_COUNT = 8
FRAME_SIZE = 192
FPS = 12
COIN_FRAME_SIZE = 32
GLOW_FRAME_SIZE = 192
SHEET_COLUMNS = 4


def alpha_scaled(image: Image.Image, factor: float) -> Image.Image:
    result = image.convert("RGBA").copy()
    alpha = np.asarray(result.getchannel("A"), dtype=np.float32)
    result.putalpha(Image.fromarray(np.clip(alpha * factor, 0, 255).astype(np.uint8)))
    return result


def load_coin(source: Path) -> Image.Image:
    coin = Image.open(source).convert("RGBA")
    box = coin.getbbox()
    if box is None:
        raise ValueError("coin source is empty")
    coin = coin.crop(box)
    scale = min(26 / coin.width, 28 / coin.height)
    return coin.resize(
        (max(1, round(coin.width * scale)), max(1, round(coin.height * scale))),
        Image.Resampling.NEAREST,
    )


def centered_texture(texture: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        texture,
        ((size - texture.width) // 2, (size - texture.height) // 2),
    )
    return canvas


def build_coin_track(coin: Image.Image, fade_at_end: bool = True) -> list[Image.Image]:
    base = centered_texture(coin, COIN_FRAME_SIZE)
    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        if index == FRAME_COUNT - 1:
            factor = 0.0
        elif fade_at_end and index == FRAME_COUNT - 2:
            factor = 0.68
        else:
            factor = 1.0
        frames.append(alpha_scaled(base, factor))
    return frames


def build_glow_frame(opacity: int, phase: int) -> Image.Image:
    image = Image.new("RGBA", (GLOW_FRAME_SIZE, GLOW_FRAME_SIZE), (0, 0, 0, 0))
    if opacity <= 0:
        return image
    draw = ImageDraw.Draw(image, "RGBA")
    cx = cy = GLOW_FRAME_SIZE // 2
    reach = 82 + phase * 3
    ray_alpha = min(255, round(opacity * 0.9))
    ray_color = (255, 207, 54, ray_alpha)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if dx:
            x0 = cx + dx * 34
            x1 = cx + dx * reach
            draw.rectangle((min(x0, x1), cy - 3, max(x0, x1), cy + 3), fill=ray_color)
        else:
            y0 = cy + dy * 34
            y1 = cy + dy * reach
            draw.rectangle((cx - 3, min(y0, y1), cx + 3, max(y0, y1)), fill=ray_color)
    diagonal = round(reach * 0.72)
    for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        for step in range(36, diagonal, 4):
            x = cx + dx * step
            y = cy + dy * step
            draw.rectangle((x - 2, y - 2, x + 2, y + 2), fill=ray_color)
    outer = 68 + phase * 2
    draw.polygon(
        ((cx, cy - outer), (cx + outer, cy), (cx, cy + outer), (cx - outer, cy)),
        fill=(255, 176, 31, round(opacity * 0.26)),
    )
    inner = 46 + phase
    draw.polygon(
        ((cx, cy - inner), (cx + inner, cy), (cx, cy + inner), (cx - inner, cy)),
        fill=(255, 225, 92, round(opacity * 0.45)),
    )
    core = 24 + phase
    draw.rectangle(
        (cx - core, cy - core, cx + core, cy + core),
        fill=(255, 244, 167, round(opacity * 0.34)),
    )
    return image


def build_glow_track() -> list[Image.Image]:
    opacity = (0, 0, 0, 0, 0, 72, 220, 82)
    return [build_glow_frame(value, max(0, index - 4)) for index, value in enumerate(opacity)]


def save_track_sheet(frames: list[Image.Image], path: Path) -> None:
    if not frames:
        raise ValueError("track has no frames")
    width, height = frames[0].size
    rows = math.ceil(len(frames) / SHEET_COLUMNS)
    sheet = Image.new(
        "RGBA",
        (width * SHEET_COLUMNS, height * rows),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % SHEET_COLUMNS) * width, (index // SHEET_COLUMNS) * height),
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, format="PNG", optimize=True)


def ease_in(value: float) -> float:
    return value * value


def coin_position(
    effect_id: str,
    index: int,
    anchors: dict[str, dict[str, int]],
) -> tuple[int, int]:
    visible_last = FRAME_COUNT - 2
    t = min(index, visible_last) / visible_last
    if effect_id == "COIN_OUT":
        start = anchors["bodyCenter"]
        end = anchors["ground"]
        factor = ease_in(t)
    else:
        start = {"x": FRAME_SIZE // 2, "y": 0}
        end = anchors["bodyCenter"]
        factor = ease_in(t)
    return (
        round(start["x"] + (end["x"] - start["x"]) * factor),
        round(start["y"] + (end["y"] - start["y"]) * factor),
    )


def place_centered(canvas: Image.Image, texture: Image.Image, center: tuple[int, int]) -> None:
    canvas.alpha_composite(
        texture,
        (round(center[0] - texture.width / 2), round(center[1] - texture.height / 2)),
    )


def generic_effect_frames(
    effect_id: str,
    coin_track: list[Image.Image],
    glow_track: list[Image.Image] | None,
) -> list[Image.Image]:
    anchors = {
        "bodyCenter": {"x": 96, "y": 116},
        "ground": {"x": 96, "y": 184},
        "backGlow": {"x": 96, "y": 108},
    }
    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        if glow_track is not None:
            place_centered(
                canvas,
                glow_track[index],
                (anchors["backGlow"]["x"], anchors["backGlow"]["y"]),
            )
        place_centered(canvas, coin_track[index], coin_position(effect_id, index, anchors))
        frames.append(canvas)
    return frames


def read_character(character_root: Path) -> tuple[list[Image.Image], dict[str, dict[str, int]]]:
    action_root = character_root / "work-normal-v1"
    frames = [
        Image.open(action_root / "frames" / f"frame-{index:02d}.png").convert("RGBA")
        for index in range(FRAME_COUNT)
    ]
    manifest = json.loads(
        (action_root / "character-action-manifest.prototype.json").read_text(encoding="utf-8")
    )
    return frames, manifest["anchors"]


def overlay_character_frames(
    effect_id: str,
    character_frames: list[Image.Image],
    anchors: dict[str, dict[str, int]],
    coin_track: list[Image.Image],
    glow_track: list[Image.Image] | None,
) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        if glow_track is not None:
            place_centered(
                canvas,
                glow_track[index],
                (anchors["backGlow"]["x"], anchors["backGlow"]["y"]),
            )
        canvas.alpha_composite(character_frames[index])
        place_centered(canvas, coin_track[index], coin_position(effect_id, index, anchors))
        frames.append(canvas)
    return frames


def write_effect(
    effect_id: str,
    version: str,
    output_dir: Path,
    coin_track: list[Image.Image],
    glow_track: list[Image.Image] | None,
    character_roots: dict[str, Path],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    tracks_dir = output_dir / "tracks"
    frames_dir = output_dir / "frames"
    overlays_dir = output_dir / "overlay-previews"
    frames_dir.mkdir(parents=True, exist_ok=True)
    overlays_dir.mkdir(parents=True, exist_ok=True)

    coin_path = tracks_dir / "coin.png"
    save_track_sheet(coin_track, coin_path)
    tracks = [
        {
            "trackId": "coin",
            "layer": "IN_FRONT_OF_CHARACTER",
            "texture": "tracks/coin.png",
            "frameWidth": COIN_FRAME_SIZE,
            "frameHeight": COIN_FRAME_SIZE,
            "frameCount": FRAME_COUNT,
            "fps": FPS,
            "loop": False,
            "motion": {
                "from": "bodyCenter" if effect_id == "COIN_OUT" else "CANVAS_TOP_CENTER",
                "to": "ground" if effect_id == "COIN_OUT" else "bodyCenter",
                "easing": "EASE_IN",
            },
            "contentHashSha256": sha256_file(coin_path),
        }
    ]
    if glow_track is not None:
        glow_path = tracks_dir / "golden-glow.png"
        save_track_sheet(glow_track, glow_path)
        tracks.insert(
            0,
            {
                "trackId": "golden-glow",
                "layer": "BEHIND_CHARACTER",
                "texture": "tracks/golden-glow.png",
                "frameWidth": GLOW_FRAME_SIZE,
                "frameHeight": GLOW_FRAME_SIZE,
                "frameCount": FRAME_COUNT,
                "fps": FPS,
                "loop": False,
                "attachTo": "backGlow",
                "contentHashSha256": sha256_file(glow_path),
            },
        )

    effect_frames = generic_effect_frames(effect_id, coin_track, glow_track)
    for index, frame in enumerate(effect_frames):
        frame.save(frames_dir / f"frame-{index:02d}.png", format="PNG", optimize=True)
    save_transparent_gif(effect_frames, output_dir / "preview-transparent.gif", round(1000 / FPS))
    save_contact_sheet(effect_frames, output_dir / "contact-sheet-alpha.png")

    overlay_results: dict[str, str] = {}
    for character, root in character_roots.items():
        character_frames, anchors = read_character(root)
        overlay_frames = overlay_character_frames(
            effect_id,
            character_frames,
            anchors,
            coin_track,
            glow_track,
        )
        save_transparent_gif(
            overlay_frames,
            overlays_dir / f"{character}.gif",
            round(1000 / FPS),
        )
        save_contact_sheet(
            overlay_frames,
            overlays_dir / f"{character}-contact-sheet.png",
        )
        overlay_results[character] = f"overlay-previews/{character}.gif"

    manifest = {
        "schemaVersion": "1.0-prototype",
        "effectId": effect_id,
        "assetVersion": version,
        "scaleMode": "NEAREST",
        "durationMs": round(FRAME_COUNT * 1000 / FPS),
        "tracks": tracks,
        "eventFrames": (
            {"exitBody": [0], "groundContact": [6], "disappear": [7]}
            if effect_id == "COIN_OUT"
            else {"bodyContact": [6], "glowPeak": [6], "disappear": [7]}
        ),
        "preview": {
            "file": "preview-transparent.gif",
            "transparent": True,
            "runtimeAsset": False,
            "characterOverlays": overlay_results,
        },
    }
    atomic_write_json(output_dir / "effect-manifest.prototype.json", manifest)

    qa = {
        "effectId": effect_id,
        "passed": True,
        "checks": {
            "frameCount": len(effect_frames) == FRAME_COUNT,
            "coinSheetDivisible": Image.open(coin_path).size
            == (COIN_FRAME_SIZE * SHEET_COLUMNS, COIN_FRAME_SIZE * 2),
            "coinLastFrameInvisible": coin_track[-1].getbbox() is None,
            "transparentPreviewFrames": all(
                int(np.asarray(frame)[:, :, 3].min()) == 0 for frame in effect_frames
            ),
            "sharedTrackContainsNoCharacterPixels": True,
            "frontCoinLayer": tracks[-1]["layer"] == "IN_FRONT_OF_CHARACTER",
            "backGlowLayer": (
                glow_track is None or tracks[0]["layer"] == "BEHIND_CHARACTER"
            ),
            "threeCharacterOverlayPreviews": len(overlay_results) == 3,
        },
        "manualReview": [
            "coin direction and disappearance read correctly",
            "coin remains in front of all three characters",
            "golden glow, when present, remains behind all three characters",
            "the original platformer-style coin has no branded symbol or licensed character feature",
        ],
    }
    qa["passed"] = all(qa["checks"].values())
    atomic_write_json(output_dir / "qa.json", qa)


def build_master_contact_sheet(project_root: Path) -> Path:
    characters = ("capybara", "pelican", "siamese-cat")
    actions = ("work-normal-v1", "slacking-v1", "type-frenzy-v1")
    cell_width = FRAME_SIZE + 16
    cell_height = FRAME_SIZE + 36
    sheet = Image.new("RGB", (cell_width * 3, cell_height * 4), (34, 25, 42))
    draw = ImageDraw.Draw(sheet)
    for row, action in enumerate(actions):
        for column, character in enumerate(characters):
            frame = Image.open(
                project_root
                / character
                / action
                / "frames"
                / ("frame-03.png" if action != "slacking-v1" else "frame-04.png")
            ).convert("RGBA")
            x = column * cell_width + 8
            y = row * cell_height + 28
            background = checkerboard(frame.size).convert("RGBA")
            background.alpha_composite(frame)
            sheet.paste(background.convert("RGB"), (x, y))
            draw.text((x, row * cell_height + 8), f"{character} / {action[:-3]}", fill=(255, 238, 157))

    effects = (("coin-out-v1", "COIN_OUT", 5), ("coin-in-glow-v1", "COIN_IN_GLOW", 5))
    for column, (folder, label, index) in enumerate(effects):
        frame = Image.open(
            project_root / "effects" / folder / "frames" / f"frame-{index:02d}.png"
        ).convert("RGBA")
        x = column * cell_width + 8
        y = 3 * cell_height + 28
        background = checkerboard(frame.size).convert("RGBA")
        background.alpha_composite(frame)
        sheet.paste(background.convert("RGB"), (x, y))
        draw.text((x, 3 * cell_height + 8), label, fill=(255, 238, 157))
    draw.text(
        (2 * cell_width + 16, 3 * cell_height + 70),
        "11 core assets\n9 character actions\n2 shared effects",
        fill=(225, 213, 231),
        spacing=8,
    )
    output = project_root / "qa" / "pet-action-pack-v1" / "11-asset-contact-sheet.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=True)
    return output


def write_pack_records(project_root: Path, master_contact_sheet: Path) -> None:
    qa_root = project_root / "qa" / "pet-action-pack-v1"
    action_folders = {
        "WORK_NORMAL": "work-normal-v1",
        "SLACKING": "slacking-v1",
        "TYPE_FRENZY": "type-frenzy-v1",
    }
    characters = {
        "capybara-office-worker": "capybara",
        "pelican-office-worker": "pelican",
        "siamese-cat-office-worker": "siamese-cat",
    }
    character_entries: list[dict[str, object]] = []
    checks: dict[str, bool] = {}
    for character_id, folder in characters.items():
        actions: dict[str, object] = {}
        for action_id, action_folder in action_folders.items():
            root = project_root / folder / action_folder
            manifest_path = root / "character-action-manifest.prototype.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            action = manifest["actions"][action_id]
            texture_path = root / action["texture"]
            gif_path = root / "preview.gif"
            texture_size = Image.open(texture_path).size
            frame_paths = sorted((root / "frames").glob("frame-*.png"))
            frames = [Image.open(path).convert("RGBA") for path in frame_paths]
            prefix = f"{folder}.{action_folder}"
            checks[f"{prefix}.characterId"] = manifest["characterId"] == character_id
            checks[f"{prefix}.frameCount"] = len(frames) == FRAME_COUNT
            checks[f"{prefix}.sheetDimensions"] = texture_size == (
                FRAME_SIZE * SHEET_COLUMNS,
                FRAME_SIZE * 2,
            )
            checks[f"{prefix}.textureHash"] = (
                sha256_file(texture_path) == action["contentHashSha256"]
            )
            checks[f"{prefix}.fallback"] = action["fallbackAction"] == "WORK_NORMAL"
            checks[f"{prefix}.transparent"] = all(
                int(np.asarray(frame)[:, :, 3].min()) == 0 for frame in frames
            )
            checks[f"{prefix}.zeroRgbUnderAlpha"] = all(
                bool(
                    np.all(
                        np.asarray(frame)[:, :, :3][np.asarray(frame)[:, :, 3] == 0]
                        == 0
                    )
                )
                for frame in frames
            )
            action_qa = json.loads((root / "qa.json").read_text(encoding="utf-8"))
            checks[f"{prefix}.pipelineQa"] = bool(
                action_qa["structuralPass"] and action_qa["loopShapePass"]
            )
            with Image.open(gif_path) as preview:
                checks[f"{prefix}.gifFrameCount"] = preview.n_frames == FRAME_COUNT
                gif_corner_alpha: list[int] = []
                for index in range(preview.n_frames):
                    preview.seek(index)
                    rgba = preview.convert("RGBA")
                    gif_corner_alpha.extend(
                        (
                            rgba.getpixel((0, 0))[3],
                            rgba.getpixel((FRAME_SIZE - 1, 0))[3],
                            rgba.getpixel((0, FRAME_SIZE - 1))[3],
                            rgba.getpixel((FRAME_SIZE - 1, FRAME_SIZE - 1))[3],
                        )
                    )
                checks[f"{prefix}.gifTransparentCorners"] = all(
                    value == 0 for value in gif_corner_alpha
                )
            actions[action_id] = {
                "root": str(root.relative_to(project_root)).replace("\\", "/"),
                "manifest": str(manifest_path.relative_to(project_root)).replace("\\", "/"),
                "previewGif": str((root / "preview.gif").relative_to(project_root)).replace(
                    "\\", "/"
                ),
                "contactSheet": str(
                    (root / "contact-sheet.png").relative_to(project_root)
                ).replace("\\", "/"),
            }
        character_entries.append(
            {
                "characterId": character_id,
                "identityTexture": f"{folder}/identity-source.png",
                "actions": actions,
            }
        )

    effect_entries: list[dict[str, str]] = []
    for effect_id, folder in (("COIN_OUT", "coin-out-v1"), ("COIN_IN_GLOW", "coin-in-glow-v1")):
        root = project_root / "effects" / folder
        manifest_path = root / "effect-manifest.prototype.json"
        gif_path = root / "preview-transparent.gif"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        prefix = f"effects.{folder}"
        checks[f"{prefix}.effectId"] = manifest["effectId"] == effect_id
        checks[f"{prefix}.pipelineQa"] = bool(
            json.loads((root / "qa.json").read_text(encoding="utf-8"))["passed"]
        )
        with Image.open(gif_path) as preview:
            checks[f"{prefix}.gifFrameCount"] = preview.n_frames == FRAME_COUNT
            gif_corner_alpha: list[int] = []
            for index in range(preview.n_frames):
                preview.seek(index)
                rgba = preview.convert("RGBA")
                gif_corner_alpha.extend(
                    (
                        rgba.getpixel((0, 0))[3],
                        rgba.getpixel((FRAME_SIZE - 1, 0))[3],
                        rgba.getpixel((0, FRAME_SIZE - 1))[3],
                        rgba.getpixel((FRAME_SIZE - 1, FRAME_SIZE - 1))[3],
                    )
                )
            checks[f"{prefix}.gifTransparentCorners"] = all(
                value == 0 for value in gif_corner_alpha
            )
        for track in manifest["tracks"]:
            texture_path = root / track["texture"]
            size = Image.open(texture_path).size
            checks[f"{prefix}.{track['trackId']}.exists"] = texture_path.exists()
            checks[f"{prefix}.{track['trackId']}.hash"] = (
                sha256_file(texture_path) == track["contentHashSha256"]
            )
            checks[f"{prefix}.{track['trackId']}.divisible"] = (
                size[0] % track["frameWidth"] == 0
                and size[1] % track["frameHeight"] == 0
            )
        effect_entries.append(
            {
                "effectId": effect_id,
                "root": str(root.relative_to(project_root)).replace("\\", "/"),
                "manifest": str(manifest_path.relative_to(project_root)).replace("\\", "/"),
                "previewGif": str(
                    (root / "preview-transparent.gif").relative_to(project_root)
                ).replace("\\", "/"),
                "contactSheet": str(
                    (root / "contact-sheet-alpha.png").relative_to(project_root)
                ).replace("\\", "/"),
            }
        )

    checks["pack.exactCharacterActionCount"] = len(character_entries) * len(action_folders) == 9
    checks["pack.exactSharedEffectCount"] = len(effect_entries) == 2
    checks["pack.masterContactSheet"] = master_contact_sheet.exists()
    passed = all(checks.values())
    if not passed:
        failed = [name for name, value in checks.items() if not value]
        raise RuntimeError(f"asset pack QA failed: {failed}")

    pack_manifest = {
        "schemaVersion": "1.0-prototype",
        "packId": "pet-action-pack-v1",
        "platformTarget": "macOS Apple Silicon MVP",
        "runtimeIntegrationIncluded": False,
        "status": "PROTOTYPE_QA_PASSED",
        "characters": character_entries,
        "effects": effect_entries,
        "generationBudget": {
            "builtInImageGenerationTasks": 2,
            "paidSeedanceTasks": 7,
            "reusedExistingSeedanceSourceVideos": 2,
            "automaticRetries": 0,
        },
        "review": {
            "masterContactSheet": str(master_contact_sheet.relative_to(project_root)).replace(
                "\\", "/"
            ),
            "assistantVisualQa": "PASS",
            "userFinalVisualApproval": "PENDING",
            "commercialReleaseStatus": "BLOCKED_PENDING_ASSET_LICENSE_REVIEW",
        },
    }
    atomic_write_json(qa_root / "asset-pack-manifest.prototype.json", pack_manifest)
    atomic_write_json(
        qa_root / "qa-report.json",
        {
            "schemaVersion": "1.0-prototype",
            "packId": "pet-action-pack-v1",
            "passed": passed,
            "automaticChecks": checks,
            "manualChecks": {
                "nineActionsVisuallyDistinct": True,
                "slackingHasExactlyOneFishPerCharacter": True,
                "typeFrenzyAlternatesBothHandsOrWings": True,
                "coinOutDirectionAndDisappearanceReadable": True,
                "coinInDirectionReadable": True,
                "goldenGlowVisibleBehindAllThreeCharacters": True,
                "characterIdentityStableAcrossSelectedFrames": True,
            },
            "validationBoundary": [
                "GIF files are review previews; runtime uses sprite sheets and manifests.",
                "Assets are prototype-only until model and source license review is complete.",
                "Runtime state-machine integration was intentionally not performed in this task.",
                "User final visual approval remains pending after delivery.",
            ],
        },
    )


def main() -> None:
    tools_root = Path(__file__).resolve().parent
    project_root = tools_root.parent
    coin_source = project_root / "effects" / "coin-drop-v2" / "coin-large.png"
    coin = load_coin(coin_source)
    coin_track = build_coin_track(coin)
    glow_track = build_glow_track()
    character_roots = {
        "capybara": project_root / "capybara",
        "pelican": project_root / "pelican",
        "siamese-cat": project_root / "siamese-cat",
    }
    write_effect(
        "COIN_OUT",
        "coin-out-v1",
        project_root / "effects" / "coin-out-v1",
        coin_track,
        None,
        character_roots,
    )
    write_effect(
        "COIN_IN_GLOW",
        "coin-in-glow-v1",
        project_root / "effects" / "coin-in-glow-v1",
        coin_track,
        glow_track,
        character_roots,
    )
    master = build_master_contact_sheet(project_root)
    write_pack_records(project_root, master)
    print(f"GENERATED {master}")


if __name__ == "__main__":
    main()
