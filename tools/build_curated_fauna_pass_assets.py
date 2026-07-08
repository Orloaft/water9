#!/usr/bin/env python3
"""Build curated bitmap runtime sheets for the fauna/flora replacement pass."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
RUN_DIR = ROOT / "runs/water9-curated-fauna-flora-assets-2026-07-06"


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("source image has no visible alpha")
    return bbox


def contain(image: Image.Image, size: tuple[int, int], margin: int) -> Image.Image:
    crop = image.crop(alpha_bbox(image))
    max_w = max(1, size[0] - margin * 2)
    max_h = max(1, size[1] - margin * 2)
    scale = min(max_w / crop.width, max_h / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    frame.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return frame


def shifted_alpha(frame: Image.Image, dx: int = 0, dy: int = 0, sx: float = 1.0, sy: float = 1.0) -> Image.Image:
    bbox = alpha_bbox(frame)
    crop = frame.crop(bbox)
    resized = crop.resize((max(1, round(crop.width * sx)), max(1, round(crop.height * sy))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    x = (frame.width - resized.width) // 2 + dx
    y = (frame.height - resized.height) // 2 + dy
    out.alpha_composite(resized, (x, y))
    return out


def pack(base: str, frames: list[Image.Image], fps: int, source: dict[str, str]) -> None:
    width = max(frame.width for frame in frames)
    height = max(frame.height for frame in frames)
    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        cell = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        cell.alpha_composite(frame, ((width - frame.width) // 2, (height - frame.height) // 2))
        sheet.alpha_composite(cell, (index * width, 0))
        frame.save(GENERATED / f"{base}-{index}.png")
    sheet.save(GENERATED / f"{base}.png")
    manifest = {
        "schema": "asset-forge/sprite-frames@1",
        "name": base,
        "image": f"{base}.png",
        "frameWidth": width,
        "frameHeight": height,
        "columns": len(frames),
        "rows": 1,
        "frameCount": len(frames),
        "anchor": {"x": 0.5, "y": 0.5},
        "directions": [],
        "animations": {"swim": {"frames": list(range(len(frames))), "frameRate": fps, "loop": True}},
        "source": source,
    }
    (GENERATED / f"{base}.frames.json").write_text(json.dumps(manifest, indent=2) + "\n")


def build_goblin_shark() -> None:
    source = RUN_DIR.parent / "water9-asset-behavior-recovery-2026-07-06/generated-source/fauna-abyss-goblin-shark-source-alpha.png"
    image = Image.open(source).convert("RGBA")
    base = contain(image, (120, 64), 4)
    frames = [
        shifted_alpha(base, dx=-1, sy=1.00),
        shifted_alpha(base, dx=0, dy=1, sx=0.985, sy=1.025),
        shifted_alpha(base, dx=1, sy=0.985),
    ]
    pack(
        "fauna-abyss-goblin-shark",
        frames,
        8,
        {
            "kind": "derived-from-existing-generated-bitmap-alpha",
            "runSource": "runs/water9-asset-behavior-recovery-2026-07-06/generated-source/fauna-abyss-goblin-shark-source-alpha.png",
            "buildTool": "tools/build_curated_fauna_pass_assets.py",
            "notes": "Rebuilt at higher runtime source fidelity from the accepted painted goblin shark cutout.",
        },
    )


def build_mantle_crawler() -> None:
    source = GENERATED / "fauna-velvet-lantern-cuttle-whole-painted.png"
    image = Image.open(source).convert("RGBA")
    base = contain(image, (112, 76), 5)
    frames = [
        shifted_alpha(base, dx=-1, sy=1.00),
        shifted_alpha(base, dx=0, dy=-1, sx=1.015, sy=0.99),
        shifted_alpha(base, dx=1, dy=1, sx=0.985, sy=1.02),
        shifted_alpha(base, dx=0, sy=1.00),
    ]
    pack(
        "fauna-abyss-mantle-crawler",
        frames,
        7,
        {
            "kind": "derived-from-existing-curated-bitmap-alpha",
            "runSource": "public/assets/generated/fauna-velvet-lantern-cuttle-whole-painted.png",
            "buildTool": "tools/build_curated_fauna_pass_assets.py",
            "notes": "Species-specific runtime sheet replacing special-room fish-abyss-predator fallback.",
        },
    )


def write_contact_sheet() -> None:
    keys = [
        "fish-abyss-predator",
        "fauna-abyss-goblin-shark",
        "fauna-abyss-viperfish",
        "fauna-abyss-frilled-shark",
        "fauna-abyss-mantle-crawler",
        "terrain-edge-flora-glass-kelp",
        "terrain-edge-flora-moon-sponge",
        "terrain-edge-flora-sting-anemone",
        "terrain-edge-flora-vent-coral",
        "terrain-edge-flora-ember-bloom",
    ]
    thumbs: list[tuple[str, Image.Image]] = []
    for key in keys:
        image = Image.open(GENERATED / f"{key}.png").convert("RGBA")
        if key.endswith("goblin-shark") or key.endswith("mantle-crawler") or key.startswith("fish-") or key.startswith("fauna-"):
            manifest = json.loads((GENERATED / f"{key}.frames.json").read_text())
            image = image.crop((0, 0, manifest["frameWidth"], manifest["frameHeight"]))
        image = contain(image, (160, 96), 8)
        thumbs.append((key, image))
    sheet = Image.new("RGBA", (160 * 5, 96 * 2), (6, 14, 20, 255))
    for index, (_, thumb) in enumerate(thumbs):
        sheet.alpha_composite(thumb, ((index % 5) * 160, (index // 5) * 96))
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(RUN_DIR / "curated-asset-contact-sheet.png")
    gray = ImageChops.multiply(sheet.convert("LA").convert("RGBA"), Image.new("RGBA", sheet.size, (255, 255, 255, 255)))
    gray.save(RUN_DIR / "curated-asset-contact-sheet-grayscale.png")


def main() -> None:
    build_goblin_shark()
    build_mantle_crawler()
    write_contact_sheet()


if __name__ == "__main__":
    main()
