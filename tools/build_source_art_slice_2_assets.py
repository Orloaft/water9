#!/usr/bin/env python3
"""Build source-derived fauna replacements for cleanup slice 2.

This script does not draw new source art. It trims, chroma-keys, resizes, and
packs existing tracked bitmap art into runtime sprite sheets.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE_DIR = ROOT / "public/assets/source/fauna-flora-source-art-slice-2"
MANIFEST_PATH = ROOT / "public/assets/source/fauna-flora-source-art-slice-2-manifest.json"


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


def trim_alpha(image: Image.Image, pad: int = 6) -> Image.Image:
    return image.crop(alpha_bbox(image, pad))


def remove_magenta_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            magenta_delta = abs(r - 255) + g + abs(b - 255)
            if (r > 150 and b > 100 and g < 120 and max(r, b) - g > 70) or magenta_delta < 100:
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


def save_source(asset_key: str, image: Image.Image, source_from: str, note: str, manifest: list[dict]) -> Path:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    path = SOURCE_DIR / f"{asset_key}-source.png"
    image.save(path)
    manifest.append(
        {
            "name": asset_key,
            "kind": "derived-from-existing-bitmap",
            "file": f"public/assets/source/fauna-flora-source-art-slice-2/{asset_key}-source.png",
            "sourceFrom": source_from,
            "description": note,
        }
    )
    return path


def make_frames(source: Image.Image, size: tuple[int, int], count: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(count):
        phase = index - (count - 1) / 2
        frame_source = source
        if phase:
            frame_source = source.rotate(phase * 2.0, resample=Image.Resampling.BICUBIC, expand=True)
        if index % 2:
            frame_source = ImageEnhance.Brightness(frame_source).enhance(1.04)
        frames.append(fit_to_canvas(frame_source, size, pad=3))
    return frames


def pack_frames(asset_key: str, source_path: Path, frame_size: tuple[int, int], count: int, fps: int) -> None:
    source = Image.open(source_path).convert("RGBA")
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
            "kind": "derived-from-existing-bitmap-slice-2",
            "path": str(source_path.relative_to(ROOT)),
        },
    }
    (GENERATED / f"{asset_key}.frames.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    specs = [
        {
            "asset": "fauna-deep-gulper-eel",
            "source": "public/assets/generated/fauna-abyssal-gulper-v2-chroma.png",
            "note": "gulper eel replacement from tracked abyssal gulper chroma source",
            "frame": (86, 50),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-lantern-fry",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-halo-dot-lanternfish.png",
            "note": "lantern fry replacement from tracked Halo Dot Lanternfish alpha source",
            "frame": (42, 33),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-squid",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-kelp-arrow-squid.png",
            "note": "reef squid replacement from tracked Kelp Arrow Squid alpha source",
            "frame": (72, 38),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-nautilus",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-glass-helm-nautilus.png",
            "note": "nautilus replacement from tracked Glass Helm Nautilus alpha source",
            "frame": (63, 53),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-shallow-jellyfish",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-prism-bell-jelly.png",
            "note": "moon jelly replacement from tracked Prism Bell Jelly alpha source",
            "frame": (78, 50),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-hatchetfish",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-rustscale-hatchetfish.png",
            "note": "hatchetfish replacement from tracked Rustscale Hatchetfish alpha source",
            "frame": (52, 37),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-barreleye",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-lumen-brow-barreleye.png",
            "note": "barreleye replacement from tracked Lumen Brow Barreleye alpha source",
            "frame": (50, 40),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-glass-squid",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-velvet-glass-cuttle.png",
            "note": "glass squid replacement from tracked Velvet Glass Cuttle alpha source",
            "frame": (61, 44),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-lanternfish",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-cyan-pulse-lanternfish.png",
            "note": "lanternfish replacement from tracked Cyan Pulse Lanternfish alpha source",
            "frame": (56, 43),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-deep-vampire-squid",
            "source": "public/assets/generated/fauna-vampire-cloak-squid-whole-source.png",
            "note": "deep vampire squid replacement from tracked Vampire Cloak Squid whole-source art",
            "frame": (54, 47),
            "count": 4,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-anglerfish",
            "source": "public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-ancient-mask-angler.png",
            "note": "anglerfish replacement from tracked Ancient Mask Angler alpha source",
            "frame": (62, 48),
            "count": 3,
            "fps": 8,
        },
        {
            "asset": "fauna-abyss-vampire-squid",
            "source": "public/assets/generated/fauna-vampire-cloak-squid-whole-source.png",
            "note": "abyss vampire squid replacement from tracked Vampire Cloak Squid whole-source art",
            "frame": (50, 52),
            "count": 4,
            "fps": 8,
        },
    ]

    manifest_entries: list[dict] = []
    for spec in specs:
        source_image = source_cutout(spec["source"])
        source_path = save_source(spec["asset"], source_image, spec["source"], spec["note"], manifest_entries)
        pack_frames(spec["asset"], source_path, spec["frame"], spec["count"], spec["fps"])

    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "schema": "water9/fauna-flora-source-art-slice-2@1",
                "description": "Source cutouts for unknown-provenance fauna cleanup slice 2. Runtime art is derived from tracked bitmap sources; no procedural line, ellipse, glow, or shape drawing.",
                "assets": manifest_entries,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"Wrote {len(manifest_entries)} source-derived fauna replacements")


if __name__ == "__main__":
    main()
