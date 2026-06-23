#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Tripod Stilt Stalker.

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
OUT = ROOT / "tools/source-inbox/tripod-stilt-stalker.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(319771)


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


def ribbon(axis: list[tuple[float, float]], widths: list[float]) -> list[tuple[float, float]]:
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
        left.append((point[0] + nx * widths[index], point[1] + ny * widths[index]))
        right.append((point[0] - nx * widths[index], point[1] - ny * widths[index]))
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
                pixels[x, y] = (13, 23, 28, 255)

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
        if len(component) < max(160, largest * 0.0015):
            for x, y in component:
                pixels[x, y] = MAGENTA


def tapered_ray(draw: ImageDraw.ImageDraw, root: tuple[float, float], tip: tuple[float, float], root_width: float, tip_width: float, fill, outline, scale: int) -> None:
    dx = tip[0] - root[0]
    dy = tip[1] - root[1]
    length = max(1, math.hypot(dx, dy))
    nx = -dy / length
    ny = dx / length
    points = [
        (root[0] + nx * root_width, root[1] + ny * root_width),
        (tip[0] + nx * tip_width, tip[1] + ny * tip_width),
        (tip[0] - nx * tip_width, tip[1] - ny * tip_width),
        (root[0] - nx * root_width, root[1] - ny * root_width),
    ]
    polygon(draw, points, fill, outline=outline, scale=scale)
    line(draw, [root, tip], (215, 237, 232, 145), max(2.5, root_width * 0.35), scale)


def curved_tapered_ray(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], root_width: float, tip_width: float, fill, outline, scale: int) -> None:
    path = smooth_path(points)
    for index, point in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [point, path[index + 1]], outline, width + 2.4, scale)
    for index, point in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [point, path[index + 1]], fill, width, scale)
    line(draw, path, (220, 239, 233, 190), max(2.0, root_width * 0.24), scale)


def fin_membrane(draw: ImageDraw.ImageDraw, root: tuple[float, float], tip: tuple[float, float], side: float, scale: int, bend: float = 0) -> None:
    dx = tip[0] - root[0]
    dy = tip[1] - root[1]
    length = max(1, math.hypot(dx, dy))
    nx = -dy / length * side
    ny = dx / length * side
    mid = (root[0] + dx * 0.52 + nx * (30 + bend), root[1] + dy * 0.52 + ny * (30 + bend))
    lower = (root[0] + dx * 0.82 + nx * 14, root[1] + dy * 0.82 + ny * 14)
    rib = (root[0] + dx * 0.32 + nx * (12 + bend * 0.45), root[1] + dy * 0.32 + ny * (12 + bend * 0.45))
    polygon(draw, [root, rib, mid, lower], (89, 136, 139, 245), outline=(34, 63, 70, 240), scale=scale)
    line(draw, smooth_path([root, rib, mid, lower], 10), (172, 218, 214, 205), 2.5, scale)


