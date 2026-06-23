#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Coronate Sting Crown.

This creates a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/coronate-sting-crown.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(431772)


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


def normal_at(path: list[tuple[float, float]], index: int) -> tuple[float, float]:
    if index == 0:
        dx = path[1][0] - path[0][0]
        dy = path[1][1] - path[0][1]
    elif index == len(path) - 1:
        dx = path[-1][0] - path[-2][0]
        dy = path[-1][1] - path[-2][1]
    else:
        dx = path[index + 1][0] - path[index - 1][0]
        dy = path[index + 1][1] - path[index - 1][1]
    length = max(0.001, math.hypot(dx, dy))
    return (-dy / length, dx / length)


def ribbon_polygon(
    path: list[tuple[float, float]],
    root_width: float,
    mid_width: float,
    tip_width: float,
) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 20)
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(smooth):
        amount = index / max(1, len(smooth) - 1)
        if amount < 0.48:
            width = root_width + (mid_width - root_width) * (amount / 0.48)
        else:
            width = mid_width + (tip_width - mid_width) * ((amount - 0.48) / 0.52)
        width *= 1 + 0.08 * math.sin(amount * math.pi * 4)
        nx, ny = normal_at(smooth, index)
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + list(reversed(right))


def draw_ribbon(
    draw: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    root_width: float,
    mid_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
    center_color=None,
) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 22)
    polygon(draw, ribbon_polygon(path, root_width + 4, mid_width + 4, tip_width + 3), outline, scale=scale)
    polygon(draw, ribbon_polygon(path, root_width, mid_width, tip_width), fill, scale=scale)
    if center_color:
        line(detail, smooth, center_color, max(3, root_width * 0.22), scale)
    return smooth


