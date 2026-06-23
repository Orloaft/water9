#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "generated"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def save(name: str, img: Image.Image) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.png")


def rock_poly(width: int, height: int, seed: int, ceiling: bool = False) -> list[tuple[float, float]]:
    rng = random.Random(seed)
    top = []
    bottom = []
    for i in range(8):
        x = i / 7 * width
        top.append((x, rng.uniform(4, height * 0.34)))
        bottom.append((width - x, rng.uniform(height * 0.62, height - 3)))
    pts = top + bottom
    if ceiling:
        pts = [(x, height - y) for x, y in pts]
    return pts


def make_rock_lip(name: str, seed: int, size: tuple[int, int], ceiling: bool = False, vertical: bool = False) -> None:
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if vertical:
        pts = rock_poly(h, w, seed)
        pts = [(y, x) for x, y in pts]
    else:
        pts = rock_poly(w, h, seed, ceiling)
    draw.polygon(pts, fill=rgba("#17202a", 238))
    draw.line(pts + [pts[0]], fill=rgba("#4c6472", 150), width=2)
    rng = random.Random(seed + 99)
    for _ in range(18):
        x = rng.randrange(2, w - 2)
        y = rng.randrange(2, h - 2)
        c = rng.choice(["#0a1118", "#263640", "#6f8790", "#31434b"])
        draw.line((x, y, x + rng.randrange(-8, 9), y + rng.randrange(-3, 4)), fill=rgba(c, rng.randrange(70, 135)), width=1)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=3))
    save(name, img)


def make_ore(name: str, colors: list[str], seed: int, size: int = 74) -> None:
    rng = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    for i in range(13):
        r = rng.uniform(size * 0.08, size * 0.18)
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0, size * 0.24)
        x = cx + math.cos(a) * d
        y = cy + math.sin(a) * d
        pts = []
        sides = rng.randrange(5, 8)
        for j in range(sides):
            aa = a + j / sides * math.tau + rng.uniform(-0.18, 0.18)
            rr = r * rng.uniform(0.72, 1.22)
            pts.append((x + math.cos(aa) * rr, y + math.sin(aa) * rr))
        base = rgba(colors[i % len(colors)], 235)
        draw.polygon(pts, fill=base)
        draw.line(pts + [pts[0]], fill=rgba("#fff6d7", 80), width=1)
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    for i in range(5):
        g.ellipse((cx - 14 - i * 5, cy - 11 - i * 5, cx + 14 + i * 5, cy + 11 + i * 5), fill=rgba(colors[0], max(8, 38 - i * 7)))
    img = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(4)), img)
    save(name, img)


def make_branching_flora(name: str, seed: int, colors: list[str], w: int = 92, h: int = 124, fan: bool = False) -> None:
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    base = (w * 0.5, h - 10)
    branches = 14 if fan else 9
    for i in range(branches):
        angle = -math.pi / 2 + (i - branches / 2) * (0.13 if fan else 0.09)
        length = rng.uniform(h * 0.44, h * 0.76)
        x2 = base[0] + math.cos(angle) * length * rng.uniform(0.55, 1.05)
        y2 = base[1] + math.sin(angle) * length
        color = rgba(colors[i % len(colors)], 220)
        draw.line((base[0], base[1], x2, y2), fill=color, width=2)
        for j in range(3):
            t = (j + 1) / 4
            bx = base[0] + (x2 - base[0]) * t
            by = base[1] + (y2 - base[1]) * t
            side = -1 if j % 2 else 1
            draw.line((bx, by, bx + side * rng.uniform(5, 13), by - rng.uniform(3, 11)), fill=rgba(colors[(i + j) % len(colors)], 170), width=1)
    draw.ellipse((base[0] - 20, h - 18, base[0] + 20, h - 4), fill=rgba("#1b2428", 220))
    save(name, img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=130, threshold=2)))


def make_kelp(name: str, seed: int, colors: list[str], w: int = 72, h: int = 128) -> None:
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for stem in range(4):
        x = w * (0.28 + stem * 0.15)
        pts = []
        for i in range(10):
            y = h - 8 - i * (h - 24) / 9
            pts.append((x + math.sin(i * 0.9 + stem) * 7, y))
        draw.line(pts, fill=rgba(colors[stem % len(colors)], 220), width=3)
        for x0, y0 in pts[2:9:2]:
            side = -1 if rng.random() < 0.5 else 1
            x1 = x0 + side * rng.uniform(12, 22)
            draw.ellipse((min(x0, x1), y0 - 8, max(x0, x1), y0 + 4), fill=rgba(colors[(stem + 1) % len(colors)], 125))
    save(name, img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=2)))


