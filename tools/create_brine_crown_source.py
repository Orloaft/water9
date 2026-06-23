#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Brine Crown.

This creates a source-review replacement candidate only. It is not production
acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/brine-crown.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(431907)


def scaled(points: list[tuple[float, float]], scale: int) -> list[tuple[int, int]]:
    return [(round(x * scale), round(y * scale)) for x, y in points]


def ellipse(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, fill, outline=None, width: int = 1, scale: int = 1) -> None:
    draw.ellipse(
        [
            round((cx - rx) * scale),
            round((cy - ry) * scale),
            round((cx + rx) * scale),
            round((cy + ry) * scale),
        ],
        fill=fill,
        outline=outline,
        width=max(1, round(width * scale)),
    )


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, outline=None, scale: int = 1) -> None:
    draw.polygon(scaled(points, scale), fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, width: float, scale: int = 1) -> None:
    draw.line(scaled(points, scale), fill=fill, width=max(1, round(width * scale)), joint="curve")


def frond(cx: float, cy: float, angle: float, inner: float, outer: float, root_width: float, tip_width: float, curve: float) -> list[tuple[float, float]]:
    ux = math.cos(angle)
    uy = math.sin(angle)
    px = -uy
    py = ux
    root = (cx + ux * inner, cy + uy * inner)
    mid = (cx + ux * ((inner + outer) * 0.58) + px * curve, cy + uy * ((inner + outer) * 0.58) + py * curve)
    tip = (cx + ux * outer, cy + uy * outer)
    return [
        (root[0] + px * root_width, root[1] + py * root_width),
        (mid[0] + px * tip_width, mid[1] + py * tip_width),
        (tip[0] + px * tip_width * 0.42, tip[1] + py * tip_width * 0.42),
        (tip[0] - px * tip_width * 0.42, tip[1] - py * tip_width * 0.42),
        (mid[0] - px * tip_width, mid[1] - py * tip_width),
        (root[0] - px * root_width, root[1] - py * root_width),
    ]


