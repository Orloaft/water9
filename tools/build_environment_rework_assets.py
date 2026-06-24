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
INBOX_SOURCE = ROOT / "tools" / "source-inbox" / "environment-cave-wall-source.png"
FALLBACK_SOURCE = SOURCE_DIR / "environment-cave-wall-source-fallback.png"
CURRENT_SOURCE = SOURCE_DIR / "environment-cave-wall-source-current.png"
MANIFEST = SOURCE_DIR / "environment-cave-wall-source-manifest.json"
HANDOFF = ROOT / "tools" / "source-inbox" / "ENVIRONMENT_HANDOFF.md"
KEY = (255, 0, 255)

ASSETS = [
    ("env-rock-floor-lip-0", "rock", "jagged lower cave edge slab"),
    ("env-rock-floor-lip-1", "rock", "wide broken lower cave shelf"),
    ("env-rock-ceiling-lip-0", "rock", "hanging upper cave edge"),
    ("env-rock-wall-left-0", "rock", "vertical left cave wall curtain"),
    ("env-rock-wall-right-0", "rock", "vertical right cave wall curtain"),
    ("env-ore-copper", "ore", "dull copper mineral fused into host rock"),
    ("env-ore-quartz", "ore", "cold quartz cluster embedded in stone"),
    ("env-ore-ruby", "ore", "deep red mineral pocket"),
    ("env-ore-cobalt", "ore", "blue cobalt mineral seam"),
    ("env-ore-sunstone", "ore", "warm thermal mineral cluster"),
    ("env-ore-relic", "ore", "pale alien relic mineral growth"),
    ("env-ore-idol", "ore", "small ruined idol mineral node"),
    ("env-ore-alien-alloy", "ore", "green alien alloy seam"),
    ("env-ore-ruin-core", "ore", "bright ruin-core mineral node"),
    ("env-flora-glass-kelp", "flora", "wall-rooted glass kelp tendrils"),
    ("env-flora-moon-sponge", "flora", "pale tube sponge colony"),
    ("env-flora-sting-anemone", "flora", "dangerous wall anemone ring"),
    ("env-flora-brine-grass", "flora", "thin brine grass clump"),
    ("env-flora-vent-coral", "flora", "thermal vent coral fan"),
    ("env-flora-ember-bloom", "flora", "orange ember bloom polyp"),
    ("env-flora-black-fan", "flora", "dark fan coral silhouette"),
    ("env-flora-needle-garden", "flora", "needle coral hazard cluster"),
    ("env-flora-crown-polyp", "flora", "crowned wall polyp"),
    ("env-flora-circuit-kelp", "flora", "segmented circuit kelp"),
    ("env-flora-glass-obelisk", "flora", "hard glass obelisk sponge"),
    ("env-flora-oracle-polyp", "flora", "purple oracle polyp"),
    ("env-flora-oxygen-bloom", "flora", "pale oxygen bloom"),
    ("env-flora-lumen-fern", "flora", "luminous fern growth"),
    ("env-flora-lumen-nodule", "flora", "small luminous wall nodule"),
    ("env-hazard-ice-spike", "hazard", "sharp brittle cave spike"),
]


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def jittered_blob(cx: float, cy: float, rx: float, ry: float, seed: int, points: int = 18) -> list[tuple[float, float]]:
    rng = random.Random(seed)
    out = []
    for i in range(points):
        angle = i / points * math.tau
        scale = rng.uniform(0.72, 1.18)
        out.append((cx + math.cos(angle) * rx * scale, cy + math.sin(angle) * ry * scale))
    return out


def draw_cracks(draw: ImageDraw.ImageDraw, seed: int, box: tuple[int, int, int, int], count: int) -> None:
    rng = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(count):
        x = rng.uniform(x0, x1)
        y = rng.uniform(y0, y1)
        pts = [(x, y)]
        for _ in range(rng.randrange(2, 5)):
            x += rng.uniform(-18, 18)
            y += rng.uniform(-8, 12)
            pts.append((x, y))
        draw.line(pts, fill=rgba(rng.choice(["#061016", "#334651", "#6d858e"]), rng.randrange(45, 120)), width=1)


