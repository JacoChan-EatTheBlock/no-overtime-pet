from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
SEEDANCE_MODEL = "doubao-seedance-2-0-260128"
FRAME_COUNT = 16
FRAME_SIZE = 192
SHEET_COLUMNS = 4
FRAME_DURATION_MS = 100
GREEN = (0, 255, 102)
# The provider briefly drew its own striking prop around source frames 10-16.
# Reuse an earlier clean idle frame for output frame 2; the deterministic coin
# below remains the only visible striking object.
SELECTED_FRAME_OVERRIDES = {2: 8}

MOTION_PROMPT = """Animate only the supplied pixel-art capybara office worker. Fixed square camera and fixed framing. Preserve the exact same cocoa-brown capybara identity, round body, tiny ears, facial proportions, teal necktie, wooden desk, keyboard, mouse, chair, colors, and crisp pixel-art style. Keep the desk and camera stationary. The character starts in the exact supplied idle pose. At about one second, an invisible object strikes straight down onto the flat top of the capybara's forehead. Show a strong readable painful reaction: eyes squeeze shut, face scrunches, head and upper body recoil downward, shoulders tense, and one paw briefly moves toward or rubs the forehead. Then the character recovers and returns to the exact original idle pose during the final second. One clean reaction only. Pure evenly lit bright chroma green background (#00FF66). Do not draw the striking object or any coin. No extra character, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look."""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def transparent_bbox(image: Image.Image, threshold: int = 16) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(alpha >= threshold)
    if not len(xs):
        raise ValueError("foreground not detected")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def build_seedance_input(identity: Image.Image) -> Image.Image:
    identity = identity.convert("RGBA")
    box = transparent_bbox(identity)
    crop = identity.crop(box)
    scale = min(690 / crop.width, 650 / crop.height)
    resized = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.NEAREST,
    )
    canvas = Image.new("RGB", (768, 768), GREEN)
    x = round((768 - resized.width) / 2)
    y = 724 - resized.height
    canvas.paste(resized.convert("RGB"), (x, y), resized.getchannel("A"))
    return canvas


