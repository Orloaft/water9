#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Thorn Fan Coralline.

This creates a source-review candidate only. It is not production acceptance.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/thorn-fan-coralline.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(275813)


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


def ribbon_polygon(path: list[tuple[float, float]], root_width: float, tip_width: float) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 20)
    left: list[tuple[float, float]] = []
    right: list[tuple[float, float]] = []
    for index, point in enumerate(smooth):
        amount = index / max(1, len(smooth) - 1)
        width = root_width + (tip_width - root_width) * amount
        width *= 1 + 0.07 * math.sin(amount * math.pi * 5)
        nx, ny = normal_at(smooth, index)
        left.append((point[0] + nx * width, point[1] + ny * width))
        right.append((point[0] - nx * width, point[1] - ny * width))
    return left + list(reversed(right))


def draw_rib(
    draw: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    path: list[tuple[float, float]],
    root_width: float,
    tip_width: float,
    fill,
    outline,
    scale: int,
) -> list[tuple[float, float]]:
    smooth = smooth_path(path, 20)
    polygon(draw, ribbon_polygon(path, root_width + 4, tip_width + 3), outline, scale=scale)
    polygon(draw, ribbon_polygon(path, root_width, tip_width), fill, scale=scale)
    line(detail, smooth, (221, 201, 140, 150), max(3.0, root_width * 0.18), scale)
    for step in range(8, len(smooth) - 8, 12):
        amount = step / max(1, len(smooth) - 1)
        point = smooth[step]
        nx, ny = normal_at(smooth, step)
        thorn = 10 + (1 - amount) * 13
        for side in (-1, 1):
            base = (point[0] + nx * side * root_width * 0.52, point[1] + ny * side * root_width * 0.52)
            tip = (base[0] + nx * side * thorn, base[1] + ny * side * thorn)
            line(detail, [base, tip], (224, 215, 166, 230), 4.2, scale)
    return smooth


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
                pixels[x, y] = (12, 27, 25, 255)

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

    outline = (8, 29, 26, 255)
    deep_teal = (24, 86, 78, 255)
    teal = (45, 122, 100, 255)
    oxidized = (72, 112, 78, 255)
    rust = (150, 67, 43, 255)
    red_rust = (113, 48, 39, 255)
    sulfur = (204, 170, 59, 255)
    bone = (219, 210, 154, 255)
    charcoal = (17, 39, 36, 255)

    root = (768, 760)
    hinge = (766, 574)

    # Armored rooted foot and central stalk make this a creature, not scenery.
    foot = [
        (616, 836), (664, 772), (734, 730), (812, 728), (882, 770),
        (928, 842), (886, 908), (796, 938), (700, 918), (636, 882),
    ]
    polygon(d_body, foot, charcoal, outline=outline, scale=scale)
    ellipse(d_body, 760, 852, 168, 64, (35, 79, 66, 255), outline=outline, width=7, scale=scale)
    ellipse(d_body, 760, 812, 118, 42, (83, 117, 76, 255), outline=(18, 48, 42, 255), width=5, scale=scale)

    stalk_path = [root, (756, 690), hinge, (758, 454), (770, 310)]
    stalk = draw_rib(d_body, d_detail, stalk_path, 54, 34, deep_teal, outline, scale)

    # Broad living wall tissue behind ribs: asymmetrical, connected, and crop-safe.
    left_lobe = [
        hinge, (642, 468), (496, 340), (332, 216), (176, 174), (142, 304),
        (214, 442), (356, 586), (554, 680), (702, 650),
    ]
    right_lobe = [
        hinge, (890, 468), (1046, 336), (1224, 204), (1388, 182), (1412, 314),
        (1336, 462), (1188, 592), (982, 676), (830, 650),
    ]
    polygon(d_body, left_lobe, (34, 93, 78, 255), outline=outline, scale=scale)
    polygon(d_body, right_lobe, (42, 104, 83, 255), outline=outline, scale=scale)

    # Shared coralline plates over the lobe roots prove both lobes grow from one stalk.
    for cx, cy, rx, ry, color in [
        (724, 594, 74, 44, rust),
        (810, 596, 72, 42, red_rust),
        (766, 540, 92, 52, oxidized),
        (760, 638, 122, 40, charcoal),
    ]:
        ellipse(d_body, cx, cy, rx, ry, color, outline=outline, width=5, scale=scale)

    # Primary ribs dominate the silhouette. Secondary crossbars stay sparse and thick.
    rib_specs = [
        [(750, 556), (626, 430), (460, 292), (250, 216)],
        [(748, 586), (580, 504), (386, 424), (176, 330)],
        [(734, 620), (566, 628), (380, 604), (210, 542)],
        [(760, 520), (704, 360), (612, 214), (492, 104)],
        [(784, 520), (858, 360), (968, 218), (1116, 116)],
        [(792, 556), (922, 426), (1090, 294), (1302, 224)],
        [(804, 586), (982, 502), (1180, 420), (1360, 330)],
        [(804, 622), (976, 634), (1170, 608), (1334, 548)],
    ]
    rib_smooths: list[list[tuple[float, float]]] = []
    for index, path in enumerate(rib_specs):
        fill = teal if index % 2 else deep_teal
        rib_smooths.append(draw_rib(d_body, d_detail, path, 33, 15, fill, outline, scale))

    crossbars = [
        [(536, 342), (642, 410), (722, 490)],
        [(378, 452), (548, 512), (710, 574)],
        [(394, 582), (548, 608), (714, 618)],
        [(1000, 340), (896, 410), (810, 492)],
        [(1168, 450), (984, 512), (816, 574)],
        [(1146, 584), (980, 612), (814, 620)],
        [(596, 250), (696, 340), (752, 448)],
        [(936, 250), (844, 344), (784, 450)],
    ]
    for path in crossbars:
        draw_rib(d_body, d_detail, path, 16, 10, (60, 119, 88, 255), outline, scale)

    # Hinge knots and warning tissue are readable crop zones for folding/lashing.
    hinge_centers = [(716, 586), (816, 586), (760, 524), (760, 650)]
    for cx, cy in hinge_centers:
        ellipse(d_body, cx, cy, 42, 32, red_rust, outline=outline, width=5, scale=scale)
        ellipse(d_detail, cx - 4, cy - 6, 18, 10, sulfur, outline=(68, 54, 22, 255), width=2, scale=scale)

    # Sparse raised stinging polyps sit on ribs. They are attached beads, not texture noise.
    bead_points: list[tuple[float, float]] = []
    for rib_index, smooth in enumerate(rib_smooths):
        for fraction in (0.32, 0.5, 0.68, 0.84):
            idx = min(len(smooth) - 1, round(fraction * (len(smooth) - 1)))
            point = smooth[idx]
            nx, ny = normal_at(smooth, idx)
            side = -1 if (rib_index + idx) % 2 else 1
            bead_points.append((point[0] + nx * side * 14, point[1] + ny * side * 14))
    for bx, by in bead_points:
        ellipse(d_detail, bx, by, 12, 8, (54, 73, 38, 255), outline=outline, width=2, scale=scale)
        ellipse(d_detail, bx, by, 7, 5, sulfur, scale=scale)
        ellipse(d_detail, bx - 2, by - 2, 2, 1.4, (249, 230, 136, 220), scale=scale)

    # Armored coralline plates and low-frequency markings add detail without lace.
    plate_centers = [
        (306, 274), (420, 356), (540, 486), (302, 516), (510, 620),
        (1220, 272), (1104, 360), (982, 488), (1230, 520), (1012, 620),
        (742, 724), (812, 724), (704, 780), (844, 782),
    ]
    for index, (cx, cy) in enumerate(plate_centers):
        color = rust if index % 3 else red_rust
        ellipse(d_detail, cx, cy, 28 + (index % 2) * 8, 16 + (index % 3) * 4, color, outline=outline, width=3, scale=scale)
        line(d_detail, [(cx - 14, cy - 2), (cx + 15, cy + 3)], bone, 3.2, scale)

    for _ in range(360):
        x = RNG.uniform(170, 1370)
        y = RNG.uniform(120, 810)
        # Keep incidental markings inside the broad fan field.
        if y > 700 and abs(x - 768) > 250:
            continue
        if y < 300 and 350 < x < 1180 and RNG.random() < 0.35:
            continue
        color = RNG.choice(
            [
                (17, 56, 49, 90),
                (75, 133, 91, 100),
                (160, 72, 45, 88),
                (213, 198, 122, 75),
                (183, 151, 50, 80),
            ]
        )
        ellipse(d_detail, x, y, RNG.uniform(1.5, 4.8), RNG.uniform(1.0, 3.0), color, scale=scale)

    # Root tendrils attach the foot without turning into a separate seabed.
    for path in [
        [(690, 878), (588, 912), (482, 946), (380, 964)],
        [(816, 880), (914, 914), (1026, 946), (1132, 966)],
        [(754, 902), (720, 946), (690, 982)],
        [(790, 900), (828, 944), (862, 982)],
    ]:
        draw_rib(d_body, d_detail, path, 18, 8, charcoal, outline, scale)

    body = body.filter(ImageFilter.GaussianBlur(radius=0.08 * scale))
    image.alpha_composite(body)
    image.alpha_composite(detail)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(image)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
