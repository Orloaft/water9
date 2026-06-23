#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Black Coral Gate.

This creates a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/black-coral-gate.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(128447)


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


def tapered_polygon(
    path: list[tuple[float, float]],
    root_width: float,
    tip_width: float,
    pulse: float = 0.1,
) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 20)
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(smooth):
        amount = index / max(1, len(smooth) - 1)
        width = root_width + (tip_width - root_width) * amount
        width *= 1 + pulse * math.sin(amount * math.pi * 5.0)
        nx, ny = normal_at(smooth, index)
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + list(reversed(right))


def draw_tapered_branch(
    draw: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    root_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
    vein: bool = True,
) -> None:
    smooth = smooth_path(path, 18)
    polygon(draw, tapered_polygon(path, root_width + 4, tip_width + 3, 0.08), outline, scale=scale)
    polygon(draw, tapered_polygon(path, root_width, tip_width, 0.11), fill, scale=scale)
    if vein:
        line(detail, smooth, (22, 57, 52, 190), max(2.4, root_width * 0.22), scale)
        for step in range(9, len(smooth) - 8, 14):
            amount = step / max(1, len(smooth) - 1)
            point = smooth[step]
            nx, ny = normal_at(smooth, step)
            tooth = 10 + (1 - amount) * 12
            for side in (-1, 1):
                base = (point[0] + nx * side * root_width * 0.6, point[1] + ny * side * root_width * 0.6)
                tip = (base[0] + nx * side * tooth, base[1] + ny * side * tooth)
                line(detail, [base, tip], (204, 197, 146, 230), 4.4, scale)


