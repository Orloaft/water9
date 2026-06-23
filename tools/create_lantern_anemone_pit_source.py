#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Lantern Anemone Pit.

This creates a project-bound source image for the Water 9 source review flow.
It is not an acceptance step.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/lantern-anemone-pit.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(829411)


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


def petal_points(cx: float, cy: float, angle: float, inner: float, outer: float, root_width: float, tip_width: float, curve: float) -> list[tuple[float, float]]:
    ux = math.cos(angle)
    uy = math.sin(angle)
    px = -uy
    py = ux
    root = (cx + ux * inner, cy + uy * inner)
    mid = (cx + ux * ((inner + outer) * 0.56) + px * curve, cy + uy * ((inner + outer) * 0.56) + py * curve)
    tip = (cx + ux * outer, cy + uy * outer)
    return [
        (root[0] + px * root_width, root[1] + py * root_width),
        (mid[0] + px * tip_width, mid[1] + py * tip_width),
        (tip[0] + px * tip_width * 0.35, tip[1] + py * tip_width * 0.35),
        (tip[0] - px * tip_width * 0.35, tip[1] - py * tip_width * 0.35),
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
                pixels[x, y] = (22, 23, 29, 255)


def draw_petal(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, outline, scale: int) -> None:
    polygon(draw, points, fill, outline=outline, scale=scale)
    root_mid = ((points[0][0] + points[-1][0]) / 2, (points[0][1] + points[-1][1]) / 2)
    tip_mid = ((points[2][0] + points[3][0]) / 2, (points[2][1] + points[3][1]) / 2)
    line(draw, [root_mid, ((points[1][0] + points[4][0]) / 2, (points[1][1] + points[4][1]) / 2), tip_mid], (105, 55, 53, 180), 4.5, scale)
    line(draw, [points[0], points[1], points[2]], (238, 196, 170, 135), 4, scale)
    line(draw, [points[-1], points[-2], points[3]], (60, 63, 65, 135), 3, scale)


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_shadow = ImageDraw.Draw(shadow)
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)

    cx, cy = 766, 508

    # Soft silhouette shadow only under the organism, not outside onto the key.
    outer_shadow = []
    for index in range(30):
        angle = math.tau * index / 28
        radius_x = 326 + math.sin(index * 1.7) * 22
        radius_y = 224 + math.cos(index * 1.2) * 15
        outer_shadow.append((cx + math.cos(angle) * radius_x, cy + math.sin(angle) * radius_y))
    polygon(d_shadow, outer_shadow, (5, 8, 12, 185), scale=scale)
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(2.1 * scale)))
    image.alpha_composite(shadow)

    # Buried column base and pedal skirt: makes the source read as an anchored ambusher.
    base = [
        (566, 692), (640, 606), (734, 578), (844, 604), (934, 694),
        (902, 786), (794, 832), (680, 810), (596, 758),
    ]
    polygon(d_body, base, (72, 91, 79, 255), outline=(23, 31, 32, 255), scale=scale)
    ellipse(d_body, 746, 770, 210, 58, (50, 69, 63, 255), outline=(20, 28, 29, 255), width=7, scale=scale)
    ellipse(d_body, 746, 735, 154, 41, (107, 121, 91, 235), outline=(38, 52, 49, 220), width=5, scale=scale)

    # Outer ring petals are intentionally chunky, separated, and connected at the rim.
    outer_specs = [
        (-2.92, 92, 334, 42, 62, -22),
        (-2.42, 94, 312, 41, 58, 18),
        (-1.92, 92, 326, 43, 63, 32),
        (-1.34, 96, 304, 43, 56, 20),
        (-0.76, 94, 322, 42, 61, -18),
        (-0.18, 92, 338, 46, 65, -30),
        (0.42, 96, 314, 40, 58, -4),
        (1.02, 96, 306, 44, 60, 22),
        (1.56, 94, 322, 42, 62, 30),
        (2.16, 94, 338, 43, 64, 8),
        (2.72, 96, 320, 42, 58, -24),
    ]
    for index, (angle, inner, outer, root_width, tip_width, curve) in enumerate(outer_specs):
        points = petal_points(cx, cy, angle, inner, outer, root_width, tip_width, curve)
        fill = (158 + (index % 3) * 14, 82 + (index % 2) * 12, 70, 255)
        draw_petal(d_body, points, fill, (45, 41, 42, 255), scale)

    # Inner ring curls around the dark mouth pit.
    inner_specs = [
        (-2.72, 46, 184, 28, 40, -7),
        (-2.08, 46, 176, 29, 38, 14),
        (-1.42, 46, 180, 30, 41, 18),
        (-0.78, 46, 174, 28, 39, -8),
        (-0.16, 46, 188, 30, 42, -15),
        (0.52, 46, 176, 28, 39, 7),
        (1.18, 46, 174, 29, 38, 14),
        (1.82, 46, 182, 30, 40, 12),
        (2.46, 46, 176, 28, 38, -10),
    ]
    for index, (angle, inner, outer, root_width, tip_width, curve) in enumerate(inner_specs):
        points = petal_points(cx, cy, angle, inner, outer, root_width, tip_width, curve)
        fill = (198, 129 + (index % 2) * 12, 104, 255)
        draw_petal(d_body, points, fill, (61, 48, 47, 255), scale)

    # Connected oral disc, lip ring, and mouth pit are the primary danger read.
    ellipse(d_body, cx, cy, 160, 104, (184, 116, 91, 255), outline=(56, 47, 47, 255), width=9, scale=scale)
    ellipse(d_body, cx, cy + 3, 118, 72, (105, 76, 69, 255), outline=(218, 166, 126, 210), width=7, scale=scale)
    ellipse(d_body, cx + 2, cy + 8, 78, 48, (19, 17, 22, 255), outline=(47, 54, 62, 255), width=5, scale=scale)
    ellipse(d_body, cx + 11, cy + 12, 40, 24, (3, 4, 8, 255), scale=scale)

    # Radial rim folds connect the petals to the mouth rather than letting them read as flower leaves.
    for index in range(26):
        angle = math.tau * index / 26 + (0.03 if index % 2 else 0)
        root = (cx + math.cos(angle) * 58, cy + math.sin(angle) * 35)
        end = (cx + math.cos(angle) * (142 + (index % 3) * 9), cy + math.sin(angle) * (88 + (index % 4) * 5))
        line(d_detail, [root, end], (230, 178, 133, 160), 5.5, scale)
        line(d_detail, [(root[0] + 6, root[1] + 4), (end[0] + 4, end[1] + 3)], (67, 57, 55, 145), 2.5, scale)

    # Cyan lure bulbs and stinging bead tips are embedded in tissue, not detached VFX.
    bead_positions: list[tuple[float, float, float]] = []
    for angle, _inner, outer, _rw, _tw, _curve in outer_specs:
        for amount in (0.62, 0.86):
            bead_positions.append((cx + math.cos(angle) * outer * amount, cy + math.sin(angle) * outer * amount, 6.5 if amount > 0.8 else 4.5))
    for angle, _inner, outer, _rw, _tw, _curve in inner_specs:
        bead_positions.append((cx + math.cos(angle) * outer * 0.84, cy + math.sin(angle) * outer * 0.84, 4.8))
    for bx, by, radius in bead_positions:
        ellipse(d_detail, bx, by, radius + 2.8, radius + 1.8, (39, 80, 80, 210), scale=scale)
        ellipse(d_detail, bx, by, radius, radius * 0.74, (82, 226, 224, 235), outline=(15, 78, 83, 240), width=2, scale=scale)
        ellipse(d_detail, bx - radius * 0.22, by - radius * 0.24, radius * 0.32, radius * 0.22, (199, 255, 247, 190), scale=scale)

    # Low-frequency flesh markings add validation detail without producing noisy tentacle hair.
    for _ in range(430):
        angle = RNG.uniform(0, math.tau)
        radius = RNG.uniform(70, 268)
        x = cx + math.cos(angle) * radius * RNG.uniform(0.86, 1.06)
        y = cy + math.sin(angle) * radius * RNG.uniform(0.58, 0.88)
        if not (420 <= x <= 1110 and 280 <= y <= 830):
            continue
        color = RNG.choice([
            (238, 190, 140, 80),
            (97, 67, 62, 90),
            (147, 185, 160, 75),
            (51, 86, 84, 82),
        ])
        r = RNG.uniform(1.3, 3.2)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.5, 1.1), color, scale=scale)

    # Attached column ridges are visible crop zones for retraction/clamp motion.
    for offset in (-78, -48, -18, 16, 48, 78):
        line(d_detail, [(746 + offset * 0.5, 614), (746 + offset, 780)], (164, 150, 104, 145), 5, scale)
        line(d_detail, [(750 + offset * 0.45, 622), (750 + offset + 8, 766)], (37, 50, 48, 135), 2.5, scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)

    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
