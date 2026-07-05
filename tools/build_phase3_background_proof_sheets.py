#!/usr/bin/env python3
"""Build Phase 3 painterly background proof sheets from runtime captures."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
RUNS = Path("/home/orlovboros/projects/manager/runs")
PREFIX = os.environ.get("BACKGROUND_PROOF_PREFIX", "water9-gpt-painterly-background-phase3")
PHASE_LABEL = os.environ.get("BACKGROUND_PROOF_PHASE_LABEL", "Phase 3")
LANDMARK_PHASE = os.environ.get("BACKGROUND_PROOF_LANDMARK_PHASE", "phase9")
LANDMARK_PREFIX = f"{LANDMARK_PHASE}-transition-"
LANDMARK_LABEL = LANDMARK_PHASE.replace("phase", "Phase ", 1)
REVIEW_JSON = Path(os.environ.get(
    "BACKGROUND_PROOF_REVIEW_JSON",
    str(RUNS / f"{PREFIX}-final-review-2026-07-02.json"),
))
MANIFEST = ROOT / "public/assets/generated/background-phase3/background-phase3.manifest.json"
ORE_OVERLAY_JSON = Path(os.environ.get(
    "BACKGROUND_PROOF_ORE_OVERLAY_JSON",
    str(RUNS / f"{PREFIX}-ore-overlay-runtime-2026-07-02.json"),
))

OUT = {
    "color": RUNS / f"{PREFIX}-color-descent-contact-sheet-2026-07-02.png",
    "gray": RUNS / f"{PREFIX}-grayscale-descent-contact-sheet-2026-07-02.png",
    "lamp": RUNS / f"{PREFIX}-lamp-overlay-sheet-2026-07-02.png",
    "repeat": RUNS / f"{PREFIX}-crop-repeat-sheet-2026-07-02.png",
    "overlay": RUNS / f"{PREFIX}-ore-player-terrain-overlay-proof-2026-07-02.png",
    "parallax": RUNS / f"{PREFIX}-parallax-depth-separation-2026-07-02.png",
    "swimby": RUNS / f"{PREFIX}-horizontal-swimby-strip-2026-07-02.png",
    "assets": RUNS / f"{PREFIX}-source-assets-contact-sheet-2026-07-02.png",
    "ledger": RUNS / f"{PREFIX}-landmark-visibility-ledger-2026-07-02.json",
    "summary": RUNS / f"{PREFIX}-proof-artifacts-2026-07-02.json",
}

BANDS = ["surface", "upper", "mid", "lower", "transition-deep"]
BG = (9, 14, 18)
PANEL = (18, 28, 34)
TEXT = (229, 238, 232)
MUTED = (142, 166, 172)
ACCENT = (96, 212, 216)
WARN = (255, 207, 92)


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


F_TITLE = font(28, True)
F_HEAD = font(18, True)
F_BODY = font(14)
F_SMALL = font(12)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, fill=TEXT, fnt=F_BODY) -> None:
    draw.text(xy, value, fill=fill, font=fnt)


def fit(image: Image.Image, size: tuple[int, int], fill=(0, 0, 0)) -> Image.Image:
    image = image.convert("RGB")
    fitted = ImageOps.contain(image, size)
    canvas = Image.new("RGB", size, fill)
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return canvas


def crop_fit(image: Image.Image, box: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    return fit(image.crop(box), size)


def paste_panel(sheet: Image.Image, xy: tuple[int, int], image: Image.Image, label: str, note: str = "") -> None:
    draw = ImageDraw.Draw(sheet)
    x, y = xy
    w, h = image.size
    draw.rounded_rectangle((x - 8, y - 42, x + w + 8, y + h + 34), radius=6, fill=PANEL, outline=(40, 64, 72))
    text(draw, (x, y - 35), label, ACCENT, F_HEAD)
    if note:
        text(draw, (x, y + h + 10), note, MUTED, F_SMALL)
    sheet.paste(image, xy)


def sheet_header(sheet: Image.Image, title: str, subtitle: str) -> None:
    draw = ImageDraw.Draw(sheet)
    text(draw, (34, 22), title, TEXT, F_TITLE)
    text(draw, (34, 58), subtitle, MUTED, F_BODY)


def descent_sheet(captures: list[dict], grayscale: bool) -> Image.Image:
    thumbs = []
    for capture in captures:
        path = Path(capture["grayscalePath" if grayscale else "colorPath"])
        thumbs.append((capture["label"], fit(Image.open(path), (384, 240))))
    sheet = Image.new("RGB", (2040, 360), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Grayscale Descent" if grayscale else f"{PHASE_LABEL} Color Descent",
        "Runtime screenshots at five authored descent bands, captured through the playtest background review.",
    )
    x = 34
    for label, thumb in thumbs:
        paste_panel(sheet, (x, 108), thumb, label)
        x += 398
    return sheet


def lamp_sheet(captures: list[dict]) -> Image.Image:
    sheet = Image.new("RGB", (1710, 900), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Lamp Overlay",
        "Center crops show the live lamp volume, haze/particles/background dimming, player silhouette, and terrain edge read.",
    )
    crops = []
    for capture in captures:
        image = Image.open(capture["colorPath"]).convert("RGB")
        crop = image.crop((380, 230, 1040, 590))
        crops.append((capture["label"], fit(crop, (320, 175))))
    x = 34
    for label, crop in crops:
        paste_panel(sheet, (x, 112), crop, label)
        x += 334

    comparison = []
    for label in ["upper", "mid", "transition-deep"]:
        capture = next(item for item in captures if item["label"] == label)
        image = Image.open(capture["colorPath"]).convert("RGB")
        center = image.crop((500, 250, 850, 550))
        boosted = ImageEnhance.Brightness(ImageEnhance.Contrast(center).enhance(1.55)).enhance(1.35)
        comparison.append((f"{label} boosted inspection", fit(boosted, (510, 300))))
    x = 34
    for label, crop in comparison:
        paste_panel(sheet, (x, 510), crop, label, "Brightness/contrast boosted only for visual inspection.")
        x += 540
    return sheet


def repeat_sheet(captures: list[dict], manifest: dict) -> Image.Image:
    sheet = Image.new("RGB", (1830, 1320), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Crop/Repeat",
        "Left: source band plate duplicated vertically as an inspection stress case. Right: runtime crop; scenic repeatY is disabled.",
    )
    band_assets = {asset["id"]: asset for asset in manifest["assets"] if asset["role"] == "bandPlate"}
    draw = ImageDraw.Draw(sheet)
    y = 108
    for label in BANDS:
        asset_id = "transitionDeep" if label == "transition-deep" else label
        asset = band_assets[asset_id]
        source = Image.open(ROOT / asset["path"]).convert("RGB")
        stack = Image.new("RGB", (320, 300), (0, 0, 0))
        tile = fit(source, (320, 100))
        for i in range(3):
            stack.paste(tile, (0, i * 100))
        runtime = Image.open(next(item for item in captures if item["label"] == label)["colorPath"]).convert("RGB")
        runtime_crop = crop_fit(runtime, (220, 180, 1120, 660), (520, 300))
        draw.rounded_rectangle((24, y - 30, 1806, y + 322), radius=6, fill=PANEL, outline=(40, 64, 72))
        text(draw, (42, y - 22), label, ACCENT, F_HEAD)
        text(draw, (390, y - 22), f"repeatMode={asset['repeatMode']}  status={asset['status']}  scenic repeatY expected=false", MUTED, F_SMALL)
        sheet.paste(stack, (42, y + 8))
        sheet.paste(fit(source, (520, 300)), (392, y + 8))
        sheet.paste(runtime_crop, (940, y + 8))
        text(draw, (42, y + 312), "forced duplicate stack", WARN, F_SMALL)
        text(draw, (392, y + 312), "source-derived band plate", MUTED, F_SMALL)
        text(draw, (940, y + 312), "runtime crop", MUTED, F_SMALL)
        y += 238
    return sheet


def overlay_sheet(captures: list[dict]) -> Image.Image:
    sheet = Image.new("RGB", (1770, 950), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Ore/Player/Terrain Overlay",
        f"Runtime captures stage player, HUD, side terrain, floor terrain, and review ore pockets over the {PHASE_LABEL} background.",
    )
    ore_capture = None
    if ORE_OVERLAY_JSON.exists():
        ore_report = load_json(ORE_OVERLAY_JSON)
        if ore_report.get("captures"):
            ore_capture = ore_report["captures"][0]
    if ore_capture is None:
        ore_capture = next((item for item in captures if item["label"] == "lower"), captures[0])
    regions = [
        ("ore/player/terrain runtime", ore_capture, "colorPath", (0, 0, 1280, 800), (520, 325)),
        ("ore/player/terrain grayscale", ore_capture, "grayscalePath", (0, 0, 1280, 800), (520, 325)),
        ("mid player/lamp crop", "mid", "colorPath", (360, 220, 1040, 610), (520, 325)),
        ("transition-deep grayscale", "transition-deep", "grayscalePath", (0, 0, 1280, 800), (520, 325)),
        ("surface UI + terrain", "surface", "colorPath", (0, 0, 1280, 800), (520, 325)),
        ("mid boosted lamp inspection", "mid", "colorPath", (0, 250, 1280, 650), (520, 325)),
    ]
    x0, y0 = 34, 120
    for index, (title, label_or_capture, key, box, size) in enumerate(regions):
        if isinstance(label_or_capture, dict):
            image_path = label_or_capture[key]
        else:
            capture = next(item for item in captures if item["label"] == label_or_capture)
            image_path = capture[key]
        image = Image.open(image_path).convert("RGB")
        if "boosted" in title:
            image = ImageEnhance.Brightness(ImageEnhance.Contrast(image).enhance(1.7)).enhance(1.45)
        panel = crop_fit(image, box, size)
        x = x0 + (index % 3) * 570
        y = y0 + (index // 3) * 390
        paste_panel(sheet, (x, y), panel, title)
    return sheet


def parallax_sheet(review: dict) -> Image.Image:
    captures = review.get("parallaxCaptures") or []
    sheet = Image.new("RGB", (1660, 760), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Transition-Deep Parallax",
        "Left/center/right runtime scroll captures at the same depth. Metadata lists visible Phase 7 far/mid/near plane parallax factors.",
    )
    draw = ImageDraw.Draw(sheet)
    if not captures:
        text(draw, (34, 124), "No parallax captures were present in the review JSON.", WARN, F_HEAD)
        return sheet
    x = 34
    for capture in captures:
        image = Image.open(capture["colorPath"]).convert("RGB")
        crop = crop_fit(image, (180, 160, 1140, 690), (500, 300))
        phase7 = capture.get("phase7Anchors") or []
        factors = sorted({
            f"{anchor.get('assetId')}:{anchor.get('parallaxFactor')}"
            for anchor in phase7
            if anchor.get("assetId")
        })
        note = f"x={capture.get('reviewX')}  phase7 anchors={len(phase7)}"
        paste_panel(sheet, (x, 120), crop, capture["label"].replace("transition-deep-parallax-", ""), note)
        y = 452
        text(draw, (x, y), "visible plane factors", ACCENT, F_HEAD)
        for factor in factors[:8]:
            text(draw, (x, y + 26), factor, MUTED, F_SMALL)
            y += 20
        x += 536
    return sheet


def swimby_sheet(review: dict) -> Image.Image:
    captures = review.get("swimByCaptures") or []
    sheet = Image.new("RGB", (2050, 670), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Transition-Deep Swim-By",
        f"Seven horizontal runtime frames at fixed transition-deep depth; {LANDMARK_LABEL} landmarks should enter, pass the player, and exit.",
    )
    draw = ImageDraw.Draw(sheet)
    if not captures:
        text(draw, (34, 124), "No swim-by captures were present in the review JSON.", WARN, F_HEAD)
        return sheet
    x = 34
    for capture in captures[:7]:
        image = Image.open(capture["colorPath"]).convert("RGB")
        crop = crop_fit(image, (250, 155, 1090, 690), (270, 172))
        target_landmarks = capture.get("targetLandmarkAnchors") or capture.get("phase9LandmarkAnchors") or capture.get("phase8LandmarkAnchors") or []
        labels = sorted({anchor.get("assetId", "") for anchor in target_landmarks if anchor.get("assetId")})
        note = f"x={capture.get('reviewX')}  {LANDMARK_LABEL.replace(' ', '')}={len(target_landmarks)}"
        paste_panel(sheet, (x, 120), crop, capture["label"].replace("transition-deep-swimby-", ""), note)
        y = 330
        for label in labels[:7]:
            text(draw, (x, y), label.replace(LANDMARK_PREFIX, f"{LANDMARK_PHASE.replace('phase', 'p')}-"), MUTED, F_SMALL)
            y += 18
        x += 288
    return sheet


def phase_bucket(asset_id: str | None) -> str:
    if not asset_id:
        return "proceduralFallback"
    if asset_id.startswith("phase8-transition-"):
        return "phase8Landmarks"
    if asset_id.startswith("phase9-transition-"):
        return "phase9Landmarks"
    if asset_id.startswith("phase7-transition-"):
        return "phase7Atmosphere"
    if asset_id.startswith("phase5-"):
        return "phase5"
    return "phase3"


def visibility_ledger(review: dict, manifest: dict) -> dict:
    buckets = {
        "phase3": {},
        "phase5": {},
        "phase7Atmosphere": {},
        "phase8Landmarks": {},
        "phase9Landmarks": {},
        "proceduralFallback": {},
    }
    frames = []
    for collection_name in ["captures", "parallaxCaptures", "swimByCaptures"]:
        for capture in review.get(collection_name) or []:
            items = (((capture.get("review") or {}).get("anchors") or {}).get("items") or [])
            frame = {
                "collection": collection_name,
                "label": capture.get("label"),
                "reviewX": capture.get("reviewX"),
                "visibleAnchors": len(items),
                "phaseCounts": {key: 0 for key in buckets},
                "visiblePhase8AssetIds": [],
                "visiblePhase9AssetIds": [],
                "visibleTargetLandmarkAssetIds": [],
            }
            for anchor in items:
                asset_id = anchor.get("assetId")
                bucket = phase_bucket(asset_id)
                frame["phaseCounts"][bucket] += 1
                key = asset_id or anchor.get("id") or "procedural"
                buckets[bucket][key] = buckets[bucket].get(key, 0) + 1
                if bucket == "phase8Landmarks" and asset_id not in frame["visiblePhase8AssetIds"]:
                    frame["visiblePhase8AssetIds"].append(asset_id)
                if bucket == "phase9Landmarks" and asset_id not in frame["visiblePhase9AssetIds"]:
                    frame["visiblePhase9AssetIds"].append(asset_id)
                if isinstance(asset_id, str) and asset_id.startswith(LANDMARK_PREFIX) and asset_id not in frame["visibleTargetLandmarkAssetIds"]:
                    frame["visibleTargetLandmarkAssetIds"].append(asset_id)
            frames.append(frame)
    return {
        "schema": "water9/background-phase9-organic-landmark-visibility-ledger@1",
        "reviewJson": str(REVIEW_JSON),
        "manifest": str(MANIFEST),
        "landmarkPhase": LANDMARK_PHASE,
        "phase8ManifestAssets": [
            asset["id"] for asset in manifest["assets"]
            if asset.get("role") == "landmark" and str(asset.get("id", "")).startswith("phase8-transition-")
        ],
        "phase9ManifestAssets": [
            asset["id"] for asset in manifest["assets"]
            if asset.get("role") == "landmark" and str(asset.get("id", "")).startswith("phase9-transition-")
        ],
        "countsByPhaseAndAssetId": buckets,
        "frames": frames,
        "swimByFramesWithPhase8": sum(1 for frame in frames if frame["collection"] == "swimByCaptures" and frame["phaseCounts"]["phase8Landmarks"] > 0),
        "swimByFramesWithPhase9": sum(1 for frame in frames if frame["collection"] == "swimByCaptures" and frame["phaseCounts"]["phase9Landmarks"] > 0),
        "swimByFramesWithTargetLandmarks": sum(1 for frame in frames if frame["collection"] == "swimByCaptures" and frame["visibleTargetLandmarkAssetIds"]),
    }


def assets_sheet(manifest: dict) -> Image.Image:
    ready = [asset for asset in manifest["assets"] if asset["status"] == "ready"]
    columns = 5
    rows = max(1, (len(ready) + columns - 1) // columns)
    sheet = Image.new("RGB", (1840, 150 + rows * 245), BG)
    sheet_header(
        sheet,
        f"{PHASE_LABEL} Generated Source Assets",
        "Ready source-derived runtime PNGs. Bands are atlas slices; landmarks are chroma-keyed generated cutouts.",
    )
    x, y = 34, 120
    for asset in ready:
        image = Image.open(ROOT / asset["path"]).convert("RGBA")
        checker = Image.new("RGB", image.size, (28, 38, 42))
        for cy in range(0, image.height, 24):
            for cx in range(0, image.width, 24):
                if (cx // 24 + cy // 24) % 2:
                    ImageDraw.Draw(checker).rectangle((cx, cy, cx + 23, cy + 23), fill=(38, 50, 54))
        checker.paste(image.convert("RGB"), mask=image.getchannel("A") if image.mode == "RGBA" else None)
        panel = fit(checker, (330, 170))
        paste_panel(sheet, (x, y), panel, asset["id"], f"{asset['role']} / {asset['repeatMode']}")
        x += 360
        if x + 340 > sheet.width:
            x = 34
            y += 245
    return sheet


def summarize(captures: Iterable[dict], manifest: dict) -> dict:
    assets = manifest["assets"]
    return {
        "schema": "water9/background-phase3-proof-artifacts@1",
        "reviewJson": str(REVIEW_JSON),
        "manifest": str(MANIFEST),
        "artifacts": {key: str(path) for key, path in OUT.items() if key != "summary"},
        "readyAssets": {
            "bandPlates": [asset["id"] for asset in assets if asset["role"] == "bandPlate" and asset["status"] == "ready"],
            "landmarks": [asset["id"] for asset in assets if asset["role"] == "landmark" and asset["status"] == "ready"],
            "textureMasks": [asset["id"] for asset in assets if asset["role"] == "textureMask" and asset["status"] == "ready"],
        },
        "expectedButMissingRuntimeAssets": [
            {"id": asset["id"], "role": asset["role"], "path": asset["path"], "status": asset["status"]}
            for asset in assets
            if asset["status"] != "ready"
        ],
        "scenicRepeatYViolation": any(capture.get("scenicRepeatYViolation") for capture in captures),
        "repeatModes": [capture.get("repeatModes") for capture in captures],
    }


def main() -> int:
    review = load_json(REVIEW_JSON)
    manifest = load_json(MANIFEST)
    captures = review["captures"]
    OUT["color"].parent.mkdir(parents=True, exist_ok=True)
    descent_sheet(captures, False).save(OUT["color"])
    descent_sheet(captures, True).save(OUT["gray"])
    lamp_sheet(captures).save(OUT["lamp"])
    repeat_sheet(captures, manifest).save(OUT["repeat"])
    overlay_sheet(captures).save(OUT["overlay"])
    parallax_sheet(review).save(OUT["parallax"])
    swimby_sheet(review).save(OUT["swimby"])
    assets_sheet(manifest).save(OUT["assets"])
    OUT["ledger"].write_text(json.dumps(visibility_ledger(review, manifest), indent=2) + "\n", encoding="utf-8")
    OUT["summary"].write_text(json.dumps(summarize(captures, manifest), indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: str(path) for key, path in OUT.items()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
