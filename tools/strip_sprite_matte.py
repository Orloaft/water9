#!/usr/bin/env python3
"""Remove white or magenta matte fringes from generated sprite PNGs.

This is intentionally conservative: it only clears candidate matte pixels that
touch existing transparency or the outside edge. Interior whites, eyes, glints,
and painted highlights are left alone unless they are part of the silhouette
fringe.
"""

from __future__ import annotations

import argparse
import glob
from pathlib import Path
from typing import Iterable

from PIL import Image


DEFAULT_PATTERNS = [
    "public/assets/generated/diver-*.png",
    "public/assets/generated/fauna-*.png",
    "public/assets/generated/bobbit-*.png",
    "public/assets/generated/sub-tier*.png",
    "public/assets/generated/barge-platform.png",
    "public/assets/generated/barge-side.png",
]


def is_clear(pixel: tuple[int, int, int, int], alpha_threshold: int) -> bool:
    r, g, b, a = pixel
    return a <= alpha_threshold or (r >= 245 and g <= 24 and b >= 245)


def is_matte_candidate(pixel: tuple[int, int, int, int], alpha_threshold: int) -> bool:
    r, g, b, a = pixel
    if a <= alpha_threshold:
        return False
    if r >= 220 and g <= 72 and b >= 220:
        return True

    # Noisy white sheet halos are neutral, bright, and low saturation.
    high = max(r, g, b)
    low = min(r, g, b)
    saturation = high - low
    if low >= 232 and saturation <= 42:
        return True
    if low >= 218 and saturation <= 24 and a < 245:
        return True
    return False


def is_small_matte_candidate(pixel: tuple[int, int, int, int], alpha_threshold: int) -> bool:
    r, g, b, a = pixel
    if is_matte_candidate(pixel, alpha_threshold):
        return True
    if a <= alpha_threshold:
        return False
    high = max(r, g, b)
    low = min(r, g, b)
    return low >= 185 and high - low <= 34


def neighbors(x: int, y: int, width: int, height: int) -> Iterable[tuple[int, int]]:
    for ny in range(max(0, y - 1), min(height, y + 2)):
        for nx in range(max(0, x - 1), min(width, x + 2)):
            if nx == x and ny == y:
                continue
            yield nx, ny


def strip_file(path: Path, passes: int, alpha_threshold: int, small_component_size: int, dry_run: bool) -> int:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    total_removed = 0

    for _ in range(passes):
        to_clear: list[tuple[int, int]] = []
        for y in range(height):
            for x in range(width):
                if not is_matte_candidate(pixels[x, y], alpha_threshold):
                    continue
                at_edge = x == 0 or y == 0 or x == width - 1 or y == height - 1
                touches_clear = at_edge or any(is_clear(pixels[nx, ny], alpha_threshold) for nx, ny in neighbors(x, y, width, height))
                if touches_clear:
                    to_clear.append((x, y))
        if not to_clear:
            break
        total_removed += len(to_clear)
        for x, y in to_clear:
            pixels[x, y] = (0, 0, 0, 0)

    if small_component_size > 0:
        visited = bytearray(width * height)

        def idx(x: int, y: int) -> int:
            return y * width + x

        for y in range(height):
            for x in range(width):
                start = idx(x, y)
                if visited[start] or not is_small_matte_candidate(pixels[x, y], alpha_threshold):
                    continue
                stack = [(x, y)]
                visited[start] = 1
                component: list[tuple[int, int]] = []
                touches_clear = False
                touches_edge = False
                while stack:
                    cx, cy = stack.pop()
                    component.append((cx, cy))
                    if cx == 0 or cy == 0 or cx == width - 1 or cy == height - 1:
                        touches_edge = True
                    for nx, ny in neighbors(cx, cy, width, height):
                        if is_clear(pixels[nx, ny], alpha_threshold):
                            touches_clear = True
                        ni = idx(nx, ny)
                        if visited[ni] or not is_small_matte_candidate(pixels[nx, ny], alpha_threshold):
                            continue
                        visited[ni] = 1
                        stack.append((nx, ny))

                if len(component) <= small_component_size and (touches_clear or touches_edge):
                    total_removed += len(component)
                    for cx, cy in component:
                        pixels[cx, cy] = (0, 0, 0, 0)

    if total_removed and not dry_run:
        image.save(path)
    return total_removed


def collect_files(patterns: list[str]) -> list[Path]:
    files: set[Path] = set()
    for pattern in patterns:
        files.update(Path(path) for path in glob.glob(pattern))
    return sorted(path for path in files if path.is_file())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("patterns", nargs="*", help="Glob patterns to process. Defaults to generated sprite frames.")
    parser.add_argument("--passes", type=int, default=2, help="How many fringe layers to remove.")
    parser.add_argument("--alpha-threshold", type=int, default=10, help="Alpha at or below this value counts as transparent.")
    parser.add_argument("--small-component-size", type=int, default=28, help="Remove isolated light matte components up to this size.")
    parser.add_argument("--dry-run", action="store_true", help="Report removals without writing files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    files = collect_files(args.patterns or DEFAULT_PATTERNS)
    changed = 0
    removed_total = 0
    for path in files:
        removed = strip_file(path, max(1, args.passes), args.alpha_threshold, args.small_component_size, args.dry_run)
        if removed:
            changed += 1
            removed_total += removed
            print(f"{path}: removed {removed:,} matte pixels")
    print(f"{'would update' if args.dry_run else 'updated'} {changed}/{len(files)} files, {removed_total:,} pixels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
