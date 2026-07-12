#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

RUN = Path(__file__).resolve().parent
CANVAS = RUN / "artifacts" / "canvas"
REVIEW = RUN / "artifacts" / "review"


def font(size):
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


captures = [
    ("SURFACE / HOVER IN-BETWEEN", "surface-hover-inbetween"),
    ("MID / SWIM TRANSITION A", "mid-swim-transition-a"),
    ("DEEP / AUTHORED LEFT", "deep-swim-authored-left"),
    ("SCANNER / DEPLOY", "scanner-deploy"),
    ("SCANNER / LIVE HOLD", "scanner-hold"),
    ("SCANNER / RECOVER", "scanner-recover"),
]

for gray, filename in ((False, "canvas-bands-color.png"), (True, "canvas-bands-grayscale.png")):
    board = Image.new("RGB", (1800, 1800), "#061820")
    draw = ImageDraw.Draw(board)
    draw.text((35, 25), f"V3 A REFINED LIVE #GAME CANVAS — {'GRAYSCALE' if gray else 'COLOR'}", font=font(34), fill="#e2f5f3")
    for i, (label, stem) in enumerate(captures):
        im = Image.open(CANVAS / f"{stem}-canvas.png").convert("RGB")
        if gray:
            im = ImageOps.grayscale(im).convert("RGB")
        im = ImageOps.contain(im, (850, 500), Image.Resampling.LANCZOS)
        x = 35 + (i % 2) * 880; y = 90 + (i // 2) * 555
        draw.text((x, y), label, font=font(21), fill="#70dce9")
        board.paste(im, (x, y + 34))
    board.save(REVIEW / filename, optimize=True)

board = Image.new("RGB", (1800, 1530), "#061820")
draw = ImageDraw.Draw(board)
draw.text((35, 24), "LIVE GAMEPLAY FOOTPRINT / NATIVE + ENLARGED", font=font(34), fill="#e2f5f3")
for i, (label, stem) in enumerate(captures[:4]):
    im = Image.open(CANVAS / f"{stem}-canvas.png").convert("RGB")
    cx, cy = im.width // 2, im.height // 2
    crop = im.crop((cx - 130, cy - 90, cx + 130, cy + 90))
    enlarged = crop.resize((780, 540), Image.Resampling.NEAREST)
    x = 35 + (i % 2) * 880; y = 85 + (i // 2) * 690
    draw.text((x, y), label, font=font(20), fill="#70dce9")
    board.paste(crop, (x, y + 34)); board.paste(enlarged, (x, y + 225))
    draw.text((x + 280, y + 40), "native canvas crop", font=font(15), fill="#dff6f3")
    draw.text((x, y + 770), "3× nearest inspection", font=font(15), fill="#dff6f3")
board.save(REVIEW / "canvas-native-enlarged.png", optimize=True)
