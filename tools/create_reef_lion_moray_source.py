#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Reef Lion Moray.

This produces a project-bound source image for the Water 9 source review flow.
It is not an acceptance step.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/reef-lion-moray.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(811223)


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


def ribbon_points(axis: list[tuple[float, float]], widths: list[float]) -> list[tuple[float, float]]:
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(axis):
        if index == 0:
            tx = axis[1][0] - point[0]
            ty = axis[1][1] - point[1]
        elif index == len(axis) - 1:
            tx = point[0] - axis[index - 1][0]
            ty = point[1] - axis[index - 1][1]
        else:
            tx = axis[index + 1][0] - axis[index - 1][0]
            ty = axis[index + 1][1] - axis[index - 1][1]
        length = max(1, math.hypot(tx, ty))
        nx = -ty / length
        ny = tx / length
        width = widths[index]
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + right[::-1]


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
                pixels[x, y] = (8, 16, 20, 255)


def draw_fan(draw: ImageDraw.ImageDraw, root: tuple[float, float], rim: list[tuple[float, float]], fill, outline, scale: int, stripe_shift: int = 0) -> None:
    points = [root, *rim, root]
    polygon(draw, points, fill, outline=outline, scale=scale)
    for index, point in enumerate(rim):
        color = (226, 197, 112, 210) if index % 2 == stripe_shift else (27, 44, 47, 220)
        ray_mid = ((root[0] * 0.42) + (point[0] * 0.58), (root[1] * 0.42) + (point[1] * 0.58) + math.sin(index) * 10)
        line(draw, [root, ray_mid, point], color, 5.5 if index % 2 == stripe_shift else 4.2, scale)
    for left, right in zip(rim, rim[1:]):
        line(draw, [left, right], (232, 214, 149, 125), 4.2, scale)
    for index, point in enumerate(rim):
        if index % 2 == 0:
            ellipse(draw, point[0], point[1], 7, 5, (205, 184, 116, 125), outline=(25, 38, 39, 130), width=2, scale=scale)


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

    axis = [
        (154, 610), (258, 548), (386, 584), (520, 520), (664, 468),
        (820, 470), (956, 512), (1080, 494), (1190, 448), (1296, 460),
    ]
    widths = [28, 39, 52, 63, 72, 74, 68, 62, 68, 82]
    body_poly = ribbon_points(axis, widths)

    # Connected silhouette shadow stays under the creature body, not on the key.
    polygon(d_shadow, body_poly, (0, 8, 12, 170), scale=scale)
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(2.2 * scale)))
    image.alpha_composite(shadow)

    # Far pectoral fan, visibly rooted behind the gill pouch and partially behind the torso.
    far_root = (1104, 506)
    far_rim = [(950, 404), (984, 356), (1040, 328), (1108, 338), (1176, 374), (1240, 438), (1268, 490)]
    draw_fan(d_body, far_root, far_rim, (77, 118, 108, 232), (24, 39, 42, 245), scale, stripe_shift=1)

    # Dorsal venom fan shares roots along the eel back. Each membrane overlaps the next.
    dorsal_roots = [(390, 534), (482, 498), (582, 468), (690, 444), (800, 448), (912, 474), (1018, 492)]
    dorsal_tips = [(360, 392), (458, 344), (576, 326), (698, 318), (824, 346), (944, 382), (1046, 428)]
    for index in range(len(dorsal_roots) - 1):
        lower_mid = (
            (dorsal_roots[index][0] + dorsal_roots[index + 1][0]) / 2,
            (dorsal_roots[index][1] + dorsal_roots[index + 1][1]) / 2 + 18,
        )
        upper_mid = (
            (dorsal_tips[index][0] + dorsal_tips[index + 1][0]) / 2,
            (dorsal_tips[index][1] + dorsal_tips[index + 1][1]) / 2 + (12 if index % 2 else -4),
        )
        points = [dorsal_roots[index], dorsal_tips[index], upper_mid, dorsal_tips[index + 1], dorsal_roots[index + 1], lower_mid]
        fill = (128, 61, 53, 226) if index % 2 == 0 else (169, 93, 61, 224)
        polygon(d_body, points, fill, outline=(32, 31, 34, 240), scale=scale)
        line(d_body, [dorsal_roots[index], dorsal_tips[index]], (229, 202, 128, 215), 6, scale)
        line(d_body, [dorsal_roots[index + 1], dorsal_tips[index + 1]], (27, 42, 45, 220), 5, scale)

    # Continuous eel torso and tail.
    polygon(d_body, body_poly, (34, 76, 78, 255), outline=(5, 17, 21, 255), scale=scale)
    inner_axis = [(x, y - 4) for x, y in axis[1:-1]]
    line(d_detail, inner_axis, (95, 142, 130, 120), 18, scale)
    line(d_detail, [(188, 601), (292, 546), (406, 572), (536, 514), (676, 474), (814, 474), (950, 514), (1072, 496)], (187, 190, 126, 135), 8, scale)

    # Banded eel markings tie the fins, head, torso, and tail into one palette.
    bands = [
        ((236, 552), (204, 632), 18), ((356, 552), (332, 638), 20),
        ((500, 498), (504, 590), 22), ((648, 444), (666, 544), 20),
        ((798, 432), (814, 548), 22), ((938, 480), (914, 582), 20),
        ((1070, 466), (1088, 554), 22), ((1182, 416), (1208, 510), 20),
    ]
    for start, end, width_band in bands:
        line(d_detail, [start, end], (207, 105, 68, 190), width_band, scale)
        line(d_detail, [(start[0] + 6, start[1]), (end[0] + 6, end[1])], (226, 201, 118, 130), max(3, width_band * 0.22), scale)

    # Tail blade remains connected to the eel axis.
    tail = [(116, 608), (66, 532), (156, 566), (210, 600), (150, 682), (78, 680)]
    polygon(d_body, tail, (59, 92, 88, 250), outline=(7, 20, 24, 255), scale=scale)
    line(d_detail, [(96, 552), (154, 606), (92, 670)], (221, 198, 124, 160), 5, scale)

    # Head plate, jaws, inner bite mouth, and gill pouch are explicit crop zones.
    head = [(1168, 398), (1268, 372), (1382, 410), (1450, 474), (1402, 552), (1282, 574), (1174, 526), (1128, 456)]
    polygon(d_body, head, (56, 94, 89, 255), outline=(5, 17, 21, 255), scale=scale)
    upper_jaw = [(1298, 400), (1458, 405), (1504, 454), (1370, 462), (1268, 444)]
    lower_jaw = [(1264, 505), (1368, 536), (1490, 515), (1438, 578), (1306, 592), (1204, 540)]
    polygon(d_body, upper_jaw, (83, 122, 109, 255), outline=(7, 19, 22, 255), scale=scale)
    polygon(d_body, lower_jaw, (66, 104, 99, 255), outline=(7, 19, 22, 255), scale=scale)
    mouth = [(1298, 456), (1440, 468), (1434, 512), (1304, 514), (1226, 490)]
    polygon(d_body, mouth, (5, 9, 12, 255), outline=(182, 190, 137, 175), scale=scale)
    ellipse(d_body, 1182, 509, 54, 40, (42, 82, 82, 255), outline=(14, 31, 34, 255), width=5, scale=scale)
    ellipse(d_body, 1262, 424, 12, 9, (198, 224, 188, 255), outline=(2, 8, 10, 255), width=3, scale=scale)
    ellipse(d_body, 1265, 425, 4, 4, (1, 6, 7, 255), scale=scale)

    # Near pectoral fan is in front but still rooted behind the gill pouch.
    near_root = (1128, 548)
    near_rim = [(962, 590), (992, 644), (1054, 700), (1138, 724), (1226, 704), (1292, 652), (1334, 588)]
    draw_fan(d_body, near_root, near_rim, (92, 135, 113, 242), (18, 33, 36, 255), scale, stripe_shift=0)
    ellipse(d_body, near_root[0], near_root[1], 42, 25, (44, 84, 83, 255), outline=(10, 26, 29, 255), width=4, scale=scale)

    # Cheek frills are short, connected, and intentionally not feather-like.
    for angle in (-42, -24, -8, 12, 31):
        root = (1214, 506)
        tip = (root[0] + math.cos(math.radians(angle)) * 96, root[1] + math.sin(math.radians(angle)) * 74)
        line(d_detail, [root, tip], (214, 190, 112, 210), 6, scale)
        line(d_detail, [root, tip], (37, 55, 51, 170), 2.5, scale)

    # Gill pores, jaw hinge, and stripe details.
    for x, y in [(1158, 472), (1168, 486), (1178, 500), (1187, 516)]:
        ellipse(d_detail, x, y, 4, 3, (7, 19, 22, 220), scale=scale)
    ellipse(d_detail, 1194, 457, 18, 16, (202, 177, 104, 150), outline=(31, 43, 42, 210), width=4, scale=scale)
    for x, y in [(1322, 422), (1368, 434), (1396, 488), (1346, 544), (1250, 538)]:
        ellipse(d_detail, x, y, 5, 3, (223, 208, 137, 160), scale=scale)

    # Low-frequency scales and scratches add entropy without creating detached anatomy.
    for _ in range(520):
        point = RNG.choice(axis[1:-1])
        x = point[0] + RNG.uniform(-64, 64)
        y = point[1] + RNG.uniform(-48, 48)
        color = RNG.choice([
            (209, 200, 128, 70),
            (17, 37, 40, 85),
            (119, 161, 138, 82),
            (192, 88, 61, 64),
        ])
        r = RNG.uniform(1.1, 3.0)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.55, 1.1), color, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)

    # Crisp final outline after all connected anatomy is composited.
    outline = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outline = ImageDraw.Draw(outline)
    polygon(d_outline, body_poly, (0, 0, 0, 0), outline=(3, 12, 16, 235), scale=scale)
    polygon(d_outline, head, (0, 0, 0, 0), outline=(3, 12, 16, 235), scale=scale)
    outline = outline.filter(ImageFilter.GaussianBlur(round(0.75 * scale)))
    composite = Image.new("RGBA", image.size, MAGENTA)
    composite.alpha_composite(outline)
    composite.alpha_composite(image)

    composite = composite.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
