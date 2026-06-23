#!/usr/bin/env python3
"""Render a source-candidate chroma-key preview for visual review."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from validate_source_candidate_images import flood_background, is_magenta


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--label", default="source candidate")
    parser.add_argument("--magenta-threshold", type=int, default=12)
    parser.add_argument("--panel-height", type=int, default=420)
    return parser.parse_args()


def checkerboard(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (31, 42, 50, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            color = (55, 69, 78, 255) if ((x // cell) + (y // cell)) % 2 == 0 else (18, 27, 34, 255)
            draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=color)
    return image


def fit_panel(image: Image.Image, max_height: int) -> Image.Image:
    result = image.copy()
    result.thumbnail((max_height * 2, max_height), Image.Resampling.LANCZOS)
    return result


def source_masks(image: Image.Image, threshold: int) -> tuple[list[list[bool]], list[list[bool]]]:
    width, height = image.size
    pixels = image.load()
    magenta_mask = [[False] * width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            magenta_mask[y][x] = is_magenta(pixels[x, y], threshold)
    return magenta_mask, flood_background(magenta_mask, width, height)


def subject_bbox(background: list[list[bool]], image: Image.Image) -> tuple[int, int, int, int] | None:
    width, height = image.size
    pixels = image.load()
    points = []
    for y in range(height):
        for x in range(width):
            if background[y][x]:
                continue
            if pixels[x, y][3] > 12:
                points.append((x, y))
    if not points:
        return None
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def keyed_cutout(image: Image.Image, background: list[list[bool]]) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    width, height = result.size
    for y in range(height):
        for x in range(width):
            if background[y][x]:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def add_caption(panel: Image.Image, title: str, detail: str) -> Image.Image:
    font = ImageFont.load_default()
    caption_height = 42
    result = Image.new("RGBA", (panel.width, panel.height + caption_height), (5, 15, 20, 255))
    result.alpha_composite(panel, (0, caption_height))
    draw = ImageDraw.Draw(result)
    draw.text((10, 8), title, fill=(214, 242, 238, 255), font=font)
    draw.text((10, 24), detail, fill=(139, 176, 182, 255), font=font)
    return result


def main() -> int:
    args = parse_args()
    image = Image.open(args.source).convert("RGBA")
    _, background = source_masks(image, args.magenta_threshold)
    bbox = subject_bbox(background, image)

    original = image.copy()
    if bbox:
        draw = ImageDraw.Draw(original)
        draw.rectangle((bbox[0], bbox[1], bbox[2] - 1, bbox[3] - 1), outline=(112, 251, 211, 255), width=max(2, image.width // 384))

    cutout = keyed_cutout(image, background)
    original_panel = fit_panel(original, args.panel_height)
    keyed_panel = fit_panel(cutout, args.panel_height)
    keyed_backing = checkerboard(keyed_panel.size)
    keyed_backing.alpha_composite(keyed_panel)

    bbox_text = f"bbox {bbox[2] - bbox[0]}x{bbox[3] - bbox[1]}" if bbox else "no subject bbox"
    original_panel = add_caption(original_panel, f"{args.label}: original", bbox_text)
    keyed_backing = add_caption(keyed_backing, "magenta background removed", "checkerboard shows transparent area")

    gutter = 18
    width = original_panel.width + gutter + keyed_backing.width
    height = max(original_panel.height, keyed_backing.height)
    preview = Image.new("RGBA", (width, height), (3, 12, 17, 255))
    preview.alpha_composite(original_panel, (0, 0))
    preview.alpha_composite(keyed_backing, (original_panel.width + gutter, 0))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    preview.save(args.output, optimize=True, compress_level=9)
    print(f"Wrote {args.output} {preview.width}x{preview.height}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
