#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "generated"

SIZE = 220


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def layer() -> Image.Image:
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def draw_poly_blob(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int], seed: int, points: int = 18) -> None:
    rng = random.Random(seed)
    vertices = []
    for i in range(points):
        angle = i / points * math.tau
        vertices.append((
            cx + math.cos(angle) * rx * rng.uniform(0.74, 1.18),
            cy + math.sin(angle) * ry * rng.uniform(0.68, 1.2),
        ))
    draw.polygon(vertices, fill=color)


def soft_glow(img: Image.Image, color: tuple[int, int, int, int], blur: float = 4.5, alpha_scale: float = 0.42) -> None:
    mask = img.getchannel("A")
    glow = Image.new("RGBA", img.size, color)
    glow.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda value: int(value * alpha_scale)))
    base = img.copy()
    img.alpha_composite(glow)
    img.alpha_composite(base)


def accent_glow(img: Image.Image, accents: Image.Image, color: tuple[int, int, int, int], blur: float = 3.0, alpha_scale: float = 0.55) -> None:
    mask = accents.getchannel("A")
    glow = Image.new("RGBA", img.size, color)
    glow.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda value: int(value * alpha_scale)))
    img.alpha_composite(glow)
    img.alpha_composite(accents)


def add_shadow_base(img: Image.Image, seed: int, color = "#061015") -> None:
    rng = random.Random(seed)
    draw = ImageDraw.Draw(img, "RGBA")
    for i in range(7):
        cx = 88 + i * 9 + rng.uniform(-10, 9)
        cy = 181 + rng.uniform(-6, 5)
        draw_poly_blob(draw, cx, cy, rng.uniform(17, 29), rng.uniform(7, 13), rgba(color, rng.randrange(145, 215)), seed * 17 + i, 12)
    for i in range(24):
        x = rng.uniform(54, 166)
        y = rng.uniform(174, 196)
        r = rng.uniform(1.1, 3.8)
        draw.ellipse((x - r, y - r * 0.55, x + r, y + r * 0.55), fill=rgba(rng.choice(["#10252a", "#163137", "#0b171c"]), rng.randrange(65, 135)))


def add_root_tendrils(draw: ImageDraw.ImageDraw, seed: int, base: tuple[float, float], colors: list[str], count: int, lean: float = 0.0) -> None:
    rng = random.Random(seed)
    bx, by = base
    for i in range(count):
        start = (bx + rng.uniform(-30, 24), by + rng.uniform(-6, 6))
        length = rng.uniform(32, 78)
        angle = -math.pi / 2 + lean + rng.uniform(-0.43, 0.35)
        mid = (
            start[0] + math.cos(angle + rng.uniform(-0.25, 0.2)) * length * rng.uniform(0.35, 0.55),
            start[1] + math.sin(angle) * length * rng.uniform(0.35, 0.55),
        )
        end = (
            start[0] + math.cos(angle) * length,
            start[1] + math.sin(angle) * length,
        )
        width = rng.randrange(3, 7)
        draw.line((start, mid, end), fill=rgba(rng.choice(colors), rng.randrange(125, 205)), width=width, joint="curve")


def moon_sponge() -> Image.Image:
    img = layer()
    draw = ImageDraw.Draw(img, "RGBA")
    add_shadow_base(img, 101, "#061418")
    rng = random.Random(141)
    forms = [
        (86, 162, 24, 20, "#24444c"),
        (112, 150, 31, 26, "#315a61"),
        (137, 165, 22, 19, "#203e47"),
        (101, 177, 36, 14, "#12282e"),
        (149, 181, 20, 10, "#0d2026"),
    ]
    for i, (cx, cy, rx, ry, color) in enumerate(forms):
        draw_poly_blob(draw, cx, cy, rx, ry, rgba(color, 225), 200 + i, 17)
    for i in range(17):
        cx = rng.uniform(80, 153)
        cy = rng.uniform(141, 171)
        rx = rng.uniform(3.0, 7.5)
        ry = rng.uniform(2.4, 5.2)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=rgba("#91d8d9", rng.randrange(75, 140)), width=2)
    for i in range(8):
        cx = rng.uniform(96, 149)
        cy = rng.uniform(134, 160)
        r = rng.uniform(2.0, 4.2)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba("#9cf0e4", rng.randrange(120, 185)))
    accents = layer()
    accent_draw = ImageDraw.Draw(accents, "RGBA")
    for i in range(7):
        cx = rng.uniform(96, 149)
        cy = rng.uniform(134, 160)
        r = rng.uniform(1.6, 3.1)
        accent_draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgba("#b4fff2", rng.randrange(130, 190)))
    accent_glow(img, accents, rgba("#73d6d5", 90), 2.6, 0.34)
    return img.filter(ImageFilter.UnsharpMask(radius=0.8, percent=105, threshold=3))


