#!/usr/bin/env python3
"""Validate that assembled articulated rigs still resemble their whole source art."""

from __future__ import annotations

import argparse
import copy
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops

from render_articulated_contact_sheet import (
    bounds_for_entries,
    draw_bridge,
    draw_entry,
    image_cache,
    pose_entries,
)


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
DEFAULT_RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
DEFAULT_SOURCE_DIR = GENERATED
DEFAULT_REPORT = ROOT / "tools/scratch/articulated-source-parity.json"
DEFAULT_IMAGE_DIR = ROOT / "tools/scratch/articulated-source-parity"
DEFAULT_LONG_SIDE = 420
DEFAULT_CANVAS = 512
ALPHA_THRESHOLD = 10

DEFAULT_LIMITS = {
    "min_iou": 0.58,
    "max_outside": 0.42,
    "max_missing": 0.32,
    "max_aspect_drift": 0.5,
    "max_centroid_drift": 0.18,
}

CREATURE_LIMITS = {
    "abyssal-gulper": {
        "max_aspect_drift": 0.48,
    },
    "chainmaw-eel": {
        "min_iou": 0.74,
        "max_missing": 0.22,
        "max_aspect_drift": 0.2,
    },
    "sawback-ray": {
        "min_iou": 0.7,
        "max_missing": 0.17,
        "max_aspect_drift": 0.08,
    },
    "thornhalo-urchin": {
        "min_iou": 0.76,
        "max_outside": 0.17,
        "max_aspect_drift": 0.1,
    },
    "hookjaw-isopod": {
        "min_iou": 0.8,
        "max_missing": 0.08,
        "max_aspect_drift": 0.09,
    },
    "cavitation-boxer": {
        "min_iou": 0.7,
        "max_missing": 0.12,
        "max_aspect_drift": 0.08,
    },
    "siphon-lily": {
        "min_iou": 0.68,
        "max_outside": 0.25,
        "max_missing": 0.16,
        "max_aspect_drift": 0.08,
    },
    "sand-battery": {
        "min_iou": 0.76,
        "max_outside": 0.22,
        "max_missing": 0.08,
        "max_aspect_drift": 0.12,
    },
    "trap-jaw-bristle": {
        "min_iou": 0.78,
        "max_outside": 0.22,
        "max_missing": 0.1,
        "max_aspect_drift": 0.12,
    },
    "velvet-lantern-cuttle": {
        "min_iou": 0.72,
        "max_outside": 0.18,
        "max_missing": 0.18,
        "max_aspect_drift": 0.09,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-manifest", type=Path, default=DEFAULT_RUNTIME_MANIFEST)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--asset-dir", type=Path, default=GENERATED)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--image-dir", type=Path, default=DEFAULT_IMAGE_DIR)
    parser.add_argument("--long-side", type=int, default=DEFAULT_LONG_SIDE)
    parser.add_argument("--canvas", type=int, default=DEFAULT_CANVAS)
    parser.add_argument("--render-zoom", type=float, default=3.0)
    parser.add_argument("--skip-negative-control", action="store_true")
    return parser.parse_args()


def load_source_manifests(source_dir: Path) -> dict[str, dict[str, Any]]:
    manifests: dict[str, dict[str, Any]] = {}
    for path in sorted(source_dir.glob("*.articulated.json")):
        data = json.loads(path.read_text())
        runtime_id = data.get("runtimeCreatureId")
        if runtime_id:
            manifests[runtime_id] = {**data, "_path": str(path)}
    return manifests


def transformed_source(image: Image.Image, transform: dict[str, Any] | None) -> Image.Image:
    transform = transform or {}
    result = image.convert("RGBA")
    if transform.get("flipX"):
        result = result.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if transform.get("flipY"):
        result = result.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    chroma_key = transform.get("chromaKey")
    if chroma_key:
        chroma_key = chroma_key if isinstance(chroma_key, dict) else {}
        color = chroma_key.get("color", [255, 0, 255])
        tolerance = int(chroma_key.get("tolerance", 24))
        feather = max(0, int(chroma_key.get("feather", 0)))
        if not (isinstance(color, list) and len(color) == 3):
            raise ValueError("sourceTransform.chromaKey.color must be [r, g, b]")
        key_r, key_g, key_b = (int(color[0]), int(color[1]), int(color[2]))
        pixels = result.load()
        for y in range(result.height):
            for x in range(result.width):
                red, green, blue, alpha = pixels[x, y]
                distance = max(abs(red - key_r), abs(green - key_g), abs(blue - key_b))
                if distance <= tolerance:
                    pixels[x, y] = (red, green, blue, 0)
                elif feather and distance <= tolerance + feather:
                    fade = (distance - tolerance) / feather
                    pixels[x, y] = (red, green, blue, round(alpha * fade))
    scale = transform.get("scale", 1)
    if scale != 1:
        scale = int(scale)
        if scale > 0:
            result = result.resize((result.width * scale, result.height * scale), Image.Resampling.NEAREST)
    return result


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()
    if not bbox:
        raise ValueError("image has no visible alpha")
    return bbox


def assembled_image(creature: dict[str, Any], images: dict[str, Image.Image], render_zoom: float) -> Image.Image:
    entries, bridges = pose_entries(creature, 1, 0.0, 0.0, False)
    min_x, min_y, max_x, max_y = bounds_for_entries(entries, bridges, images, render_zoom)
    padding = 24
    width = max(1, math.ceil(max_x - min_x) + padding * 2)
    height = max(1, math.ceil(max_y - min_y) + padding * 2)
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    offset = (padding - min_x, padding - min_y)
    for bridge in bridges:
        draw_bridge(canvas, bridge, offset, render_zoom)
    for entry in entries:
        draw_entry(canvas, entry, images[entry.texture], offset, render_zoom)
    return canvas


def normalized_mask(image: Image.Image, long_side: int, canvas_size: int) -> tuple[Image.Image, dict[str, float]]:
    bbox = alpha_bbox(image)
    cropped = image.crop(bbox)
    width, height = cropped.size
    scale = long_side / max(1, max(width, height))
    resized = cropped.getchannel("A").resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.BILINEAR,
    )
    mask = resized.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    canvas = Image.new("L", (canvas_size, canvas_size), 0)
    paste_x = (canvas_size - mask.width) // 2
    paste_y = (canvas_size - mask.height) // 2
    canvas.paste(mask, (paste_x, paste_y))
    return canvas, {
        "bboxWidth": width,
        "bboxHeight": height,
        "aspect": width / max(1, height),
        "normalizedWidth": mask.width,
        "normalizedHeight": mask.height,
    }