def lappet_points(cx: float, cy: float, angle: float, inner: float, outer: float, width: float) -> list[tuple[float, float]]:
    ux = math.cos(angle)
    uy = math.sin(angle)
    px = -uy
    py = ux
    root = (cx + ux * inner, cy + uy * inner)
    tip = (cx + ux * outer, cy + uy * outer)
    waist = (cx + ux * ((inner + outer) * 0.5), cy + uy * ((inner + outer) * 0.5))
    return [
        (root[0] + px * width * 0.7, root[1] + py * width * 0.7),
        (waist[0] + px * width, waist[1] + py * width),
        (tip[0] + px * width * 0.36, tip[1] + py * width * 0.36),
        (tip[0] - px * width * 0.36, tip[1] - py * width * 0.36),
        (waist[0] - px * width, waist[1] - py * width),
        (root[0] - px * width * 0.7, root[1] - py * width * 0.7),
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
                pixels[x, y] = (33, 17, 22, 255)

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
        if len(component) < max(180, largest * 0.0012):
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

    cx, cy = 768, 340
    outline = (22, 12, 18, 255)
    dark = (42, 18, 25, 255)
    dark_mid = (67, 25, 31, 255)
    crimson = (124, 37, 39, 255)
    deep_crimson = (88, 28, 34, 255)
    warm = (171, 75, 56, 255)
    ivory = (214, 195, 151, 255)
    cyan = (81, 222, 224, 255)
    cyan_dark = (17, 80, 84, 255)

    # Four crop-safe trailing tentacles first, so each root is visibly tucked under the bell skirt.
    tentacle_specs = [
        ((610, 496), [(578, 570), (520, 680), (474, 810), (430, 934)]),
        ((710, 520), [(694, 636), (668, 760), (650, 902), (620, 988)]),
        ((822, 520), [(832, 642), (858, 770), (884, 908), (908, 988)]),
        ((930, 496), [(968, 590), (1026, 706), (1078, 836), (1126, 944)]),
    ]
    tentacle_paths: list[list[tuple[float, float]]] = []
    for root, rest in tentacle_specs:
        path = [root] + rest
        tentacle_paths.append(
            draw_ribbon(d_body, d_detail, path, 23, 28, 14, deep_crimson, outline, scale, (138, 66, 61, 190))
        )

    # Thick oral arms occupy the foreground and remain separate enough to crop.
    oral_paths = [
        [(690, 466), (628, 560), (588, 676), (610, 794)],
        [(768, 476), (742, 594), (746, 732), (742, 850)],
        [(846, 466), (916, 564), (940, 686), (916, 804)],
        [(742, 488), (694, 602), (680, 724), (710, 828)],
        [(794, 488), (848, 604), (856, 720), (832, 832)],
    ]
    for index, path in enumerate(oral_paths):
        fill = warm if index in (1, 3) else crimson
        draw_ribbon(d_body, d_detail, path, 38, 44, 22, fill, outline, scale, (226, 161, 111, 175))

    # Lower bell skirt is scalloped and thick, providing visible hinge zones.
    skirt_points = [
        (458, 382), (510, 444), (578, 494), (658, 526), (746, 540),
        (842, 534), (934, 500), (1018, 446), (1084, 382),
        (1028, 454), (946, 526), (840, 578), (736, 588), (626, 564),
        (530, 500),
    ]
    polygon(d_body, skirt_points, dark_mid, outline=outline, scale=scale)

    # Chunky crown lappets around the lower rim. These are deliberately broad,
    # avoiding the common failure mode of thin tentacle/noise curtains.
    for index, angle in enumerate([2.74, 2.38, 2.02, 1.68, 1.32, 0.98, 0.62, 0.28]):
        points = lappet_points(cx, cy + 60, angle, 246, 320 + (index % 2) * 14, 31)
        fill = crimson if index % 2 else deep_crimson
        polygon(d_body, points, fill, outline=outline, scale=scale)
        line(d_detail, [points[0], ((points[1][0] + points[4][0]) / 2, (points[1][1] + points[4][1]) / 2), points[2]], ivory, 4, scale)

    # Main domed bell, deep groove, and compact Atolla-like crown read.
    bell_back = [
        (420, 378), (448, 264), (530, 160), (650, 94), (776, 76),
        (916, 104), (1032, 178), (1108, 286), (1116, 386),
        (1030, 434), (892, 454), (760, 458), (620, 442), (502, 418),
    ]
    polygon(d_body, bell_back, dark, outline=outline, scale=scale)
    ellipse(d_body, cx, cy - 34, 286, 192, (76, 25, 33, 255), outline=outline, width=8, scale=scale)
    ellipse(d_body, cx + 18, cy - 72, 210, 118, (108, 34, 38, 255), outline=(45, 18, 25, 230), width=4, scale=scale)
    ellipse(d_body, cx + 28, cy - 96, 124, 55, (155, 58, 47, 255), scale=scale)
    ellipse(d_body, cx - 34, cy + 24, 250, 44, (34, 17, 24, 255), outline=(127, 61, 53, 230), width=6, scale=scale)
    line(d_detail, [(506, 332), (612, 376), (764, 396), (920, 374), (1042, 326)], (215, 177, 133, 175), 7, scale)
    line(d_detail, [(534, 292), (660, 332), (776, 348), (900, 330), (1000, 288)], (31, 15, 22, 180), 6, scale)

    # Crown-rim beads and embedded sting cues stay on the anatomy, with no baked external halo.
    bead_centers: list[tuple[float, float]] = []
    for index in range(18):
        amount = index / 17
        x = 500 + amount * 540
        y = 386 + math.sin(amount * math.pi) * 42 + math.sin(index * 1.6) * 7
        bead_centers.append((x, y))
    for path in tentacle_paths:
        for fraction in (0.42, 0.67, 0.88):
            index = min(len(path) - 1, max(0, round(fraction * (len(path) - 1))))
            bead_centers.append(path[index])
    for bx, by in bead_centers:
        ellipse(d_detail, bx, by, 12, 9, cyan_dark, outline=(8, 42, 48, 255), width=2, scale=scale)
        ellipse(d_detail, bx - 1, by - 1, 7, 5, cyan, scale=scale)
        ellipse(d_detail, bx - 3, by - 3, 2.2, 1.5, (203, 255, 247, 220), scale=scale)

    # Bell grooves and lappet segmentation prove this is not a smooth generic umbrella jellyfish.
    for index in range(15):
        amount = index / 14
        angle = math.pi * (0.12 + amount * 0.76)
        root = (cx + math.cos(angle) * 78, cy + math.sin(angle) * 25)
        end = (cx + math.cos(angle) * 288, cy + math.sin(angle) * 132)
        line(d_detail, [root, end], (207, 143, 100, 120), 4.2, scale)
        if index % 2 == 0:
            line(d_detail, [(root[0] + 8, root[1] + 4), (end[0] + 10, end[1] + 5)], (29, 15, 23, 135), 2.8, scale)

    # Visible underside root nodes for arms and tentacles.
    for root_x, root_y in [(610, 496), (710, 520), (822, 520), (930, 496), (690, 466), (768, 476), (846, 466)]:
        ellipse(d_body, root_x, root_y, 34, 24, (65, 27, 34, 255), outline=outline, width=4, scale=scale)
        ellipse(d_detail, root_x - 4, root_y - 5, 15, 8, (188, 83, 63, 170), scale=scale)

    # Controlled texture: enough entropy for review, no loose particles outside the body.
    for _ in range(520):
        x = RNG.uniform(460, 1070)
        y = RNG.uniform(120, 560)
        if ((x - cx) / 340) ** 2 + ((y - (cy - 18)) / 230) ** 2 > 1.1:
            continue
        color = RNG.choice(
            [
                (33, 14, 22, 105),
                (119, 45, 42, 115),
                (188, 89, 59, 95),
                (213, 188, 138, 80),
                (52, 127, 124, 90),
            ]
        )
        ellipse(d_detail, x, y, RNG.uniform(1.5, 4.8), RNG.uniform(1.0, 3.2), color, scale=scale)

    body = body.filter(ImageFilter.GaussianBlur(radius=0.1 * scale))
    image.alpha_composite(body)
    image.alpha_composite(detail)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(image)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
