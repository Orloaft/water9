#!/usr/bin/env python3
"""Build focused small-life quality assets and proof contact sheets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter

GENERATED = Path("public/assets/generated")
RUNS = Path("/home/orlovboros/projects/manager/runs")
CONTACT_SHEET = RUNS / "water9-small-life-fixes-2026-06-28-contact-sheet.png"


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
    print(f"wrote {CONTACT_SHEET}")


if __name__ == "__main__":
    main()
