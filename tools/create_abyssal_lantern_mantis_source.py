#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Abyssal Lantern Mantis.

This is a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/abyssal-lantern-mantis.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(920411)


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


def tapered_path(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    root_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
) -> None:
    path = smooth_path(points, 18)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], outline, width + 4, scale)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], fill, width, scale)
    line(draw, path, (205, 215, 186, 155), max(2.0, root_width * 0.16), scale)


def club_points(cx: float, cy: float, angle: float) -> list[tuple[float, float]]:
    ca = math.cos(angle)
    sa = math.sin(angle)
    across = (-sa, ca)
    length = 128
    root = (cx - ca * 72, cy - sa * 72)
    nose = (cx + ca * length, cy + sa * length)
    return [
        (root[0] + across[0] * 30, root[1] + across[1] * 30),
        (cx - ca * 8 + across[0] * 62, cy - sa * 8 + across[1] * 62),
        (nose[0] + across[0] * 45, nose[1] + across[1] * 45),
        (nose[0] + ca * 18, nose[1] + sa * 18),
        (nose[0] - across[0] * 45, nose[1] - across[1] * 45),
        (cx - ca * 8 - across[0] * 62, cy - sa * 8 - across[1] * 62),
        (root[0] - across[0] * 30, root[1] - across[1] * 30),
    ]


