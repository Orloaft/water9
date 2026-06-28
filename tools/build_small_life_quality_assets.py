#!/usr/bin/env python3
"""Build focused small-life quality assets and proof contact sheets."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter

GENERATED = Path("public/assets/generated")
RUNS = Path("/home/orlovboros/projects/manager/runs")
CONTACT_SHEET = RUNS / "water9-small-life-fixes-2026-06-28-contact-sheet.png"
PREDATOR_CONTACT_SHEET = RUNS / "water9-abyss-small-predators-2026-06-28-contact-sheet.png"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def draw_soft_line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], width: int) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")


def body(draw: ImageDraw.ImageDraw, x: float, y: float, scale: float, palette: dict[str, tuple[int, int, int, int]], angle: float = 0) -> None:
    # Compact side-view fish built from a body ellipse, forked tail, fin and eye.
    w = 15 * scale
    h = 7 * scale
    tail = 7 * scale
    draw.ellipse((x - w / 2, y - h / 2, x + w / 2, y + h / 2), fill=palette["body"], outline=palette["rim"], width=max(1, round(scale)))
    draw.polygon([(x - w / 2, y), (x - w / 2 - tail, y - h * 0.55), (x - w / 2 - tail * 0.75, y + h * 0.55)], fill=palette["tail"])
    draw.polygon([(x - 1 * scale, y - h / 2), (x + 4 * scale, y - h * 1.15), (x + 6 * scale, y - h / 2)], fill=palette["fin"])
    draw.ellipse((x + w * 0.22, y - h * 0.18, x + w * 0.36, y - h * 0.02), fill=palette["eye"])
    draw.ellipse((x + w * 0.1, y + h * 0.25, x + w * 0.22, y + h * 0.42), fill=palette["glow"])


def hatchet(draw: ImageDraw.ImageDraw, x: float, y: float, scale: float, palette: dict[str, tuple[int, int, int, int]]) -> None:
    w = 16 * scale
    h = 14 * scale
    points = [(x - w * 0.48, y - h * 0.1), (x - w * 0.1, y - h * 0.55), (x + w * 0.42, y - h * 0.18), (x + w * 0.34, y + h * 0.45), (x - w * 0.22, y + h * 0.55)]
    draw.polygon(points, fill=palette["body"], outline=palette["rim"])
    draw.polygon([(x - w * 0.45, y), (x - w * 0.76, y - h * 0.32), (x - w * 0.7, y + h * 0.34)], fill=palette["tail"])
    draw.line((x - w * 0.06, y + h * 0.38, x + w * 0.32, y + h * 0.36), fill=palette["glow"], width=max(1, round(scale)))
    draw.ellipse((x + w * 0.16, y - h * 0.2, x + w * 0.31, y - h * 0.06), fill=palette["eye"])


def make_school_frame(size: tuple[int, int], seed: int, kind: str) -> Image.Image:
    scale = 3
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    if kind == "hatchet":
        palette = {
            "body": rgba("#96f5e6", 225),
            "rim": rgba("#e6fff8", 230),
            "tail": rgba("#4ec6d0", 205),
            "fin": rgba("#b8f7ff", 190),
            "eye": rgba("#fff7c8", 245),
            "glow": rgba("#73fbd3", 210),
        }
        coords = [(36, 34), (57, 24), (77, 39), (97, 27), (118, 36), (132, 48)]
        for i, (x, y) in enumerate(coords):
            hatchet(draw, (x + ((seed + i) % 3 - 1) * 2) * scale, (y + ((seed * 2 + i) % 3 - 1) * 2) * scale, (0.9 + (i % 2) * 0.1) * scale, palette)
        draw_soft_line(draw, [(24 * scale, 42 * scale), (78 * scale, 29 * scale), (141 * scale, 47 * scale)], rgba("#73fbd3", 52), 5 * scale)
    elif kind == "lantern":
        palette = {
            "body": rgba("#3c2931", 235),
            "rim": rgba("#c2aaa4", 210),
            "tail": rgba("#71555a", 220),
            "fin": rgba("#856b6d", 185),
            "eye": rgba("#ffd166", 255),
            "glow": rgba("#fff0a4", 230),
        }
        coords = [(35, 36), (58, 27), (82, 46), (106, 31), (131, 43)]
        for i, (x, y) in enumerate(coords):
            body(draw, (x + ((seed + i) % 5 - 2) * 1.4) * scale, (y + ((seed * 3 + i) % 5 - 2) * 1.2) * scale, (0.95 + (i % 3) * 0.08) * scale, palette)
            draw.ellipse(((x + 11) * scale, (y - 9) * scale, (x + 18) * scale, (y - 2) * scale), fill=rgba("#ffd166", 86))
        draw.ellipse((23 * scale, 18 * scale, 142 * scale, 58 * scale), outline=rgba("#ffd166", 30), width=2 * scale)
    elif kind == "static":
        palette = {
            "body": rgba("#1f4451", 235),
            "rim": rgba("#b8fff1", 225),
            "tail": rgba("#73fbd3", 210),
            "fin": rgba("#9afbe8", 175),
            "eye": rgba("#fff7df", 255),
            "glow": rgba("#73fbd3", 235),
        }
        coords = [(22, 26), (39, 20), (56, 32), (70, 23)]
        for i, (x, y) in enumerate(coords):
            body(draw, (x + ((seed + i) % 3 - 1) * 1.5) * scale, (y + ((seed + i * 2) % 3 - 1) * 1.4) * scale, (0.72 + (i % 2) * 0.05) * scale, palette)
        for i in range(4):
            x = (18 + i * 16 + seed % 5) * scale
            y = (39 + ((seed + i) % 3 - 1) * 3) * scale
            draw.line((x, y, x + 8 * scale, y - 5 * scale), fill=rgba("#73fbd3", 150), width=scale)
    else:
        palette = {
            "body": rgba("#5e514e", 235),
            "rim": rgba("#ead7c9", 220),
            "tail": rgba("#9a8078", 205),
            "fin": rgba("#c6aaa0", 170),
            "eye": rgba("#fff0a4", 245),
            "glow": rgba("#ffd166", 205),
        }
        coords = [(28, 34), (51, 24), (75, 41), (98, 29), (121, 47), (142, 35)]
        for i, (x, y) in enumerate(coords):
            body(draw, (x + ((seed + i) % 5 - 2) * 1.6) * scale, (y + ((seed * 2 + i) % 5 - 2) * 1.2) * scale, (0.78 + (i % 3) * 0.07) * scale, palette)
        draw_soft_line(draw, [(20 * scale, 41 * scale), (84 * scale, 31 * scale), (153 * scale, 49 * scale)], rgba("#fff0a4", 34), 4 * scale)
    im = im.filter(ImageFilter.GaussianBlur(0.22 * scale))
    return im.resize(size, Image.Resampling.LANCZOS)


def draw_tooth(draw: ImageDraw.ImageDraw, tip: tuple[float, float], base: tuple[float, float], length: float, upward: bool, fill: tuple[int, int, int, int]) -> None:
    x, y = base
    direction = -1 if upward else 1
    draw.polygon([(x - length * 0.32, y), (x + length * 0.22, y), (tip[0], tip[1] + direction * length)], fill=fill)


def make_viperfish_frame(size: tuple[int, int], frame: int) -> Image.Image:
    scale = 4
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    sway = [-1.0, 0.9, 0.0][frame] * scale
    cx = size[0] * scale * 0.5
    cy = size[1] * scale * 0.52
    jaw_open = [0.0, 1.0, 0.45][frame] * scale
    rim = rgba("#83dce8", 230)
    body_dark = rgba("#17222b", 245)
    body_mid = rgba("#33404d", 235)
    fin = rgba("#516472", 205)
    glow = rgba("#8ff8ff", 245)
    tooth = rgba("#f3fff9", 248)

    tail = [(5 * scale, cy), (13 * scale, cy - 6 * scale + sway), (13 * scale, cy + 6 * scale + sway)]
    draw.polygon(tail, fill=rgba("#25313b", 230), outline=rim)
    body_points = [
        (11 * scale, cy - 3.3 * scale + sway * 0.45),
        (20 * scale, cy - 5.2 * scale - sway * 0.2),
        (32 * scale, cy - 4.2 * scale),
        (39 * scale, cy - 2.4 * scale - jaw_open * 0.25),
        (43 * scale, cy + 0.3 * scale),
        (36 * scale, cy + 5.0 * scale + jaw_open * 0.28),
        (22 * scale, cy + 4.2 * scale + sway * 0.2),
        (11 * scale, cy + 2.7 * scale + sway * 0.35),
    ]
    draw.polygon(body_points, fill=body_dark, outline=rim)
    draw.polygon([(27 * scale, cy - 3.6 * scale), (35 * scale, cy - 1.8 * scale), (24 * scale, cy - 1.4 * scale)], fill=body_mid)
    draw.polygon([(21 * scale, cy + 3.2 * scale), (29 * scale, cy + 9.5 * scale), (31 * scale, cy + 3.2 * scale)], fill=fin)
    draw.polygon([(19 * scale, cy - 3.4 * scale), (26 * scale, cy - 8.4 * scale), (28 * scale, cy - 3.3 * scale)], fill=rgba("#405461", 195))
    upper = [(36 * scale, cy - 2.2 * scale), (46.5 * scale, cy - 4.8 * scale - jaw_open), (43 * scale, cy - 0.8 * scale)]
    lower = [(36 * scale, cy + 2.8 * scale), (46.5 * scale, cy + 6.5 * scale + jaw_open * 1.4), (42 * scale, cy + 1.7 * scale)]
    draw.polygon(upper, fill=rgba("#1d2933", 250), outline=rim)
    draw.polygon(lower, fill=rgba("#263642", 250), outline=rim)
    for i, x in enumerate([39.0, 42.0, 45.0]):
        draw_tooth(draw, (x * scale, cy - 1.5 * scale), (x * scale, cy - 3.6 * scale - jaw_open * 0.55), 2.5 * scale, False, tooth)
        draw_tooth(draw, ((x + 0.7) * scale, cy + 2.4 * scale), ((x + 0.2) * scale, cy + 4.3 * scale + jaw_open * 0.55), 2.4 * scale, True, tooth)
    draw.ellipse((37.5 * scale, cy - 4.5 * scale, 41.0 * scale, cy - 1.1 * scale), fill=rgba("#071014", 255), outline=glow)
    draw.ellipse((38.5 * scale, cy - 3.6 * scale, 40.3 * scale, cy - 1.8 * scale), fill=glow)
    draw.line((32 * scale, cy - 5 * scale, 32 * scale, cy - 10 * scale, 35 * scale, cy - 12 * scale), fill=rgba("#9ff9ea", 190), width=max(1, scale))
    draw.ellipse((33.4 * scale, cy - 13.3 * scale, 37.3 * scale, cy - 9.4 * scale), fill=rgba("#b9fff4", 160))
    for i in range(5):
        draw.ellipse(((15 + i * 3.8) * scale, cy + (1.2 + (i % 2) * 1.1) * scale, (16.3 + i * 3.8) * scale, cy + (2.5 + (i % 2) * 1.1) * scale), fill=rgba("#83dce8", 210))
    return im.filter(ImageFilter.GaussianBlur(0.12 * scale)).resize(size, Image.Resampling.LANCZOS)


def make_goblin_shark_frame(size: tuple[int, int], frame: int) -> Image.Image:
    scale = 4
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    cy = size[1] * scale * 0.52
    lift = [-0.6, 0.4, 0.0][frame] * scale
    bite = [0.0, 1.0, 0.45][frame] * scale
    rim = rgba("#f2d3d8", 230)
    body = rgba("#b98f9b", 238)
    shadow = rgba("#7e6470", 230)
    pale = rgba("#e8c3c8", 238)
    dark = rgba("#3d2f38", 240)

    draw.polygon([(5 * scale, cy), (16 * scale, cy - 6 * scale + lift), (17 * scale, cy + 6 * scale + lift)], fill=shadow, outline=rim)
    body_poly = [
        (13 * scale, cy - 4 * scale + lift * 0.4),
        (24 * scale, cy - 8 * scale),
        (39 * scale, cy - 5 * scale),
        (47 * scale, cy - 2 * scale),
        (47 * scale, cy + 4 * scale + bite * 0.2),
        (35 * scale, cy + 7 * scale),
        (21 * scale, cy + 5 * scale + lift * 0.3),
        (13 * scale, cy + 3 * scale + lift * 0.4),
    ]
    draw.polygon(body_poly, fill=body, outline=rim)
    draw.polygon([(29 * scale, cy - 6 * scale), (37 * scale, cy - 12 * scale), (39 * scale, cy - 4 * scale)], fill=pale, outline=rim)
    draw.polygon([(25 * scale, cy + 4 * scale), (33 * scale, cy + 12 * scale), (36 * scale, cy + 4 * scale)], fill=shadow, outline=rim)
    draw.polygon([(16 * scale, cy + 3 * scale), (22 * scale, cy + 9 * scale), (25 * scale, cy + 4 * scale)], fill=rgba("#977684", 210), outline=rim)
    snout = [(38 * scale, cy - 4.8 * scale), (54.0 * scale, cy - 6.0 * scale), (55.0 * scale, cy - 3.2 * scale), (42 * scale, cy - 1.3 * scale)]
    draw.polygon(snout, fill=pale, outline=rim)
    draw.polygon([(39 * scale, cy + 0.5 * scale), (52.5 * scale, cy + 3.0 * scale + bite), (47 * scale, cy + 5.9 * scale + bite * 0.6), (38 * scale, cy + 3.0 * scale)], fill=dark, outline=rim)
    draw.line((43 * scale, cy + 2.5 * scale, 51.5 * scale, cy + 4.0 * scale + bite), fill=rgba("#f7f0e4", 235), width=max(1, scale))
    for x in [45, 48, 51]:
        draw.line((x * scale, cy + (2.0 + bite / scale) * scale, (x - 0.5) * scale, cy + (5.0 + bite / scale) * scale), fill=rgba("#fff6e6", 230), width=max(1, round(scale * 0.7)))
    draw.ellipse((40.5 * scale, cy - 4.2 * scale, 43.1 * scale, cy - 1.7 * scale), fill=rgba("#0f1218", 255))
    draw.ellipse((41.0 * scale, cy - 3.8 * scale, 42.1 * scale, cy - 2.7 * scale), fill=rgba("#b8f7ff", 230))
    draw.line((22 * scale, cy + 1 * scale, 38 * scale, cy + 3 * scale), fill=rgba("#f5cfd4", 150), width=scale)
    return im.filter(ImageFilter.GaussianBlur(0.10 * scale)).resize(size, Image.Resampling.LANCZOS)


def make_snipe_eel_frame(size: tuple[int, int], frame: int) -> Image.Image:
    scale = 4
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    cy = size[1] * scale * 0.5
    phase = frame * 0.85
    rim = rgba("#b8f7ff", 220)
    body = rgba("#334c5c", 238)
    belly = rgba("#7898a6", 218)
    glow = rgba("#9ff9ea", 235)
    points_top = []
    points_bottom = []
    for i in range(11):
        x = (9 + i * 5.6) * scale
        wave = math.sin(i * 0.72 + phase) * 4.0 * scale
        width = (2.0 + max(0, i - 2) * 0.08) * scale
        if i > 8:
            width *= 0.85
        points_top.append((x, cy + wave - width))
        points_bottom.append((x, cy + wave + width))
    draw.polygon(points_top + list(reversed(points_bottom)), fill=body, outline=rim)
    draw.line([(x, y + 1.6 * scale) for x, y in points_bottom[2:]], fill=belly, width=max(1, scale))
    tail_base = points_top[0][0], (points_top[0][1] + points_bottom[0][1]) / 2
    draw.line((tail_base[0], tail_base[1], 6 * scale, tail_base[1] + 2 * scale), fill=rim, width=max(1, scale))
    head_y = cy + math.sin(10 * 0.72 + phase) * 4.0 * scale
    draw.ellipse((60 * scale, head_y - 5 * scale, 72 * scale, head_y + 5 * scale), fill=rgba("#405b6b", 242), outline=rim, width=max(1, scale))
    gape = [0.0, 1.0, 0.45][frame] * scale
    draw.polygon([(68 * scale, head_y - 2.8 * scale), (82 * scale, head_y - 4.4 * scale - gape), (81 * scale, head_y - 2.0 * scale), (70 * scale, head_y - 0.7 * scale)], fill=rgba("#486879", 242), outline=rim)
    draw.polygon([(68 * scale, head_y + 2.2 * scale), (82 * scale, head_y + 4.9 * scale + gape), (80 * scale, head_y + 2.1 * scale), (70 * scale, head_y + 0.8 * scale)], fill=rgba("#283f4d", 245), outline=rim)
    draw.line((70 * scale, head_y - 0.3 * scale, 81 * scale, head_y - 2.1 * scale), fill=rgba("#ecfff8", 220), width=max(1, scale))
    draw.line((70 * scale, head_y + 0.9 * scale, 81 * scale, head_y + 2.5 * scale + gape), fill=rgba("#ecfff8", 220), width=max(1, scale))
    draw.ellipse((65.0 * scale, head_y - 4.1 * scale, 68.3 * scale, head_y - 0.8 * scale), fill=rgba("#061018", 255), outline=glow)
    for i in range(5):
        x = (30 + i * 6.2) * scale
        y = cy + math.sin((i + 4) * 0.72 + phase) * 4.0 * scale
        draw.ellipse((x, y + 2.2 * scale, x + 1.8 * scale, y + 4.0 * scale), fill=glow)
    return im.filter(ImageFilter.GaussianBlur(0.10 * scale)).resize(size, Image.Resampling.LANCZOS)


def pack_sheet(base: str, frames: list[Image.Image], fps: int = 8) -> None:
    cell_w = max(frame.width for frame in frames)
    cell_h = max(frame.height for frame in frames)
    sheet = Image.new("RGBA", (cell_w * len(frames), cell_h), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        frame_path = GENERATED / f"{base}-{index}.png"
        frame.save(frame_path)
        sheet.alpha_composite(frame, (index * cell_w + (cell_w - frame.width) // 2, (cell_h - frame.height) // 2))
    sheet.save(GENERATED / f"{base}.png")
    manifest = {
        "schema": "asset-forge/sprite-frames@1",
        "name": base,
        "image": f"{base}.png",
        "frameWidth": cell_w,
        "frameHeight": cell_h,
        "columns": len(frames),
        "rows": 1,
        "frameCount": len(frames),
        "anchor": {"x": 0.5, "y": 0.5},
        "directions": [],
        "animations": {"swim": {"frames": list(range(len(frames))), "frameRate": fps, "loop": True}},
    }
    (GENERATED / f"{base}.frames.json").write_text(json.dumps(manifest, indent=2) + "\n")


def flora_variant(size: tuple[int, int], kind: str) -> Image.Image:
    scale = 3
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    w, h = size[0] * scale, size[1] * scale
    cx = w / 2
    root_y = h - 12 * scale
    draw.ellipse((cx - 22 * scale, root_y - 7 * scale, cx + 22 * scale, root_y + 6 * scale), fill=rgba("#1c4b57", 210), outline=rgba("#8ee7f4", 170), width=scale)
    if kind == "oxygen-kelp":
        stems = [(-18, 0.78), (-7, 0.64), (5, 0.58), (17, 0.7)]
        for offset, height in stems:
            x = cx + offset * scale
            top = root_y - h * height
            draw_soft_line(draw, [(x, root_y), (x - 8 * scale, (root_y + top) / 2), (x + 4 * scale, top)], rgba("#8ee7f4", 215), 3 * scale)
            for j in range(3):
                yy = root_y - (j + 1) * (root_y - top) / 4
                draw.ellipse((x - (11 + j * 2) * scale, yy - 10 * scale, x + (13 + j * 2) * scale, yy + 11 * scale), fill=rgba("#d7fff6", 126), outline=rgba("#73fbd3", 170), width=scale)
    else:
        stems = [(-18, 0.58), (-6, 0.72), (10, 0.64), (21, 0.5)]
        for offset, height in stems:
            x = cx + offset * scale
            top = root_y - h * height
            draw_soft_line(draw, [(x, root_y), (x + 6 * scale, (root_y + top) / 2), (x, top + 8 * scale)], rgba("#7edeea", 205), 3 * scale)
            draw.ellipse((x - 14 * scale, top, x + 14 * scale, top + 28 * scale), fill=rgba("#d9fff4", 145), outline=rgba("#8ee7f4", 210), width=scale)
            draw.ellipse((x - 7 * scale, top + 7 * scale, x + 7 * scale, top + 21 * scale), fill=rgba("#fff7df", 85))
    return im.filter(ImageFilter.GaussianBlur(0.15 * scale)).resize(size, Image.Resampling.LANCZOS)


def nodule_variant(size: tuple[int, int], variant: int) -> Image.Image:
    scale = 3
    im = Image.new("RGBA", (size[0] * scale, size[1] * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im, "RGBA")
    w, h = size[0] * scale, size[1] * scale
    cx = w / 2
    base_y = h - 11 * scale
    draw.ellipse((cx - w * 0.34, base_y - 8 * scale, cx + w * 0.34, base_y + 5 * scale), fill=rgba("#18383c", 220), outline=rgba("#73fbd3", 150), width=scale)
    count = 4 + variant
    for i in range(count):
        local = 0.68 if variant == 0 else 0.82 if variant == 1 else 1.0
        x = cx + (i - (count - 1) / 2) * (w * 0.13)
        y = base_y - (8 + (i % 3) * 4 + variant * 2) * scale * local
        r = (6 + (i + variant) % 3) * scale * local
        draw.line((x, base_y - 4 * scale, x, y + r * 0.8), fill=rgba("#2f8f8a", 190), width=max(1, scale))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba("#49c8bb", 190), outline=rgba("#d7fff6", 205), width=scale)
        draw.ellipse((x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45), fill=rgba("#fff7df", 85))
    return im.filter(ImageFilter.GaussianBlur(0.12 * scale)).resize(size, Image.Resampling.LANCZOS)


def lift_contrast(path: Path, tint: str, alpha: int = 56) -> None:
    im = Image.open(path).convert("RGBA")
    alpha_channel = im.getchannel("A")
    glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    mask = alpha_channel.filter(ImageFilter.GaussianBlur(1.2))
    glow_color = Image.new("RGBA", im.size, rgba(tint, alpha))
    glow.alpha_composite(glow_color)
    glow.putalpha(mask.point(lambda p: min(alpha, int(p * alpha / 255))))
    boosted = Image.alpha_composite(glow, im)
    pixels = boosted.load()
    for y in range(boosted.height):
        for x in range(boosted.width):
            r, g, b, a = pixels[x, y]
            if a:
                pixels[x, y] = (min(255, int(r * 1.1 + 8)), min(255, int(g * 1.1 + 8)), min(255, int(b * 1.1 + 8)), a)
    boosted.save(path)


def contact_sheet(keys: Iterable[str]) -> None:
    images = []
    for key in keys:
        im = Image.open(GENERATED / f"{key}.png").convert("RGBA")
        im.thumbnail((180, 120), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", (220, 160), rgba("#061018", 255))
        tile.alpha_composite(im, ((220 - im.width) // 2, 18 + (100 - im.height) // 2))
        draw = ImageDraw.Draw(tile)
        draw.text((8, 132), key, fill=rgba("#d7fff6"))
        images.append(tile)
    cols = 3
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * 220, rows * 160), rgba("#061018", 255))
    for idx, tile in enumerate(images):
        sheet.alpha_composite(tile, ((idx % cols) * 220, (idx // cols) * 160))
    RUNS.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT_SHEET)


def predator_contact_sheet(keys: Iterable[str]) -> None:
    rows = []
    for key in keys:
        manifest = json.loads((GENERATED / f"{key}.frames.json").read_text())
        frame_w = manifest["frameWidth"]
        frame_h = manifest["frameHeight"]
        frame_count = manifest["frameCount"]
        row = Image.new("RGBA", (720, 164), rgba("#061018", 255))
        draw = ImageDraw.Draw(row)
        draw.text((10, 8), key, fill=rgba("#d7fff6"))
        for index in range(frame_count):
            frame = Image.open(GENERATED / f"{key}-{index}.png").convert("RGBA")
            tile = Image.new("RGBA", (110, 100), rgba("#0b1a24", 255))
            tile.alpha_composite(frame, ((110 - frame_w) // 2, 14 + (70 - frame_h) // 2))
            tile_draw = ImageDraw.Draw(tile)
            tile_draw.rectangle((0, 0, 109, 99), outline=rgba("#274352", 255))
            tile_draw.text((6, 78), f"frame {index}", fill=rgba("#8ee7f4"))
            row.alpha_composite(tile, (10 + index * 116, 34))
        runtime = Image.open(GENERATED / f"{key}.png").convert("RGBA")
        runtime.thumbnail((184, 60), Image.Resampling.LANCZOS)
        preview = Image.new("RGBA", (220, 100), rgba("#0b1a24", 255))
        preview.alpha_composite(runtime, ((220 - runtime.width) // 2, 12 + (60 - runtime.height) // 2))
        preview_draw = ImageDraw.Draw(preview)
        preview_draw.rectangle((0, 0, 219, 99), outline=rgba("#274352", 255))
        preview_draw.text((8, 78), "packed sheet", fill=rgba("#8ee7f4"))
        row.alpha_composite(preview, (378, 34))
        runtime_3x = Image.open(GENERATED / f"{key}-1.png").convert("RGBA").resize((frame_w * 3, frame_h * 3), Image.Resampling.NEAREST)
        runtime_3x.thumbnail((102, 78), Image.Resampling.NEAREST)
        crop = Image.new("RGBA", (108, 100), rgba("#0b1a24", 255))
        crop.alpha_composite(runtime_3x, ((108 - runtime_3x.width) // 2, 6 + (78 - runtime_3x.height) // 2))
        crop_draw = ImageDraw.Draw(crop)
        crop_draw.rectangle((0, 0, 107, 99), outline=rgba("#274352", 255))
        crop_draw.text((8, 80), "3x read", fill=rgba("#8ee7f4"))
        row.alpha_composite(crop, (604, 34))
        rows.append(row)
    sheet = Image.new("RGBA", (720, 164 * len(rows)), rgba("#061018", 255))
    for index, row in enumerate(rows):
        sheet.alpha_composite(row, (0, index * 164))
    RUNS.mkdir(parents=True, exist_ok=True)
    sheet.save(PREDATOR_CONTACT_SHEET)


def main() -> None:
    schools = {
        "fauna-abyss-hatchet-school": ((150, 76), 2, "hatchet"),
        "fauna-abyss-lantern-swarm": ((158, 76), 2, "lantern"),
        "fauna-abyss-static-fry": ((82, 54), 4, "static"),
        "fauna-abyss-microfish": ((166, 72), 3, "micro"),
    }
    for base, (size, count, kind) in schools.items():
        frames = [make_school_frame(size, index + 2, kind) for index in range(count)]
        pack_sheet(base, frames, fps=7 if kind in {"hatchet", "lantern"} else 9)

    predators = {
        "fauna-abyss-viperfish": ((52, 34), make_viperfish_frame),
        "fauna-abyss-goblin-shark": ((60, 34), make_goblin_shark_frame),
        "fauna-abyss-snipe-eel": ((88, 52), make_snipe_eel_frame),
    }
    for base, (size, build_frame) in predators.items():
        pack_sheet(base, [build_frame(size, index) for index in range(3)], fps=8)

    flora_variant((100, 151), "oxygen-kelp").save(GENERATED / "flora-oxygen-kelp.png")
    flora_variant((105, 166), "oxygen-bulb").save(GENERATED / "flora-oxygen-bulb.png")
    nodule_variant((38, 28), 0).save(GENERATED / "biolume-rock-0.png")
    nodule_variant((94, 47), 1).save(GENERATED / "biolume-rock-1.png")
    nodule_variant((135, 126), 2).save(GENERATED / "biolume-crystal.png")

    for key, tint, alpha in [
        ("env-flora-brine-grass", "#b9f27c", 44),
        ("env-flora-vent-coral", "#ff8a5c", 52),
        ("env-flora-black-fan", "#b4a6ff", 54),
        ("env-flora-needle-garden", "#ff6f9f", 58),
        ("env-flora-glass-obelisk", "#b8f7ff", 52),
        ("terrain-edge-flora-brine-grass", "#b9f27c", 44),
        ("terrain-edge-flora-black-fan", "#b4a6ff", 50),
    ]:
        lift_contrast(GENERATED / f"{key}.png", tint, alpha)

    contact_sheet([
        "fauna-abyss-hatchet-school",
        "fauna-abyss-lantern-swarm",
        "fauna-abyss-static-fry",
        "fauna-abyss-microfish",
        "flora-oxygen-kelp",
        "flora-oxygen-bulb",
        "biolume-rock-0",
        "biolume-rock-1",
        "biolume-crystal",
        "env-flora-brine-grass",
        "env-flora-vent-coral",
        "env-flora-black-fan",
        "env-flora-needle-garden",
        "env-flora-glass-obelisk",
    ])
    predator_contact_sheet(predators.keys())
    print(f"wrote {CONTACT_SHEET}")
    print(f"wrote {PREDATOR_CONTACT_SHEET}")


if __name__ == "__main__":
    main()
