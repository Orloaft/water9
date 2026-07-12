#!/usr/bin/env python3
"""Build the bounded Diver V3 A refinement slice and its review evidence."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
RUN = Path(__file__).resolve().parent
ART = RUN / "artifacts"
MASTER = ART / "masters" / "transparent"
RUNTIME = ART / "runtime"
REVIEW = ART / "review"
PUBLIC = ROOT / "public" / "assets" / "generated"
PRIOR = ROOT / "runs/diver-v3-a-motion-test-2026-07-11/artifacts/runtime"
CANONICAL = ROOT / "runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/canonical-neutral-side-master.png"

FRAMES = [
    ("hover-settle-a", "hover", 120),
    ("hover-inbetween", "hover", 120),
    ("hover-settle-b", "hover", 120),
    ("swim-propulsion", "swim", 82),
    ("swim-transition-a", "swim", 82),
    ("swim-cruise", "swim", 92),
    ("swim-transition-b", "swim", 82),
    ("scanner-deploy", "scanner", 220),
    ("scanner-hold", "scanner", 240),
    ("scanner-recover", "scanner", 150),
]
CELL = (128, 96)
SAFE = (5, 7, 123, 89)
PIVOT = (64, 52)
VISOR_TARGET = (99, 43)
MASTER_TO_RUNTIME_SCALE = 0.064


def font(size: int):
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


def subject_bbox(im: Image.Image):
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("empty alpha")
    return bbox


def cyan_bbox(im: Image.Image):
    rgba = im.convert("RGBA")
    body = subject_bbox(rgba)
    visor_min_x = body[0] + (body[2] - body[0]) * 0.62
    data = np.asarray(rgba)
    r, g, b, a = [data[:, :, i] for i in range(4)]
    x_grid = np.indices(a.shape)[1]
    mask = ((x_grid >= visor_min_x) & (a > 96) & (b > 105) & (g > 72)
            & (b > r.astype(np.float32) * 1.22) & (g > r.astype(np.float32) * 1.08)).astype("uint8")
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count <= 1:
        raise ValueError("cyan visor landmark missing")
    index = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, w, h = stats[index, :4]
    return int(x), int(y), int(x + w), int(y + h)


def build_palette():
    samples = []
    for name, _, _ in FRAMES:
        im = Image.open(MASTER / "right" / f"{name}.png").convert("RGBA")
        crop = im.crop(subject_bbox(im)).resize((320, 180), Image.Resampling.LANCZOS)
        samples.extend((r, g, b) for r, g, b, a in list(crop.getdata())[::3] if a > 128)
    # Guarantee the canonical cyan beacon and deep rubber anchors remain in the
    # common material palette rather than being outvoted by broad brass areas.
    samples.extend([(30, 138, 158)] * 800 + [(76, 207, 222)] * 500 + [(12, 18, 20)] * 800)
    width = 256
    height = (len(samples) + width - 1) // width
    strip = Image.new("RGB", (width, height), samples[-1])
    strip.putdata(samples + [samples[-1]] * (width * height - len(samples)))
    return strip.quantize(colors=48, method=Image.Quantize.MEDIANCUT)


def registered_cell(master: Image.Image, palette: Image.Image):
    master = master.convert("RGBA")
    bbox = subject_bbox(master)
    visor = cyan_bbox(master)
    crop = master.crop(bbox)
    vx = ((visor[0] + visor[2]) / 2) - bbox[0]
    vy = ((visor[1] + visor[3]) / 2) - bbox[1]
    # One shared scale around the visor anchor prevents body-scale breathing
    # when an arm or fin extends. The accepted masters share production scale.
    scale = MASTER_TO_RUNTIME_SCALE
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    x = round(VISOR_TARGET[0] - vx * scale)
    y = round(VISOR_TARGET[1] - vy * scale)
    alpha = crop.getchannel("A").point(lambda a: 255 if a >= 104 else 0)
    rgb = crop.convert("RGB").quantize(palette=palette).convert("RGB")
    crop = Image.merge("RGBA", (*rgb.split(), alpha))
    cell = Image.new("RGBA", CELL, (0, 0, 0, 0))
    cell.alpha_composite(crop, (x, y))
    clean = cell.load()
    for py in range(cell.height):
        for px in range(cell.width):
            if clean[px, py][3] == 0:
                clean[px, py] = (0, 0, 0, 0)
    return cell


def relight_left(im: Image.Image):
    """Intentional authored left-facing correction, not final raw mirroring."""
    left = ImageOps.mirror(im.convert("RGBA"))
    px = left.load()
    for y in range(left.height):
        for x in range(left.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            horizontal = 1.13 - 0.25 * (x / max(1, left.width - 1))
            vertical = 1.04 - 0.08 * (y / max(1, left.height - 1))
            factor = horizontal * vertical
            px[x, y] = (min(255, round(r * factor)), min(255, round(g * factor)), min(255, round(b * factor)), a)
    # A small port-side cyan housing glint is deliberately repainted after the
    # lighting pass. It is an authored asymmetry marker and survives reduction.
    if left.width == 128:
        for y in range(34, 46):
            for x in range(15, 28):
                r, g, b, a = px[x, y]
                if a == 255 and b > r + 12:
                    px[x, y] = (96, 226, 236, 255)
    return left


def high_res_left_master(right: Image.Image):
    left = ImageOps.mirror(right.convert("RGBA"))
    # Screen-space upper-left key light is restored after reversal.
    layer = Image.new("RGBA", left.size, (0, 0, 0, 0))
    mask = left.getchannel("A")
    shade = Image.new("L", left.size)
    sp = shade.load()
    for y in range(left.height):
        for x in range(left.width):
            sp[x, y] = round(42 * (1 - x / max(1, left.width - 1)) * (1 - 0.35 * y / max(1, left.height - 1)))
    shade = Image.composite(shade, Image.new("L", left.size, 0), mask)
    layer.paste((255, 222, 154, 0), (0, 0, *left.size))
    layer.putalpha(shade)
    left = Image.alpha_composite(left, layer)
    # Deliberate port-side valve highlight/asymmetry, scaled from the master.
    draw = ImageDraw.Draw(left, "RGBA")
    bbox = subject_bbox(left)
    r = max(2, round((bbox[2] - bbox[0]) * 0.004))
    draw.ellipse((bbox[0] + r * 4, bbox[1] + r * 5, bbox[0] + r * 6, bbox[1] + r * 7), fill=(83, 220, 226, 210))
    return left


def save_panel_board(frames, grayscale=False):
    board = Image.new("RGB", (1280, 860), "#061820")
    draw = ImageDraw.Draw(board)
    draw.text((28, 18), f"DIVER V3 A REFINED — {'GRAYSCALE' if grayscale else 'COLOR'}", font=font(30), fill="#e2f5f3")
    for i, frame in enumerate(frames):
        x = 20 + (i % 5) * 250; y = 70 + (i // 5) * 380
        right = Image.open(RUNTIME / f"diver-v3-refined-r-{i}.png").convert("RGBA")
        left = Image.open(RUNTIME / f"diver-v3-refined-l-{i}.png").convert("RGBA")
        if grayscale:
            for_img = []
            for source in (right, left):
                g = ImageOps.grayscale(source.convert("RGB")); for_img.append(Image.merge("RGBA", (g, g, g, source.getchannel("A"))))
            right, left = for_img
        draw.text((x, y), frame["name"], font=font(15), fill="#dff6f3")
        for j, art in enumerate((right, left)):
            plate = Image.new("RGBA", CELL, (5, 17, 22, 255)); plate.alpha_composite(art)
            board.paste(plate.convert("RGB"), (x, y + 28 + j * 100))
        big = right.resize((230, 172), Image.Resampling.NEAREST)
        plate = Image.new("RGBA", big.size, (5, 17, 22, 255)); plate.alpha_composite(big)
        board.paste(plate.convert("RGB"), (x, y + 228))
    board.save(REVIEW / ("frames-grayscale.png" if grayscale else "frames-color.png"), optimize=True)


def build():
    for path in (RUNTIME, REVIEW, PUBLIC, MASTER / "left"):
        path.mkdir(parents=True, exist_ok=True)
    palette = build_palette()
    metadata = []
    right_cells = []
    for i, (name, clip, duration) in enumerate(FRAMES):
        right_master = Image.open(MASTER / "right" / f"{name}.png").convert("RGBA")
        left_master = high_res_left_master(right_master)
        left_master.save(MASTER / "left" / f"{name}.png", optimize=True)
        right = registered_cell(right_master, palette)
        left = relight_left(right)
        for facing, cell in (("r", right), ("l", left)):
            filename = f"diver-v3-refined-{facing}-{i}.png"
            cell.save(RUNTIME / filename, optimize=True)
            cell.save(PUBLIC / filename, optimize=True)
        right_cells.append(right)
        metadata.append({
            "index": i, "name": name, "clip": clip, "durationMs": duration,
            "pivot": list(PIVOT), "rightTexture": f"diver-v3-refined-r-{i}",
            "leftTexture": f"diver-v3-refined-l-{i}",
            "rightBounds": list(right.getchannel("A").getbbox()),
            "leftBounds": list(left.getchannel("A").getbbox()),
            "effectSocket": {"right": [116, 52], "left": [12, 52]} if clip == "scanner" else None,
        })
    manifest = {
        "schemaVersion": 1,
        "authority": "Diver V3 Concept A refinement review slice only",
        "gate": "diverMotionTest=v3a-refined",
        "cellSize": list(CELL), "safeBounds": list(SAFE), "pivot": list(PIVOT),
        "registrationLandmark": {"name": "cyan faceplate center", "target": list(VISOR_TARGET)},
        "alpha": "binary runtime; transparent RGB zero",
        "leftFacing": "authored relight/asymmetry correction after orientation reversal; not raw mirror authority",
        "clips": {"hover": [0, 1, 2], "swim": [3, 4, 5, 6], "scanner": [7, 8, 9]},
        "frames": metadata,
    }
    (RUNTIME / "diver-v3-refined.json").write_text(json.dumps(manifest, indent=2) + "\n")
    save_panel_board(metadata, False); save_panel_board(metadata, True)

    # Adjacent-frame onion skins expose core registration and purposeful limb motion.
    onion = Image.new("RGB", (1050, 640), "#061820")
    draw = ImageDraw.Draw(onion)
    draw.text((25, 18), "REGISTRATION / ADJACENT ONION SKINS", font=font(28), fill="#e2f5f3")
    pairs = [(0, 1), (1, 2), (3, 4), (4, 5), (5, 6)]
    for j, (a, b) in enumerate(pairs):
        overlay = Image.new("RGBA", CELL, (5, 17, 22, 255))
        red = Image.new("RGBA", CELL); red.paste((255, 70, 70, 145), mask=right_cells[a].getchannel("A"))
        cyan = Image.new("RGBA", CELL); cyan.paste((70, 235, 255, 145), mask=right_cells[b].getchannel("A"))
        overlay = Image.alpha_composite(overlay, red); overlay = Image.alpha_composite(overlay, cyan)
        big = overlay.resize((384, 288), Image.Resampling.NEAREST)
        x = 20 + (j % 2) * 510; y = 70 + (j // 2) * 185
        onion.paste(big.crop((0, 40, 384, 230)).convert("RGB"), (x, y))
        draw.text((x, y + 158), f"{FRAMES[a][0]} → {FRAMES[b][0]}", font=font(15), fill="#dff6f3")
    onion.save(REVIEW / "adjacent-onion-registration.png", optimize=True)

    # Direct accepted-prototype comparison.
    compare = Image.new("RGB", (1280, 540), "#061820")
    draw = ImageDraw.Draw(compare)
    draw.text((25, 18), "ACCEPTED MOTION PROTOTYPE / REFINED SLICE", font=font(28), fill="#e2f5f3")
    labels = [("prior hover A", Image.open(PRIOR / "diver-v3-motion-0.png")),
              ("refined hover A", right_cells[0]), ("new hover in-between", right_cells[1]),
              ("prior swim propulsion", Image.open(PRIOR / "diver-v3-motion-2.png")),
              ("new swim transition", right_cells[4])]
    for i, (label, art) in enumerate(labels):
        x = 20 + i * 250
        plate = Image.new("RGBA", CELL, (5, 17, 22, 255)); plate.alpha_composite(art.convert("RGBA"))
        big = plate.resize((230, 172), Image.Resampling.NEAREST)
        compare.paste(big.convert("RGB"), (x, 90))
        compare.paste(plate.convert("RGB"), (x, 290))
        draw.text((x, 65), label, font=font(14), fill="#70dce9")
        draw.text((x, 395), "native 128×96", font=font(13), fill="#dff6f3")
    canonical = ImageOps.contain(Image.open(CANONICAL).convert("RGB"), (500, 110), Image.Resampling.LANCZOS)
    compare.paste(canonical, (380, 420))
    compare.save(REVIEW / "prior-refined-comparison.png", optimize=True)


if __name__ == "__main__":
    build()
