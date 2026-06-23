#!/usr/bin/env python3
"""Validate source-candidate whole-source images before visual approval.

This is intentionally mechanical. It does not decide whether a creature is good
art; it catches objective source problems that would undermine chroma extraction
and later rigging.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


MAGENTA = (255, 0, 255)
VALIDATOR = {
    "tool": "tools/validate_source_candidate_images.py",
    "version": "water9/source-image-validation@1",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("public/review/source-candidates/source-candidates.json"),
    )
    parser.add_argument("--id", dest="candidate_id", default=None)
    parser.add_argument("--image", type=Path, default=None)
    parser.add_argument("--magenta-threshold", type=int, default=12)
    parser.add_argument("--min-border-magenta", type=float, default=0.95)
    parser.add_argument("--min-background-ratio", type=float, default=0.15)
    parser.add_argument("--max-background-ratio", type=float, default=0.92)
    parser.add_argument("--min-subject-size", type=int, default=48)
    parser.add_argument("--min-subject-margin", type=int, default=4)
    parser.add_argument("--max-inner-magenta-ratio", type=float, default=0.003)
    parser.add_argument("--max-subject-magenta-bias-ratio", type=float, default=0.02)
    parser.add_argument("--max-subject-translucent-ratio", type=float, default=0.01)
    parser.add_argument("--min-color-entropy", type=float, default=3.0)
    parser.add_argument("--min-color-bins", type=int, default=64)
    parser.add_argument("--min-edge-density", type=float, default=0.015)
    parser.add_argument("--min-average-local-contrast", type=float, default=1.5)
    parser.add_argument("--min-largest-component-ratio", type=float, default=0.75)
    parser.add_argument("--max-significant-components", type=int, default=6)
    parser.add_argument("--report", type=Path, default=None)
    return parser.parse_args()


def file_fingerprint(path: Path) -> dict:
    info = path.stat()
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return {
        "path": str(path),
        "size": info.st_size,
        "mtimeMs": round(info.st_mtime * 1000),
        "sha256": digest.hexdigest(),
    }


def stable_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def validation_fingerprint(metric: dict, failures: list[str], args: argparse.Namespace) -> str:
    payload = {
        "validator": {
            **VALIDATOR,
            "thresholds": {
                "magentaThreshold": args.magenta_threshold,
                "minBorderMagenta": args.min_border_magenta,
                "minBackgroundRatio": args.min_background_ratio,
                "maxBackgroundRatio": args.max_background_ratio,
                "minSubjectSize": args.min_subject_size,
                "minSubjectMargin": args.min_subject_margin,
                "maxInnerMagentaRatio": args.max_inner_magenta_ratio,
                "maxSubjectMagentaBiasRatio": args.max_subject_magenta_bias_ratio,
                "maxSubjectTranslucentRatio": args.max_subject_translucent_ratio,
                "minColorEntropy": args.min_color_entropy,
                "minColorBins": args.min_color_bins,
                "minEdgeDensity": args.min_edge_density,
                "minAverageLocalContrast": args.min_average_local_contrast,
                "minLargestComponentRatio": args.min_largest_component_ratio,
                "maxSignificantComponents": args.max_significant_components,
            },
        },
        "metric": {
            "id": metric.get("id"),
            "source": metric.get("source"),
            "sourceFingerprint": metric.get("sourceFingerprint"),
            "checked": metric.get("checked"),
            "size": metric.get("size"),
            "borderMagenta": metric.get("borderMagenta"),
            "backgroundRatio": metric.get("backgroundRatio"),
            "subjectBBox": metric.get("subjectBBox"),
            "subjectSize": metric.get("subjectSize"),
            "innerMagentaRatio": metric.get("innerMagentaRatio"),
            "subjectMagentaBiasRatio": metric.get("subjectMagentaBiasRatio"),
            "subjectTranslucentRatio": metric.get("subjectTranslucentRatio"),
            "detail": metric.get("detail"),
            "connectivity": metric.get("connectivity"),
            "failures": failures,
        },
    }
    return hashlib.sha256(stable_json(payload).encode("utf-8")).hexdigest()


def is_magenta(pixel: tuple[int, int, int, int], threshold: int) -> bool:
    r, g, b, a = pixel
    return (
        a >= 245
        and abs(r - MAGENTA[0]) <= threshold
        and g <= threshold
        and abs(b - MAGENTA[2]) <= threshold
    )


def is_magenta_like(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a >= 80 and r >= 180 and b >= 180 and g <= 90


def is_subject_magenta_biased(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha <= 12:
        return False
    return red >= 150 and blue >= 150 and green <= 105 and min(red, blue) - green >= 55


def flood_background(mask: list[list[bool]], width: int, height: int) -> list[list[bool]]:
    seen = [[False] * width for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if mask[0][x]:
            queue.append((x, 0))
        if mask[height - 1][x]:
            queue.append((x, height - 1))
    for y in range(height):
        if mask[y][0]:
            queue.append((0, y))
        if mask[y][width - 1]:
            queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if seen[y][x] or not mask[y][x]:
            continue
        seen[y][x] = True
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not seen[ny][nx] and mask[ny][nx]:
                queue.append((nx, ny))
    return seen


def luminance(pixel: tuple[int, int, int, int]) -> float:
    red, green, blue, _alpha = pixel
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)


def quantized_color(pixel: tuple[int, int, int, int]) -> tuple[int, int, int]:
    red, green, blue, _alpha = pixel
    return red // 16, green // 16, blue // 16


def source_detail_metrics(
    pixels,
    background: list[list[bool]],
    bbox: list[int] | None,
    width: int,
    height: int,
) -> dict:
    if not bbox:
        return {
            "sampledSubjectPixels": 0,
            "quantizedColorBins": 0,
            "colorEntropy": 0,
            "edgeDensity": 0,
            "averageLocalContrast": 0,
        }
    left, top, right, bottom = bbox
    x_step = max(1, (right - left) // 420)
    y_step = max(1, (bottom - top) // 260)
    colors: list[tuple[int, int, int]] = []
    contrast_values: list[float] = []
    edge_count = 0
    for y in range(top, bottom, y_step):
        for x in range(left, right, x_step):
            pixel = pixels[x, y]
            if background[y][x] or pixel[3] <= 12:
                continue
            colors.append(quantized_color(pixel))
            current_luma = luminance(pixel)
            for nx, ny in ((x + x_step, y), (x, y + y_step)):
                if nx >= width or ny >= height or background[ny][nx]:
                    continue
                neighbor = pixels[nx, ny]
                if neighbor[3] <= 12:
                    continue
                delta = abs(current_luma - luminance(neighbor))
                contrast_values.append(delta)
                if delta > 18:
                    edge_count += 1
    color_counts = Counter(colors)
    entropy = 0.0
    for count in color_counts.values():
        probability = count / max(1, len(colors))
        entropy -= probability * math.log2(probability)
    return {
        "sampledSubjectPixels": len(colors),
        "quantizedColorBins": len(color_counts),
        "colorEntropy": round(entropy, 4),
        "edgeDensity": round(edge_count / max(1, len(contrast_values)), 4),
        "averageLocalContrast": round(sum(contrast_values) / max(1, len(contrast_values)), 4),
    }


def source_connectivity_metrics(
    pixels,
    background: list[list[bool]],
    bbox: list[int] | None,
    width: int,
    height: int,
) -> dict:
    if not bbox:
        return {
            "sampleStep": 2,
            "sampledComponents": 0,
            "largestComponentRatio": 0,
            "significantComponents": 0,
        }
    left, top, right, bottom = bbox
    step = 2
    subject: set[tuple[int, int]] = set()
    for y in range(top, bottom, step):
        for x in range(left, right, step):
            if background[y][x] or pixels[x, y][3] <= 12:
                continue
            subject.add((x // step, y // step))
    seen: set[tuple[int, int]] = set()
    components: list[int] = []
    for point in list(subject):
        if point in seen:
            continue
        queue = [point]
        seen.add(point)
        size = 0
        while queue:
            x, y = queue.pop()
            size += 1
            for neighbor in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if neighbor in subject and neighbor not in seen:
                    seen.add(neighbor)
                    queue.append(neighbor)
        components.append(size)
    components.sort(reverse=True)
    total = sum(components)
    significant_cutoff = max(20, total * 0.005)
    return {
        "sampleStep": step,
        "sampledComponents": len(components),
        "largestComponentRatio": round((components[0] / max(1, total)) if components else 0, 4),
        "significantComponents": sum(1 for size in components if size >= significant_cutoff),
    }


def validate_image(candidate: dict, args: argparse.Namespace) -> tuple[dict, list[str]]:
    failures: list[str] = []
    source = candidate.get("source")
    owner = candidate.get("id", "unknown-candidate")
    if not source:
        return {"id": owner, "source": None, "checked": False}, failures

    path = Path(source)
    try:
        image = Image.open(path).convert("RGBA")
    except Exception as exc:  # noqa: BLE001 - report image load failures.
        return {"id": owner, "source": source, "checked": False}, [f"{owner}: could not open source image {source}: {exc}"]

    width, height = image.size
    pixels = image.load()
    if width < 128 or height < 128:
        failures.append(f"{owner}: source image is {width}x{height}, expected at least 128x128")

    magenta_mask = [[False] * width for _ in range(height)]
    magenta_count = 0
    for y in range(height):
        for x in range(width):
            value = is_magenta(pixels[x, y], args.magenta_threshold)
            magenta_mask[y][x] = value
            if value:
                magenta_count += 1

    border_pixels = (width * 2) + (height * 2) - 4
    border_magenta = 0
    for x in range(width):
        border_magenta += int(magenta_mask[0][x])
        border_magenta += int(magenta_mask[height - 1][x])
    for y in range(1, height - 1):
        border_magenta += int(magenta_mask[y][0])
        border_magenta += int(magenta_mask[y][width - 1])
    border_ratio = border_magenta / max(1, border_pixels)
    if border_ratio < args.min_border_magenta:
        failures.append(
            f"{owner}: border is {border_ratio:.3f} magenta, expected >= {args.min_border_magenta:.3f}"
        )

    background = flood_background(magenta_mask, width, height)
    background_count = sum(sum(1 for value in row if value) for row in background)
    background_ratio = background_count / max(1, width * height)
    if background_ratio < args.min_background_ratio:
        failures.append(
            f"{owner}: background ratio {background_ratio:.3f} is below {args.min_background_ratio:.3f}"
        )
    if background_ratio > args.max_background_ratio:
        failures.append(
            f"{owner}: background ratio {background_ratio:.3f} is above {args.max_background_ratio:.3f}"
        )

    subject_points: list[tuple[int, int]] = []
    inner_magenta_like = 0
    subject_magenta_biased = 0
    subject_translucent = 0
    for y in range(height):
        for x in range(width):
            if background[y][x]:
                continue
            _, _, _, alpha = pixels[x, y]
            if alpha > 12:
                subject_points.append((x, y))
                if is_magenta_like(pixels[x, y]):
                    inner_magenta_like += 1
                if is_subject_magenta_biased(pixels[x, y]):
                    subject_magenta_biased += 1
                if alpha < 245:
                    subject_translucent += 1

    if not subject_points:
        failures.append(f"{owner}: no non-background subject pixels found")
        bbox = None
        subject_width = 0
        subject_height = 0
    else:
        xs = [point[0] for point in subject_points]
        ys = [point[1] for point in subject_points]
        left, right = min(xs), max(xs)
        top, bottom = min(ys), max(ys)
        bbox = [left, top, right + 1, bottom + 1]
        subject_width = right - left + 1
        subject_height = bottom - top + 1
        if subject_width < args.min_subject_size or subject_height < args.min_subject_size:
            failures.append(
                f"{owner}: subject bbox is {subject_width}x{subject_height}, expected at least {args.min_subject_size}px"
            )
        if (
            left < args.min_subject_margin
            or top < args.min_subject_margin
            or width - right - 1 < args.min_subject_margin
            or height - bottom - 1 < args.min_subject_margin
        ):
            failures.append(f"{owner}: subject touches crop edge; expected at least {args.min_subject_margin}px margin")

    inner_magenta_ratio = inner_magenta_like / max(1, len(subject_points))
    if inner_magenta_ratio > args.max_inner_magenta_ratio:
        failures.append(
            f"{owner}: non-background pixels contain {inner_magenta_ratio:.4f} magenta-like colors, "
            f"expected <= {args.max_inner_magenta_ratio:.4f}"
        )
    subject_magenta_bias_ratio = subject_magenta_biased / max(1, len(subject_points))
    if subject_magenta_bias_ratio > args.max_subject_magenta_bias_ratio:
        failures.append(
            f"{owner}: subject pixels contain {subject_magenta_bias_ratio:.4f} magenta-biased colors, "
            f"expected <= {args.max_subject_magenta_bias_ratio:.4f}; source may have chroma-key bleed"
        )
    subject_translucent_ratio = subject_translucent / max(1, len(subject_points))
    if subject_translucent_ratio > args.max_subject_translucent_ratio:
        failures.append(
            f"{owner}: subject pixels contain {subject_translucent_ratio:.4f} translucent pixels, "
            f"expected <= {args.max_subject_translucent_ratio:.4f}; source anatomy should be opaque before extraction"
        )

    detail = source_detail_metrics(pixels, background, bbox, width, height)
    if detail["sampledSubjectPixels"] < 512:
        failures.append(f"{owner}: source detail sample has too few subject pixels for reliable review")
    if detail["quantizedColorBins"] < args.min_color_bins:
        failures.append(
            f"{owner}: source has {detail['quantizedColorBins']} quantized color bins, "
            f"expected >= {args.min_color_bins}; likely too flat or placeholder-like"
        )
    if detail["colorEntropy"] < args.min_color_entropy:
        failures.append(
            f"{owner}: source color entropy {detail['colorEntropy']:.3f} is below "
            f"{args.min_color_entropy:.3f}; likely too flat or placeholder-like"
        )
    if detail["edgeDensity"] < args.min_edge_density:
        failures.append(
            f"{owner}: source edge density {detail['edgeDensity']:.4f} is below "
            f"{args.min_edge_density:.4f}; likely too under-detailed for extraction"
        )
    if detail["averageLocalContrast"] < args.min_average_local_contrast:
        failures.append(
            f"{owner}: source average local contrast {detail['averageLocalContrast']:.3f} is below "
            f"{args.min_average_local_contrast:.3f}; likely too under-detailed for extraction"
        )

    connectivity = source_connectivity_metrics(pixels, background, bbox, width, height)
    if connectivity["largestComponentRatio"] < args.min_largest_component_ratio:
        failures.append(
            f"{owner}: largest connected subject component is {connectivity['largestComponentRatio']:.3f}, "
            f"expected >= {args.min_largest_component_ratio:.3f}; source may be disconnected parts"
        )
    if connectivity["significantComponents"] > args.max_significant_components:
        failures.append(
            f"{owner}: source has {connectivity['significantComponents']} significant disconnected components, "
            f"expected <= {args.max_significant_components}; source may be a parts board or collage"
        )

    metrics = {
        "id": owner,
        "source": source,
        "sourceFingerprint": file_fingerprint(path),
        "checked": True,
        "size": [width, height],
        "borderMagenta": round(border_ratio, 4),
        "backgroundRatio": round(background_ratio, 4),
        "subjectBBox": bbox,
        "subjectSize": [subject_width, subject_height],
        "innerMagentaRatio": round(inner_magenta_ratio, 5),
        "subjectMagentaBiasRatio": round(subject_magenta_bias_ratio, 5),
        "subjectTranslucentRatio": round(subject_translucent_ratio, 5),
        "detail": detail,
        "connectivity": connectivity,
        "failures": failures,
    }
    metrics["validator"] = {
        **VALIDATOR,
        "thresholds": {
            "magentaThreshold": args.magenta_threshold,
            "minBorderMagenta": args.min_border_magenta,
            "minBackgroundRatio": args.min_background_ratio,
            "maxBackgroundRatio": args.max_background_ratio,
            "minSubjectSize": args.min_subject_size,
            "minSubjectMargin": args.min_subject_margin,
            "maxInnerMagentaRatio": args.max_inner_magenta_ratio,
            "maxSubjectMagentaBiasRatio": args.max_subject_magenta_bias_ratio,
            "maxSubjectTranslucentRatio": args.max_subject_translucent_ratio,
            "minColorEntropy": args.min_color_entropy,
            "minColorBins": args.min_color_bins,
            "minEdgeDensity": args.min_edge_density,
            "minAverageLocalContrast": args.min_average_local_contrast,
            "minLargestComponentRatio": args.min_largest_component_ratio,
            "maxSignificantComponents": args.max_significant_components,
        },
    }
    metrics["validationFingerprint"] = validation_fingerprint(metrics, failures, args)
    return metrics, failures


def main() -> int:
    args = parse_args()
    if args.image:
        owner = args.candidate_id or args.image.stem
        metrics, failures = validate_image({"id": owner, "source": str(args.image)}, args)
        summary = {
            "schema": "water9/source-image-validation@1",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "manifest": None,
            "candidateId": owner,
            "image": str(args.image),
            "candidates": 1,
            "checkedImages": 1 if metrics.get("checked") else 0,
            "metrics": [metrics],
            "failures": failures,
        }
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, indent=2))
        return 1 if failures else 0

    manifest = json.loads(args.manifest.read_text())
    candidates = manifest.get("candidates", [])
    if args.candidate_id:
        candidates = [candidate for candidate in candidates if candidate.get("id") == args.candidate_id]
        if not candidates:
            print(json.dumps({
                "manifest": str(args.manifest),
                "candidateId": args.candidate_id,
                "candidates": 0,
                "checkedImages": 0,
                "metrics": [],
                "failures": [f"candidate {args.candidate_id} was not found"],
            }, indent=2))
            return 1
    failures: list[str] = []
    metrics: list[dict] = []
    for candidate in candidates:
        item_metrics, item_failures = validate_image(candidate, args)
        metrics.append(item_metrics)
        failures.extend(item_failures)

    summary = {
        "schema": "water9/source-image-validation@1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "manifest": str(args.manifest),
        "candidateId": args.candidate_id,
        "candidates": len(candidates),
        "checkedImages": sum(1 for item in metrics if item.get("checked")),
        "metrics": metrics,
        "failures": failures,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(summary, indent=2) + "\n")
    if failures:
        print(json.dumps(summary, indent=2))
        return 1
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
