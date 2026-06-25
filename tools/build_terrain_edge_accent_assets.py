#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "assets" / "generated"
SOURCE_DIR = ROOT / "public" / "assets" / "source"
INBOX_SOURCE = ROOT / "tools" / "source-inbox" / "terrain-edge-accent-source.png"
FALLBACK_SOURCE = SOURCE_DIR / "terrain-edge-accent-source-fallback.png"
CURRENT_SOURCE = SOURCE_DIR / "terrain-edge-accent-source-current.png"
MANIFEST = SOURCE_DIR / "terrain-edge-accent-source-manifest.json"
HANDOFF = ROOT / "tools" / "source-inbox" / "TERRAIN_EDGE_ACCENT_HANDOFF.md"
KEY = (255, 0, 255)

ASSETS = [
    ("terrain-edge-ore-copper", "ore", "small copper chips embedded in cave rock"),
    ("terrain-edge-ore-quartz", "ore", "small quartz crystals embedded in cave rock"),
    ("terrain-edge-ore-cobalt", "ore", "small cobalt chips embedded in cave rock"),
    ("terrain-edge-ore-ruby", "ore", "small ruby chips embedded in cave rock"),
    ("terrain-edge-seam-gold", "ore", "thin warm mineral seam in cave rock"),
    ("terrain-edge-nodule-green", "ore", "small green luminous nodules in cave rock"),
    ("terrain-edge-fossil-shell", "ore", "fossil shell inclusion in cave rock"),
    ("terrain-edge-nodule-blue", "ore", "small blue luminous nodules in cave rock"),
    ("terrain-edge-flora-glass-kelp", "flora", "small glass kelp rooted in a rocky edge"),
    ("terrain-edge-flora-brine-grass", "flora", "thin brine grass rooted in a rocky edge"),
    ("terrain-edge-flora-black-fan", "flora", "small fan coral rooted in a rocky edge"),
    ("terrain-edge-flora-lumen-fern", "flora", "small lumen fern rooted in a rocky edge"),
    ("terrain-edge-flora-abyss-sacs", "flora", "dark abyssal sac growth rooted in rock"),
    ("terrain-edge-flora-lumen-stalks", "flora", "small glowing stalks rooted in rock"),
    ("terrain-edge-flora-crown-polyps", "flora", "small crown polyp cluster rooted in rock"),
    ("terrain-edge-flora-oracle-tendrils", "flora", "small purple oracle tendrils rooted in rock"),
]


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def make_fallback_source() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    cell = 256
    cols = 4
    rows = 4
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (*KEY, 255))
    for index, (name, kind, _description) in enumerate(ASSETS):
        asset = fallback_asset(name, kind, index, cell)
        x = (index % cols) * cell
        y = (index // cols) * cell
        sheet.alpha_composite(asset, (x, y))
    sheet.convert("RGB").save(FALLBACK_SOURCE)


def fallback_asset(name: str, kind: str, index: int, cell: int) -> Image.Image:
    rng = random.Random(9000 + index)
    img = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    mask = Image.new("L", (cell, cell), 0)
    md = ImageDraw.Draw(mask)
    points = []
    cx = cell * 0.5
    cy = cell * 0.58
    rx = cell * rng.uniform(0.25, 0.34)
    ry = cell * rng.uniform(0.12, 0.18)
    for i in range(18):
        a = i / 18 * math.tau
        points.append((cx + math.cos(a) * rx * rng.uniform(0.72, 1.18), cy + math.sin(a) * ry * rng.uniform(0.65, 1.24)))
    md.polygon(points, fill=255)
    draw = ImageDraw.Draw(img)
    draw.bitmap((0, 0), mask, fill=rgba("#14232b", 245))
    for _ in range(80):
        x = rng.randrange(24, cell - 24)
        y = rng.randrange(52, cell - 52)
        if mask.getpixel((x, y)) < 10:
            continue
        r = rng.randrange(1, 4)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba(rng.choice(["#22343d", "#52666b", "#0b151b"]), rng.randrange(30, 70)))
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.7))
    img.alpha_composite(Image.composite(Image.new("RGBA", img.size, rgba("#8aa3a6", 80)), Image.new("RGBA", img.size, (0, 0, 0, 0)), edge))
    if kind == "ore":
        ore_colors = {
            "copper": ["#b86a3e", "#e3a063"],
            "quartz": ["#dcfffb", "#9edfe5"],
            "cobalt": ["#4978e8", "#8cb4ff"],
            "ruby": ["#d63d5b", "#ff8ca2"],
            "gold": ["#dca958", "#ffe19a"],
            "green": ["#7fdc8a", "#d3ffba"],
            "blue": ["#7fd9ee", "#d7ffff"],
        }
        colors = ore_colors[next((key for key in ore_colors if key in name), "green")]
        for _ in range(9):
            x = rng.uniform(cell * 0.34, cell * 0.68)
            y = rng.uniform(cell * 0.43, cell * 0.62)
            r = rng.uniform(5, 12)
            draw.polygon(
                [(x + math.cos(i / 6 * math.tau) * r * rng.uniform(0.7, 1.2), y + math.sin(i / 6 * math.tau) * r * rng.uniform(0.6, 1.15)) for i in range(6)],
                fill=rgba(colors[_ % len(colors)], 220),
            )
    else:
        colors = ["#88d7d5", "#733b92", "#86e3b6", "#263c42"]
        base = (cell * 0.5, cell * 0.57)
        for i in range(12):
            a = -math.pi / 2 + (i - 6) * 0.08
            length = rng.uniform(cell * 0.18, cell * 0.36)
            x2 = base[0] + math.cos(a) * length * rng.uniform(0.55, 1.1)
            y2 = base[1] + math.sin(a) * length
            draw.line((base[0], base[1], x2, y2), fill=rgba(colors[i % len(colors)], 210), width=3)
    return img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=125, threshold=3))