def axis_sample(axis: list[tuple[float, float]], widths: list[float]) -> tuple[float, float, float, float, float]:
    segment = RNG.randrange(len(axis) - 1)
    amount = RNG.random()
    x1, y1 = axis[segment]
    x2, y2 = axis[segment + 1]
    tx = x2 - x1
    ty = y2 - y1
    length = max(1, math.hypot(tx, ty))
    nx = -ty / length
    ny = tx / length
    x = x1 + tx * amount
    y = y1 + ty * amount
    width = widths[segment] + (widths[segment + 1] - widths[segment]) * amount
    return x, y, nx, ny, width


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)

    # Fish axis comes first. The stilt rays are fins growing from this body, not limbs.
    axis = [
        (304, 396), (426, 372), (560, 350), (704, 334), (844, 318),
        (974, 296), (1092, 268), (1184, 246),
    ]
    widths = [20, 32, 42, 49, 50, 44, 39, 40]
    torso = ribbon(axis, widths)
    polygon(d_body, torso, (121, 160, 154, 255), outline=(17, 38, 45, 255), scale=scale)
    line(d_body, smooth_path(axis, 16), (134, 174, 166, 255), 76, scale)
    line(d_body, smooth_path(axis, 16), (170, 202, 190, 230), 22, scale)

    # Tail membrane flag, directly attached to the rear axis.
    tail_flag = [(308, 390), (188, 324), (234, 398), (188, 474), (322, 424), (430, 370)]
    polygon(d_body, tail_flag, (76, 118, 126, 250), outline=(17, 39, 45, 250), scale=scale)
    line(d_detail, smooth_path([(202, 338), (306, 390), (204, 460)], 20), (208, 233, 226, 130), 4, scale)

    # Upturned head capsule and small mouth plate.
    head = [
        (1070, 236), (1140, 212), (1226, 212), (1302, 238), (1366, 288),
        (1326, 332), (1210, 342), (1110, 308),
    ]
    polygon(d_body, head, (138, 178, 169, 255), outline=(13, 34, 40, 255), scale=scale)
    ellipse(d_body, 1176, 266, 118, 57, (139, 180, 170, 255), outline=(13, 34, 40, 255), width=3, scale=scale)
    mouth = [(1256, 246), (1374, 250), (1410, 282), (1278, 286)]
    polygon(d_body, mouth, (21, 34, 38, 255), outline=(2, 8, 11, 255), scale=scale)
    lower_lip = [(1262, 286), (1394, 286), (1326, 324), (1208, 322)]
    polygon(d_body, lower_lip, (105, 151, 149, 250), outline=(15, 34, 39, 255), scale=scale)
    ellipse(d_body, 1190, 252, 12, 9, (207, 241, 234, 245), outline=(2, 8, 10, 255), width=3, scale=scale)
    ellipse(d_body, 1194, 252, 4, 4, (1, 5, 7, 255), scale=scale)
    ellipse(d_body, 1240, 265, 7, 5, (170, 218, 220, 240), outline=(2, 8, 10, 240), width=2, scale=scale)

    # Dorsal sail remains small and fish-like.
    sail = [(714, 286), (748, 230), (792, 190), (832, 246), (854, 286), (830, 322), (742, 326)]
    polygon(d_body, sail, (89, 136, 145, 250), outline=(18, 42, 49, 250), scale=scale)
    line(d_detail, smooth_path([(792, 194), (790, 252), (786, 322)], 14), (211, 234, 228, 120), 4, scale)
    line(d_detail, smooth_path([(746, 260), (792, 276), (844, 290)], 12), (47, 83, 91, 145), 4, scale)

    # Pelvic stilt roots are visibly under the torso. Tips do not imply a floor.
    left_root = (666, 370)
    right_root = (812, 356)
    caudal_root = (386, 394)
    left_tip = (512, 872)
    right_tip = (894, 870)
    caudal_tip = (334, 868)
    ray_fill = (178, 218, 211, 255)
    ray_outline = (26, 57, 65, 255)
    stilt_paths = [
        (caudal_root, [(386, 394), (366, 532), (352, 704), caudal_tip], -1, -8),
        (left_root, [(666, 370), (618, 520), (554, 690), left_tip], 1, 10),
        (right_root, [(812, 356), (836, 524), (870, 696), right_tip], -1, 8),
    ]
    for root, points, side, bend in stilt_paths:
        tip = points[-1]
        fin_membrane(d_body, root, tip, side, scale, bend=bend)
        curved_tapered_ray(d_body, points, 13, 5.5, ray_fill, ray_outline, scale)
        ellipse(d_body, root[0], root[1], 18, 13, (105, 149, 145, 245), outline=(18, 42, 49, 235), width=4, scale=scale)

    # Two sensory pectoral rays sweep ahead; they are thicker than hairlines and rooted at the gill area.
    pectoral_root = (1052, 314)
    upper_feeler = (1220, 130)
    lower_feeler = (1236, 552)
    upper_feeler_path = [(1052, 314), (1118, 254), (1166, 196), upper_feeler]
    lower_feeler_path = [(1052, 314), (1122, 378), (1176, 466), lower_feeler]
    fin_membrane(d_body, pectoral_root, upper_feeler, 1, scale, bend=8)
    fin_membrane(d_body, pectoral_root, lower_feeler, -1, scale, bend=8)
    curved_tapered_ray(d_body, upper_feeler_path, 9, 4.5, (173, 217, 214, 255), ray_outline, scale)
    curved_tapered_ray(d_body, lower_feeler_path, 10, 4.5, (173, 217, 214, 255), ray_outline, scale)
    ellipse(d_body, pectoral_root[0], pectoral_root[1], 21, 15, (95, 139, 141, 245), outline=(18, 42, 49, 235), width=4, scale=scale)

    # Cold blue biological points stay attached to anatomy and do not become baked VFX.
    for x, y, r in [(1008, 306, 5), (940, 320, 4), (870, 326, 3.5), (736, 344, 3.5), (592, 356, 3.5)]:
        ellipse(d_detail, x, y, r + 2, r + 1.5, (25, 75, 85, 165), scale=scale)
        ellipse(d_detail, x, y, r, r * 0.75, (96, 224, 232, 210), outline=(10, 65, 75, 215), width=2, scale=scale)

    # Low-frequency mottling and fin-ray segment bands.
    for _ in range(360):
        base_x, base_y, nx, ny, body_width = axis_sample(axis, widths)
        offset = RNG.uniform(-body_width * 0.62, body_width * 0.62)
        x = base_x + nx * offset + RNG.uniform(-8, 8)
        y = base_y + ny * offset + RNG.uniform(-6, 6)
        color = RNG.choice([
            (210, 236, 229, 78),
            (60, 96, 104, 90),
            (137, 175, 161, 82),
            (27, 50, 58, 82),
        ])
        r = RNG.uniform(1.0, 2.8)
        ellipse(d_detail, x, y, r, r * RNG.uniform(0.5, 1.0), color, scale=scale)

    for points in [path for _, path, _, _ in stilt_paths] + [upper_feeler_path, lower_feeler_path]:
        path = smooth_path(points, 14)
        for amount in (0.27, 0.49, 0.71):
            path_index = min(len(path) - 2, max(0, round((len(path) - 1) * amount)))
            x, y = path[path_index]
            nx, ny = path[path_index + 1]
            tangent = math.atan2(ny - y, nx - x) + math.pi / 2
            span = 10 if amount < 0.6 else 7
            line(
                d_detail,
                [(x - math.cos(tangent) * span, y - math.sin(tangent) * span), (x + math.cos(tangent) * span, y + math.sin(tangent) * span)],
                (49, 86, 94, 150),
                3.2,
                scale,
            )

    # Gill pores and body seams.
    for x, y in [(1032, 300), (1018, 312), (1002, 322), (986, 330)]:
        ellipse(d_detail, x, y, 4, 2.7, (10, 26, 32, 210), scale=scale)
    for x in (450, 570, 690, 812, 936):
        y = 350 + math.sin((x - 420) / 160) * -28
        line(d_detail, [(x, y - 38), (x + 10, y + 42)], (43, 82, 91, 122), 5, scale)
        line(d_detail, [(x + 4, y - 34), (x + 14, y + 36)], (212, 236, 228, 85), 2, scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)

    outline = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outline = ImageDraw.Draw(outline)
    polygon(d_outline, torso, (0, 0, 0, 0), outline=(3, 13, 17, 230), scale=scale)
    polygon(d_outline, head, (0, 0, 0, 0), outline=(3, 13, 17, 230), scale=scale)
    outline = outline.filter(ImageFilter.GaussianBlur(round(0.7 * scale)))
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
