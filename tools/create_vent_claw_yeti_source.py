#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Vent-Claw Yeti.

This creates a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/vent-claw-yeti.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(946813)


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
        line(draw, [start, path[index + 1]], outline, width + 4, scale)
    for index, start in enumerate(path[:-1]):
        amount = index / max(1, len(path) - 2)
        width = root_width + (tip_width - root_width) * amount
        line(draw, [start, path[index + 1]], fill, width, scale)
    line(draw, path, (243, 246, 219, 170), max(2.2, root_width * 0.18), scale)


def claw_shape(center: tuple[float, float], flip: float, squash: float = 1.0) -> list[tuple[float, float]]:
    cx, cy = center
    return [
        (cx - 104 * flip, cy - 44 * squash),
        (cx - 2 * flip, cy - 92 * squash),
        (cx + 130 * flip, cy - 58 * squash),
        (cx + 106 * flip, cy - 15 * squash),
        (cx + 156 * flip, cy + 14 * squash),
        (cx + 94 * flip, cy + 40 * squash),
        (cx + 124 * flip, cy + 82 * squash),
        (cx - 14 * flip, cy + 70 * squash),
        (cx - 96 * flip, cy + 32 * squash),
    ]


def draw_bristle_rows(draw: ImageDraw.ImageDraw, center: tuple[float, float], flip: float, scale: int) -> None:
    cx, cy = center
    for row in range(5):
        y = cy - 42 + row * 20
        for column in range(8):
            if row == 2 and column > 4:
                continue
            x = cx - 54 * flip + column * 18 * flip + RNG.uniform(-2.0, 2.0)
            length = 14 + (column % 3) * 3
            angle = -0.65 * flip + RNG.uniform(-0.16, 0.16)
            end = (x + math.cos(angle) * length, y + math.sin(angle) * length)
            line(draw, [(x, y), end], (229, 235, 199, 235), 4.2, scale)
            ellipse(draw, end[0], end[1], 4.2, 2.6, (203, 216, 184, 255), outline=(66, 87, 78, 180), width=1, scale=scale)


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
                pixels[x, y] = (18, 25, 25, 255)

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

    shell = (184, 194, 172, 255)
    shell_shadow = (108, 134, 126, 255)
    shell_light = (226, 228, 196, 255)
    outline = (18, 40, 42, 255)
    oxidized = (63, 129, 124, 255)
    mineral = (177, 104, 51, 255)

    # Six walking legs under a compact squat-yeti-crab body.
    leg_roots = [(592, 560), (690, 596), (790, 578)]
    for index, root in enumerate(leg_roots):
        left_path = [
            root,
            (root[0] - 105, root[1] + 66 + index * 16),
            (root[0] - 224, root[1] + 132 + index * 25),
            (root[0] - 342, root[1] + 194 + index * 20),
        ]
        right_path = [
            (root[0] + 104, root[1] - 10),
            (root[0] + 232, root[1] + 48 + index * 10),
            (root[0] + 354, root[1] + 112 + index * 20),
            (root[0] + 486, root[1] + 158 + index * 16),
        ]
        tapered_path(d_body, left_path, 21, 9, (148, 170, 158, 255), outline, scale)
        tapered_path(d_body, right_path, 20, 8, (164, 184, 162, 255), outline, scale)
        for point in (left_path[0], left_path[1], right_path[0], right_path[1]):
            ellipse(d_body, point[0], point[1], 22, 16, shell_shadow, outline=outline, width=3, scale=scale)

    # Oversized forelimbs are separated for crop-safe rigging and clearly rooted in the carapace.
    upper_arm = [(764, 454), (920, 330), (1114, 266), (1262, 258)]
    lower_arm = [(728, 534), (918, 626), (1114, 696), (1260, 740)]
    tapered_path(d_body, upper_arm, 38, 20, shell_light, outline, scale)
    tapered_path(d_body, lower_arm, 40, 20, shell, outline, scale)
    for point in (upper_arm[0], upper_arm[1], lower_arm[0], lower_arm[1]):
        ellipse(d_body, point[0], point[1], 30, 23, shell_shadow, outline=outline, width=4, scale=scale)

    upper_claw = claw_shape((1356, 258), 1, 0.92)
    lower_claw = claw_shape((1364, 740), 1, 1.08)
    polygon(d_body, upper_claw, shell_light, outline=outline, scale=scale)
    polygon(d_body, lower_claw, shell, outline=outline, scale=scale)
    draw_bristle_rows(d_detail, (1370, 258), 1, scale)
    draw_bristle_rows(d_detail, (1378, 740), 1, scale)
    ellipse(d_body, 1264, 258, 36, 27, shell_shadow, outline=outline, width=4, scale=scale)
    ellipse(d_body, 1264, 740, 38, 28, shell_shadow, outline=outline, width=4, scale=scale)

    # Main carapace and tucked abdomen. The silhouette is squat lobster, not humanoid.
    carapace = [
        (470, 422), (602, 356), (770, 378), (900, 456), (882, 574),
        (736, 646), (540, 614), (438, 528),
    ]
    polygon(d_body, carapace, shell, outline=outline, scale=scale)
    ellipse(d_body, 640, 506, 160, 104, shell, outline=outline, width=5, scale=scale)
    ellipse(d_body, 530, 520, 84, 66, shell_shadow, outline=outline, width=4, scale=scale)
    ellipse(d_body, 758, 494, 90, 66, shell_light, outline=outline, width=4, scale=scale)
    abdomen = [(452, 542), (344, 604), (460, 682), (626, 620), (580, 558)]
    polygon(d_body, abdomen, (132, 154, 143, 255), outline=outline, scale=scale)
    line(d_detail, [(420, 592), (496, 606), (574, 584)], (219, 225, 194, 120), 5, scale)

    # Head plate, reduced eye spots, and short antennae.
    ellipse(d_body, 852, 484, 66, 48, shell_light, outline=outline, width=4, scale=scale)
    ellipse(d_body, 898, 468, 8, 5, (9, 19, 21, 255), outline=(210, 226, 213, 220), width=2, scale=scale)
    ellipse(d_body, 892, 514, 7, 4, (9, 19, 21, 255), outline=(210, 226, 213, 220), width=2, scale=scale)
    for path in [[(872, 448), (984, 382), (1090, 332)], [(878, 528), (988, 574), (1098, 616)]]:
        tapered_path(d_body, path, 9, 4, (201, 213, 188, 255), outline, scale)

    # Mineral vent staining stays on shell, not as separate smoke or environment.
    for _ in range(360):
        cx = RNG.gauss(650, 118)
        cy = RNG.gauss(504, 70)
        if not (440 <= cx <= 900 and 370 <= cy <= 640):
            continue
        color = RNG.choice([(oxidized[0], oxidized[1], oxidized[2], 105), (mineral[0], mineral[1], mineral[2], 95), (80, 105, 101, 100), (229, 229, 198, 85)])
        radius = RNG.uniform(1.4, 3.6)
        ellipse(d_detail, cx, cy, radius, radius * RNG.uniform(0.5, 1.0), color, scale=scale)

    for x, y in [(1054, 330), (1110, 312), (1148, 676), (1090, 642), (700, 428), (586, 440)]:
        ellipse(d_detail, x, y, 8, 5, (37, 110, 116, 170), scale=scale)
        ellipse(d_detail, x, y, 4, 3, (100, 221, 217, 210), outline=(17, 73, 78, 200), width=2, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)

    outer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outer = ImageDraw.Draw(outer)
    polygon(d_outer, carapace, (0, 0, 0, 0), outline=(3, 13, 15, 230), scale=scale)
    polygon(d_outer, upper_claw, (0, 0, 0, 0), outline=(3, 13, 15, 230), scale=scale)
    polygon(d_outer, lower_claw, (0, 0, 0, 0), outline=(3, 13, 15, 230), scale=scale)
    outer = outer.filter(ImageFilter.GaussianBlur(round(0.7 * scale)))

    composite = Image.new("RGBA", image.size, MAGENTA)
    composite.alpha_composite(outer)
    composite.alpha_composite(image)
    composite = composite.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
