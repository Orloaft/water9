#!/usr/bin/env python3
"""Build a B1-only organic signature landmark bitmap for runtime proof."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
OUT_PATH = OUT_DIR / "water9-biome-landmark-shallows-living-coral-terrace.png"


def alpha_stats(image: Image.Image) -> dict[str, int]:
    alpha = image.getchannel("A")
    values = list(alpha.getdata())
    return {
        "transparentPixels": sum(1 for value in values if value == 0),
        "semiTransparentPixels": sum(1 for value in values if 0 < value < 255),
        "opaquePixels": sum(1 for value in values if value == 255),
    }


def edge_fade(size: tuple[int, int], margin_x: int, margin_y: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    pixels = mask.load()
    for y in range(height):
        fy = min(y / margin_y, (height - 1 - y) / margin_y, 1)
        for x in range(width):
            fx = min(x / margin_x, (width - 1 - x) / margin_x, 1)
            edge = max(0, min(fx, fy))
            pixels[x, y] = round((edge * edge * (3 - 2 * edge)) * 255)
    return mask


def multiply_alpha(*masks: Image.Image) -> Image.Image:
    data = [255] * (masks[0].width * masks[0].height)
    for mask in masks:
        data = [round(left * right / 255) for left, right in zip(data, mask.getdata())]
    out = Image.new("L", masks[0].size)
    out.putdata(data)
    return out


def tinted_layer(size: tuple[int, int], color: tuple[int, int, int], alpha: Image.Image, blur: float = 0) -> Image.Image:
    layer = Image.new("RGBA", size, (*color, 255))
    if blur:
        alpha = alpha.filter(ImageFilter.GaussianBlur(blur))
    layer.putalpha(alpha)
    return layer


def irregular_blob_mask(size: tuple[int, int], center: tuple[float, float], radius: tuple[float, float], seed: int, points: int = 42) -> Image.Image:
    rng = random.Random(seed)
    cx, cy = center
    rx, ry = radius
    coords = []
    for i in range(points):
        angle = math.tau * i / points
        wobble = 0.72 + rng.random() * 0.42 + math.sin(angle * 3.1 + seed) * 0.08
        coords.append((cx + math.cos(angle) * rx * wobble, cy + math.sin(angle) * ry * wobble))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(coords, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(3.2))


def build() -> Image.Image:
    size = (1280, 520)
    rng = random.Random(90210)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))

    canopy = Image.new("L", size, 0)
    draw = ImageDraw.Draw(canopy)
    upper = []
    lower = []
    for x in range(-80, size[0] + 100, 42):
        t = x / size[0]
        upper_y = 128 + math.sin(t * math.tau * 1.3) * 24 + math.sin(t * math.tau * 4.9) * 13 + rng.uniform(-10, 10)
        lower_y = 272 + math.sin(t * math.tau * 1.1 + 0.7) * 42 + math.sin(t * math.tau * 6.2) * 18 + rng.uniform(-18, 18)
        upper.append((x, upper_y))
        lower.append((x, lower_y))
    draw.polygon(upper + list(reversed(lower)), fill=230)
    canopy = canopy.filter(ImageFilter.GaussianBlur(5.5))

    skirt = Image.new("L", size, 0)
    skirt_draw = ImageDraw.Draw(skirt)
    for x in range(70, 1210, 46):
        top = rng.uniform(218, 278)
        length = rng.uniform(90, 220)
        width = rng.uniform(15, 34)
        phase = rng.uniform(0, math.tau)
        pts_left = []
        pts_right = []
        for step in range(9):
            y = top + length * step / 8
            sway = math.sin(step * 0.9 + phase) * rng.uniform(12, 28)
            taper = 1 - step / 11
            pts_left.append((x + sway - width * taper * rng.uniform(0.45, 0.8), y))
            pts_right.append((x + sway + width * taper * rng.uniform(0.45, 0.8), y))
        skirt_draw.polygon(pts_left + list(reversed(pts_right)), fill=rng.randint(92, 148))
    skirt = skirt.filter(ImageFilter.GaussianBlur(4.2))

    mounds = Image.new("L", size, 0)
    for index in range(38):
        x = rng.uniform(80, 1200)
        y = rng.uniform(162, 330)
        rx = rng.uniform(28, 86)
        ry = rng.uniform(20, 64)
        blob = irregular_blob_mask(size, (x, y), (rx, ry), 3000 + index, 34)
        mounds = Image.composite(Image.new("L", size, rng.randint(90, 185)), mounds, blob)
    mounds = mounds.filter(ImageFilter.GaussianBlur(1.8))

    combined = Image.composite(canopy, mounds, canopy)
    combined = Image.composite(Image.new("L", size, 190), combined, skirt)
    combined = multiply_alpha(combined, edge_fade(size, 220, 58))

    shadow = tinted_layer(size, (27, 88, 92), combined.filter(ImageFilter.MaxFilter(9)), 2.6)
    canvas.alpha_composite(shadow)
    mid = tinted_layer(size, (72, 142, 128), combined, 1.4)
    canvas.alpha_composite(mid)

    highlight = Image.new("L", size, 0)
    hdraw = ImageDraw.Draw(highlight)
    for x in range(120, 1170, 70):
        y = 142 + math.sin(x * 0.017) * 22 + rng.uniform(-13, 13)
        pts = []
        for step in range(7):
            local = step / 6
            pts.append((
                x - 50 + local * 100,
                y + math.sin(local * math.tau + rng.uniform(-0.35, 0.35)) * rng.uniform(8, 18) - local * rng.uniform(4, 18),
            ))
        hdraw.line(pts, fill=rng.randint(48, 90), width=rng.randint(4, 8), joint="curve")
    for index in range(56):
        x = rng.uniform(120, 1160)
        y = rng.uniform(188, 314)
        fan_h = rng.uniform(24, 72)
        fan_w = rng.uniform(18, 52)
        color_alpha = rng.randint(44, 92)
        for rib in range(5):
            angle = -0.9 + rib * 0.45 + rng.uniform(-0.06, 0.06)
            hdraw.line(
                [(x, y), (x + math.sin(angle) * fan_w, y - math.cos(angle) * fan_h)],
                fill=color_alpha,
                width=3,
            )
    highlight = multiply_alpha(highlight.filter(ImageFilter.GaussianBlur(0.8)), combined)
    canvas.alpha_composite(tinted_layer(size, (177, 221, 192), highlight, 0))

    coral = Image.new("L", size, 0)
    cdraw = ImageDraw.Draw(coral)
    for _ in range(26):
        x = rng.uniform(130, 1140)
        y = rng.uniform(198, 344)
        for branch in range(rng.randint(3, 6)):
            pts = [(x, y)]
            angle = rng.uniform(-1.25, 1.25)
            for step in range(1, 5):
                pts.append((
                    x + math.sin(angle + step * rng.uniform(-0.12, 0.12)) * step * rng.uniform(13, 23),
                    y - math.cos(angle) * step * rng.uniform(10, 19),
                ))
            cdraw.line(pts, fill=rng.randint(46, 86), width=rng.randint(2, 5), joint="curve")
    coral = multiply_alpha(coral.filter(ImageFilter.GaussianBlur(0.9)), combined)
    canvas.alpha_composite(tinted_layer(size, (214, 153, 120), coral, 0))

    final_alpha = canvas.getchannel("A").point(lambda v: min(214, round(v * 0.86)))
    canvas.putalpha(final_alpha)
    return canvas.filter(ImageFilter.GaussianBlur(0.25))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image = build()
    image.save(OUT_PATH)
    print(json.dumps({"path": str(OUT_PATH), "size": image.size, **alpha_stats(image)}, indent=2))


if __name__ == "__main__":
    main()
