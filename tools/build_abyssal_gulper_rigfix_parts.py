#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


OUT_DIR = Path("public/assets/generated")
PREFIX = "fauna-abyssal-gulper-rigfix"
SCALE = 3


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def mix(c1: tuple[int, int, int, int], c2: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(lerp(c1[i], c2[i], t) for i in range(4))  # type: ignore[return-value]


def canvas(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))


def pts(points: list[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]


def ellipse_box(cx: float, cy: float, rx: float, ry: float) -> tuple[int, int, int, int]:
    return (
        round((cx - rx) * SCALE),
        round((cy - ry) * SCALE),
        round((cx + rx) * SCALE),
        round((cy + ry) * SCALE),
    )


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    return img.getchannel("A").getbbox()


def finish(img: Image.Image, path: Path) -> None:
    img = img.filter(ImageFilter.GaussianBlur(0.18 * SCALE))
    img = img.resize((img.width // SCALE, img.height // SCALE), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def gradient_body(mask: Image.Image, top="#6ea7c9", mid="#263b63", bottom="#0b1024") -> Image.Image:
    w, h = mask.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pix = out.load()
    top_c = rgba(top)
    mid_c = rgba(mid)
    bot_c = rgba(bottom)
    for y in range(h):
        t = y / max(1, h - 1)
        if t < 0.45:
            color = mix(top_c, mid_c, t / 0.45)
        else:
            color = mix(mid_c, bot_c, (t - 0.45) / 0.55)
        for x in range(w):
            pix[x, y] = color
    out.putalpha(mask)
    return out


def add_noise(img: Image.Image, mask: Image.Image, seed: int, strength: int = 18) -> None:
    rng = random.Random(seed)
    noise = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pix = noise.load()
    alpha = mask.load()
    for y in range(0, img.height, 2):
        for x in range(0, img.width, 2):
            if alpha[x, y] <= 0:
                continue
            v = rng.randint(-strength, strength)
            if v >= 0:
                color = (v, v, v + rng.randint(0, 10), 32)
            else:
                color = (0, 0, abs(v), 28)
            pix[x, y] = color
    img.alpha_composite(noise.filter(ImageFilter.GaussianBlur(0.55 * SCALE)))


def draw_ridges(layer: Image.Image, bounds: tuple[float, float, float, float], count: int, phase: float = 0) -> None:
    draw = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = bounds
    for i in range(count):
        t = (i + 0.5) / count
        x = x0 + (x1 - x0) * t
        y_mid = y0 + (y1 - y0) * (0.48 + math.sin(t * math.pi * 2 + phase) * 0.035)
        top = y0 + (y1 - y0) * (0.18 + 0.08 * math.sin(t * 5 + phase))
        bot = y0 + (y1 - y0) * (0.84 + 0.06 * math.cos(t * 4 + phase))
        draw.line(
            pts([(x, top), (x - 12, y_mid), (x + 5, bot)]),
            fill=rgba("#0a1225", 125),
            width=max(1, round(2.2 * SCALE)),
            joint="curve",
        )
        draw.line(
            pts([(x + 3, top + 5), (x - 7, y_mid), (x + 8, bot - 6)]),
            fill=rgba("#89c7e8", 82),
            width=max(1, round(0.85 * SCALE)),
            joint="curve",
        )


def draw_biolume(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], radius: float = 1.5) -> None:
    for x, y in points:
        draw.ellipse(ellipse_box(x, y, radius * 2.4, radius * 2.4), fill=rgba("#04a8c8", 42))
        draw.ellipse(ellipse_box(x, y, radius, radius), fill=rgba("#45e7ff", 225))


def segment(name: str, size: tuple[int, int], rx: float, ry: float, seed: int, front: bool, rear: bool, profile: float) -> None:
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    m = ImageDraw.Draw(mask)
    cx, cy = size[0] * 0.5, size[1] * 0.52
    shell = [
        (cx - rx * 0.98, cy - ry * 0.18),
        (cx - rx * 0.72, cy - ry * (0.58 + profile * 0.08)),
        (cx - rx * 0.18, cy - ry * (0.84 - profile * 0.06)),
        (cx + rx * 0.52, cy - ry * (0.74 + profile * 0.04)),
        (cx + rx * 1.0, cy - ry * 0.22),
        (cx + rx * 0.92, cy + ry * 0.48),
        (cx + rx * 0.34, cy + ry * (0.88 - profile * 0.05)),
        (cx - rx * 0.42, cy + ry * (0.8 + profile * 0.05)),
        (cx - rx * 1.05, cy + ry * 0.34),
    ]
    m.polygon(pts(shell), fill=255)
    m.ellipse(ellipse_box(cx - rx * 0.04, cy, rx * 0.88, ry * 0.88), fill=235)
    if front:
        m.polygon(pts([(cx + rx * 0.2, cy - ry * 0.85), (cx + rx * 0.98, cy - ry * 0.34), (cx + rx * 0.9, cy + ry * 0.45), (cx + rx * 0.12, cy + ry * 0.88)]), fill=255)
    if rear:
        m.polygon(pts([(cx - rx * 0.15, cy - ry * 0.8), (cx - rx * 1.1, cy - ry * 0.28), (cx - rx * 1.08, cy + ry * 0.38), (cx - rx * 0.15, cy + ry * 0.82)]), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.4 * SCALE))
    body = gradient_body(mask)
    add_noise(body, mask, seed)
    ridges = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_ridges(ridges, (cx - rx * 0.9, cy - ry * 0.88, cx + rx * 0.88, cy + ry * 0.84), 8, seed * 0.7)
    ridges.putalpha(ImageChops.multiply(ridges.getchannel("A"), mask))
    body.alpha_composite(ridges)
    draw = ImageDraw.Draw(body)
    rng = random.Random(seed)
    for i in range(4):
        t = (i + 0.15) / 4
        x = cx - rx * 0.52 + t * rx * 1.18
        spine_h = ry * (0.32 + rng.random() * 0.14)
        draw.polygon(
            pts([
                (x - 11, cy - ry * 0.58),
                (x + 6, cy - ry * 0.58 - spine_h),
                (x + 19, cy - ry * 0.52),
                (x + 8, cy - ry * 0.38),
            ]),
            fill=rgba("#263963", 210),
        )
        draw.line(pts([(x + 5, cy - ry * 0.56), (x + 9, cy - ry * 0.58 - spine_h * 0.78)]), fill=rgba("#8fc8eb", 90), width=max(1, round(0.8 * SCALE)))
    for i in range(3):
        t = (i + 0.35) / 3
        x = cx - rx * 0.6 + t * rx * 1.05
        draw.polygon(
            pts([
                (x - 9, cy + ry * 0.56),
                (x + 8, cy + ry * (0.96 + 0.08 * profile)),
                (x + 26, cy + ry * 0.6),
                (x + 4, cy + ry * 0.44),
            ]),
            fill=rgba("#172348", 175),
        )
    draw.arc(ellipse_box(cx, cy, rx, ry), 170, 345, fill=rgba("#a9d8f2", 86), width=max(1, round(1.2 * SCALE)))
    draw.arc(ellipse_box(cx + 2, cy + 6, rx * 0.9, ry * 0.72), 0, 170, fill=rgba("#050812", 116), width=max(1, round(2.4 * SCALE)))
    dots = []
    for i in range(9):
        t = i / 8
        dots.append((cx - rx * 0.58 + t * rx * 1.08, cy - ry * 0.15 + math.sin(t * math.pi) * ry * 0.16))
    draw_biolume(draw, dots, 1.25)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-{name}.png")


def tail_fin() -> None:
    size = (210, 150)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    m = ImageDraw.Draw(mask)
    m.polygon(pts([(22, 93), (75, 52), (156, 44), (188, 60), (119, 74), (184, 96), (126, 105), (72, 114)]), fill=255)
    m.polygon(pts([(18, 96), (73, 112), (120, 131), (97, 103)]), fill=185)
    mask = mask.filter(ImageFilter.GaussianBlur(0.55 * SCALE))
    body = gradient_body(mask, "#5d91c2", "#17274c", "#07091c")
    add_noise(body, mask, 47, 14)
    d = ImageDraw.Draw(body)
    for i in range(7):
        y = 55 + i * 9
        d.line(pts([(32, 94), (100 + i * 12, y)]), fill=rgba("#89c7e8", 92), width=max(1, round(1.2 * SCALE)))
    draw_biolume(d, [(58 + i * 17, 79 + math.sin(i) * 5) for i in range(6)], 1.1)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-tail.png")


def fin(name: str, size: tuple[int, int], flip: bool = False) -> None:
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    m = ImageDraw.Draw(mask)
    if flip:
        poly = [(24, 28), (76, 42), (148, 108), (94, 96), (38, 70)]
    else:
        poly = [(26, 76), (86, 28), (158, 16), (112, 70), (52, 92)]
    m.polygon(pts(poly), fill=230)
    mask = mask.filter(ImageFilter.GaussianBlur(0.45 * SCALE))
    body = gradient_body(mask, "#6e9ed1", "#243267", "#0a0b20")
    add_noise(body, mask, 91 if flip else 72, 12)
    d = ImageDraw.Draw(body)
    root = poly[0]
    for x, y in poly[1:]:
        d.line(pts([root, (x, y)]), fill=rgba("#94d6f5", 72), width=max(1, round(1.0 * SCALE)))
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-{name}.png")


def head() -> None:
    size = (198, 195)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    m = ImageDraw.Draw(mask)
    m.polygon(pts([(18, 72), (55, 36), (136, 30), (188, 61), (156, 92), (75, 99), (22, 104)]), fill=255)
    m.ellipse(ellipse_box(88, 96, 66, 58), fill=230)
    mask = mask.filter(ImageFilter.GaussianBlur(0.35 * SCALE))
    body = gradient_body(mask, "#79b8da", "#24365d", "#090b1e")
    add_noise(body, mask, 122, 17)
    d = ImageDraw.Draw(body)
    draw_ridges(body, (28, 36, 158, 107), 9, 0.3)
    d.ellipse(ellipse_box(133, 55, 7, 5), fill=rgba("#06111d", 255))
    d.ellipse(ellipse_box(135, 54, 2.2, 2.2), fill=rgba("#76eeff", 255))
    d.line(pts([(82, 82), (183, 82)]), fill=rgba("#05070d", 230), width=max(1, round(2 * SCALE)))
    for i in range(9):
        x = 104 + i * 8.2
        d.polygon(pts([(x, 83), (x + 4, 105 + (i % 2) * 5), (x + 8, 83)]), fill=rgba("#d9e7d6", 238))
    draw_biolume(d, [(48 + i * 12, 66 + math.sin(i * 0.9) * 10) for i in range(8)], 1.15)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-head.png")


def jaw() -> None:
    size = (180, 140)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    m = ImageDraw.Draw(mask)
    m.polygon(pts([(36, 37), (87, 58), (166, 65), (150, 92), (78, 99), (38, 73)]), fill=255)
    m.ellipse(ellipse_box(76, 76, 55, 36), fill=215)
    mask = mask.filter(ImageFilter.GaussianBlur(0.4 * SCALE))
    body = gradient_body(mask, "#536f9e", "#252b57", "#08091b")
    add_noise(body, mask, 133, 12)
    d = ImageDraw.Draw(body)
    d.line(pts([(48, 45), (156, 66)]), fill=rgba("#05070d", 210), width=max(1, round(2 * SCALE)))
    for i in range(8):
        x = 82 + i * 8.4
        d.polygon(pts([(x, 65), (x + 4, 43 - (i % 2) * 4), (x + 8, 66)]), fill=rgba("#dce8d9", 235))
    draw_biolume(d, [(58 + i * 13, 78 + math.sin(i) * 5) for i in range(6)], 1.1)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-jaw.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    segment("tail-base", (195, 133), 78, 43, 58, True, True, -0.55)
    segment("body-4", (158, 125), 60, 45, 61, True, True, -0.25)
    segment("body-3", (162, 140), 62, 52, 64, True, True, 0.05)
    segment("body-2", (166, 155), 64, 58, 67, True, True, 0.35)
    segment("body-1", (165, 170), 62, 66, 70, True, False, 0.62)
    damaged = Image.open(OUT_DIR / f"{PREFIX}-body-2.png").convert("RGBA")
    draw = ImageDraw.Draw(damaged)
    for points in [
        [(74, 56), (83, 73), (78, 89), (92, 107)],
        [(104, 49), (99, 67), (112, 82), (108, 102)],
        [(52, 85), (68, 91), (71, 112)],
    ]:
        draw.line(points, fill=rgba("#ff5868", 178), width=2, joint="curve")
        draw.line(points, fill=rgba("#23060b", 190), width=1, joint="curve")
    damaged.save(OUT_DIR / f"{PREFIX}-body-2-damaged.png")


if __name__ == "__main__":
    main()
