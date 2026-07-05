#!/usr/bin/env python3
"""Build Phase 11 GPT-generated transition-deep background assets."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from collections import deque

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tools/source-inbox"
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"

BAND = {
    "id": "phase11-transition-deep-gpt-band",
    "source": SOURCE_DIR / "water9-phase11-band-transition-deep-gpt-source.png",
    "filename": "water9-phase11-band-transition-deep-gpt.png",
    "label": "Phase 11 GPT transition-deep band plate",
    "safeOpacity": 0.18,
    "scaleRange": [1.02, 1.14],
    "parallaxRange": [0.002, 0.018],
    "targetSize": (864, 364),
}

LANDMARKS: list[dict[str, Any]] = [
    {
        "id": "phase11-transition-far-drowned-signal-station",
        "source": SOURCE_DIR / "water9-phase11-transition-far-drowned-signal-station-gpt-source.png",
        "filename": "water9-phase11-transition-far-drowned-signal-station-gpt.png",
        "label": "Phase 11 GPT far drowned signal station",
        "safeOpacity": 0.42,
        "scaleRange": [1.35, 2.05],
        "parallaxRange": [0.035, 0.07],
        "depthLane": "far",
        "readabilityRisk": "low",
    },
    {
        "id": "phase11-transition-mid-collapsed-gantry-brine-reef",
        "source": SOURCE_DIR / "water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt-source.png",
        "filename": "water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt.png",
        "label": "Phase 11 GPT mid collapsed gantry brine reef",
        "safeOpacity": 0.38,
        "scaleRange": [1.18, 1.85],
        "parallaxRange": [0.07, 0.13],
        "depthLane": "mid",
        "readabilityRisk": "low",
    },
    {
        "id": "phase11-transition-near-pipe-cable-cathedral",
        "source": SOURCE_DIR / "water9-phase11-transition-near-pipe-cable-cathedral-gpt-source.png",
        "filename": "water9-phase11-transition-near-pipe-cable-cathedral-gpt.png",
        "label": "Phase 11 GPT near pipe cable cathedral",
        "safeOpacity": 0.32,
        "scaleRange": [1.0, 1.55],
        "parallaxRange": [0.12, 0.22],
        "depthLane": "near",
        "readabilityRisk": "medium",
    },
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def chroma_key_alpha(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    pixels = rgb.load()
    alpha = Image.new("L", rgb.size, 255)
    alpha_pixels = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pixels[x, y]
            magenta_strength = min(r, b) - g
            if is_key_contaminated_edge_pixel((r, g, b)):
                alpha_pixels[x, y] = 0
            elif magenta_strength > 135 and r > 170 and b > 170:
                alpha_pixels[x, y] = 48
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    return alpha.point(lambda value: 0 if value < 24 else value)


def is_magenta_matte_pixel(pixel: tuple[int, int, int, int] | tuple[int, int, int]) -> bool:
    r, g, b = pixel[:3]
    magenta_strength = min(r, b) - g
    return (
        (r > 185 and b > 185 and g < 140)
        or (r > 145 and b > 145 and magenta_strength > 52)
        or (r > 115 and b > 115 and g < 122 and magenta_strength > 38)
    )


def is_key_contaminated_edge_pixel(pixel: tuple[int, int, int, int] | tuple[int, int, int]) -> bool:
    r, g, b = pixel[:3]
    return (
        is_magenta_matte_pixel(pixel)
        or (b > 70 and r > 45 and g < 96 and b - g > 18 and r - g > -4)
        or (b > 82 and r > 34 and g < 102 and b - g > 18)
        or (r > 62 and b > 76 and g < 112 and r - g > 6 and b - g > 10)
    )


def decontaminate_magenta_matte(image: Image.Image) -> Image.Image:
    """Replace key-colored RGB in transparent/edge pixels so Phaser filtering cannot bleed magenta."""
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = list(rgba.getdata())
    filled: list[tuple[int, int, int] | None] = [None] * len(pixels)
    queue: deque[int] = deque()

    for index, pixel in enumerate(pixels):
        r, g, b, a = pixel
        if a >= 220 and not is_key_contaminated_edge_pixel(pixel):
            filled[index] = (r, g, b)
            queue.append(index)

    fallback = (10, 32, 42)
    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        color = filled[index]
        if color is None:
            continue
        for neighbor in (index - 1, index + 1, index - width, index + width):
            if neighbor < 0 or neighbor >= len(pixels) or filled[neighbor] is not None:
                continue
            nx = neighbor % width
            ny = neighbor // width
            if abs(nx - x) + abs(ny - y) != 1:
                continue
            filled[neighbor] = color
            queue.append(neighbor)

    cleaned = []
    for index, pixel in enumerate(pixels):
        r, g, b, a = pixel
        matte = is_key_contaminated_edge_pixel(pixel)
        if a == 0 or matte:
            r, g, b = filled[index] or fallback
        cleaned.append((r, g, b, a))

    out = Image.new("RGBA", rgba.size)
    out.putdata(cleaned)
    return out


def decontaminate_opaque_key_color(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = list(rgb.getdata())
    filled: list[tuple[int, int, int] | None] = [None] * len(pixels)
    queue: deque[int] = deque()
    for index, pixel in enumerate(pixels):
        if not is_key_contaminated_edge_pixel(pixel):
            filled[index] = pixel
            queue.append(index)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        color = filled[index]
        if color is None:
            continue
        for neighbor in (index - 1, index + 1, index - width, index + width):
            if neighbor < 0 or neighbor >= len(pixels) or filled[neighbor] is not None:
                continue
            nx = neighbor % width
            ny = neighbor // width
            if abs(nx - x) + abs(ny - y) != 1:
                continue
            filled[neighbor] = color
            queue.append(neighbor)

    cleaned = [filled[index] or (10, 32, 42) for index in range(len(pixels))]
    out = Image.new("RGB", rgb.size)
    out.putdata(cleaned)
    return out


def trim_transparent(image: Image.Image, padding: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox() or (0, 0, image.width, image.height)
    x0, y0, x1, y1 = bbox
    crop = (
        max(0, x0 - padding),
        max(0, y0 - padding),
        min(image.width, x1 + padding),
        min(image.height, y1 + padding),
    )
    return image.crop(crop), crop


def build_band() -> dict[str, Any]:
    source = Image.open(BAND["source"]).convert("RGB")
    target_w, target_h = BAND["targetSize"]
    source_ratio = source.width / source.height
    target_ratio = target_w / target_h
    if source_ratio > target_ratio:
        crop_h = source.height
        crop_w = round(crop_h * target_ratio)
        left = (source.width - crop_w) // 2
        crop = (left, 0, left + crop_w, crop_h)
    else:
        crop_w = source.width
        crop_h = round(crop_w / target_ratio)
        top = max(0, (source.height - crop_h) // 2)
        crop = (0, top, crop_w, top + crop_h)
    output = source.crop(crop).resize((target_w, target_h), Image.Resampling.LANCZOS)
    output = decontaminate_opaque_key_color(output)
    out_path = OUT_DIR / BAND["filename"]
    output.save(out_path)
    return {
        "id": BAND["id"],
        "role": "bandPlate",
        "band": "transitionDeep",
        "label": BAND["label"],
        "repeatMode": "bandClampY",
        "path": rel(out_path),
        "status": "ready",
        "safeOpacity": BAND["safeOpacity"],
        "scaleRange": BAND["scaleRange"],
        "parallaxRange": BAND["parallaxRange"],
        "readabilityRisk": "low",
        "sourcePath": rel(BAND["source"]),
        "sourceCrop": list(crop),
        "size": [target_w, target_h],
        "authoredPhase": 11,
        "notes": "Phase 11 real GPT bitmap band plate; cropped/downsampled from the approved opaque generated source, not redrawn in code.",
    }


def build_landmark(asset: dict[str, Any]) -> dict[str, Any]:
    source = Image.open(asset["source"]).convert("RGB")
    alpha = chroma_key_alpha(source)
    rgba = source.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = decontaminate_magenta_matte(rgba)
    trimmed, crop = trim_transparent(rgba, 42)
    out_path = OUT_DIR / asset["filename"]
    trimmed.save(out_path)
    out_alpha = trimmed.getchannel("A")
    transparent_pixels = sum(1 for value in out_alpha.getdata() if value == 0)
    if trimmed.mode != "RGBA" or transparent_pixels <= 0:
        raise RuntimeError(f"{out_path.name} did not retain RGBA transparency")
    return {
        "id": asset["id"],
        "role": "landmark",
        "band": "transitionDeep",
        "label": asset["label"],
        "repeatMode": "anchor",
        "path": rel(out_path),
        "status": "ready",
        "safeOpacity": asset["safeOpacity"],
        "scaleRange": asset["scaleRange"],
        "parallaxRange": asset["parallaxRange"],
        "readabilityRisk": asset["readabilityRisk"],
        "size": [trimmed.width, trimmed.height],
        "sourcePath": rel(asset["source"]),
        "sourceCrop": list(crop),
        "authoredPhase": 11,
        "depthLane": asset["depthLane"],
        "transparentPixels": transparent_pixels,
        "notes": "Phase 11 real GPT bitmap landmark; #ff00ff/magenta source matte converted to alpha and rendered directly by Phaser texture.",
    }


def update_manifest(entries: list[dict[str, Any]]) -> None:
    manifest = json.loads(MANIFEST.read_text())
    phase11_ids = {entry["id"] for entry in entries}
    manifest["assets"] = [entry for entry in manifest["assets"] if entry.get("id") not in phase11_ids]
    manifest["assets"].extend(entries)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = [note for note in manifest.get("notes", []) if "Phase 11" not in note]
    notes.append("Phase 11 integrates real GPT-generated transition-deep bitmap assets as ready runtime textures; Phase 8/9/10 remain fallback/scaffolding.")
    manifest["notes"] = notes
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = [build_band(), *[build_landmark(asset) for asset in LANDMARKS]]
    update_manifest(entries)
    print(json.dumps({"assets": entries}, indent=2))


if __name__ == "__main__":
    main()
