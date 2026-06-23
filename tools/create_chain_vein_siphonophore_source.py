#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Chain Vein Siphonophore.

This creates a source-review candidate only. It is not production approval.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/chain-vein-siphonophore.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(430271)


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


def ribbon_polygon(path: list[tuple[float, float]], root_width: float, mid_width: float, tip_width: float) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 20)
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(smooth):
        amount = index / max(1, len(smooth) - 1)
        if amount < 0.45:
            width = root_width + (mid_width - root_width) * (amount / 0.45)
        else:
            width = mid_width + (tip_width - mid_width) * ((amount - 0.45) / 0.55)
        width *= 1 + 0.05 * math.sin(amount * math.pi * 6)
        nx, ny = normal_at(smooth, index)
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + list(reversed(right))


def draw_ribbon(
    body: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    root_width: float,
    mid_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
    vein=None,
) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 22)
    polygon(body, ribbon_polygon(path, root_width + 5, mid_width + 5, tip_width + 4), outline, scale=scale)
    polygon(body, ribbon_polygon(path, root_width, mid_width, tip_width), fill, scale=scale)
    if vein:
        line(detail, smooth, vein, max(3, root_width * 0.22), scale)
    return smooth


def bell_points(cx: float, cy: float, rx: float, ry: float, side: float) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(42):
        t = (math.tau * i) / 42
        lower_softening = 1 + 0.12 * max(0, math.sin(t))
        skew = side * ry * 0.16 * math.sin(t)
        x = cx + math.cos(t) * rx * (0.86 + 0.08 * math.sin(t + 0.7))
        y = cy + math.sin(t) * ry * lower_softening + skew
        if math.sin(t) > 0.6:
            y += math.sin(t * 5) * 4
        points.append((x, y))
    return points


