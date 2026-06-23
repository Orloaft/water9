#!/usr/bin/env python3
"""Normalize chroma-key backgrounds on source-candidate images.

This only touches background pixels connected to the image border. It is meant
for generated images whose background is visibly magenta but not exactly
#ff00ff, not for approving weak art.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


TARGET = (255, 0, 255, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--tolerance", type=int, default=70)
    parser.add_argument("--min-red-blue", type=int, default=150)
    parser.add_argument("--max-green", type=int, default=100)
    parser.add_argument("--padding", type=int, default=0, help="Add this many pure-magenta pixels around the normalized image.")
    return parser.parse_args()


def is_key_like(pixel: tuple[int, int, int, int], args: argparse.Namespace) -> bool:
    r, g, b, a = pixel
    if a < 245:
        return False
    if r < args.min_red_blue or b < args.min_red_blue or g > args.max_green:
        return False
    return abs(r - b) <= args.tolerance


def main() -> int:
    args = parse_args()
    image = Image.open(args.input).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    queue: deque[tuple[int, int]] = deque()
    seen = [[False] * width for _ in range(height)]
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(1, height - 1):
        queue.append((0, y))
        queue.append((width - 1, y))

    replaced = 0
    while queue:
        x, y = queue.popleft()
        if seen[y][x]:
            continue
        seen[y][x] = True
        if not is_key_like(pixels[x, y], args):
            continue
        pixels[x, y] = TARGET
        replaced += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not seen[ny][nx]:
                queue.append((nx, ny))

    if args.padding < 0:
        raise ValueError("--padding cannot be negative")
    if args.padding:
        padded = Image.new("RGBA", (width + args.padding * 2, height + args.padding * 2), TARGET)
        padded.paste(image, (args.padding, args.padding))
        image = padded

    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output)
    print(f"normalized {replaced} border-connected key pixels in {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
