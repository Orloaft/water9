#!/usr/bin/env python3
"""Pack existing loose per-frame PNGs into Asset Forge sprite sheets.

This is a stand-in for exporting from Asset Forge's Sprite Studio: it takes the
game's current `<base>-<i>.png` frame files, packs them into one uniform,
anchor-aligned sheet `<base>.png`, and writes a portable `<base>.frames.json`
manifest conforming to the `asset-forge/sprite-frames@1` schema. The output is
byte-for-format-identical to what Sprite Studio emits, so the game's loader code
is exactly what you'd use with a real export.

Usage:
    python3 tools/pack_sprites.py fish-shallow-neutral fish-shallow-predator ...
    python3 tools/pack_sprites.py --anim swim --fps 8 <base> [<base> ...]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

GENERATED = Path("public/assets/generated")


def discover_frames(base: str) -> list[Path]:
    frames: list[Path] = []
    i = 0
    while True:
        p = GENERATED / f"{base}-{i}.png"
        if not p.exists():
            break
        frames.append(p)
        i += 1
    return frames


def pack(base: str, anim: str, fps: int) -> None:
    frame_paths = discover_frames(base)
    if not frame_paths:
        raise SystemExit(f"no frames found for '{base}' (expected {base}-0.png ...)")

    images = [Image.open(p).convert("RGBA") for p in frame_paths]
    cell_w = max(im.width for im in images)
    cell_h = max(im.height for im in images)
    count = len(images)

    # Single row, uniform cells, each frame centred (anchor 0.5,0.5).
    sheet = Image.new("RGBA", (cell_w * count, cell_h), (0, 0, 0, 0))
    for idx, im in enumerate(images):
        ox = idx * cell_w + (cell_w - im.width) // 2
        oy = (cell_h - im.height) // 2
        sheet.paste(im, (ox, oy), im)

    sheet_path = GENERATED / f"{base}.png"
    sheet.save(sheet_path)

    manifest = {
        "schema": "asset-forge/sprite-frames@1",
        "name": base,
        "image": f"{base}.png",
        "frameWidth": cell_w,
        "frameHeight": cell_h,
        "columns": count,
        "rows": 1,
        "frameCount": count,
        "anchor": {"x": 0.5, "y": 0.5},
        "directions": [],
        "animations": {
            anim: {"frames": list(range(count)), "frameRate": fps, "loop": True}
        },
    }
    manifest_path = GENERATED / f"{base}.frames.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{base}: {count} frames -> {cell_w}x{cell_h} sheet + manifest")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("bases", nargs="+")
    ap.add_argument("--anim", default="swim")
    ap.add_argument("--fps", type=int, default=8)
    args = ap.parse_args()
    for base in args.bases:
        pack(base, args.anim, args.fps)


if __name__ == "__main__":
    main()