def clean_inner_magenta(image: Image.Image) -> None:
    width, height = image.size
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 80 and red >= 180 and blue >= 180 and green <= 92:
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
                pixels[x, y] = (19, 29, 27, 255)


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)
    d_shadow = ImageDraw.Draw(shadow)

    cx, cy = 770, 548
    outline = (13, 25, 24, 255)
    mat_dark = (28, 58, 54, 255)
    mat_mid = (43, 94, 84, 255)
    mat_light = (76, 122, 105, 255)
    copper = (151, 83, 45, 255)
    bone = (191, 185, 142, 255)
    amber = (208, 155, 58, 255)
    green = (94, 198, 127, 255)

    rim = []
    for index in range(54):
        angle = math.tau * index / 54
        rx = 386 + math.sin(index * 1.9) * 24 + (index % 5) * 4
        ry = 238 + math.cos(index * 1.3) * 20
        rim.append((cx + math.cos(angle) * rx, cy + math.sin(angle) * ry))
    polygon(d_shadow, rim, (0, 0, 0, 150), scale=scale)
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(2.0 * scale)))
    image.alpha_composite(shadow)

    specs = [
        (-2.85, 72, 392, 54, 72, -24),
        (-2.18, 74, 360, 52, 64, 18),
        (-1.42, 78, 334, 48, 58, 28),
        (-0.76, 74, 372, 52, 66, -16),
        (-0.10, 76, 406, 56, 74, -30),
        (0.62, 76, 358, 50, 62, 12),
        (1.28, 78, 344, 48, 58, 30),
        (2.02, 76, 384, 54, 68, 8),
        (2.70, 74, 374, 52, 64, -20),
    ]
    for index, spec in enumerate(specs):
        points = frond(cx, cy, *spec)
        fill = mat_mid if index % 3 else mat_dark
        polygon(d_body, points, fill, outline=outline, scale=scale)
        root_mid = ((points[0][0] + points[-1][0]) / 2, (points[0][1] + points[-1][1]) / 2)
        tip_mid = ((points[2][0] + points[3][0]) / 2, (points[2][1] + points[3][1]) / 2)
        line(d_detail, [root_mid, tip_mid], (118, 159, 124, 120), 6, scale)
        line(d_detail, [(root_mid[0] + 9, root_mid[1] + 3), (tip_mid[0] + 5, tip_mid[1] + 2)], (9, 23, 24, 125), 3, scale)

    ellipse(d_body, cx, cy, 292, 170, (37, 82, 75, 255), outline=outline, width=8, scale=scale)
    ellipse(d_body, cx - 14, cy + 18, 228, 120, mat_light, outline=(20, 45, 44, 230), width=5, scale=scale)

    crown = [
        (cx - 154, cy - 66), (cx - 116, cy - 170), (cx - 62, cy - 104),
        (cx - 22, cy - 186), (cx + 34, cy - 100), (cx + 86, cy - 166),
        (cx + 140, cy - 52), (cx + 96, cy + 82), (cx + 8, cy + 118),
        (cx - 96, cy + 78),
    ]
    polygon(d_body, crown, (83, 69, 54, 255), outline=outline, scale=scale)
    ellipse(d_body, cx - 6, cy - 12, 120, 86, (53, 45, 42, 255), outline=(179, 139, 82, 220), width=7, scale=scale)
    ellipse(d_body, cx - 4, cy - 4, 68, 48, (7, 14, 15, 255), outline=(25, 47, 42, 255), width=4, scale=scale)

    for index in range(34):
        angle = math.tau * index / 34
        root = (cx + math.cos(angle) * 118, cy + math.sin(angle) * 78)
        tip = (cx + math.cos(angle) * (164 + (index % 4) * 12), cy + math.sin(angle) * (112 + (index % 3) * 10))
        line(d_detail, [root, tip], outline, 5.5, scale)
        ellipse(d_detail, tip[0], tip[1], 8, 5, copper if index % 2 else bone, outline=outline, width=1, scale=scale)

    for _ in range(74):
        angle = RNG.uniform(0, math.tau)
        radius = RNG.uniform(64, 292)
        x = cx + math.cos(angle) * radius * RNG.uniform(0.92, 1.16)
        y = cy + math.sin(angle) * radius * RNG.uniform(0.55, 0.95)
        if not (330 <= x <= 1210 and 255 <= y <= 840):
            continue
        r = RNG.uniform(6, 18)
        color = green if RNG.random() < 0.54 else amber
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.62, 1.0), (color[0], color[1], color[2], 225), outline=(18, 55, 43, 230), width=2, scale=scale)
        ellipse(d_detail, x - r * 0.25, y - r * 0.22, r * 0.32, r * 0.22, (230, 246, 178, 170), scale=scale)

    for _ in range(620):
        angle = RNG.uniform(0, math.tau)
        radius = RNG.uniform(40, 388)
        x = cx + math.cos(angle) * radius * RNG.uniform(0.9, 1.08)
        y = cy + math.sin(angle) * radius * RNG.uniform(0.54, 0.92)
        if not (320 <= x <= 1220 and 240 <= y <= 850):
            continue
        color = RNG.choice([(10, 27, 29, 85), (113, 151, 116, 80), (184, 113, 58, 78), (204, 196, 141, 70)])
        r = RNG.uniform(1.2, 3.8)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.45, 1.0), color, scale=scale)

    for angle in [-2.95, -2.55, -2.18, -0.48, 0.04, 0.42, 2.34, 2.72]:
        root = (cx + math.cos(angle) * 280, cy + math.sin(angle) * 150)
        end = (cx + math.cos(angle) * 450, cy + math.sin(angle) * 260)
        line(d_body, [root, ((root[0] + end[0]) / 2, (root[1] + end[1]) / 2 + RNG.uniform(-18, 18)), end], mat_dark, 11, scale)
        line(d_detail, [root, end], (114, 151, 105, 110), 3, scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
