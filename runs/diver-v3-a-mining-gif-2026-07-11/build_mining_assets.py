#!/usr/bin/env python3
"""Build the bounded Diver V3 A mining extension and compact review boards."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
RUN = Path(__file__).resolve().parent
ART = RUN / "artifacts"
RUNTIME = ART / "runtime"
REVIEW = ART / "review"
PUBLIC = ROOT / "public/assets/generated"
REFINED = ROOT / "runs/diver-v3-a-refinement-2026-07-11/artifacts/runtime"
CELL = (128, 96)
PIVOT = (64, 52)
FRAMES = [
    ("mining-anticipation", 0.22),
    ("mining-contact", 0.48),
    ("mining-recoil", 0.73),
    ("mining-recover", 1.0),
]


def font(size: int):
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


def clean_alpha(im: Image.Image):
    out = im.convert("RGBA")
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
            elif a < 128:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)
    return out


def draw_cutter(base: Image.Image, frame: int):
    """Repaint a compact two-hand pneumatic cutter on the registered body."""
    out = base.copy().convert("RGBA")
    d = ImageDraw.Draw(out, "RGBA")
    # Per-pose grip, brace, and tip positions. The helmet/backpack are untouched.
    poses = [
        ((93, 50), (103, 44), (119, 40)),   # anticipation: tool raised
        ((94, 51), (107, 51), (124, 51)),   # contact: maximum extension
        ((92, 52), (102, 55), (116, 57)),   # recoil: compressed/down
        ((93, 51), (104, 48), (121, 47)),   # recover: rising toward wind-up
    ]
    rear, brace, tip = poses[frame]
    # Connected rear arm and forward brace; dark outline preserves silhouette.
    d.line([(84, 54), rear, brace], fill=(16, 20, 19, 255), width=7, joint="curve")
    d.line([(84, 53), rear, brace], fill=(126, 82, 38, 255), width=4, joint="curve")
    d.ellipse((rear[0]-3, rear[1]-3, rear[0]+3, rear[1]+3), fill=(207, 142, 54, 255), outline=(31, 28, 22, 255), width=1)
    d.ellipse((brace[0]-3, brace[1]-3, brace[0]+3, brace[1]+3), fill=(202, 130, 47, 255), outline=(31, 28, 22, 255), width=1)
    # Cutter barrel: black casing, copper chamber, brass collar, cyan live core.
    d.line([rear, tip], fill=(10, 15, 16, 255), width=8)
    d.line([rear, tip], fill=(72, 48, 29, 255), width=6)
    d.line([(rear[0]+2, rear[1]-1), (tip[0]-3, tip[1]-1)], fill=(183, 111, 40, 255), width=3)
    d.line([(rear[0]+5, rear[1]), (tip[0]-4, tip[1])], fill=(54, 207, 219, 255), width=2)
    # Chunky collar and pointed tungsten/cyan contact head.
    cx, cy = brace
    d.rectangle((cx-2, cy-4, cx+3, cy+4), fill=(204, 151, 60, 255), outline=(31, 28, 22, 255), width=1)
    tx, ty = tip
    d.ellipse((tx-4, ty-4, tx+3, ty+4), fill=(174, 108, 38, 255), outline=(20, 21, 19, 255), width=1)
    d.polygon([(tx+2, ty-3), (127, ty), (tx+2, ty+3)], fill=(75, 224, 230, 255), outline=(21, 38, 38, 255))
    if frame == 1:
        # Baked one-pixel contact star reads only on the strike drawing; live
        # terrain particles remain the authoritative world-space feedback.
        d.line([(125, 47), (125, 55)], fill=(224, 247, 224, 255), width=1)
        d.line([(122, 51), (127, 51)], fill=(113, 240, 237, 255), width=1)
    return clean_alpha(out)


def authored_left(right: Image.Image):
    left = ImageOps.mirror(right)
    px = left.load()
    for y in range(left.height):
        for x in range(left.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            # Restore the upper-left screen-space key after reversal.
            light = (1.12 - 0.22 * x / 127) * (1.03 - 0.06 * y / 95)
            px[x, y] = (min(255, round(r * light)), min(255, round(g * light)), min(255, round(b * light)), a)
    d = ImageDraw.Draw(left, "RGBA")
    # Authored port-side cyan pressure tell, intentionally not mirrored RGB.
    d.rectangle((28, 38, 30, 41), fill=(103, 230, 235, 255))
    return clean_alpha(left)


def plate(art: Image.Image, grayscale=False):
    if grayscale:
        g = ImageOps.grayscale(art.convert("RGB"))
        art = Image.merge("RGBA", (g, g, g, art.getchannel("A")))
    bg = Image.new("RGBA", CELL, (5, 20, 27, 255))
    bg.alpha_composite(art)
    return bg


def build_review(right_frames, left_frames, grayscale=False):
    board = Image.new("RGB", (1120, 500), "#061820")
    d = ImageDraw.Draw(board)
    d.text((24, 18), f"DIVER V3 A — SWIM / MINE {'GRAYSCALE' if grayscale else 'COLOR'}", font=font(26), fill="#e2f5f3")
    swim = Image.open(REFINED / "diver-v3-refined-r-3.png").convert("RGBA")
    items = [("swim propulsion", swim, swim)] + [(name, right_frames[i], left_frames[i]) for i, (name, _) in enumerate(FRAMES)]
    for i, (name, right, left) in enumerate(items):
        x = 18 + i * 218
        d.text((x, 62), name, font=font(13), fill="#8de8ed")
        small = plate(right, grayscale)
        board.paste(small.convert("RGB"), (x, 88))
        board.paste(plate(left, grayscale).convert("RGB"), (x, 188))
        big = small.resize((192, 144), Image.Resampling.NEAREST)
        board.paste(big.convert("RGB"), (x, 296))
    path = REVIEW / ("swim-mine-grayscale.png" if grayscale else "swim-mine-color.png")
    board.save(path, optimize=True)


def main():
    for path in (RUNTIME, REVIEW, PUBLIC):
        path.mkdir(parents=True, exist_ok=True)
    base = Image.open(REFINED / "diver-v3-refined-r-8.png").convert("RGBA")
    right_frames, left_frames, metadata = [], [], []
    for offset, (name, progress_end) in enumerate(FRAMES):
        index = 10 + offset
        right = draw_cutter(base, offset)
        left = authored_left(right)
        right_frames.append(right); left_frames.append(left)
        for facing, art in (("r", right), ("l", left)):
            filename = f"diver-v3-refined-mining-{facing}-{index}.png"
            art.save(RUNTIME / filename, optimize=True)
            art.save(PUBLIC / filename, optimize=True)
        metadata.append({
            "index": index, "name": name, "clip": "mining", "progressEnd": progress_end,
            "pivot": list(PIVOT), "rightTexture": f"diver-v3-refined-mining-r-{index}",
            "leftTexture": f"diver-v3-refined-mining-l-{index}",
            "rightBounds": list(right.getchannel("A").getbbox()), "leftBounds": list(left.getchannel("A").getbbox()),
            "toolTipSocket": {"right": [127, [40, 51, 57, 47][offset]], "left": [0, [40, 51, 57, 47][offset]]},
        })
    manifest = {
        "schemaVersion": 1, "authority": "Diver V3 A refined mining extension only",
        "gate": "diverMotionTest=v3a-refined-mining", "parentGate": "diverMotionTest=v3a-refined",
        "cellSize": list(CELL), "pivot": list(PIVOT), "alpha": "binary; transparent RGB zero",
        "cadence": "normalized live mineCooldown (480–240 ms)",
        "leftFacing": "authored screen-space relight and port-side detail after reversal; not raw RGB mirror",
        "frames": metadata,
    }
    (RUNTIME / "diver-v3-refined-mining.json").write_text(json.dumps(manifest, indent=2) + "\n")
    build_review(right_frames, left_frames, False)
    build_review(right_frames, left_frames, True)


if __name__ == "__main__":
    main()
