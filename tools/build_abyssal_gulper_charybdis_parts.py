#!/usr/bin/env python3
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter
from validate_articulated_sources import apply_body_cripple_damage


OUT_DIR = Path("public/assets/generated")
PREFIX = "fauna-abyssal-gulper-chary"
SOURCE_PATH = OUT_DIR / "fauna-abyssal-gulper-v2-whole-painted.png"
SCALE = 4
SOURCE_IMAGE: Image.Image | None = None


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def canvas(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))


def pts(points: list[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]


def ellipse_box(cx: float, cy: float, rx: float, ry: float) -> tuple[int, int, int, int]:
    return (
        round((cx - rx) * SCALE),
        round((cy - ry) * SCALE),
        round((cx + rx) * SCALE),
        round((cy + ry) * SCALE),
    )


def finish(img: Image.Image, path: Path) -> None:
    img = img.filter(ImageFilter.GaussianBlur(0.16 * SCALE))
    img = img.resize((img.width // SCALE, img.height // SCALE), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def gradient_fill(mask: Image.Image, top="#3d5e83", mid="#17223f", bottom="#050712") -> Image.Image:
    w, h = mask.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    top_c = rgba(top)
    mid_c = rgba(mid)
    bot_c = rgba(bottom)
    pix = out.load()
    for y in range(h):
        t = y / max(1, h - 1)
        if t < 0.42:
            f = t / 0.42
            c = tuple(round(top_c[i] + (mid_c[i] - top_c[i]) * f) for i in range(4))
        else:
            f = (t - 0.42) / 0.58
            c = tuple(round(mid_c[i] + (bot_c[i] - mid_c[i]) * f) for i in range(4))
        for x in range(w):
            pix[x, y] = c
    out.putalpha(mask)
    return out


def painted_texture(size: tuple[int, int], seed: int) -> Image.Image | None:
    global SOURCE_IMAGE
    if not SOURCE_PATH.exists():
        return None
    if SOURCE_IMAGE is None:
        SOURCE_IMAGE = Image.open(SOURCE_PATH).convert("RGBA")

    source = SOURCE_IMAGE
    bbox = source.getbbox()
    if bbox is None:
        return None
    rng = random.Random(seed)
    x0, y0, x1, y1 = bbox
    body_x1 = round(x0 + (x1 - x0) * 0.78)
    crop_w = min(body_x1 - x0, round(source.width * (0.24 + rng.random() * 0.1)))
    crop_h = min(y1 - y0, round(source.height * (0.2 + rng.random() * 0.08)))
    left = rng.randint(x0, max(x0, body_x1 - crop_w))
    top = rng.randint(y0, max(y0, y1 - crop_h))
    crop = source.crop((left, top, left + crop_w, top + crop_h))
    if rng.random() > 0.5:
        crop = crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    crop = crop.resize(size, Image.Resampling.BICUBIC)

    tex = Image.new("RGBA", size, (0, 0, 0, 0))
    src = crop.load()
    dst = tex.load()
    for y in range(size[1]):
        for x in range(size[0]):
            r, g, b, a = src[x, y]
            if a == 0:
                # Keep transparent source gaps as dark fibrous paint, not flat voids.
                r, g, b, a = (20, 30, 54, 120)
            dst[x, y] = (
                max(4, round(r * 0.72)),
                max(6, round(g * 0.78)),
                max(12, round(b * 0.9)),
                min(170, max(72, round(a * 0.62))),
            )
    return tex.filter(ImageFilter.GaussianBlur(0.18 * SCALE))


def add_noise(img: Image.Image, mask: Image.Image, seed: int, strength: int = 20) -> None:
    rng = random.Random(seed)
    noise = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pix = noise.load()
    alpha = mask.load()
    for y in range(0, img.height, 3):
        for x in range(0, img.width, 3):
            if alpha[x, y] == 0:
                continue
            v = rng.randint(-strength, strength)
            if v > 0:
                pix[x, y] = (v, v + rng.randint(0, 6), v + 12, 38)
            else:
                pix[x, y] = (0, 0, abs(v) + 8, 30)
    img.alpha_composite(noise.filter(ImageFilter.GaussianBlur(0.5 * SCALE)))


def draw_poly(mask: Image.Image, points: list[tuple[float, float]], value: int = 255) -> None:
    ImageDraw.Draw(mask).polygon(pts(points), fill=value)


def draw_ribbon_mask(
    mask: Image.Image,
    points: list[tuple[float, float]],
    widths: list[float],
    value: int = 255,
) -> None:
    d = ImageDraw.Draw(mask)
    for i in range(len(points) - 1):
        d.line(
            pts([points[i], points[i + 1]]),
            fill=value,
            width=max(1, round(((widths[i] + widths[i + 1]) * 0.5) * SCALE)),
            joint="curve",
        )
    for (x, y), w in zip(points, widths):
        d.ellipse(ellipse_box(x, y, w * 0.5, w * 0.5), fill=value)


def composite_body(mask: Image.Image, seed: int) -> Image.Image:
    mask = mask.filter(ImageFilter.GaussianBlur(0.34 * SCALE))
    img = gradient_fill(mask)
    texture = painted_texture(img.size, seed)
    if texture:
        texture.putalpha(ImageChops.multiply(texture.getchannel("A"), mask))
        img.alpha_composite(texture)
    add_noise(img, mask, seed)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shade = ImageDraw.Draw(shadow)
    bbox = mask.getbbox() or (0, 0, img.width, img.height)
    shade.rectangle((bbox[0], (bbox[1] + bbox[3]) // 2, bbox[2], bbox[3]), fill=rgba("#000006", 78))
    shadow.putalpha(ImageChops.multiply(shadow.getchannel("A"), mask))
    img.alpha_composite(shadow)
    return img


def draw_tendril_highlights(img: Image.Image, paths: list[list[tuple[float, float]]], seed: int) -> None:
    rng = random.Random(seed)
    d = ImageDraw.Draw(img)
    for i, path in enumerate(paths):
        if len(path) < 2:
            continue
        width = max(1, round((1.2 + rng.random() * 0.8) * SCALE))
        offset = (i % 3 - 1) * 1.7
        ridge = [(x, y + offset) for x, y in path]
        d.line(pts(ridge), fill=rgba("#8ed7f3", 58), width=width, joint="curve")
        if i % 2 == 0:
            d.line(pts([(x, y + offset + 3) for x, y in path]), fill=rgba("#050815", 90), width=width * 2, joint="curve")


def draw_biolume(img: Image.Image, points: list[tuple[float, float]], radius: float = 1.2) -> None:
    d = ImageDraw.Draw(img)
    for x, y in points:
        d.ellipse(ellipse_box(x, y, radius * 2.7, radius * 2.7), fill=rgba("#00b9cf", 28))
        d.ellipse(ellipse_box(x, y, radius, radius), fill=rgba("#58f1ff", 205))


def draw_surface_spines(img: Image.Image, bases: list[tuple[float, float]], up: bool = True) -> None:
    d = ImageDraw.Draw(img)
    sign = -1 if up else 1
    for i, (x, y) in enumerate(bases):
        h = 10 + (i % 4) * 4
        d.polygon(
            pts([(x - 7, y), (x + 3, y + sign * h), (x + 15, y + sign * 2), (x + 4, y + sign * 5)]),
            fill=rgba("#27395f", 192),
        )
        d.line(pts([(x + 1, y + sign * 1), (x + 4, y + sign * (h - 2))]), fill=rgba("#9ad9ee", 55), width=max(1, round(0.8 * SCALE)))


def part_body_1() -> None:
    size = (165, 170)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    draw_poly(mask, [(18, 95), (34, 55), (82, 31), (144, 42), (154, 81), (130, 121), (74, 144), (28, 130)])
    paths = [
        [(25, 105), (45, 94), (72, 80), (112, 75), (147, 80)],
        [(16, 124), (42, 121), (80, 108), (120, 95), (150, 88)],
        [(30, 64), (62, 54), (100, 49), (138, 59)],
        [(42, 143), (73, 133), (104, 118), (139, 99)],
        [(19, 80), (44, 74), (76, 65), (112, 64)],
    ]
    for p in paths:
        draw_ribbon_mask(mask, p, [16, 25, 32, 29, 12], 210)
    tendril_paths = [
        [(55, 65), (30, 54), (8, 43)],
        [(57, 88), (27, 86), (5, 84)],
        [(60, 114), (31, 125), (9, 142)],
        [(77, 137), (45, 152), (20, 163)],
    ]
    for p in tendril_paths:
        draw_ribbon_mask(mask, p, [14, 9, 4], 230)
    body = composite_body(mask, 211)
    draw_tendril_highlights(body, paths + tendril_paths, 311)
    draw_surface_spines(body, [(56, 45), (80, 36), (106, 38), (130, 48)], True)
    draw_biolume(body, [(28, 86), (44, 83), (60, 78), (38, 119), (56, 113)], 1.05)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-body-1.png")


def part_body_2() -> None:
    size = (166, 155)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    draw_poly(mask, [(10, 92), (25, 50), (77, 26), (143, 44), (157, 79), (125, 115), (62, 134), (22, 119)])
    paths = [
        [(14, 94), (48, 77), (88, 66), (143, 74)],
        [(19, 62), (57, 55), (93, 51), (148, 61)],
        [(25, 117), (66, 108), (101, 93), (148, 85)],
        [(39, 134), (77, 120), (112, 102), (148, 89)],
        [(22, 81), (62, 83), (102, 78), (152, 76)],
    ]
    for i, p in enumerate(paths):
        draw_ribbon_mask(mask, p, [10 + i, 20, 27, 13], 230)
    for p in [[(50, 46), (25, 34), (6, 26)], [(44, 116), (18, 130), (3, 141)], [(52, 82), (25, 83), (4, 88)]]:
        draw_ribbon_mask(mask, p, [12, 8, 4], 235)
    body = composite_body(mask, 223)
    draw_tendril_highlights(body, paths, 323)
    draw_surface_spines(body, [(52, 42), (78, 32), (105, 35), (131, 45)], True)
    draw_biolume(body, [(25, 77), (43, 75), (62, 72), (81, 70), (101, 70)], 1.0)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-body-2.png")


def part_body_3() -> None:
    size = (162, 140)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    paths = [
        [(7, 70), (43, 51), (84, 49), (149, 66)],
        [(10, 87), (48, 78), (91, 74), (150, 78)],
        [(12, 102), (50, 108), (93, 96), (145, 86)],
        [(20, 48), (55, 35), (91, 34), (138, 53)],
        [(28, 119), (62, 123), (103, 111), (143, 92)],
    ]
    for i, p in enumerate(paths):
        draw_ribbon_mask(mask, p, [9, 18 + i * 2, 24 - i, 11], 245)
    draw_poly(mask, [(40, 53), (83, 30), (131, 44), (150, 76), (120, 107), (72, 120), (31, 100), (24, 73)], 198)
    for p in [[(55, 43), (30, 29), (10, 20)], [(50, 101), (24, 112), (4, 126)]]:
        draw_ribbon_mask(mask, p, [10, 7, 3], 235)
    body = composite_body(mask, 239)
    draw_tendril_highlights(body, paths, 339)
    draw_surface_spines(body, [(62, 41), (88, 34), (115, 42)], True)
    draw_biolume(body, [(35, 83), (54, 80), (75, 78), (94, 77)], 1.0)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-body-3.png")


def part_body_4() -> None:
    size = (158, 125)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    paths = [
        [(6, 58), (42, 42), (83, 45), (145, 62)],
        [(8, 78), (45, 73), (86, 68), (145, 69)],
        [(18, 96), (52, 99), (92, 87), (142, 77)],
        [(25, 33), (58, 25), (92, 31), (134, 50)],
    ]
    for i, p in enumerate(paths):
        draw_ribbon_mask(mask, p, [7, 15 + i * 2, 20 - i, 8], 245)
    draw_poly(mask, [(42, 44), (79, 28), (126, 42), (145, 64), (120, 87), (76, 101), (36, 85), (26, 63)], 190)
    for p in [[(42, 44), (20, 31), (4, 22)], [(44, 84), (21, 94), (6, 107)]]:
        draw_ribbon_mask(mask, p, [9, 6, 3], 235)
    body = composite_body(mask, 251)
    draw_tendril_highlights(body, paths, 351)
    draw_surface_spines(body, [(62, 36), (88, 33), (113, 43)], True)
    draw_biolume(body, [(29, 70), (46, 68), (63, 66), (80, 65)], 0.95)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-body-4.png")


def part_tail_base() -> None:
    size = (195, 133)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    paths = [
        [(10, 60), (54, 43), (102, 49), (176, 67)],
        [(12, 80), (59, 77), (109, 70), (178, 73)],
        [(25, 103), (68, 101), (117, 88), (178, 79)],
        [(28, 35), (72, 28), (112, 37), (171, 58)],
    ]
    for i, p in enumerate(paths):
        draw_ribbon_mask(mask, p, [6, 12 + i * 2, 17, 7], 245)
    for p in [[(52, 48), (28, 33), (8, 18)], [(51, 86), (27, 96), (8, 111)], [(62, 65), (30, 65), (5, 64)]]:
        draw_ribbon_mask(mask, p, [8, 5, 2.8], 230)
    body = composite_body(mask, 263)
    draw_tendril_highlights(body, paths, 363)
    draw_biolume(body, [(45, 71), (63, 69), (81, 68), (99, 67)], 0.9)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-tail-base.png")


def part_tail() -> None:
    size = (210, 150)
    img = canvas(size)
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.polygon(pts([(10, 78), (58, 55), (111, 58), (184, 73), (112, 88), (55, 93)]), fill=230)
    d.polygon(pts([(11, 78), (54, 41), (91, 58), (57, 62)]), fill=255)
    d.polygon(pts([(12, 81), (57, 111), (94, 88), (58, 91)]), fill=230)
    for p in [[(66, 61), (102, 42), (142, 31)], [(70, 88), (106, 107), (147, 122)], [(66, 76), (112, 73), (184, 73)]]:
        draw_ribbon_mask(mask, p, [6, 4, 2.4], 255)
    body = composite_body(mask, 277)
    dd = ImageDraw.Draw(body)
    for y in [61, 70, 79, 88]:
        dd.line(pts([(48, 78), (174, y)]), fill=rgba("#93d9ee", 68), width=max(1, round(0.9 * SCALE)))
    dd.line(pts([(10, 78), (184, 73)]), fill=rgba("#d8f6ff", 52), width=max(1, round(1.0 * SCALE)))
    draw_biolume(body, [(52, 76), (72, 75), (94, 74), (116, 74)], 0.85)
    img.alpha_composite(body)
    finish(img, OUT_DIR / f"{PREFIX}-tail.png")


def damaged_body_2() -> None:
    base = Image.open(OUT_DIR / f"{PREFIX}-body-2.png").convert("RGBA")
    apply_body_cripple_damage(base).save(OUT_DIR / f"{PREFIX}-body-2-damaged.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    part_tail()
    part_tail_base()
    part_body_4()
    part_body_3()
    part_body_2()
    part_body_1()
    damaged_body_2()


if __name__ == "__main__":
    main()
