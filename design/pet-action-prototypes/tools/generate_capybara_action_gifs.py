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
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw


ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
SEEDANCE_MODEL = "doubao-seedance-2-0-260128"
GREEN = (0, 255, 102)
FRAME_COUNT = 8
FRAME_SIZE = 192
SHEET_COLUMNS = 4
DESK_ANCHOR_Y = 188


@dataclass(frozen=True)
class ActionSpec:
    action_id: str
    asset_version: str
    fps: int
    prompt: str
    manual_review_items: tuple[str, ...]


ACTIONS = {
    "work-normal": ActionSpec(
        action_id="WORK_NORMAL",
        asset_version="work-normal-v1",
        fps=8,
        prompt="""Animate only the supplied pixel-art office-worker character in a short seamless idle-working loop. Fixed square camera and fixed framing. Preserve the exact same species identity, face, body proportions, teal necktie, wooden desk, keyboard, mouse, chair, colors, scale, and crisp pixel-art style. The character remains calmly at work: one restrained blink, tiny breathing motion, and a very small paw or wing adjustment near the mouse or keyboard. Keep the mood tired and deadpan. No rapid typing and no large body movement. The first and final pose must match for a seamless loop. Keep the keyboard, desk, mouse, chair, camera, and bottom desk plane perfectly stationary. Pure evenly lit bright chroma green background (#00FF66). No fish, no coin, no glow, no extra character, no extra limb, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look.""",
        manual_review_items=(
            "the character reads as calmly working rather than frozen or typing frantically",
            "the blink and breathing motion remain restrained",
            "identity, teal tie, desk, chair, keyboard, and mouse stay stable",
            "first and last frames form a natural loop",
        ),
    ),
    "type-frenzy": ActionSpec(
        action_id="TYPE_FRENZY",
        asset_version="type-frenzy-v1",
        fps=16,
        prompt="""Animate only the supplied pixel-art office-worker character in a short seamless loop. Fixed square camera and fixed framing. Preserve the exact same species identity, face, body proportions, teal necktie, wooden desk, keyboard, mouse, chair, colors, scale, and crisp pixel-art style. Both front paws or wing-hands rapidly alternate slapping and typing on the keyboard: left down while right lifts slightly, then right down while left lifts slightly. Make the two-beat rhythm readable and energetic, with only a tiny shoulder and upper-body bounce. The hands stay close to the keyboard and never grow, stretch, multiply, or leave the desk area. The face remains focused and deadpan. The first and final pose must match for a seamless loop. Keep the keyboard, desk, mouse, chair, camera, and bottom desk plane perfectly stationary. Pure evenly lit bright chroma green background (#00FF66). No fish, no coin, no glow, no extra character, no extra limb, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look.""",
        manual_review_items=(
            "both front paws or wing-hands alternate clearly over the keyboard",
            "the action reads as frantic typing rather than waving",
            "identity, teal tie, desk, chair, keyboard, and mouse stay stable",
            "first and last frames form a natural loop",
        ),
    ),
    "slacking": ActionSpec(
        action_id="SLACKING",
        asset_version="slacking-v1",
        fps=8,
        prompt="""Animate only the supplied pixel-art office-worker character hugging exactly one blue-green fish horizontally against the lower chest in a short seamless loop. Fixed square camera and fixed framing. Preserve the exact same species identity, face, body proportions, teal necktie, wooden desk, keyboard, mouse, chair, fish design, colors, scale, and crisp pixel-art style. Both front paws or wing-hands keep gently hugging the same single fish. The fish tail makes a small restrained left-right wiggle while the fish body remains held securely. The character gives one subtle guilty sideways eye glance and a tiny blink, then returns to the starting expression. Keep the comedy quiet and deadpan, not exaggerated. The first and final pose must match for a seamless loop. Keep the desk, keyboard, mouse, chair, camera, and bottom desk plane perfectly stationary. Pure evenly lit bright chroma green background (#00FF66). Exactly one fish for the entire shot. No water, no bubbles, no splash, no coin, no glow, no extra animal, no extra limb, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look.""",
        manual_review_items=(
            "the character continuously hugs exactly one fish",
            "the fish tail wiggle and guilty eye glance are subtle but readable",
            "identity, teal tie, desk, chair, keyboard, and mouse stay stable",
            "first and last frames form a natural loop",
        ),
    ),
    "type-both": ActionSpec(
        action_id="TYPE_BOTH",
        asset_version="type-both-v1",
        fps=16,
        prompt="""Animate only the supplied pixel-art capybara office worker in a short seamless loop. Fixed square camera and fixed framing. Preserve the exact same cocoa-brown capybara identity, round body, tiny ears, facial proportions, teal necktie, wooden desk, keyboard, mouse, chair, colors, scale, and crisp pixel-art style. Both forepaws rapidly alternate slapping and typing on the keyboard: left paw down while right paw lifts slightly, then right paw down while left paw lifts slightly. Make the two-beat rhythm readable and energetic, with only a tiny shoulder and upper-body bounce. The paws stay close to the keyboard and never grow, stretch, multiply, or leave the desk area. The face remains focused. The first and final pose must match for a seamless loop. Keep the keyboard, desk, mouse, chair, camera, and bottom desk plane perfectly stationary. Pure evenly lit bright chroma green background (#00FF66). No fish, no coin, no extra character, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look.""",
        manual_review_items=(
            "both paws alternate clearly over the keyboard",
            "the action reads as rapid typing rather than waving",
            "capybara identity, teal tie, desk, chair, keyboard, and mouse stay stable",
            "first and last frames form a natural loop",
        ),
    ),
    "slack-secretly": ActionSpec(
        action_id="SLACK_SECRETLY",
        asset_version="slack-secretly-v1",
        fps=8,
        prompt="""Animate only the supplied pixel-art capybara office worker hugging exactly one blue-green fish horizontally against its lower chest in a short seamless loop. Fixed square camera and fixed framing. Preserve the exact same cocoa-brown capybara identity, round body, tiny ears, facial proportions, teal necktie, wooden desk, keyboard, mouse, chair, fish design, colors, scale, and crisp pixel-art style. Both forepaws keep gently hugging the same single fish. The fish tail makes a small restrained left-right wiggle while the fish body remains held securely. The capybara gives one subtle guilty sideways eye glance and a tiny blink, then returns to the starting expression. Keep the comedy quiet and deadpan, not exaggerated. The first and final pose must match for a seamless loop. Keep the desk, keyboard, mouse, chair, camera, and bottom desk plane perfectly stationary. Pure evenly lit bright chroma green background (#00FF66). Exactly one fish for the entire shot. No water, no bubbles, no splash, no coin, no extra animal, no extra limb, no extra prop, no text, no logo, no watermark, no camera movement, no zoom, no scene cut, no audio, no shadow on the background, no style change, no smooth vector look.""",
        manual_review_items=(
            "the capybara continuously hugs exactly one fish",
            "the fish tail wiggle and guilty eye glance are subtle but readable",
            "capybara identity, teal tie, desk, chair, keyboard, and mouse stay stable",
            "first and last frames form a natural loop",
        ),
    ),
}


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


