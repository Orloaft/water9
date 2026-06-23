#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Brine Mycelium Shelf.

This is a source-review candidate only. It is not production approval.
"""

from __future__ import annotations

import math
import random
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/brine-mycelium-shelf.png"
MAGENTA = (255, 0, 255, 255)
RNG = random.Random(604177)


def scaled(points: list[tuple[float, float]], scale: int) -> list[tuple[int, int]]:
    return [(round(x * scale), round(y * scale)) for x, y in points]


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, outline=None, scale: int = 1) -> None:
    draw.polygon(scaled(points, scale), fill=fill, outline=outline)


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


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, width: float, scale: int = 1) -> None:
    draw.line(scaled(points, scale), fill=fill, width=max(1, round(width * scale)), joint="curve")


def arc_points(cx: float, cy: float, rx: float, ry: float, start: float, end: float, steps: int = 44) -> list[tuple[float, float]]:
    return [
        (
            cx + math.cos(start + (end - start) * index / steps) * rx,
            cy + math.sin(start + (end - start) * index / steps) * ry,
        )
        for index in range(steps + 1)
    ]


def plate_points(
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    tilt: float,
    top_bite: float = 0.0,
    bottom_bite: float = 0.0,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(18):
        t = math.pi * (1 - i / 17)
        wobble = 1 + 0.05 * math.sin(i * 1.7 + cx * 0.01)
        x = math.cos(t) * rx * wobble
        y = math.sin(t) * ry * (1 - top_bite * math.sin(t))
        points.append((cx + x + y * tilt, cy - y))
    for i in range(18):
        t = math.pi * (i / 17)
        wobble = 1 + 0.04 * math.cos(i * 1.4 + cy * 0.01)
        x = math.cos(t) * rx * wobble
        y = math.sin(t) * ry * (0.82 - bottom_bite * math.sin(t))
        points.append((cx + x - y * tilt * 0.35, cy + y))
    return points


def draw_plate(
    body: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    tilt: float,
    fill,
    rim,
    outline,
    scale: int,
    pore_bias: float,
) -> list[tuple[float, float]]:
    points = plate_points(cx, cy, rx, ry, tilt, top_bite=0.08, bottom_bite=0.14)
    shadow_points = [(x + 0, y + 8) for x, y in points]
    polygon(body, shadow_points, outline, scale=scale)
    polygon(body, points, fill, outline=outline, scale=scale)

    upper = arc_points(cx + tilt * 20, cy - 5, rx * 0.84, ry * 0.62, math.radians(198), math.radians(342), 40)
    lower = arc_points(cx - tilt * 12, cy + 7, rx * 0.84, ry * 0.42, math.radians(25), math.radians(155), 36)
    line(detail, upper, rim, 8, scale)
    line(detail, lower, (17, 44, 39, 180), 6, scale)

    for rib_index in range(-2, 3):
        offset = rib_index * rx * 0.16
        root = (cx + offset * 0.22, cy + ry * 0.38)
        tip = (cx + offset + tilt * ry * 0.22, cy - ry * (0.38 + 0.06 * abs(rib_index)))
        line(detail, [root, tip], (220, 213, 152, 125), 4.5, scale)

    for _ in range(38):
        angle = RNG.uniform(-2.45, -0.68)
        radius = RNG.uniform(0.18, 0.85)
        x = cx + math.cos(angle) * rx * radius + tilt * RNG.uniform(-12, 12)
        y = cy + math.sin(angle) * ry * radius * 0.72
        color = RNG.choice([
            (231, 221, 155, 95),
            (168, 195, 105, 95),
            (67, 116, 96, 88),
            (29, 68, 58, 108),
        ])
        ellipse(detail, x, y, RNG.uniform(1.6, 3.8), RNG.uniform(1.0, 2.9), color, scale=scale)

    # A few cold pores mark this as alive without adding detached VFX.
    for i in range(6):
        x = cx + (i - 2.5) * rx * 0.13
        y = cy - ry * (0.16 + 0.02 * math.sin(i))
        ellipse(detail, x, y, 5 + pore_bias, 3 + pore_bias * 0.4, (10, 38, 38, 210), scale=scale)
        ellipse(detail, x + 1, y - 1, 2, 1.4, (81, 184, 177, 160), scale=scale)

    return points


def clean_inner_magenta(image: Image.Image) -> None:
    width, height = image.size
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 80 and red >= 180 and blue >= 180 and green <= 96:
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
                pixels[x, y] = (13, 31, 28, 255)

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
        if len(component) < max(240, largest * 0.0012):
            for x, y in component:
                pixels[x, y] = MAGENTA


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

    outline = (8, 25, 23, 255)
    charcoal = (15, 39, 34, 255)
    dark_teal = (31, 80, 67, 255)
    teal = (55, 121, 94, 255)
    sickly = (116, 151, 74, 255)
    sulfur = (201, 184, 80, 255)
    bone = (221, 211, 157, 255)
    rim = (234, 226, 169, 190)
    glow = (83, 188, 173, 175)

    # Soft body-local backing shadow only, blurred into the organism before final key cleanup.
    base_shadow = [
        (254, 802), (344, 726), (514, 682), (746, 648), (958, 674),
        (1164, 730), (1288, 814), (1206, 892), (962, 916), (672, 906),
        (410, 880),
    ]
    polygon(d_shadow, base_shadow, (2, 13, 12, 165), scale=scale)
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(5 * scale)))
    image.alpha_composite(shadow)

    # Continuous mycelial root mat.
    root_top = [(260, 778), (334, 720), (456, 684), (596, 656), (738, 638), (898, 654), (1046, 688), (1192, 734), (1302, 806)]
    root_bottom = [(1250, 878), (1086, 910), (890, 918), (682, 906), (486, 888), (330, 858), (238, 820)]
    root_mat = root_top + root_bottom
    polygon(d_body, root_mat, charcoal, outline=outline, scale=scale)
    polygon(
        d_body,
        [(314, 785), (432, 730), (594, 704), (748, 692), (914, 702), (1076, 736), (1218, 802), (1138, 850), (910, 864), (690, 854), (474, 836)],
        (39, 83, 64, 255),
        outline=(11, 35, 31, 255),
        scale=scale,
    )

    # Crop-safe shelf plates. Draw rear plates first, then connected hinge collars.
    plates = [
        (540, 548, 300, 92, -0.16, (63, 119, 82, 255), 2.2),
        (972, 558, 312, 94, 0.16, (58, 115, 86, 255), 2.0),
        (752, 444, 360, 106, 0.02, (84, 135, 86, 255), 2.6),
        (612, 650, 284, 88, -0.06, (86, 137, 76, 255), 1.8),
        (918, 658, 300, 90, 0.08, (78, 131, 82, 255), 1.8),
        (768, 748, 398, 96, 0.0, (92, 139, 80, 255), 2.4),
    ]
    for spec in plates:
        draw_plate(d_body, d_detail, *spec[:6], rim, outline, scale, spec[6])

    hinge_specs = [
        (536, 624, 118, 38, -0.14),
        (982, 624, 126, 40, 0.14),
        (752, 552, 156, 48, 0.0),
        (622, 724, 128, 36, -0.08),
        (914, 724, 134, 38, 0.08),
        (764, 806, 188, 43, 0.0),
    ]
    for cx, cy, rx, ry, tilt in hinge_specs:
        points = plate_points(cx, cy, rx, ry, tilt, top_bite=0.0, bottom_bite=0.06)
        polygon(d_body, points, dark_teal, outline=outline, scale=scale)
        line(d_detail, arc_points(cx, cy - 6, rx * 0.74, ry * 0.45, math.radians(205), math.radians(335), 32), bone, 6, scale)

    # Root web visibly ties each plate into one sessile organism.
    web_roots = [(438, 798), (562, 804), (688, 806), (820, 808), (956, 808), (1084, 812)]
    web_targets = [(520, 624), (620, 642), (744, 554), (880, 642), (990, 624), (768, 748)]
    for root, target in zip(web_roots, web_targets):
        mid = ((root[0] + target[0]) * 0.5 + RNG.uniform(-26, 26), (root[1] + target[1]) * 0.5 + RNG.uniform(-20, 10))
        line(d_detail, [root, mid, target], (187, 189, 103, 180), 10, scale)
        line(d_detail, [root, mid, target], (28, 70, 57, 210), 4, scale)

    # Central spore sac and pores are the main active gameplay read.
    ellipse(d_body, 768, 562, 168, 138, (126, 151, 79, 255), outline=outline, width=8, scale=scale)
    ellipse(d_body, 746, 526, 116, 86, (165, 174, 98, 255), outline=(34, 75, 57, 235), width=5, scale=scale)
    ellipse(d_body, 808, 596, 96, 76, (69, 111, 77, 255), outline=(21, 55, 47, 240), width=4, scale=scale)
    ellipse(d_detail, 730, 486, 38, 22, (219, 212, 139, 180), scale=scale)

    pore_centers = [
        (714, 548), (748, 526), (786, 528), (824, 556), (778, 586),
        (734, 602), (814, 620), (768, 560), (702, 578), (846, 592),
    ]
    for i, (x, y) in enumerate(pore_centers):
        size = 11 + (i % 3) * 2
        ellipse(d_detail, x, y, size, size * 0.72, (7, 31, 28, 235), outline=(179, 190, 111, 150), width=2, scale=scale)
        ellipse(d_detail, x + 2, y - 2, size * 0.28, size * 0.18, glow, scale=scale)

    # Brittle front lip: a clear extend/recoil crop zone, attached to the lower mat.
    lip = [
        (434, 822), (564, 780), (706, 762), (860, 764), (1020, 790),
        (1132, 842), (1032, 884), (850, 886), (666, 878), (508, 860),
    ]
    polygon(d_body, lip, (180, 162, 74, 255), outline=outline, scale=scale)
    line(d_detail, [(500, 822), (670, 800), (840, 806), (1020, 836)], (235, 222, 152, 205), 8, scale)
    for x in range(500, 1050, 76):
        line(d_detail, [(x, 816 + RNG.uniform(-9, 8)), (x + RNG.uniform(-18, 22), 864 + RNG.uniform(-8, 8))], (45, 70, 45, 150), 4, scale)

    # Sparse attached filament fringe. Each strand starts inside tissue; no detached spore clouds.
    fringe_roots = [
        (320, 800), (390, 824), (470, 840), (560, 850), (650, 856), (742, 862),
        (836, 862), (932, 858), (1030, 848), (1124, 830), (1210, 804),
    ]
    for root in fringe_roots:
        for strand in range(3):
            dx = RNG.uniform(-16, 16)
            length = RNG.uniform(32, 58)
            tip = (root[0] + dx + strand * 4, root[1] + length)
            ctrl = ((root[0] + tip[0]) * 0.5 + RNG.uniform(-8, 8), (root[1] + tip[1]) * 0.5)
            line(d_detail, [root, ctrl, tip], (206, 204, 126, 150), 3.0, scale)

    # Integrated warning tissue patches and cracks.
    for _ in range(105):
        x = RNG.uniform(360, 1180)
        y = RNG.uniform(470, 850)
        if RNG.random() < 0.36 and 650 < x < 890 and 455 < y < 690:
            color = RNG.choice([(214, 197, 85, 115), (91, 159, 113, 110), (226, 222, 157, 100)])
        else:
            color = RNG.choice([(33, 78, 63, 105), (151, 166, 82, 90), (217, 203, 126, 75)])
        ellipse(d_detail, x, y, RNG.uniform(3, 8), RNG.uniform(1.4, 4.6), color, scale=scale)

    for _ in range(34):
        x = RNG.uniform(430, 1110)
        y = RNG.uniform(515, 830)
        pts = [(x, y), (x + RNG.uniform(16, 36), y + RNG.uniform(-8, 10)), (x + RNG.uniform(38, 58), y + RNG.uniform(-12, 14))]
        line(d_detail, pts, (20, 48, 41, 140), 3.2, scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
