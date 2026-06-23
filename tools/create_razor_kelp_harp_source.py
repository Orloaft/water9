#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Razor Kelp Harp.

This creates a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/razor-kelp-harp.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(731249)


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


def blade_polygon(path: list[tuple[float, float]], root_width: float, mid_width: float, tip_width: float) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 18)
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(smooth):
        amount = index / max(1, len(smooth) - 1)
        if amount < 0.55:
            width = root_width + (mid_width - root_width) * (amount / 0.55)
        else:
            width = mid_width + (tip_width - mid_width) * ((amount - 0.55) / 0.45)
        width *= 1.0 + 0.08 * math.sin(amount * math.pi * 5.0)
        nx, ny = normal_at(smooth, index)
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + list(reversed(right))


def draw_serrated_edge(
    draw: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    root_width: float,
    mid_width: float,
    tip_width: float,
    side: float,
    fill,
    scale: int,
) -> None:
    smooth = smooth_path(path, 16)
    for step in range(5, len(smooth) - 6, 6):
        amount = step / max(1, len(smooth) - 1)
        if amount < 0.55:
            width = root_width + (mid_width - root_width) * (amount / 0.55)
        else:
            width = mid_width + (tip_width - mid_width) * ((amount - 0.55) / 0.45)
        nx, ny = normal_at(smooth, step)
        base = (smooth[step][0] + nx * width * side, smooth[step][1] + ny * width * side)
        tip = (base[0] + nx * side * 16, base[1] + ny * side * 16)
        prev = (smooth[max(0, step - 2)][0] + nx * width * side * 0.88, smooth[max(0, step - 2)][1] + ny * width * side * 0.88)
        nxt = (smooth[min(len(smooth) - 1, step + 2)][0] + nx * width * side * 0.88, smooth[min(len(smooth) - 1, step + 2)][1] + ny * width * side * 0.88)
        polygon(draw, [prev, tip, nxt], fill, scale=scale)


def draw_blade(
    draw: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    fill,
    outline,
    scale: int,
    root_width: float = 30,
    mid_width: float = 50,
    tip_width: float = 16,
) -> None:
    blade = blade_polygon(path, root_width, mid_width, tip_width)
    polygon(draw, blade, fill, outline=outline, scale=scale)
    draw_serrated_edge(draw, path, root_width, mid_width, tip_width, 1.0, outline, scale)
    draw_serrated_edge(draw, path, root_width, mid_width, tip_width, -1.0, outline, scale)
    smooth = smooth_path(path, 20)
    line(detail, smooth, (203, 197, 140, 205), 5.2, scale)
    for offset in (-0.52, 0.48):
        vein = []
        for index, point in enumerate(smooth):
            amount = index / max(1, len(smooth) - 1)
            nx, ny = normal_at(smooth, index)
            local_width = (root_width + (mid_width - root_width) * min(1, amount / 0.55)) * (1 - amount * 0.3)
            vein.append((point[0] + nx * local_width * offset, point[1] + ny * local_width * offset))
        line(detail, vein, (35, 72, 60, 150), 2.4, scale)