def remove_connected_checkerboard(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA")).copy()
    rgb = rgba[:, :, :3].astype(np.int16)
    neutral = rgb.max(axis=2) - rgb.min(axis=2) <= 18
    bright = rgb.min(axis=2) >= 188
    candidate = neutral & bright
    height, width = candidate.shape
    connected = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(y: int, x: int) -> None:
        if candidate[y, x] and not connected[y, x]:
            connected[y, x] = True
            queue.append((y, x))

    for x in range(width):
        enqueue(0, x)
        enqueue(height - 1, x)
    for y in range(height):
        enqueue(y, 0)
        enqueue(y, width - 1)
    while queue:
        y, x = queue.popleft()
        if y > 0:
            enqueue(y - 1, x)
        if y + 1 < height:
            enqueue(y + 1, x)
        if x > 0:
            enqueue(y, x - 1)
        if x + 1 < width:
            enqueue(y, x + 1)

    rgba[connected, 3] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def ensure_true_alpha(image: Image.Image) -> tuple[Image.Image, str]:
    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba)[:, :, 3]
    if int(alpha.min()) == 0 and int((alpha == 0).sum()) > alpha.size // 20:
        array = np.asarray(rgba).copy()
        array[array[:, :, 3] == 0, :3] = 0
        return Image.fromarray(array, mode="RGBA"), "source-alpha"
    cleaned = remove_connected_checkerboard(rgba)
    cleaned_alpha = np.asarray(cleaned)[:, :, 3]
    if int((cleaned_alpha == 0).sum()) < cleaned_alpha.size // 10:
        raise ValueError("opaque source background could not be extracted safely")
    return cleaned, "border-connected-neutral-checkerboard"