def draw_stone_texture(img: Image.Image, seed: int, mask: Image.Image) -> None:
    rng = random.Random(seed)
    draw = ImageDraw.Draw(img)
    for _ in range(160):
        x = rng.randrange(0, img.width)
        y = rng.randrange(0, img.height)
        if mask.getpixel((x, y)) < 10:
            continue
        color = rng.choice(["#0b141b", "#13212a", "#22333c", "#435760", "#6c838a"])
        a = rng.randrange(16, 58)
        r = rng.randrange(1, 4)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, a))
    img.alpha_composite(Image.composite(Image.new("RGBA", img.size, rgba("#081016", 80)), Image.new("RGBA", img.size, (0, 0, 0, 0)), mask).filter(ImageFilter.GaussianBlur(8)))


def rock_patch(size: tuple[int, int], seed: int, cx: float, cy: float, rx: float, ry: float) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    mask = Image.new("L", size, 0)
    md = ImageDraw.Draw(mask)
    md.polygon(jittered_blob(cx, cy, rx, ry, seed, 22), fill=255)
    draw = ImageDraw.Draw(img)
    draw.bitmap((0, 0), mask, fill=rgba("#15232b", 246))
    draw_stone_texture(img, seed + 200, mask)
    edge = mask.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.6))
    img.alpha_composite(Image.composite(Image.new("RGBA", size, rgba("#83a0a7", 95)), Image.new("RGBA", size, (0, 0, 0, 0)), edge))
    draw_cracks(draw, seed + 500, (0, 0, size[0], size[1]), 12)
    return img


def rock_cell(name: str, cell: int, size: tuple[int, int]) -> Image.Image:
    w, h = size
    rng = random.Random(1000 + cell)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    mask = Image.new("L", size, 0)
    md = ImageDraw.Draw(mask)
    if "wall-left" in name or "wall-right" in name:
        base = jittered_blob(w * 0.5, h * 0.5, w * 0.22, h * 0.45, cell, 20)
        if "wall-left" in name:
            base = [(min(x, w * 0.74), y) for x, y in base]
            base += [(0, h), (0, 0)]
        else:
            base = [(max(x, w * 0.26), y) for x, y in base]
            base += [(w, 0), (w, h)]
    elif "ceiling" in name:
        base = [(0, 0), (w, 0)]
        for i in range(9):
            x = w - i / 8 * w
            base.append((x, rng.uniform(h * 0.28, h * 0.74)))
    else:
        base = [(0, h), (w, h)]
        for i in range(10):
            x = w - i / 9 * w
            base.append((x, rng.uniform(h * 0.2, h * 0.68)))
    md.polygon(base, fill=255)
    body = Image.new("RGBA", size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.bitmap((0, 0), mask, fill=rgba("#16252d", 245))
    draw_stone_texture(body, 2000 + cell, mask)
    edge = mask.filter(ImageFilter.FIND_EDGES)
    body.alpha_composite(Image.composite(Image.new("RGBA", size, rgba("#8fa7ac", 90)), Image.new("RGBA", size, (0, 0, 0, 0)), edge.filter(ImageFilter.GaussianBlur(0.7))))
    draw = ImageDraw.Draw(body)
    draw_cracks(draw, 3000 + cell, (4, 4, w - 4, h - 4), 18)
    for _ in range(5):
        x = rng.uniform(w * 0.15, w * 0.85)
        y = rng.uniform(h * 0.2, h * 0.82)
        draw.ellipse((x - 5, y - 2, x + 10, y + 3), fill=rgba("#395542", 70))
    img.alpha_composite(body)
    return img.filter(ImageFilter.UnsharpMask(radius=1.1, percent=140, threshold=3))


def ore_cell(name: str, cell: int, size: tuple[int, int]) -> Image.Image:
    palettes = {
        "copper": ["#a85d3a", "#d48956", "#4a281f"],
        "quartz": ["#b7fff5", "#79cfd4", "#eefcff"],
        "ruby": ["#d33d5b", "#7e1530", "#ff9ab0"],
        "cobalt": ["#4a78d8", "#1b2d72", "#9bbcff"],
        "sunstone": ["#e98d38", "#ffbf62", "#6e331e"],
        "relic": ["#9bd56a", "#4f6a44", "#d9ffb0"],
        "idol": ["#bbfff0", "#d4a65f", "#f7ffd8"],
        "alloy": ["#67e8c3", "#1d766f", "#d5fff3"],
        "core": ["#f7edff", "#ca6cff", "#68f0d2"],
    }
    key = next((k for k in palettes if k in name), "copper")
    colors = palettes[key]
    w, h = size
    rng = random.Random(4000 + cell)
    img = rock_patch(size, cell + 100, w * 0.52, h * 0.58, w * 0.42, h * 0.34)
    draw = ImageDraw.Draw(img)
    cx, cy = w * 0.52, h * 0.55
    for i in range(12):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0, min(w, h) * 0.19)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d
        r = rng.uniform(8, 19)
        pts = []
        for j in range(rng.randrange(5, 8)):
            aa = a + j / 6 * math.tau + rng.uniform(-0.2, 0.2)
            pts.append((x + math.cos(aa) * r * rng.uniform(0.55, 1.2), y + math.sin(aa) * r * rng.uniform(0.55, 1.1)))
        draw.polygon(pts, fill=rgba(colors[i % len(colors)], 230))
        draw.line(pts + [pts[0]], fill=rgba("#f7fff7", 80), width=1)
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - 42, cy - 30, cx + 42, cy + 30), fill=rgba(colors[0], 35))
    img = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)), img)
    return img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=130, threshold=3))


