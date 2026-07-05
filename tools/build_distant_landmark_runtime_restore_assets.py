#!/usr/bin/env python3
"""Rebuild runtime landmark cutouts for the distant-landmark restoration pass."""

from __future__ import annotations

import json
from collections import deque
from datetime import datetime, timezone
from math import sqrt
from pathlib import Path
from typing import Any

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tools/source-inbox"
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"

B2_SOURCE = SOURCE_DIR / "water9-biome2-brine-shelf-gpt-source.png"
B3_SOURCE = SOURCE_DIR / "water9-phase11-transition-mid-collapsed-gantry-brine-reef-gpt-source.png"
B4_SOURCE = SOURCE_DIR / "water9-phase11-transition-far-drowned-signal-station-gpt-source.png"

LANDMARKS = {
    "biome-brine-vent-sulfide-shelf": {
        "path": OUT_DIR / "water9-biome-landmark-brine-shelf-gpt.png",
        "source": B2_SOURCE,
        "label": "Biome 2 horizontal brine sulfide shelf",
        "band": "mid",
        "size": [960, 520],
        "sourceCrop": [80, 420, 1600, 852],
        "safeOpacity": 0.24,
        "scaleRange": [1.08, 1.72],
        "parallaxRange": [0.065, 0.14],
        "readabilityRisk": "medium",
        "alphaMultiplier": 1.0,
        "notes": (
            "Runtime restoration rebuilds the existing painterly GPT brine shelf as a wide, low vertical profile "
            "cutout. The upper chimney field is cropped out of the runtime PNG so normal gameplay reads as a "
            "horizontal sulfide shelf, not a vertical curtain or shaft."
        ),
    },
    "biome-midnight-black-coral-ribs": {
        "path": OUT_DIR / "water9-biome-landmark-midnight-black-coral-ribs.png",
        "source": B3_SOURCE,
        "label": "Biome 3 black coral ribs distant gantry cutout",
        "band": "lower",
        "safeOpacity": 0.28,
        "scaleRange": [1.12, 1.86],
        "parallaxRange": [0.038, 0.09],
        "readabilityRisk": "medium",
        "alphaMultiplier": 0.45,
        "notes": (
            "Runtime restoration rebuilds the Phase 11 collapsed gantry source with a hard magenta matte removal, "
            "transparent RGB decontamination, and feathered texture edges so the source rectangle is not visible "
            "during normal gameplay."
        ),
    },
    "biome-ruins-vault-causeway-lattice": {
        "path": OUT_DIR / "water9-biome-landmark-ruins-vault-causeway-lattice.png",
        "source": B4_SOURCE,
        "label": "Biome 4 vault causeway distant station cutout",
        "band": "lower",
        "safeOpacity": 0.3,
        "scaleRange": [1.1, 1.82],
        "parallaxRange": [0.035, 0.085],
        "readabilityRisk": "medium",
        "alphaMultiplier": 0.34,
        "notes": (
            "Runtime restoration rebuilds the Phase 11 drowned station source with a hard magenta matte removal, "
            "transparent RGB decontamination, and feathered texture edges so the source rectangle is not visible "
            "during normal gameplay."
        ),
    },
}


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def is_key_colored(pixel: tuple[int, int, int] | tuple[int, int, int, int]) -> bool:
    r, g, b = pixel[:3]
    magenta_bias = min(r, b) - g
    return (
        (r > 184 and b > 184 and g < 158)
        or (r > 146 and b > 150 and g < 132 and magenta_bias > 34)
        or (r > 112 and b > 126 and g < 118 and magenta_bias > 24)
        or (b > 102 and g < 92 and r < 150 and b - g > 28)
    )


def chroma_alpha(image: Image.Image, *, hard: bool) -> Image.Image:
    rgb = image.convert("RGB")
    alpha = Image.new("L", rgb.size, 255)
    alpha_pixels = alpha.load()
    pixels = rgb.load()
    inner = 82 if hard else 68
    outer = 176 if hard else 196
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pixels[x, y]
            dist = sqrt((255 - r) ** 2 + g**2 + (255 - b) ** 2)
            magenta_bias = min(r, b) - g
            if is_key_colored((r, g, b)):
                if hard:
                    value = 0 if dist < outer or magenta_bias > 28 else 255
                elif dist <= inner:
                    value = 0
                elif dist < outer and magenta_bias > 18:
                    value = round((dist - inner) / (outer - inner) * 255)
                else:
                    value = 255
                alpha_pixels[x, y] = max(0, min(255, value))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.55 if hard else 0.8))
    return alpha.point(lambda value: 0 if value < 40 else 255 if value > 246 else value)


def fill_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = list(rgba.getdata())
    filled: list[tuple[int, int, int] | None] = [None] * len(pixels)
    queue: deque[int] = deque()

    for index, (r, g, b, a) in enumerate(pixels):
        if a >= 224 and not is_key_colored((r, g, b)):
            filled[index] = (r, g, b)
            queue.append(index)

    fallback = (8, 29, 38)
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
    for index, (r, g, b, a) in enumerate(pixels):
        if a <= 4 or is_key_colored((r, g, b)):
            r, g, b = filled[index] or fallback
        if a <= 4:
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, a))
    out = Image.new("RGBA", rgba.size)
    out.putdata(cleaned)
    return out


def trim_transparent(image: Image.Image, padding: int) -> tuple[Image.Image, list[int]]:
    bbox = image.getchannel("A").getbbox() or (0, 0, image.width, image.height)
    crop = [
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(image.width, bbox[2] + padding),
        min(image.height, bbox[3] + padding),
    ]
    return image.crop(tuple(crop)), crop


