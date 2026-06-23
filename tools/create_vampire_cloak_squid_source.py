#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Vampire Cloak Squid.

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
OUT = ROOT / "tools/source-inbox/vampire-cloak-squid.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(592317)


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


def smooth_path(points: list[tuple[float, float]], samples_per_segment: int = 18) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    padded = [points[0]] + points + [points[-1]]
    result: list[tuple[float, float]] = []
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1], padded[index], padded[index + 1], padded[index + 2]
        for step in range(samples_per_segment):
            t = step / samples_per_segment
            t2 = t * t
            t3 = t2 * t
            x = 0.5 * (
                (2 * p1[0])
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            y = 0.5 * (
                (2 * p1[1])
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            result.append((x, y))
    result.append(points[-1])
    return result


def tapered_path(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], root_width: float, tip_width: float, fill, outline, scale: int) -> None:
    path = smooth_path(points)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], outline, width + 5, scale)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], fill, width, scale)


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
                pixels[x, y] = (13, 14, 20, 255)

    seen = [[False] * width for _ in range(height)]
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            if seen[y][x] or background[y][x] or pixels[x, y][3] <= 12:
                continue
            component: list[tuple[int, int]] = []
            stack = [(x, y)]
            seen[y][x] = True
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height and not seen[ny][nx] and not background[ny][nx] and pixels[nx, ny][3] > 12:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            components.append(component)
    if not components:
        return
    largest = max(len(component) for component in components)
    for component in components:
        if len(component) < max(240, largest * 0.0018):
            for x, y in component:
                pixels[x, y] = MAGENTA


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)

    cx, cy = 770, 500
    outline = (11, 14, 20, 255)
    cloak_dark = (30, 19, 26, 255)
    cloak_mid = (76, 34, 42, 255)
    cloak_light = (118, 55, 52, 255)
    mantle = (43, 34, 42, 255)
    mantle_light = (86, 67, 66, 255)
    cyan = (61, 220, 231, 255)

    umbrella = []
    for index in range(38):
        angle = math.radians(210 + index * 120 / 37)
        rx = 324 + math.sin(index * 1.7) * 14
        ry = 284 + math.cos(index * 1.3) * 13
        umbrella.append((cx + math.cos(angle) * rx, cy + math.sin(angle) * ry + 64))
    umbrella = [(cx - 102, cy + 36), (cx - 72, cy - 96)] + umbrella + [(cx + 154, cy - 74), (cx + 166, cy + 60)]

    polygon(d_body, umbrella, cloak_dark, outline=outline, scale=scale)

    arm_specs = [
        (-2.40, 108, 340, 28, 12, -34),
        (-2.08, 104, 352, 30, 12, -18),
        (-1.76, 100, 360, 31, 11, -4),
        (-1.44, 100, 370, 30, 11, 12),
        (-1.12, 100, 374, 31, 11, 26),
        (-0.80, 104, 362, 30, 11, 30),
        (-0.48, 108, 348, 28, 10, 22),
        (-0.18, 112, 326, 27, 10, 10),
    ]
    roots: list[tuple[float, float]] = []
    tips: list[tuple[float, float]] = []
    for index, (angle, inner, outer, root_width, tip_width, bend) in enumerate(arm_specs):
        root = (cx + math.cos(angle) * inner, cy + math.sin(angle) * inner * 0.68 + 76)
        mid = (cx + math.cos(angle) * ((inner + outer) * 0.55) - math.sin(angle) * bend, cy + math.sin(angle) * ((inner + outer) * 0.55) * 0.78 + 96 + math.cos(angle) * bend * 0.28)
        tip = (cx + math.cos(angle) * outer, cy + math.sin(angle) * outer * 0.78 + 154)
        roots.append(root)
        tips.append(tip)
        fill = cloak_mid if index % 2 else cloak_light
        tapered_path(d_body, [root, mid, tip], root_width, tip_width, fill, outline, scale)
        line(d_detail, [root, mid, tip], (172, 92, 82, 150), 4.5, scale)

    for index, (a, b) in enumerate(zip(tips[:-1], tips[1:])):
        polygon(d_body, [roots[index], a, b, roots[index + 1]], (51, 27, 36, 220), outline=(24, 17, 24, 190), scale=scale)

    mantle_shape = [
        (cx - 122, cy - 150), (cx - 34, cy - 224), (cx + 92, cy - 196),
        (cx + 162, cy - 102), (cx + 142, cy + 36), (cx + 42, cy + 112),
        (cx - 90, cy + 78), (cx - 154, cy - 42),
    ]
    polygon(d_body, mantle_shape, mantle, outline=outline, scale=scale)
    ellipse(d_body, cx + 2, cy - 66, 116, 132, mantle, outline=outline, width=7, scale=scale)
    ellipse(d_detail, cx + 36, cy - 86, 62, 76, mantle_light, outline=(18, 19, 24, 210), width=3, scale=scale)

    fin_left = [(cx - 56, cy - 180), (cx - 174, cy - 238), (cx - 126, cy - 118)]
    fin_right = [(cx + 82, cy - 170), (cx + 210, cy - 198), (cx + 150, cy - 82)]
    polygon(d_body, fin_left, (67, 39, 48, 255), outline=outline, scale=scale)
    polygon(d_body, fin_right, (76, 42, 49, 255), outline=outline, scale=scale)

    ellipse(d_body, cx + 42, cy - 84, 35, 30, (183, 221, 219, 255), outline=outline, width=5, scale=scale)
    ellipse(d_body, cx + 106, cy - 68, 31, 27, (165, 211, 213, 255), outline=outline, width=5, scale=scale)
    ellipse(d_detail, cx + 49, cy - 80, 9, 8, (4, 11, 17, 255), scale=scale)
    ellipse(d_detail, cx + 112, cy - 65, 8, 7, (4, 11, 17, 255), scale=scale)
    ellipse(d_detail, cx + 72, cy + 4, 24, 16, (8, 9, 13, 255), outline=(94, 68, 61, 210), width=3, scale=scale)

    for index, tip in enumerate(tips):
        ellipse(d_detail, tip[0], tip[1], 12, 8, (18, 82, 93, 235), outline=outline, width=2, scale=scale)
        ellipse(d_detail, tip[0] - 2, tip[1] - 1, 7, 5, cyan, scale=scale)
        if index % 2 == 0:
            for amount in (0.34, 0.58, 0.78):
                root = roots[index]
                px = root[0] + (tip[0] - root[0]) * amount
                py = root[1] + (tip[1] - root[1]) * amount
                ellipse(d_detail, px, py, 4.5, 3.2, (50, 184, 196, 210), outline=(12, 57, 64, 180), width=1, scale=scale)

    for index in range(70):
        angle = math.radians(204 + index * 132 / 69)
        root = (cx + math.cos(angle) * 116, cy + math.sin(angle) * 72 + 62)
        tip = (cx + math.cos(angle) * (332 + (index % 4) * 11), cy + math.sin(angle) * (254 + (index % 3) * 8) + 112)
        if index % 5:
            line(d_detail, [root, tip], (130, 68, 71, 95), 2.4, scale)
        else:
            line(d_detail, [root, tip], (205, 116, 95, 100), 3.2, scale)

    for _ in range(480):
        x = RNG.gauss(cx, 205)
        y = RNG.gauss(cy + 62, 176)
        if not (390 <= x <= 1120 and 220 <= y <= 840):
            continue
        color = RNG.choice([(126, 65, 64, 72), (19, 20, 28, 95), (168, 93, 83, 70), (62, 171, 178, 72)])
        r = RNG.uniform(1.2, 3.4)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.55, 1.0), color, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