def draw_polyps(draw: ImageDraw.ImageDraw, centers: list[tuple[float, float]], scale: int) -> None:
    for index, (cx, cy) in enumerate(centers):
        rx = 8 + (index % 3) * 2
        ry = 6 + (index % 2) * 2
        ellipse(draw, cx, cy, rx + 3, ry + 3, (15, 45, 42, 255), scale=scale)
        ellipse(draw, cx, cy, rx, ry, (53, 160, 155, 255), scale=scale)
        ellipse(draw, cx - rx * 0.22, cy - ry * 0.25, rx * 0.38, ry * 0.28, (161, 231, 218, 255), scale=scale)


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
                pixels[x, y] = (8, 19, 19, 255)

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
        if len(component) < max(220, largest * 0.0014):
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

    outline = (5, 15, 17, 255)
    charcoal = (16, 34, 35, 255)
    charcoal_mid = (26, 54, 52, 255)
    oxidized = (47, 91, 74, 255)
    dark_green = (23, 66, 57, 255)
    bone = (205, 198, 146, 255)
    ivory = (224, 219, 173, 255)

    # Root mats anchor the organism. These are broad and connected to the pillars,
    # so the silhouette reads as one living colony rather than separate props.
    root_paths = [
        [(464, 748), (336, 820), (218, 888), (114, 930)],
        [(500, 776), (416, 890), (330, 950), (252, 986)],
        [(424, 768), (300, 752), (184, 736), (84, 720)],
        [(1060, 748), (1194, 818), (1320, 886), (1438, 930)],
        [(1028, 776), (1114, 894), (1210, 954), (1306, 986)],
        [(1100, 768), (1228, 752), (1354, 736), (1462, 720)],
    ]
    for path in root_paths:
        draw_tapered_branch(d_body, d_detail, path, 28, 11, dark_green, outline, scale)

    # Main side pillars: asymmetric antipatharian trunks with a clear gate gap
    # between them. Keeping them separated prevents the small-scale read from
    # collapsing into a closed mask.
    left_pillar = [(430, 768), (390, 626), (412, 486), (490, 356), (622, 266), (718, 230)]
    right_pillar = [(1098, 768), (1138, 626), (1112, 486), (1038, 356), (904, 266), (810, 230)]
    draw_tapered_branch(d_body, d_detail, left_pillar, 52, 34, charcoal_mid, outline, scale)
    draw_tapered_branch(d_body, d_detail, right_pillar, 52, 34, charcoal_mid, outline, scale)

    # Crown bridge is a living crescent. It visibly connects both pillars while
    # leaving the feeding lane open beneath it.
    crown_top = [(596, 264), (676, 198), (770, 176), (858, 198), (938, 264)]
    crown_lower = [(636, 332), (704, 296), (770, 286), (834, 296), (898, 332)]
    draw_tapered_branch(d_body, d_detail, crown_top, 42, 40, charcoal_mid, outline, scale)
    draw_tapered_branch(d_body, d_detail, crown_lower, 28, 24, oxidized, outline, scale)

    # Tissue plates fuse pillars, hinge knots, and crown into one colony but do
    # not fill the center of the arch.
    bridge_blob = [
        (568, 310),
        (640, 230),
        (760, 184),
        (884, 230),
        (958, 310),
        (914, 356),
        (832, 334),
        (770, 322),
        (700, 334),
        (616, 356),
    ]
    polygon(d_body, bridge_blob, (19, 44, 43, 255), outline=outline, scale=scale)
    ellipse(d_body, 764, 280, 82, 34, (34, 76, 68, 255), outline=outline, width=5, scale=scale)

    # Hinge knots are visually dominant, because they are the attack telegraph.
    hinge_centers = [(552, 398), (976, 398)]
    for cx, cy in hinge_centers:
        ellipse(d_body, cx, cy, 76, 58, (25, 59, 54, 255), outline=outline, width=6, scale=scale)
        ellipse(d_body, cx, cy, 44, 32, (44, 93, 78, 255), outline=(9, 31, 31, 255), width=3, scale=scale)
        draw_polyps(
            d_detail,
            [
                (cx - 26, cy - 20),
                (cx + 2, cy - 26),
                (cx + 30, cy - 14),
                (cx - 22, cy + 10),
                (cx + 18, cy + 18),
            ],
            scale,
        )

    # Central trap bars grow directly from crown sockets and stop above the
    # lower bite line. Each bar has a fleshy root pad to make it read as grown
    # tissue instead of detached hardware.
    for cx in [652, 712, 774, 836, 896]:
        ellipse(d_body, cx, 342 + math.sin(cx * 0.04) * 8, 28, 18, (37, 82, 71, 255), outline=outline, width=4, scale=scale)
    bar_specs = [
        [(652, 354), (626, 468), (648, 584), (608, 688)],
        [(712, 348), (700, 466), (690, 592), (676, 706)],
        [(774, 344), (778, 466), (762, 598), (774, 720)],
        [(836, 348), (856, 466), (844, 592), (862, 706)],
        [(896, 354), (928, 468), (904, 584), (940, 688)],
    ]
    for path in bar_specs:
        draw_tapered_branch(d_body, d_detail, path, 20, 12, charcoal, outline, scale)
        tip = path[-1]
        polygon(
            d_detail,
            [(tip[0] - 12, tip[1] - 6), (tip[0] + 12, tip[1] - 6), (tip[0], tip[1] + 28)],
            ivory,
            outline=outline,
            scale=scale,
        )

    # Folding side arms curve inward like living coral whips, not iron hardware.
    arms = [
        [(536, 438), (458, 520), (430, 620), (482, 704)],
        [(594, 438), (534, 548), (558, 646), (630, 720)],
        [(990, 438), (1072, 520), (1100, 620), (1048, 704)],
        [(934, 438), (996, 548), (970, 646), (898, 720)],
    ]
    for path in arms:
        draw_tapered_branch(d_body, d_detail, path, 24, 10, charcoal, outline, scale)

    # Lower latch teeth connect to the rooted mats and define the bite line.
    lower_left = [(460, 748), (560, 806), (664, 822), (732, 798)]
    lower_right = [(1068, 748), (968, 806), (864, 822), (796, 798)]
    draw_tapered_branch(d_body, d_detail, lower_left, 30, 14, dark_green, outline, scale)
    draw_tapered_branch(d_body, d_detail, lower_right, 30, 14, dark_green, outline, scale)
    for x in [510, 580, 650, 878, 948, 1018]:
        y = 782 + math.sin(x * 0.03) * 16
        polygon(d_detail, [(x - 16, y), (x + 16, y), (x, y + 42)], bone, outline=outline, scale=scale)

    # Secondary black-coral branchlets stay thick enough for crop-safe reads.
    branchlets = [
        [(424, 530), (336, 496), (270, 442), (216, 382)],
        [(434, 602), (326, 622), (238, 662), (164, 704)],
        [(1104, 530), (1192, 496), (1258, 442), (1312, 382)],
        [(1094, 602), (1202, 622), (1290, 662), (1364, 704)],
        [(660, 256), (606, 170), (548, 116), (486, 86)],
        [(870, 256), (924, 170), (982, 116), (1046, 86)],
    ]
    for path in branchlets:
        draw_tapered_branch(d_body, d_detail, path, 20, 7, (20, 49, 47, 255), outline, scale)

    # Attached polyp fields and mottling provide detail without creating loose VFX.
    polyp_centers: list[tuple[float, float]] = []
    for cx, cy in [(758, 250), (706, 286), (820, 286), (638, 344), (892, 344)]:
        for angle in [0.0, 1.25, 2.4, 3.7, 5.0]:
            polyp_centers.append((cx + math.cos(angle) * 22, cy + math.sin(angle) * 14))
    for base_x, base_y in [(468, 566), (1058, 566), (506, 722), (1022, 722)]:
        for index in range(6):
            polyp_centers.append((base_x + RNG.uniform(-30, 30), base_y + index * 20 + RNG.uniform(-6, 6)))
    draw_polyps(d_detail, polyp_centers, scale)

    for _ in range(320):
        if RNG.random() < 0.55:
            x = RNG.uniform(390, 1138)
            y = RNG.uniform(188, 814)
        else:
            x = RNG.choice([RNG.uniform(130, 520), RNG.uniform(1010, 1410)])
            y = RNG.uniform(380, 916)
        color = RNG.choice(
            [
                (6, 20, 22, 95),
                (43, 83, 68, 120),
                (79, 111, 85, 105),
                (189, 181, 130, 95),
                (46, 143, 139, 115),
            ]
        )
        ellipse(d_detail, x, y, RNG.uniform(2.0, 5.5), RNG.uniform(1.2, 4.0), color, scale=scale)

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
