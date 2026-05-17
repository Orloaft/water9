#!/usr/bin/env python3
"""Create magenta-keyed source-sheet copies for cleaner sprite cropping.

The script only replaces background pixels connected to the sheet border. That
keeps white eyes, highlights, black outlines, and dark interior shadows intact
while turning the removable matte into a pure #ff00ff chroma key.
"""

from __future__ import annotations

import argparse
from collections import Counter, deque
from pathlib import Path
from statistics import median
from typing import Iterable

from PIL import Image


MAGENTA = (255, 0, 255, 255)

DEFAULT_SHEETS = [
    "assets/diverassetswhite.png",
    "assets/shallowfaunawhite.png",
    "assets/deepfaunawhite.png",
    "assets/abyssfaunawhite.png",
    "assets/bargeassetswhite.png",
    "assets/bargeshopassets.png",
    "assets/inventorycargouiassets.png",
    "assets/npcdialogueassets.png",
]


def border_points(width: int, height: int) -> Iterable[tuple[int, int]]:
    for x in range(width):
        yield x, 0
        yield x, height - 1
    for y in range(1, height - 1):
        yield 0, y
        yield width - 1, y


def border_background_color(image: Image.Image) -> tuple[int, int, int]:
    width, height = image.size
    pixels = image.load()
    border = [pixels[x, y][:3] for x, y in border_points(width, height)]

    # Quantize before counting because generated sheets have 252-255 style noise.
    quantized = Counter(tuple(round(channel / 8) * 8 for channel in color) for color in border)
    common = quantized.most_common(10)
    if common:
        dominant = common[0][0]
        close = [color for color in border if color_distance(color, dominant) <= 18]
        if len(close) >= max(24, len(border) // 12):
            return tuple(int(median(channel)) for channel in zip(*close))

    return tuple(int(median(channel)) for channel in zip(*border))


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5


def likely_flat_background(color: tuple[int, int, int]) -> bool:
    spread = max(color) - min(color)
    luminance = sum(color) / 3
    return spread <= 36 and (luminance >= 180 or luminance <= 52)


def matte_tolerance(color: tuple[int, int, int], requested: int | None) -> int:
    if requested is not None:
        return requested
    luminance = sum(color) / 3
    return 54 if luminance >= 180 else 34


def create_magenta_copy(source: Path, destination: Path, tolerance: int | None, force: bool) -> tuple[int, int]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    background = border_background_color(image)
    if not force and not likely_flat_background(background):
        raise ValueError(f"border color {background} does not look like a removable matte")

    threshold = matte_tolerance(background, tolerance)
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def idx(x: int, y: int) -> int:
        return y * width + x

    def matches_background(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        if a < 8:
            return True
        return color_distance((r, g, b), background) <= threshold

    for x, y in border_points(width, height):
        i = idx(x, y)
        if not visited[i] and matches_background(x, y):
            visited[i] = 1
            queue.append((x, y))

    keyed = 0
    while queue:
        x, y = queue.popleft()
        pixels[x, y] = MAGENTA
        keyed += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            i = idx(nx, ny)
            if visited[i] or not matches_background(nx, ny):
                continue
            visited[i] = 1
            queue.append((nx, ny))

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination)
    return keyed, threshold


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", nargs="*", help="PNG source sheets to convert. Defaults to current white/UI sheets.")
    parser.add_argument("--out-dir", default="assets/magenta", help="Directory for magenta-keyed copies.")
    parser.add_argument("--tolerance", type=int, default=None, help="Override matte color tolerance.")
    parser.add_argument("--force", action="store_true", help="Convert even if the border does not look neutral.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite source files in place. Use only after reviewing copies.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sources = [Path(path) for path in (args.sources or DEFAULT_SHEETS)]
    out_dir = Path(args.out_dir)
    failures = 0

    for source in sources:
        if not source.exists():
            print(f"skip missing {source}")
            failures += 1
            continue
        destination = source if args.overwrite else out_dir / f"{source.stem}-magenta{source.suffix}"
        try:
            keyed, threshold = create_magenta_copy(source, destination, args.tolerance, args.force)
        except Exception as exc:
            print(f"skip {source}: {exc}")
            failures += 1
            continue
        print(f"{source} -> {destination} ({keyed:,} pixels keyed, tolerance {threshold})")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
