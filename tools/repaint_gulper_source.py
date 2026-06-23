#!/usr/bin/env python3
"""Build a full-size painted source for the articulated abyssal gulper.

The original swallower sprite is a tiny pixel asset. This pass keeps its
silhouette and anatomy but compresses highlights, cools the palette, and
darkens alpha-boundary pixels so recut parts sit in the same visual language as
the mantle serpent rather than reading as crunchy stickers.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "public/assets/generated/fauna-abyss-black-swallower-2.png"
DEFAULT_OUT = ROOT / "public/assets/generated/fauna-abyssal-gulper-whole-painted.png"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    return parser.parse_args()


def clamp(value: float) -> int:
    return max(0, min(255, round(value)))


def repaint(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    image = image.resize((image.width * 3, image.height * 3), Image.Resampling.BICUBIC)
    image = image.filter(ImageFilter.GaussianBlur(0.28))
    image = ImageEnhance.Contrast(image).enhance(0.92)
    image = ImageEnhance.Sharpness(image).enhance(0.88)

    alpha = image.getchannel("A")
    interior = alpha.filter(ImageFilter.MinFilter(5))
    edge = ImageChops.subtract(alpha, interior).filter(ImageFilter.MaxFilter(3))
    edge_pixels = edge.load()
    pixels = image.load()

    cool = (38, 58, 76)
    shadow = (4, 8, 14)
    rim_target = (72, 96, 116)
    amber = (154, 109, 61)

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a <= 0:
                continue
            luma = r * 0.2126 + g * 0.7152 + b * 0.0722
            warm = r > 112 and g > 68 and b < 74
            pale = luma > 145 and abs(r - g) < 42 and abs(g - b) < 58
            edge_factor = edge_pixels[x, y] / 255

            # Compress the old white sprite rim and bright gray ridges into a
            # lower-value blue-gray range. Teeth keep a muted amber note.
            if warm:
                target = amber
                grade = 0.38
                cap = 178
            elif pale:
                target = rim_target
                grade = 0.62
                cap = 154
            else:
                target = cool
                grade = 0.28
                cap = 188

            r = r * (1 - grade) + target[0] * grade
            g = g * (1 - grade) + target[1] * grade
            b = b * (1 - grade) + target[2] * grade

            new_luma = r * 0.2126 + g * 0.7152 + b * 0.0722
            if new_luma > cap:
                scale = cap / max(1, new_luma)
                r *= scale
                g *= scale
                b *= scale

            murk = 0.16 + edge_factor * 0.34
            r = r * (1 - murk) + shadow[0] * murk
            g = g * (1 - murk) + shadow[1] * murk
            b = b * (1 - murk) + shadow[2] * murk

            if edge_factor > 0.05:
                a = clamp(a * (1 - edge_factor * 0.1))
            pixels[x, y] = (clamp(r), clamp(g), clamp(b), a)

    return image


def main() -> int:
    args = parse_args()
    source = Image.open(args.source)
    output = repaint(source)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.out)
    print(f"Wrote {args.out} ({output.width}x{output.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
