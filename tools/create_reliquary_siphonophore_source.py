#!/usr/bin/env python3
"""Create a whole-source magenta-key candidate for Reliquary Siphonophore.

This creates a source-review candidate only. It is not production approval.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

from create_chain_vein_siphonophore_source import (
    MAGENTA,
    clean_inner_magenta,
    draw_ribbon,
    ellipse,
    line,
    polygon,
    smooth_path,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/reliquary-siphonophore.png"
RNG = random.Random(318604)


def membrane_points(cx: float, cy: float, rx: float, ry: float, skew: float) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(26):
        angle = math.radians(205 + 130 * i / 25)
        x = cx + math.cos(angle) * rx
        y = cy + math.sin(angle) * ry
        points.append((x + (y - cy) * skew, y))
    for i in range(18):
        angle = math.radians(25 + 130 * i / 17)
        x = cx + math.cos(angle) * rx * 0.78
        y = cy + math.sin(angle) * ry * 0.58
        points.append((x - (y - cy) * skew * 0.4, y + ry * 0.22))
    return points


def draw_membrane(
    body: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    skew: float,
    fill,
    outline,
    scale: int,
) -> None:
    points = membrane_points(cx, cy, rx, ry, skew)
    polygon(body, points, fill, outline=outline, scale=scale)
    line(detail, [(cx - rx * 0.62, cy + ry * 0.2), (cx + rx * 0.58, cy + ry * 0.34)], (202, 238, 229, 160), 5, scale)
    line(detail, [(cx - rx * 0.28, cy - ry * 0.42), (cx + rx * 0.18, cy + ry * 0.58)], (31, 90, 103, 170), 3, scale)
    ellipse(detail, cx - rx * 0.12, cy - ry * 0.02, rx * 0.22, ry * 0.16, (224, 246, 238, 92), scale=scale)


def draw_zooid_chain(
    body: ImageDraw.ImageDraw,
    detail: ImageDraw.ImageDraw,
    anchors: list[tuple[float, float]],
    outline,
    scale: int,
) -> None:
    line(detail, anchors, (102, 201, 195, 190), 10, scale)
    line(detail, anchors, (16, 62, 72, 230), 4, scale)
    for index, (x, y) in enumerate(anchors):
        rx = 26 + (index % 2) * 6
        ry = 18 + (index % 3) * 3
        ellipse(body, x, y, rx + 4, ry + 4, outline, scale=scale)
        ellipse(body, x, y, rx, ry, (44, 121, 127, 255), scale=scale)
        ellipse(detail, x - 5, y - 5, rx * 0.34, ry * 0.22, (165, 235, 223, 150), scale=scale)


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_body = ImageDraw.Draw(body)
    d_detail = ImageDraw.Draw(detail)

    outline = (6, 22, 31, 255)
    black_teal = (8, 37, 46, 255)
    deep_teal = (24, 80, 92, 255)
    mid_teal = (54, 139, 139, 255)
    cold_blue = (88, 151, 171, 255)
    glass = (137, 202, 208, 235)
    ivory = (219, 236, 221, 230)
    dark_polyps = (34, 48, 74, 255)
    lure = (89, 227, 216, 245)
    amber = (218, 148, 61, 245)
    amber_dark = (104, 67, 36, 255)

    # Central continuous colony spine.
    spine_path = [(760, 104), (736, 198), (778, 304), (734, 410), (784, 528), (742, 650), (774, 794), (744, 918)]
    draw_ribbon(d_body, d_detail, spine_path, 24, 38, 21, deep_teal, outline, scale, (122, 224, 214, 170))

    # Four broad tripwire arcs with visible safe gaps.
    tendril_paths = [
        [(690, 462), (572, 580), (482, 742), (430, 928)],
        [(736, 548), (664, 676), (620, 814), (604, 962)],
        [(820, 548), (902, 676), (958, 814), (990, 962)],
        [(876, 462), (1016, 580), (1110, 744), (1162, 928)],
    ]
    tendril_smooths = []
    for index, path in enumerate(tendril_paths):
        fill = (28, 98, 108, 255) if index in (0, 3) else (34, 111, 112, 255)
        tendril_smooths.append(draw_ribbon(d_body, d_detail, path, 18, 29, 13, fill, outline, scale, (117, 225, 214, 165)))

    for smooth in tendril_smooths:
        for step in range(14, len(smooth) - 10, 22):
            x, y = smooth[step]
            ellipse(d_body, x, y, 13, 9, (10, 45, 54, 255), outline=(7, 25, 31, 255), width=2, scale=scale)
            ellipse(d_detail, x + 2, y - 2, 4, 2.8, (165, 239, 224, 145), scale=scale)
        x, y = smooth[-1]
        ellipse(d_body, x, y, 24, 17, amber_dark, outline=outline, width=4, scale=scale)
        ellipse(d_body, x - 2, y - 2, 15, 9, amber, scale=scale)

    # Top pneumatophore / float: organic crest, not a lantern.
    top = [(648, 150), (684, 78), (770, 52), (876, 84), (922, 158), (876, 226), (760, 238), (672, 204)]
    polygon(d_body, top, black_teal, outline=outline, scale=scale)
    ellipse(d_body, 768, 140, 122, 70, (36, 113, 119, 255), outline=(5, 22, 30, 255), width=5, scale=scale)
    ellipse(d_detail, 730, 112, 48, 22, (178, 232, 220, 150), scale=scale)
    line(d_detail, [(714, 178), (760, 226), (792, 300)], (119, 219, 211, 185), 8, scale)

    # Bell clusters and soft membranes. These are staggered to distinguish it from Chain Vein.
    membranes = [
        (634, 272, 92, 64, -0.08),
        (888, 286, 100, 70, 0.08),
        (608, 450, 118, 76, -0.12),
        (914, 452, 124, 78, 0.12),
        (662, 616, 94, 64, -0.04),
        (870, 628, 100, 66, 0.05),
    ]
    for cx, cy, rx, ry, skew in membranes:
        draw_membrane(d_body, d_detail, cx, cy, rx, ry, skew, glass, outline, scale)
        line(d_detail, [(cx + (30 if cx < 760 else -30), cy + 20), (760, cy + 40)], (115, 213, 205, 180), 8, scale)

    # Connected zooid/bract chains read as biological membranes, not jewelry.
    draw_zooid_chain(d_body, d_detail, [(736, 252), (792, 306), (744, 360), (802, 420)], outline, scale)
    draw_zooid_chain(d_body, d_detail, [(774, 492), (724, 548), (786, 606), (734, 668)], outline, scale)

    # Front and rear feeding polyp clusters.
    front_cluster = [(706, 704), (762, 666), (832, 688), (862, 762), (820, 826), (732, 816), (686, 760)]
    rear_cluster = [(806, 362), (858, 340), (910, 374), (912, 432), (860, 468), (804, 438)]
    polygon(d_body, rear_cluster, (24, 57, 76, 255), outline=outline, scale=scale)
    polygon(d_body, front_cluster, dark_polyps, outline=outline, scale=scale)
    for cx, cy in [(734, 734), (776, 710), (816, 728), (804, 774), (752, 782), (858, 398), (834, 424), (878, 424)]:
        ellipse(d_body, cx, cy, 23, 15, (45, 105, 111, 255), outline=(7, 27, 35, 230), width=3, scale=scale)
        ellipse(d_detail, cx - 4, cy - 4, 7, 4, (172, 235, 222, 135), scale=scale)

    # One anatomical lure bead, attached by tissue.
    line(d_body, [(806, 674), (878, 640)], outline, 13, scale)
    line(d_body, [(806, 674), (878, 640)], (48, 135, 134, 255), 8, scale)
    ellipse(d_body, 902, 630, 30, 22, (9, 46, 56, 255), outline=outline, width=4, scale=scale)
    ellipse(d_body, 898, 626, 17, 12, lure, scale=scale)

    # Overlap collars prove everything is joined to one central spine.
    for cx, cy, rx, ry in [(760, 252, 44, 30), (768, 428, 52, 36), (758, 598, 56, 38), (754, 720, 50, 34)]:
        ellipse(d_body, cx, cy, rx, ry, (18, 67, 78, 255), outline=outline, width=4, scale=scale)
        ellipse(d_detail, cx - 8, cy - 8, rx * 0.28, ry * 0.18, (151, 226, 215, 125), scale=scale)

    for _ in range(100):
        x = RNG.uniform(560, 970)
        y = RNG.uniform(120, 830)
        if RNG.random() < 0.25:
            x += RNG.choice([-1, 1]) * RNG.uniform(120, 210)
        color = RNG.choice([
            (103, 210, 201, 86),
            (221, 239, 221, 70),
            (31, 92, 103, 110),
            (96, 135, 156, 78),
        ])
        ellipse(d_detail, x, y, RNG.uniform(1.5, 4.0), RNG.uniform(1.0, 3.0), color, scale=scale)

    image.alpha_composite(body)
    image.alpha_composite(detail)
    composite = image.resize((width, height), Image.Resampling.LANCZOS)
    clean_inner_magenta(composite)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
