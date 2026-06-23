#!/usr/bin/env python3
"""Audit articulated creature part sprites for obvious visual-cohesion problems."""

from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
DEFAULT_MANIFEST = GENERATED / "articulated-creatures.parts.json"
DEFAULT_REPORT = ROOT / "tools/scratch/articulated-visual-cohesion.json"
ALPHA_THRESHOLD = 12


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-dir", type=Path, default=GENERATED)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--strict", action="store_true", help="Exit non-zero if any audited creature has hard failures.")
    return parser.parse_args()


def rgba_distance(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.sqrt(sum((a[index] - b[index]) ** 2 for index in range(3)))


def is_near_color(pixel: tuple[int, int, int, int], color: tuple[int, int, int], tolerance: int) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= ALPHA_THRESHOLD:
        return False
    return max(abs(red - color[0]), abs(green - color[1]), abs(blue - color[2])) <= tolerance


def alpha_bbox(alpha_pixels: list[tuple[int, int]], width: int, height: int) -> tuple[int, int, int, int] | None:
    if not alpha_pixels:
        return None
    xs = [point[0] for point in alpha_pixels]
    ys = [point[1] for point in alpha_pixels]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def edge_pixels_for_bbox(
    image: Image.Image,
    bbox: tuple[int, int, int, int],
    inset: int = 1,
) -> list[tuple[int, int, int, int]]:
    left, top, right, bottom = bbox
    pixels = image.load()
    edge: list[tuple[int, int, int, int]] = []
    for y in range(top, bottom):
      for x in range(left, right):
        if x - left <= inset or right - 1 - x <= inset or y - top <= inset or bottom - 1 - y <= inset:
          edge.append(pixels[x, y])
    return edge


def part_metrics(path: Path) -> dict[str, Any]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    alpha_pixels: list[tuple[int, int]] = []
    colors: list[tuple[int, int, int]] = []
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > ALPHA_THRESHOLD:
                alpha_pixels.append((x, y))
                colors.append((red, green, blue))
    bbox = alpha_bbox(alpha_pixels, width, height)
    visible_pixels = len(alpha_pixels)
    image_area = max(1, width * height)
    result: dict[str, Any] = {
        "path": str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path),
        "size": [width, height],
        "visiblePixels": visible_pixels,
        "visibleRatioImage": round(visible_pixels / image_area, 4),
        "bbox": list(bbox) if bbox else None,
        "visibleRatioBBox": 0,
        "touchingEdges": [],
        "meanRgb": None,
        "edgeWhiteRatio": 0,
        "edgeMagentaRatio": 0,
        "edgeBrightRatio": 0,
    }
    if not bbox or not colors:
        return result

    left, top, right, bottom = bbox
    bbox_area = max(1, (right - left) * (bottom - top))
    touching_edges = []
    if left <= 0:
        touching_edges.append("left")
    if top <= 0:
        touching_edges.append("top")
    if right >= width:
        touching_edges.append("right")
    if bottom >= height:
        touching_edges.append("bottom")
    edge_pixels = edge_pixels_for_bbox(image, bbox)
    visible_edge_pixels = [pixel for pixel in edge_pixels if pixel[3] > ALPHA_THRESHOLD]
    result.update({
        "visibleRatioBBox": round(visible_pixels / bbox_area, 4),
        "bboxSize": [right - left, bottom - top],
        "touchingEdges": touching_edges,
        "meanRgb": [
            round(mean(color[index] for color in colors), 2)
            for index in range(3)
        ],
    })
    if visible_edge_pixels:
        bright_edge = [
            pixel for pixel in visible_edge_pixels
            if pixel[0] >= 232 and pixel[1] >= 232 and pixel[2] >= 232
        ]
        result["edgeWhiteRatio"] = round(
            sum(1 for pixel in visible_edge_pixels if is_near_color(pixel, (255, 255, 255), 34)) / len(visible_edge_pixels),
            4,
        )
        result["edgeMagentaRatio"] = round(
            sum(1 for pixel in visible_edge_pixels if is_near_color(pixel, (255, 0, 255), 34)) / len(visible_edge_pixels),
            4,
        )
        result["edgeBrightRatio"] = round(len(bright_edge) / len(visible_edge_pixels), 4)
    return result


def texture_names_for(creature: dict[str, Any]) -> list[tuple[str, str, str]]:
    names: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for part in creature.get("parts", []):
        for key in ("texture", "damagedTexture", "detachedTexture"):
            texture = part.get(key)
            if texture and texture not in seen:
                seen.add(texture)
                names.append((part.get("id", "unknown"), key, texture))
    return names