def build_coin() -> Image.Image:
    dark = (77, 43, 54, 255)
    orange = (226, 125, 36, 255)
    gold = (255, 208, 69, 255)
    light = (255, 239, 135, 255)
    palette = {"D": dark, "O": orange, "G": gold, "L": light, ".": (0, 0, 0, 0)}
    pixels = [
        "...DDD...",
        ".DDOOODD.",
        "DOOGGGOOD",
        "DOGDGDGOD",
        "DOGGGGGOD",
        "DOGDGDGOD",
        "DOOGGGOOD",
        ".DDOOODD.",
        "...DDD...",
    ]
    image = Image.new("RGBA", (18, 18), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row, line in enumerate(pixels):
        for column, token in enumerate(line):
            if token != ".":
                draw.rectangle(
                    (column * 2, row * 2, column * 2 + 1, row * 2 + 1),
                    fill=palette[token],
                )
    draw.rectangle((8, 4, 9, 5), fill=light)
    return image


def prepare(identity_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    identity_bytes = identity_path.read_bytes()
    identity = Image.open(identity_path).convert("RGBA")
    if identity.size[0] < 256 or identity.size[1] < 256:
        raise ValueError("identity reference is unexpectedly small")
    if transparent_bbox(identity) == (0, 0, identity.width, identity.height):
        raise ValueError("identity reference has no transparent margin")

    atomic_write_bytes(output_dir / "identity-source.png", identity_bytes)
    seedance_input = build_seedance_input(identity)
    seedance_input.save(output_dir / "seedance-input.png", format="PNG")
    coin = build_coin()
    coin.save(output_dir / "coin.png", format="PNG")
    atomic_write_text(output_dir / "motion-prompt.txt", MOTION_PROMPT + "\n")
    atomic_write_json(
        output_dir / "preflight.json",
        {
            "preparedAt": now_iso(),
            "identity": {
                "source": "identity-source.png",
                "width": identity.width,
                "height": identity.height,
                "sha256": sha256_bytes(identity_bytes),
            },
            "seedanceInput": {
                "file": "seedance-input.png",
                "width": 768,
                "height": 768,
                "background": "#00FF66",
                "sha256": sha256_file(output_dir / "seedance-input.png"),
            },
            "coin": {
                "file": "coin.png",
                "width": 18,
                "height": 18,
                "sha256": sha256_file(output_dir / "coin.png"),
            },
            "motionPromptSha256": sha256_bytes(MOTION_PROMPT.encode("utf-8")),
        },
    )


def create_submission_lock(output_dir: Path) -> None:
    lock = output_dir / "submission-intent.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise RuntimeError(
            "submission lock already exists; refusing to create a second paid task"
        ) from error
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(now_iso() + "\n")


def submit_or_resume(output_dir: Path) -> str:
    import httpx

    task_path = output_dir / "provider-task.json"
    if task_path.exists():
        task = json.loads(task_path.read_text(encoding="utf-8"))
        task_id = task.get("providerTaskId")
        if not isinstance(task_id, str) or not task_id:
            raise RuntimeError("provider task state is invalid")
        print(f"RESUME task={task_id}", flush=True)
        return task_id

    api_key = os.getenv("ARK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ARK_API_KEY is not configured")
    create_submission_lock(output_dir)
    image_bytes = (output_dir / "seedance-input.png").read_bytes()
    payload = {
        "model": os.getenv("SEEDANCE_MODEL", SEEDANCE_MODEL),
        "content": [
            {"type": "text", "text": MOTION_PROMPT},
            {
                "type": "image_url",
                "image_url": {
                    "url": "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")
                },
            },
        ],
        "ratio": "1:1",
        "resolution": "720p",
        "duration": 4,
        "generate_audio": False,
        "watermark": False,
    }
    base_url = os.getenv("ARK_BASE_URL", ARK_BASE_URL).rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=300) as client:
            response = client.post(f"{base_url}/contents/generations/tasks", headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
    except Exception as error:
        atomic_write_json(
            output_dir / "submission-error.json",
            {"failedAt": now_iso(), "errorType": type(error).__name__, "message": str(error)},
        )
        raise
    task_id = result.get("id") if isinstance(result, dict) else None
    if not isinstance(task_id, str) or not task_id:
        atomic_write_json(
            output_dir / "submission-error.json",
            {"failedAt": now_iso(), "errorType": "InvalidResponse", "message": "missing task id"},
        )
        raise RuntimeError("Seedance returned no task id")
    atomic_write_json(
        task_path,
        {
            "providerTaskId": task_id,
            "submittedAt": now_iso(),
            "model": payload["model"],
            "durationSeconds": 4,
            "resolution": "720p",
            "ratio": "1:1",
            "paidSubmissionLimit": 1,
        },
    )
    print(f"SUBMITTED task={task_id}", flush=True)
    return task_id


def fetch_task(task_id: str) -> dict[str, Any]:
    import httpx

    api_key = os.getenv("ARK_API_KEY", "").strip()
    base_url = os.getenv("ARK_BASE_URL", ARK_BASE_URL).rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=90) as client:
        response = client.get(f"{base_url}/contents/generations/tasks/{task_id}", headers=headers)
        response.raise_for_status()
        result = response.json()
    if not isinstance(result, dict):
        raise RuntimeError("Seedance returned an invalid task response")
    return result