def draw_bell(
    body: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    side: float,
    fill,
    outline,
    scale: int,
) -> None:
    points = bell_points(cx, cy, rx, ry, side)
    polygon(body, points, fill, outline=outline, scale=scale)
    ellipse(detail, cx + side * rx * 0.12, cy + ry * 0.04, rx * 0.42, ry * 0.28, (224, 245, 238, 82), scale=scale)
    line(detail, [(cx - side * rx * 0.56, cy + ry * 0.2), (cx + side * rx * 0.48, cy + ry * 0.42)], (215, 246, 245, 150), 4.2, scale)
    line(detail, [(cx - side * rx * 0.18, cy - ry * 0.5), (cx + side * rx * 0.28, cy + ry * 0.55)], (37, 98, 103, 150), 3.0, scale)


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
                pixels[x, y] = (13, 30, 35, 255)

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
        if len(component) < max(220, largest * 0.0012):
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

    outline = (7, 24, 31, 255)
    black_teal = (10, 38, 46, 255)
    deep_teal = (25, 82, 91, 255)
    mid_teal = (55, 132, 134, 255)
    cyan = (91, 214, 212, 215)
    ivory = (208, 231, 218, 225)
    cold = (135, 209, 205, 210)
    amber = (224, 151, 57, 245)
    amber_dark = (116, 70, 29, 255)

    stem_path = [(730, 86), (786, 172), (744, 286), (804, 408), (748, 536), (824, 666), (770, 806), (808, 948)]
    stem = draw_ribbon(d_body, d_detail, stem_path, 23, 31, 17, deep_teal, outline, scale, (132, 228, 219, 170))

    # Four broad tripwire tendrils. Each is thick enough to crop and leaves readable gaps.
    tendrils = [
        [(668, 426), (542, 548), (456, 716), (406, 930)],
        [(736, 496), (660, 642), (628, 796), (612, 972)],
        [(840, 494), (930, 636), (974, 796), (996, 972)],
        [(916, 426), (1054, 548), (1146, 714), (1218, 928)],
    ]
    tendril_smooths: list[list[tuple[float, float]]] = []
    for index, path in enumerate(tendrils):
        fill = (31, 100, 104, 255) if index % 2 else (25, 86, 96, 255)
        tendril_smooths.append(draw_ribbon(d_body, d_detail, path, 17, 24, 11, fill, outline, scale, (113, 226, 218, 155)))

    # Organic tentilla swellings are painted onto the tendril tissue, not detached beads.
    for smooth in tendril_smooths:
        for step in range(12, len(smooth) - 12, 18):
            x, y = smooth[step]
            amount = step / max(1, len(smooth) - 1)
            rx = 14 - amount * 4
            ry = 9 - amount * 2
            ellipse(d_body, x, y, rx + 3, ry + 3, outline, scale=scale)
            ellipse(d_body, x, y, rx, ry, (66, 154, 145, 255), scale=scale)
            ellipse(d_detail, x + 2, y - 2, rx * 0.35, ry * 0.24, cyan, scale=scale)

    # Terminal lure bulbs remain attached to the four tendrils.
    for smooth in tendril_smooths:
        x, y = smooth[-1]
        ellipse(d_body, x, y, 22, 16, amber_dark, outline=outline, width=4, scale=scale)
        ellipse(d_body, x - 2, y - 2, 14, 9, amber, scale=scale)
        ellipse(d_detail, x + 4, y - 5, 5, 3, (255, 225, 132, 210), scale=scale)

    # Paired swimming bells attach directly to the continuous stem.
    bell_rows = [
        (656, 184, 70, 54, -1),
        (884, 204, 72, 56, 1),
        (668, 334, 78, 58, -1),
        (902, 356, 80, 60, 1),
        (682, 500, 76, 62, -1),
        (922, 528, 82, 64, 1),
        (706, 666, 70, 58, -1),
        (906, 696, 76, 60, 1),
    ]
    for cx, cy, rx, ry, side in bell_rows:
        draw_bell(d_body, d_detail, cx, cy, rx, ry, side, (112, 190, 188, 225), outline, scale)
        line(d_detail, [(cx - side * rx * 0.68, cy + ry * 0.25), (782 + side * 10, cy + 18)], (111, 215, 206, 190), 8, scale)

    # Soft protective bracts are kept narrow and membranous so the colony does
    # not read as a hard-shielded walker.
    left_bracts = [
        [(676, 292), (588, 350), (566, 420), (632, 452), (706, 396), (728, 326)],
        [(696, 612), (602, 684), (578, 772), (640, 806), (718, 738), (736, 650)],
    ]
    right_bracts = [
        [(884, 318), (986, 382), (1014, 456), (944, 492), (868, 430), (838, 356)],
        [(890, 642), (992, 716), (1028, 804), (954, 838), (876, 760), (846, 676)],
    ]
    for bract in left_bracts:
        polygon(d_body, bract, (54, 139, 137, 218), outline=outline, scale=scale)
    for bract in right_bracts:
        polygon(d_body, bract, (50, 132, 142, 218), outline=outline, scale=scale)
    line(d_detail, [(558, 414), (650, 384), (724, 318)], ivory, 4.5, scale)
    line(d_detail, [(1008, 438), (920, 408), (838, 348)], ivory, 4.5, scale)
    line(d_detail, [(562, 760), (656, 718), (736, 638)], ivory, 4.5, scale)
    line(d_detail, [(1020, 792), (924, 738), (842, 668)], ivory, 4.5, scale)

    # Front float bract and feeding polyps make the attack lane readable.
    ellipse(d_body, 742, 104, 84, 48, black_teal, outline=outline, width=7, scale=scale)
    ellipse(d_body, 724, 94, 56, 28, mid_teal, scale=scale)
    ellipse(d_detail, 712, 84, 24, 11, (212, 244, 232, 130), scale=scale)
    line(d_detail, [(724, 142), (782, 198)], cyan, 8, scale)

    cluster_points = [(700, 704), (778, 658), (862, 692), (898, 778), (846, 846), (742, 834), (682, 778)]
    polygon(d_body, cluster_points, (20, 72, 76, 255), outline=outline, scale=scale)
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        x = 790 + math.cos(rad) * 48
        y = 760 + math.sin(rad) * 38
        ellipse(d_body, x, y, 21, 14, (59, 137, 126, 255), outline=(8, 38, 42, 230), width=3, scale=scale)
        ellipse(d_detail, x + 3, y - 2, 7, 4, (162, 235, 218, 145), scale=scale)
    ellipse(d_body, 794, 760, 44, 32, (9, 39, 47, 255), outline=(89, 190, 178, 180), width=4, scale=scale)

    # Stem overlap collars prove all bells, bracts, and tentrils belong to one colony.
    for x, y, rx, ry in [
        (772, 194, 40, 26),
        (774, 350, 44, 28),
        (790, 512, 46, 31),
        (796, 680, 50, 36),
        (790, 760, 56, 40),
    ]:
        ellipse(d_body, x, y, rx, ry, (18, 68, 76, 255), outline=(7, 29, 35, 235), width=4, scale=scale)
        ellipse(d_detail, x - 8, y - 8, rx * 0.32, ry * 0.22, (141, 225, 215, 125), scale=scale)

    # Sparse tissue accents add material cohesion without turning into loose pearls.
    for _ in range(110):
        x = RNG.uniform(540, 1040)
        y = RNG.uniform(100, 880)
        if RNG.random() < 0.35:
            x += RNG.choice([-1, 1]) * RNG.uniform(160, 260)
            y += RNG.uniform(60, 180)
        color = RNG.choice([
            (105, 214, 205, 86),
            (219, 239, 220, 70),
            (34, 93, 99, 110),
            (224, 162, 70, 78),
        ])
        ellipse(d_detail, x, y, RNG.uniform(1.5, 4.5), RNG.uniform(1.0, 3.2), color, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
