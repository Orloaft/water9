#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Glass Sponge Sentinel.

This produces a project-bound source image for the normal Water 9 review flow.
It is not an acceptance step.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/glass-sponge-sentinel.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(90219)


def scaled(points: list[tuple[float, float]], scale: int) -> list[tuple[int, int]]:
    return [(round(x * scale), round(y * scale)) for x, y in points]


def ellipse(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, fill, outline=None, width: int = 1, scale: int = 1) -> None:
    box = [
        round((cx - rx) * scale),
        round((cy - ry) * scale),
        round((cx + rx) * scale),
        round((cy + ry) * scale),
    ]
    draw.ellipse(box, fill=fill, outline=outline, width=max(1, round(width * scale)))


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, outline=None, scale: int = 1) -> None:
    draw.polygon(scaled(points, scale), fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, width: float, scale: int = 1) -> None:
    draw.line(scaled(points, scale), fill=fill, width=max(1, round(width * scale)), joint="curve")


def arc_line(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, start: float, end: float, fill, width: float, scale: int) -> None:
    points = []
    steps = 42
    for index in range(steps + 1):
        t = start + (end - start) * index / steps
        points.append((cx + math.cos(t) * rx, cy + math.sin(t) * ry))
    line(draw, points, fill, width, scale)


def tint(color: tuple[int, int, int, int], amount: int) -> tuple[int, int, int, int]:
    r, g, b, a = color
    return (
        max(0, min(255, r + amount)),
        max(0, min(255, g + amount)),
        max(0, min(255, b + amount)),
        a,
    )