def wait_and_download(task_id: str, output_dir: Path, timeout_seconds: int = 900) -> Path:
    import httpx

    video_path = output_dir / "source.mp4"
    if video_path.exists() and video_path.stat().st_size > 100_000:
        print("VIDEO already downloaded", flush=True)
        return video_path
    deadline = time.monotonic() + timeout_seconds
    terminal_failures = {"failed", "cancelled", "canceled", "expired"}
    result: dict[str, Any] = {}
    while time.monotonic() < deadline:
        result = fetch_task(task_id)
        status = str(result.get("status", "")).lower()
        status_record = {
            "providerTaskId": task_id,
            "checkedAt": now_iso(),
            "status": status,
            "usage": result.get("usage", {}),
            "error": result.get("error"),
        }
        atomic_write_json(output_dir / "provider-status.json", status_record)
        print(f"STATUS {status}", flush=True)
        if status == "succeeded":
            break
        if status in terminal_failures:
            raise RuntimeError(f"Seedance task ended with status {status}")
        if status not in {"queued", "running"}:
            raise RuntimeError(f"Seedance returned unknown status {status}")
        time.sleep(15)
    else:
        raise TimeoutError("Seedance task did not finish within the polling window")

    content = result.get("content")
    video_url = content.get("video_url") if isinstance(content, dict) else None
    if not isinstance(video_url, str) or not video_url.startswith("https://"):
        raise RuntimeError("Seedance returned no HTTPS video")
    with httpx.Client(timeout=240, follow_redirects=True) as client:
        response = client.get(video_url)
        response.raise_for_status()
        video_bytes = response.content
    if len(video_bytes) < 100_000:
        raise RuntimeError("downloaded video is unexpectedly small")
    atomic_write_bytes(video_path, video_bytes)
    atomic_write_json(
        output_dir / "source-video.json",
        {
            "downloadedAt": now_iso(),
            "providerTaskId": task_id,
            "bytes": len(video_bytes),
            "sha256": sha256_bytes(video_bytes),
        },
    )
    print(f"VIDEO downloaded bytes={len(video_bytes)}", flush=True)
    return video_path


def command_path(name: str) -> str:
    value = shutil.which(name)
    if not value:
        raise RuntimeError(f"required command is missing: {name}")
    return value


