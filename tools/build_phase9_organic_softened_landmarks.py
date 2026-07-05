#!/usr/bin/env python3
"""Build Phase 9 organic-softened transition-deep landmarks for Water9."""

from __future__ import annotations

import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"


LANDMARKS: list[dict[str, Any]] = [
    {
        "id": "phase9-transition-organic-drowned-gantry",
        "sourceId": "phase8-transition-drowned-mining-gantry",
        "sourceFilename": "water9-phase8-transition-drowned-mining-gantry.png",
        "filename": "water9-phase9-transition-organic-drowned-gantry.png",
        "label": "Phase 9 organic-softened drowned gantry reef",
        "safeOpacity": 0.31,
        "scaleRange": [1.3, 2.04],
        "parallaxRange": [0.085, 0.16],
        "readabilityRisk": "medium",
        "lane": "mid",
        "seed": 9101,
    },
    {
        "id": "phase9-transition-organic-reef-arch",
        "sourceId": "phase8-transition-reef-arch-remnant",
        "sourceFilename": "water9-phase8-transition-reef-arch-remnant.png",
        "filename": "water9-phase9-transition-organic-reef-arch.png",
        "label": "Phase 9 organic-softened reef arch grotto",
        "safeOpacity": 0.28,
        "scaleRange": [1.2, 1.9],
        "parallaxRange": [0.045, 0.09],
        "readabilityRisk": "low",
        "lane": "far",
        "seed": 9102,
    },
    {
        "id": "phase9-transition-organic-cable-kelp-chain",
        "sourceId": "phase8-transition-cable-buoy-chain",
        "sourceFilename": "water9-phase8-transition-cable-buoy-chain.png",
        "filename": "water9-phase9-transition-organic-cable-kelp-chain.png",
        "label": "Phase 9 organic-softened cable kelp chain",
        "safeOpacity": 0.32,
        "scaleRange": [1.14, 1.76],
        "parallaxRange": [0.13, 0.22],
        "readabilityRisk": "medium",
        "lane": "near",
        "seed": 9103,
    },
    {
        "id": "phase9-transition-organic-brine-curtain",
        "sourceId": "phase8-transition-brine-curtain-ruin",
        "sourceFilename": "water9-phase8-transition-brine-curtain-ruin.png",
        "filename": "water9-phase9-transition-organic-brine-curtain.png",
        "label": "Phase 9 organic-softened brine curtain reef",
        "safeOpacity": 0.30,
        "scaleRange": [1.18, 1.86],
        "parallaxRange": [0.08, 0.155],
        "readabilityRisk": "medium",
        "lane": "mid",
        "seed": 9104,
    },
    {
        "id": "phase9-transition-organic-vent-garden",
        "sourceId": "phase8-transition-trench-vent-lattice",
        "sourceFilename": "water9-phase8-transition-trench-vent-lattice.png",
        "filename": "water9-phase9-transition-organic-vent-garden.png",
        "label": "Phase 9 organic-softened trench vent garden",
        "safeOpacity": 0.29,
        "scaleRange": [1.12, 1.74],
        "parallaxRange": [0.09, 0.17],
        "readabilityRisk": "medium",
        "lane": "mid",
        "seed": 9105,
    },
    {
        "id": "phase9-transition-organic-collapsed-elevator",
        "sourceId": "phase8-transition-collapsed-sub-elevator",
        "sourceFilename": "water9-phase8-transition-collapsed-sub-elevator.png",
        "filename": "water9-phase9-transition-organic-collapsed-elevator.png",
        "label": "Phase 9 organic-softened collapsed elevator reef",
        "safeOpacity": 0.31,
        "scaleRange": [1.22, 1.94],
        "parallaxRange": [0.075, 0.15],
        "readabilityRisk": "medium",
        "lane": "mid",
        "seed": 9106,
    },
    {
        "id": "phase9-transition-organic-rib-reef",
        "sourceId": "phase8-transition-rib-field",
        "sourceFilename": "water9-phase8-transition-rib-field.png",
        "filename": "water9-phase9-transition-organic-rib-reef.png",
        "label": "Phase 9 organic-softened rib reef field",
        "safeOpacity": 0.27,
        "scaleRange": [1.24, 2.0],
        "parallaxRange": [0.04, 0.085],
        "readabilityRisk": "low",
        "lane": "far",
        "seed": 9107,
    },
    {
        "id": "phase9-transition-organic-pipe-reef",
        "sourceId": "phase8-transition-pipe-cathedral",
        "sourceFilename": "water9-phase8-transition-pipe-cathedral.png",
        "filename": "water9-phase9-transition-organic-pipe-reef.png",
        "label": "Phase 9 organic-softened pipe reef cathedral",
        "safeOpacity": 0.33,
        "scaleRange": [1.2, 1.9],
        "parallaxRange": [0.12, 0.21],
        "readabilityRisk": "medium",
        "lane": "near",
        "seed": 9108,
    },
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def bounds(alpha: Image.Image) -> tuple[int, int, int, int]:
    return alpha.getbbox() or (0, 0, alpha.width, alpha.height)


def stroke(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], width: int) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")