def draw_smasher_club(
    draw: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    angle: float,
    fill,
    outline,
    scale: int,
) -> None:
    ca = math.cos(angle)
    sa = math.sin(angle)
    across = (-sa, ca)
    nose = (cx + ca * 128, cy + sa * 128)
    polygon(draw, club_points(cx, cy, angle), fill, outline=outline, scale=scale)
    ellipse(draw, nose[0] - ca * 2, nose[1] - sa * 2, 48, 38, fill, outline=outline, width=4, scale=scale)
    ellipse(detail, nose[0] + ca * 9, nose[1] + sa * 9, 24, 28, (196, 196, 154, 170), scale=scale)
    for rib in range(5):
        offset = -46 + rib * 23
        start = (cx - ca * 32 + across[0] * offset, cy - sa * 32 + across[1] * offset)
        end = (cx + ca * 112 + across[0] * (offset * 0.48), cy + sa * 112 + across[1] * (offset * 0.48))
        line(detail, [start, end], (35, 67, 56, 185), 3.2, scale)


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
                pixels[x, y] = (14, 24, 25, 255)

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

    outline = (11, 27, 29, 255)
    shell_dark = (30, 69, 65, 255)
    shell_mid = (55, 102, 88, 255)
    shell_light = (121, 143, 115, 255)
    bone_edge = (201, 201, 164, 255)
    copper = (126, 68, 43, 255)
    cyan = (65, 223, 232, 255)

    # Tail fan reads as the rear stabilizer and anchors the body direction.
    tail_root = (436, 515)
    tail_lobes = [
        [(436, 515), (270, 378), (194, 456), (308, 532)],
        [(436, 515), (232, 508), (166, 602), (330, 628)],
        [(436, 515), (300, 662), (214, 760), (420, 664)],
    ]
    for index, points in enumerate(tail_lobes):
        fill = (43 + index * 11, 91 + index * 9, 81 + index * 6, 255)
        polygon(d_body, points, fill, outline=outline, scale=scale)
        line(d_detail, [points[0], points[2]], bone_edge, 4.2, scale)

    # Segmented abdomen chain.
    abdomen_centers = [(438, 520), (520, 510), (602, 500), (686, 492), (770, 488)]
    for idx, (cx, cy) in enumerate(abdomen_centers):
        rx = 78 - idx * 3
        ry = 66 - idx * 2
        fill = (39 + idx * 7, 82 + idx * 8, 72 + idx * 5, 255)
        ellipse(d_body, cx, cy, rx, ry, fill, outline=outline, width=5, scale=scale)
        ellipse(d_detail, cx - 12, cy - 22, rx * 0.58, ry * 0.18, (156, 170, 129, 135), scale=scale)
        line(d_detail, [(cx - rx * 0.75, cy + ry * 0.1), (cx + rx * 0.76, cy - ry * 0.04)], (16, 42, 42, 160), 3.4, scale)

    # Walking limbs under the thorax. Kept small so the smasher clubs are the first read.
    leg_roots = [(640, 550), (716, 570), (790, 566), (856, 546)]
    for i, root in enumerate(leg_roots):
        path = [root, (root[0] - 28 + i * 18, root[1] + 82), (root[0] - 116 + i * 38, root[1] + 154), (root[0] - 184 + i * 50, root[1] + 218)]
        tapered_path(d_body, path, 16, 6, (74, 121, 102, 255), outline, scale)
        ellipse(d_body, root[0], root[1], 18, 13, shell_mid, outline=outline, width=3, scale=scale)
    for i, root in enumerate(leg_roots[1:]):
        path = [(root[0] + 74, root[1] - 10), (root[0] + 150 + i * 18, root[1] + 58), (root[0] + 218 + i * 30, root[1] + 128)]
        tapered_path(d_body, path, 15, 6, (80, 128, 106, 255), outline, scale)
        ellipse(d_body, path[0][0], path[0][1], 17, 12, shell_mid, outline=outline, width=3, scale=scale)

    # Thorax and forward plated carapace.
    thorax = [(720, 400), (860, 358), (1018, 394), (1110, 486), (1060, 584), (878, 638), (706, 604), (636, 506)]
    polygon(d_body, thorax, shell_mid, outline=outline, scale=scale)
    head = [(948, 366), (1088, 382), (1204, 468), (1168, 558), (1032, 602), (918, 536), (890, 438)]
    polygon(d_body, head, (63, 119, 99, 255), outline=outline, scale=scale)
    face_plate = [(1062, 424), (1200, 466), (1164, 526), (1042, 532), (1006, 472)]
    polygon(d_body, face_plate, (94, 137, 105, 255), outline=outline, scale=scale)
    ellipse(d_detail, 850, 424, 116, 28, (167, 180, 134, 120), scale=scale)
    for x in (760, 836, 918, 1002):
        line(d_detail, [(x, 390), (x + 20, 600)], (16, 43, 42, 165), 4, scale)

    # Folded raptorial smasher arms. Each has root, saddle, forearm, and blunt club.
    upper_root = (842, 438)
    lower_root = (838, 538)
    upper_saddle = (960, 326)
    lower_saddle = (974, 674)
    tapered_path(d_body, [upper_root, (888, 368), upper_saddle], 34, 27, shell_light, outline, scale)
    tapered_path(d_body, [lower_root, (902, 610), lower_saddle], 34, 27, (104, 136, 102, 255), outline, scale)
    ellipse(d_body, upper_root[0], upper_root[1], 38, 28, copper, outline=outline, width=5, scale=scale)
    ellipse(d_body, lower_root[0], lower_root[1], 38, 28, copper, outline=outline, width=5, scale=scale)
    ellipse(d_body, upper_saddle[0], upper_saddle[1], 48, 34, copper, outline=outline, width=5, scale=scale)
    ellipse(d_body, lower_saddle[0], lower_saddle[1], 48, 34, copper, outline=outline, width=5, scale=scale)
    tapered_path(d_body, [upper_saddle, (1096, 338), (1214, 396)], 30, 24, shell_light, outline, scale)
    tapered_path(d_body, [lower_saddle, (1100, 646), (1224, 590)], 30, 24, (102, 132, 99, 255), outline, scale)
    draw_smasher_club(d_body, d_detail, 1260, 414, 0.06, shell_light, outline, scale)
    draw_smasher_club(d_body, d_detail, 1274, 574, -0.04, (113, 142, 105, 255), outline, scale)

    # Eye stalks and long antennae are crop-safe and visibly rooted in the head.
    stalks = [((1024, 400), (1020, 260), -0.32), ((1086, 420), (1120, 278), 0.1)]
    for root, tip, lean in stalks:
        tapered_path(d_body, [root, ((root[0] + tip[0]) / 2 + lean * 64, (root[1] + tip[1]) / 2 - 26), tip], 13, 8, (97, 137, 112, 255), outline, scale)
        ellipse(d_body, tip[0], tip[1], 32, 24, (126, 151, 113, 255), outline=outline, width=4, scale=scale)
        ellipse(d_detail, tip[0] + 7, tip[1] - 1, 9, 8, cyan, outline=(7, 66, 70, 230), width=2, scale=scale)
    antennae = [
        [(1110, 414), (1238, 318), (1368, 270), (1488, 238)],
        [(1130, 446), (1268, 384), (1408, 380), (1508, 418)],
    ]
    for path in antennae:
        tapered_path(d_body, path, 8, 3.5, (154, 169, 128, 255), outline, scale)

    # Edge speckles are muted and integrated into the shell, not tropical color bands.
    for _ in range(170):
        x = RNG.uniform(520, 1180)
        y = RNG.uniform(392, 606)
        if RNG.random() < 0.55:
            color = (141, 91, 58, RNG.randint(95, 160))
        else:
            color = (172, 181, 136, RNG.randint(80, 145))
        ellipse(d_detail, x, y, RNG.uniform(2.0, 4.2), RNG.uniform(1.4, 3.4), color, scale=scale)

    body = body.filter(ImageFilter.GaussianBlur(radius=0.15 * scale))
    image.alpha_composite(body)
    image.alpha_composite(detail)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(image)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
