#!/usr/bin/env python3
"""Build source-backed fauna replacements for cleanup slice 4.

This script does not draw organism art. It trims, chroma-keys, resizes, and
packs existing bitmap source art into runtime sprite sheets.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE_DIR = ROOT / "public/assets/source/fauna-flora-source-art-slice-4"
MANIFEST_PATH = ROOT / "public/assets/source/fauna-flora-source-art-slice-4-manifest.json"


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


def pack_frames(asset_key: str, source_path: Path, frame_size: tuple[int, int], count: int, fps: int) -> list[str]:
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
            "kind": "derived-from-existing-bitmap-slice-4",
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
            "asset": "fauna-abyss-abyss-jelly",
            "species": "Abyssal Jelly",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-prism-bell-jelly.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-prism-bell-jelly-source-chroma.png",
            "lineage": "tracked Prism Bell Jelly exploration source art; jelly bell and tentacle silhouette fits Abyssal Jelly",
            "frame": (48, 52),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-bigfin-squid",
            "species": "Bigfin Squid",
            "source": "public/assets/generated/fauna-velvet-lantern-cuttle-whole-painted.png",
            "sourceFrom": "public/assets/generated/fauna-velvet-lantern-cuttle-whole-painted.png",
            "lineage": "tracked Velvet Lantern Cuttle whole-source art; cephalopod mantle and trailing arms provide a defensible bigfin squid runtime silhouette",
            "frame": (70, 38),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-black-swallower",
            "species": "Black Swallower",
            "source": "public/assets/generated/fauna-abyssal-gulper-v2-whole-painted.png",
            "sourceFrom": "public/assets/generated/fauna-abyssal-gulper-v2-whole-painted.png",
            "lineage": "tracked Abyssal Gulper v2 whole-source art; large dark expandable-maw predator family for Black Swallower",
            "frame": (130, 54),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-frilled-shark",
            "species": "Frilled Shark",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-onyx-frillshark-fry.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-onyx-frillshark-fry-source-chroma.png",
            "lineage": "tracked Onyx Frillshark Fry exploration source art; direct frilled shark source-family match",
            "frame": (62, 32),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-hadal-shrimp",
            "species": "Hadopelagic Shrimp",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-chimney-ghost-shrimp.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-chimney-ghost-shrimp-source-chroma.png",
            "lineage": "tracked Chimney Ghost Shrimp exploration source art; deep-water shrimp silhouette",
            "frame": (74, 44),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-medusa",
            "species": "Abyssal Medusa",
            "source": "public/assets/generated/fauna-chain-vein-siphonophore-whole-source.png",
            "sourceFrom": "public/assets/generated/fauna-chain-vein-siphonophore-whole-source.png",
            "lineage": "tracked Chain Vein Siphonophore whole-source art; colonial gelatinous cnidarian silhouette for abyssal medusa",
            "frame": (44, 46),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-mirror-fry",
            "species": "Mirror Fry",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-mirrorbone-hatchetfish.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-mirrorbone-hatchetfish-source-chroma.png",
            "lineage": "tracked Mirrorbone Hatchetfish exploration source art; reflective small-fish source family for Mirror Fry",
            "frame": (52, 36),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-ash-minnow",
            "species": "Ash Minnow",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-saberfin-smelt.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-saberfin-smelt-source-chroma.png",
            "lineage": "tracked Saberfin Smelt exploration source art; small silvery schooling fish silhouette for Ash Minnow",
            "frame": (84, 36),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-deep-shrimp",
            "species": "Deep Sea Shrimp",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-opal-fan-shrimp.png",
            "sourceFrom": "public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-opal-fan-shrimp-source-chroma.png",
            "lineage": "tracked Opal Fan Shrimp exploration source art; small shrimp silhouette for Deep Sea Shrimp",
            "frame": (49, 33),
            "count": 5,
            "fps": 8,
        },
    ]

    manifest_entries: list[dict] = []
    for spec in specs:
        source_image = source_cutout(spec["source"])
        source_path = save_source(spec["asset"], source_image)
        runtime_outputs = pack_frames(spec["asset"], source_path, spec["frame"], spec["count"], spec["fps"])
        manifest_entries.append(
            {
                "name": spec["asset"],
                "assetKey": spec["asset"],
                "speciesName": spec["species"],
                "kind": "tracked_bitmap_source",
                "sourceType": "tracked_bitmap_source",
                "sourceFile": rel(source_path),
                "sourceInput": spec["source"],
                "sourceFrom": spec["sourceFrom"],
                "trackedSourceLineage": spec["lineage"],
                "runtimeOutputs": runtime_outputs,
                "frameSize": {"width": spec["frame"][0], "height": spec["frame"][1]},
                "frameCount": spec["count"],
            }
        )

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schema": "water9/fauna-flora-source-art-slice-4@1",
                "description": "Source art for unknown-provenance fauna cleanup slice 4. Runtime art is derived from tracked bitmap sources; no procedural line, ellipse, glow, or shape drawing.",
                "assets": manifest_entries,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {rel(MANIFEST_PATH)}")


if __name__ == "__main__":
    main()