def make_sponge(name: str, seed: int, colors: list[str], w: int = 84, h: int = 96) -> None:
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(7):
        x = rng.uniform(w * 0.22, w * 0.78)
        y = rng.uniform(h * 0.32, h * 0.82)
        rw = rng.uniform(8, 18)
        rh = rng.uniform(18, 36)
        draw.rectangle((x - rw / 2, y - rh, x + rw / 2, y), fill=rgba(colors[i % len(colors)], 210))
        draw.ellipse((x - rw / 2, y - rh - rw * 0.34, x + rw / 2, y - rh + rw * 0.34), fill=rgba(colors[i % len(colors)], 220))
        draw.ellipse((x - rw * 0.34, y - rh - 2, x + rw * 0.34, y - rh * 0.72), outline=rgba("#d7fff8", 110), width=1)
    draw.ellipse((w * 0.2, h - 18, w * 0.8, h - 4), fill=rgba("#182227", 210))
    save(name, img)


def make_anemone(name: str, seed: int, colors: list[str], w: int = 100, h: int = 100) -> None:
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w / 2, h * 0.66
    for i in range(22):
        a = i / 22 * math.tau
        length = rng.uniform(24, 42)
        draw.line((cx, cy, cx + math.cos(a) * length, cy + math.sin(a) * length * 0.72), fill=rgba(colors[i % len(colors)], 180), width=2)
    draw.ellipse((cx - 18, cy - 13, cx + 18, cy + 13), fill=rgba(colors[0], 235))
    draw.ellipse((cx - 9, cy - 6, cx + 9, cy + 6), fill=rgba("#150711", 230))
    save(name, img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=2)))


def main() -> None:
    make_rock_lip("env-rock-floor-lip-0", 10, (80, 42))
    make_rock_lip("env-rock-floor-lip-1", 11, (72, 38))
    make_rock_lip("env-rock-ceiling-lip-0", 12, (76, 34), ceiling=True)
    make_rock_lip("env-rock-wall-left-0", 13, (38, 84), vertical=True)
    make_rock_lip("env-rock-wall-right-0", 14, (38, 84), vertical=True)

    make_ore("env-ore-copper", ["#b9673d", "#e09152", "#5b2d21"], 21)
    make_ore("env-ore-quartz", ["#b7fff5", "#75d8e4", "#eafcff"], 22)
    make_ore("env-ore-ruby", ["#ff5f78", "#9d183a", "#ffd0dc"], 23)
    make_ore("env-ore-cobalt", ["#4f8df7", "#233d9a", "#a8ccff"], 24)
    make_ore("env-ore-sunstone", ["#ffb347", "#ff7438", "#ffe8a8"], 25)
    make_ore("env-ore-relic", ["#b9f27c", "#5a7d49", "#eaffc9"], 26)
    make_ore("env-ore-idol", ["#d6fff8", "#ffd166", "#8ee7f4"], 27, 84)
    make_ore("env-ore-alien-alloy", ["#73fbd3", "#2a8c84", "#d1fff4"], 28, 80)
    make_ore("env-ore-ruin-core", ["#ffffff", "#f48cff", "#73fbd3"], 29, 92)

    make_kelp("env-flora-glass-kelp", 40, ["#77dba0", "#b9f27c", "#74e6ef"])
    make_sponge("env-flora-moon-sponge", 41, ["#94e8e3", "#c8fff9", "#537b83"])
    make_anemone("env-flora-sting-anemone", 42, ["#ff6f7f", "#ffd0d7", "#98304c"])
    make_kelp("env-flora-brine-grass", 43, ["#b9f27c", "#789d5a", "#d9ff9b"], 82, 116)
    make_branching_flora("env-flora-vent-coral", 44, ["#ff8a5c", "#ffc857", "#6d3240"])
    make_anemone("env-flora-ember-bloom", 45, ["#ffd166", "#ff8a5c", "#7a2d1e"])
    make_branching_flora("env-flora-black-fan", 46, ["#9a8cff", "#3a315e", "#d2caff"], fan=True)
    make_branching_flora("env-flora-needle-garden", 47, ["#ff5d8f", "#bc245f", "#ffd0df"], fan=True)
    make_anemone("env-flora-crown-polyp", 48, ["#ffd166", "#f48cff", "#2b1439"], 108, 112)
    make_kelp("env-flora-circuit-kelp", 49, ["#73fbd3", "#1f7b77", "#d3fff7"])
    make_sponge("env-flora-glass-obelisk", 50, ["#b8f7ff", "#8ee7f4", "#ffffff"], 88, 120)
    make_anemone("env-flora-oracle-polyp", 51, ["#f48cff", "#73fbd3", "#ffffff"], 112, 112)
    make_kelp("env-flora-oxygen-bloom", 52, ["#8ee7f4", "#d6fff8", "#73fbd3"], 80, 118)
    make_branching_flora("env-flora-lumen-fern", 53, ["#b9f27c", "#73fbd3", "#375d53"], 86, 116, fan=True)
    make_ore("env-flora-lumen-nodule", ["#73fbd3", "#1bcbd8", "#d7fff7"], 54, 64)


if __name__ == "__main__":
    main()