def mask_pixels(mask: Image.Image) -> set[tuple[int, int]]:
    pixels = mask.load()
    width, height = mask.size
    return {(x, y) for y in range(height) for x in range(width) if pixels[x, y] > 0}


def centroid(points: set[tuple[int, int]]) -> tuple[float, float]:
    if not points:
        return 0.0, 0.0
    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def compare_masks(assembled: Image.Image, source: Image.Image, long_side: int, canvas_size: int) -> dict[str, Any]:
    assembled_mask, assembled_info = normalized_mask(assembled, long_side, canvas_size)
    source_mask, source_info = normalized_mask(source, long_side, canvas_size)
    assembled_points = mask_pixels(assembled_mask)
    source_points = mask_pixels(source_mask)
    intersection = assembled_points & source_points
    union = assembled_points | source_points
    outside = assembled_points - source_points
    missing = source_points - assembled_points
    assembled_centroid = centroid(assembled_points)
    source_centroid = centroid(source_points)
    centroid_drift = math.hypot(
        assembled_centroid[0] - source_centroid[0],
        assembled_centroid[1] - source_centroid[1],
    ) / max(1, long_side)
    aspect_drift = abs(math.log(max(0.001, assembled_info["aspect"]) / max(0.001, source_info["aspect"])))
    return {
        "iou": round(len(intersection) / max(1, len(union)), 4),
        "outside": round(len(outside) / max(1, len(assembled_points)), 4),
        "missing": round(len(missing) / max(1, len(source_points)), 4),
        "centroidDrift": round(centroid_drift, 4),
        "aspectDrift": round(aspect_drift, 4),
        "assembled": assembled_info,
        "source": source_info,
        "assembledPixels": len(assembled_points),
        "sourcePixels": len(source_points),
    }


def debug_image(assembled: Image.Image, source: Image.Image, long_side: int, canvas_size: int) -> Image.Image:
    assembled_mask, _assembled_info = normalized_mask(assembled, long_side, canvas_size)
    source_mask, _source_info = normalized_mask(source, long_side, canvas_size)
    assembled_pixels = assembled_mask.load()
    source_pixels = source_mask.load()
    image = Image.new("RGBA", (canvas_size, canvas_size), (5, 10, 15, 255))
    pixels = image.load()
    for y in range(canvas_size):
        for x in range(canvas_size):
            assembled_on = assembled_pixels[x, y] > 0
            source_on = source_pixels[x, y] > 0
            if assembled_on and source_on:
                pixels[x, y] = (225, 238, 235, 255)
            elif assembled_on:
                pixels[x, y] = (244, 91, 118, 230)
            elif source_on:
                pixels[x, y] = (81, 203, 184, 220)
    return image


