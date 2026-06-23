#!/usr/bin/env python3
"""Extract articulated creature parts from a magenta whole-source plan.

The plan format is intentionally close to the runtime/source manifests. It lets
new Imagen whole-creature sources become sandbox-previewable prototypes without
writing a bespoke Python builder for every threat.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage, transformed_source
from validate_articulation_plan import validate_plan, validate_source_coverage


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True, help="water9/articulation-plan@1 JSON file")
    parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without writing files")
    parser.add_argument(
        "--no-register",
        action="store_true",
        help="Write generated PNG/source manifest but do not modify articulated-creatures.parts.json",
    )
    return parser.parse_args()


def require(value: Any, message: str) -> Any:
    if value is None or value == "":
        raise ValueError(message)
    return value


def crop_box(crop: dict[str, Any]) -> tuple[int, int, int, int]:
    return (
        int(crop["x"]),
        int(crop["y"]),
        int(crop["x"]) + int(crop["width"]),
        int(crop["y"]) + int(crop["height"]),
    )


def crop_dict(crop: dict[str, Any]) -> dict[str, int]:
    return {
        "x": int(crop["x"]),
        "y": int(crop["y"]),
        "width": int(crop["width"]),
        "height": int(crop["height"]),
    }


def crop_center(crop: dict[str, Any]) -> tuple[float, float]:
    return (
        float(crop["x"]) + float(crop["width"]) / 2,
        float(crop["y"]) + float(crop["height"]) / 2,
    )


def load_plan(path: Path) -> dict[str, Any]:
    plan = json.loads(path.read_text())
    if plan.get("schema") != "water9/articulation-plan@1":
        raise ValueError(f"{path}: schema must be water9/articulation-plan@1")
    return plan


def source_path(plan: dict[str, Any]) -> Path:
    source = require(plan.get("source"), "plan.source is required")
    path = (ROOT / source).resolve()
    if not path.exists():
        raise FileNotFoundError(f"plan.source does not exist: {source}")
    return path


def relative_public_path(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def texture_prefix(plan: dict[str, Any]) -> str:
    return str(plan.get("texturePrefix") or f"fauna-{plan['runtimeCreatureId']}")


def anatomy(part: dict[str, Any]) -> dict[str, Any]:
    role = str(require(part.get("role") or part.get("anatomy", {}).get("role"), f"{part.get('id')}: role is required"))
    source = part.get("anatomy") or {}
    return {
        "role": role,
        "mass": float(part.get("mass", source.get("mass", 1.0))),
        "drag": float(part.get("drag", source.get("drag", 0.9 if role in {"head", "torso"} else 1.08))),
        "angularDrag": float(part.get("angularDrag", source.get("angularDrag", 0.42 if role == "jaw" else 0.36))),
        "severable": bool(part.get("severable", source.get("severable", False))),
        "breakThreshold": float(part.get("breakThreshold", source.get("breakThreshold", 1.0))),
        "mobilityFactor": float(part.get("mobilityFactor", source.get("mobilityFactor", 0.8))),
    }


def nearest_opaque_anchor(image: Image.Image, anchor: Any, origin: Any) -> list[int]:
    if not isinstance(anchor, list) or len(anchor) != 2:
        return anchor
    if not isinstance(origin, list) or len(origin) != 2:
        origin = [0.5, 0.5]
    width, height = image.size
    target_x = float(origin[0]) * width + float(anchor[0])
    target_y = float(origin[1]) * height + float(anchor[1])
    alpha = image.getchannel("A")
    best: tuple[float, int, int] | None = None
    for y in range(height):
        for x in range(width):
            if alpha.getpixel((x, y)) <= 16:
                continue
            distance_sq = (x - target_x) ** 2 + (y - target_y) ** 2
            if best is None or distance_sq < best[0]:
                best = (distance_sq, x, y)
    if best is None:
        return [int(round(anchor[0])), int(round(anchor[1]))]
    return [
        int(round(best[1] - float(origin[0]) * width)),
        int(round(best[2] - float(origin[1]) * height)),
    ]


def snap_part_anchors_to_alpha(part: dict[str, Any], image: Image.Image) -> None:
    anchors = part.get("anchors")
    if not isinstance(anchors, dict):
        return
    origin = part.get("origin") or [0.5, 0.5]
    part["anchors"] = {
        name: nearest_opaque_anchor(image, anchor, origin)
        for name, anchor in anchors.items()
    }


def recompute_source_layout_rest_offsets(parts: list[dict[str, Any]]) -> None:
    """Keep snapped anchors without moving children away from source-space layout."""
    by_id = {part["id"]: part for part in parts}
    for part in parts:
        parent_id = part.get("parentId")
        if not parent_id:
            continue
        parent = by_id.get(parent_id)
        if not parent:
            continue
        parent_anchor_name = part.get("parentAnchor")
        child_anchor_name = part.get("anchor")
        parent_anchor = parent.get("anchors", {}).get(parent_anchor_name)
        child_anchor = part.get("anchors", {}).get(child_anchor_name)
        if not (
            isinstance(parent_anchor, list)
            and len(parent_anchor) == 2
            and isinstance(child_anchor, list)
            and len(child_anchor) == 2
        ):
            continue
        parent_center = crop_center(parent["sourceCrop"])
        child_center = crop_center(part["sourceCrop"])
        part["restOffset"] = [
            round(child_center[0] - parent_center[0] - float(parent_anchor[0]) + float(child_anchor[0])),
            round(child_center[1] - parent_center[1] - float(parent_anchor[1]) + float(child_anchor[1])),
        ]


def source_part_entry(part: dict[str, Any], runtime_part: dict[str, Any]) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": runtime_part["id"],
        "key": runtime_part["textureKey"],
        "src": runtime_part["texture"],
        "sourceCrop": runtime_part["sourceCrop"],
        "size": {"width": runtime_part["size"][0], "height": runtime_part["size"][1]},
        "anatomy": runtime_part["anatomy"],
        "motion": runtime_part["motion"],
    }
    if part.get("alphaCutouts"):
        entry["alphaCutouts"] = part["alphaCutouts"]
    if runtime_part.get("damagedTexture"):
        entry["damagedSrc"] = runtime_part["damagedTexture"]
        entry["damagedKey"] = runtime_part["damagedTextureKey"]
        entry["damagedProcess"] = "deterministic dark wound and crack overlay"
    return entry


def runtime_part(plan: dict[str, Any], part: dict[str, Any], source_size: tuple[int, int]) -> dict[str, Any]:
    part_id = str(require(part.get("id"), "part.id is required"))
    crop = crop_dict(require(part.get("sourceCrop") or part.get("crop"), f"{part_id}: sourceCrop/crop is required"))
    origin_point = plan.get("originPoint") or [source_size[0] / 2, source_size[1] / 2]
    texture_key = str(part.get("textureKey") or f"{texture_prefix(plan)}-{part_id}")
    width = crop["width"]
    height = crop["height"]
    result: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop,
        "offset": part.get("offset") or [
            crop["x"] + width / 2 - float(origin_point[0]),
            crop["y"] + height / 2 - float(origin_point[1]),
        ],
        "origin": part.get("origin") or [0.5, 0.5],
        "size": [width, height],
        "depth": float(part.get("depth", 0)),
        "hitRadius": float(part.get("hitRadius", max(8, min(width, height) * 0.24))),
        "hpMultiplier": float(part.get("hpMultiplier", 1.0)),
        "damageMultiplier": float(part.get("damageMultiplier", 1.0)),
        "motion": part.get("motion") or {"kind": "body", "amplitude": 2.0, "frequency": 1.4, "phase": 0.0, "lag": 0.0},
        "anchors": require(part.get("anchors"), f"{part_id}: anchors are required"),
        "anatomy": anatomy(part),
    }
    for key in ("parentId", "parentAnchor", "anchor", "restOffset"):
        if key in part:
            result[key] = part[key]
    if part.get("damaged"):
        result["damagedTextureKey"] = f"{texture_key}-damaged"
        result["damagedTexture"] = f"{texture_key}-damaged.png"
    return result


def runtime_overlay(plan: dict[str, Any], overlay: dict[str, Any], part_images: dict[str, Image.Image]) -> dict[str, Any]:
    overlay_id = str(require(overlay.get("id"), "socket overlay id is required"))
    source_part_id = str(require(overlay.get("sourcePartId"), f"{overlay_id}: sourcePartId is required"))
    if source_part_id not in part_images:
        raise ValueError(f"{overlay_id}: sourcePartId {source_part_id!r} is missing")
    crop = crop_dict(require(overlay.get("sourceCrop") or overlay.get("crop"), f"{overlay_id}: sourceCrop/crop is required"))
    texture_key = str(overlay.get("textureKey") or f"{texture_prefix(plan)}-{overlay_id}")
    return {
        "id": overlay_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "parentId": require(overlay.get("parentId"), f"{overlay_id}: parentId is required"),
        "childId": require(overlay.get("childId"), f"{overlay_id}: childId is required"),
        "sourcePartId": source_part_id,
        "sourceCrop": crop,
        "offset": overlay.get("offset") or [0, 0],
        "origin": overlay.get("origin") or [0.5, 0.5],
        "size": overlay.get("size") or [crop["width"], crop["height"]],
        "depth": float(overlay.get("depth", 0.1)),
        "alpha": float(overlay.get("alpha", 0.58)),
        "bridgeAlpha": float(overlay.get("bridgeAlpha", 0.2)),
        "bridgeCoreAlpha": float(overlay.get("bridgeCoreAlpha", 0.08)),
        "bridgeWidthScale": float(overlay.get("bridgeWidthScale", 0.98)),
        "bridgeSleeveScale": float(overlay.get("bridgeSleeveScale", 0.36)),
    }


def write_part_image(source: Image.Image, part: dict[str, Any], dry_run: bool) -> Image.Image:
    image = source.crop(crop_box(part["sourceCrop"]))
    snap_part_anchors_to_alpha(part, image)
    if not dry_run:
        image.save(GENERATED / part["texture"])
        if part.get("damagedTexture"):
            apply_body_cripple_damage(image).save(GENERATED / part["damagedTexture"])
    return image


def write_overlay_image(part_images: dict[str, Image.Image], overlay: dict[str, Any], dry_run: bool) -> Image.Image:
    image = part_images[overlay["sourcePartId"]].crop(crop_box(overlay["sourceCrop"]))
    image = apply_alpha_feather(image, {"all": 9, "curve": 1.5, "minimum": 0.15})
    if not dry_run:
        image.save(GENERATED / overlay["texture"])
    return image


def source_overlay_entry(overlay: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": overlay["id"],
        "src": overlay["texture"],
        "parentId": overlay["parentId"],
        "childId": overlay["childId"],
        "sourcePartId": overlay["sourcePartId"],
        "sourceCrop": overlay["sourceCrop"],
        "alphaFeather": {"all": 9, "curve": 1.5, "minimum": 0.15},
        "alpha": overlay["alpha"],
        "bridgeAlpha": overlay["bridgeAlpha"],
        "bridgeCoreAlpha": overlay["bridgeCoreAlpha"],
        "bridgeWidthScale": overlay["bridgeWidthScale"],
        "bridgeSleeveScale": overlay["bridgeSleeveScale"],
    }


def strip_runtime_source_fields(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in entry.items() if key not in {"sourcePartId", "sourceCrop"}}


def default_quality(plan: dict[str, Any]) -> dict[str, Any]:
    source_candidate_id = plan.get("sourceCandidateId")
    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Prototype generated from a magenta whole-source articulation plan. Needs human sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    if source_candidate_id:
        quality["sourceCandidateId"] = source_candidate_id
    quality.update(plan.get("quality") or {})
    return quality


def build_creature(plan: dict[str, Any], runtime_parts: list[dict[str, Any]], runtime_overlays: list[dict[str, Any]]) -> dict[str, Any]:
    quality = default_quality(plan)
    return {
        "id": plan["runtimeCreatureId"],
        "species": plan["displayName"],
        "minBiome": int(plan.get("minBiome", 3)),
        "color": int(plan.get("color", 0x79B8C9)),
        "rarity": plan.get("rarity", "rare"),
        "radius": float(plan.get("radius", 56)),
        "hp": float(plan.get("hp", 180)),
        "speed": plan.get("speed", [28, 52]),
        "spawn": plan.get("spawn") or {"minDepth": 1000, "maxDepth": 2400, "count": 1},
        "murkTint": plan.get("murkTint") or {"color": 0x79B8C9, "intensity": 0.1, "stunnedIntensity": 0.16},
        "parts": [strip_runtime_source_fields(part) for part in runtime_parts],
        "socketOverlays": [strip_runtime_source_fields(overlay) for overlay in runtime_overlays],
        "socketStyle": plan.get("socketStyle") or {
            "alpha": 0.6,
            "bridgeColor": 0x07101A,
            "bridgeAlpha": 0.2,
            "bridgeCoreColor": 0x79B8C9,
            "bridgeCoreAlpha": 0.08,
            "bridgeWidthScale": 0.98,
            "bridgeSleeveScale": 0.36,
        },
        "quality": quality,
    }


def build_source_manifest(plan: dict[str, Any], source: Path, runtime_parts: list[dict[str, Any]], runtime_overlays: list[dict[str, Any]]) -> dict[str, Any]:
    quality = default_quality(plan)
    return {
        "schema": "asset-forge/articulated-creature@1",
        "name": texture_prefix(plan),
        "runtimeCreatureId": plan["runtimeCreatureId"],
        "displayName": plan["displayName"],
        "kind": "articulated-creature",
        "depthBand": plan.get("depthBand", "abyss"),
        "source": relative_public_path(source),
        "sourceTransform": plan.get("sourceTransform") or {"chromaKey": {"color": [255, 0, 255], "tolerance": 24}},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part_entry(part, part) for part in runtime_parts],
        "socketOverlays": [source_overlay_entry(overlay) for overlay in runtime_overlays],
        "notes": plan.get("notes") or "Generated by extract_articulated_from_plan.py from one magenta-background whole-source creature.",
        "murkTint": plan.get("murkTint") or {"color": 0x79B8C9, "intensity": 0.1, "stunnedIntensity": 0.16},
        "socketStyle": plan.get("socketStyle") or {
            "alpha": 0.6,
            "bridgeColor": 0x07101A,
            "bridgeAlpha": 0.2,
            "bridgeCoreColor": 0x79B8C9,
            "bridgeCoreAlpha": 0.08,
            "bridgeWidthScale": 0.98,
            "bridgeSleeveScale": 0.36,
        },
        "quality": quality,
        "extraction": {
            "preserveSourceLayoutRestOffsets": plan.get("preserveSourceLayoutRestOffsets") is not False,
        },
    }


def register_creature(creature: dict[str, Any]) -> None:
    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    creatures = runtime.setdefault("creatures", [])
    creatures[:] = [candidate for candidate in creatures if candidate.get("id") != creature["id"]]
    creatures.append(creature)
    RUNTIME_MANIFEST.write_text(json.dumps(runtime, indent=2) + "\n")


def main() -> int:
    args = parse_args()
    plan = load_plan(args.plan)
    runtime_id = str(require(plan.get("runtimeCreatureId"), "runtimeCreatureId is required"))
    require(plan.get("displayName"), "displayName is required")
    source_ref = source_path(plan)
    source_image = Image.open(source_ref).convert("RGBA")
    plan_failures = validate_plan(plan, source_image.size)
    plan_failures.extend(validate_source_coverage(plan, source_image))
    if plan_failures:
        print(json.dumps({
            "runtimeCreatureId": runtime_id,
            "source": relative_public_path(source_ref),
            "plan": str(args.plan),
            "sourceSize": source_image.size,
            "failures": plan_failures,
            "dryRun": args.dry_run,
        }, indent=2), file=sys.stderr)
        return 1
    transformed = transformed_source(source_image, plan.get("sourceTransform") or {"chromaKey": {"color": [255, 0, 255], "tolerance": 24}})

    runtime_parts = [runtime_part(plan, part, source_image.size) for part in require(plan.get("parts"), "parts are required")]
    part_images = {part["id"]: write_part_image(transformed, part, args.dry_run) for part in runtime_parts}
    if plan.get("preserveSourceLayoutRestOffsets") is not False:
        recompute_source_layout_rest_offsets(runtime_parts)
    runtime_overlays = [
        runtime_overlay(plan, overlay, part_images)
        for overlay in require(plan.get("socketOverlays"), "socketOverlays are required")
    ]
    for overlay in runtime_overlays:
        write_overlay_image(part_images, overlay, args.dry_run)

    creature = build_creature(plan, runtime_parts, runtime_overlays)
    source_manifest = build_source_manifest(plan, source_ref, runtime_parts, runtime_overlays)
    source_manifest_path = GENERATED / f"fauna-{runtime_id}.articulated.json"

    if not args.dry_run:
        source_manifest_path.write_text(json.dumps(source_manifest, indent=2) + "\n")
        if not args.no_register:
            register_creature(creature)

    print(json.dumps({
        "runtimeCreatureId": runtime_id,
        "source": relative_public_path(source_ref),
        "sourceManifest": relative_public_path(source_manifest_path),
        "parts": len(runtime_parts),
        "socketOverlays": len(runtime_overlays),
        "registered": not args.no_register and not args.dry_run,
        "dryRun": args.dry_run,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