def build_seedance_input(foreground: Image.Image) -> Image.Image:
    foreground = foreground.convert("RGBA")
    box = transparent_bbox(foreground)
    crop = foreground.crop(box)
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


def prepare(action: str, source_path: Path, output_dir: Path) -> None:
    spec = ACTIONS[action]
    output_dir.mkdir(parents=True, exist_ok=True)
    source_bytes = source_path.read_bytes()
    source = Image.open(source_path).convert("RGBA")
    if source.width < 256 or source.height < 256:
        raise ValueError("source keyframe is unexpectedly small")
    transparent, extraction = ensure_true_alpha(source)
    box = transparent_bbox(transparent)
    if box == (0, 0, transparent.width, transparent.height):
        raise ValueError("prepared keyframe has no transparent margin")

    atomic_write_bytes(output_dir / "keyframe-source.png", source_bytes)
    transparent.save(output_dir / "keyframe-transparent.png", format="PNG", optimize=True)
    seedance_input = build_seedance_input(transparent)
    seedance_input.save(output_dir / "seedance-input.png", format="PNG")
    atomic_write_text(output_dir / "motion-prompt.txt", spec.prompt + "\n")

    transparent_array = np.asarray(transparent)
    atomic_write_json(
        output_dir / "preflight.json",
        {
            "preparedAt": now_iso(),
            "actionId": spec.action_id,
            "source": {
                "file": "keyframe-source.png",
                "width": source.width,
                "height": source.height,
                "sha256": sha256_bytes(source_bytes),
            },
            "transparentKeyframe": {
                "file": "keyframe-transparent.png",
                "extraction": extraction,
                "foregroundBox": box,
                "transparentPixels": int((transparent_array[:, :, 3] == 0).sum()),
                "transparentRgbZero": bool(
                    np.all(transparent_array[transparent_array[:, :, 3] == 0, :3] == 0)
                ),
                "sha256": sha256_file(output_dir / "keyframe-transparent.png"),
            },
            "seedanceInput": {
                "file": "seedance-input.png",
                "width": 768,
                "height": 768,
                "background": "#00FF66",
                "sha256": sha256_file(output_dir / "seedance-input.png"),
            },
            "motionPromptSha256": sha256_bytes(spec.prompt.encode("utf-8")),
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


def submit_or_resume(action: str, output_dir: Path, character_id: str) -> str:
    import httpx

    spec = ACTIONS[action]
    task_path = output_dir / "provider-task.json"
    if task_path.exists():
        task = json.loads(task_path.read_text(encoding="utf-8"))
        task_id = task.get("providerTaskId")
        if not isinstance(task_id, str) or not task_id:
            raise RuntimeError("provider task state is invalid")
        print(f"RESUME action={spec.action_id} task={task_id}", flush=True)
        return task_id

    api_key = os.getenv("ARK_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ARK_API_KEY is not configured")
    create_submission_lock(output_dir)
    image_bytes = (output_dir / "seedance-input.png").read_bytes()
    payload = {
        "model": os.getenv("SEEDANCE_MODEL", SEEDANCE_MODEL),
        "content": [
            {"type": "text", "text": spec.prompt},
            {
                "type": "image_url",
                "image_url": {
                    "url": "data:image/png;base64,"
                    + base64.b64encode(image_bytes).decode("ascii")
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
            response = client.post(
                f"{base_url}/contents/generations/tasks", headers=headers, json=payload
            )
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
        raise RuntimeError("Seedance returned no task id")
    atomic_write_json(
        task_path,
        {
            "providerTaskId": task_id,
            "submittedAt": now_iso(),
            "characterId": character_id,
            "actionId": spec.action_id,
            "model": payload["model"],
            "durationSeconds": 4,
            "resolution": "720p",
            "ratio": "1:1",
            "paidSubmissionLimit": 1,
        },
    )
    print(f"SUBMITTED action={spec.action_id} task={task_id}", flush=True)
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
        atomic_write_json(
            output_dir / "provider-status.json",
            {
                "providerTaskId": task_id,
                "checkedAt": now_iso(),
                "status": status,
                "usage": result.get("usage", {}),
                "error": result.get("error"),
            },
        )
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


def selected_indices(frame_count: int, output_dir: Path) -> list[int]:
    override_path = output_dir / "selected-indices.json"
    if override_path.exists():
        value = json.loads(override_path.read_text(encoding="utf-8"))
        if not isinstance(value, list) or len(value) != FRAME_COUNT:
            raise ValueError("selected-indices.json must contain exactly eight indices")
        indices = [int(item) for item in value]
    else:
        indices = [round(index * (frame_count - 1) / (FRAME_COUNT - 1)) for index in range(FRAME_COUNT)]
    if min(indices) < 0 or max(indices) >= frame_count or len(set(indices)) != FRAME_COUNT:
        raise ValueError("selected frame indices are invalid")
    return indices


def extract_frames(video: Path, output_dir: Path) -> tuple[list[Image.Image], list[int], int]:
    frame_count = probe_frame_count(video)
    indices = selected_indices(frame_count, output_dir)
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
        y = DESK_ANCHOR_Y - resized.height
        canvas.alpha_composite(resized, (x, y))
        canvas_array = np.asarray(canvas).copy()
        canvas_array[canvas_array[:, :, 3] == 0, :3] = 0
        normalized.append(Image.fromarray(canvas_array, mode="RGBA"))
    return normalized


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    rows = math.ceil(len(frames) / SHEET_COLUMNS)
    sheet = Image.new(
        "RGBA", (FRAME_SIZE * SHEET_COLUMNS, FRAME_SIZE * rows), (0, 0, 0, 0)
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % SHEET_COLUMNS) * FRAME_SIZE, (index // SHEET_COLUMNS) * FRAME_SIZE),
        )
    sheet.save(path, format="PNG", optimize=True)


def save_transparent_gif(frames: list[Image.Image], path: Path, duration_ms: int) -> None:
    strip = Image.new("RGB", (FRAME_SIZE, FRAME_SIZE * len(frames)), (1, 0, 1))
    for index, frame in enumerate(frames):
        rgb = Image.new("RGBA", frame.size, (1, 0, 1, 255))
        rgb.alpha_composite(frame)
        strip.paste(rgb.convert("RGB"), (0, index * FRAME_SIZE))
    palette_source = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    palette = palette_source.getpalette()[: 255 * 3] + [1, 0, 1]
    gif_frames: list[Image.Image] = []
    for frame in frames:
        flattened = Image.new("RGBA", frame.size, (1, 0, 1, 255))
        flattened.alpha_composite(frame)
        indexed = flattened.convert("RGB").quantize(
            palette=palette_source, dither=Image.Dither.NONE
        )
        indexed.putpalette(palette)
        indices = np.asarray(indexed).copy()
        alpha = np.asarray(frame)[:, :, 3]
        indices[alpha < 128] = 255
        indexed = Image.fromarray(indices, mode="P")
        indexed.putpalette(palette)
        indexed.info["transparency"] = 255
        gif_frames.append(indexed)
    gif_frames[0].save(
        path,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=duration_ms,
        loop=0,
        transparency=255,
        disposal=2,
        optimize=False,
    )


def checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (237, 237, 237))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(207, 207, 207))
    return image


def save_contact_sheet(frames: list[Image.Image], path: Path) -> None:
    cell = FRAME_SIZE + 8
    rows = math.ceil(len(frames) / SHEET_COLUMNS)
    sheet = Image.new("RGB", (cell * SHEET_COLUMNS, cell * rows), (40, 28, 48))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = (index % SHEET_COLUMNS) * cell + 4
        y = (index // SHEET_COLUMNS) * cell + 4
        background = checkerboard(frame.size).convert("RGBA")
        background.alpha_composite(frame)
        sheet.paste(background.convert("RGB"), (x, y))
        draw.rectangle((x + 2, y + 2, x + 25, y + 15), fill=(40, 28, 48))
        draw.text((x + 5, y + 3), f"{index:02d}", fill=(255, 239, 135))
    sheet.save(path, format="PNG", optimize=True)


def green_spill_count(frame: Image.Image) -> int:
    array = np.asarray(frame).astype(np.int16)
    rgb = array[:, :, :3]
    alpha = array[:, :, 3]
    excess = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    return int(
        ((alpha >= 32) & (alpha < 245) & (rgb[:, :, 1] > 145) & (excess > 75)).sum()
    )


def process(action: str, output_dir: Path, character_id: str) -> None:
    spec = ACTIONS[action]
    video_path = output_dir / "source.mp4"
    if not video_path.exists():
        raise RuntimeError("source.mp4 is required before processing")
    source_frames, indices, source_frame_count = extract_frames(video_path, output_dir)
    frames = normalize_frames(source_frames)

    frame_dir = output_dir / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for existing in frame_dir.glob("frame-*.png"):
        existing.unlink()
    for index, frame in enumerate(frames):
        frame.save(frame_dir / f"frame-{index:02d}.png", format="PNG", optimize=True)

    sheet_path = output_dir / f"{spec.action_id}.png"
    gif_path = output_dir / "preview.gif"
    contact_path = output_dir / "contact-sheet.png"
    save_sheet(frames, sheet_path)
    save_transparent_gif(frames, gif_path, round(1000 / spec.fps))
    save_contact_sheet(frames, contact_path)

    boxes = [transparent_bbox(frame) for frame in frames]
    corners = [
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
    first = np.asarray(frames[0])[:, :, 3] >= 128
    last = np.asarray(frames[-1])[:, :, 3] >= 128
    union = first | last
    intersection = first & last
    loop_iou = float(intersection.sum() / union.sum())
    loop_area_ratio = float(last.sum() / first.sum())
    loop_pass = loop_iou >= 0.90 and 0.90 <= loop_area_ratio <= 1.10
    structural_pass = (
        len(frames) == FRAME_COUNT
        and all(all(value == 0 for value in frame_corners) for frame_corners in corners)
        and all(transparent_rgb_zero)
        and all(count <= 8 for count in spill_counts)
        and all(box[3] <= DESK_ANCHOR_Y for box in boxes)
    )
    sheet_hash = sha256_file(sheet_path)
    anchor_box = boxes[0]
    anchor_x = round((anchor_box[0] + anchor_box[2]) / 2)
    anchor_height = anchor_box[3] - anchor_box[1]
    anchors = {
        "feet": {"x": anchor_x, "y": DESK_ANCHOR_Y},
        "head": {"x": anchor_x, "y": anchor_box[1] + max(4, round(anchor_height * 0.05))},
        "bodyCenter": {
            "x": anchor_x,
            "y": anchor_box[1] + round(anchor_height * 0.58),
        },
        "ground": {"x": anchor_x, "y": DESK_ANCHOR_Y},
        "backGlow": {
            "x": anchor_x,
            "y": anchor_box[1] + round(anchor_height * 0.50),
        },
        "keyboard": {"x": anchor_x, "y": 164},
        "deskPlane": {"x": anchor_x, "y": DESK_ANCHOR_Y},
    }
    atomic_write_json(
        output_dir / "character-action-manifest.prototype.json",
        {
            "schemaVersion": "1.0-prototype",
            "characterId": character_id,
            "assetVersion": spec.asset_version,
            "canvas": {"width": FRAME_SIZE, "height": FRAME_SIZE},
            "scaleMode": "NEAREST",
            "anchors": anchors,
            "actions": {
                spec.action_id: {
                    "texture": sheet_path.name,
                    "frameWidth": FRAME_SIZE,
                    "frameHeight": FRAME_SIZE,
                    "frameCount": FRAME_COUNT,
                    "columns": SHEET_COLUMNS,
                    "rows": 2,
                    "fps": spec.fps,
                    "loop": True,
                    "fallbackAction": "WORK_NORMAL",
                    "contentHashSha256": sheet_hash,
                }
            },
            "preview": {
                "file": gif_path.name,
                "transparent": True,
                "note": "GIF is review-only; runtime uses the transparent sprite sheet and manifest.",
            },
        },
    )
    atomic_write_json(
        output_dir / "qa.json",
        {
            "processedAt": now_iso(),
            "characterId": character_id,
            "actionId": spec.action_id,
            "structuralPass": structural_pass,
            "loopShapePass": loop_pass,
            "manualReviewRequired": True,
            "manualReviewItems": list(spec.manual_review_items),
            "sourceVideo": {
                "frameCount": source_frame_count,
                "selectedIndices": indices,
                "sha256": sha256_file(video_path),
            },
            "output": {
                "frameCount": len(frames),
                "frameSize": [FRAME_SIZE, FRAME_SIZE],
                "sheetSize": [FRAME_SIZE * SHEET_COLUMNS, FRAME_SIZE * 2],
                "sheetSha256": sheet_hash,
                "gifSha256": sha256_file(gif_path),
                "cornerAlpha": corners,
                "transparentRgbZero": transparent_rgb_zero,
                "greenSpillPixelCounts": spill_counts,
                "foregroundBoxes": boxes,
                "loopShape": {
                    "maskIoU": round(loop_iou, 4),
                    "foregroundAreaRatio": round(loop_area_ratio, 4),
                },
            },
        },
    )
    print(
        f"PROCESSED action={spec.action_id} structural_pass={structural_pass} loop_pass={loop_pass}",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate one paid capybara action prototype safely."
    )
    parser.add_argument("mode", choices=["prepare", "generate", "process", "all"])
    parser.add_argument("--action", required=True, choices=sorted(ACTIONS))
    parser.add_argument("--character-id", default="capybara-office-worker")
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--env-file", type=Path)
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    if args.env_file:
        load_env_file(args.env_file.resolve())
    if args.mode in {"prepare", "all"}:
        if not args.source:
            parser.error("--source is required for prepare/all")
        prepare(args.action, args.source.resolve(), output_dir)
        print(f"PREPARED action={ACTIONS[args.action].action_id}", flush=True)
    if args.mode in {"generate", "all"}:
        task_id = submit_or_resume(args.action, output_dir, args.character_id)
        wait_and_download(task_id, output_dir)
    if args.mode in {"process", "all"}:
        process(args.action, output_dir, args.character_id)


if __name__ == "__main__":
    main()