def draw_tendril(draw: ImageDraw.ImageDraw, path: list[tuple[float, float]], fill, outline, scale: int) -> None:
    smooth = smooth_path(path, 16)
    for index, start in enumerate(smooth[:-1]):
        amount = index / max(1, len(smooth) - 2)
        width = 14 + (4 - 14) * amount
        line(draw, [start, smooth[index + 1]], outline, width + 4, scale)
    for index, start in enumerate(smooth[:-1]):
        amount = index / max(1, len(smooth) - 2)
        width = 14 + (4 - 14) * amount
        line(draw, [start, smooth[index + 1]], fill, width, scale)


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
                pixels[x, y] = (13, 24, 20, 255)

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

    outline = (11, 31, 25, 255)
    deep_teal = (31, 89, 73, 255)
    olive = (69, 122, 74, 255)
    dark_olive = (38, 83, 54, 255)
    amber = (168, 130, 54, 255)
    bone = (209, 204, 148, 255)
    bladder = (177, 142, 63, 255)

    crown = (760, 575)

    # Root tendril skirt first so all blades visibly grow from one anchored body.
    tendril_paths = [
        [(720, 630), (614, 720), (460, 782), (314, 842)],
        [(758, 646), (704, 772), (604, 864), (522, 930)],
        [(806, 636), (866, 760), (960, 852), (1070, 928)],
        [(836, 600), (1000, 648), (1162, 720), (1288, 792)],
        [(694, 590), (548, 612), (394, 666), (252, 732)],
    ]
    for path in tendril_paths:
        draw_tendril(d_body, path, (57, 107, 69, 255), outline, scale)

    # Broad crop-safe serrated blades arranged as an ambush fan, not loose weeds.
    blade_specs = [
        ([(724, 552), (548, 390), (360, 288), (176, 240)], (45, 99, 64, 255), 33, 52, 18),
        ([(742, 532), (628, 318), (492, 188), (330, 112)], (53, 112, 70, 255), 30, 48, 15),
        ([(760, 516), (762, 310), (744, 154), (726, 74)], (67, 127, 75, 255), 32, 56, 18),
        ([(780, 520), (902, 318), (1030, 194), (1192, 118)], (72, 134, 78, 255), 31, 52, 17),
        ([(800, 546), (1002, 418), (1192, 326), (1398, 260)], (59, 120, 81, 255), 34, 54, 18),
        ([(790, 588), (1006, 606), (1214, 660), (1402, 732)], (49, 105, 75, 255), 34, 50, 17),
        ([(744, 596), (560, 594), (388, 646), (224, 704)], (42, 91, 62, 255), 32, 48, 16),
    ]
    for path, fill, root_w, mid_w, tip_w in blade_specs:
        draw_blade(d_body, d_detail, path, fill, outline, scale, root_w, mid_w, tip_w)
        ellipse(d_body, path[0][0], path[0][1], 42, 29, amber, outline=outline, width=4, scale=scale)
        ellipse(d_detail, path[0][0] - 4, path[0][1] - 6, 19, 9, bone, scale=scale)

    # Curled hooks at tips: visible but not detached slash effects.
    for path, _fill, _root_w, _mid_w, _tip_w in blade_specs:
        tip = path[-1]
        prev = path[-2]
        angle = math.atan2(tip[1] - prev[1], tip[0] - prev[0])
        hook = [
            tip,
            (tip[0] + math.cos(angle + 0.9) * 36, tip[1] + math.sin(angle + 0.9) * 36),
            (tip[0] + math.cos(angle + 1.7) * 46, tip[1] + math.sin(angle + 1.7) * 46),
        ]
        line(d_detail, hook, bone, 7.0, scale)
        ellipse(d_detail, hook[-1][0], hook[-1][1], 8, 6, bone, outline=outline, width=1, scale=scale)

    # Central crown and holdfast, drawn over blade roots to prove one organism.
    holdfast = [
        (620, 620),
        (676, 542),
        (764, 504),
        (866, 532),
        (920, 610),
        (880, 690),
        (766, 724),
        (660, 690),
    ]
    polygon(d_body, holdfast, (50, 95, 57, 255), outline=outline, scale=scale)
    ellipse(d_body, crown[0], crown[1], 118, 86, dark_olive, outline=outline, width=6, scale=scale)
    ellipse(d_body, crown[0] + 12, crown[1] - 12, 74, 48, (81, 132, 74, 255), outline=(18, 49, 33, 230), width=3, scale=scale)
    ellipse(d_detail, crown[0] - 22, crown[1] - 28, 64, 18, (151, 166, 105, 150), scale=scale)

    # Gas bladders are attached to the crown and blade bases, not floating props.
    bladder_centers = [(664, 510), (716, 462), (790, 444), (860, 488), (896, 560), (626, 578)]
    for idx, (cx, cy) in enumerate(bladder_centers):
        rx = 24 + (idx % 3) * 4
        ry = 32 + (idx % 2) * 5
        ellipse(d_body, cx, cy, rx, ry, bladder, outline=outline, width=4, scale=scale)
        ellipse(d_detail, cx - rx * 0.28, cy - ry * 0.32, rx * 0.34, ry * 0.18, (225, 202, 128, 155), scale=scale)
        line(d_detail, [(cx, cy + ry), crown], (37, 75, 46, 155), 4.0, scale)

    # Integrated serration and tissue mottling.
    for _ in range(210):
        x = RNG.uniform(250, 1280)
        y = RNG.uniform(150, 710)
        color = RNG.choice([
            (26, 65, 48, 105),
            (86, 135, 70, 125),
            (158, 130, 57, 115),
            (196, 194, 137, 85),
        ])
        ellipse(d_detail, x, y, RNG.uniform(2.0, 5.5), RNG.uniform(1.2, 4.0), color, scale=scale)

    # Small root bumps make the holdfast read biological without becoming rocks.
    for angle in [2.55, 2.92, 3.28, 3.64, 4.02, 4.46, 4.82]:
        x = crown[0] + math.cos(angle) * RNG.uniform(70, 112)
        y = crown[1] + math.sin(angle) * RNG.uniform(56, 90)
        ellipse(d_body, x, y, RNG.uniform(20, 34), RNG.uniform(14, 25), (44, 86, 50, 255), outline=outline, width=3, scale=scale)

    body = body.filter(ImageFilter.GaussianBlur(radius=0.12 * scale))
    image.alpha_composite(body)
    image.alpha_composite(detail)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(image)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
