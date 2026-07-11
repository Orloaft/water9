#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

RUN = Path(__file__).resolve().parent
CANVAS = RUN / "artifacts" / "canvas"
REVIEW = RUN / "artifacts" / "review"
REVIEW.mkdir(parents=True, exist_ok=True)


def font(size):
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(path, size) if Path(path).exists() else ImageFont.load_default()


captures = [
    ("SURFACE / HOVER / UPPER BAND", "surface-hover"),
    ("MID / SWIM / MID BAND", "mid-swim"),
    ("DEEP / SWIM / LOWER BAND", "deep-swim"),
    ("SCANNER / TWO-HAND HOLD", "scanner-hold"),
]

for gray, name in ((False, "canvas-bands-color.png"), (True, "canvas-bands-grayscale.png")):
    board = Image.new("RGB", (1800, 1260), "#061820")
    draw = ImageDraw.Draw(board)
    draw.text((35, 25), f"V3 A LIVE #GAME CANVAS — {'GRAYSCALE' if gray else 'COLOR'}", font=font(34), fill="#e2f5f3")
    for i, (label, stem) in enumerate(captures):
        im = Image.open(CANVAS / f"{stem}-canvas.png").convert("RGB")
        if gray:
            im = ImageOps.grayscale(im).convert("RGB")
        im = ImageOps.contain(im, (850, 520), Image.Resampling.LANCZOS)
        x = 35 + (i % 2) * 880
        y = 90 + (i // 2) * 570
        board.paste(im, (x, y + 38))
        draw.text((x, y), label, font=font(22), fill="#70dce9")
    board.save(REVIEW / name)

board = Image.new("RGB", (1800, 1500), "#061820")
draw = ImageDraw.Draw(board)
draw.text((35, 24), "LIVE GAMEPLAY FOOTPRINT / ENLARGED INSPECTION", font=font(34), fill="#e2f5f3")
for i, (label, stem) in enumerate(captures):
    im = Image.open(CANVAS / f"{stem}-canvas.png").convert("RGB")
    cx, cy = im.width // 2, im.height // 2
    crop = im.crop((cx - 130, cy - 90, cx + 130, cy + 90))
    enlarged = crop.resize((780, 540), Image.Resampling.NEAREST)
    x = 35 + (i % 2) * 880
    y = 85 + (i // 2) * 640
    # Native crop remains unscaled above the 3x nearest inspection.
    board.paste(crop, (x, y + 34))
    board.paste(enlarged, (x, y + 170))
    draw.text((x, y), label, font=font(20), fill="#70dce9")
    draw.text((x + 280, y + 40), "native crop", font=font(16), fill="#dff6f3")
    draw.text((x, y + 715), "3× nearest inspection", font=font(16), fill="#dff6f3")
board.save(REVIEW / "canvas-native-enlarged.png")