def apply_edge_feather(image: Image.Image, margin: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    feather = Image.new("L", rgba.size, 0)
    feather_pixels = feather.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            distance = min(x, y, rgba.width - 1 - x, rgba.height - 1 - y)
            feather_pixels[x, y] = max(0, min(255, round(distance / max(1, margin) * 255)))
    alpha = Image.composite(alpha, Image.new("L", rgba.size, 0), feather)
    rgba.putalpha(alpha)
    return rgba


def multiply_alpha(image: Image.Image, factor: float) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: max(0, min(255, round(value * factor))))
    rgba.putalpha(alpha)
    return rgba


def alpha_stats(image: Image.Image) -> dict[str, int]:
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    return {
        "transparentPixels": sum(1 for value in values if value == 0),
        "semiTransparentPixels": sum(1 for value in values if 0 < value < 255),
        "opaquePixels": sum(1 for value in values if value == 255),
    }


def build_b2() -> dict[str, Any]:
    config = LANDMARKS["biome-brine-vent-sulfide-shelf"]
    source = Image.open(config["source"]).convert("RGB")
    crop = tuple(config["sourceCrop"])
    cropped = source.crop(crop)
    alpha = chroma_alpha(cropped, hard=False)
    rgba = cropped.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = fill_transparent_rgb(rgba)

    # Keep only the wide sulfide/brine shelf band and dissolve remaining chimney tops.
    fade = Image.new("L", rgba.size, 0)
    fade_pixels = fade.load()
    for y in range(rgba.height):
        vertical = y / max(1, rgba.height - 1)
        if vertical < 0.18:
            value = round(vertical / 0.18 * 120)
        elif vertical < 0.36:
            value = round(120 + (vertical - 0.18) / 0.18 * 135)
        elif vertical > 0.94:
            value = round((1 - vertical) / 0.06 * 255)
        else:
            value = 255
        for x in range(rgba.width):
            edge = min(x, rgba.width - 1 - x) / max(1, rgba.width * 0.08)
            fade_pixels[x, y] = max(0, min(value, round(min(1, edge) * 255)))
    shelf_alpha = Image.composite(rgba.getchannel("A"), Image.new("L", rgba.size, 0), fade)
    rgba.putalpha(shelf_alpha)

    target_w, target_h = config["size"]
    scale = target_w / rgba.width
    resized = rgba.resize((target_w, round(rgba.height * scale)), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    output.alpha_composite(resized, (0, 156))
    output = ImageEnhance.Color(output).enhance(0.82)
    output = ImageEnhance.Brightness(output).enhance(1.1)
    output = ImageEnhance.Contrast(output).enhance(0.9)
    output = fill_transparent_rgb(output)
    config["path"].parent.mkdir(parents=True, exist_ok=True)
    output.save(config["path"])
    return {
        "sourceCrop": list(crop),
        "size": [output.width, output.height],
        **alpha_stats(output),
    }


def build_cutout(asset_id: str, *, feather: int) -> dict[str, Any]:
    config = LANDMARKS[asset_id]
    source = Image.open(config["source"]).convert("RGB")
    alpha = chroma_alpha(source, hard=True)
    rgba = source.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = fill_transparent_rgb(rgba)
    trimmed, crop = trim_transparent(rgba, 44)
    trimmed = apply_edge_feather(trimmed, feather)
    trimmed = multiply_alpha(trimmed, config["alphaMultiplier"])
    trimmed = fill_transparent_rgb(trimmed)
    config["path"].parent.mkdir(parents=True, exist_ok=True)
    trimmed.save(config["path"])
    return {
        "sourceCrop": crop,
        "size": [trimmed.width, trimmed.height],
        **alpha_stats(trimmed),
    }


def update_manifest(results: dict[str, dict[str, Any]]) -> None:
    manifest = json.loads(MANIFEST.read_text())
    by_id = {asset.get("id"): asset for asset in manifest["assets"]}
    for asset_id, config in LANDMARKS.items():
        entry = by_id.get(asset_id)
        if entry is None:
            raise RuntimeError(f"missing manifest entry for {asset_id}")
        result = results[asset_id]
        entry.update(
            {
                "label": config["label"],
                "path": rel(config["path"]),
                "status": "ready",
                "band": config["band"],
                "safeOpacity": config["safeOpacity"],
                "scaleRange": config["scaleRange"],
                "parallaxRange": config["parallaxRange"],
                "readabilityRisk": config["readabilityRisk"],
                "size": result["size"],
                "sourcePath": rel(config["source"]),
                "sourceCrop": result["sourceCrop"],
                "authoredPhase": 12,
                "biomeLandmark": True,
                "transparentPixels": result["transparentPixels"],
                "semiTransparentPixels": result["semiTransparentPixels"],
                "notes": config["notes"],
            }
        )
        entry.pop("trimCrop", None)
        entry.pop("depthLane", None)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = [
        note
        for note in manifest.get("notes", [])
        if "Distant landmark runtime restoration" not in note
    ]
    notes.append(
        "Distant landmark runtime restoration rebuilds B2 as a wide horizontal shelf and hard-cleans B3/B4 magenta mattes so normal gameplay does not show rectangular bitmap windows."
    )
    manifest["notes"] = notes
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n")


def main() -> None:
    results = {
        "biome-brine-vent-sulfide-shelf": build_b2(),
        "biome-midnight-black-coral-ribs": build_cutout("biome-midnight-black-coral-ribs", feather=160),
        "biome-ruins-vault-causeway-lattice": build_cutout("biome-ruins-vault-causeway-lattice", feather=180),
    }
    update_manifest(results)
    print(json.dumps({"assets": results}, indent=2))


if __name__ == "__main__":
    main()
