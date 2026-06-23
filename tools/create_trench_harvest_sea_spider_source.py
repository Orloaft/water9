#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Trench Harvest Sea Spider.

This produces a mechanically valid source-review candidate. It does not mark
the creature as visually approved or production accepted.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/trench-harvest-sea-spider.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(318754)


def scaled(points: list[tuple[float, float]], scale: int) -> list[tuple[int, int]]:
    return [(round(x * scale), round(y * scale)) for x, y in points]


def ellipse(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    fill,
    outline=None,
    width: int = 1,
    scale: int = 1,
) -> None:
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


def draw_tapered_path(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    root_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
) -> None:
    path = smooth_path(points, 16)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], outline, width + 3.2, scale)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], fill, width, scale)
    line(draw, path, (220, 239, 232, 180), max(2.2, root_width * 0.2), scale)


def claw(draw: ImageDraw.ImageDraw, tip: tuple[float, float], angle: float, scale: int) -> None:
    tx, ty = tip
    left = angle - 0.75
    right = angle + 0.75
    points = [
        (tx, ty),
        (tx - math.cos(left) * 32, ty - math.sin(left) * 32),
        (tx - math.cos(angle) * 15, ty - math.sin(angle) * 17),
        (tx - math.cos(right) * 32, ty - math.sin(right) * 32),
    ]
    polygon(draw, points, (191, 221, 209, 255), outline=(22, 47, 54, 255), scale=scale)


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
                pixels[x, y] = (15, 26, 30, 255)

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
        if len(component) < max(180, largest * 0.0015):
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

    body_fill = (126, 158, 159, 255)
    body_shadow = (61, 91, 99, 255)
    joint_fill = (83, 119, 126, 255)
    limb_fill = (150, 190, 184, 255)
    limb_outline = (18, 42, 48, 255)

    # Tiny pycnogonid core: intentionally much smaller than the leg span.
    core_center = (720, 506)
    ellipse(d_body, 720, 506, 118, 54, body_fill, outline=(13, 34, 39, 255), width=5, scale=scale)
    ellipse(d_body, 660, 510, 62, 42, body_shadow, outline=(13, 34, 39, 245), width=3, scale=scale)
    ellipse(d_body, 790, 498, 70, 40, (145, 177, 171, 255), outline=(13, 34, 39, 245), width=3, scale=scale)
    ellipse(d_body, 706, 450, 52, 30, (96, 132, 139, 255), outline=(15, 39, 46, 255), width=4, scale=scale)
    ellipse(d_body, 706, 434, 34, 17, (168, 198, 188, 255), outline=(17, 44, 50, 235), width=2, scale=scale)

    # Small head nub and soft forward siphon/proboscis. No eyes, fangs, or weapon barrel.
    ellipse(d_body, 846, 498, 48, 30, (138, 170, 165, 255), outline=(13, 34, 39, 255), width=4, scale=scale)
    proboscis = [
        (876, 486),
        (958, 452),
        (1068, 462),
        (1190, 508),
        (1104, 548),
        (986, 530),
        (900, 512),
    ]
    polygon(d_body, proboscis, (135, 174, 169, 255), outline=(15, 39, 45, 255), scale=scale)
    draw_tapered_path(d_body, [(872, 498), (978, 476), (1088, 492), (1184, 512)], 28, 15, (154, 192, 184, 245), (15, 39, 45, 255), scale)
    ellipse(d_body, 1184, 514, 20, 13, (34, 59, 64, 255), outline=(7, 20, 25, 255), width=3, scale=scale)
    line(d_detail, smooth_path([(890, 498), (1000, 486), (1108, 506), (1180, 512)], 18), (211, 236, 228, 160), 4, scale)

    # Eight crop-safe legs. Root joints are explicit so articulation crops can find them.
    leg_specs = [
        ((622, 474), [(622, 474), (520, 372), (360, 320), (190, 300)], -2.92),
        ((680, 458), [(680, 458), (642, 326), (548, 224), (394, 172)], -2.32),
        ((754, 456), [(754, 456), (818, 326), (944, 234), (1118, 178)], -0.86),
        ((806, 476), [(806, 476), (954, 414), (1122, 376), (1342, 356)], -0.18),
        ((616, 532), [(616, 532), (486, 610), (340, 710), (188, 828)], 2.52),
        ((682, 552), [(682, 552), (618, 686), (510, 802), (360, 902)], 2.18),
        ((760, 552), [(760, 552), (834, 680), (960, 790), (1136, 876)], 0.84),
        ((812, 526), [(812, 526), (978, 578), (1160, 650), (1360, 744)], 0.34),
    ]
    for root, points, tip_angle in leg_specs:
        draw_tapered_path(d_body, points, 23, 9, limb_fill, limb_outline, scale)
        for amount in (0.0, 0.36, 0.68):
            path = smooth_path(points, 16)
            index = min(len(path) - 1, round((len(path) - 1) * amount))
            x, y = path[index]
            radius = 26 if amount == 0 else 20 if amount < 0.5 else 15
            ellipse(d_body, x, y, radius, radius * 0.78, joint_fill, outline=(16, 39, 45, 255), width=4, scale=scale)
        claw(d_body, points[-1], tip_angle, scale)

    # Oviger-like feelers under the head help the marine read without becoming webbing.
    for start_x, end_x, end_y in [(860, 940, 594), (834, 888, 606), (804, 830, 620)]:
        draw_tapered_path(
            d_body,
            [(start_x, 532), ((start_x + end_x) / 2, 572), (end_x, end_y)],
            10,
            5,
            (173, 210, 202, 255),
            (22, 48, 54, 255),
            scale,
        )

    # Shared cold biological details remain attached to anatomy.
    for _ in range(390):
        cx = RNG.gauss(core_center[0], 88)
        cy = RNG.gauss(core_center[1], 42)
        if not (590 <= cx <= 900 and 420 <= cy <= 580):
            continue
        color = RNG.choice([
            (209, 235, 228, 100),
            (80, 118, 124, 120),
            (34, 62, 70, 110),
            (150, 184, 172, 100),
        ])
        radius = RNG.uniform(1.2, 3.2)
        ellipse(d_detail, cx, cy, radius, radius * RNG.uniform(0.5, 1.0), color, scale=scale)

    for x, y, r in [(910, 514, 5), (846, 530, 4), (780, 518, 4), (704, 520, 4), (660, 494, 3.5)]:
        ellipse(d_detail, x, y, r + 3, r + 2, (22, 76, 86, 165), scale=scale)
        ellipse(d_detail, x, y, r, r * 0.75, (98, 226, 230, 215), outline=(8, 65, 76, 230), width=2, scale=scale)

    for root, points, _tip_angle in leg_specs:
        path = smooth_path(points, 16)
        for amount in (0.24, 0.52, 0.78):
            index = min(len(path) - 2, round((len(path) - 1) * amount))
            x, y = path[index]
            nx, ny = path[index + 1]
            normal = math.atan2(ny - y, nx - x) + math.pi / 2
            span = 15 if amount < 0.6 else 10
            line(
                d_detail,
                [(x - math.cos(normal) * span, y - math.sin(normal) * span), (x + math.cos(normal) * span, y + math.sin(normal) * span)],
                (45, 82, 90, 150),
                3.2,
                scale,
            )

    image.alpha_composite(body)
    image.alpha_composite(detail)

    outline = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outline = ImageDraw.Draw(outline)
    ellipse(d_outline, 756, 500, 132, 68, (0, 0, 0, 0), outline=(3, 13, 17, 230), width=5, scale=scale)
    ellipse(d_outline, 884, 494, 52, 34, (0, 0, 0, 0), outline=(3, 13, 17, 230), width=5, scale=scale)
    polygon(d_outline, proboscis, (0, 0, 0, 0), outline=(3, 13, 17, 230), scale=scale)
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