def chroma_to_alpha(crop: Image.Image) -> Image.Image:
    crop = crop.convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = pixels[x, y]
            dist = abs(r - KEY[0]) + abs(g - KEY[1]) + abs(b - KEY[2])
            if dist < 132:
                pixels[x, y] = (0, 0, 0, 0)
    return despill_magenta_edges(crop)


def despill_magenta_edges(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            near_alpha = False
            for yy in range(max(0, y - 2), min(img.height, y + 3)):
                for xx in range(max(0, x - 2), min(img.width, x + 3)):
                    if alpha.getpixel((xx, yy)) == 0:
                        near_alpha = True
                        break
                if near_alpha:
                    break
            magenta_spill = r > 80 and b > 80 and g < max(r, b) * 0.58 and abs(r - b) < 125
            if near_alpha and magenta_spill:
                neutral = max(g, min(104, (r + b) // 6))
                pixels[x, y] = (min(r, neutral + 14), neutral, min(b, neutral + 24), a)
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    left, top, right, bottom = bbox
    pad = 6
    return img.crop((max(0, left - pad), max(0, top - pad), min(img.width, right + pad), min(img.height, bottom + pad)))


def write_handoff() -> None:
    HANDOFF.parent.mkdir(parents=True, exist_ok=True)
    HANDOFF.write_text(
        """# Terrain Edge Accent Imagegen Handoff

Target inbox file:

`tools/source-inbox/terrain-edge-accent-source.png`

Generate or paste a 4-column by 4-row source sheet on a perfectly flat `#ff00ff`
background. Each cell should contain one isolated cutout-ready terrain edge
accent in the order listed by `public/assets/source/terrain-edge-accent-source-manifest.json`.

Prompt:

Use case: stylized-concept
Asset type: 2D underwater destructible terrain edge accent source sheet for Water9
Primary request: Create an original source sheet of small dark underwater cave
edge accents: embedded ore chips, mineral seams, fossil-like inclusions, and
edge-rooted alien flora tufts for destructible rock terrain. These are not
standalone props; they must look physically fused into jagged cave edges and
partially buried in host rock.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: 4 columns by 4 rows, one isolated asset per cell, generous padding,
no labels, no text, no shadows on the background.
Style: high-quality hand-painted 2D game sprite art, gloomy underwater
survival-horror lighting, muted cyan/green/grey rock, restrained
bioluminescent accents, crisp silhouettes, dense texture, readable at small
gameplay scale.
Avoid: square tiles, checkerboard terrain, clean vector icons, sticker-like
props, large standalone plants, bright candy colors, repeated duplicate cells,
UI frames, watermarks, screenshots.

If Codex Imagegen returns the sheet inline through CLI auth, recover it directly
from the Codex session log:

`npm run terrain:edge-accent-recover-codex-imagegen -- --dry-run`

`npm run terrain:edge-accent-recover-codex-imagegen`

Then rebuild the sliced assets:

`npm run assets:terrain-edge-accent`
""",
        encoding="utf8",
    )


def active_source() -> Path:
    make_fallback_source()
    write_handoff()
    return INBOX_SOURCE if INBOX_SOURCE.exists() else FALLBACK_SOURCE


def slice_source(source: Path) -> None:
    GENERATED.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(source).convert("RGBA")
    sheet.save(CURRENT_SOURCE)
    cols = 4
    rows = 4
    manifest = {
        "schema": "water9/terrain-edge-accent-source-sheet@1",
        "source": str(source.relative_to(ROOT) if source.is_relative_to(ROOT) else source),
        "currentSource": str(CURRENT_SOURCE.relative_to(ROOT)),
        "fallbackSource": str(FALLBACK_SOURCE.relative_to(ROOT)),
        "inboxSource": str(INBOX_SOURCE.relative_to(ROOT)),
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
        sprite = trim_alpha(chroma_to_alpha(crop))
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


def main() -> None:
    slice_source(active_source())


if __name__ == "__main__":
    main()