def audit_creature(creature: dict[str, Any], asset_dir: Path) -> dict[str, Any]:
    failures: list[str] = []
    warnings: list[str] = []
    quality_status = creature.get("quality", {}).get("status")
    production_accepted = quality_status == "accepted"
    textures = texture_names_for(creature)
    part_reports = []
    mean_colors: list[tuple[float, float, float]] = []
    texture_hashes: dict[str, list[str]] = defaultdict(list)

    for part_id, role, texture in textures:
        path = asset_dir / texture
        if not path.exists():
            failures.append(f"{part_id}.{role}: texture missing: {texture}")
            continue
        try:
            metrics = part_metrics(path)
        except Exception as error:  # noqa: BLE001 - report all asset read failures as review failures.
            failures.append(f"{part_id}.{role}: could not inspect {texture}: {error}")
            continue
        metrics.update({"partId": part_id, "role": role, "texture": texture})
        part_reports.append(metrics)
        if metrics["visiblePixels"] < 64:
            failures.append(f"{part_id}.{role}: texture appears blank or nearly blank")
        if metrics["visibleRatioImage"] < 0.012:
            failures.append(f"{part_id}.{role}: excessive transparent padding around sprite")
        if metrics["visibleRatioBBox"] and metrics["visibleRatioBBox"] < 0.055:
            failures.append(f"{part_id}.{role}: visible alpha is too sparse inside its bounding box")
        if metrics["edgeWhiteRatio"] > 0.22:
            failures.append(f"{part_id}.{role}: likely white matte fringe on sprite edge")
        elif metrics["edgeWhiteRatio"] > 0.1:
            warnings.append(f"{part_id}.{role}: possible white edge matte; inspect at game scale")
        if metrics["edgeMagentaRatio"] > 0.12:
            failures.append(f"{part_id}.{role}: magenta key is still visible on sprite edge")
        elif metrics["edgeMagentaRatio"] > 0.045:
            warnings.append(f"{part_id}.{role}: possible magenta fringe; inspect chroma key")
        if metrics["meanRgb"]:
            mean_colors.append(tuple(metrics["meanRgb"]))
        texture_hashes[texture].append(part_id)

    palette_distances: list[float] = []
    for index, color in enumerate(mean_colors):
        for other in mean_colors[index + 1:]:
            palette_distances.append(rgba_distance(color, other))
    palette = {
        "partMeans": len(mean_colors),
        "medianDistance": round(median(palette_distances), 2) if palette_distances else 0,
        "maxDistance": round(max(palette_distances), 2) if palette_distances else 0,
    }
    if palette["partMeans"] >= 4 and palette["medianDistance"] > 82:
        failures.append("core parts have high median palette drift; likely collage or inconsistent source extraction")
    if palette["partMeans"] >= 4 and palette["maxDistance"] > 185:
        failures.append("at least one part has extreme palette drift from the rest of the creature")

    dimensions = [metrics.get("bboxSize") for metrics in part_reports if metrics.get("bboxSize")]
    heights = [size[1] for size in dimensions if size and size[1] > 0]
    if len(heights) >= 4:
        avg_height = mean(heights)
        spread = math.sqrt(mean((height - avg_height) ** 2 for height in heights)) / max(1, avg_height)
        if spread > 0.85:
            failures.append("part bounding boxes have large scale spread; likely inconsistent extraction scale")

    return {
        "id": creature.get("id"),
        "species": creature.get("species"),
        "qualityStatus": quality_status,
        "productionStatus": "accepted" if production_accepted else "requires-human-review",
        "productionAccepted": production_accepted,
        "automatedCheckScope": "mechanical sprite hygiene only; not a production art-direction approval",
        "textures": len(textures),
        "partsChecked": len(part_reports),
        "status": "fail" if failures else "pass",
        "failures": failures,
        "warnings": warnings,
        "metrics": {
            "palette": palette,
            "partReports": part_reports,
        },
    }


def main() -> int:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text())
    creatures = manifest.get("creatures", [])
    reports = [audit_creature(creature, args.asset_dir) for creature in creatures]
    report = {
        "schema": "water9/articulated-visual-cohesion@1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifest": str(args.manifest),
        "assetDir": str(args.asset_dir),
        "creatureCount": len(reports),
        "failedCount": sum(1 for item in reports if item["status"] == "fail"),
        "warningCount": sum(len(item["warnings"]) for item in reports),
        "productionAcceptedCount": sum(1 for item in reports if item["productionAccepted"]),
        "humanReviewRequiredCount": sum(1 for item in reports if not item["productionAccepted"]),
        "automatedCheckScope": "mechanical sprite hygiene only; production cohesion still requires explicit human acceptance evidence",
        "creatures": reports,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "schema": report["schema"],
        "report": str(args.report),
        "creatureCount": report["creatureCount"],
        "failedCount": report["failedCount"],
        "warningCount": report["warningCount"],
        "productionAcceptedCount": report["productionAcceptedCount"],
        "humanReviewRequiredCount": report["humanReviewRequiredCount"],
    }, indent=2))
    return 1 if args.strict and report["failedCount"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
