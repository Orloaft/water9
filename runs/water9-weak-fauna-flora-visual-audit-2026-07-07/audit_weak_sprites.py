#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from pathlib import Path
from statistics import mean

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "runs/water9-weak-fauna-flora-visual-audit-2026-07-07"
MANIFEST = REPO / "public/assets/generated/small-life.manifest.json"
CLEANUP = REPO / "runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/procedural-quality-inventory.json"


def load_font(size: int) -> ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ):
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


FONT = load_font(13)
FONT_SMALL = load_font(10)


def rel(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return str(path.relative_to(REPO))
    except ValueError:
        return str(path)


def rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def frames_for(candidate: dict) -> list[Image.Image]:
    asset = candidate.get("asset", {})
    image_path = REPO / asset["imagePath"]
    sheet = rgba(image_path)
    manifest_path = asset.get("framesManifest")
    if not manifest_path:
        return [sheet]
    manifest = json.loads((REPO / manifest_path).read_text())
    fw = int(manifest["frameWidth"])
    fh = int(manifest["frameHeight"])
    count = int(manifest["frameCount"])
    cols = max(1, sheet.width // fw)
    frames = []
    for index in range(count):
        x = (index % cols) * fw
        y = (index // cols) * fh
        frames.append(sheet.crop((x, y, x + fw, y + fh)))
    return frames


def edge_mask(alpha: np.ndarray) -> np.ndarray:
    opaque = alpha > 12
    neighbor_empty = np.zeros_like(opaque)
    neighbor_empty[:-1, :] |= ~opaque[1:, :]
    neighbor_empty[1:, :] |= ~opaque[:-1, :]
    neighbor_empty[:, :-1] |= ~opaque[:, 1:]
    neighbor_empty[:, 1:] |= ~opaque[:, :-1]
    return opaque & neighbor_empty


def laplacian_variance(gray: np.ndarray, mask: np.ndarray) -> float:
    if mask.sum() < 16:
        return 0.0
    g = gray.astype(np.float32)
    lap = (
        -4 * g[1:-1, 1:-1]
        + g[:-2, 1:-1]
        + g[2:, 1:-1]
        + g[1:-1, :-2]
        + g[1:-1, 2:]
    )
    inner = mask[1:-1, 1:-1]
    if inner.sum() < 16:
        return 0.0
    return float(np.var(lap[inner]))


def analyze_frame(frame: Image.Image) -> dict:
    arr = np.array(frame)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    h, w = alpha.shape
    visible = alpha > 12
    strong = alpha > 180
    semi = (alpha > 0) & (alpha < 220)
    if not visible.any():
        return {
            "width": w,
            "height": h,
            "visiblePixels": 0,
            "alphaCoverage": 0,
            "bbox": None,
            "edgeMarginMin": 0,
            "whiteFringeRatio": 0,
            "transparentWhiteRgbRatio": 0,
            "rectMatteScore": 1,
            "grayContrast": 0,
            "medianLuma": 0,
            "laplacianVariance": 0,
        }
    ys, xs = np.where(visible)
    left, right = int(xs.min()), int(xs.max())
    top, bottom = int(ys.min()), int(ys.max())
    bbox_area = max(1, (right - left + 1) * (bottom - top + 1))
    luma = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    low_sat = (maxc - minc) < 28
    edges = edge_mask(alpha)
    edge_pixels = max(1, int(edges.sum()))
    white_edges = edges & (luma > 218) & low_sat
    transparent_white = (alpha < 6) & (luma > 218) & low_sat
    semi_light = semi & (luma > 218) & low_sat
    border = np.zeros_like(visible)
    border[:2, :] = True
    border[-2:, :] = True
    border[:, :2] = True
    border[:, -2:] = True
    corner = np.zeros_like(visible)
    corner[: max(2, h // 10), : max(2, w // 10)] = True
    corner[: max(2, h // 10), -max(2, w // 10) :] = True
    corner[-max(2, h // 10) :, : max(2, w // 10)] = True
    corner[-max(2, h // 10) :, -max(2, w // 10) :] = True
    border_opaque = float((border & (alpha > 180)).sum() / max(1, border.sum()))
    corner_opaque = float((corner & (alpha > 180)).sum() / max(1, corner.sum()))
    coverage = float(visible.sum() / max(1, w * h))
    rect_matte_score = max(border_opaque, corner_opaque)
    crop_margin = min(left, top, w - 1 - right, h - 1 - bottom)
    luma_visible = luma[visible]
    contrast = float(np.percentile(luma_visible, 90) - np.percentile(luma_visible, 10))
    median_luma = float(np.median(luma_visible))
    return {
        "width": w,
        "height": h,
        "visiblePixels": int(visible.sum()),
        "strongAlphaPixels": int(strong.sum()),
        "alphaCoverage": coverage,
        "bboxCoverage": float(visible.sum() / bbox_area),
        "bbox": {"left": left, "top": top, "right": right, "bottom": bottom},
        "edgeMarginMin": crop_margin,
        "whiteFringeRatio": float(white_edges.sum() / edge_pixels),
        "semiLightRatio": float(semi_light.sum() / max(1, int(semi.sum()))),
        "transparentWhiteRgbRatio": float(transparent_white.sum() / max(1, (alpha < 6).sum())),
        "rectMatteScore": rect_matte_score,
        "borderOpaqueRatio": border_opaque,
        "cornerOpaqueRatio": corner_opaque,
        "grayContrast": contrast,
        "medianLuma": median_luma,
        "laplacianVariance": laplacian_variance(luma, visible),
    }


def aggregate_metrics(frames: list[Image.Image]) -> dict:
    metrics = [analyze_frame(frame) for frame in frames]
    return {
        "frameCount": len(metrics),
        "dimensions": {"width": frames[0].width, "height": frames[0].height},
        "maxWhiteFringeRatio": max(m["whiteFringeRatio"] for m in metrics),
        "maxSemiLightRatio": max(m.get("semiLightRatio", 0) for m in metrics),
        "maxTransparentWhiteRgbRatio": max(m["transparentWhiteRgbRatio"] for m in metrics),
        "maxRectMatteScore": max(m["rectMatteScore"] for m in metrics),
        "minEdgeMarginPx": min(m["edgeMarginMin"] for m in metrics),
        "minAlphaCoverage": min(m["alphaCoverage"] for m in metrics),
        "minGrayContrast": min(m["grayContrast"] for m in metrics),
        "medianLumaMean": mean(m["medianLuma"] for m in metrics),
        "laplacianVarianceMean": mean(m["laplacianVariance"] for m in metrics),
        "frames": metrics,
    }


def failure_tags(entry: dict, metrics: dict) -> tuple[list[str], int]:
    tags: list[str] = []
    score = 0
    display_width = float(entry.get("expectedDisplayWidth") or entry.get("asset", {}).get("expectedDisplayWidth") or 0)
    kind = entry["kind"]
    if metrics["maxRectMatteScore"] > 0.36:
        tags.append("rectangular-matte")
        score += 45
    if metrics["maxWhiteFringeRatio"] > 0.2 or metrics["maxSemiLightRatio"] > 0.34:
        tags.append("white-fringe")
        score += 34
    if metrics["maxTransparentWhiteRgbRatio"] > 0.08:
        tags.append("dirty-transparent-rgb")
        score += 22
    if metrics["minEdgeMarginPx"] <= 1:
        tags.append("tight-crop")
        score += 12
    if display_width and display_width < 30:
        tags.append("tiny-at-game-scale")
        score += 18
    if metrics["minAlphaCoverage"] < 0.03:
        tags.append("thin-silhouette")
        score += 12
    if metrics["minGrayContrast"] < 34 and metrics["medianLumaMean"] < 95:
        tags.append("muddy-grayscale")
        score += 20
    if metrics["laplacianVarianceMean"] < 18 and metrics["minAlphaCoverage"] > 0.06:
        tags.append("soft-upscaled-read")
        score += 9
    if kind == "flora" and str(entry["assetKey"]).startswith(("flora-", "biolume-")):
        tags.append("legacy-sheet-slice")
        score += 6
    return tags, score


def severity(score: int, tags: list[str]) -> str:
    if "rectangular-matte" in tags or ("white-fringe" in tags and score >= 42):
        return "P0 obvious defects"
    if score >= 24:
        return "P1 weak in gameplay"
    if score >= 12:
        return "P2 polish candidates"
    return "acceptable"


def action_for(tags: list[str]) -> str:
    if "rectangular-matte" in tags or "dirty-transparent-rgb" in tags:
        return "rematte"
    if "white-fringe" in tags:
        return "rematte"
    if "tight-crop" in tags:
        return "rescale/crop"
    if "muddy-grayscale" in tags:
        return "recolor/contrast"
    if "tiny-at-game-scale" in tags or "thin-silhouette" in tags:
        return "rescale/crop"
    if "soft-upscaled-read" in tags:
        return "replace"
    return "leave for later"


def asset_species(entries: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for entry in entries:
        key = entry["assetKey"]
        item = out.setdefault(
            key,
            {
                "assetKey": key,
                "kind": entry["kind"],
                "species": [],
                "biomes": [],
                "asset": entry["asset"],
                "entries": [],
            },
        )
        item["entries"].append(entry)
        if entry.get("species") and entry["species"] not in item["species"]:
            item["species"].append(entry["species"])
        biome = entry.get("biome")
        if biome not in item["biomes"]:
            item["biomes"].append(biome)
    return out


def add_actual_runtime_flora(entries: list[dict]) -> None:
    # small-life.manifest.json is the broad runtime inventory, but current
    # scene-worldgen.ts routes most gameplay flora through terrain-edge assets.
    runtime_flora = [
        (1, "Glass Kelp", "terrain-edge-flora-glass-kelp", 14),
        (1, "Moon Sponge", "terrain-edge-flora-moon-sponge", 12),
        (1, "Sting Anemone", "terrain-edge-flora-sting-anemone", 11),
        (2, "Brine Grass", "terrain-edge-flora-brine-grass", 12),
        (2, "Vent Coral", "terrain-edge-flora-vent-coral", 13),
        (2, "Ember Bloom", "terrain-edge-flora-ember-bloom", 12),
        (3, "Black Fan", "terrain-edge-flora-black-fan", 13),
        (3, "Needle Garden", "env-flora-needle-garden", 12),
        (3, "Crown Polyp", "terrain-edge-flora-crown-polyps", 13),
        (4, "Circuit Kelp", "env-flora-circuit-kelp", 13),
        (4, "Glass Obelisk", "env-flora-glass-obelisk", 14),
        (4, "Oracle Polyp", "terrain-edge-flora-oracle-tendrils", 12),
        ("special-room", "Lumen Fern", "terrain-edge-flora-lumen-fern", 13),
    ]
    existing = {(entry.get("species"), entry.get("assetKey")) for entry in entries}
    for biome, species, asset_key, radius in runtime_flora:
        if (species, asset_key) in existing:
            continue
        image_path = f"public/assets/generated/{asset_key}.png"
        image = REPO / image_path
        if not image.exists():
            continue
        entries.append({
            "kind": "flora",
            "biome": biome,
            "species": species,
            "assetKey": asset_key,
            "displayName": species,
            "count": None,
            "radius": radius,
            "runtime": {
                "source": "src/scene-worldgen.ts:floraGameplayAssetKey/populateBiolumeRoom",
                "loader": "environmentTextureKeys/loadGeneratedAssets",
                "draw": "drawFlora",
            },
            "reviewStatus": "actual-runtime-flora-correction",
            "asset": {
                "image": f"{asset_key}.png",
                "imagePath": image_path,
                "expectedDisplayWidth": None,
                "expectedDisplayHeight": radius * 4,
                "minimumCoverage": 0.015,
                "minimumEdgeMarginPx": 2,
                "anchor": {"x": 0.5, "y": 0.82},
            },
        })


def thumbnail(entry: dict, size=(180, 120), gray=False) -> Image.Image:
    frame = frames_for(entry)[0]
    bbox = frame.getbbox()
    if bbox:
        frame = frame.crop(bbox)
    bg = Image.new("RGBA", size, (8, 20, 27, 255))
    draw = ImageDraw.Draw(bg)
    for y in range(0, size[1], 12):
        for x in range(0, size[0], 12):
            if (x // 12 + y // 12) % 2 == 0:
                draw.rectangle((x, y, x + 11, y + 11), fill=(24, 42, 50, 255))
    if frame.width and frame.height:
        scale = min((size[0] - 16) / frame.width, (size[1] - 16) / frame.height)
        scaled = frame.resize((max(1, int(frame.width * scale)), max(1, int(frame.height * scale))), Image.Resampling.LANCZOS)
        bg.alpha_composite(scaled, ((size[0] - scaled.width) // 2, (size[1] - scaled.height) // 2))
    if gray:
        return ImageOps.grayscale(bg.convert("RGB")).convert("RGBA")
    return bg


def wrap_text(text: str, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if len(trial) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word[:width]
    if current:
        lines.append(current)
    return lines[:4]


def contact_sheet(rows: list[dict], path: Path, gray=False, title="Weak sprite candidates") -> None:
    cell_w, cell_h = 250, 190
    cols = 4
    rows_n = math.ceil(len(rows) / cols)
    sheet = Image.new("RGB", (cols * cell_w, 42 + rows_n * cell_h), (12, 18, 24))
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 12), title, fill=(235, 246, 250), font=FONT)
    for i, row in enumerate(rows):
        x = (i % cols) * cell_w
        y = 42 + (i // cols) * cell_h
        draw.rectangle((x + 6, y + 6, x + cell_w - 6, y + cell_h - 6), outline=(75, 99, 111))
        thumb = thumbnail(row, gray=gray).convert("RGB")
        sheet.paste(thumb, (x + 35, y + 12))
        label = f"#{row['rank']} {row['assetKey']}"
        if gray:
            label = f"#{row['rank']} {row['assetKey']} gray"
        draw.text((x + 12, y + 136), label[:34], fill=(235, 246, 250), font=FONT_SMALL)
        species = ", ".join(row.get("species", [])) or row["assetKey"]
        draw.text((x + 12, y + 151), species[:36], fill=(184, 204, 211), font=FONT_SMALL)
        tags = ", ".join(row.get("failureTags", []))
        for j, line in enumerate(wrap_text(tags, 38)[:2]):
            draw.text((x + 12, y + 166 + j * 11), line, fill=(255, 203, 126), font=FONT_SMALL)
    if gray:
        sheet = ImageOps.grayscale(sheet).convert("RGB")
    sheet.save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    manifest_entries = list(manifest["entries"])
    add_actual_runtime_flora(manifest_entries)
    cleanup = json.loads(CLEANUP.read_text()) if CLEANUP.exists() else {}
    cleanup_rows = {row["assetKey"]: row for row in cleanup.get("rows", [])}
    previous_top = {row["assetKey"]: row for row in cleanup.get("topOffenders", [])}
    assets = asset_species(manifest_entries)
    rows = []
    for key, entry in assets.items():
        path = REPO / entry["asset"]["imagePath"]
        if not path.exists():
            metrics = {"missing": True}
            tags, score = ["missing-runtime-file"], 100
        else:
            metrics = aggregate_metrics(frames_for(entry))
            tags, score = failure_tags(entry, metrics)
        if key in previous_top:
            score += 6
            tags.append("prior-cleanup-watch")
        cleanup_row = cleanup_rows.get(key, {})
        row = {
            "assetKey": key,
            "species": entry["species"],
            "kind": entry["kind"],
            "biomes": entry["biomes"],
            "asset": entry["asset"],
            "runtimeFiles": [
                entry["asset"].get("imagePath"),
                entry["asset"].get("framesManifest"),
                *(entry["asset"].get("looseFrames") or []),
            ],
            "expectedDisplayWidth": entry["asset"].get("expectedDisplayWidth"),
            "sourceOfTruth": "public/assets/generated/small-life.manifest.json",
            "cleanupBaseline": {
                "present": bool(cleanup_row),
                "provenanceClass": cleanup_row.get("provenanceClass"),
                "riskFlags": cleanup_row.get("riskFlags", []),
                "sourceEvidence": cleanup_row.get("sourceEvidence", [])[:4],
            },
            "metrics": metrics,
            "failureTags": tags,
            "score": score,
            "priority": severity(score, tags),
            "recommendedNextAction": action_for(tags),
            "evidenceNote": "",
            "proofImages": [],
        }
        rows.append(row)
    rows.sort(key=lambda r: (-r["score"], r["assetKey"]))
    for rank, row in enumerate(rows, 1):
        row["rank"] = rank
        tags = row["failureTags"]
        if "rectangular-matte" in tags:
            note = "Alpha reaches the frame border like a background plate."
        elif "white-fringe" in tags:
            note = "Automated edge scan finds pale low-saturation halo pixels around the cutout."
        elif "tiny-at-game-scale" in tags:
            note = "Expected runtime width is very small, so silhouette details collapse in normal play."
        elif "muddy-grayscale" in tags:
            note = "Low grayscale contrast risks disappearing against the darker depth band."
        elif "tight-crop" in tags:
            note = "Visible pixels touch the crop edge, leaving little room for runtime transforms."
        elif "soft-upscaled-read" in tags:
            note = "Low high-frequency detail suggests a soft or upscaled read."
        else:
            note = "Automated scan did not find a blocking defect."
        row["evidenceNote"] = note
    audited = {
        "schema": "water9/weak-fauna-flora-sprite-review@1",
        "sessionKey": "weak-sprite-visual-audit",
        "planningHead": "971e654",
        "sourceInputs": [
            "public/assets/generated/small-life.manifest.json",
            "runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/procedural-quality-inventory.json",
            "src/content.ts",
            "src/helpers.ts",
            "src/scene-worldgen.ts",
            "src/scene-rendering.ts",
        ],
        "counts": {
            "entriesFromManifest": len(manifest["entries"]),
            "entriesAfterRuntimeFloraCorrection": len(manifest_entries),
            "uniqueAuditedAssets": len(rows),
            "fauna": sum(1 for row in rows if row["kind"] == "fauna"),
            "flora": sum(1 for row in rows if row["kind"] == "flora"),
        },
        "candidates": rows,
    }
    (OUT / "weak-sprite-review.json").write_text(json.dumps(audited, indent=2) + "\n")
    top = rows[:24]
    contact_sheet(top, OUT / "weak-sprite-top-review-contact.png", gray=False)
    contact_sheet(top, OUT / "weak-sprite-top-review-contact-gray.png", gray=True, title="Weak sprite candidates - grayscale")
    contact_sheet(rows[:60], OUT / "weak-sprite-auto-top60-contact.png", gray=False, title="Automated top 60 candidates")
    print(json.dumps({
        "ok": True,
        "uniqueAuditedAssets": len(rows),
        "fauna": audited["counts"]["fauna"],
        "flora": audited["counts"]["flora"],
        "json": rel(OUT / "weak-sprite-review.json"),
        "contact": rel(OUT / "weak-sprite-top-review-contact.png"),
        "top10": [(row["rank"], row["assetKey"], row["failureTags"], row["score"]) for row in rows[:10]],
    }, indent=2))


if __name__ == "__main__":
    main()