def probe_frame_count(video: Path) -> int:
    result = subprocess.run(
        [
            command_path("ffprobe"),
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-count_frames",
            "-show_entries",
            "stream=nb_read_frames",
            "-of",
            "default=nokey=1:noprint_wrappers=1",
            str(video),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    value = result.stdout.strip()
    if not value.isdigit() or int(value) < FRAME_COUNT:
        raise RuntimeError(f"could not determine a usable video frame count: {value!r}")
    return int(value)


def uniform_indices(frame_count: int) -> list[int]:
    indices = [round(index * (frame_count - 1) / (FRAME_COUNT - 1)) for index in range(FRAME_COUNT)]
    for output_index, source_index in SELECTED_FRAME_OVERRIDES.items():
        if source_index >= frame_count:
            raise RuntimeError("selected-frame override exceeds the source video")
        indices[output_index] = source_index
    return indices


def extract_frames(video: Path, output_dir: Path) -> tuple[list[Image.Image], list[int], int]:
    frame_count = probe_frame_count(video)
    indices = uniform_indices(frame_count)
    raw_dir = output_dir / "raw-frames"
    raw_dir.mkdir(parents=True, exist_ok=True)
    for existing in raw_dir.glob("raw-*.png"):
        existing.unlink()
    selection = "+".join(f"eq(n\\,{index})" for index in indices)
    subprocess.run(
        [
            command_path("ffmpeg"),
            "-y",
            "-v",
            "error",
            "-i",
            str(video),
            "-vf",
            f"select={selection}",
            "-vsync",
            "0",
            "-frames:v",
            str(FRAME_COUNT),
            str(raw_dir / "raw-%02d.png"),
        ],
        check=True,
    )
    paths = sorted(raw_dir.glob("raw-*.png"))
    if len(paths) != FRAME_COUNT:
        raise RuntimeError(f"expected {FRAME_COUNT} extracted frames, got {len(paths)}")
    return [Image.open(path).convert("RGB") for path in paths], indices, frame_count


def key_green(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    corner = max(8, min(image.size) // 16)
    corners = np.concatenate(
        [
            rgb[:corner, :corner].reshape(-1, 3),
            rgb[:corner, -corner:].reshape(-1, 3),
            rgb[-corner:, :corner].reshape(-1, 3),
            rgb[-corner:, -corner:].reshape(-1, 3),
        ],
        axis=0,
    )
    background = np.median(corners, axis=0)
    distance = np.sqrt(((rgb - background) ** 2).sum(axis=2))
    original_green = rgb[:, :, 1].copy()
    green_excess = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    alpha = np.clip((distance - 16.0) / 28.0 * 255.0, 0.0, 255.0)
    edge_weight = np.clip((245.0 - alpha) / 217.0, 0.0, 1.0)
    despill = np.clip((green_excess - 16.0) / 72.0, 0.0, 1.0) * edge_weight
    neutral_green = np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    rgb[:, :, 1] = rgb[:, :, 1] * (1.0 - despill) + neutral_green * despill
    alpha[(original_green > 145.0) & (green_excess > 75.0)] = 0.0
    alpha[alpha < 28.0] = 0.0
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha]).astype(np.uint8)
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return rgba


def array_bbox(rgba: np.ndarray, threshold: int = 128) -> tuple[int, int, int, int]:
    ys, xs = np.where(rgba[:, :, 3] >= threshold)
    if not len(xs):
        raise ValueError("foreground not detected after chroma key")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def normalize_frames(source_frames: list[Image.Image]) -> list[Image.Image]:
    arrays = [key_green(frame) for frame in source_frames]
    boxes = [array_bbox(array) for array in arrays]
    heights = [box[3] - box[1] for box in boxes]
    fixed_scale = 145.0 / float(np.median(heights))
    normalized: list[Image.Image] = []
    for array, box in zip(arrays, boxes):
        x0, y0, x1, y1 = box
        crop = Image.fromarray(array[y0:y1, x0:x1], mode="RGBA")
        resized = crop.resize(
            (max(1, round(crop.width * fixed_scale)), max(1, round(crop.height * fixed_scale))),
            Image.Resampling.NEAREST,
        )
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        x = round((FRAME_SIZE - resized.width) / 2)
        y = 188 - resized.height
        canvas.alpha_composite(resized, (x, y))
        normalized.append(canvas)
    return normalized


def add_impact_pixels(frame: Image.Image, head_x: int, head_y: int, strength: int) -> None:
    draw = ImageDraw.Draw(frame)
    dark = (77, 43, 54, 255)
    gold = (255, 208, 69, 255)
    segments = [
        (-18, -10, -12, -6),
        (18, -10, 12, -6),
        (-22, 1, -16, 1),
        (22, 1, 16, 1),
    ]
    for index, (x1, y1, x2, y2) in enumerate(segments[: 2 + strength * 2]):
        color = gold if index % 2 == 0 else dark
        draw.line((head_x + x1, head_y + y1, head_x + x2, head_y + y2), fill=color, width=2)


def overlay_coin(frames: list[Image.Image], coin: Image.Image) -> list[Image.Image]:
    result: list[Image.Image] = []
    idle_box = transparent_bbox(frames[0])
    idle_head_y = idle_box[1]
    for index, source in enumerate(frames):
        frame = source.copy()
        box = transparent_bbox(frame)
        head_x = round((box[0] + box[2]) / 2)
        head_y = box[1]
        position: tuple[int, int] | None = None
        if index == 1:
            position = (head_x - 9, -14)
        elif index == 2:
            position = (head_x - 9, -3)
        elif index == 3:
            position = (head_x - 9, idle_head_y - 28)
        elif index == 4:
            position = (head_x - 9, idle_head_y - 18)
            add_impact_pixels(frame, head_x, head_y, 1)
        elif index == 5:
            position = (head_x + 5, idle_head_y - 30)
            add_impact_pixels(frame, head_x, head_y, 1)
        elif index == 6:
            position = (head_x + 21, idle_head_y - 37)
            add_impact_pixels(frame, head_x, head_y, 0)
        elif index == 7:
            position = (head_x + 37, idle_head_y - 31)
        elif index == 8:
            position = (head_x + 51, idle_head_y - 16)
        if position is not None:
            frame.alpha_composite(coin, position)
        array = np.asarray(frame).copy()
        array[array[:, :, 3] == 0, :3] = 0
        result.append(Image.fromarray(array, mode="RGBA"))
    return result


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    rows = math.ceil(len(frames) / SHEET_COLUMNS)
    sheet = Image.new(
        "RGBA",
        (FRAME_SIZE * SHEET_COLUMNS, FRAME_SIZE * rows),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % SHEET_COLUMNS) * FRAME_SIZE, (index // SHEET_COLUMNS) * FRAME_SIZE),
        )
    sheet.save(path, format="PNG", optimize=True)


def save_preview_gif(frames: list[Image.Image], path: Path) -> None:
    matte = (40, 28, 48, 255)
    gif_frames: list[Image.Image] = []
    for frame in frames:
        composed = Image.new("RGBA", frame.size, matte)
        composed.alpha_composite(frame)
        gif_frames.append(composed.convert("RGB"))
    durations = [220] + [FRAME_DURATION_MS] * (len(frames) - 2) + [320]
    gif_frames[0].save(
        path,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )


def save_contact_sheet(frames: list[Image.Image], path: Path) -> None:
    cell = FRAME_SIZE + 8
    sheet = Image.new("RGB", (cell * 4, cell * 4), (40, 28, 48))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = (index % 4) * cell + 4
        y = (index // 4) * cell + 4
        composed = Image.new("RGBA", frame.size, (40, 28, 48, 255))
        composed.alpha_composite(frame)
        sheet.paste(composed.convert("RGB"), (x, y))
        draw.text((x + 4, y + 4), f"{index:02d}", fill=(255, 239, 135))
    sheet.save(path, format="PNG", optimize=True)


def green_spill_count(frame: Image.Image) -> int:
    array = np.asarray(frame).astype(np.int16)
    rgb = array[:, :, :3]
    alpha = array[:, :, 3]
    excess = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    return int(((alpha >= 32) & (alpha < 245) & (rgb[:, :, 1] > 145) & (excess > 75)).sum())


def process(output_dir: Path) -> None:
    video_path = output_dir / "source.mp4"
    coin_path = output_dir / "coin.png"
    if not video_path.exists() or not coin_path.exists():
        raise RuntimeError("source.mp4 and coin.png are required before processing")
    source_frames, selected_indices, source_frame_count = extract_frames(video_path, output_dir)
    frames = overlay_coin(normalize_frames(source_frames), Image.open(coin_path).convert("RGBA"))

    frame_dir = output_dir / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for existing in frame_dir.glob("frame-*.png"):
        existing.unlink()
    for index, frame in enumerate(frames):
        frame.save(frame_dir / f"frame-{index:02d}.png", format="PNG", optimize=True)

    sheet_path = output_dir / "NANG_FEE_HEAD_HIT.png"
    gif_path = output_dir / "preview.gif"
    contact_path = output_dir / "contact-sheet.png"
    save_sheet(frames, sheet_path)
    save_preview_gif(frames, gif_path)
    save_contact_sheet(frames, contact_path)

    boxes = [transparent_bbox(frame) for frame in frames]
    corner_alpha = [
        [
            frame.getpixel((0, 0))[3],
            frame.getpixel((FRAME_SIZE - 1, 0))[3],
            frame.getpixel((0, FRAME_SIZE - 1))[3],
            frame.getpixel((FRAME_SIZE - 1, FRAME_SIZE - 1))[3],
        ]
        for frame in frames
    ]
    transparent_rgb_zero = []
    for frame in frames:
        array = np.asarray(frame)
        transparent_rgb_zero.append(bool(np.all(array[array[:, :, 3] == 0, :3] == 0)))
    spill_counts = [green_spill_count(frame) for frame in frames]
    first_array = np.asarray(frames[0]).astype(np.int16)
    last_array = np.asarray(frames[-1]).astype(np.int16)
    first_mask = first_array[:, :, 3] >= 128
    last_mask = last_array[:, :, 3] >= 128
    idle_union = first_mask | last_mask
    idle_intersection = first_mask & last_mask
    idle_mask_iou = float(idle_intersection.sum() / idle_union.sum())
    idle_area_ratio = float(last_mask.sum() / first_mask.sum())
    idle_rgb_difference = float(
        np.abs(first_array[:, :, :3] - last_array[:, :, :3])[idle_union].mean()
    )
    idle_return_pass = idle_mask_iou >= 0.95 and 0.95 <= idle_area_ratio <= 1.05
    structural_pass = (
        len(frames) == FRAME_COUNT
        and all(all(value == 0 for value in corners) for corners in corner_alpha)
        and all(transparent_rgb_zero)
        and all(count <= 8 for count in spill_counts)
        and all(box[3] <= 188 for box in boxes)
        and idle_return_pass
    )
    sheet_hash = sha256_file(sheet_path)
    manifest = {
        "schemaVersion": "1.0-prototype",
        "characterId": "capybara-office-worker",
        "assetVersion": "coin-hit-v1",
        "canvas": {"width": FRAME_SIZE, "height": FRAME_SIZE},
        "scaleMode": "NEAREST",
        "anchors": {
            "head": {"x": 96, "y": boxes[0][1]},
            "keyboard": {"x": 96, "y": 164},
            "deskPlane": {"x": 96, "y": 188},
        },
        "actions": {
            "NANG_FEE_HEAD_HIT": {
                "texture": "NANG_FEE_HEAD_HIT.png",
                "frameWidth": FRAME_SIZE,
                "frameHeight": FRAME_SIZE,
                "frameCount": FRAME_COUNT,
                "columns": SHEET_COLUMNS,
                "fps": 10,
                "loop": False,
                "fallbackAction": "IDLE",
                "eventFrames": {"coinImpact": [4], "coinGone": [9]},
                "contentHashSha256": sheet_hash,
            }
        },
        "preview": {
            "file": "preview.gif",
            "matte": "#281C30",
            "note": "GIF is review-only; runtime uses the transparent sprite sheet and manifest.",
        },
    }
    atomic_write_json(output_dir / "character-action-manifest.prototype.json", manifest)
    atomic_write_json(
        output_dir / "qa.json",
        {
            "processedAt": now_iso(),
            "structuralPass": structural_pass,
            "manualReviewRequired": True,
            "manualReviewItems": [
                "capybara identity and clothing remain recognizable",
                "forehead impact reads clearly at frame 4",
                "painful recoil reads clearly without desk/camera drift",
                "last frame transitions naturally back to IDLE",
            ],
            "sourceVideo": {
                "frameCount": source_frame_count,
                "selectedIndices": selected_indices,
                "sha256": sha256_file(video_path),
            },
            "output": {
                "frameCount": len(frames),
                "frameSize": [FRAME_SIZE, FRAME_SIZE],
                "sheetSize": [FRAME_SIZE * 4, FRAME_SIZE * 4],
                "sheetSha256": sheet_hash,
                "gifSha256": sha256_file(gif_path),
                "cornerAlpha": corner_alpha,
                "transparentRgbZero": transparent_rgb_zero,
                "greenSpillPixelCounts": spill_counts,
                "foregroundBoxes": boxes,
                "idleReturn": {
                    "pass": idle_return_pass,
                    "maskIoU": round(idle_mask_iou, 4),
                    "foregroundAreaRatio": round(idle_area_ratio, 4),
                    "meanAbsoluteRgbDifferenceOnUnion": round(idle_rgb_difference, 2),
                },
            },
        },
    )
    print(f"PROCESSED structural_pass={structural_pass}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate one paid capybara coin-hit prototype safely.")
    parser.add_argument("mode", choices=["prepare", "generate", "process", "all"])
    parser.add_argument("--identity", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--env-file", type=Path)
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    if args.env_file:
        load_env_file(args.env_file.resolve())
    if args.mode in {"prepare", "all"}:
        if not args.identity:
            parser.error("--identity is required for prepare/all")
        prepare(args.identity.resolve(), output_dir)
        print("PREPARED", flush=True)
    if args.mode in {"generate", "all"}:
        task_id = submit_or_resume(output_dir)
        wait_and_download(task_id, output_dir)
    if args.mode in {"process", "all"}:
        process(output_dir)


if __name__ == "__main__":
    main()
