from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).parent
ART = ROOT / "artifacts"
MASTER = ART / "bible" / "canonical-neutral-side-master.png"
TURN = ART / "generated" / "turnaround-candidate-01.png"
OUT_BIBLE = ART / "bible" / "orthographic-turnaround.png"
OUT_REVIEW = ART / "review"

BG = (7, 24, 34)
PANEL = (11, 34, 46)
RULE = (49, 91, 101)
TEXT = (224, 235, 229)
MUTED = (144, 177, 178)
CYAN = (54, 214, 230)
BRASS = (194, 142, 66)

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def fit(im, box, resample=Image.Resampling.LANCZOS):
    w, h = box
    scale = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), resample)


def paste_center(board, im, box):
    x0, y0, x1, y1 = box
    board.paste(im, (x0 + (x1 - x0 - im.width) // 2, y0 + (y1 - y0 - im.height) // 2))


def label(draw, xy, text, size=28, color=TEXT, bold=False, anchor="la"):
    draw.text(xy, text, font=font(size, bold), fill=color, anchor=anchor)


master = Image.open(MASTER).convert("RGB")
turn = Image.open(TURN).convert("RGB")

# Inspected canonical silhouette bounds, with padding retained so no contour is touched.
side = master.crop((160, 140, 1500, 755))
left = ImageOps.mirror(side)

# Candidate 01 side poses were not strict enough for registration. Only its coherent
# front/back authored construction views are used here; cropping does not redraw art.
front = turn.crop((880, 105, 1305, 800))
back = turn.crop((1290, 105, 1735, 805))


def make_orthographic():
    board = Image.new("RGB", (1800, 1120), BG)
    d = ImageDraw.Draw(board)
    label(d, (60, 40), "CONCEPT A  /  ORTHOGRAPHIC REGISTRATION GATE", 38, bold=True)
    label(d, (60, 92), "Exact mirrored side geometry + authored front/back construction", 23, MUTED)
    panels = [(55, 145, 885, 535), (915, 145, 1745, 535), (250, 605, 850, 1065), (950, 605, 1550, 1065)]
    names = ["LEFT SIDE — exact geometry mirror", "RIGHT SIDE — canonical master", "FRONT CONSTRUCTION", "BACK CONSTRUCTION"]
    imgs = [left, side, front, back]
    for i, (box, name, im) in enumerate(zip(panels, names, imgs)):
        d.rounded_rectangle(box, 18, fill=PANEL, outline=RULE, width=2)
        label(d, ((box[0]+box[2])//2, box[1]+22), name, 23, CYAN if i < 2 else BRASS, True, "ma")
        inner = (box[0]+25, box[1]+60, box[2]-25, box[3]-20)
        fitted = fit(im, (inner[2]-inner[0], inner[3]-inner[1]))
        paste_center(board, fitted, inner)
        cx = (box[0] + box[2]) // 2
        d.line((cx, box[1]+58, cx, box[3]-18), fill=(31, 67, 78), width=1)
    label(d, (900, 1085), "Side registration is exact; directional light is not mirrored in production art—see bible rules.", 20, MUTED, anchor="ma")
    board.save(OUT_BIBLE)
    board.save(OUT_REVIEW / "orthographic-registration.png")


def make_bible_board():
    board = Image.new("RGB", (1800, 1200), BG)
    d = ImageDraw.Draw(board)
    label(d, (60, 38), "WATER9 DIVER V3  /  CONCEPT A CHARACTER BIBLE", 40, bold=True)
    label(d, (60, 92), "Canonical Heritage pressure-suit identity — pre-animation review gate", 24, MUTED)
    d.rounded_rectangle((55, 140, 1745, 720), 20, fill=PANEL, outline=RULE, width=2)
    canonical = fit(side, (1600, 505))
    paste_center(board, canonical, (100, 185, 1700, 690))
    label(d, (900, 160), "CANONICAL RIGHT-FACING NEUTRAL SIDE MASTER", 24, CYAN, True, "ma")

    d.rounded_rectangle((55, 755, 820, 1145), 18, fill=PANEL, outline=RULE, width=2)
    label(d, (82, 780), "IMMUTABLE SILHOUETTE", 25, BRASS, True)
    lines = [
        "• silvered-brass dome + cyan rectangular glass",
        "• broad rounded cuirass and deep black neck seal",
        "• paired copper cylinders high on the back",
        "• short heavy bellows limbs; circular joint housings",
        "• articulated work gloves; weighted short dark fins",
        "• compact 2.31:1 horizontal silhouette",
    ]
    for i, t in enumerate(lines):
        label(d, (82, 830 + i*43), t, 22, TEXT)

    d.rounded_rectangle((850, 755, 1745, 1145), 18, fill=PANEL, outline=RULE, width=2)
    label(d, (878, 780), "MATERIAL / VALUE HIERARCHY", 25, BRASS, True)
    swatches = [
        ("outline / rubber", (18, 27, 29)), ("brass shadow", (76, 56, 35)),
        ("brass mid", (145, 103, 48)), ("brass light", (211, 171, 93)),
        ("copper tank", (145, 69, 38)), ("oxidation", (61, 110, 99)),
        ("visor shadow", (5, 57, 70)), ("visor beacon", (48, 211, 229)),
    ]
    for i, (name, color) in enumerate(swatches):
        col, row = i % 2, i // 2
        x, y = 880 + col*420, 835 + row*63
        d.rounded_rectangle((x, y, x+74, y+40), 7, fill=color, outline=(222,222,205))
        label(d, (x+88, y+20), name, 20, TEXT, anchor="lm")
    label(d, (878, 1095), "FIXED LIGHT: cool upper-left screen key; warm brass bounce; localized cyan glow", 19, MUTED)
    board.save(OUT_REVIEW / "character-bible-board.png")


def make_gameplay_board():
    board = Image.new("RGB", (1800, 1060), BG)
    d = ImageDraw.Draw(board)
    label(d, (60, 38), "GAMEPLAY SCALE + GRAYSCALE SILHOUETTE CHECK", 39, bold=True)
    label(d, (60, 92), "Canonical master reduced with Lanczos; enlarged samples use nearest-neighbor only", 23, MUTED)
    gray = ImageOps.grayscale(side).convert("RGB")
    sizes = [30, 43, 60]
    xs = [70, 625, 1180]
    for x, h in zip(xs, sizes):
        d.rounded_rectangle((x, 150, x+500, 730), 18, fill=PANEL, outline=RULE, width=2)
        label(d, (x+250, 172), f"{h} PX ACTOR HEIGHT", 25, CYAN if h == 43 else TEXT, True, "ma")
        native = side.resize((round(side.width*h/side.height), h), Image.Resampling.LANCZOS)
        paste_center(board, native, (x+40, 230, x+460, 340))
        label(d, (x+250, 352), "native", 19, MUTED, anchor="ma")
        zoom_factor = max(1, min(5, 440 // native.width, 280 // native.height))
        zoom = native.resize((native.width*zoom_factor, native.height*zoom_factor), Image.Resampling.NEAREST)
        paste_center(board, zoom, (x+20, 395, x+480, 700))
        label(d, (x+250, 704), f"{zoom_factor}× nearest-neighbor inspection", 19, MUTED, anchor="ma")
    d.rounded_rectangle((70, 770, 1730, 1015), 18, fill=PANEL, outline=RULE, width=2)
    label(d, (95, 792), "43 PX GRAYSCALE", 24, BRASS, True)
    native_g = gray.resize((round(gray.width*43/gray.height), 43), Image.Resampling.LANCZOS)
    paste_center(board, native_g, (310, 790, 700, 900))
    zoom_g = native_g.resize((native_g.width*5, native_g.height*5), Image.Resampling.NEAREST)
    paste_center(board, zoom_g, (760, 785, 1540, 995))
    label(d, (1600, 855), "visor beacon survives\nbody mass remains distinct\nfins separate from torso", 20, TEXT, anchor="mm")
    board.save(OUT_REVIEW / "gameplay-scale-and-grayscale.png")


OUT_REVIEW.mkdir(parents=True, exist_ok=True)
make_orthographic()
make_bible_board()
make_gameplay_board()
print(OUT_BIBLE)
for p in sorted(OUT_REVIEW.glob("*.png")):
    print(p)
