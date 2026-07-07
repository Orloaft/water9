#!/usr/bin/env python3
"""Build source-derived replacements for the first fauna/flora cleanup slice.

This script intentionally does not draw new art. It crops, chroma-keys, trims,
resizes, mirrors, rotates, and packs existing tracked bitmap/source art into the
runtime keys audited by tools/audit_curated_fauna_flora_assets.mjs.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE_DIR = ROOT / "public/assets/source/fauna-flora-source-art-slice-1"
MANIFEST_PATH = ROOT / "public/assets/source/fauna-flora-source-art-slice-1-manifest.json"


def open_rgba(path: str | Path) -> Image.Image:
    return Image.open(ROOT / path).convert("RGBA")


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


def trim_alpha(image: Image.Image, pad: int = 4) -> Image.Image:
    return image.crop(alpha_bbox(image, pad))


def remove_magenta_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            magenta_delta = abs(r - 255) + g + abs(b - 255)
            if (r > 150 and b > 100 and g < 100 and max(r, b) - g > 80) or magenta_delta < 90:
                pixels[x, y] = (r, g, b, 0)
    return trim_alpha(rgba, 4)


def source_sheet_crop(path: str, box: tuple[int, int, int, int]) -> Image.Image:
    return remove_magenta_key(open_rgba(path).crop(box))


def fit_to_canvas(image: Image.Image, size: tuple[int, int], *, pad: int = 2) -> Image.Image:
    trimmed = trim_alpha(image, 2)
    max_w = max(1, size[0] - pad * 2)
    max_h = max(1, size[1] - pad * 2)
    fitted = ImageOps.contain(trimmed, (max_w, max_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return canvas


def crop_alpha_source(path: str, pad: int = 8) -> Image.Image:
    return trim_alpha(open_rgba(path), pad)


def save_source(asset_key: str, image: Image.Image, source_from: str, note: str, manifest: list[dict]) -> Path:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    path = SOURCE_DIR / f"{asset_key}-source.png"
    image.save(path)
    manifest.append(
        {
            "name": asset_key,
            "kind": "source-sheet-slice" if source_from.startswith("assets/") else "derived-from-existing-bitmap",
            "file": f"public/assets/source/fauna-flora-source-art-slice-1/{asset_key}-source.png",
            "sourceFrom": source_from,
            "description": note,
        }
    )
    return path


def save_runtime_png(asset_key: str, image: Image.Image) -> None:
    image.save(GENERATED / f"{asset_key}.png")


def make_swarm_source(base: Image.Image, placements: list[tuple[int, int, int, bool]]) -> Image.Image:
    canvas = Image.new("RGBA", (360, 150), (0, 0, 0, 0))
    for x, y, width, flip in placements:
        fish = ImageOps.contain(base, (width, 96), Image.Resampling.LANCZOS)
        if flip:
            fish = ImageOps.mirror(fish)
        canvas.alpha_composite(fish, (x, y))
    return trim_alpha(canvas, 8)


def make_frames(source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(count):
        phase = index - (count - 1) / 2
        frame_source = source
        if phase:
            frame_source = source.rotate(phase * 2.0, resample=Image.Resampling.BICUBIC, expand=True)
            if index % 2:
                frame_source = ImageEnhance.Brightness(frame_source).enhance(1.06)
        frames.append(fit_to_canvas(frame_source, size, pad=4))
    return frames


def pack_frames(asset_key: str, source: Image.Image, frame_size: tuple[int, int], count: int, fps: int, source_path: Path) -> None:
    frames = make_frames(source, frame_size, count)
    sheet = Image.new("RGBA", (frame_size[0] * count, frame_size[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        frame.save(GENERATED / f"{asset_key}-{index}.png")
        sheet.alpha_composite(frame, (index * frame_size[0], 0))
    sheet.save(GENERATED / f"{asset_key}.png")
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
            "kind": "derived-from-existing-bitmap-slice-1",
            "path": str(source_path.relative_to(ROOT)),
        },
    }
    (GENERATED / f"{asset_key}.frames.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    manifest_entries: list[dict] = []

    flora_sources = {
        "flora-oxygen-kelp": (
            source_sheet_crop("assets/oxygengivingassets.png", (34, 146, 96, 255)),
            "assets/oxygengivingassets.png",
            "oxygen kelp/seaweed source-sheet crop below the O2 label band",
            (100, 151),
        ),
        "flora-oxygen-bulb": (
            crop_alpha_source("public/assets/generated/env-flora-oxygen-bloom.png", 4),
            "public/assets/generated/env-flora-oxygen-bloom.png",
            "oxygen bloom source cutout with translucent bulb/sac cluster",
            (105, 166),
        ),
        "biolume-rock-0": (
            source_sheet_crop("assets/biolumineassets.png", (786, 80, 882, 150)),
            "assets/biolumineassets.png",
            "small dark basalt bioluminescent rock source-sheet crop",
            (76, 56),
        ),
        "biolume-rock-1": (
            source_sheet_crop("assets/biolumineassets.png", (1080, 86, 1225, 178)),
            "assets/biolumineassets.png",
            "larger cyan-glowing basalt boulder source-sheet crop",
            (118, 78),
        ),
        "biolume-crystal": (
            source_sheet_crop("assets/biolumineassets.png", (1372, 836, 1515, 954)),
            "assets/biolumineassets.png",
            "cyan crystal cluster source-sheet crop",
            (135, 126),
        ),
    }

    for asset_key, (source, source_from, note, runtime_size) in flora_sources.items():
        source_path = save_source(asset_key, source, source_from, note, manifest_entries)
        save_runtime_png(asset_key, fit_to_canvas(Image.open(source_path).convert("RGBA"), runtime_size, pad=2))

    hatchet = crop_alpha_source("public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blackwater-hatchet.png", 10)
    lantern = crop_alpha_source("public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-cyan-pulse-lanternfish.png", 10)
    micro = crop_alpha_source("public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blue-lantern-goby.png", 10)
    snipe = crop_alpha_source("public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-knifecrest-snipe-eel.png", 10)
    viper = crop_alpha_source("public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png", 10)

    fauna_specs = {
        "fauna-abyss-hatchet-school": (
            make_swarm_source(hatchet, [(0, 20, 95, False), (80, 0, 86, False), (148, 28, 92, False), (226, 10, 82, False), (52, 72, 72, True), (188, 78, 76, True)]),
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blackwater-hatchet.png",
            "school composed from tracked Blackwater Hatchet source fish",
            (150, 76),
            2,
            7,
        ),
        "fauna-abyss-lantern-swarm": (
            make_swarm_source(lantern, [(6, 12, 78, False), (70, 50, 65, True), (128, 18, 82, False), (204, 60, 70, False), (268, 26, 76, True)]),
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-cyan-pulse-lanternfish.png",
            "loose swarm composed from tracked Cyan Pulse Lanternfish source",
            (158, 76),
            2,
            7,
        ),
        "fauna-abyss-microfish": (
            make_swarm_source(micro, [(8, 12, 58, False), (62, 58, 52, True), (110, 24, 50, False), (156, 70, 46, True), (202, 38, 55, False), (258, 18, 48, False)]),
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blue-lantern-goby.png",
            "compact microfish group composed from tracked Blue Lantern Goby source",
            (166, 72),
            3,
            9,
        ),
        "fauna-abyss-static-fry": (
            make_swarm_source(micro, [(4, 38, 58, False), (58, 26, 48, False), (102, 54, 52, True), (152, 30, 44, False), (194, 66, 48, True)]),
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-blue-lantern-goby.png",
            "electric fry group composed from tracked Blue Lantern Goby source",
            (82, 54),
            4,
            10,
        ),
        "fauna-abyss-snipe-eel": (
            snipe,
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-knifecrest-snipe-eel.png",
            "single long snipe-eel silhouette from tracked Knifecrest Snipe Eel source",
            (88, 52),
            3,
            8,
        ),
        "fauna-abyss-viperfish": (
            viper,
            "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png",
            "single abyssal viperfish from tracked bespoke source",
            (190, 86),
            3,
            8,
        ),
    }

    for asset_key, (source, source_from, note, frame_size, frame_count, fps) in fauna_specs.items():
        source_path = save_source(asset_key, source, source_from, note, manifest_entries)
        pack_frames(asset_key, Image.open(source_path).convert("RGBA"), frame_size, frame_count, fps, source_path)

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schema": "water9/fauna-flora-source-art-slice-1@1",
                "description": "Source slices/composites for procedural-quality cleanup slice 1. Runtime art is derived from tracked bitmap sources; no PIL/ImageDraw source construction.",
                "assets": manifest_entries,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"Wrote {len(manifest_entries)} source-derived replacements")


if __name__ == "__main__":
    main()
