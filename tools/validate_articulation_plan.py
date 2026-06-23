#!/usr/bin/env python3
"""Validate a water9 articulation plan before extraction."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import transformed_source


ROOT = Path(__file__).resolve().parents[1]
VALID_MOTION_KINDS = {"root", "body", "tail", "fin", "jaw"}
VALID_ROLES = {"head", "jaw", "torso", "tail", "fin"}
VALID_RARITIES = {"common", "uncommon", "rare", "epic", "legendary"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def fail(failures: list[str], message: str) -> None:
    failures.append(message)


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def number_tuple(value: Any, length: int) -> bool:
    return isinstance(value, list) and len(value) == length and all(is_number(item) for item in value)


def crop(plan_item: dict[str, Any]) -> dict[str, Any] | None:
    value = plan_item.get("sourceCrop") or plan_item.get("crop")
    return value if isinstance(value, dict) else None


def crop_box(value: dict[str, Any]) -> tuple[int, int, int, int]:
    x = int(value["x"])
    y = int(value["y"])
    width = int(value["width"])
    height = int(value["height"])
    return x, y, x + width, y + height


def alpha_points(image: Image.Image, threshold: int = 12) -> set[tuple[int, int]]:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    return {
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if pixels[x, y] > threshold
    }


def crop_covers(crop_value: dict[str, Any], point: tuple[int, int]) -> bool:
    x, y = point
    left, top, right, bottom = crop_box(crop_value)
    return left <= x < right and top <= y < bottom


def validate_source_coverage(plan: dict[str, Any], source_image: Image.Image) -> list[str]:
    failures: list[str] = []
    min_coverage = plan.get("sourceCoverageMin")
    if min_coverage is None:
        return failures
    if not is_number(min_coverage):
        return ["sourceCoverageMin must be a number when present"]
    minimum = float(min_coverage)
    if minimum <= 0 or minimum > 1:
        return ["sourceCoverageMin must be in the range (0, 1]"]
    image = transformed_source(source_image, plan.get("sourceTransform") or {"chromaKey": {"color": [255, 0, 255], "tolerance": 24}})
    points = alpha_points(image)
    if not points:
        return ["sourceCoverageMin cannot be evaluated because transformed source has no alpha"]
    part_crops = [
        crop(part)
        for part in plan.get("parts", [])
        if isinstance(part, dict) and crop(part)
    ]
    covered = sum(1 for point in points if any(crop_covers(part_crop, point) for part_crop in part_crops if part_crop))
    coverage = covered / len(points)
    if coverage < minimum:
        failures.append(f"source crop alpha coverage {coverage:.3f} below sourceCoverageMin {minimum:.3f}")
    return failures


def role_for(part: dict[str, Any]) -> str | None:
    anatomy = part.get("anatomy") if isinstance(part.get("anatomy"), dict) else {}
    return part.get("role") or anatomy.get("role")


def source_path(plan: dict[str, Any]) -> Path | None:
    source = plan.get("source")
    if not isinstance(source, str) or not source:
        return None
    return (ROOT / source).resolve()


def validate_crop(failures: list[str], owner: str, value: dict[str, Any] | None, image_size: tuple[int, int]) -> None:
    if not value:
        fail(failures, f"{owner}: missing sourceCrop")
        return
    for key in ("x", "y", "width", "height"):
        if not isinstance(value.get(key), int):
            fail(failures, f"{owner}.sourceCrop.{key} must be an integer")
    if any(not isinstance(value.get(key), int) for key in ("x", "y", "width", "height")):
        return
    left, top, right, bottom = crop_box(value)
    if value["width"] <= 0 or value["height"] <= 0:
        fail(failures, f"{owner}.sourceCrop width/height must be positive")
    if left < 0 or top < 0 or right > image_size[0] or bottom > image_size[1]:
        fail(failures, f"{owner}.sourceCrop is outside source image bounds {image_size[0]}x{image_size[1]}")


def validate_plan(plan: dict[str, Any], image_size: tuple[int, int]) -> list[str]:
    failures: list[str] = []
    if plan.get("schema") != "water9/articulation-plan@1":
        fail(failures, f"schema must be water9/articulation-plan@1, got {plan.get('schema')!r}")
    for key in ("runtimeCreatureId", "displayName", "source"):
        if not isinstance(plan.get(key), str) or not plan.get(key).strip():
            fail(failures, f"{key} must be a non-empty string")
    if plan.get("rarity") is not None and plan.get("rarity") not in VALID_RARITIES:
        fail(failures, f"rarity {plan.get('rarity')!r} is not supported")
    if plan.get("minBiome") is not None and plan.get("minBiome") not in (1, 2, 3, 4):
        fail(failures, "minBiome must be 1-4")
    if plan.get("originPoint") is not None and not number_tuple(plan.get("originPoint"), 2):
        fail(failures, "originPoint must be a two-number list")
    if plan.get("speed") is not None and (not number_tuple(plan.get("speed"), 2) or plan["speed"][1] < plan["speed"][0]):
        fail(failures, "speed must be [min, max] with max >= min")

    parts = plan.get("parts")
    if not isinstance(parts, list) or not parts:
        fail(failures, "parts must be a non-empty list")
        parts = []
    overlays = plan.get("socketOverlays")
    if not isinstance(overlays, list):
        fail(failures, "socketOverlays must be a list")
        overlays = []

    ids: set[str] = set()
    parts_by_id: dict[str, dict[str, Any]] = {}
    roots = []
    roles = set()
    damaged_torso = False
    for index, part in enumerate(parts):
        owner = f"parts[{index}]"
        if not isinstance(part, dict):
            fail(failures, f"{owner} must be an object")
            continue
        part_id = part.get("id")
        if not isinstance(part_id, str) or not part_id.strip():
            fail(failures, f"{owner}.id must be a non-empty string")
            continue
        if part_id in ids:
            fail(failures, f"duplicate part id {part_id}")
        ids.add(part_id)
        parts_by_id[part_id] = part
        validate_crop(failures, f"{part_id}", crop(part), image_size)
        role = role_for(part)
        if role not in VALID_ROLES:
            fail(failures, f"{part_id}.role {role!r} is not supported")
        else:
            roles.add(role)
        if role == "torso" and part.get("damaged"):
            damaged_torso = True
        motion = part.get("motion")
        if not isinstance(motion, dict):
            fail(failures, f"{part_id}.motion must be an object")
        elif motion.get("kind") not in VALID_MOTION_KINDS:
            fail(failures, f"{part_id}.motion.kind {motion.get('kind')!r} is not supported")
        anchors = part.get("anchors")
        if not isinstance(anchors, dict) or not anchors:
            fail(failures, f"{part_id}.anchors must be a non-empty object")
        else:
            for anchor_name, anchor in anchors.items():
                if not number_tuple(anchor, 2):
                    fail(failures, f"{part_id}.anchors.{anchor_name} must be a two-number list")
        if part.get("parentId"):
            if part.get("parentId") not in parts_by_id and part.get("parentId") not in {p.get("id") for p in parts if isinstance(p, dict)}:
                fail(failures, f"{part_id}.parentId references missing part {part.get('parentId')}")
            if not isinstance(part.get("parentAnchor"), str):
                fail(failures, f"{part_id}.parentAnchor must be a string")
            if not isinstance(part.get("anchor"), str):
                fail(failures, f"{part_id}.anchor must be a string")
            if not number_tuple(part.get("restOffset"), 2):
                fail(failures, f"{part_id}.restOffset must be a two-number list")
        else:
            roots.append(part_id)

    if len(roots) != 1:
        fail(failures, f"expected exactly one root part, saw {len(roots)}")
    elif parts_by_id:
        root_id = roots[0]
        for part_id, part in parts_by_id.items():
            seen: set[str] = set()
            current_id: str | None = part_id
            while current_id:
                if current_id in seen:
                    fail(failures, f"{part_id}.parentId chain contains a cycle at {current_id}")
                    break
                seen.add(current_id)
                if current_id == root_id:
                    break
                parent_id = parts_by_id.get(current_id, {}).get("parentId")
                if not parent_id:
                    fail(failures, f"{part_id}.parentId chain does not reach root {root_id}")
                    break
                if parent_id not in parts_by_id:
                    break
                current_id = parent_id
    for role in ("head", "torso", "tail"):
        if role not in roles:
            fail(failures, f"plan needs at least one {role} role for content-gate anatomy coverage")
    if len(parts) < 5:
        fail(failures, "plan needs at least 5 parts for content-gate structural coverage")
    if len(overlays) < 3:
        fail(failures, "plan needs at least 3 socket overlays for content-gate structural coverage")
    if not damaged_torso:
        fail(failures, "plan needs at least one damaged torso part for readable cripple damage")

    overlay_ids: set[str] = set()
    covered_joints: set[tuple[str, str]] = set()
    for index, overlay in enumerate(overlays):
        owner = f"socketOverlays[{index}]"
        if not isinstance(overlay, dict):
            fail(failures, f"{owner} must be an object")
            continue
        overlay_id = overlay.get("id")
        if not isinstance(overlay_id, str) or not overlay_id.strip():
            fail(failures, f"{owner}.id must be a non-empty string")
            continue
        if overlay_id in overlay_ids:
            fail(failures, f"duplicate socket overlay id {overlay_id}")
        overlay_ids.add(overlay_id)
        parent_id = overlay.get("parentId")
        child_id = overlay.get("childId")
        source_part_id = overlay.get("sourcePartId")
        if parent_id not in parts_by_id:
            fail(failures, f"{overlay_id}.parentId references missing part {parent_id!r}")
        if child_id not in parts_by_id:
            fail(failures, f"{overlay_id}.childId references missing part {child_id!r}")
        if source_part_id not in parts_by_id:
            fail(failures, f"{overlay_id}.sourcePartId references missing part {source_part_id!r}")
        if parent_id in parts_by_id and child_id in parts_by_id:
            child = parts_by_id[child_id]
            if child.get("parentId") != parent_id:
                fail(failures, f"{overlay_id} must cover the real joint {child.get('parentId')}->{child_id}")
            covered_joints.add((parent_id, child_id))
        source_part = parts_by_id.get(source_part_id)
        source_crop = crop(source_part) if source_part else None
        overlay_crop = crop(overlay)
        if not overlay_crop:
            fail(failures, f"{overlay_id}: missing sourceCrop")
        elif source_crop:
            validate_crop(failures, f"{overlay_id}", overlay_crop, (source_crop["width"], source_crop["height"]))
        if overlay.get("size") is not None and not number_tuple(overlay.get("size"), 2):
            fail(failures, f"{overlay_id}.size must be a two-number list when present")
        if overlay.get("offset") is not None and not number_tuple(overlay.get("offset"), 2):
            fail(failures, f"{overlay_id}.offset must be a two-number list when present")

    for part in parts:
        if not isinstance(part, dict) or not part.get("parentId") or not part.get("id"):
            continue
        joint = (part["parentId"], part["id"])
        if joint not in covered_joints:
            fail(failures, f"{part['id']} anchored joint needs a socket overlay")
        parent = parts_by_id.get(part["parentId"])
        if parent and isinstance(parent.get("anchors"), dict) and part.get("parentAnchor") not in parent["anchors"]:
            fail(failures, f"{part['id']}.parentAnchor {part.get('parentAnchor')!r} is missing on {parent.get('id')}")
        if isinstance(part.get("anchors"), dict) and part.get("anchor") not in part["anchors"]:
            fail(failures, f"{part['id']}.anchor {part.get('anchor')!r} is missing on child")

    return failures


def main() -> int:
    args = parse_args()
    plan = json.loads(args.plan.read_text())
    source = source_path(plan)
    failures: list[str] = []
    if not source:
        failures.append("source must be a non-empty string")
        image_size = (0, 0)
    elif not source.exists():
        failures.append(f"source file does not exist: {plan.get('source')}")
        image_size = (0, 0)
    else:
        with Image.open(source) as image:
            image_size = image.size
            source_image = image.convert("RGBA")
    failures.extend(validate_plan(plan, image_size))
    if source and source.exists():
        failures.extend(validate_source_coverage(plan, source_image))
    summary = {
        "plan": str(args.plan),
        "runtimeCreatureId": plan.get("runtimeCreatureId"),
        "source": plan.get("source"),
        "sourceSize": image_size,
        "parts": len(plan.get("parts") or []),
        "socketOverlays": len(plan.get("socketOverlays") or []),
        "failures": failures,
    }
    if args.json or failures:
        print(json.dumps(summary, indent=2))
    else:
        print(f"Validated articulation plan {args.plan}: {summary['parts']} parts, {summary['socketOverlays']} socket overlays.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