def flora_cell(name: str, cell: int, size: tuple[int, int]) -> Image.Image:
    w, h = size
    rng = random.Random(6000 + cell)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    img.alpha_composite(rock_patch(size, cell + 200, w * 0.5, h * 0.74, w * 0.36, h * 0.15))
    draw = ImageDraw.Draw(img)
    palette = {
        "moon": ["#88cfd0", "#d4fff8", "#48636b"],
        "sting": ["#d55b70", "#ffd1d8", "#2a0914"],
        "black": ["#7f79b5", "#25233c", "#d8d4ff"],
        "needle": ["#cc3e73", "#ffd0df", "#3f0f27"],
        "ember": ["#ff9a4c", "#ffd166", "#41180d"],
        "vent": ["#d97648", "#ffcc65", "#3b1f21"],
        "circuit": ["#52dbba", "#195e5d", "#d3fff7"],
        "glass": ["#9ee7eb", "#d8fffb", "#46707a"],
        "oracle": ["#d482ff", "#7ff0d5", "#f9f6ff"],
        "oxygen": ["#a8fff1", "#79d7e0", "#ffffff"],
        "lumen": ["#7be9c8", "#c4ff90", "#264c43"],
    }
    colors = palette[next((k for k in palette if k in name), "lumen")]
    base = (w * 0.5, h * 0.72)
    if "sponge" in name or "obelisk" in name:
        for i in range(8):
            x = rng.uniform(w * 0.28, w * 0.72)
            y = rng.uniform(h * 0.42, h * 0.74)
            rw = rng.uniform(7, 15)
            rh = rng.uniform(22, 50)
            draw.rounded_rectangle((x - rw, y - rh, x + rw, y + 4), radius=5, fill=rgba(colors[i % len(colors)], 215))
            draw.ellipse((x - rw * 0.55, y - rh - 3, x + rw * 0.55, y - rh + 8), outline=rgba("#efffff", 110), width=1)
    elif "anemone" in name or "polyp" in name or "bloom" in name:
        cx, cy = base
        for i in range(28):
            a = i / 28 * math.tau
            length = rng.uniform(26, 55)
            draw.line((cx, cy, cx + math.cos(a) * length, cy + math.sin(a) * length * 0.62), fill=rgba(colors[i % len(colors)], 180), width=2)
        draw.ellipse((cx - 23, cy - 14, cx + 23, cy + 14), fill=rgba(colors[0], 230))
        draw.ellipse((cx - 10, cy - 6, cx + 10, cy + 6), fill=rgba("#05070c", 235))
    else:
        branches = 18 if ("fan" in name or "needle" in name or "fern" in name) else 8
        for i in range(branches):
            angle = -math.pi / 2 + (i - branches / 2) * (0.11 if branches > 10 else 0.08)
            length = rng.uniform(h * 0.34, h * 0.58)
            x2 = base[0] + math.cos(angle) * length * rng.uniform(0.45, 1.05)
            y2 = base[1] + math.sin(angle) * length
            draw.line((base[0], base[1], x2, y2), fill=rgba(colors[i % len(colors)], 205), width=2)
            if "kelp" in name or "grass" in name:
                for t in (0.35, 0.55, 0.76):
                    bx = base[0] + (x2 - base[0]) * t
                    by = base[1] + (y2 - base[1]) * t
                    side = -1 if rng.random() < 0.5 else 1
                    lx = bx + side * rng.uniform(12, 24)
                    draw.ellipse((min(bx, lx), by - 7, max(bx, lx), by + 5), fill=rgba(colors[(i + 1) % len(colors)], 115))
    draw.ellipse((w * 0.28, h * 0.68, w * 0.72, h * 0.82), fill=rgba("#071016", 115))
    return img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=125, threshold=3))


