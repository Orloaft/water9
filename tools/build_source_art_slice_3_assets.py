#!/usr/bin/env python3
"""Build source-backed fauna replacements for cleanup slice 3.

This script does not draw source art. It trims, chroma-keys, resizes, and packs
tracked/generated bitmap cutouts into runtime sprite sheets.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE_DIR = ROOT / "public/assets/source/fauna-flora-source-art-slice-3"
MANIFEST_PATH = ROOT / "public/assets/source/fauna-flora-source-art-slice-3-manifest.json"


GENERATED_PROMPTS = {
    "fauna-shallow-blue-ring-octopus": "Create a painterly underwater game-art blue-ring octopus cutout on a flat solid #ff00ff chroma-key background. Compact rounded mantle, eight curling arms, vivid cobalt-blue rings across warm ochre skin, readable silhouette at small gameplay scale, single organism, no text, no shadow, no extra scene elements.",
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


def remove_magenta_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            magenta_delta = abs(r - 255) + g + abs(b - 255)
            if (r > 170 and b > 150 and g < 105 and max(r, b) - g > 75) or magenta_delta < 80:
                pixels[x, y] = (r, g, b, 0)
    return trim_alpha(rgba, 8)


def source_cutout(path: str) -> Image.Image:
    image = open_rgba(path)
    if image.getchannel("A").getextrema()[0] < 255:
        return trim_alpha(image, 8)
    return remove_magenta_key(image)


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


def make_frames(source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    frame = fit_to_canvas(source, size, pad=3)
    return [frame.copy() for _ in range(count)]


def pack_frames(asset_key: str, source_path: Path, frame_size: tuple[int, int], count: int, fps: int, source_kind: str) -> list[str]:
    source = Image.open(source_path).convert("RGBA")
    frames = make_frames(source, frame_size, count)
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
        "animations": {"swim": {"frames": list(range(count)), "frameRate": fps, "loop": True}},
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
    specs = [
        {
            "asset": "fauna-shallow-blue-ring-octopus",
            "species": "Blue-ring Octopus",
            "sourceType": "generated_bitmap",
            "source": "public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source-chroma.png",
            "sourceKind": "generated-bitmap-slice-3",
            "frame": (58, 48),
            "count": 4,
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

    manifest_entries: list[dict] = []
    for spec in specs:
        source_image = source_cutout(spec["source"])
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
    print(f"Wrote {len(manifest_entries)} source-backed fauna replacements")


if __name__ == "__main__":
    main()