def limits_for(creature_id: str) -> dict[str, float]:
    return {**DEFAULT_LIMITS, **CREATURE_LIMITS.get(creature_id, {})}


def validate_metrics(creature_id: str, metrics: dict[str, Any]) -> list[str]:
    limits = limits_for(creature_id)
    failures = []
    if metrics["iou"] < limits["min_iou"]:
        failures.append(f"{creature_id}: assembled/source alpha IoU {metrics['iou']} below {limits['min_iou']}")
    if metrics["outside"] > limits["max_outside"]:
        failures.append(f"{creature_id}: assembled outside-source pixels {metrics['outside']} above {limits['max_outside']}")
    if metrics["missing"] > limits["max_missing"]:
        failures.append(f"{creature_id}: missing source silhouette {metrics['missing']} above {limits['max_missing']}")
    if metrics["aspectDrift"] > limits["max_aspect_drift"]:
        failures.append(f"{creature_id}: aspect drift {metrics['aspectDrift']} above {limits['max_aspect_drift']}")
    if metrics["centroidDrift"] > limits["max_centroid_drift"]:
        failures.append(f"{creature_id}: centroid drift {metrics['centroidDrift']} above {limits['max_centroid_drift']}")
    return failures


def distorted_negative_control(creature: dict[str, Any]) -> dict[str, Any]:
    distorted = copy.deepcopy(creature)
    attached_parts = [part for part in distorted.get("parts", []) if part.get("parentId")]
    for index, target in enumerate(attached_parts):
        rest = list(target.get("restOffset", [0, 0]))
        if len(rest) != 2:
            rest = [0, 0]
        direction = -1 if index % 2 else 1
        rest[0] += direction * (420 + index * 35)
        rest[1] += (-260 if index % 3 == 0 else 240)
        target["restOffset"] = rest
        motion = target.get("motion")
        if isinstance(motion, dict):
            motion["amplitude"] = max(float(motion.get("amplitude", 0)), 12)
    return distorted


def main() -> int:
    args = parse_args()
    runtime = json.loads(args.runtime_manifest.read_text())
    sources = load_source_manifests(args.source_dir)
    images = image_cache(runtime, args.asset_dir)
    failures: list[str] = []
    args.image_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "runtimeManifest": str(args.runtime_manifest),
        "longSide": args.long_side,
        "canvas": args.canvas,
        "creatures": [],
        "negativeControls": [],
    }

    for creature in runtime.get("creatures", []):
        creature_id = creature["id"]
        source_manifest = sources.get(creature_id)
        if not source_manifest:
            failures.append(f"{creature_id}: missing articulated source manifest")
            continue
        source_path = (ROOT / source_manifest["source"]).resolve()
        if not source_path.exists():
            failures.append(f"{creature_id}: missing whole source image {source_manifest['source']}")
            continue
        assembled = assembled_image(creature, images, args.render_zoom)
        source = transformed_source(Image.open(source_path), source_manifest.get("sourceTransform"))
        metrics = compare_masks(assembled, source, args.long_side, args.canvas)
        debug_path = args.image_dir / f"{creature_id}-source-parity.png"
        debug_image(assembled, source, args.long_side, args.canvas).save(debug_path)
        creature_failures = validate_metrics(creature_id, metrics)
        failures.extend(creature_failures)
        report["creatures"].append({
            "id": creature_id,
            "species": creature.get("species"),
            "source": source_manifest["source"],
            "sourceManifest": source_manifest.get("_path"),
            "limits": limits_for(creature_id),
            "metrics": metrics,
            "debugImage": str(debug_path),
            "failures": creature_failures,
        })

        if not args.skip_negative_control:
            distorted = distorted_negative_control(creature)
            distorted_assembled = assembled_image(distorted, images, args.render_zoom)
            distorted_metrics = compare_masks(distorted_assembled, source, args.long_side, args.canvas)
            distorted_failures = validate_metrics(creature_id, distorted_metrics)
            if not distorted_failures:
                failures.append(f"{creature_id}: negative control did not fail source parity")
            negative_debug_path = args.image_dir / f"{creature_id}-negative-control.png"
            debug_image(distorted_assembled, source, args.long_side, args.canvas).save(negative_debug_path)
            report["negativeControls"].append({
                "id": creature_id,
                "metrics": distorted_metrics,
                "debugImage": str(negative_debug_path),
                "failures": distorted_failures,
            })

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(f"{json.dumps(report, indent=2)}\n")
    if failures:
        for failure in failures:
            print(f"Articulated source parity failure: {failure}")
        print(f"Source parity report written to {args.report}")
        return 1
    print(f"Validated assembled source parity for {len(report['creatures'])} articulated creatures.")
    print(f"Source parity report written to {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