def hazard_cell(cell: int, size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    img.alpha_composite(rock_patch(size, cell + 500, w * 0.52, h * 0.76, w * 0.38, h * 0.14))
    for i in range(7):
        x = w * (0.22 + i * 0.09)
        height = 42 + (i % 3) * 15
        pts = [(x - 8, h * 0.68), (x + 8, h * 0.68), (x + random.Random(cell + i).uniform(-6, 6), h * 0.68 - height)]
        draw.polygon(pts, fill=rgba("#9fe6ee", 205))
        draw.line(pts + [pts[0]], fill=rgba("#f2ffff", 90), width=1)
    return img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=130, threshold=3))


def make_fallback_source() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    cell_w, cell_h = 180, 160
    cols = 5
    rows = math.ceil(len(ASSETS) / cols)
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (*KEY, 255))
    for index, (name, kind, _description) in enumerate(ASSETS):
        if kind == "rock":
            asset = rock_cell(name, index, (cell_w - 28, cell_h - 32))
        elif kind == "ore":
            asset = ore_cell(name, index, (cell_w - 34, cell_h - 34))
        elif kind == "hazard":
            asset = hazard_cell(index, (cell_w - 30, cell_h - 26))
        else:
            asset = flora_cell(name, index, (cell_w - 34, cell_h - 26))
        asset = flatten_subject_alpha(asset)
        x = (index % cols) * cell_w + (cell_w - asset.width) // 2
        y = (index // cols) * cell_h + (cell_h - asset.height) // 2
        sheet.alpha_composite(asset, (x, y))
    sheet.convert("RGB").save(FALLBACK_SOURCE)


def flatten_subject_alpha(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a > 10:
                pixels[x, y] = (r, g, b, 255)
            else:
                pixels[x, y] = (0, 0, 0, 0)
    return img


def chroma_to_alpha(crop: Image.Image) -> Image.Image:
    crop = crop.convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = pixels[x, y]
            dist = abs(r - KEY[0]) + abs(g - KEY[1]) + abs(b - KEY[2])
            if dist < 128:
                pixels[x, y] = (0, 0, 0, 0)
    return remove_border_scraps(despill_magenta_edges(crop))


def despill_magenta_edges(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    original_alpha = img.getchannel("A")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            edge = False
            for yy in range(max(0, y - 2), min(img.height, y + 3)):
                for xx in range(max(0, x - 2), min(img.width, x + 3)):
                    if original_alpha.getpixel((xx, yy)) == 0:
                        edge = True
                        break
                if edge:
                    break
            magenta_spill = r > 70 and b > 70 and g < max(r, b) * 0.5 and abs(r - b) < 120
            if edge and magenta_spill:
                neutral = max(g, min(118, (r + b) // 5))
                pixels[x, y] = (min(r, neutral + 18), neutral, min(b, neutral + 28), a)
    return img


def remove_border_scraps(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    seen: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(img.height):
        for x in range(img.width):
            if (x, y) in seen or alpha.getpixel((x, y)) == 0:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            component = []
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if nx < 0 or ny < 0 or nx >= img.width or ny >= img.height:
                        continue
                    if (nx, ny) in seen or alpha.getpixel((nx, ny)) == 0:
                        continue
                    seen.add((nx, ny))
                    stack.append((nx, ny))
            components.append(component)
    if not components:
        return img
    largest = max(len(component) for component in components)
    keep = set()
    for component in components:
        xs = [point[0] for point in component]
        ys = [point[1] for point in component]
        touches_top = min(ys) <= 2
        touches_bottom = max(ys) >= img.height - 3
        touches_left = min(xs) <= 2
        touches_right = max(xs) >= img.width - 3
        border_sliver = (
            (touches_top and max(ys) <= 34)
            or (touches_bottom and min(ys) >= img.height - 35)
            or (touches_left and max(xs) <= 34)
            or (touches_right and min(xs) >= img.width - 35)
        )
        shallow = max(ys) - min(ys) <= 10
        upper_sliver = min(ys) <= 60 and (max(ys) - min(ys)) <= 14
        side_sliver = (
            (min(xs) <= 60 or max(xs) >= img.width - 61)
            and (max(xs) - min(xs)) <= 14
        )
        tiny = len(component) < max(32, largest * 0.025)
        secondary = len(component) < largest * 0.4
        if (tiny and (touches_top or shallow)) or (secondary and (border_sliver or upper_sliver or side_sliver)):
            continue
        keep.update(component)
    pixels = img.load()
    for component in components:
        for x, y in component:
            if (x, y) not in keep:
                pixels[x, y] = (0, 0, 0, 0)
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    left, top, right, bottom = bbox
    pad = 4
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def clear_cell_bleed(crop: Image.Image, row: int, col: int) -> Image.Image:
    crop = crop.convert("RGBA")
    pixels = crop.load()
    if row > 0:
        for y in range(min(24, crop.height)):
            for x in range(crop.width):
                pixels[x, y] = (*KEY, 255)
    if col > 0:
        for y in range(crop.height):
            for x in range(min(4, crop.width)):
                pixels[x, y] = (*KEY, 255)
    if col < 4:
        for y in range(crop.height):
            for x in range(max(0, crop.width - 4), crop.width):
                pixels[x, y] = (*KEY, 255)
    return crop


def write_handoff() -> None:
    HANDOFF.parent.mkdir(parents=True, exist_ok=True)
    HANDOFF.write_text(
        """# Environment Imagegen Handoff

Target inbox file:

`tools/source-inbox/environment-cave-wall-source.png`

Generate or paste a 5-column by 6-row source sheet on a perfectly flat `#ff00ff`
background. Each cell should contain one isolated, cutout-ready painted asset in
the order listed by `public/assets/source/environment-cave-wall-source-manifest.json`.

Prompt:

Use case: stylized-concept
Asset type: 2D underwater cave environment source sheet for Water9
Primary request: Create an original source sheet of dark painted cave wall
fragments, embedded ore clusters, wall-rooted alien flora, and one sharp cave
hazard for a side-scrolling underwater survival-horror game. Use Barotrauma only
as general inspiration for mood: continuous cave rock, diver-scale darkness,
minerals fused into rock faces, and harvestable flora growing from cavern walls.
Do not copy Barotrauma assets.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: 5 columns by 6 rows, one isolated asset per cell, generous padding,
no labels, no text, no shadows on the background.
Style: high-quality hand-painted 2D sprite art, muted cyan/green/grey rock,
gloomy survival-horror lighting, restrained bioluminescent accents, dense
texture, readable silhouettes.
Avoid: square tiles, checkerboard terrain, clean vector icons, sticker-like
props, bright candy colors, duplicated cells, UI frames, watermarks, screenshots.

After placing the image at the target path, run:

`npm run assets:environment-rework`

If Codex Imagegen returns the sheet inline through CLI auth, recover the latest
matching generated PNG directly from the Codex session log:

`npm run environment:recover-codex-imagegen -- --dry-run`

`npm run environment:recover-codex-imagegen`

Then rebuild the sliced assets:

`npm run assets:environment-rework`
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
    cols = 5
    rows = math.ceil(len(ASSETS) / cols)
    cell_w = sheet.width // cols
    cell_h = sheet.height // rows
    manifest = {
        "schema": "water9/environment-source-sheet@1",
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
        crop = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        sprite = trim_alpha(chroma_to_alpha(clear_cell_bleed(crop, row, col)))
        sprite.save(GENERATED / f"{name}.png")
        manifest["assets"].append({
            "name": name,
            "kind": kind,
            "description": description,
            "cell": {"column": col, "row": row},
            "file": f"public/assets/generated/{name}.png",
        })
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf8")


def main() -> None:
    slice_source(active_source())


if __name__ == "__main__":
    main()
