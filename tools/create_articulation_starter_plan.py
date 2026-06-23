#!/usr/bin/env python3
"""Create a conservative starter articulation plan from a source candidate."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_source_candidate_images import flood_background, is_magenta


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--id", dest="candidate_id", required=True)
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("public/review/source-candidates/source-candidates.json"),
    )
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--magenta-threshold", type=int, default=12)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def slug(value: str) -> str:
    result = "".join(char.lower() if char.isalnum() else "-" for char in value)
    while "--" in result:
        result = result.replace("--", "-")
    return result.strip("-")


def load_candidate(path: Path, candidate_id: str) -> dict[str, Any]:
    manifest = json.loads(path.read_text())
    for candidate in manifest.get("candidates", []):
        if candidate.get("id") == candidate_id:
            return candidate
    raise ValueError(f"candidate {candidate_id!r} not found in {path}")


def subject_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    points = subject_points(image, threshold)
    if not points:
        raise ValueError("source image has no detectable non-background subject")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def subject_points(image: Image.Image, threshold: int) -> list[tuple[int, int]]:
    width, height = image.size
    pixels = image.load()
    magenta_mask = [[False] * width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            magenta_mask[y][x] = is_magenta(pixels[x, y], threshold)
    background = flood_background(magenta_mask, width, height)
    points: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            if not background[y][x] and pixels[x, y][3] > 12:
                points.append((x, y))
    return points


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def crop_from_center(cx: float, cy: float, width: float, height: float, image_size: tuple[int, int]) -> dict[str, int]:
    image_width, image_height = image_size
    crop_width = clamp(round(width), 16, image_width)
    crop_height = clamp(round(height), 16, image_height)
    x = clamp(round(cx - crop_width / 2), 0, image_width - crop_width)
    y = clamp(round(cy - crop_height / 2), 0, image_height - crop_height)
    return {"x": x, "y": y, "width": crop_width, "height": crop_height}


def crop_center(crop: dict[str, int]) -> tuple[float, float]:
    return crop["x"] + crop["width"] / 2, crop["y"] + crop["height"] / 2


def covers(crop: dict[str, int], point: tuple[int, int]) -> bool:
    x, y = point
    return crop["x"] <= x < crop["x"] + crop["width"] and crop["y"] <= y < crop["y"] + crop["height"]


def crop_coverage(crops: dict[str, dict[str, int]], points: list[tuple[int, int]]) -> float:
    if not points:
        return 1.0
    covered = sum(1 for point in points if any(covers(crop, point) for crop in crops.values()))
    return covered / len(points)


def expand_crop_to_points(
    crop: dict[str, int],
    points: list[tuple[int, int]],
    image_size: tuple[int, int],
    padding: int,
) -> dict[str, int]:
    if not points:
        return crop
    image_width, image_height = image_size
    left = min([crop["x"], *(point[0] for point in points)]) - padding
    top = min([crop["y"], *(point[1] for point in points)]) - padding
    right = max([crop["x"] + crop["width"], *(point[0] + 1 for point in points)]) + padding
    bottom = max([crop["y"] + crop["height"], *(point[1] + 1 for point in points)]) + padding
    left = clamp(left, 0, image_width - 1)
    top = clamp(top, 0, image_height - 1)
    right = clamp(right, left + 1, image_width)
    bottom = clamp(bottom, top + 1, image_height)
    return {"x": left, "y": top, "width": right - left, "height": bottom - top}


def expand_crops_for_coverage(
    crops: dict[str, dict[str, int]],
    points: list[tuple[int, int]],
    image_size: tuple[int, int],
    min_coverage: float = 0.86,
) -> dict[str, dict[str, int]]:
    if crop_coverage(crops, points) >= min_coverage:
        return crops
    result = {key: dict(value) for key, value in crops.items()}
    for _pass in range(3):
        missing = [point for point in points if not any(covers(crop, point) for crop in result.values())]
        if not missing:
            break
        centers = {key: crop_center(crop) for key, crop in result.items()}
        assigned: dict[str, list[tuple[int, int]]] = {key: [] for key in result}
        for point in missing:
            x, y = point
            best = min(
                result,
                key=lambda key: (x - centers[key][0]) ** 2 + (y - centers[key][1]) ** 2,
            )
            assigned[best].append(point)
        for key, assigned_points in assigned.items():
            result[key] = expand_crop_to_points(result[key], assigned_points, image_size, padding=18)
        if crop_coverage(result, points) >= min_coverage:
            break
    return result


def anchor(crop: dict[str, int], world_x: float, world_y: float) -> list[int]:
    return [
        round(world_x - (crop["x"] + crop["width"] / 2)),
        round(world_y - (crop["y"] + crop["height"] / 2)),
    ]


def rest_offset_for(parent_crop: dict[str, int], child_crop: dict[str, int], parent_anchor: list[int], child_anchor: list[int]) -> list[int]:
    parent_center = crop_center(parent_crop)
    child_center = crop_center(child_crop)
    return [
        round(child_center[0] - parent_center[0] - parent_anchor[0] + child_anchor[0]),
        round(child_center[1] - parent_center[1] - parent_anchor[1] + child_anchor[1]),
    ]


def overlay_crop(parent_crop: dict[str, int], parent_anchor: list[int], size: int) -> dict[str, int]:
    width = min(size, parent_crop["width"])
    height = min(size, parent_crop["height"])
    x = clamp(round(parent_crop["width"] / 2 + parent_anchor[0] - width / 2), 0, parent_crop["width"] - width)
    y = clamp(round(parent_crop["height"] / 2 + parent_anchor[1] - height / 2), 0, parent_crop["height"] - height)
    return {"x": x, "y": y, "width": width, "height": height}


def infer_min_biome(candidate: dict[str, Any]) -> int:
    text = f"{candidate.get('depthBand', '')} {candidate.get('gameplayVerb', '')}".lower()
    for value in (4, 3, 2, 1):
        if f"biome {value}" in text:
            return value
    if "abyss" in text or "hadal" in text or "ruin" in text:
        return 4
    if "deep" in text or "vent" in text or "bathyal" in text:
        return 3
    return 2


def part(
    part_id: str,
    role: str,
    crop: dict[str, int],
    depth: float,
    motion_kind: str,
    parent_id: str | None = None,
    parent_anchor: str | None = None,
    anchor_name: str | None = None,
    rest_offset: list[int] | None = None,
    damaged: bool = False,
    phase: float = 0.0,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": part_id,
        "role": role,
        "sourceCrop": crop,
        "depth": depth,
        "hitRadius": round(max(10, min(crop["width"], crop["height"]) * 0.24)),
        "hpMultiplier": 1.12 if role == "torso" else 0.86,
        "damageMultiplier": 1.0 if role != "head" else 1.22,
        "mass": 2.4 if role == "torso" else 1.1,
        "breakThreshold": 1.3 if role == "torso" else 0.95,
        "mobilityFactor": 0.72,
        "motion": {"kind": motion_kind, "amplitude": 4.0, "frequency": 1.15, "phase": phase, "lag": 0.2},
        "anchors": {},
    }
    if damaged:
        result["damaged"] = True
    if parent_id:
        result["parentId"] = parent_id
        result["parentAnchor"] = parent_anchor
        result["anchor"] = anchor_name
        result["restOffset"] = rest_offset or [0, 0]
    return result


def make_plan(candidate: dict[str, Any], image_size: tuple[int, int], bbox: tuple[int, int, int, int], points: list[tuple[int, int]]) -> dict[str, Any]:
    left, top, right, bottom = bbox
    subject_width = right - left
    subject_height = bottom - top
    cx = left + subject_width / 2
    cy = top + subject_height / 2

    crops = expand_crops_for_coverage(
        {
            "core": crop_from_center(cx, cy, subject_width * 0.48, subject_height * 0.58, image_size),
            "head": crop_from_center(left + subject_width * 0.78, cy - subject_height * 0.03, subject_width * 0.28, subject_height * 0.36, image_size),
            "tail": crop_from_center(left + subject_width * 0.24, cy + subject_height * 0.03, subject_width * 0.34, subject_height * 0.34, image_size),
            "upper-fin": crop_from_center(cx, top + subject_height * 0.24, subject_width * 0.42, subject_height * 0.24, image_size),
            "lower-fin": crop_from_center(cx, top + subject_height * 0.76, subject_width * 0.42, subject_height * 0.24, image_size),
        },
        points,
        image_size,
    )
    core_crop = crops["core"]
    head_crop = crops["head"]
    tail_crop = crops["tail"]
    upper_fin_crop = crops["upper-fin"]
    lower_fin_crop = crops["lower-fin"]

    core_anchors = {
        "head": anchor(core_crop, left + subject_width * 0.64, cy),
        "tail": anchor(core_crop, left + subject_width * 0.36, cy),
        "upperFin": anchor(core_crop, cx, top + subject_height * 0.36),
        "lowerFin": anchor(core_crop, cx, top + subject_height * 0.64),
    }

    parts = [
        part("core", "torso", core_crop, 0.02, "root", damaged=True),
        part("head", "head", head_crop, 0.05, "body", "core", "head", "neck", [0, 0], phase=0.0),
        part("tail", "tail", tail_crop, 0.0, "tail", "core", "tail", "root", [0, 0], phase=0.0),
        part("upper-fin", "fin", upper_fin_crop, 0.03, "fin", "core", "upperFin", "root", [0, 0], phase=0.0),
        part("lower-fin", "fin", lower_fin_crop, 0.01, "fin", "core", "lowerFin", "root", [0, 0], phase=0.0),
    ]
    parts[0]["anchors"] = core_anchors
    parts[1]["anchors"] = {"neck": anchor(head_crop, left + subject_width * 0.66, cy), "bite": anchor(head_crop, left + subject_width * 0.9, cy)}
    parts[2]["anchors"] = {"root": anchor(tail_crop, left + subject_width * 0.34, cy), "tip": anchor(tail_crop, left + subject_width * 0.08, cy)}
    parts[3]["anchors"] = {"root": anchor(upper_fin_crop, cx, top + subject_height * 0.36), "tip": anchor(upper_fin_crop, cx, top + subject_height * 0.12)}
    parts[4]["anchors"] = {"root": anchor(lower_fin_crop, cx, top + subject_height * 0.64), "tip": anchor(lower_fin_crop, cx, top + subject_height * 0.92)}
    for child in parts[1:]:
        parent_anchor = parts[0]["anchors"][child["parentAnchor"]]
        child_anchor = child["anchors"][child["anchor"]]
        child["restOffset"] = rest_offset_for(core_crop, child["sourceCrop"], parent_anchor, child_anchor)

    socket_size = max(48, round(min(core_crop["width"], core_crop["height"]) * 0.18))
    sockets = []
    for child_id, parent_anchor in (
        ("head", "head"),
        ("tail", "tail"),
        ("upper-fin", "upperFin"),
        ("lower-fin", "lowerFin"),
    ):
        sockets.append({
            "id": f"{child_id}-socket",
            "parentId": "core",
            "childId": child_id,
            "sourcePartId": "core",
            "sourceCrop": overlay_crop(core_crop, core_anchors[parent_anchor], socket_size),
            "offset": core_anchors[parent_anchor],
            "size": [socket_size, socket_size],
            "depth": 0.07,
        })

    candidate_id = candidate["id"]
    return {
        "schema": "water9/articulation-plan@1",
        "runtimeCreatureId": candidate_id,
        "displayName": candidate.get("species", candidate_id),
        "sourceCandidateId": candidate_id,
        "source": candidate["source"],
        "sourceTransform": {"chromaKey": {"color": [255, 0, 255], "tolerance": 24, "feather": 12}},
        "originPoint": [round(cx), round(cy)],
        "texturePrefix": f"fauna-{candidate_id}",
        "sourceCoverageMin": 0.82,
        "preserveSourceLayoutRestOffsets": True,
        "minBiome": infer_min_biome(candidate),
        "color": 0x78D5D1,
        "rarity": "rare",
        "radius": round(max(42, min(subject_width, subject_height) * 0.11)),
        "hp": 180,
        "speed": [18, 42],
        "spawn": {"minDepth": 900, "maxDepth": 2400, "count": 1},
        "murkTint": {"color": 0x78D5D1, "intensity": 0.12, "stunnedIntensity": 0.18},
        "quality": {
            "status": "prototype",
            "sourceCohesion": "single-source",
            "backgroundKey": "magenta",
            "reviewedBy": None,
            "sourceCandidateId": candidate_id,
            "acceptanceNote": "Starter articulation plan generated from the source-candidate whole-source image. Crops, anchors, sockets, motion, and anatomy require human adjustment before this can become accepted content.",
        },
        "notes": f"Auto-generated starter plan with source-alpha crop expansion ({crop_coverage(crops, points):.1%} source coverage). Use plan-preview to revise crops and anchors before extraction.",
        "parts": parts,
        "socketOverlays": sockets,
    }


def main() -> int:
    args = parse_args()
    candidate = load_candidate(args.manifest, args.candidate_id)
    if not candidate.get("source"):
        raise ValueError(f"{candidate['id']}: source image is required before creating an articulation starter plan")
    source_path = (ROOT / candidate["source"]).resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"{candidate['id']}: source image does not exist: {candidate['source']}")

    image = Image.open(source_path).convert("RGBA")
    points = subject_points(image, args.magenta_threshold)
    if not points:
        raise ValueError("source image has no detectable non-background subject")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    bbox = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    plan = make_plan(candidate, image.size, bbox, points)
    out = args.out or Path(f"tools/scratch/{slug(candidate['id'])}-starter-plan.json")
    out = (ROOT / out).resolve() if not out.is_absolute() else out
    if out.exists() and not args.overwrite:
        raise FileExistsError(f"{out} already exists; pass --overwrite to replace it")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, indent=2) + "\n")
    print(json.dumps({
        "candidateId": candidate["id"],
        "source": candidate["source"],
        "subjectBBox": bbox,
        "out": str(out.relative_to(ROOT)),
        "parts": len(plan["parts"]),
        "socketOverlays": len(plan["socketOverlays"]),
        "next": [
            f"npm run articulated:plan-preview -- --plan {out.relative_to(ROOT)} --out public/review/articulated/{candidate['id']}-plan-preview.png",
            f"npm run articulated:plan-check -- --plan {out.relative_to(ROOT)}",
            f"npm run articulated:extract-plan -- --plan {out.relative_to(ROOT)} --dry-run",
        ],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
