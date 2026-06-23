#!/usr/bin/env python3
"""Build the prototype articulated Sawback Ray from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-sawback-ray-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-sawback-ray.articulated.json"
ROOT_CENTER = (984.0, 360.0)


def crop_dict(box: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = box
    return {"x": x, "y": y, "width": width, "height": height}


def crop_box(crop: dict[str, int]) -> tuple[int, int, int, int]:
    return (crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])


def center(crop: tuple[int, int, int, int]) -> tuple[float, float]:
    x, y, width, height = crop
    return x + width / 2, y + height / 2


def anatomy(role: str, mass: float, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 0.82 if role in {"torso", "head"} else 1.08,
        "angularDrag": 0.36 if role != "tail" else 0.42,
        "severable": False,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
    }


def part(
    part_id: str,
    crop: tuple[int, int, int, int],
    role: str,
    motion: dict[str, Any],
    anchors: dict[str, list[float]],
    depth: float,
    hit_radius: float,
    hp_multiplier: float,
    damage_multiplier: float,
    mass: float,
    break_threshold: float,
    mobility: float,
    parent_id: str | None = None,
    parent_anchor: str | None = None,
    anchor: str | None = None,
    parent_center: tuple[float, float] | None = None,
    parent_anchor_value: list[float] | None = None,
    origin: list[float] | None = None,
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"fauna-sawback-ray-{part_id}"
    x, y, width, height = crop
    item: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop_dict(crop),
        "offset": [center(crop)[0] - ROOT_CENTER[0], center(crop)[1] - ROOT_CENTER[1]],
        "origin": origin or [0.5, 0.5],
        "size": [width, height],
        "depth": depth,
        "hitRadius": hit_radius,
        "hpMultiplier": hp_multiplier,
        "damageMultiplier": damage_multiplier,
        "motion": motion,
        "anchors": anchors,
        "anatomy": anatomy(role, mass, break_threshold, mobility),
    }
    if parent_id:
        if parent_center is None or parent_anchor_value is None or parent_anchor is None or anchor is None:
            raise ValueError(f"{part_id} is missing parent anchor metadata")
        child_center = center(crop)
        child_anchor = anchors[anchor]
        item["parentId"] = parent_id
        item["parentAnchor"] = parent_anchor
        item["anchor"] = anchor
        item["restOffset"] = [
            round(child_center[0] - parent_center[0] - parent_anchor_value[0] + child_anchor[0], 2),
            round(child_center[1] - parent_center[1] - parent_anchor_value[1] + child_anchor[1], 2),
        ]
    if damaged:
        item["damagedTextureKey"] = f"{texture_key}-damaged"
        item["damagedTexture"] = f"{texture_key}-damaged.png"
    return item


def source_part(item: dict[str, Any]) -> dict[str, Any]:
    result = {
        "id": item["id"],
        "key": item["textureKey"],
        "src": item["texture"],
        "sourceCrop": item["sourceCrop"],
        "size": {"width": item["sourceCrop"]["width"], "height": item["sourceCrop"]["height"]},
        "anatomy": item["anatomy"],
        "motion": item["motion"],
    }
    if item.get("damagedTexture"):
        result["damagedSrc"] = item["damagedTexture"]
        result["damagedKey"] = item["damagedTextureKey"]
        result["damagedProcess"] = "deterministic dark wound and crack overlay"
    return result


def overlay(
    overlay_id: str,
    parent_id: str,
    child_id: str,
    source_part_id: str,
    source_crop: tuple[int, int, int, int],
    offset: list[float],
    size: list[float],
    depth: float,
    alpha: float = 0.56,
) -> dict[str, Any]:
    texture_key = f"fauna-sawback-ray-{overlay_id}"
    return {
        "id": overlay_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "parentId": parent_id,
        "childId": child_id,
        "sourcePartId": source_part_id,
        "sourceCrop": crop_dict(source_crop),
        "offset": offset,
        "origin": [0.5, 0.5],
        "size": size,
        "depth": depth,
        "alpha": alpha,
        "bridgeAlpha": 0.18,
        "bridgeCoreAlpha": 0.07,
        "bridgeWidthScale": 0.92,
        "bridgeSleeveScale": 0.3,
    }


def source_overlay(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "src": item["texture"],
        "parentId": item["parentId"],
        "childId": item["childId"],
        "sourcePartId": item["sourcePartId"],
        "sourceCrop": item["sourceCrop"],
        "alphaFeather": {"all": 10, "curve": 1.45, "minimum": 0.12},
        "alpha": item["alpha"],
        "bridgeAlpha": item["bridgeAlpha"],
        "bridgeCoreAlpha": item["bridgeCoreAlpha"],
        "bridgeWidthScale": item["bridgeWidthScale"],
        "bridgeSleeveScale": item["bridgeSleeveScale"],
    }


def write_part(source: Image.Image, item: dict[str, Any]) -> None:
    image = source.crop(crop_box(item["sourceCrop"]))
    image.save(GENERATED / item["texture"])
    if item.get("damagedTexture"):
        apply_body_cripple_damage(image).save(GENERATED / item["damagedTexture"])


def write_overlay(part_images: dict[str, Image.Image], item: dict[str, Any]) -> None:
    source = part_images[item["sourcePartId"]]
    image = source.crop(crop_box(item["sourceCrop"]))
    image = apply_alpha_feather(image, {"all": 10, "curve": 1.45, "minimum": 0.12})
    image.save(GENERATED / item["texture"])


def main() -> int:
    if not SOURCE.exists():
        raise FileNotFoundError(f"missing source {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Prototype generated from one corrected magenta-background Sawback Ray source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }

    crops = {
        "tail-tip": (24, 315, 330, 185),
        "tail-base": (300, 270, 480, 240),
        "upper-tip": (245, 50, 430, 245),
        "upper-wing": (520, 75, 640, 310),
        "body-core": (724, 162, 520, 396),
        "lower-wing": (540, 345, 680, 340),
        "lower-tip": (255, 470, 450, 230),
        "head-plate": (1115, 170, 500, 360),
        "saw-ridge": (735, 70, 560, 205),
        "stinger": (24, 410, 205, 130),
    }
    centers = {key: center(value) for key, value in crops.items()}
    body_anchors = {
        "head": [230, -12],
        "tailBase": [-250, 28],
        "upperWing": [-92, -152],
        "lowerWing": [-92, 164],
        "ridge": [10, -172],
    }
    upper_anchors = {"root": [160, 86], "tip": [-235, -18]}
    lower_anchors = {"root": [150, -82], "tip": [-240, 28]}
    tail_base_anchors = {"root": [210, -8], "tail": [-205, 10]}
    tail_tip_anchors = {"root": [145, -10], "stinger": [-118, 28]}

    parts = [
        part("tail-tip", crops["tail-tip"], "tail", {"kind": "tail", "amplitude": 8.5, "frequency": 2.25, "phase": 1.4, "lag": 1.2}, tail_tip_anchors, 0.0, 20, 0.78, 0.72, 0.75, 0.72, 0.58, "tail-base", "tail", "root", centers["tail-base"], tail_base_anchors["tail"]),
        part("stinger", crops["stinger"], "tail", {"kind": "tail", "amplitude": 11.0, "frequency": 2.6, "phase": 1.8, "lag": 1.45}, {"root": [86, -8], "tip": [-78, 18]}, 0.006, 14, 0.55, 0.9, 0.32, 0.62, 0.82, "tail-tip", "stinger", "root", centers["tail-tip"], tail_tip_anchors["stinger"]),
        part("tail-base", crops["tail-base"], "tail", {"kind": "tail", "amplitude": 5.5, "frequency": 2.0, "phase": 0.9, "lag": 0.8}, tail_base_anchors, 0.012, 24, 0.86, 0.82, 1.0, 0.88, 0.68, "body-core", "tailBase", "root", centers["body-core"], body_anchors["tailBase"]),
        part("upper-tip", crops["upper-tip"], "fin", {"kind": "fin", "amplitude": 8.0, "frequency": 1.7, "phase": 1.25, "lag": 0.6}, {"root": [170, 62], "tip": [-190, -52]}, 0.018, 24, 0.82, 0.76, 0.62, 0.72, 0.76, "upper-wing", "tip", "root", centers["upper-wing"], upper_anchors["tip"]),
        part("upper-wing", crops["upper-wing"], "fin", {"kind": "fin", "amplitude": 5.8, "frequency": 1.45, "phase": 0.6, "lag": 0.42}, upper_anchors, 0.024, 42, 0.92, 0.86, 1.35, 1.0, 0.82, "body-core", "upperWing", "root", centers["body-core"], body_anchors["upperWing"]),
        part("lower-tip", crops["lower-tip"], "fin", {"kind": "fin", "amplitude": 8.4, "frequency": 1.7, "phase": 1.45, "lag": 0.62}, {"root": [180, -48], "tip": [-198, 42]}, 0.03, 24, 0.82, 0.76, 0.62, 0.72, 0.76, "lower-wing", "tip", "root", centers["lower-wing"], lower_anchors["tip"]),
        part("lower-wing", crops["lower-wing"], "fin", {"kind": "fin", "amplitude": 6.2, "frequency": 1.45, "phase": 0.78, "lag": 0.44}, lower_anchors, 0.036, 42, 0.92, 0.86, 1.35, 1.0, 0.82, "body-core", "lowerWing", "root", centers["body-core"], body_anchors["lowerWing"]),
        part("body-core", crops["body-core"], "torso", {"kind": "body", "amplitude": 1.8, "frequency": 1.25, "phase": 0.0, "lag": 0.12}, body_anchors, 0.048, 54, 1.12, 1.0, 3.2, 1.55, 0.84, damaged=True),
        part("head-plate", crops["head-plate"], "head", {"kind": "body", "amplitude": 1.0, "frequency": 1.1, "phase": 0.1, "lag": 0.08}, {"neck": [-210, 8], "bite": [180, -10]}, 0.06, 38, 1.08, 1.12, 2.25, 1.35, 0.72, "body-core", "head", "neck", centers["body-core"], body_anchors["head"]),
        part("saw-ridge", crops["saw-ridge"], "fin", {"kind": "fin", "amplitude": 2.2, "frequency": 2.1, "phase": 0.9, "lag": 0.18}, {"root": [0, 76], "front": [210, 46]}, 0.072, 28, 0.78, 1.18, 0.72, 0.88, 0.74, "body-core", "ridge", "root", centers["body-core"], body_anchors["ridge"]),
    ]
    overlays = [
        overlay("tail-tip-socket", "tail-base", "tail-tip", "tail-base", (18, 82, 95, 96), [-42, 8], [95, 96], 0.025, 0.54),
        overlay("stinger-socket", "tail-tip", "stinger", "tail-tip", (8, 68, 86, 70), [-62, 18], [86, 70], 0.03, 0.5),
        overlay("tail-base-socket", "body-core", "tail-base", "body-core", (0, 166, 104, 102), [-36, 10], [104, 102], 0.058, 0.58),
        overlay("upper-tip-socket", "upper-wing", "upper-tip", "upper-wing", (12, 44, 100, 88), [-58, -20], [100, 88], 0.034, 0.52),
        overlay("upper-wing-socket", "body-core", "upper-wing", "body-core", (48, 0, 126, 118), [-24, -48], [126, 118], 0.064, 0.56),
        overlay("lower-tip-socket", "lower-wing", "lower-tip", "lower-wing", (12, 220, 104, 88), [-58, 24], [104, 88], 0.046, 0.52),
        overlay("lower-wing-socket", "body-core", "lower-wing", "body-core", (42, 250, 132, 124), [-24, 52], [132, 124], 0.07, 0.56),
        overlay("head-socket", "body-core", "head-plate", "body-core", (404, 110, 108, 128), [34, -2], [108, 128], 0.082, 0.58),
        overlay("saw-ridge-socket", "body-core", "saw-ridge", "body-core", (160, 0, 148, 100), [6, -56], [148, 100], 0.088, 0.5),
    ]
    socket_style = {
        "alpha": 0.58,
        "bridgeColor": 0x08131A,
        "bridgeAlpha": 0.18,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0x7EBCCD,
        "bridgeCoreAlpha": 0.07,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.92,
        "bridgeSleeveScale": 0.3,
    }
    murk_tint = {"color": 0x82B4C8, "intensity": 0.1, "stunnedIntensity": 0.16}

    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": "sawback-ray",
        "species": "Sawback Ray",
        "minBiome": 2,
        "color": 0x7EBCCD,
        "rarity": "rare",
        "radius": 72,
        "hp": 210,
        "speed": [24, 68],
        "spawn": {"minDepth": 520, "maxDepth": 1500, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-sawback-ray",
        "runtimeCreatureId": "sawback-ray",
        "displayName": "Sawback Ray",
        "kind": "articulated-creature",
        "depthBand": "deep",
        "source": "public/assets/generated/fauna-sawback-ray-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one corrected magenta-background Sawback Ray source: broad flattened ray silhouette, short wedge head, dorsal saw ridge, tail and stinger. Crop centers are used to compute initial rest offsets so the assembled idle pose remains close to the whole-source silhouette before fin/tail motion.",
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(json.dumps(source_manifest, indent=2) + "\n")
    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    creatures = runtime.setdefault("creatures", [])
    creatures[:] = [candidate for candidate in creatures if candidate.get("id") != creature["id"]]
    creatures.append(creature)
    RUNTIME_MANIFEST.write_text(json.dumps(runtime, indent=2) + "\n")
    print(f"Wrote sawback-ray with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
