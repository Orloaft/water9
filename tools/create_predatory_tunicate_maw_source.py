#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Predatory Tunicate Maw.

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
OUT = ROOT / "tools/source-inbox/predatory-tunicate-maw.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(765014)


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


def smooth_path(points: list[tuple[float, float]], samples_per_segment: int = 20) -> list[tuple[float, float]]:
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
                pixels[x, y] = (25, 32, 29, 255)

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

    outline = (20, 34, 35, 255)
    ivory = (213, 211, 179, 255)
    amber = (188, 142, 78, 255)
    olive = (128, 145, 105, 255)
    cold = (111, 176, 185, 255)
    shadow_blue = (65, 95, 100, 255)

    # Anchor foot and flexible stalk establish sessile tunicate anatomy.
    ellipse(d_body, 598, 788, 238, 66, (74, 91, 72, 255), outline=outline, width=8, scale=scale)
    ellipse(d_body, 614, 772, 156, 42, (122, 137, 94, 255), outline=(40, 58, 54, 230), width=5, scale=scale)

    stalk_left = [(540, 746), (508, 652), (548, 552), (620, 482), (706, 452)]
    stalk_right = [(672, 742), (670, 650), (704, 558), (780, 492), (860, 480)]
    polygon(d_body, stalk_left + stalk_right[::-1], (125, 155, 133, 255), outline=outline, scale=scale)
    for offset in (-58, -24, 12, 48):
        line(d_detail, [(610 + offset * 0.2, 744), (620 + offset, 610), (710 + offset * 0.55, 482)], (211, 218, 174, 120), 5, scale)
        line(d_detail, [(626 + offset * 0.18, 742), (646 + offset, 612), (728 + offset * 0.5, 488)], (38, 72, 74, 120), 2.5, scale)

    # Main gelatin tunic body is opaque enough for game scale, with internal folds.
    body_shape = [
        (696, 352), (840, 248), (1032, 282), (1198, 416), (1218, 592),
        (1092, 726), (892, 736), (740, 636), (662, 492),
    ]
    polygon(d_body, body_shape, (164, 186, 165, 255), outline=outline, scale=scale)
    ellipse(d_body, 926, 492, 246, 204, (188, 199, 172, 255), outline=(33, 58, 59, 235), width=7, scale=scale)
    ellipse(d_detail, 874, 512, 122, 142, (117, 152, 146, 150), outline=(48, 83, 83, 140), width=3, scale=scale)
    ellipse(d_detail, 962, 546, 78, 92, (153, 116, 83, 165), outline=(74, 61, 51, 150), width=3, scale=scale)

    # Open paired siphon mouth: thick upper/lower lobes with a dark bite lane.
    upper_lobe = [
        (874, 330), (1014, 246), (1196, 284), (1320, 392),
        (1286, 484), (1102, 444), (948, 426),
    ]
    lower_lobe = [
        (910, 532), (1084, 540), (1284, 590), (1352, 700),
        (1214, 780), (1004, 728), (860, 642),
    ]
    polygon(d_body, upper_lobe, ivory, outline=outline, scale=scale)
    polygon(d_body, lower_lobe, (199, 188, 143, 255), outline=outline, scale=scale)
    ellipse(d_body, 1128, 506, 218, 116, (96, 104, 91, 255), outline=(42, 52, 49, 255), width=7, scale=scale)
    ellipse(d_body, 1142, 512, 142, 72, (17, 20, 22, 255), outline=(57, 75, 73, 255), width=5, scale=scale)
    ellipse(d_detail, 1136, 512, 72, 34, (5, 7, 9, 255), scale=scale)

    for index in range(20):
        angle = math.tau * index / 20
        root = (1126 + math.cos(angle) * 74, 510 + math.sin(angle) * 38)
        tip = (1126 + math.cos(angle) * 168, 510 + math.sin(angle) * 86)
        line(d_detail, [root, tip], (220, 211, 166, 150), 5, scale)
        ellipse(d_detail, tip[0], tip[1], 8, 5, amber if index % 2 else cold, outline=(44, 70, 69, 180), width=1, scale=scale)

    for path in [
        [(922, 350), (1040, 316), (1206, 366), (1284, 424)],
        [(924, 620), (1060, 650), (1212, 680), (1304, 704)],
        [(934, 420), (1080, 446), (1250, 484)],
        [(948, 566), (1100, 566), (1264, 606)],
    ]:
        line(d_detail, path, (138, 116, 83, 175), 7, scale)
        line(d_detail, path, (237, 232, 184, 130), 3, scale)

    # Side siphon is attached to the body, not a separate creature.
    side_path = [(784, 430), (660, 386), (534, 414), (458, 474)]
    tapered_path(d_body, side_path, 56, 26, (153, 179, 158, 255), outline, scale)
    ellipse(d_body, 450, 478, 44, 32, (189, 199, 166, 255), outline=outline, width=5, scale=scale)
    ellipse(d_detail, 442, 480, 22, 14, (18, 22, 23, 255), outline=(70, 91, 88, 220), width=3, scale=scale)

    # Rim papillae and internal filter fan: danger read without hard teeth.
    for index in range(32):
        angle = math.radians(-132 + index * 258 / 31)
        x = 1128 + math.cos(angle) * 222
        y = 510 + math.sin(angle) * 126
        if x < 890:
            continue
        r = 5.5 + (index % 4)
        ellipse(d_detail, x, y, r, r * 0.72, (224, 218, 174, 235), outline=(55, 76, 72, 180), width=1, scale=scale)

    for index in range(15):
        x = 970 + index * 16
        line(d_detail, [(x, 590), (1058 + index * 9, 642), (1118 + index * 4, 690)], (87, 126, 124, 135), 4, scale)

    for _ in range(560):
        x = RNG.gauss(914, 202)
        y = RNG.gauss(528, 152)
        if not (430 <= x <= 1358 and 248 <= y <= 794):
            continue
        color = RNG.choice([(232, 229, 187, 72), (71, 128, 133, 78), (163, 127, 75, 75), (55, 75, 71, 88)])
        r = RNG.uniform(1.1, 3.6)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.45, 1.0), color, scale=scale)

    for cx, cy, rx, ry, color in [
        (804, 374, 22, 16, cold),
        (904, 306, 18, 13, amber),
        (1052, 320, 20, 14, cold),
        (1014, 692, 24, 18, amber),
        (788, 604, 18, 14, cold),
    ]:
        ellipse(d_detail, cx, cy, rx, ry, (color[0], color[1], color[2], 180), outline=(42, 76, 73, 175), width=2, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
