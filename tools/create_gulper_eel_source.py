#!/usr/bin/env python3
"""Create a cohesive source candidate image for the Gulper Eel Maw.

This is not an acceptance step. It produces one whole-source magenta-keyed
candidate that can go through the normal source review and rigging pipeline.
"""

from __future__ import annotations

import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/source-inbox/gulper-eel-maw.png"
MAGENTA = (255, 0, 255, 255)


def scaled(points: list[tuple[float, float]], scale: int) -> list[tuple[int, int]]:
    return [(round(x * scale), round(y * scale)) for x, y in points]


def ellipse(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float, fill, outline=None, width: int = 1, scale: int = 1) -> None:
    box = [
        round((cx - rx) * scale),
        round((cy - ry) * scale),
        round((cx + rx) * scale),
        round((cy + ry) * scale),
    ]
    draw.ellipse(box, fill=fill, outline=outline, width=max(1, round(width * scale)))


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, outline=None, scale: int = 1) -> None:
    draw.polygon(scaled(points, scale), fill=fill, outline=outline)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill, width: float, scale: int = 1) -> None:
    draw.line(scaled(points, scale), fill=fill, width=max(1, round(width * scale)), joint="curve")


def organic_ellipse_points(
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    start: float,
    end: float,
    count: int,
    wobble: float = 0.04,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(count):
        amount = index / max(1, count - 1)
        angle = start + (end - start) * amount
        wave = 1 + wobble * math.sin(amount * math.pi * 5.0)
        points.append((cx + math.cos(angle) * rx * wave, cy + math.sin(angle) * ry * wave))
    return points

def draw_soft_highlight(layer: Image.Image, points: list[tuple[float, float]], color, width: float, scale: int) -> None:
    soft = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(soft)
    line(draw, points, color, width, scale)
    layer.alpha_composite(soft.filter(ImageFilter.GaussianBlur(round(1.4 * scale))))


def main() -> None:
    scale = 3
    width, height = 1536, 1024
    image = Image.new("RGBA", (width * scale, height * scale), MAGENTA)
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    body = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_shadow = ImageDraw.Draw(shadow)
    d_body = ImageDraw.Draw(body)
    d_glow = ImageDraw.Draw(glow)

    # Continuous eel axis: tail/lure on the left, tiny skull and huge gape on the right.
    axis = [
        (136, 548),
        (244, 514),
        (362, 548),
        (500, 522),
        (646, 486),
        (788, 474),
        (926, 494),
        (1038, 482),
        (1130, 454),
    ]
    tail_axis = [(88, 560), (136, 548), (244, 514)]

    line(d_body, tail_axis, (8, 32, 42, 255), 28, scale)
    line(d_body, axis, (10, 34, 43, 255), 70, scale)
    line(d_body, axis[2:], (18, 58, 68, 255), 44, scale)
    draw_soft_highlight(body, axis[2:], (82, 134, 146, 120), 10, scale)
    draw_soft_highlight(body, [(550, 500), (735, 486), (900, 512), (1060, 485)], (150, 212, 218, 72), 5, scale)

    # Whip tail taper and lure bulb.
    polygon(d_body, [(78, 562), (146, 532), (168, 552), (120, 580)], (5, 25, 35, 255), scale=scale)
    ellipse(d_glow, 70, 566, 24, 19, (26, 220, 242, 180), scale=scale)
    ellipse(d_body, 70, 566, 13, 10, (120, 247, 255, 255), outline=(11, 75, 88, 255), width=3, scale=scale)

    # Segment seams and gill slits make crop zones readable.
    for x, y, angle, length in [
        (370, 548, -18, 40),
        (520, 520, -16, 46),
        (675, 486, -8, 40),
        (825, 492, 12, 38),
        (970, 503, 8, 34),
    ]:
        dx = math.cos(math.radians(angle)) * length / 2
        dy = math.sin(math.radians(angle)) * length / 2
        line(d_body, [(x - dx, y - dy), (x + dx, y + dy)], (106, 164, 170, 140), 4, scale)

    # Small skull collar and hinge node.
    ellipse(d_body, 1130, 462, 72, 58, (19, 54, 62, 255), outline=(113, 162, 166, 210), width=5, scale=scale)
    ellipse(d_body, 1117, 444, 9, 7, (162, 218, 222, 255), outline=(5, 17, 23, 255), width=2, scale=scale)
    for offset in [-18, -4, 11, 26]:
        line(d_body, [(1088 + offset, 504), (1107 + offset, 535)], (126, 184, 190, 150), 3, scale)

    # Huge lateral pouch: connected to skull, readable as a membrane, not a detached portal.
    upper_membrane = organic_ellipse_points(1292, 508, 202, 172, math.radians(219), math.radians(356), 26, 0.035)
    lower_membrane = organic_ellipse_points(1308, 514, 186, 178, math.radians(10), math.radians(143), 26, 0.045)
    pouch = [(1088, 424), *upper_membrane, (1462, 500), *lower_membrane, (1100, 604), (1068, 502)]
    polygon(d_body, pouch, (47, 88, 101, 222), outline=(135, 184, 188, 230), scale=scale)
    inner_upper = organic_ellipse_points(1300, 510, 154, 126, math.radians(220), math.radians(352), 22, 0.035)
    inner_lower = organic_ellipse_points(1310, 520, 144, 128, math.radians(12), math.radians(142), 22, 0.04)
    inner_pouch = [(1146, 448), *inner_upper, (1422, 508), *inner_lower, (1160, 582), (1120, 504)]
    polygon(d_body, inner_pouch, (19, 45, 55, 235), scale=scale)
    draw_soft_highlight(body, [(1165, 443), (1262, 391), (1370, 420), (1418, 503)], (173, 218, 221, 120), 7, scale)
    draw_soft_highlight(body, [(1170, 582), (1275, 644), (1388, 604)], (88, 147, 157, 95), 8, scale)

    # Cartilage jaw hoops, both connected to the same skull hinge collar.
    upper = [(1108, 410), (1214, 326), (1362, 326), (1476, 438)]
    lower = [(1082, 518), (1182, 656), (1342, 692), (1450, 604)]
    line(d_body, upper, (174, 198, 189, 255), 28, scale)
    line(d_body, lower, (150, 182, 180, 255), 28, scale)
    line(d_body, upper, (55, 88, 88, 255), 12, scale)
    line(d_body, lower, (42, 78, 82, 255), 12, scale)
    ellipse(d_body, 1097, 466, 31, 31, (120, 160, 158, 255), outline=(10, 28, 36, 255), width=4, scale=scale)

    # Dark inner mouth plate and a restrained toothless lip read.
    mouth_plate = [(1180, 438), (1348, 390), (1440, 472), (1388, 574), (1220, 594), (1138, 514)]
    polygon(d_body, mouth_plate, (3, 12, 18, 250), scale=scale)
    for x, y in [(1225, 421), (1280, 407), (1334, 408), (1384, 435), (1400, 572), (1322, 594), (1248, 582)]:
        ellipse(d_body, x, y, 5, 3, (198, 221, 210, 210), scale=scale)

    # Small fins remain understated so the silhouette stays eel-like.
    polygon(d_body, [(866, 454), (930, 408), (968, 462), (912, 486)], (30, 83, 91, 205), outline=(97, 154, 160, 150), scale=scale)
    polygon(d_body, [(780, 536), (842, 590), (902, 546), (834, 520)], (23, 70, 80, 205), outline=(85, 142, 150, 145), scale=scale)

    # Cold bioluminescent accents, kept away from magenta.
    line(d_glow, [(64, 566), (112, 556), (154, 544)], (31, 214, 236, 86), 16, scale)
    for x, y, r in [(1030, 492, 5), (1002, 503, 4), (944, 500, 4), (880, 487, 3)]:
        ellipse(d_glow, x, y, r, r, (65, 206, 222, 150), scale=scale)
        ellipse(d_body, x, y, max(2, r - 2), max(2, r - 2), (139, 239, 245, 210), scale=scale)

    image.alpha_composite(glow)
    image.alpha_composite(body)

    # Final crisp outline pass helps extraction at sprite scale.
    outline = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d_outline = ImageDraw.Draw(outline)
    line(d_outline, axis, (0, 13, 20, 170), 76, scale)
    line(d_outline, tail_axis, (0, 13, 20, 150), 32, scale)
    polygon(d_outline, pouch, (0, 0, 0, 0), outline=(4, 18, 26, 220), scale=scale)
    line(d_outline, upper, (6, 24, 30, 180), 34, scale)
    line(d_outline, lower, (6, 24, 30, 180), 34, scale)
    outline = outline.filter(ImageFilter.GaussianBlur(round(1.1 * scale)))
    composite = Image.new("RGBA", image.size, MAGENTA)
    composite.alpha_composite(outline)
    composite.alpha_composite(image)

    # Downsample for anti-aliased edges against the magenta key.
    composite = composite.resize((width, height), Image.Resampling.LANCZOS)
    pixels = composite.load()
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 80 and red >= 180 and blue >= 180 and green <= 90:
                pixels[x, y] = MAGENTA
    background = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if background[y][x] or pixels[x, y] != MAGENTA:
            continue
        background[y][x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not background[ny][nx]:
                queue.append((nx, ny))
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == MAGENTA and not background[y][x]:
                pixels[x, y] = (6, 16, 24, 255)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    composite.convert("RGBA").save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
