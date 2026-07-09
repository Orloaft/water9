#!/usr/bin/env python3
"""Build source-backed fauna replacements for cleanup slice 3.

This script does not draw source art. It trims, chroma-keys, resizes, and packs
tracked/generated bitmap cutouts into runtime sprite sheets.
"""

from __future__ import annotations

import json
import math
import argparse
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE_DIR = ROOT / "public/assets/source/fauna-flora-source-art-slice-3"
MANIFEST_PATH = ROOT / "public/assets/source/fauna-flora-source-art-slice-3-manifest.json"


GENERATED_PROMPTS = {
    "fauna-shallow-blue-ring-octopus": "Use case: stylized-concept\nAsset type: project-bound 2D game sprite animation source sheet for Water9 small fauna.\nPrimary request: Create a six-frame horizontal animation sprite sheet of a blue-ring octopus locomotion cycle, isolated on a perfectly flat solid #ff00ff chroma-key background for background removal.\nSubject: one compact blue-ring octopus, warm ochre/yellow body, vivid cobalt-blue rings, painterly browser-game sprite style, readable at small gameplay scale.\nComposition: six equal poses in a single horizontal row, generous padding around every pose, no dividers, no labels, no text, no shadows, no water, no bubbles, no scene elements. Keep the octopus centered within each frame with consistent scale and orientation, traveling/readable left-to-right in pose design but not jumping across the cell.\nAnimation poses from left to right: 1 compact ready pose with arms slightly spread and readable; 2 arms gathered under and behind body while mantle begins compressing; 3 mantle squeeze and elongation for a jet pulse with body stretched forward and arms trailing backward; 4 strongest travel pose with rear arms swept back in a clear trailing silhouette/wake shape; 5 recovery flare with arms opening outward and forward; 6 settle back toward compact ready pose.\nMotion requirements: strong silhouette change between frames, clearly real octopus locomotion rather than shimmer, enough visible arms to read as octopus, visible mantle compression/elongation and arm sweep.\nAvoid: squid or fish silhouette, symmetric starburst, cropped arms, large teleporting body jumps, muddy loss of blue rings, pure color shimmer, static mantle with only texture changes, background texture, gradients, shadows, watermark, or text.",
    "fauna-shallow-octopus": "Create a painterly underwater game-art tidepool octopus cutout on a flat solid #ff00ff chroma-key background. Russet umber mantle, expressive eye, eight arms in a readable crawling silhouette with curled tips and subtle suction cups, distinct from a blue-ring octopus, single organism, no text, no shadow, no extra scene elements.",
    "fauna-shallow-comb-jelly": "Create a painterly underwater game-art comb jelly cutout on a flat solid #ff00ff chroma-key background. Oval transparent-gel ctenophore body, subtle cyan and amber iridescent comb rows, two fine trailing tentacles, coherent organism silhouette, no text, no shadow, no extra scene elements.",
}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def open_rgba(path: str | Path) -> Image.Image:
    source = path if isinstance(path, Path) else ROOT / path
    return Image.open(source).convert("RGBA")


def alpha_bbox(image: Image.Image, pad: int = 0) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return (0, 0, image.width, image.height)
    left, top, right, bottom = bbox
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )


def trim_alpha(image: Image.Image, pad: int = 6) -> Image.Image:
    return image.crop(alpha_bbox(image, pad))


def remove_magenta_key(image: Image.Image, *, trim: bool = True) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            magenta_delta = abs(r - 255) + g + abs(b - 255)
            if (r > 170 and b > 150 and g < 105 and max(r, b) - g > 75) or magenta_delta < 80:
                pixels[x, y] = (r, g, b, 0)
    return trim_alpha(rgba, 8) if trim else rgba


def source_cutout(path: str, *, preserve_canvas: bool = False) -> Image.Image:
    image = open_rgba(path)
    if image.getchannel("A").getextrema()[0] < 255:
        return image if preserve_canvas else trim_alpha(image, 8)
    return remove_magenta_key(image, trim=not preserve_canvas)


