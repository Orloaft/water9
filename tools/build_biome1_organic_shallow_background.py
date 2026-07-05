#!/usr/bin/env python3
"""Build organic B1 shallow background bitmaps from existing shallow sources."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "public/assets/generated"
OUT_DIR = GENERATED_DIR / "background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"

SHALLOW_SOURCE = GENERATED_DIR / "bg-shallow.png"
PARALLAX_SOURCES = [
    GENERATED_DIR / "parallax-shallow-0.png",
    GENERATED_DIR / "parallax-shallow-1.png",
    GENERATED_DIR / "parallax-shallow-2.png",
    GENERATED_DIR / "parallax-shallow-3.png",
]

BAND_ID = "biome1-organic-shallow-reef-band"
LANDMARK_ID = "biome-shallows-organic-reef-shelf"
BAND_PATH = OUT_DIR / "water9-biome1-organic-shallow-reef-band.png"
LANDMARK_PATH = OUT_DIR / "water9-biome-landmark-shallows-organic-reef-shelf.png"


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resized_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def color_grade(image: Image.Image, *, blur: float, saturation: float, brightness: float, contrast: float) -> Image.Image:
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(saturation)
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    if blur:
        rgb = rgb.filter(ImageFilter.GaussianBlur(blur))
    teal = Image.new("RGB", rgb.size, (25, 102, 112))
    haze = Image.new("RGB", rgb.size, (112, 176, 164))
    rgb = Image.blend(rgb, teal, 0.28)
    rgb = Image.blend(rgb, haze, 0.12)
    return rgb.convert("RGBA")


def reef_content_alpha(image: Image.Image, *, strength: float, floor: int = 0) -> Image.Image:
    rgb = image.convert("RGB")
    values: list[int] = []
    for r, g, b in rgb.getdata():
        luma = r * 0.2126 + g * 0.7152 + b * 0.0722
        saturation = max(r, g, b) - min(r, g, b)
        dark_structure = max(0.0, (152.0 - luma) / 152.0)
        warm_reef = max(0.0, (r + g * 0.7 - b * 1.08) / 255.0)
        green_life = max(0.0, (g - b * 0.72) / 190.0)
        score = dark_structure * 0.76 + (saturation / 255.0) * 0.22 + warm_reef * 0.16 + green_life * 0.18
        values.append(max(0, min(255, round(floor + score * strength))))
    alpha = Image.new("L", rgb.size)
    alpha.putdata(values)
    return alpha.filter(ImageFilter.GaussianBlur(2.3))


def vertical_fade(size: tuple[int, int], stops: list[tuple[float, float]]) -> Image.Image:
    width, height = size
    stops = sorted(stops)
    row_values: list[int] = []
    for y in range(height):
        t = y / max(1, height - 1)
        previous = stops[0]
        current = stops[-1]
        for index in range(1, len(stops)):
            if t <= stops[index][0]:
                previous = stops[index - 1]
                current = stops[index]
                break
        span = max(0.0001, current[0] - previous[0])
        local = max(0.0, min(1.0, (t - previous[0]) / span))
        eased = local * local * (3 - 2 * local)
        value = previous[1] + (current[1] - previous[1]) * eased
        row_values.append(max(0, min(255, round(value * 255))))
    alpha = Image.new("L", size)
    pixels = alpha.load()
    for y, value in enumerate(row_values):
        for x in range(width):
            pixels[x, y] = value
    return alpha


def edge_fade(size: tuple[int, int], margin_x: int, margin_y: int) -> Image.Image:
    width, height = size
    alpha = Image.new("L", size)
    pixels = alpha.load()
    for y in range(height):
        fy = min(y / max(1, margin_y), (height - 1 - y) / max(1, margin_y), 1.0)
        for x in range(width):
            fx = min(x / max(1, margin_x), (width - 1 - x) / max(1, margin_x), 1.0)
            edge = min(fx, fy)
            pixels[x, y] = max(0, min(255, round(edge * edge * (3 - 2 * edge) * 255)))
    return alpha


def multiply_masks(*masks: Image.Image) -> Image.Image:
    if not masks:
        raise ValueError("at least one mask is required")
    size = masks[0].size
    combined = Image.new("L", size, 255)
    data = [255] * (size[0] * size[1])
    for mask in masks:
        if mask.size != size:
            raise ValueError("mask size mismatch")
        data = [round(value * next_value / 255) for value, next_value in zip(data, mask.getdata())]
    combined.putdata(data)
    return combined


def alpha_composite_layer(canvas: Image.Image, layer: Image.Image, pos: tuple[int, int], alpha: Image.Image) -> None:
    rgba = layer.convert("RGBA")
    existing = rgba.getchannel("A")
    rgba.putalpha(multiply_masks(existing, alpha))
    canvas.alpha_composite(rgba, pos)


def parallax_haze(size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    for index, source_path in enumerate(PARALLAX_SOURCES):
        source = Image.open(source_path)
        layer = resized_width(source, size[0] + 160 + index * 70)
        layer = color_grade(layer, blur=5.5 + index, saturation=0.38, brightness=0.86, contrast=0.68)
        crop_top = max(0, (layer.height - size[1]) // 2)
        layer = layer.crop((0, crop_top, min(layer.width, size[0] + 180), min(layer.height, crop_top + size[1])))
        layer = layer.resize((size[0], size[1]), Image.Resampling.LANCZOS)
        content = reef_content_alpha(layer, strength=38 + index * 5, floor=8)
        fade = edge_fade(layer.size, 120, 80)
        alpha_composite_layer(canvas, layer, (0, 0), multiply_masks(content, fade))
    return canvas.filter(ImageFilter.GaussianBlur(1.4))


def build_shelf_canvas(size: tuple[int, int], *, landmark: bool) -> Image.Image:
    shallow = Image.open(SHALLOW_SOURCE)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0)) if landmark else parallax_haze(size)

    top_width = size[0] + (260 if landmark else 210)
    top = resized_width(shallow, top_width)
    top = color_grade(top, blur=2.7 if landmark else 3.2, saturation=0.48, brightness=0.76, contrast=0.7)
    top = top.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    top = top.crop((0, 0, top.width, min(top.height, round(size[1] * 0.58))))
    top_alpha = reef_content_alpha(top, strength=210 if landmark else 168, floor=0)
    top_vertical = vertical_fade(top.size, [(0.0, 0.9), (0.26, 0.66), (0.58, 0.22), (1.0, 0.0)])
    top_edge = edge_fade(top.size, round(top.width * 0.08), round(top.height * 0.08))
    alpha_composite_layer(canvas, top, (-(top.width - size[0]) // 2, -18 if landmark else -28), multiply_masks(top_alpha, top_vertical, top_edge))

    bottom_width = size[0] + (360 if landmark else 240)
    bottom = resized_width(shallow, bottom_width)
    bottom = color_grade(bottom, blur=2.1 if landmark else 2.8, saturation=0.44, brightness=0.82, contrast=0.74)
    bottom = bottom.crop((0, max(0, bottom.height - round(size[1] * 0.5)), bottom.width, bottom.height))
    bottom_alpha = reef_content_alpha(bottom, strength=190 if landmark else 150, floor=0)
    bottom_vertical = vertical_fade(bottom.size, [(0.0, 0.0), (0.22, 0.2), (0.56, 0.68), (1.0, 0.88)])
    bottom_edge = edge_fade(bottom.size, round(bottom.width * 0.1), round(bottom.height * 0.09))
    bottom_y = size[1] - bottom.height + (8 if landmark else 20)
    alpha_composite_layer(canvas, bottom, (-(bottom.width - size[0]) // 2, bottom_y), multiply_masks(bottom_alpha, bottom_vertical, bottom_edge))

    return canvas.filter(ImageFilter.GaussianBlur(0.75 if landmark else 1.1))


def alpha_stats(image: Image.Image) -> dict[str, int]:
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    return {
        "transparentPixels": sum(1 for value in values if value == 0),
        "semiTransparentPixels": sum(1 for value in values if 0 < value < 255),
        "opaquePixels": sum(1 for value in values if value == 255),
    }


def build_assets() -> tuple[dict[str, Any], dict[str, Any]]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    band = build_shelf_canvas((1152, 432), landmark=False)
    landmark = build_shelf_canvas((1280, 520), landmark=True)
    band.save(BAND_PATH)
    landmark.save(LANDMARK_PATH)
    return (
        {
            "id": BAND_ID,
            "role": "bandPlate",
            "band": "upper",
            "label": "Biome 1 organic shallow reef shelf band",
            "repeatMode": "bandClampY",
            "path": rel(BAND_PATH),
            "status": "ready",
            "safeOpacity": 0.34,
            "scaleRange": [1.0, 1.12],
            "parallaxRange": [0.004, 0.026],
            "readabilityRisk": "low",
            "size": [band.width, band.height],
            "sourcePath": rel(SHALLOW_SOURCE),
            "sourceInputs": [rel(SHALLOW_SOURCE), *[rel(path) for path in PARALLAX_SOURCES]],
            "authoredPhase": 13,
            "organicBiome1Replacement": True,
            **alpha_stats(band),
            "notes": (
                "Organic B1 normal-band bitmap composited from existing shallow painterly/parallax sources; "
                "it replaces Phase 11 industrial transition band art for biome 1 upper/mid/lower gameplay."
            ),
        },
        {
            "id": LANDMARK_ID,
            "role": "landmark",
            "band": "upper",
            "label": "Biome 1 organic shallow reef overhang shelf",
            "repeatMode": "anchor",
            "path": rel(LANDMARK_PATH),
            "status": "ready",
            "safeOpacity": 0.2,
            "scaleRange": [1.02, 1.62],
            "parallaxRange": [0.048, 0.118],
            "readabilityRisk": "low",
            "size": [landmark.width, landmark.height],
            "sourcePath": rel(SHALLOW_SOURCE),
            "sourceInputs": [rel(SHALLOW_SOURCE), *[rel(path) for path in PARALLAX_SOURCES]],
            "authoredPhase": 13,
            "biomeLandmark": True,
            "organicBiome1Replacement": True,
            **alpha_stats(landmark),
            "notes": (
                "Transparent organic shallow reef/overhang shelf bitmap built from existing shallow painterly sources; "
                "contains no Phase 11 station/gantry crops, portholes, circular hatches, rectangular panels, or shell-arch placeholder geometry."
            ),
        },
    )


def upsert_manifest(entries: tuple[dict[str, Any], dict[str, Any]]) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    replacement_ids = {entry["id"] for entry in entries}
    assets = [asset for asset in manifest["assets"] if asset.get("id") not in replacement_ids]
    insert_at = next(
        (
            index + 1
            for index, asset in enumerate(assets)
            if asset.get("id") == "biome-shallows-shell-survey-terrace"
        ),
        len(assets),
    )
    assets[insert_at:insert_at] = list(entries)
    manifest["assets"] = assets
    manifest["generatedAt"] = utc_now()
    notes = manifest.setdefault("notes", [])
    note = "Biome 1 organic shallow replacement assets are generated from existing shallow painterly sources and are used instead of Phase 11 transition assets in normal B1 bands."
    if note not in notes:
        notes.append(note)
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf8")


def main() -> None:
    entries = build_assets()
    upsert_manifest(entries)
    print(json.dumps({"ok": True, "assets": entries}, indent=2))


if __name__ == "__main__":
    main()
