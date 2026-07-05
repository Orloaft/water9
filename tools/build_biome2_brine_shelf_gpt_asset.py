#!/usr/bin/env python3
"""Ingest the Biome 2 GPT vertical brine chimney source as a runtime RGBA landmark."""

from __future__ import annotations

import json
from collections import deque
from math import sqrt
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools/source-inbox/water9-biome2-brine-vertical-chimney-gpt-source.png"
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
OUT = OUT_DIR / "water9-biome-landmark-brine-vertical-chimney-gpt.png"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"
TARGET_SIZE = (960, 520)
ASSET_ID = "biome-brine-vertical-chimney-gpt"


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


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


def chroma_key_alpha(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    pixels = rgb.load()
    alpha = Image.new("L", rgb.size, 255)
    alpha_pixels = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pixels[x, y]
            key_distance = sqrt((r - 255) ** 2 + g ** 2 + (b - 255) ** 2)
            magenta_strength = min(r, b) - g
            if (
                key_distance < 128
                or (r > 188 and b > 188 and g < 112)
                or (r > 154 and b > 170 and g < 128 and magenta_strength > 64)
            ):
                alpha_pixels[x, y] = 0
            elif is_key_contaminated_edge_pixel((r, g, b)):
                alpha_pixels[x, y] = 0
            elif key_distance < 176 or (magenta_strength > 96 and r > 128 and b > 138):
                alpha_pixels[x, y] = max(0, min(220, round((key_distance - 128) / 48 * 220)))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    return alpha.point(lambda value: 0 if value < 18 else value)


def decontaminate_magenta_matte(image: Image.Image) -> Image.Image:
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
        if a == 0 or is_key_contaminated_edge_pixel(pixel):
            r, g, b = filled[index] or fallback
        cleaned.append((r, g, b, a))

    out = Image.new("RGBA", rgba.size)
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


def fit_to_target(image: Image.Image) -> Image.Image:
    target_w, target_h = TARGET_SIZE
    fitted = Image.new("RGBA", TARGET_SIZE, (10, 32, 42, 0))
    scale = min(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    x = (target_w - resized.width) // 2
    y = target_h - resized.height
    fitted.alpha_composite(resized, (x, y))
    return fitted


def purge_resampled_matte_edges(image: Image.Image) -> Image.Image:
    rgba = decontaminate_magenta_matte(image)
    cleaned = []
    for pixel in rgba.getdata():
        r, g, b, a = pixel
        cyan_stage_matte = (
            a < 252
            and g > 92
            and b > 104
            and r < 178
            and abs(g - b) < 92
            and b - r > -18
        )
        resampled_key_edge = a < 238 and r > 76 and b > 96 and b - g > 8 and r - g > -18
        opaque_lavender_matte = r > 148 and b > 166 and g < 172 and b - g > 24 and r - g > 8
        if (
            (a < 250 and (is_key_contaminated_edge_pixel(pixel) or resampled_key_edge or cyan_stage_matte))
            or opaque_lavender_matte
        ):
            cleaned.append((10, 32, 42, 0))
        else:
            cleaned.append(pixel)
    out = Image.new("RGBA", rgba.size)
    out.putdata(cleaned)
    return zero_transparent_rgb(decontaminate_magenta_matte(out))


def zero_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    cleaned = []
    for r, g, b, a in rgba.getdata():
        if a <= 8:
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, a))
    out = Image.new("RGBA", rgba.size)
    out.putdata(cleaned)
    return out


def build_asset() -> dict[str, Any]:
    source = Image.open(SOURCE).convert("RGB")
    alpha = chroma_key_alpha(source)
    rgba = source.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = decontaminate_magenta_matte(rgba)
    trimmed, crop = trim_transparent(rgba, 42)
    output = purge_resampled_matte_edges(fit_to_target(trimmed))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    output.save(OUT)
    out_alpha = output.getchannel("A")
    transparent_pixels = sum(1 for value in out_alpha.getdata() if value == 0)
    if output.mode != "RGBA" or transparent_pixels <= 0:
        raise RuntimeError(f"{OUT.name} did not retain RGBA transparency")
    return {
        "id": ASSET_ID,
        "role": "landmark",
        "band": "mid",
        "label": "Biome 2 GPT vertical brine chimney landmark",
        "repeatMode": "anchor",
        "path": rel(OUT),
        "status": "ready",
        "safeOpacity": 0.46,
        "scaleRange": [1.16, 1.72],
        "parallaxRange": [0.06, 0.13],
        "readabilityRisk": "medium",
        "sourcePath": rel(SOURCE),
        "sourceCrop": list(crop),
        "transparentPixels": transparent_pixels,
        "size": list(TARGET_SIZE),
        "authoredPhase": 12,
        "biomeLandmark": True,
        "notes": "Biome 2 real GPT vertical chimney bitmap landmark; #ff00ff/magenta source matte converted to alpha and rendered directly by Phaser texture.",
    }


def update_manifest(entry: dict[str, Any]) -> None:
    manifest = json.loads(MANIFEST.read_text())
    retired_ids = {ASSET_ID, "biome-brine-shelf-gpt"}
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in retired_ids]
    insert_at = next(
        (index + 1 for index, asset in enumerate(manifest["assets"]) if asset.get("id") == "biome-shallows-shell-survey-terrace"),
        len(manifest["assets"]),
    )
    manifest["assets"].insert(insert_at, entry)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = [
        note
        for note in manifest.get("notes", [])
        if "Biome 2 GPT brine shelf" not in note
        and "Biome 2 GPT vertical brine chimney" not in note
    ]
    notes.append("Biome 2 GPT vertical brine chimney integrates the second generated bitmap source as a ready manifest-backed landmark.")
    manifest["notes"] = notes
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n")


def main() -> None:
    entry = build_asset()
    update_manifest(entry)
    print(json.dumps({"asset": entry}, indent=2))


if __name__ == "__main__":
    main()
