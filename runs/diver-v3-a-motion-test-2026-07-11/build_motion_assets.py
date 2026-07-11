#!/usr/bin/env python3
"""Build only presentation/runtime derivatives from seven authored bitmap masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
RUN = Path(__file__).resolve().parent
ART = RUN / "artifacts"
MASTER_DIR = ART / "masters" / "transparent"
RUNTIME_DIR = ART / "runtime"
PUBLIC_DIR = ROOT / "public" / "assets" / "generated"
REVIEW_DIR = ART / "review"
CANONICAL = ROOT / "runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/canonical-neutral-side-master.png"

FRAMES = [
    ("hover-settle-a", "hover", 180, False),
    ("hover-settle-b", "hover", 180, True),
    ("swim-propulsion", "swim", 125, False),
    ("swim-cruise", "swim", 145, True),
    ("scanner-deploy", "scanner", 130, False),
    ("scanner-hold", "scanner", 240, False),
    ("scanner-recover", "scanner", 150, True),
]

CELL = (128, 96)
SAFE = (6, 8, 122, 88)
PIVOT = (64, 52)
SOCKETS = {
    "hover-settle-a": {"lead_hand": [113, 57], "support_hand": [96, 73], "effect_origin": [118, 57]},
    "hover-settle-b": {"lead_hand": [113, 58], "support_hand": [96, 72], "effect_origin": [118, 58]},
    "swim-propulsion": {"lead_hand": [115, 52], "support_hand": [89, 69], "effect_origin": [120, 52]},
    "swim-cruise": {"lead_hand": [115, 51], "support_hand": [89, 68], "effect_origin": [120, 51]},
    "scanner-deploy": {"lead_hand": [105, 61], "support_hand": [92, 61], "effect_origin": [119, 58]},
    "scanner-hold": {"lead_hand": [104, 58], "support_hand": [92, 62], "effect_origin": [120, 55]},
    "scanner-recover": {"lead_hand": [104, 61], "support_hand": [91, 63], "effect_origin": [118, 59]},
}


def font(size: int):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def trim(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("empty alpha")
    return im.crop(bbox)


def runtime_frame(master: Image.Image) -> Image.Image:
    subject = trim(master.convert("RGBA"))
    max_w, max_h = SAFE[2] - SAFE[0], SAFE[3] - SAFE[1]
    scale = min(max_w / subject.width, max_h / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    # Reduce painterly micro-noise into a stable gameplay palette, then lock alpha.
    alpha = subject.getchannel("A").point(lambda a: 255 if a >= 96 else 0)
    rgb = subject.convert("RGB").quantize(colors=32, method=Image.Quantize.MEDIANCUT).convert("RGB")
    subject = Image.merge("RGBA", (*rgb.split(), alpha))
    px = subject.load()
    for y in range(subject.height):
        for x in range(subject.width):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    cell = Image.new("RGBA", CELL, (0, 0, 0, 0))
    x = PIVOT[0] - size[0] // 2
    y = PIVOT[1] - size[1] // 2
    x = max(SAFE[0], min(x, SAFE[2] - size[0]))
    y = max(SAFE[1], min(y, SAFE[3] - size[1]))
    cell.alpha_composite(subject, (x, y))
    return cell


def panel(title: str, image: Image.Image, grayscale=False) -> Image.Image:
    bg = Image.new("RGB", (360, 250), "#09232c")
    draw = ImageDraw.Draw(bg)
    draw.text((14, 12), title, font=font(18), fill="#dff6f3")
    art = image.convert("RGBA")
    if grayscale:
        gray = ImageOps.grayscale(art.convert("RGB"))
        art = Image.merge("RGBA", (gray, gray, gray, art.getchannel("A")))
    native = Image.new("RGBA", (128, 96), (5, 17, 22, 255)); native.alpha_composite(art)
    bg.paste(native.convert("RGB"), (15, 47))
    enlarged = art.resize((256, 192), Image.Resampling.NEAREST)
    plate = Image.new("RGBA", (256, 192), (5, 17, 22, 255)); plate.alpha_composite(enlarged)
    bg.paste(plate.convert("RGB"), (94, 47))
    draw.text((15, 219), "native 128×96 + 2× nearest", font=font(13), fill="#7edfea")
    return bg


def build():
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    built = []
    atlas = Image.new("RGBA", (CELL[0] * len(FRAMES), CELL[1]), (0, 0, 0, 0))
    for index, (name, clip, duration, loop_end) in enumerate(FRAMES):
        master = Image.open(MASTER_DIR / f"{name}.png")
        cell = runtime_frame(master)
        runtime_name = f"diver-v3-motion-{index}.png"
        cell.save(RUNTIME_DIR / runtime_name, optimize=True)
        cell.save(PUBLIC_DIR / runtime_name, optimize=True)
        atlas.alpha_composite(cell, (index * CELL[0], 0))
        bbox = cell.getchannel("A").getbbox()
        built.append({
            "index": index, "name": name, "clip": clip, "durationMs": duration,
            "loopEnd": loop_end, "textureKey": f"diver-v3-motion-{index}",
            "source": f"artifacts/masters/transparent/{name}.png",
            "cell": [index * CELL[0], 0, *CELL], "bounds": list(bbox),
            "pivot": list(PIVOT), "sockets": SOCKETS[name],
        })
    atlas.save(RUNTIME_DIR / "diver-v3-motion-atlas.png", optimize=True)
    metadata = {
        "schemaVersion": 1, "authority": "Diver V3 Concept A motion-test only",
        "authoredFacing": "right", "cellSize": list(CELL), "safeBounds": list(SAFE),
        "alpha": "binary runtime; soft graded transparent high-resolution masters retained",
        "clips": {
            "hover": {"frames": [0, 1], "behavior": "loop"},
            "swim": {"frames": [2, 3], "behavior": "loop"},
            "scanner": {"frames": [4, 5, 6], "behavior": "deploy, hold while active, recover"},
        },
        "frames": built,
    }
    (RUNTIME_DIR / "diver-v3-motion.json").write_text(json.dumps(metadata, indent=2) + "\n")

    for grayscale, filename in ((False, "motion-color-native-enlarged.png"), (True, "motion-grayscale-native-enlarged.png")):
        board = Image.new("RGB", (1080, 780), "#061820")
        draw = ImageDraw.Draw(board)
        draw.text((28, 18), f"DIVER V3 A MOTION TEST — {'GRAYSCALE' if grayscale else 'COLOR'}", font=font(30), fill="#e2f5f3")
        for i, frame in enumerate(built):
            cell = Image.open(RUNTIME_DIR / f"diver-v3-motion-{i}.png")
            p = panel(frame["name"], cell, grayscale)
            board.paste(p, ((i % 3) * 360, 70 + (i // 3) * 250))
        board.save(REVIEW_DIR / filename)

    canonical = Image.open(CANONICAL).convert("RGB")
    comparison = Image.new("RGB", (1600, 920), "#061820")
    draw = ImageDraw.Draw(comparison)
    draw.text((35, 22), "CANONICAL A BENCHMARK / AUTHORED MOTION KEYS", font=font(34), fill="#e2f5f3")
    can = ImageOps.contain(canonical, (720, 360), Image.Resampling.LANCZOS)
    comparison.paste(can, (40, 85))
    draw.text((40, 455), "approved canonical master", font=font(20), fill="#70dce9")
    for i in range(len(FRAMES)):
        cell = Image.open(RUNTIME_DIR / f"diver-v3-motion-{i}.png")
        big = cell.resize((384, 288), Image.Resampling.NEAREST)
        x = 790 + (i % 2) * 395; y = 80 + (i // 2) * 205
        crop = big.crop((0, 35, 384, 240))
        comparison.paste(Image.new("RGB", crop.size, "#09232c"), (x, y))
        comparison.paste(crop, (x, y), crop)
        draw.text((x, y + 170), FRAMES[i][0], font=font(16), fill="#e2f5f3")
    comparison.save(REVIEW_DIR / "canonical-motion-comparison.png")


if __name__ == "__main__":
    build()
