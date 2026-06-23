#!/usr/bin/env python3
"""Build the prototype articulated Cavitation Boxer from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-cavitation-boxer-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-cavitation-boxer.articulated.json"
ROOT_CENTER = (735.0, 355.0)


def crop_dict(box: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = box
    return {"x": x, "y": y, "width": width, "height": height}


def crop_box(crop: dict[str, int]) -> tuple[int, int, int, int]:
    return (crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])


def center(box: tuple[int, int, int, int]) -> tuple[float, float]:
    x, y, width, height = box
    return x + width / 2, y + height / 2


def anatomy(role: str, mass: float, break_threshold: float, mobility: float, severable: bool = False) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 0.88 if role in {"torso", "head"} else 1.08,
        "angularDrag": 0.5 if role != "jaw" else 0.62,
        "severable": severable,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
    }


def rest_offset_for(
    child_crop: tuple[int, int, int, int],
    parent_center: tuple[float, float],
    parent_anchor: list[float],
    child_anchor: list[float],
) -> list[float]:
    child_center = center(child_crop)
    return [
        round(child_center[0] - parent_center[0] - parent_anchor[0] + child_anchor[0], 2),
        round(child_center[1] - parent_center[1] - parent_anchor[1] + child_anchor[1], 2),
    ]


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
    parent_center: tuple[float, float] | None = None,
    parent_anchor_name: str | None = None,
    parent_anchor_value: list[float] | None = None,
    child_anchor_name: str | None = None,
    severable: bool = False,
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"fauna-cavitation-boxer-{part_id}"
    x, y, width, height = crop
    item: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop_dict(crop),
        "offset": [center(crop)[0] - ROOT_CENTER[0], center(crop)[1] - ROOT_CENTER[1]],
        "origin": [0.5, 0.5],
        "size": [width, height],
        "depth": depth,
        "hitRadius": hit_radius,
        "hpMultiplier": hp_multiplier,
        "damageMultiplier": damage_multiplier,
        "motion": motion,
        "anchors": anchors,
        "anatomy": anatomy(role, mass, break_threshold, mobility, severable),
    }
    if parent_id:
        if parent_center is None or parent_anchor_name is None or parent_anchor_value is None or child_anchor_name is None:
            raise ValueError(f"{part_id} missing parent anchor metadata")
        item["parentId"] = parent_id
        item["parentAnchor"] = parent_anchor_name
        item["anchor"] = child_anchor_name
        item["restOffset"] = rest_offset_for(crop, parent_center, parent_anchor_value, anchors[child_anchor_name])
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
    alpha: float = 0.52,
) -> dict[str, Any]:
    texture_key = f"fauna-cavitation-boxer-{overlay_id}"
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
        "bridgeAlpha": 0.16,
        "bridgeCoreAlpha": 0.06,
        "bridgeWidthScale": 0.86,
        "bridgeSleeveScale": 0.28,
    }


def source_overlay(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "src": item["texture"],
        "parentId": item["parentId"],
        "childId": item["childId"],
        "sourcePartId": item["sourcePartId"],
        "sourceCrop": item["sourceCrop"],
        "alphaFeather": {"all": 10, "curve": 1.4, "minimum": 0.1},
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
    image = part_images[item["sourcePartId"]].crop(crop_box(item["sourceCrop"]))
    image = apply_alpha_feather(image, {"all": 10, "curve": 1.4, "minimum": 0.1})
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
        "acceptanceNote": "Prototype generated from one magenta-background Cavitation Boxer source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    crops = {
        "tail-fan": (20, 285, 305, 300),
        "abdomen-rear": (165, 205, 390, 350),
        "abdomen-mid": (390, 150, 420, 390),
        "root-body": (410, 150, 650, 410),
        "front-carapace": (725, 122, 440, 360),
        "head-shield": (920, 100, 395, 330),
        "eye-upper": (870, 25, 310, 185),
        "eye-lower": (1030, 48, 275, 185),
        "club-upper-arm": (770, 342, 430, 290),
        "club-upper": (1020, 365, 340, 265),
        "club-lower-arm": (735, 455, 470, 300),
        "club-lower": (995, 515, 390, 260),
        "leg-bank": (270, 400, 670, 300),
    }
    centers = {key: center(value) for key, value in crops.items()}
    root_anchors = {
        "tail": [-350, 42],
        "rear": [-245, -2],
        "mid": [-70, -38],
        "front": [250, -25],
        "head": [330, -42],
        "legs": [-120, 150],
        "upperArm": [260, 90],
        "lowerArm": [220, 172],
    }
    head_anchors = {
        "neck": [-150, 28],
        "eyeUpper": [-40, -126],
        "eyeLower": [92, -112],
        "upperArm": [-42, 130],
        "lowerArm": [-28, 172],
    }
    abdomen_anchors = {"front": [180, -6], "tail": [-180, 26]}
    arm_upper_anchors = {"root": [-160, -30], "club": [132, 20]}
    arm_lower_anchors = {"root": [-185, -38], "club": [145, 38]}

    parts = [
        part("tail-fan", crops["tail-fan"], "tail", {"kind": "tail", "amplitude": 8.2, "frequency": 2.4, "phase": 1.3, "lag": 1.0}, {"root": [112, 8], "tip": [-115, 18]}, 0.0, 24, 0.7, 0.72, 0.6, 0.65, 0.68, "abdomen-rear", centers["abdomen-rear"], "tail", abdomen_anchors["tail"], "root"),
        part("abdomen-rear", crops["abdomen-rear"], "tail", {"kind": "tail", "amplitude": 5.2, "frequency": 2.0, "phase": 0.9, "lag": 0.72}, abdomen_anchors, 0.01, 32, 0.82, 0.82, 1.0, 0.82, 0.72, "root-body", centers["root-body"], "tail", root_anchors["tail"], "front"),
        part("abdomen-mid", crops["abdomen-mid"], "torso", {"kind": "body", "amplitude": 2.3, "frequency": 1.55, "phase": 0.42, "lag": 0.28}, {"root": [0, 0]}, 0.02, 40, 0.98, 0.88, 1.35, 1.05, 0.8, "root-body", centers["root-body"], "mid", root_anchors["mid"], "root"),
        part("root-body", crops["root-body"], "torso", {"kind": "body", "amplitude": 1.4, "frequency": 1.25, "phase": 0.0, "lag": 0.1}, root_anchors, 0.034, 56, 1.18, 1.0, 2.7, 1.45, 0.76, damaged=True),
        part("front-carapace", crops["front-carapace"], "torso", {"kind": "body", "amplitude": 1.2, "frequency": 1.2, "phase": 0.16, "lag": 0.12}, {"root": [-34, 8]}, 0.048, 44, 1.02, 0.92, 1.55, 1.12, 0.78, "root-body", centers["root-body"], "front", root_anchors["front"], "root"),
        part("head-shield", crops["head-shield"], "head", {"kind": "body", "amplitude": 1.0, "frequency": 1.15, "phase": 0.2, "lag": 0.08}, head_anchors, 0.062, 38, 1.06, 1.08, 1.9, 1.18, 0.72, "root-body", centers["root-body"], "head", root_anchors["head"], "neck"),
        part("eye-upper", crops["eye-upper"], "fin", {"kind": "fin", "amplitude": 5.8, "frequency": 2.1, "phase": 1.2, "lag": 0.26}, {"root": [-85, 64], "tip": [92, -48]}, 0.078, 14, 0.45, 0.5, 0.22, 0.45, 0.86, "head-shield", centers["head-shield"], "eyeUpper", head_anchors["eyeUpper"], "root"),
        part("eye-lower", crops["eye-lower"], "fin", {"kind": "fin", "amplitude": 5.2, "frequency": 2.25, "phase": 1.65, "lag": 0.28}, {"root": [-72, 62], "tip": [80, -42]}, 0.08, 14, 0.45, 0.5, 0.22, 0.45, 0.86, "head-shield", centers["head-shield"], "eyeLower", head_anchors["eyeLower"], "root"),
        part("club-upper-arm", crops["club-upper-arm"], "jaw", {"kind": "jaw", "amplitude": 20.5, "frequency": 3.0, "phase": 0.0, "lag": 0.12}, arm_upper_anchors, 0.074, 28, 0.78, 1.15, 0.8, 0.9, 0.74, "head-shield", centers["head-shield"], "upperArm", head_anchors["upperArm"], "root"),
        part("club-upper", crops["club-upper"], "jaw", {"kind": "jaw", "amplitude": 23.0, "frequency": 3.15, "phase": 0.22, "lag": 0.12}, {"root": [-110, -12], "tip": [118, 32]}, 0.088, 30, 0.74, 1.32, 0.72, 0.86, 0.7, "club-upper-arm", centers["club-upper-arm"], "club", arm_upper_anchors["club"], "root"),
        part("club-lower-arm", crops["club-lower-arm"], "jaw", {"kind": "jaw", "amplitude": 18.0, "frequency": 2.85, "phase": 0.52, "lag": 0.14}, arm_lower_anchors, 0.072, 30, 0.78, 1.1, 0.84, 0.9, 0.74, "root-body", centers["root-body"], "lowerArm", root_anchors["lowerArm"], "root"),
        part("club-lower", crops["club-lower"], "jaw", {"kind": "jaw", "amplitude": 22.0, "frequency": 3.0, "phase": 0.75, "lag": 0.14}, {"root": [-132, -22], "tip": [130, 38]}, 0.09, 32, 0.74, 1.34, 0.75, 0.88, 0.7, "club-lower-arm", centers["club-lower-arm"], "club", arm_lower_anchors["club"], "root"),
        part("leg-bank", crops["leg-bank"], "fin", {"kind": "fin", "amplitude": 4.4, "frequency": 2.5, "phase": 1.8, "lag": 0.42}, {"root": [120, -90], "rear": [-230, -40]}, 0.026, 34, 0.75, 0.62, 0.7, 0.62, 0.76, "root-body", centers["root-body"], "legs", root_anchors["legs"], "root"),
    ]
    overlays = [
        overlay("tail-fan-socket", "abdomen-rear", "tail-fan", "abdomen-rear", (0, 118, 108, 104), [-72, 18], [108, 104], 0.022, 0.5),
        overlay("abdomen-rear-socket", "root-body", "abdomen-rear", "root-body", (0, 168, 122, 118), [-64, 18], [122, 118], 0.052, 0.56),
        overlay("abdomen-mid-socket", "root-body", "abdomen-mid", "root-body", (124, 80, 142, 120), [-24, -26], [142, 120], 0.058, 0.52),
        overlay("front-carapace-socket", "root-body", "front-carapace", "root-body", (472, 110, 130, 124), [58, -12], [130, 124], 0.072, 0.54),
        overlay("head-socket", "root-body", "head-shield", "root-body", (525, 78, 120, 126), [72, -38], [120, 126], 0.084, 0.56),
        overlay("eye-upper-socket", "head-shield", "eye-upper", "head-shield", (70, 0, 96, 82), [-40, -74], [96, 82], 0.092, 0.45),
        overlay("eye-lower-socket", "head-shield", "eye-lower", "head-shield", (186, 0, 94, 80), [26, -70], [94, 80], 0.094, 0.45),
        overlay("club-upper-arm-socket", "head-shield", "club-upper-arm", "head-shield", (80, 214, 118, 92), [-42, 80], [118, 92], 0.094, 0.52),
        overlay("club-upper-socket", "club-upper-arm", "club-upper", "club-upper-arm", (270, 126, 104, 92), [62, 36], [104, 92], 0.102, 0.5),
        overlay("club-lower-arm-socket", "root-body", "club-lower-arm", "root-body", (430, 252, 140, 100), [78, 104], [140, 100], 0.086, 0.52),
        overlay("club-lower-socket", "club-lower-arm", "club-lower", "club-lower-arm", (298, 132, 118, 96), [70, 44], [118, 96], 0.104, 0.5),
        overlay("leg-bank-socket", "root-body", "leg-bank", "root-body", (178, 245, 182, 112), [-36, 78], [182, 112], 0.054, 0.44),
    ]
    socket_style = {
        "alpha": 0.54,
        "bridgeColor": 0x0A1820,
        "bridgeAlpha": 0.16,
        "bridgeStunnedAlpha": 0.09,
        "bridgeCoreColor": 0x8BE6D9,
        "bridgeCoreAlpha": 0.06,
        "bridgeCoreStunnedAlpha": 0.035,
        "bridgeWidthScale": 0.86,
        "bridgeSleeveScale": 0.28,
    }
    murk_tint = {"color": 0x80D8CF, "intensity": 0.11, "stunnedIntensity": 0.18}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": "cavitation-boxer",
        "species": "Cavitation Boxer",
        "minBiome": 2,
        "color": 0x80D8CF,
        "rarity": "rare",
        "radius": 54,
        "hp": 190,
        "speed": [30, 72],
        "spawn": {"minDepth": 540, "maxDepth": 1700, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-cavitation-boxer",
        "runtimeCreatureId": "cavitation-boxer",
        "displayName": "Cavitation Boxer",
        "kind": "articulated-creature",
        "depthBand": "deep",
        "source": "public/assets/generated/fauna-cavitation-boxer-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Cavitation Boxer source. The rig emphasizes a mantis-shrimp body plan with stalked eyes, folded raptorial club arms, grouped swimmerets, segmented abdomen, and a fan tail for bait-punch-recover motion.",
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
    print(f"Wrote cavitation-boxer with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