def clean_inner_magenta(image: Image.Image) -> None:
    width, height = image.size
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 80 and red >= 190 and blue >= 190 and green <= 100:
                pixels[x, y] = MAGENTA

    background = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if background[y][x] or pixels[x, y] != MAGENTA:
            continue
        background[y][x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not background[ny][nx]:
                queue.append((nx, ny))
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == MAGENTA and not background[y][x]:
                pixels[x, y] = (20, 39, 53, 255)


def draw_petals(draw: ImageDraw.ImageDraw, scale: int) -> None:
    petal_specs = [
        [(760, 276), (796, 226), (856, 190), (916, 226), (904, 304), (836, 344), (782, 326)],
        [(870, 300), (926, 270), (990, 292), (1034, 340), (1012, 394), (940, 414), (876, 376)],
        [(784, 392), (858, 426), (908, 500), (870, 578), (784, 552), (722, 486), (718, 414)],
    ]
    fills = [
        (198, 232, 236, 245),
        (177, 218, 228, 245),
        (160, 205, 218, 245),
    ]
    for points, fill in zip(petal_specs, fills):
        polygon(draw, points, fill, outline=(84, 128, 146, 230), scale=scale)
        cx = sum(x for x, _ in points) / len(points)
        cy = sum(y for _, y in points) / len(points)
        for px, py in points[1:5]:
            line(draw, [(cx, cy), (px, py)], tint(fill, -62), 5, scale)
        line(draw, [points[-1], points[0], points[1]], (224, 247, 248, 190), 7, scale)
        for index in range(0, len(points), 2):
            px, py = points[index]
            ellipse(draw, px, py, 6, 4, (235, 255, 255, 170), scale=scale)


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    outline = Image.new("RGBA", image.size, (0, 0, 0, 0))
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outline = ImageDraw.Draw(outline)
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)

    left_side = [(604, 256), (544, 360), (516, 502), (548, 666), (636, 784)]
    right_side = [(866, 236), (940, 342), (956, 508), (914, 674), (770, 806)]
    body_poly = left_side + right_side[::-1]
    interior_poly = [(636, 288), (594, 388), (580, 512), (610, 650), (684, 748), (756, 760), (846, 642), (884, 508), (876, 366), (824, 276)]

    polygon(d_outline, body_poly, (4, 20, 30, 230), scale=scale)
    outline = outline.filter(ImageFilter.GaussianBlur(round(1.3 * scale)))
    image.alpha_composite(outline)

    polygon(d_body, body_poly, (130, 181, 193, 245), outline=(36, 76, 93, 255), scale=scale)
    polygon(d_body, interior_poly, (176, 221, 229, 210), outline=(80, 126, 144, 190), scale=scale)
    polygon(d_body, [(674, 735), (755, 758), (808, 826), (646, 822)], (117, 164, 176, 250), outline=(41, 80, 97, 255), scale=scale)
    ellipse(d_body, 724, 824, 108, 28, (95, 143, 157, 255), outline=(35, 73, 89, 255), width=5, scale=scale)

    # Rim collar and dark osculum throat are the primary gameplay read.
    ellipse(d_body, 748, 296, 178, 73, (204, 238, 241, 248), outline=(56, 99, 118, 255), width=8, scale=scale)
    ellipse(d_body, 778, 311, 104, 42, (17, 31, 43, 255), outline=(148, 202, 212, 230), width=5, scale=scale)
    ellipse(d_body, 820, 314, 44, 20, (5, 12, 20, 255), scale=scale)

    draw_petals(d_body, scale)

    # Rim spicules stay attached to the collar; no detached projectile shards.
    for angle in range(195, 365, 15):
        rad = math.radians(angle)
        root = (748 + math.cos(rad) * 160, 296 + math.sin(rad) * 59)
        tip = (748 + math.cos(rad) * (198 + (angle % 3) * 8), 296 + math.sin(rad) * (86 + (angle % 4) * 4))
        line(d_body, [root, tip], (210, 241, 244, 230), 8, scale)
        line(d_body, [root, tip], (88, 138, 155, 200), 3, scale)

    # Bold hexactinellid lattice: low frequency, crop-safe, and connected.
    rib_color = (226, 250, 250, 218)
    rib_shadow = (68, 111, 130, 200)
    verticals = [
        [(638, 304), (604, 424), (612, 588), (670, 758)],
        [(706, 286), (680, 420), (692, 586), (720, 792)],
        [(778, 286), (792, 430), (786, 604), (752, 790)],
        [(846, 304), (898, 432), (888, 592), (804, 752)],
    ]
    for points in verticals:
        line(d_detail, points, rib_shadow, 16, scale)
        line(d_detail, points, rib_color, 8, scale)
    cross_bands = [
        [(612, 374), (694, 436), (786, 402), (898, 470)],
        [(898, 374), (788, 448), (700, 410), (586, 492)],
        [(590, 520), (688, 582), (790, 548), (888, 620)],
        [(900, 510), (792, 592), (700, 552), (604, 650)],
    ]
    for points in cross_bands:
        line(d_detail, points, rib_shadow, 14, scale)
        line(d_detail, points, rib_color, 7, scale)

    # Rim plates and throat valves are explicit crop zones for later articulation.
    ellipse(d_detail, 646, 294, 52, 26, (218, 245, 245, 238), outline=(77, 123, 140, 230), width=5, scale=scale)
    ellipse(d_detail, 890, 306, 58, 30, (188, 226, 232, 238), outline=(72, 118, 138, 230), width=5, scale=scale)
    for angle in (-33, -12, 10, 31):
        x1 = 776 + math.cos(math.radians(angle)) * 48
        y1 = 313 + math.sin(math.radians(angle)) * 20
        x2 = 850 + math.cos(math.radians(angle)) * 78
        y2 = 318 + math.sin(math.radians(angle)) * 28
        line(d_detail, [(x1, y1), (x2, y2)], (168, 219, 226, 210), 5, scale)

    # Siliceous surface stipple adds detail and entropy without lace noise.
    for _ in range(620):
        x = RNG.uniform(596, 894)
        y = RNG.uniform(306, 744)
        norm_y = (y - 306) / 438
        left = 600 - 50 * math.sin(norm_y * math.pi)
        right = 890 + 36 * math.sin(norm_y * math.pi)
        if not (left <= x <= right):
            continue
        c = RNG.choice([
            (233, 253, 253, 96),
            (154, 206, 218, 108),
            (101, 155, 178, 92),
            (213, 223, 246, 78),
        ])
        r = RNG.uniform(1.1, 2.7)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.55, 1.15), c, scale=scale)

    # Attached foot collar struts make it clear the creature is sessile, not a floating plant.
    for offset in (-54, -28, 0, 28, 54):
        line(d_detail, [(720 + offset * 0.35, 742), (724 + offset, 824)], (206, 237, 238, 180), 5, scale)
    arc_line(d_detail, 722, 738, 124, 40, math.radians(8), math.radians(172), (221, 249, 249, 190), 6, scale)
    arc_line(d_detail, 728, 824, 104, 20, math.radians(180), math.radians(360), (48, 94, 111, 210), 7, scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)

    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
