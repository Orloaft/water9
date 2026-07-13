#!/usr/bin/env python3
"""Build nearest-neighbor audit sheets from Water9's configured diver frames."""

from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "artifacts"
ASSETS = ROOT / "public/assets/generated"
SCALE = 4
COLS = 6
FRAME_W = 112 * SCALE
FRAME_H = 86 * SCALE
CELL_W = 480
CELL_H = 408
MARGIN = 20


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def configured_frames() -> list[tuple[str, int]]:
    source = (ROOT / "src/constants.ts").read_text()
    body = re.search(r"diverFrameCounts[^=]*=\s*\{(.*?)\n\};", source, re.S)
    if not body:
        raise RuntimeError("Could not parse diverFrameCounts")
    result: list[tuple[str, int]] = []
    for animation, count_text in re.findall(r"(\w+):\s*(\d+)", body.group(1)):
        result.extend((animation, index) for index in range(int(count_text)))
    return result


def checker(size: tuple[int, int]) -> Image.Image:
    result = Image.new("RGBA", size, (19, 27, 34, 255))
    draw = ImageDraw.Draw(result)
    tile = 16
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            value = 31 if (x // tile + y // tile) % 2 else 43
            draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(value, value + 5, value + 9, 255))
    return result


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    frames = configured_frames()
    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (MARGIN * 2 + COLS * CELL_W, MARGIN * 2 + rows * CELL_H), (8, 13, 18, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = font(18)
    stats = []
    reachable = {"idle", "swim", "boost", "mine", "die"}

    for position, (animation, index) in enumerate(frames):
        path = ASSETS / f"diver-{animation}-{index}.png"
        source = Image.open(path).convert("RGBA")
        bbox = source.getchannel("A").getbbox()
        alpha_extrema = source.getchannel("A").getextrema()
        pixels = list(source.getdata())
        visible = [(i % source.width, i // source.width, pixel) for i, pixel in enumerate(pixels) if pixel[3] > 0]
        alpha_weight = sum(pixel[3] for _, _, pixel in visible)
        alpha_centroid = [
            round(sum(x * pixel[3] for x, _, pixel in visible) / alpha_weight, 3),
            round(sum(y * pixel[3] for _, y, pixel in visible) / alpha_weight, 3),
        ] if alpha_weight else None
        opaque_pixels = sum(1 for pixel in pixels if pixel[3] == 255)
        semi_transparent_pixels = sum(1 for pixel in pixels if 0 < pixel[3] < 255)
        unique_visible_rgb = len({pixel[:3] for _, _, pixel in visible})
        scaled = source.resize((source.width * SCALE, source.height * SCALE), Image.Resampling.NEAREST)
        col, row = position % COLS, position // COLS
        x0 = MARGIN + col * CELL_W
        y0 = MARGIN + row * CELL_H
        panel = checker((CELL_W - 8, CELL_H - 8))
        px = (panel.width - scaled.width) // 2
        py = 8 + (FRAME_H - scaled.height) // 2
        panel.alpha_composite(scaled, (px, py))
        sheet.alpha_composite(panel, (x0 + 4, y0 + 4))
        state = "LIVE" if animation in reachable else "UNMAPPED"
        label = f"{animation}[{index}]  {source.width}x{source.height}  {state}"
        draw.text((x0 + 12, y0 + FRAME_H + 18), label, font=title_font, fill=(235, 245, 249, 255))
        stats.append({
            "animation": animation,
            "index": index,
            "path": str(path.relative_to(ROOT)),
            "dimensions": [source.width, source.height],
            "alpha_bbox": list(bbox) if bbox else None,
            "alpha_extrema": list(alpha_extrema),
            "alpha_centroid": alpha_centroid,
            "opaque_pixels": opaque_pixels,
            "semi_transparent_pixels": semi_transparent_pixels,
            "unique_visible_rgb": unique_visible_rgb,
            "runtime_reachable": animation in reachable,
        })

    color_path = OUT / "current-diver-all-frames-color.png"
    gray_path = OUT / "current-diver-all-frames-grayscale.png"
    sheet.save(color_path, optimize=False)
    grayscale = sheet.convert("L").convert("RGBA")
    grayscale.save(gray_path, optimize=False)
    (OUT / "current-diver-frame-metadata.json").write_text(json.dumps({
        "configured_frame_count": len(frames),
        "live_selector_frame_count": sum(1 for row in stats if row["runtime_reachable"]),
        "scale": SCALE,
        "resampling": "nearest-neighbor",
        "sheet_dimensions": list(sheet.size),
        "frames": stats,
    }, indent=2) + "\n")


if __name__ == "__main__":
    build()