def fit_to_canvas(image: Image.Image, size: tuple[int, int], *, pad: int = 3) -> Image.Image:
    trimmed = trim_alpha(image, 2)
    max_w = max(1, size[0] - pad * 2)
    max_h = max(1, size[1] - pad * 2)
    fitted = ImageOps.contain(trimmed, (max_w, max_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return canvas


def save_source(asset_key: str, image: Image.Image) -> Path:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    path = SOURCE_DIR / f"{asset_key}-source.png"
    image.save(path)
    return path


def sample_bilinear(source: Image.Image, sx: float, sy: float) -> tuple[int, int, int, int]:
    if sx < 0 or sy < 0 or sx >= source.width - 1 or sy >= source.height - 1:
        return (0, 0, 0, 0)
    x0 = int(sx)
    y0 = int(sy)
    tx = sx - x0
    ty = sy - y0
    pixels = source.load()
    samples = [
        (pixels[x0, y0], (1 - tx) * (1 - ty)),
        (pixels[x0 + 1, y0], tx * (1 - ty)),
        (pixels[x0, y0 + 1], (1 - tx) * ty),
        (pixels[x0 + 1, y0 + 1], tx * ty),
    ]
    alpha = sum(px[3] * weight for px, weight in samples)
    if alpha <= 0:
        return (0, 0, 0, 0)
    rgb = [
        round(sum(px[channel] * px[3] * weight for px, weight in samples) / alpha)
        for channel in range(3)
    ]
    return (rgb[0], rgb[1], rgb[2], round(alpha))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    if edge0 == edge1:
        return 1.0 if value >= edge1 else 0.0
    t = max(0.0, min(1.0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def center_alpha_like(image: Image.Image, reference: Image.Image) -> Image.Image:
    ref_box = alpha_bbox(reference, 0)
    box = alpha_bbox(image, 0)
    ref_cx = (ref_box[0] + ref_box[2]) / 2
    ref_cy = (ref_box[1] + ref_box[3]) / 2
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    dx = round(ref_cx - cx)
    dy = round(ref_cy - cy)
    if dx == 0 and dy == 0:
        return image
    out = Image.new("RGBA", image.size, (0, 0, 0, 0))
    out.alpha_composite(image, (dx, dy))
    return out


def remove_edge_alpha_islands(image: Image.Image, *, edge_band: int = 24, max_area_ratio: float = 0.25) -> Image.Image:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    width, height = image.size
    seen: set[tuple[int, int]] = set()
    components: list[tuple[int, tuple[int, int, int, int], list[tuple[int, int]]]] = []
    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y] <= 0:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            coords: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y
            while stack:
                cx, cy = stack.pop()
                coords.append((cx, cy))
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for ny in range(cy - 1, cy + 2):
                    for nx in range(cx - 1, cx + 2):
                        if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in seen:
                            continue
                        if pixels[nx, ny] <= 0:
                            continue
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            components.append((len(coords), (min_x, min_y, max_x + 1, max_y + 1), coords))
    if len(components) <= 1:
        return image
    largest = max(area for area, _, _ in components)
    cleaned = image.copy()
    cleaned_pixels = cleaned.load()
    for area, box, coords in components:
        left, _, right, _ = box
        touches_side_edge = left < edge_band or right > width - edge_band
        if not touches_side_edge or area >= largest * max_area_ratio:
            continue
        for x, y in coords:
            r, g, b, _ = cleaned_pixels[x, y]
            cleaned_pixels[x, y] = (r, g, b, 0)
    return cleaned


def split_source_strip(source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(count):
        left = round(index * source.width / count)
        right = round((index + 1) * source.width / count)
        cell = remove_edge_alpha_islands(source.crop((left, 0, right, source.height)))
        pose = trim_alpha(cell, 8)
        frames.append(fit_to_canvas(pose, size, pad=2))
    return frames


def shimmer_blue_rings(frame: Image.Image, phase: float) -> Image.Image:
    out = frame.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if a <= 8:
                continue
            blue_ring = b > 120 and b > r * 1.12 and b > g * 1.06
            if not blue_ring:
                continue
            wave = 0.5 + 0.5 * math.sin((x * 0.44) + (y * 0.31) + phase)
            factor = 1.08 + 0.22 * wave
            pixels[x, y] = (
                min(255, round(r * 0.92)),
                min(255, round(g * (1.02 + 0.08 * wave))),
                min(255, round(b * factor)),
                a,
            )
    return out


def blue_ring_octopus_frames(source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    """Derive a readable swim/crawl cycle without changing the source identity."""
    if source.width > source.height * 2.4:
        return split_source_strip(source, size, count)

    internal_scale = 3
    internal_size = (size[0] * internal_scale, size[1] * internal_scale)
    base = fit_to_canvas(source, size, pad=3)
    base_internal = fit_to_canvas(source, internal_size, pad=3 * internal_scale)
    phases = [0.0, math.pi / 2, math.pi, math.pi * 3 / 2]
    cx = (internal_size[0] - 1) / 2
    cy = (internal_size[1] - 1) / 2
    max_radius = math.hypot(cx, cy)
    frames: list[Image.Image] = []
    for index, phase in enumerate(phases[:count]):
        breath = math.sin(phase)
        # Mantle breathing is deliberately modest; the tentacle wave does the
        # visible motion so the anchor stays steady in normal gameplay.
        scale_x = 1.0 + 0.020 * breath
        scale_y = 1.0 - 0.030 * breath
        frame = Image.new("RGBA", internal_size, (0, 0, 0, 0))
        pixels = frame.load()
        for y in range(internal_size[1]):
            for x in range(internal_size[0]):
                dx = x - cx
                dy = y - cy
                radius = math.hypot(dx, dy) / max_radius
                theta = math.atan2(dy, dx)
                lower_bias = smoothstep(cy - 8 * internal_scale, cy + 18 * internal_scale, y)
                outer_bias = smoothstep(0.22, 0.82, radius)
                limb = max(0.0, min(1.0, lower_bias * outer_bias))
                side = -1.0 if x < cx else 1.0
                sweep = math.sin(phase + side * 0.85 + (y / internal_scale) * 0.18)
                curl = math.sin(phase + theta * 3.0)
                sx = cx + (dx / scale_x) - (8.1 * limb * sweep) - (3.0 * limb * curl * side)
                sy = cy + (dy / scale_y) - (5.7 * limb * math.cos(phase + (x / internal_scale) * 0.20))
                pixels[x, y] = sample_bilinear(base_internal, sx, sy)
        frame = frame.resize(size, Image.Resampling.LANCZOS)
        frame = shimmer_blue_rings(center_alpha_like(frame, base), phase + index * 0.7)
        frames.append(frame)
    while len(frames) < count:
        frames.append(frames[-1].copy())
    return frames


def make_frames(asset_key: str, source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    if asset_key == "fauna-shallow-blue-ring-octopus":
        return blue_ring_octopus_frames(source, size, count)
    frame = fit_to_canvas(source, size, pad=3)
    return [frame.copy() for _ in range(count)]


def pack_frames(asset_key: str, source_path: Path, frame_size: tuple[int, int], count: int, fps: int, source_kind: str) -> list[str]:
    source = Image.open(source_path).convert("RGBA")
    frames = make_frames(asset_key, source, frame_size, count)
    sheet = Image.new("RGBA", (frame_size[0] * count, frame_size[1]), (0, 0, 0, 0))
    runtime_outputs: list[str] = []
    for index, frame in enumerate(frames):
        frame_path = GENERATED / f"{asset_key}-{index}.png"
        frame.save(frame_path)
        runtime_outputs.append(rel(frame_path))
        sheet.alpha_composite(frame, (index * frame_size[0], 0))
    sheet_path = GENERATED / f"{asset_key}.png"
    sheet.save(sheet_path)
    runtime_outputs.append(rel(sheet_path))
    manifest = {
        "schema": "asset-forge/sprite-frames@1",
        "name": asset_key,
        "image": f"{asset_key}.png",
        "frameWidth": frame_size[0],
        "frameHeight": frame_size[1],
        "columns": count,
        "rows": 1,
        "frameCount": count,
        "anchor": {"x": 0.5, "y": 0.5},
        "directions": [],
        "animations": {
            "swim": {
                "frames": [0, 1, 2, 3, 4, 5, 4, 3, 2, 1] if asset_key == "fauna-shallow-blue-ring-octopus" and count == 6 else list(range(count)),
                "frameRate": fps,
                "loop": True,
            }
        },
        "source": {
            "kind": source_kind,
            "path": rel(source_path),
        },
    }
    frame_manifest_path = GENERATED / f"{asset_key}.frames.json"
    frame_manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    runtime_outputs.append(rel(frame_manifest_path))
    return runtime_outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", action="append", dest="only_assets", help="Regenerate only this asset key; may be passed more than once.")
    args = parser.parse_args()
    only_assets = set(args.only_assets or [])

    specs = [
        {
            "asset": "fauna-shallow-blue-ring-octopus",
            "species": "Blue-ring Octopus",
            "sourceType": "generated_bitmap",
            "source": "public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source-chroma.png",
            "sourceKind": "generated-bitmap-slice-3",
            "frame": (76, 48),
            "count": 6,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-octopus",
            "species": "Tidepool Octopus",
            "sourceType": "generated_bitmap",
            "source": "public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-octopus-source-chroma.png",
            "sourceKind": "generated-bitmap-slice-3",
            "frame": (64, 50),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-comb-jelly",
            "species": "Comb Jelly",
            "sourceType": "generated_bitmap",
            "source": "public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-comb-jelly-source-chroma.png",
            "sourceKind": "generated-bitmap-slice-3",
            "frame": (60, 44),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-glass-ray",
            "species": "Glass Ray",
            "sourceType": "tracked_bitmap_source",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-lumen-kite-ray.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-lumen-kite-ray-source-chroma.png",
            "lineage": "tracked Lumen Kite Ray exploration source art; same ray silhouette family as Glass Ray",
            "sourceKind": "derived-from-existing-bitmap-slice-3",
            "frame": (70, 42),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-mantis-shrimp",
            "species": "Mantis Shrimp",
            "sourceType": "tracked_bitmap_source",
            "source": "public/assets/generated/fauna-abyssal-lantern-mantis-whole-source.png",
            "sourceFrom": "public/assets/generated/fauna-abyssal-lantern-mantis-whole-source.png",
            "lineage": "tracked Abyssal Lantern Mantis whole-source art; mantis shrimp crustacean silhouette",
            "sourceKind": "derived-from-existing-bitmap-slice-3",
            "frame": (66, 38),
            "count": 5,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-snap-shrimp",
            "species": "Snapping Shrimp",
            "sourceType": "tracked_bitmap_source",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-opal-fan-shrimp.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-opal-fan-shrimp-source-chroma.png",
            "lineage": "tracked Opal Fan Shrimp exploration source art; small shrimp silhouette",
            "sourceKind": "derived-from-existing-bitmap-slice-3",
            "frame": (48, 30),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-sea-spider",
            "species": "Sea Spider",
            "sourceType": "tracked_bitmap_source",
            "source": "public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png",
            "sourceFrom": "public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png",
            "lineage": "tracked Trench Harvest Sea Spider whole-source art; exact sea spider silhouette",
            "sourceKind": "derived-from-existing-bitmap-slice-3",
            "frame": (68, 48),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-tripodfish",
            "species": "Tripodfish",
            "sourceType": "tracked_bitmap_source",
            "source": "public/assets/generated/fauna-tripod-stilt-stalker-whole-source.png",
            "sourceFrom": "public/assets/generated/fauna-tripod-stilt-stalker-whole-source.png",
            "lineage": "tracked Tripod Stilt Stalker whole-source art; exact tripodfish silhouette family",
            "sourceKind": "derived-from-existing-bitmap-slice-3",
            "frame": (72, 56),
            "count": 3,
            "fps": 7,
        },
    ]

    selected_specs = [spec for spec in specs if not only_assets or spec["asset"] in only_assets]
    if only_assets and len(selected_specs) != len(only_assets):
        known = ", ".join(spec["asset"] for spec in specs)
        missing = ", ".join(sorted(only_assets - {spec["asset"] for spec in selected_specs}))
        raise SystemExit(f"unknown --only asset(s): {missing}; known assets: {known}")

    manifest_entries: list[dict] = []
    for spec in specs:
        if spec not in selected_specs:
            continue
        source_image = source_cutout(spec["source"], preserve_canvas=spec["asset"] == "fauna-shallow-blue-ring-octopus")
        source_path = save_source(spec["asset"], source_image)
        runtime_outputs = pack_frames(spec["asset"], source_path, spec["frame"], spec["count"], spec["fps"], spec["sourceKind"])
        entry = {
            "name": spec["asset"],
            "assetKey": spec["asset"],
            "speciesName": spec["species"],
            "kind": spec["sourceType"],
            "sourceType": spec["sourceType"],
            "sourceFile": rel(source_path),
            "sourceInput": spec["source"],
            "runtimeOutputs": runtime_outputs,
            "frameSize": {"width": spec["frame"][0], "height": spec["frame"][1]},
            "frameCount": spec["count"],
        }
        if spec["sourceType"] == "generated_bitmap":
            entry["generationTool"] = "built-in image_gen"
            entry["generationPrompt"] = GENERATED_PROMPTS[spec["asset"]]
            entry["chromaSourceFile"] = spec["source"]
        else:
            entry["sourceFrom"] = spec["sourceFrom"]
            entry["trackedSourceLineage"] = spec["lineage"]
        manifest_entries.append(entry)

    if only_assets and MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text())
        replacements = {entry["assetKey"]: entry for entry in manifest_entries}
        merged_entries: list[dict] = []
        seen: set[str] = set()
        for entry in existing.get("assets", []):
            asset_key = entry.get("assetKey")
            if asset_key in replacements:
                merged_entries.append(replacements[asset_key])
                seen.add(asset_key)
            else:
                merged_entries.append(entry)
        for entry in manifest_entries:
            if entry["assetKey"] not in seen:
                merged_entries.append(entry)
        manifest_entries = merged_entries

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schema": "water9/fauna-flora-source-art-slice-3@1",
                "description": "Source art for unknown-provenance fauna cleanup slice 3. Runtime art is derived from generated or tracked bitmap sources; no procedural line, ellipse, glow, or shape drawing.",
                "assets": manifest_entries,
            },
            indent=2,
        )
        + "\n"
    )
    if only_assets:
        print(f"Wrote {len(selected_specs)} selected source-backed fauna replacement(s)")
    else:
        print(f"Wrote {len(manifest_entries)} source-backed fauna replacements")


if __name__ == "__main__":
    main()