def add_mottled_value(image: Image.Image, alpha: Image.Image, rng: random.Random) -> Image.Image:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    x0, y0, x1, y1 = bounds(alpha)
    for _ in range(130):
        w = rng.randint(22, 112)
        h = rng.randint(12, 58)
        x = rng.randint(max(0, x0 - 20), min(image.width - 1, x1 + 20))
        y = rng.randint(max(0, y0 - 20), min(image.height - 1, y1 + 20))
        color = rng.choice([
            (18, 64, 73, rng.randint(18, 48)),
            (58, 88, 66, rng.randint(14, 42)),
            (107, 121, 86, rng.randint(10, 30)),
            (4, 16, 30, rng.randint(20, 58)),
        ])
        draw.ellipse((x - w, y - h, x + w, y + h), fill=color)
    clipped = Image.new("RGBA", image.size, (0, 0, 0, 0))
    clipped.paste(layer, mask=alpha.filter(ImageFilter.GaussianBlur(1.8)))
    return Image.alpha_composite(image, clipped)


def erode_edges(image: Image.Image, rng: random.Random) -> Image.Image:
    alpha = image.getchannel("A")
    x0, y0, x1, y1 = bounds(alpha)
    erosion = Image.new("L", image.size, 255)
    draw = ImageDraw.Draw(erosion)

    for _ in range(95):
        side = rng.choice(["top", "bottom", "left", "right", "inside"])
        if side == "top":
            x = rng.randint(x0, x1)
            y = rng.randint(max(0, y0 - 26), y0 + max(18, (y1 - y0) // 6))
        elif side == "bottom":
            x = rng.randint(x0, x1)
            y = rng.randint(y1 - max(18, (y1 - y0) // 5), min(image.height - 1, y1 + 18))
        elif side == "left":
            x = rng.randint(max(0, x0 - 22), x0 + max(18, (x1 - x0) // 8))
            y = rng.randint(y0, y1)
        elif side == "right":
            x = rng.randint(x1 - max(18, (x1 - x0) // 8), min(image.width - 1, x1 + 22))
            y = rng.randint(y0, y1)
        else:
            x = rng.randint(x0, x1)
            y = rng.randint(y0, y1)
        w = rng.randint(10, 58)
        h = rng.randint(7, 36)
        value = rng.randint(70, 210) if side == "inside" else rng.randint(0, 165)
        draw.ellipse((x - w, y - h, x + w, y + h), fill=value)

    for _ in range(34):
        x = rng.randint(x0, x1)
        y = rng.randint(y0, y1)
        length = rng.randint(50, 180)
        pts = []
        for i in range(6):
            t = i / 5
            pts.append((x + (t - 0.5) * length, y + math.sin(t * math.pi * 2 + rng.random()) * rng.randint(4, 24)))
        stroke(draw, pts, rng.randint(86, 220), rng.randint(3, 13))

    softened = ImageChops.multiply(alpha, erosion.filter(ImageFilter.GaussianBlur(2.4)))
    blurred = softened.filter(ImageFilter.GaussianBlur(0.35))
    result = image.copy()
    result.putalpha(blurred)
    return result


def add_overgrowth(image: Image.Image, asset_id: str, rng: random.Random) -> Image.Image:
    alpha = image.getchannel("A")
    x0, y0, x1, y1 = bounds(alpha)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")

    for _ in range(42):
        base_x = rng.randint(x0, x1)
        base_y = rng.randint(max(y0, y1 - (y1 - y0) // 3), y1)
        height = rng.randint(38, 150)
        lean = rng.randint(-45, 45)
        pts = [
            (base_x, base_y),
            (base_x + lean * 0.22 + rng.randint(-10, 10), base_y - height * 0.35),
            (base_x + lean * 0.62 + rng.randint(-12, 12), base_y - height * 0.72),
            (base_x + lean + rng.randint(-10, 10), base_y - height),
        ]
        stroke(draw, pts, (37, 95, 78, rng.randint(34, 80)), rng.randint(2, 5))
        tip_x, tip_y = pts[-1]
        draw.ellipse((tip_x - 9, tip_y - 5, tip_x + 13, tip_y + 8), fill=(92, 118, 78, rng.randint(22, 48)))

    for _ in range(85):
        x = rng.randint(x0, x1)
        y = rng.randint(y0, y1)
        r = rng.randint(3, 16)
        fill = rng.choice([
            (72, 106, 83, rng.randint(34, 84)),
            (96, 119, 91, rng.randint(26, 64)),
            (42, 91, 96, rng.randint(28, 68)),
            (142, 137, 99, rng.randint(18, 46)),
        ])
        draw.ellipse((x - r, y - r * 0.65, x + r * 1.3, y + r), fill=fill)

    if "gantry" in asset_id or "elevator" in asset_id:
        for _ in range(26):
            x = rng.randint(x0, x1)
            y = rng.randint(y0 + 18, y0 + max(40, (y1 - y0) // 2))
            stroke(draw, [(x, y), (x + rng.randint(-30, 30), y + rng.randint(50, 135))], (24, 76, 70, 82), rng.randint(3, 7))
    if "pipe" in asset_id or "vent" in asset_id:
        for _ in range(22):
            x = rng.randint(x0, x1)
            y = rng.randint(y0, y1)
            draw.arc((x - 38, y - 26, x + 42, y + 38), rng.randint(180, 250), rng.randint(300, 360), fill=(98, 136, 124, 58), width=rng.randint(3, 7))
    if "arch" in asset_id or "rib" in asset_id:
        for _ in range(30):
            x = rng.randint(x0, x1)
            y = rng.randint(y0, y1)
            stroke(draw, [(x - 28, y + 12), (x, y - rng.randint(18, 55)), (x + 32, y + rng.randint(4, 26))], (120, 136, 111, 48), rng.randint(2, 5))

    clipped = Image.new("RGBA", image.size, (0, 0, 0, 0))
    clipped.paste(layer.filter(ImageFilter.GaussianBlur(0.25)), mask=alpha.filter(ImageFilter.MaxFilter(11)))
    return Image.alpha_composite(image, clipped)


def add_silt_and_rim(image: Image.Image, rng: random.Random) -> Image.Image:
    alpha = image.getchannel("A")
    x0, y0, x1, y1 = bounds(alpha)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")

    for _ in range(44):
        x = rng.randint(x0, x1)
        y = rng.randint(y0, y1)
        length = rng.randint(50, 180)
        pts = [(x + i * length / 5, y + math.sin(i * 1.1 + rng.random()) * rng.randint(3, 18)) for i in range(6)]
        stroke(draw, pts, (161, 168, 130, rng.randint(10, 34)), rng.randint(1, 4))

    edge = alpha.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.2))
    rim = Image.new("RGBA", image.size, (99, 166, 174, 0))
    rim.putalpha(edge.point(lambda p: min(92, int(p * 0.42))))
    layer = Image.alpha_composite(layer, rim)

    shadow = Image.new("RGBA", image.size, (0, 3, 9, 0))
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(7)).point(lambda p: int(p * 0.18))
    shadow.putalpha(shadow_alpha)
    return Image.alpha_composite(Image.alpha_composite(shadow, image), layer)


def blob(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, rng: random.Random, fill: tuple[int, int, int, int], points: int = 14) -> None:
    pts = []
    phase = rng.random() * math.tau
    for index in range(points):
        angle = phase + math.tau * index / points
        wobble = rng.uniform(0.68, 1.28)
        pts.append((cx + math.cos(angle) * rx * wobble, cy + math.sin(angle) * ry * wobble))
    draw.polygon(pts, fill=fill)


def tube(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], rim_fill: tuple[int, int, int, int], width: int) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")
    draw.line(points, fill=rim_fill, width=max(2, width // 4), joint="curve")


def coral_cluster(draw: ImageDraw.ImageDraw, x: float, y: float, rng: random.Random, scale: float = 1) -> None:
    for _ in range(rng.randint(4, 9)):
        bx = x + rng.uniform(-34, 34) * scale
        by = y + rng.uniform(-18, 18) * scale
        blob(draw, bx, by, rng.uniform(8, 22) * scale, rng.uniform(5, 16) * scale, rng, rng.choice([
            (58, 95, 77, rng.randint(50, 104)),
            (84, 111, 84, rng.randint(38, 84)),
            (38, 88, 95, rng.randint(42, 92)),
            (116, 123, 90, rng.randint(28, 66)),
        ]), points=rng.randint(7, 11))


def kelp(draw: ImageDraw.ImageDraw, x: float, y: float, rng: random.Random, height: float, count: int = 6) -> None:
    for _ in range(count):
        base_x = x + rng.uniform(-44, 44)
        lean = rng.uniform(-42, 42)
        pts = []
        for index in range(5):
            t = index / 4
            pts.append((
                base_x + math.sin(t * math.pi * 1.5 + rng.random()) * 15 + lean * t,
                y - height * t,
            ))
        tube(draw, pts, (26, 83, 73, rng.randint(46, 92)), (94, 122, 85, rng.randint(20, 46)), rng.randint(2, 5))


def organic_base(asset_id: str, size: tuple[int, int], rng: random.Random) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    w, h = size
    dark = (3, 13, 25, 142)
    mid = (8, 35, 48, 116)
    rim_col = (99, 155, 162, 74)

    if "drowned-gantry" in asset_id:
        blob(draw, w * 0.5, h * 0.83, w * 0.45, h * 0.08, rng, (2, 10, 19, 140), 18)
        ridge = [(w * 0.08, h * 0.72), (w * 0.22, h * 0.62), (w * 0.38, h * 0.66), (w * 0.52, h * 0.52), (w * 0.74, h * 0.58), (w * 0.91, h * 0.46)]
        tube(draw, ridge, dark, rim_col, 34)
        for x, y, lean, length in [(0.18, 0.7, -0.08, 0.42), (0.31, 0.68, 0.1, 0.52), (0.52, 0.6, -0.06, 0.48), (0.7, 0.58, 0.09, 0.42), (0.84, 0.48, -0.06, 0.34)]:
            pts = [(w * x, h * y), (w * (x + lean * 0.5), h * (y - length * 0.48)), (w * (x + lean), h * (y - length))]
            tube(draw, pts, (4, 18, 33, 132), rim_col, rng.randint(24, 38))
            coral_cluster(draw, w * x, h * y, rng, 0.9)
        for _ in range(8):
            x = rng.uniform(w * 0.15, w * 0.85)
            y = rng.uniform(h * 0.42, h * 0.78)
            tube(draw, [(x - 55, y + rng.uniform(-20, 20)), (x, y + rng.uniform(-36, 36)), (x + 70, y + rng.uniform(-28, 28))], mid, (96, 140, 142, 42), rng.randint(6, 12))
        blob(draw, w * 0.48, h * 0.18, 58, 34, rng, (4, 20, 37, 116), 16)
        kelp(draw, w * 0.5, h * 0.78, rng, h * 0.38, 10)

    elif "reef-arch" in asset_id:
        for index in range(18):
            a = math.radians(205 + index * 7.4)
            x = w * 0.5 + math.cos(a) * w * 0.36
            y = h * 0.82 + math.sin(a) * h * 0.66
            blob(draw, x, y, rng.uniform(36, 74), rng.uniform(22, 48), rng, dark if index % 3 else mid, 13)
            coral_cluster(draw, x, y, rng, 0.72)
        tube(draw, [(w * 0.16, h * 0.68), (w * 0.24, h * 0.32), (w * 0.42, h * 0.15), (w * 0.62, h * 0.18), (w * 0.8, h * 0.42), (w * 0.9, h * 0.78)], (5, 22, 35, 92), rim_col, 18)
        kelp(draw, w * 0.22, h * 0.82, rng, h * 0.42, 7)
        kelp(draw, w * 0.78, h * 0.84, rng, h * 0.38, 7)

    elif "cable-kelp-chain" in asset_id:
        pts = []
        for index in range(12):
            t = index / 11
            pts.append((w * (0.08 + 0.84 * t), h * (0.28 + 0.45 * t + math.sin(t * math.tau * 1.65) * 0.18)))
        tube(draw, pts, (8, 37, 52, 122), rim_col, 18)
        for x, y in pts:
            blob(draw, x, y, 30, 17, rng, (5, 23, 38, 112), 10)
            if rng.random() < 0.55:
                kelp(draw, x, y + 8, rng, rng.uniform(54, 140), 4)
            coral_cluster(draw, x, y, rng, 0.42)
        blob(draw, w * 0.12, h * 0.74, w * 0.13, h * 0.08, rng, (3, 15, 28, 104), 11)
        blob(draw, w * 0.86, h * 0.33, w * 0.12, h * 0.09, rng, (3, 15, 28, 104), 11)

    elif "brine-curtain" in asset_id:
        crest = [(w * 0.1, h * 0.22), (w * 0.25, h * 0.18), (w * 0.42, h * 0.24), (w * 0.58, h * 0.17), (w * 0.78, h * 0.25), (w * 0.92, h * 0.19)]
        tube(draw, crest, (4, 20, 31, 86), rim_col, 10)
        for index, (x, y) in enumerate(crest):
            blob(draw, x, y + rng.uniform(-8, 10), rng.uniform(42, 76), rng.uniform(16, 34), rng, dark if index % 2 else mid, 13)
        for _ in range(12):
            blob(draw, rng.uniform(w * 0.12, w * 0.9), rng.uniform(h * 0.16, h * 0.3), rng.uniform(18, 52), rng.uniform(9, 24), rng, (52, 95, 78, rng.randint(28, 66)), 10)
        for index in range(28):
            x = w * (0.1 + 0.82 * index / 27)
            y = h * (0.21 + rng.uniform(-0.03, 0.04))
            pts = [(x, y), (x + rng.uniform(-26, 26), h * 0.48), (x + rng.uniform(-42, 42), h * rng.uniform(0.68, 0.94))]
            tube(draw, pts, rng.choice([(42, 83, 70, 72), (85, 101, 64, 54), (9, 37, 49, 76)]), (126, 140, 98, 26), rng.randint(4, 12))
        for _ in range(12):
            blob(draw, rng.uniform(w * 0.16, w * 0.86), rng.uniform(h * 0.72, h * 0.95), rng.uniform(28, 80), rng.uniform(10, 34), rng, (4, 16, 23, 64), 12)

    elif "vent-garden" in asset_id:
        blob(draw, w * 0.5, h * 0.84, w * 0.44, h * 0.11, rng, (3, 12, 21, 132), 16)
        for index in range(10):
            x = w * (0.11 + 0.78 * index / 9) + rng.uniform(-18, 18)
            base_y = h * rng.uniform(0.72, 0.86)
            top_y = h * rng.uniform(0.18, 0.48)
            pts = [(x, base_y), (x + rng.uniform(-18, 18), (base_y + top_y) * 0.55), (x + rng.uniform(-30, 30), top_y)]
            tube(draw, pts, (4, 18, 30, 128), rim_col, rng.randint(18, 34))
            blob(draw, pts[-1][0], pts[-1][1], rng.uniform(16, 32), rng.uniform(10, 22), rng, (12, 47, 56, 92), 10)
            coral_cluster(draw, x, base_y, rng, 0.7)
        kelp(draw, w * 0.52, h * 0.86, rng, h * 0.35, 12)

    elif "collapsed-elevator" in asset_id:
        hull = [(w * 0.12, h * 0.56), (w * 0.24, h * 0.25), (w * 0.62, h * 0.34), (w * 0.86, h * 0.54), (w * 0.72, h * 0.78), (w * 0.3, h * 0.72)]
        draw.polygon([(x + rng.uniform(-20, 20), y + rng.uniform(-16, 16)) for x, y in hull], fill=(4, 16, 29, 128))
        tube(draw, hull + [hull[0]], (0, 0, 0, 0), rim_col, 13)
        for _ in range(9):
            blob(draw, rng.uniform(w * 0.22, w * 0.72), rng.uniform(h * 0.34, h * 0.68), rng.uniform(18, 42), rng.uniform(12, 34), rng, (1, 7, 16, 98), 9)
        for _ in range(8):
            x = rng.uniform(w * 0.12, w * 0.84)
            y = rng.uniform(h * 0.34, h * 0.78)
            tube(draw, [(x - 62, y + rng.uniform(-28, 24)), (x, y), (x + 84, y + rng.uniform(-34, 26))], mid, (98, 138, 142, 38), rng.randint(6, 13))
        kelp(draw, w * 0.62, h * 0.82, rng, h * 0.42, 12)
        coral_cluster(draw, w * 0.24, h * 0.65, rng, 1.0)
        coral_cluster(draw, w * 0.73, h * 0.73, rng, 1.0)

    elif "rib-reef" in asset_id:
        blob(draw, w * 0.5, h * 0.84, w * 0.45, h * 0.1, rng, (2, 10, 18, 132), 18)
        for index in range(12):
            x = w * (0.08 + 0.84 * index / 11)
            height = h * rng.uniform(0.42, 0.76)
            pts = []
            for step in range(9):
                t = step / 8
                angle = math.radians(248 - 198 * t)
                pts.append((x + math.cos(angle) * w * 0.07 * (0.78 + t), h * 0.82 + math.sin(angle) * height))
            tube(draw, pts, (77, 118, 114, rng.randint(82, 126)), (193, 207, 179, 36), rng.randint(11, 18))
            coral_cluster(draw, x, h * 0.82, rng, 0.55)
        kelp(draw, w * 0.5, h * 0.86, rng, h * 0.3, 10)

    elif "pipe-reef" in asset_id:
        blob(draw, w * 0.5, h * 0.84, w * 0.45, h * 0.08, rng, (2, 9, 17, 126), 18)
        for index in range(8):
            x = w * (0.09 + 0.82 * index / 7) + rng.uniform(-12, 12)
            top = h * rng.uniform(0.14, 0.32)
            bottom = h * rng.uniform(0.72, 0.9)
            pts = []
            for step in range(6):
                t = step / 5
                pts.append((x + math.sin(t * math.pi * 1.6 + index) * rng.uniform(6, 22), top + (bottom - top) * t))
            tube(draw, pts, (4, 18, 30, 130), rim_col, rng.randint(32, 56))
            blob(draw, pts[0][0], pts[0][1], rng.uniform(22, 42), rng.uniform(12, 28), rng, (2, 10, 20, 112), 12)
            coral_cluster(draw, x, bottom, rng, 0.7)
        for band in [0.32, 0.52, 0.7]:
            pts = []
            for step in range(9):
                t = step / 8
                pts.append((w * (0.08 + 0.84 * t), h * (band + math.sin(t * math.tau * 1.25 + band) * 0.035)))
            tube(draw, pts, (8, 35, 46, 46), (102, 147, 142, 22), rng.randint(4, 8))
        kelp(draw, w * 0.48, h * 0.86, rng, h * 0.42, 14)

    else:
        blob(draw, w * 0.5, h * 0.55, w * 0.36, h * 0.24, rng, dark, 18)

    alpha = image.getchannel("A")
    image = erode_edges(image, rng)
    image = add_mottled_value(image, image.getchannel("A"), rng)
    image = add_overgrowth(image, asset_id, rng)
    image = add_silt_and_rim(image, rng)
    return image


def organic_soften(source_path: Path, out_path: Path, asset_id: str, seed: int) -> None:
    rng = random.Random(seed)
    with Image.open(source_path) as source:
        size = source.size
    image = organic_base(asset_id, size, rng)
    image = image.filter(ImageFilter.GaussianBlur(0.18))
    image.save(out_path)


def entry(asset: dict[str, Any]) -> dict[str, Any]:
    path = OUT_DIR / asset["filename"]
    with Image.open(path) as image:
        size = list(image.size)
    return {
        "id": asset["id"],
        "role": "landmark",
        "band": "transitionDeep",
        "label": asset["label"],
        "repeatMode": "anchor",
        "path": rel(path),
        "status": "ready",
        "safeOpacity": asset["safeOpacity"],
        "scaleRange": asset["scaleRange"],
        "parallaxRange": asset["parallaxRange"],
        "readabilityRisk": asset["readabilityRisk"],
        "size": size,
        "authoredPhase": 9,
        "depthLane": asset["lane"],
        "sourcePhase8AssetId": asset["sourceId"],
        "notes": "Phase 9 organic softening pass: eroded contours, reef/kelp overgrowth, silt, asymmetry, mottled internal value, and softened dissolved edges while preserving Phase 8 swim-by landmark identity.",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for asset in LANDMARKS:
        source_path = OUT_DIR / asset["sourceFilename"]
        if not source_path.exists():
            raise FileNotFoundError(f"missing Phase 8 source asset: {source_path}")
        organic_soften(source_path, OUT_DIR / asset["filename"], asset["id"], int(asset["seed"]))

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    phase9_ids = {asset["id"] for asset in LANDMARKS}
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in phase9_ids]
    manifest["assets"].extend(entry(asset) for asset in LANDMARKS)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = manifest.setdefault("notes", [])
    note = "Phase 9 keeps Phase 8 transition-deep swim-by landmarks but organically softens them with eroded contours, reef/kelp growth, silt, asymmetry, and painterly value variation."
    if note not in notes:
        notes.append(note)
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "manifest": rel(MANIFEST),
        "generated": [rel(OUT_DIR / asset["filename"]) for asset in LANDMARKS],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
