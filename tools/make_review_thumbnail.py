#!/usr/bin/env python3
"""Create a lightweight PNG thumbnail for Water 9 review artifacts."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--max-width", type=int, default=960)
    parser.add_argument("--max-height", type=int, default=360)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.max_width <= 0 or args.max_height <= 0:
        raise ValueError("thumbnail dimensions must be positive")
    image = Image.open(args.input).convert("RGBA")
    image.thumbnail((args.max_width, args.max_height), Image.Resampling.LANCZOS)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output, optimize=True, compress_level=9)
    print(f"Wrote {args.output} {image.width}x{image.height}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
