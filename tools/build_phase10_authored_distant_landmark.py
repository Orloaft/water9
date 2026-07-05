#!/usr/bin/env python3
"""Build the Phase 10 authored transition-deep distant landmark slice."""

from __future__ import annotations

import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"
RUN_DIR = Path("/home/orlovboros/projects/manager/runs/water9-background-phase10-authored-distant-landmark-2026-07-02")

ASSET = {
    "id": "phase10-transition-drowned-signal-station",
    "filename": "water9-phase10-transition-drowned-signal-station.png",
    "label": "Phase 10 transition-deep drowned signal station",
    "safeOpacity": 0.56,
    "scaleRange": [1.52, 2.18],
    "parallaxRange": [0.048, 0.082],
    "readabilityRisk": "low",
}


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def tube(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], rim: tuple[int, int, int, int], width: int) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")
    draw.line([(x - 2, y - 3) for x, y in points], fill=rim, width=max(1, width // 5), joint="curve")


def polygon_with_rim(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: tuple[int, int, int, int], rim: tuple[int, int, int, int], width: int = 3) -> None:
    draw.polygon(points, fill=fill)
    draw.line(points + [points[0]], fill=rim, width=width, joint="curve")


def coral(draw: ImageDraw.ImageDraw, rng: random.Random, x: float, y: float, scale: float = 1.0) -> None:
    colors = [
        (82, 120, 104, 70),
        (118, 132, 96, 56),
        (44, 104, 112, 58),
        (150, 145, 110, 38),
    ]
    for _ in range(rng.randint(5, 11)):
        cx = x + rng.uniform(-42, 42) * scale
        cy = y + rng.uniform(-18, 20) * scale
        rx = rng.uniform(7, 22) * scale
        ry = rng.uniform(4, 14) * scale
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=rng.choice(colors))


def kelp(draw: ImageDraw.ImageDraw, rng: random.Random, x: float, y: float, height: float, count: int) -> None:
    for _ in range(count):
        base_x = x + rng.uniform(-54, 54)
        lean = rng.uniform(-52, 50)
        pts = []
        for index in range(6):
            t = index / 5
            pts.append((
                base_x + math.sin(t * math.pi * 2.1 + rng.random()) * 13 + lean * t,
                y - height * t,
            ))
        tube(draw, pts, (28, 86, 78, rng.randint(42, 76)), (112, 139, 98, rng.randint(18, 38)), rng.randint(2, 5))


def add_windows(draw: ImageDraw.ImageDraw, rng: random.Random, x0: int, y0: int, x1: int, y1: int, cols: int, rows: int, skew: float = 0) -> None:
    for row in range(rows):
        for col in range(cols):
            if rng.random() < 0.28:
                continue
            x = x0 + (col + 0.5) * (x1 - x0) / cols + skew * row
            y = y0 + (row + 0.5) * (y1 - y0) / rows
            w = max(4, (x1 - x0) / cols * 0.34)
            h = max(5, (y1 - y0) / rows * 0.34)
            alpha = rng.randint(26, 70)
            draw.rounded_rectangle((x - w, y - h, x + w, y + h), radius=2, fill=(136, 188, 188, alpha))
            if rng.random() < 0.22:
                draw.line((x - w, y, x + w, y), fill=(216, 231, 210, max(16, alpha // 2)), width=1)


def make_landmark() -> Image.Image:
    rng = random.Random(10113)
    w, h = 1220, 520
    image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    dark = (3, 13, 25, 196)
    mid = (9, 34, 50, 172)
    rim = (118, 164, 172, 92)
    hot_rim = (198, 214, 188, 48)

    # Far trench shelf and station base: a long, readable place rather than isolated symbols.
    polygon_with_rim(draw, [(35, 406), (265, 366), (492, 382), (710, 344), (964, 368), (1188, 326), (1210, 486), (20, 492)], (2, 8, 16, 162), (74, 108, 120, 48), 5)
    for x in [78, 182, 338, 531, 762, 970, 1118]:
        coral(draw, rng, x, rng.uniform(386, 438), rng.uniform(0.8, 1.25))

    # Main drowned signal tower.
    tower = [(460, 382), (522, 86), (596, 70), (668, 382)]
    polygon_with_rim(draw, tower, dark, rim, 5)
    draw.polygon([(506, 174), (622, 164), (642, 224), (488, 232)], fill=(6, 28, 44, 118))
    draw.rectangle((492, 240, 642, 316), fill=(4, 18, 33, 112))
    add_windows(draw, rng, 506, 110, 628, 350, 5, 11, skew=1.7)
    draw.ellipse((494, 40, 626, 108), fill=(5, 24, 43, 150), outline=(134, 180, 188, 68), width=4)
    draw.ellipse((532, 56, 588, 94), fill=(0, 5, 13, 96), outline=(166, 190, 178, 44), width=3)
    tube(draw, [(556, 40), (560, 12), (575, 44)], (7, 29, 48, 122), hot_rim, 5)

    # Horizontal gantry and collapsed habitation pods.
    tube(draw, [(132, 302), (292, 258), (456, 268), (646, 236), (844, 256), (1056, 210)], (5, 21, 37, 158), rim, 28)
    tube(draw, [(138, 340), (310, 300), (470, 314), (650, 284), (850, 304), (1080, 252)], (4, 17, 31, 120), (88, 130, 142, 52), 11)
    for x, y, rx, ry, angle in [(222, 242, 78, 36, -9), (748, 240, 96, 42, 4), (944, 202, 86, 34, -12)]:
        pod = Image.new("RGBA", (220, 120), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pod, "RGBA")
        pd.rounded_rectangle((20, 25, 200, 92), radius=30, fill=mid, outline=(120, 164, 170, 62), width=4)
        add_windows(pd, rng, 42, 42, 178, 70, 5, 1)
        pod = pod.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        image.alpha_composite(pod, (int(x - pod.width / 2), int(y - pod.height / 2)))
        draw = ImageDraw.Draw(image, "RGBA")

    # Broken support legs and cables give scale and industrial identity.
    supports = [
        [(190, 310), (162, 430)],
        [(294, 274), (334, 430)],
        [(425, 274), (390, 438)],
        [(642, 244), (678, 432)],
        [(790, 262), (746, 428)],
        [(1018, 220), (1098, 420)],
    ]
    for pts in supports:
        tube(draw, pts, (5, 20, 34, 136), (113, 152, 156, 48), rng.randint(8, 15))
    for start_x in [218, 492, 826, 1010]:
        pts = []
        for i in range(8):
            t = i / 7
            pts.append((start_x + t * rng.uniform(130, 260), 120 + t * rng.uniform(170, 260) + math.sin(t * math.tau) * rng.uniform(10, 28)))
        tube(draw, pts, (23, 58, 71, 90), (128, 166, 162, 28), rng.randint(2, 5))

    # Interior truss rhythm: recognizable in grayscale.
    for offset in range(0, 6):
        x0 = 164 + offset * 146
        y0 = 297 - offset * 11
        draw.line((x0, y0, x0 + 112, y0 - 30), fill=(98, 144, 154, 58), width=3)
        draw.line((x0 + 18, y0 - 50, x0 + 102, y0 + 2), fill=(83, 126, 142, 46), width=3)
    for x in range(486, 650, 27):
        draw.line((x, 344, x + 54, 104), fill=(122, 164, 170, 42), width=2)

    # Overgrowth is present, but subordinate to the station silhouette.
    for x in [190, 312, 466, 610, 758, 926, 1068]:
        kelp(draw, rng, x, rng.uniform(386, 448), rng.uniform(90, 210), rng.randint(4, 9))
    for _ in range(75):
        coral(draw, rng, rng.uniform(120, 1120), rng.uniform(282, 428), rng.uniform(0.35, 0.8))

    # Local value control: light shafts/rim glints reveal identity without a generic overlay.
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((468, 34, 642, 128), fill=(110, 176, 184, 30))
    gd.polygon([(440, 98), (645, 68), (760, 454), (330, 454)], fill=(83, 130, 150, 18))
    gd.polygon([(1050, 178), (1168, 170), (1184, 420), (1010, 420)], fill=(83, 130, 150, 14))
    image = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)), image)
    draw = ImageDraw.Draw(image, "RGBA")
    for _ in range(46):
        x = rng.uniform(100, 1120)
        y = rng.uniform(82, 430)
        draw.line((x, y, x + rng.uniform(18, 64), y + rng.uniform(-8, 7)), fill=(164, 194, 181, rng.randint(16, 44)), width=1)

    # Runtime readability pass: crisp enough to survive the game's darkness mask,
    # but still subordinate to fog and distance.
    read = Image.new("RGBA", image.size, (0, 0, 0, 0))
    rd = ImageDraw.Draw(read, "RGBA")
    rd.line([(458, 386), (522, 86), (596, 70), (670, 386)], fill=(170, 214, 211, 128), width=5, joint="curve")
    rd.ellipse((494, 42, 626, 108), outline=(195, 228, 219, 132), width=6)
    rd.ellipse((532, 56, 588, 94), outline=(214, 230, 203, 96), width=3)
    for x in range(506, 632, 24):
        rd.line((x, 114, x + 34, 350), fill=(142, 194, 198, 72), width=2)
    for y in range(132, 338, 28):
        rd.line((500, y, 636, y - 9), fill=(134, 188, 194, 76), width=2)
    rd.line([(130, 302), (292, 258), (456, 268), (646, 236), (844, 256), (1056, 210)], fill=(160, 210, 210, 118), width=8, joint="curve")
    rd.line([(138, 340), (310, 300), (470, 314), (650, 284), (850, 304), (1080, 252)], fill=(126, 176, 184, 82), width=4, joint="curve")
    for box, angle in [((108, 212, 330, 306), -9), ((640, 204, 860, 300), 4), ((838, 172, 1056, 260), -12)]:
        pod = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pod, "RGBA")
        pd.rounded_rectangle((8, 18, pod.width - 8, pod.height - 18), radius=28, outline=(180, 222, 214, 116), width=5)
        pd.line((30, pod.height // 2, pod.width - 30, pod.height // 2), fill=(112, 166, 178, 70), width=3)
        for i in range(5):
            wx = 46 + i * max(1, (pod.width - 92) / 4)
            pd.rounded_rectangle((wx - 8, pod.height // 2 - 8, wx + 8, pod.height // 2 + 8), radius=2, fill=(206, 226, 205, 68))
        pod = pod.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        read.alpha_composite(pod, (int((box[0] + box[2] - pod.width) / 2), int((box[1] + box[3] - pod.height) / 2)))
    for pts in supports:
        rd.line(pts, fill=(128, 178, 186, 80), width=5)
    image = Image.alpha_composite(image, read.filter(ImageFilter.GaussianBlur(0.25)))

    alpha = image.getchannel("A")
    edge = alpha.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.9))
    edge_rgba = Image.new("RGBA", image.size, (150, 198, 202, 0))
    edge_rgba.putalpha(edge.point(lambda p: min(74, int(p * 0.38))))
    image = Image.alpha_composite(image, edge_rgba)

    # Distant water softening, but keep enough local value for runtime darkness/grayscale.
    image = image.filter(ImageFilter.GaussianBlur(0.18))
    rgb = ImageEnhance.Brightness(image.convert("RGB")).enhance(1.32)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.16)
    alpha = image.getchannel("A").filter(ImageFilter.GaussianBlur(0.3))
    alpha = alpha.point(lambda p: min(255, int(p * 1.34)) if p > 18 else int(p * 0.58))
    image = rgb.convert("RGBA")
    image.putalpha(alpha)
    return image


def make_runtime_mockup(asset: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (1280, 720), (4, 12, 25))
    draw = ImageDraw.Draw(canvas, "RGBA")
    for y in range(canvas.height):
        t = y / max(1, canvas.height - 1)
        r = int(8 * (1 - t) + 2 * t)
        g = int(30 * (1 - t) + 8 * t)
        b = int(54 * (1 - t) + 20 * t)
        draw.line((0, y, canvas.width, y), fill=(r, g, b))
    tinted = ImageOps.grayscale(asset).convert("RGBA")
    tint_layer = Image.new("RGBA", asset.size, (96, 139, 149, 0))
    tint_layer.putalpha(tinted.getchannel("A"))
    shaded = ImageChopsMultiplySafe(tint_layer, tinted)
    scaled = ImageOps.contain(shaded, (1040, 460))
    canvas.paste(scaled.convert("RGB"), (126, 126), scaled.getchannel("A").point(lambda p: int(p * 0.42)))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((0, 0, 1280, 720), fill=(5, 19, 34, 64))
    draw.rectangle((0, 0, 1280, 720), fill=(3, 7, 15, 44))
    for y in [140, 248, 380, 530]:
        draw.ellipse((80, y - 28, 1200, y + 42), fill=(88, 122, 142, 16))
    return canvas


def ImageChopsMultiplySafe(color: Image.Image, luma: Image.Image) -> Image.Image:
    out = Image.new("RGBA", color.size, (0, 0, 0, 0))
    cp = color.load()
    lp = luma.load()
    op = out.load()
    for y in range(color.height):
        for x in range(color.width):
            cr, cg, cb, ca = cp[x, y]
            lr, _, _, la = lp[x, y]
            shade = lr / 255
            op[x, y] = (int(cr * shade), int(cg * shade), int(cb * shade), min(ca, la))
    return out


def entry(path: Path) -> dict[str, Any]:
    with Image.open(path) as image:
        size = list(image.size)
    return {
        "id": ASSET["id"],
        "role": "landmark",
        "band": "transitionDeep",
        "label": ASSET["label"],
        "repeatMode": "anchor",
        "path": rel(path),
        "status": "ready",
        "safeOpacity": ASSET["safeOpacity"],
        "scaleRange": ASSET["scaleRange"],
        "parallaxRange": ASSET["parallaxRange"],
        "readabilityRisk": ASSET["readabilityRisk"],
        "size": size,
        "authoredPhase": 10,
        "depthLane": "far-mid",
        "composition": "drowned signal station: tower, gantry, pods, cables, shelf, controlled local haze",
        "notes": "Phase 10 hand-authored vertical slice: one cohesive distant transition-deep station encounter with internal value structure, grayscale-readable tower/gantry/pod identity, and local integrated fog/rim lighting.",
    }


def source_sheet(asset: Image.Image, mockup: Image.Image) -> Image.Image:
    sheet = Image.new("RGB", (1680, 980), (8, 14, 19))
    draw = ImageDraw.Draw(sheet)
    title = font(30, True)
    head = font(18, True)
    body = font(14)
    draw.text((34, 24), "Water9 Phase 10 Authored Distant Landmark", fill=(232, 242, 238), font=title)
    draw.text((34, 64), "Single drowned signal station composition: tower, gantry, pods, cables, shelf, haze, and readable local values.", fill=(146, 170, 176), font=body)
    checker = Image.new("RGB", asset.size, (26, 34, 38))
    cd = ImageDraw.Draw(checker)
    for y in range(0, asset.height, 28):
        for x in range(0, asset.width, 28):
            if (x // 28 + y // 28) % 2:
                cd.rectangle((x, y, x + 27, y + 27), fill=(37, 48, 52))
    checker.paste(asset.convert("RGB"), mask=asset.getchannel("A"))
    panels = [
        ("transparent source on checker", ImageOps.contain(checker, (760, 325))),
        ("runtime-like fog/tint mockup", ImageOps.contain(mockup, (760, 430))),
        ("unlabeled grayscale source", ImageOps.contain(ImageOps.grayscale(checker).convert("RGB"), (760, 325))),
        ("low-saturation mockup", ImageOps.contain(ImageEnhance.Color(mockup).enhance(0.12), (760, 430))),
    ]
    positions = [(34, 126), (870, 126), (34, 560), (870, 560)]
    for (label, panel), (x, y) in zip(panels, positions):
        draw.rounded_rectangle((x - 10, y - 38, x + panel.width + 10, y + panel.height + 34), radius=6, fill=(17, 27, 33), outline=(42, 66, 74))
        draw.text((x, y - 31), label, fill=(98, 215, 218), font=head)
        sheet.paste(panel, (x, y))
    return sheet


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    asset = make_landmark()
    asset_path = OUT_DIR / ASSET["filename"]
    asset.save(asset_path)

    mockup = make_runtime_mockup(asset)
    source_path = RUN_DIR / "phase10-drowned-signal-station-source-proof.png"
    gray_path = RUN_DIR / "phase10-drowned-signal-station-source-grayscale-proof.png"
    light_path = RUN_DIR / "phase10-drowned-signal-station-lighting-fog-mockup.png"
    sheet_path = RUN_DIR / "phase10-drowned-signal-station-source-contact-sheet.png"
    asset.convert("RGBA").save(source_path)
    ImageOps.grayscale(asset.convert("RGB")).save(gray_path)
    mockup.save(light_path)
    source_sheet(asset, mockup).save(sheet_path)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["assets"] = [item for item in manifest["assets"] if item.get("id") != ASSET["id"]]
    manifest["assets"].append(entry(asset_path))
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    note = "Phase 10 adds one hand-authored transition-deep drowned signal station landmark as the new quality-bar vertical slice; Phase 8/9 landmarks remain as fallback/scaffolding."
    notes = manifest.setdefault("notes", [])
    if note not in notes:
        notes.append(note)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    result = {
        "manifest": rel(MANIFEST),
        "asset": rel(asset_path),
        "proofs": {
            "source": str(source_path),
            "sourceGrayscale": str(gray_path),
            "lightingFogMockup": str(light_path),
            "sourceContactSheet": str(sheet_path),
        },
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
