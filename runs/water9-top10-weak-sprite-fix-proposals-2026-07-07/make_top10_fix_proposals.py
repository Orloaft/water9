#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / "runs/water9-top10-weak-sprite-fix-proposals-2026-07-07"
AUDIT_JSON = ROOT / "runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.json"
GEN = ROOT / "public/assets/generated"
SRC = ROOT / "public/assets/source"

SESSION_KEY = "top10-weak-sprite-fix-proposals"
HEAD = "971e654"


TOP10 = [
    "biolume-rock-0",
    "biolume-rock-1",
    "fauna-abyss-goblin-shark",
    "fauna-deep-barreleye",
    "fauna-deep-gulper-eel",
    "fauna-abyss-black-swallower",
    "fauna-abyss-frilled-shark",
    "fauna-abyss-snipe-eel",
    "fauna-deep-sea-spider",
    "fauna-shallow-lantern-fry",
]


FIXES = {
    "biolume-rock-0": {
        "fixType": "crop repair",
        "source": "public/assets/generated/biolume-rock-0.png; checked source slice public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-0-source.png",
        "currentFailure": "Broken sheet remnant/wrong crop: top strip and extra sibling pixels read as source-sheet debris.",
        "expectedBenefit": "Leaves one clean luminous nodule silhouette with the sheet strip removed.",
        "risk": "The repaired crop keeps only the strongest local nodule; Alex should confirm whether the discarded sibling fragment was intentional.",
        "recommendation": "needs Alex art review",
    },
    "biolume-rock-1": {
        "fixType": "crop repair",
        "source": "public/assets/generated/biolume-rock-1.png; checked source slice public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-1-source.png",
        "currentFailure": "Broken sibling crop: the right edge includes a clipped second nodule from the sheet.",
        "expectedBenefit": "Centers the complete left nodule and removes the clipped sibling, so it no longer reads like a sheet fragment.",
        "risk": "Composition changes from a clustered rock to a single nodule; should be approved by art direction before runtime swap.",
        "recommendation": "needs Alex art review",
    },
    "fauna-abyss-goblin-shark": {
        "fixType": "rematte",
        "source": "public/assets/generated/fauna-abyss-goblin-shark.png",
        "currentFailure": "White fringe/pale magenta matte halo and flat pink body pop against abyss water.",
        "expectedBenefit": "Darkens semitransparent edge pixels, removes pale matte RGB, and adds an abyss-violet body read without changing frame geometry.",
        "risk": "Local rematte preserves anatomy but may still feel too stylized compared with newer painted fauna.",
        "recommendation": "approve for integration",
    },
    "fauna-deep-barreleye": {
        "fixType": "hybrid rescale/crop + recolor/contrast",
        "source": "public/assets/generated/fauna-deep-barreleye.png",
        "currentFailure": "Soft upscale/muddy grayscale: face and body smear together at 34 px gameplay width.",
        "expectedBenefit": "Increases in-frame body coverage, sharpens edges, and lifts the dome/eye contrast for a clearer species read.",
        "risk": "Small-frame local repair cannot add true new anatomy; final art pass could still outperform it.",
        "recommendation": "approve for integration",
    },
    "fauna-deep-gulper-eel": {
        "fixType": "recolor/contrast",
        "source": "public/assets/generated/fauna-deep-gulper-eel.png",
        "currentFailure": "Dark-on-dark/muddy grayscale: body collapses into deep water outside the mouth.",
        "expectedBenefit": "Keeps the strong mouth silhouette while lifting dorsal planes and rim contrast.",
        "risk": "More visible highlights make the eel less cryptic; tune lower if it distracts in motion.",
        "recommendation": "approve for integration",
    },
    "fauna-abyss-black-swallower": {
        "fixType": "recolor/contrast",
        "source": "public/assets/generated/fauna-abyss-black-swallower.png",
        "currentFailure": "Dark-on-dark/muddy grayscale: bulky body reads as one low-contrast lump.",
        "expectedBenefit": "Adds cold rim light and midtone body separation while keeping the black-swallower identity.",
        "risk": "Could become too similar to the gulper eel if both are integrated without side-by-side tuning.",
        "recommendation": "needs Alex art review",
    },
    "fauna-abyss-frilled-shark": {
        "fixType": "hybrid rescale/crop + recolor/contrast",
        "source": "public/assets/generated/fauna-abyss-frilled-shark.png",
        "currentFailure": "Thin low-contrast silhouette becomes a narrow dark slash in abyss captures.",
        "expectedBenefit": "Slightly thickens the alpha mass and adds dorsal highlights so the long shark reads in color and grayscale.",
        "risk": "The species is naturally slender; over-thickening may weaken the frilled-shark character.",
        "recommendation": "needs Alex art review",
    },
    "fauna-abyss-snipe-eel": {
        "fixType": "rescale/crop",
        "source": "public/assets/generated/fauna-abyss-snipe-eel.png",
        "currentFailure": "Too thin/tiny at gameplay scale; the needle body is almost a line.",
        "expectedBenefit": "Raises coverage inside the same frame and adds a subtle cool silhouette underlay for gameplay readability.",
        "risk": "A readability repair trades away some needle-thin accuracy; use only if gameplay clarity wins.",
        "recommendation": "needs Alex art review",
    },
    "fauna-deep-sea-spider": {
        "fixType": "rescale/crop",
        "source": "public/assets/generated/fauna-deep-sea-spider.png",
        "currentFailure": "Thin limbs/low readability: legs turn into pale strokes against busy terrain.",
        "expectedBenefit": "Thickens limb alpha, raises central body contrast, and keeps the pose centered at gameplay scale.",
        "risk": "Leg thickening can make the spider less delicate; review against terrain before integration.",
        "recommendation": "needs Alex art review",
    },
    "fauna-shallow-lantern-fry": {
        "fixType": "rescale/crop",
        "source": "public/assets/generated/fauna-shallow-lantern-fry.png",
        "currentFailure": "Tiny/soft at gameplay scale; eye survives but body detail blurs away.",
        "expectedBenefit": "Enlarges the fish within the frame, sharpens the eye/body edge, and keeps a shallow-water blue read.",
        "risk": "Runtime size tuning may be a better final lever than asset pixels alone.",
        "recommendation": "approve for integration",
    },
}