def sting_anemone() -> Image.Image:
    img = layer()
    draw = ImageDraw.Draw(img, "RGBA")
    add_shadow_base(img, 202, "#080f15")
    add_root_tendrils(draw, 242, (113, 183), ["#1e2c35", "#292d3a", "#2f2430"], 15, lean=-0.08)
    rng = random.Random(243)
    accents = layer()
    accent_draw = ImageDraw.Draw(accents, "RGBA")
    for i in range(13):
        start = (rng.uniform(84, 135), rng.uniform(176, 184))
        length = rng.uniform(54, 104)
        angle = -math.pi / 2 + rng.uniform(-0.58, 0.45)
        mid = (start[0] + math.cos(angle + 0.24) * length * 0.45, start[1] + math.sin(angle) * length * 0.46)
        end = (start[0] + math.cos(angle) * length, start[1] + math.sin(angle) * length)
        draw.line((start, mid, end), fill=rgba(rng.choice(["#3b2d3a", "#45303c", "#303140"]), 178), width=rng.randrange(3, 6), joint="curve")
        r = rng.uniform(2.4, 4.2)
        accent_draw.ellipse((end[0] - r, end[1] - r, end[0] + r, end[1] + r), fill=rgba("#ff7182", rng.randrange(145, 215)))
    draw_poly_blob(draw, 111, 179, 32, 13, rgba("#121d24", 235), 260, 14)
    accent_glow(img, accents, rgba("#ff5874", 90), 2.7, 0.45)
    return img.filter(ImageFilter.UnsharpMask(radius=0.9, percent=120, threshold=2))


def vent_coral() -> Image.Image:
    img = layer()
    draw = ImageDraw.Draw(img, "RGBA")
    add_shadow_base(img, 303, "#100d0b")
    rng = random.Random(344)
    branches = [
        ((91, 181), -1.92, 58, 7),
        ((107, 182), -1.58, 77, 9),
        ((125, 181), -1.32, 67, 7),
        ((139, 184), -1.03, 48, 6),
        ((76, 184), -2.22, 39, 5),
    ]
    for i, (start, angle, length, width) in enumerate(branches):
        end = (start[0] + math.cos(angle) * length, start[1] + math.sin(angle) * length)
        mid = (start[0] + math.cos(angle + rng.uniform(-0.18, 0.18)) * length * 0.48, start[1] + math.sin(angle) * length * 0.52)
        draw.line((start, mid, end), fill=rgba("#3f2b24", 220), width=width + 4, joint="curve")
        draw.line((start, mid, end), fill=rgba("#7b4b35", 172), width=width, joint="curve")
        lip_rx = width * 0.72
        lip_ry = width * 0.46
        draw.ellipse((end[0] - lip_rx, end[1] - lip_ry, end[0] + lip_rx, end[1] + lip_ry), fill=rgba("#c97643", 165), outline=rgba("#ffd08c", 115), width=1)
        if i < 3:
            side = (mid[0] + rng.uniform(-9, 11), mid[1] + rng.uniform(-8, 5))
            tip = (side[0] + rng.uniform(-22, 21), side[1] - rng.uniform(13, 30))
            draw.line((mid, side, tip), fill=rgba("#684432", 145), width=max(3, width - 3), joint="curve")
    draw_poly_blob(draw, 111, 182, 44, 12, rgba("#15110e", 235), 369, 16)
    accents = layer()
    accent_draw = ImageDraw.Draw(accents, "RGBA")
    for x, y, r in [(66, 129, 3.2), (110, 106, 4.3), (145, 115, 3.3), (167, 139, 3.5)]:
        accent_draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba("#ffd08c", 145))
    accent_glow(img, accents, rgba("#ff914f", 92), 2.8, 0.42)
    return img.filter(ImageFilter.UnsharpMask(radius=0.9, percent=116, threshold=2))


def ember_bloom() -> Image.Image:
    img = layer()
    draw = ImageDraw.Draw(img, "RGBA")
    add_shadow_base(img, 404, "#120e0b")
    add_root_tendrils(draw, 442, (114, 184), ["#36261e", "#493025", "#4f3828"], 12, lean=0.12)
    rng = random.Random(454)
    for i, (cx, cy, rx, ry) in enumerate([(91, 154, 11, 17), (116, 128, 15, 23), (139, 150, 12, 18), (126, 166, 10, 14)]):
        draw_poly_blob(draw, cx, cy, rx, ry, rgba("#4d3327", 218), 480 + i, 12)
        draw_poly_blob(draw, cx + rng.uniform(-2, 2), cy - rng.uniform(0, 3), rx * 0.34, ry * 0.34, rgba("#e28c42", 130), 520 + i, 10)
    accents = layer()
    accent_draw = ImageDraw.Draw(accents, "RGBA")
    for i in range(13):
        start = (rng.uniform(78, 150), rng.uniform(176, 185))
        end = (start[0] + rng.uniform(-18, 18), start[1] - rng.uniform(28, 68))
        draw.line((start, ((start[0] + end[0]) * 0.5 + rng.uniform(-10, 10), (start[1] + end[1]) * 0.5), end), fill=rgba("#493127", rng.randrange(110, 175)), width=rng.randrange(2, 5), joint="curve")
        if i % 3 == 0:
            r = rng.uniform(2.2, 3.9)
            accent_draw.ellipse((end[0] - r, end[1] - r, end[0] + r, end[1] + r), fill=rgba("#ffd166", rng.randrange(145, 215)))
    draw_poly_blob(draw, 115, 183, 48, 13, rgba("#17100c", 236), 570, 18)
    accent_glow(img, accents, rgba("#ff9c4a", 95), 2.9, 0.45)
    return img.filter(ImageFilter.UnsharpMask(radius=0.9, percent=118, threshold=2))


ASSETS = {
    "terrain-edge-flora-moon-sponge": moon_sponge,
    "terrain-edge-flora-sting-anemone": sting_anemone,
    "terrain-edge-flora-vent-coral": vent_coral,
    "terrain-edge-flora-ember-bloom": ember_bloom,
}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, factory in ASSETS.items():
        factory().save(OUT_DIR / f"{name}.png")
        print(f"wrote public/assets/generated/{name}.png")


if __name__ == "__main__":
    main()
