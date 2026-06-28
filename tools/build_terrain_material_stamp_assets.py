#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "source-inbox" / "terrain-material-stamp-source.png"
GENERATED = ROOT / "public" / "assets" / "generated"
MANIFEST = ROOT / "public" / "assets" / "source" / "terrain-material-stamp-source-manifest.json"
KEY = (255, 0, 255)

ASSETS = [
    ("terrain-stamp-ore-copper", "ore", "copper mineral vein stamp"),
    ("terrain-stamp-ore-quartz", "ore", "quartz mineral vein stamp"),
    ("terrain-stamp-ore-cobalt", "ore", "cobalt mineral vein stamp"),
    ("terrain-stamp-ore-ruby", "ore", "ruby mineral vein stamp"),
    ("terrain-stamp-seam-gold", "ore", "gold mineral seam stamp"),
    ("terrain-stamp-seam-green", "ore", "green alien mineral seam stamp"),
    ("terrain-stamp-fossil-shell", "ore", "pale fossil shell inclusion stamp"),
    ("terrain-stamp-nodule-blue", "ore", "blue mineral nodule seam stamp"),
    ("terrain-stamp-fringe-teal", "fringe", "teal moss edge mat stamp"),
    ("terrain-stamp-fringe-brine", "fringe", "dark brine lichen edge mat stamp"),
    ("terrain-stamp-fringe-purple", "fringe", "purple fan fringe edge mat stamp"),
    ("terrain-stamp-fringe-cyan", "fringe", "cyan luminous fern edge mat stamp"),
    ("terrain-stamp-plant-glass", "plant", "glass kelp sprout stamp"),
    ("terrain-stamp-plant-brine", "plant", "brine grass sprout stamp"),
    ("terrain-stamp-plant-lumen", "plant", "lumen stalk sprout stamp"),
    ("terrain-stamp-plant-purple", "plant", "purple tendril sprout stamp"),
]


def chroma_to_alpha(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            dist = abs(r - KEY[0]) + abs(g - KEY[1]) + abs(b - KEY[2])
            if dist < 128:
                pixels[x, y] = (0, 0, 0, 0)
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    left, top, right, bottom = bbox
    pad = 8
    return img.crop((
        max(0, left - pad),
        max(0, top - pad),
        min(img.width, right + pad),
        min(img.height, bottom + pad),
    ))


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source sheet: {SOURCE.relative_to(ROOT)}")
    GENERATED.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE).convert("RGBA")
    cols = 4
    rows = 4
    manifest = {
        "schema": "water9/terrain-material-stamp-source-sheet@1",
        "source": str(SOURCE.relative_to(ROOT)),
        "backgroundKey": "#ff00ff",
        "columns": cols,
        "rows": rows,
        "assets": [],
    }
    for index, (name, kind, description) in enumerate(ASSETS):
        col = index % cols
        row = index // cols
        left = round(col * sheet.width / cols)
        top = round(row * sheet.height / rows)
        right = round((col + 1) * sheet.width / cols)
        bottom = round((row + 1) * sheet.height / rows)
        crop = sheet.crop((left, top, right, bottom))
        sprite = trim_alpha(chroma_to_alpha(crop)).filter(ImageFilter.UnsharpMask(radius=0.8, percent=110, threshold=2))
        sprite.save(GENERATED / f"{name}.png")
        manifest["assets"].append({
            "name": name,
            "kind": kind,
            "description": description,
            "cell": {"column": col, "row": row},
            "file": f"public/assets/generated/{name}.png",
            "size": {"width": sprite.width, "height": sprite.height},
        })
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf8")


if __name__ == "__main__":
    main()