def font(size: int = 14) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


FONT = font(14)
SMALL = font(11)
BOLD = font(16)


def load_audit() -> dict:
    data = json.loads(AUDIT_JSON.read_text())
    return {item["assetKey"]: item for item in data["candidates"] if item["assetKey"] in TOP10}


def frame_spec(asset_key: str, audit: dict) -> tuple[int | None, int | None, int]:
    manifest = GEN / f"{asset_key}.frames.json"
    if manifest.exists():
        data = json.loads(manifest.read_text())
        return data["frameWidth"], data["frameHeight"], data["frameCount"]
    item = audit[asset_key]
    return item["asset"].get("frameWidth"), item["asset"].get("frameHeight"), item["asset"].get("frameCount", 1)


def clean_transparent_rgb(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    arr[arr[:, :, 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def bbox(im: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
    alpha = im.convert("RGBA").getchannel("A")
    mask = alpha.point(lambda p: 255 if p > threshold else 0)
    return mask.getbbox()


def trim(im: Image.Image, padding: int = 2, threshold: int = 8) -> Image.Image:
    b = bbox(im, threshold)
    if not b:
        return im.copy()
    l, t, r, btm = b
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(im.width, r + padding)
    btm = min(im.height, btm + padding)
    return im.crop((l, t, r, btm))


def component_crop(im: Image.Image, reject_top_strip: bool, reject_right_edge: bool) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    mask = arr[:, :, 3] > 18
    h, w = mask.shape
    seen = np.zeros(mask.shape, dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            q = deque([(x, y)])
            seen[y, x] = True
            xs = []
            ys = []
            while q:
                cx, cy = q.popleft()
                xs.append(cx)
                ys.append(cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((nx, ny))
            area = len(xs)
            if area < 20:
                continue
            box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
            if reject_top_strip and box[1] < 12 and (box[2] - box[0]) > 10:
                continue
            if reject_right_edge and box[2] >= w - 2:
                continue
            comps.append((area, box))
    if not comps:
        return trim(rgba, 4)
    comps.sort(reverse=True, key=lambda item: item[0])
    l, t, r, btm = comps[0][1]
    pad = 5
    crop = rgba.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, btm + pad)))
    return clean_transparent_rgb(crop)


def center_on_canvas(subject: Image.Image, size: tuple[int, int], scale: float = 1.0) -> Image.Image:
    subject = trim(subject, 2)
    max_w = max(1, int(size[0] * 0.86))
    max_h = max(1, int(size[1] * 0.76))
    factor = min(max_w / subject.width, max_h / subject.height) * scale
    factor = min(factor, max_w / subject.width, max_h / subject.height)
    nw = max(1, int(round(subject.width * factor)))
    nh = max(1, int(round(subject.height * factor)))
    subject = subject.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.alpha_composite(subject, ((size[0] - nw) // 2, (size[1] - nh) // 2))
    return clean_transparent_rgb(out)


def enhance(im: Image.Image, brightness=1.0, contrast=1.0, saturation=1.0, sharpness=1.0) -> Image.Image:
    out = im.convert("RGBA")
    rgb = Image.new("RGBA", out.size, (0, 0, 0, 0))
    rgb.alpha_composite(out)
    rgb = ImageEnhance.Color(rgb).enhance(saturation)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharpness)
    rgb.putalpha(out.getchannel("A"))
    return clean_transparent_rgb(rgb)


def add_underlay(im: Image.Image, color: tuple[int, int, int], opacity: int = 95, radius: int = 3) -> Image.Image:
    alpha = im.getchannel("A")
    grown = alpha.filter(ImageFilter.MaxFilter(radius))
    ring = ImageChops.subtract(grown, alpha)
    ring = ring.point(lambda p: min(opacity, int(p * opacity / 255)))
    layer = Image.new("RGBA", im.size, (*color, 0))
    layer.putalpha(ring)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(layer)
    out.alpha_composite(im)
    return clean_transparent_rgb(out)


def rescale_visible(im: Image.Image, scale: float, max_fill: float = 0.92) -> Image.Image:
    src = trim(im, 1)
    factor = min(scale, (im.width * max_fill) / src.width, (im.height * max_fill) / src.height)
    nw = max(1, int(src.width * factor))
    nh = max(1, int(src.height * factor))
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.alpha_composite(src, ((im.width - nw) // 2, (im.height - nh) // 2))
    return clean_transparent_rgb(out)


def split_frames(sheet: Image.Image, frame_w: int, frame_h: int, count: int) -> list[Image.Image]:
    return [sheet.crop((i * frame_w, 0, (i + 1) * frame_w, frame_h)) for i in range(count)]


def pack_frames(frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        out.alpha_composite(frame, (i * w, 0))
    return clean_transparent_rgb(out)


def process_goblin(frame: Image.Image) -> Image.Image:
    arr = np.array(enhance(frame, brightness=0.84, contrast=1.16, saturation=0.78, sharpness=1.35))
    a = arr[:, :, 3].astype(np.float32)
    rgb = arr[:, :, :3].astype(np.float32)
    luma = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    pale = (a > 0) & (((a < 230) & (luma > 92)) | ((rgb[:, :, 0] > 145) & (rgb[:, :, 1] > 105) & (rgb[:, :, 2] > 120)))
    rgb[pale] = rgb[pale] * 0.42 + np.array([74, 62, 88]) * 0.58
    body = (a > 100)
    rgb[body] = rgb[body] * np.array([0.88, 0.82, 0.92]) + np.array([10, 8, 18])
    arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    return add_underlay(clean_transparent_rgb(out), (18, 28, 50), 70, 3)


def process_barreleye(frame: Image.Image) -> Image.Image:
    out = rescale_visible(frame, 1.16)
    out = enhance(out, brightness=1.12, contrast=1.32, saturation=1.18, sharpness=1.8)
    return add_underlay(out, (30, 82, 96), 42, 3)


def process_gulper(frame: Image.Image) -> Image.Image:
    out = enhance(frame, brightness=1.14, contrast=1.38, saturation=1.22, sharpness=1.55)
    arr = np.array(out)
    a = arr[:, :, 3] > 40
    rgb = arr[:, :, :3].astype(np.float32)
    rgb[a] = rgb[a] * np.array([0.92, 0.98, 1.16]) + np.array([10, 12, 22])
    arr[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    return add_underlay(Image.fromarray(arr, "RGBA"), (34, 68, 104), 55, 3)


def process_black_swallower(frame: Image.Image) -> Image.Image:
    out = enhance(frame, brightness=1.2, contrast=1.42, saturation=1.12, sharpness=1.45)
    return add_underlay(out, (42, 68, 112), 65, 3)


def process_frilled(frame: Image.Image) -> Image.Image:
    out = rescale_visible(frame, 1.10)
    out = enhance(out, brightness=1.22, contrast=1.38, saturation=1.08, sharpness=1.5)
    return add_underlay(out, (42, 72, 104), 58, 3)


def process_snipe(frame: Image.Image) -> Image.Image:
    out = rescale_visible(frame, 1.18)
    out = enhance(out, brightness=1.18, contrast=1.34, saturation=1.08, sharpness=1.55)
    return add_underlay(out, (50, 82, 112), 75, 5)


def process_spider(frame: Image.Image) -> Image.Image:
    out = rescale_visible(frame, 1.10)
    out = enhance(out, brightness=1.08, contrast=1.28, saturation=0.88, sharpness=1.45)
    return add_underlay(out, (30, 74, 84), 90, 5)


def process_lantern(frame: Image.Image) -> Image.Image:
    out = rescale_visible(frame, 1.23)
    out = enhance(out, brightness=1.14, contrast=1.35, saturation=1.25, sharpness=1.75)
    return add_underlay(out, (32, 108, 132), 46, 3)


PROCESSORS = {
    "fauna-abyss-goblin-shark": process_goblin,
    "fauna-deep-barreleye": process_barreleye,
    "fauna-deep-gulper-eel": process_gulper,
    "fauna-abyss-black-swallower": process_black_swallower,
    "fauna-abyss-frilled-shark": process_frilled,
    "fauna-abyss-snipe-eel": process_snipe,
    "fauna-deep-sea-spider": process_spider,
    "fauna-shallow-lantern-fry": process_lantern,
}


def metrics(im: Image.Image) -> dict:
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    a = arr[:, :, 3]
    visible = a > 8
    strong = a > 128
    if not visible.any():
        return {"width": im.width, "height": im.height, "visiblePixels": 0}
    rgb = arr[:, :, :3].astype(np.float32)
    luma = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    edge = (a > 0) & (a < 230)
    channel_spread = rgb.max(axis=2) - rgb.min(axis=2)
    white_matte = edge & (luma > 205) & (channel_spread < 42)
    transparent_dirty = (a == 0) & (rgb.sum(axis=2) > 0)
    ys, xs = np.where(visible)
    return {
        "width": im.width,
        "height": im.height,
        "visiblePixels": int(visible.sum()),
        "strongAlphaPixels": int(strong.sum()),
        "alphaCoverage": round(float(visible.mean()), 5),
        "bbox": {"left": int(xs.min()), "top": int(ys.min()), "right": int(xs.max() + 1), "bottom": int(ys.max() + 1)},
        "whiteMatteRatio": round(float(white_matte.sum() / max(1, edge.sum())), 5),
        "transparentDirtyRgbPixels": int(transparent_dirty.sum()),
        "grayContrast": round(float(luma[visible].max() - luma[visible].min()), 2),
        "medianLuma": round(float(np.median(luma[visible])), 2),
    }


def checker(size: tuple[int, int], cell: int = 12, colors=((16, 31, 38), (26, 49, 58))) -> Image.Image:
    out = Image.new("RGB", size, colors[0])
    draw = ImageDraw.Draw(out)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=colors[1])
    return out.convert("RGBA")


def fit(im: Image.Image, box: tuple[int, int], upscale_limit: float = 4.0) -> Image.Image:
    scale = min(box[0] / im.width, box[1] / im.height, upscale_limit)
    size = (max(1, int(im.width * scale)), max(1, int(im.height * scale)))
    return im.resize(size, Image.Resampling.NEAREST if scale > 1.8 else Image.Resampling.LANCZOS)


def representative(asset_key: str, image_path: Path, audit: dict) -> Image.Image:
    im = Image.open(image_path).convert("RGBA")
    fw, fh, count = frame_spec(asset_key, audit)
    if fw and fh and count > 1:
        idx = min(count - 1, count // 2)
        return im.crop((idx * fw, 0, (idx + 1) * fw, fh))
    return im


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill=(230, 238, 242), font_obj=SMALL, max_width=220):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=font_obj) <= max_width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    x, y = xy
    for line in lines[:3]:
        draw.text((x, y), line, fill=fill, font=font_obj)
        y += font_obj.size + 3 if hasattr(font_obj, "size") else 14


def make_contact(audit: dict, output: Path, gray: bool = False):
    card_w, card_h = 480, 178
    cols = 2
    rows = math.ceil(len(TOP10) / cols)
    sheet = Image.new("RGB", (cols * card_w, rows * card_h), (8, 15, 21))
    draw = ImageDraw.Draw(sheet)
    for idx, key in enumerate(TOP10):
        x = (idx % cols) * card_w
        y = (idx // cols) * card_h
        draw.rectangle((x + 6, y + 6, x + card_w - 6, y + card_h - 6), outline=(62, 90, 104))
        draw.text((x + 14, y + 12), f"#{idx + 1} {key}", fill=(238, 244, 246), font=BOLD)
        draw.text((x + 14, y + 35), FIXES[key]["fixType"], fill=(252, 184, 78), font=SMALL)
        old = representative(key, GEN / f"{key}.png", audit)
        cand = representative(key, RUN / "candidates" / key / f"{key}-candidate.png", audit)
        expected = audit[key].get("expectedDisplayWidth") or min(88, max(old.width, cand.width))
        scale_old = max(0.5, expected / old.width)
        scale_cand = max(0.5, expected / cand.width)
        panels = [(old, "old", scale_old), (cand, "candidate", scale_cand)]
        for pidx, (img, label, scale) in enumerate(panels):
            px = x + 18 + pidx * 224
            py = y + 58
            bg = checker((208, 88), 10)
            scaled = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)
            bg.alpha_composite(scaled, ((208 - scaled.width) // 2, (88 - scaled.height) // 2))
            sheet.paste(bg.convert("RGB"), (px, py))
            draw.rectangle((px, py, px + 207, py + 87), outline=(42, 68, 80))
            draw.text((px, py + 92), f"{label} at gameplay scale", fill=(185, 204, 212), font=SMALL)
            zoom = fit(img, (70, 42), 3.0)
            zx = px + 134
            zy = py + 38
            zoom_bg = checker((70, 42), 7)
            zoom_bg.alpha_composite(zoom, ((70 - zoom.width) // 2, (42 - zoom.height) // 2))
            sheet.paste(zoom_bg.convert("RGB"), (zx, zy))
            draw.rectangle((zx, zy, zx + 69, zy + 41), outline=(82, 110, 122))
    if gray:
        sheet = ImageOps.grayscale(sheet).convert("RGB")
    sheet.save(output)


def band_color(key: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    if key.startswith("biolume"):
        return (8, 16, 28), (30, 16, 54)
    if "shallow" in key:
        return (17, 66, 78), (22, 108, 118)
    if "deep" in key:
        return (8, 29, 45), (10, 54, 68)
    return (4, 10, 24), (9, 18, 42)


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    out = Image.new("RGB", size)
    draw = ImageDraw.Draw(out)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        col = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        draw.line((0, y, size[0], y), fill=col)
    return out.convert("RGBA")


def make_runtime_preview(audit: dict):
    row_h = 112
    width = 960
    canvas = Image.new("RGB", (width, row_h * len(TOP10)), (5, 12, 18))
    draw = ImageDraw.Draw(canvas)
    for idx, key in enumerate(TOP10):
        y = idx * row_h
        top, bottom = band_color(key)
        bg = gradient((width, row_h), top, bottom)
        canvas.paste(bg.convert("RGB"), (0, y))
        draw.text((16, y + 12), key, fill=(235, 241, 244), font=BOLD)
        old = representative(key, GEN / f"{key}.png", audit)
        cand = representative(key, RUN / "candidates" / key / f"{key}-candidate.png", audit)
        expected = audit[key].get("expectedDisplayWidth") or min(90, old.width)
        for pidx, (img, label) in enumerate(((old, "old"), (cand, "candidate"))):
            scale = max(0.5, expected / img.width)
            scaled = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)
            x = 440 + pidx * 220
            patch = Image.new("RGBA", (180, 76), (0, 0, 0, 0))
            patch.alpha_composite(scaled, ((180 - scaled.width) // 2, (76 - scaled.height) // 2))
            canvas.paste(patch.convert("RGB"), (x, y + 24), patch.getchannel("A"))
            draw.text((x, y + 84), label, fill=(205, 221, 228), font=SMALL)
        draw.line((0, y + row_h - 1, width, y + row_h - 1), fill=(22, 44, 56))
    out = RUN / "runtime-preview/top10-depth-band-preview.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)


def create_candidates(audit: dict) -> dict:
    records = {}
    for key in TOP10:
        asset_dir = RUN / "candidates" / key
        asset_dir.mkdir(parents=True, exist_ok=True)
        src_path = GEN / f"{key}.png"
        im = Image.open(src_path).convert("RGBA")
        if key == "biolume-rock-0":
            repaired = component_crop(im, reject_top_strip=True, reject_right_edge=False)
            candidate = center_on_canvas(enhance(repaired, brightness=1.06, contrast=1.12, saturation=1.1, sharpness=1.25), im.size)
        elif key == "biolume-rock-1":
            repaired = component_crop(im, reject_top_strip=False, reject_right_edge=True)
            candidate = center_on_canvas(enhance(repaired, brightness=1.04, contrast=1.10, saturation=1.08, sharpness=1.18), im.size)
        else:
            fw, fh, count = frame_spec(key, audit)
            if not fw or not fh:
                raise RuntimeError(f"missing frame spec for {key}")
            frames = split_frames(im, fw, fh, count)
            candidate_frames = [PROCESSORS[key](frame) for frame in frames]
            candidate = pack_frames(candidate_frames)
            for i, frame in enumerate(candidate_frames):
                frame.save(asset_dir / f"{key}-candidate-{i}.png")
        candidate = clean_transparent_rgb(candidate)
        candidate_path = asset_dir / f"{key}-candidate.png"
        candidate.save(candidate_path)
        records[key] = {
            **FIXES[key],
            "assetKey": key,
            "kind": audit[key]["kind"],
            "species": audit[key]["species"],
            "candidatePaths": [str(candidate_path.relative_to(ROOT))],
            "promptUsed": None,
            "generationMode": "local source-pixel repair; imagegen skill read, no generated bitmap needed",
            "postProcessingCommand": "python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py",
            "oldMetrics": metrics(im),
            "candidateMetrics": metrics(candidate),
            "auditFailureTags": audit[key]["failureTags"],
        }
    return records


def write_reports(records: dict):
    out_json = {
        "schema": "water9/top10-weak-sprite-fix-proposals@1",
        "sessionKey": SESSION_KEY,
        "headObservedPreflight": HEAD,
        "sourceAuditReport": "runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.md",
        "sourceAuditJson": "runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.json",
        "imagegen": {
            "skillRead": "/home/orlovboros/.openclaw/agents/mgr-water9/agent/codex-home/skills/.system/imagegen/SKILL.md",
            "used": False,
            "reason": "All ten candidates were repairable from existing runtime/source pixels; no new generated bitmap was needed.",
        },
        "proposals": records,
        "contactSheets": {
            "color": "runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/top10-fix-candidates-contact.png",
            "gray": "runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/top10-fix-candidates-contact-gray.png",
        },
        "runtimePreview": "runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/runtime-preview/top10-depth-band-preview.png",
    }
    (RUN / "fix-proposals.json").write_text(json.dumps(out_json, indent=2) + "\n")
    lines = [
        "Status: complete",
        "",
        "# Top 10 Weak Sprite Fix Proposals",
        "",
        f"- Session key: `{SESSION_KEY}`",
        f"- HEAD observed from preflight: `{HEAD}`",
        "- Scope: candidate assets only; no runtime/source/manifests changed.",
        "- Imagegen: skill was read; not used because every offender had a viable local source-pixel repair candidate.",
        "- Candidate contact sheets:",
        "  - `top10-fix-candidates-contact.png`",
        "  - `top10-fix-candidates-contact-gray.png`",
        "- Runtime preview: `runtime-preview/top10-depth-band-preview.png`",
        "",
    ]
    for idx, key in enumerate(TOP10, 1):
        r = records[key]
        lines += [
            f"## {idx}. `{key}`",
            "",
            f"- Current failure: {r['currentFailure']}",
            f"- Proposed fix type: `{r['fixType']}`",
            f"- Candidate asset path(s): {', '.join('`' + p + '`' for p in r['candidatePaths'])}",
            f"- Source/edit target: {r['source']}",
            "- Prompt used if generated: none; repaired from existing runtime/source pixels.",
            f"- Post-processing command: `{r['postProcessingCommand']}`",
            f"- Alpha validation: PNG exists, dimensions {r['candidateMetrics']['width']}x{r['candidateMetrics']['height']}, transparent dirty RGB pixels {r['candidateMetrics'].get('transparentDirtyRgbPixels', 0)}, white-matte ratio {r['candidateMetrics'].get('whiteMatteRatio', 0)}.",
            f"- Expected gameplay benefit: {r['expectedBenefit']}",
            f"- Risk/caveat: {r['risk']}",
            f"- Recommendation: `{r['recommendation']}`",
            "",
        ]
    lines += [
        "## Verification",
        "",
        "- `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`",
        "- `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/validate_top10_fix_proposals.py`",
        "- `python3 -m json.tool runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/fix-proposals.json >/dev/null`",
        "",
        "## Alex Review Queue",
        "",
        "- `biolume-rock-0` and `biolume-rock-1`: confirm single-nodule crop intent.",
        "- `fauna-abyss-black-swallower`, `fauna-abyss-frilled-shark`, `fauna-abyss-snipe-eel`, `fauna-deep-sea-spider`: confirm readability-vs-species-shape tradeoff.",
    ]
    (RUN / "fix-proposals.md").write_text("\n".join(lines) + "\n")


def main():
    audit = load_audit()
    records = create_candidates(audit)
    make_contact(audit, RUN / "top10-fix-candidates-contact.png", gray=False)
    make_contact(audit, RUN / "top10-fix-candidates-contact-gray.png", gray=True)
    make_runtime_preview(audit)
    write_reports(records)


if __name__ == "__main__":
    main()
