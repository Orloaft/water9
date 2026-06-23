#!/usr/bin/env python3
"""Build the prototype articulated Hookjaw Isopod from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-hookjaw-isopod-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-hookjaw-isopod.articulated.json"
ROOT_CENTER = (850.0, 342.5)


def crop_dict(box: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = box
    return {"x": x, "y": y, "width": width, "height": height}


def crop_box(crop: dict[str, int]) -> tuple[int, int, int, int]:
    return (crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])


def center(box: tuple[int, int, int, int]) -> tuple[float, float]:
    x, y, width, height = box
    return x + width / 2, y + height / 2


def anatomy(role: str, mass: float, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 0.9 if role in {"torso", "head"} else 1.15,
        "angularDrag": 0.45 if role != "jaw" else 0.58,
        "severable": False,
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
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"fauna-hookjaw-isopod-{part_id}"
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
        "anatomy": anatomy(role, mass, break_threshold, mobility),
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
    alpha: float = 0.54,
) -> dict[str, Any]:
    texture_key = f"fauna-hookjaw-isopod-{overlay_id}"
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
        "bridgeSleeveScale": 0.32,
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
    image = part_images[item["sourcePartId"]].crop(crop_box(item["sourceCrop"]))
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
        "acceptanceNote": "Prototype generated from one magenta-background Hookjaw Isopod source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    crops = {
        "tail-fan": (20, 245, 260, 220),
        "abdomen": (95, 170, 560, 350),
        "rear-plate": (300, 110, 430, 440),
        "mid-plate": (610, 82, 430, 470),
        "front-plate": (895, 105, 430, 445),
        "root-body": (470, 115, 760, 455),
        "head-plate": (1095, 120, 545, 430),
        "jaw-upper": (1290, 220, 360, 185),
        "jaw-lower": (1265, 315, 385, 255),
        "antenna-upper": (1315, 35, 340, 200),
        "antenna-lower": (1375, 425, 285, 190),
        "leg-upper-bank": (390, 18, 840, 245),
        "leg-lower-bank": (405, 430, 880, 225),
    }
    centers = {key: center(value) for key, value in crops.items()}
    root_anchors = {
        "tail": [-350, 10],
        "rearPlate": [-230, -22],
        "midPlate": [0, -38],
        "frontPlate": [235, -22],
        "head": [348, -6],
        "upperLegs": [-25, -208],
        "lowerLegs": [-20, 205],
    }
    head_anchors = {
        "neck": [-250, 8],
        "jawUpper": [120, 50],
        "jawLower": [95, 140],
        "antennaUpper": [70, -150],
        "antennaLower": [122, 178],
    }
    abdomen_anchors = {"front": [250, 0], "tail": [-250, 6]}

    parts = [
        part("tail-fan", crops["tail-fan"], "tail", {"kind": "tail", "amplitude": 6.5, "frequency": 2.15, "phase": 1.5, "lag": 1.0}, {"root": [108, 0], "tip": [-105, 10]}, 0.0, 20, 0.72, 0.72, 0.62, 0.68, 0.6, "abdomen", centers["abdomen"], "tail", abdomen_anchors["tail"], "root"),
        part("abdomen", crops["abdomen"], "tail", {"kind": "tail", "amplitude": 3.8, "frequency": 1.85, "phase": 0.9, "lag": 0.6}, abdomen_anchors, 0.012, 30, 0.84, 0.82, 1.15, 0.9, 0.66, "root-body", centers["root-body"], "tail", root_anchors["tail"], "front"),
        part("rear-plate", crops["rear-plate"], "torso", {"kind": "body", "amplitude": 2.2, "frequency": 1.55, "phase": 0.8, "lag": 0.42}, {"root": [-32, 0]}, 0.02, 36, 0.96, 0.86, 1.35, 1.0, 0.72, "root-body", centers["root-body"], "rearPlate", root_anchors["rearPlate"], "root"),
        part("mid-plate", crops["mid-plate"], "torso", {"kind": "body", "amplitude": 1.6, "frequency": 1.4, "phase": 0.42, "lag": 0.24}, {"root": [0, 0]}, 0.032, 42, 1.02, 0.9, 1.6, 1.15, 0.76, "root-body", centers["root-body"], "midPlate", root_anchors["midPlate"], "root"),
        part("front-plate", crops["front-plate"], "torso", {"kind": "body", "amplitude": 1.4, "frequency": 1.32, "phase": 0.2, "lag": 0.16}, {"root": [20, 0]}, 0.044, 42, 1.02, 0.92, 1.65, 1.18, 0.76, "root-body", centers["root-body"], "frontPlate", root_anchors["frontPlate"], "root"),
        part("root-body", crops["root-body"], "torso", {"kind": "body", "amplitude": 1.1, "frequency": 1.1, "phase": 0.0, "lag": 0.08}, root_anchors, 0.056, 58, 1.16, 1.0, 3.2, 1.55, 0.72, damaged=True),
        part("head-plate", crops["head-plate"], "head", {"kind": "body", "amplitude": 1.1, "frequency": 1.2, "phase": 0.1, "lag": 0.08}, head_anchors, 0.068, 42, 1.08, 1.08, 2.4, 1.35, 0.64, "root-body", centers["root-body"], "head", root_anchors["head"], "neck"),
        part("jaw-upper", crops["jaw-upper"], "jaw", {"kind": "jaw", "amplitude": 17.5, "frequency": 3.0, "phase": 0.0, "lag": 0.1}, {"hinge": [-130, -10], "tip": [142, -18]}, 0.084, 22, 0.64, 1.18, 0.52, 0.75, 0.86, "head-plate", centers["head-plate"], "jawUpper", head_anchors["jawUpper"], "hinge"),
        part("jaw-lower", crops["jaw-lower"], "jaw", {"kind": "jaw", "amplitude": 19.0, "frequency": 3.15, "phase": 0.25, "lag": 0.12}, {"hinge": [-138, -72], "tip": [152, 58]}, 0.088, 24, 0.66, 1.22, 0.58, 0.78, 0.88, "head-plate", centers["head-plate"], "jawLower", head_anchors["jawLower"], "hinge"),
        part("antenna-upper", crops["antenna-upper"], "fin", {"kind": "fin", "amplitude": 6.2, "frequency": 2.2, "phase": 1.1, "lag": 0.3}, {"root": [-126, 62], "tip": [128, -58]}, 0.076, 16, 0.5, 0.54, 0.25, 0.5, 0.82, "head-plate", centers["head-plate"], "antennaUpper", head_anchors["antennaUpper"], "root"),
        part("antenna-lower", crops["antenna-lower"], "fin", {"kind": "fin", "amplitude": 5.8, "frequency": 2.05, "phase": 1.55, "lag": 0.32}, {"root": [-112, -58], "tip": [110, 58]}, 0.078, 16, 0.5, 0.54, 0.25, 0.5, 0.82, "head-plate", centers["head-plate"], "antennaLower", head_anchors["antennaLower"], "root"),
        part("leg-upper-bank", crops["leg-upper-bank"], "fin", {"kind": "fin", "amplitude": 4.8, "frequency": 2.4, "phase": 1.25, "lag": 0.35}, {"root": [0, 92], "front": [310, 70]}, 0.052, 32, 0.78, 0.68, 0.8, 0.72, 0.78, "root-body", centers["root-body"], "upperLegs", root_anchors["upperLegs"], "root"),
        part("leg-lower-bank", crops["leg-lower-bank"], "fin", {"kind": "fin", "amplitude": 5.2, "frequency": 2.45, "phase": 1.75, "lag": 0.38}, {"root": [0, -86], "front": [330, -62]}, 0.054, 32, 0.78, 0.68, 0.8, 0.72, 0.78, "root-body", centers["root-body"], "lowerLegs", root_anchors["lowerLegs"], "root"),
    ]
    overlays = [
        overlay("tail-fan-socket", "abdomen", "tail-fan", "abdomen", (0, 126, 94, 96), [-58, 4], [94, 96], 0.022, 0.52),
        overlay("abdomen-socket", "root-body", "abdomen", "root-body", (0, 176, 112, 110), [-54, 8], [112, 110], 0.072, 0.58),
        overlay("rear-plate-socket", "root-body", "rear-plate", "root-body", (112, 70, 124, 116), [-42, -8], [124, 116], 0.074, 0.54),
        overlay("mid-plate-socket", "root-body", "mid-plate", "root-body", (318, 48, 136, 126), [0, -18], [136, 126], 0.076, 0.54),
        overlay("front-plate-socket", "root-body", "front-plate", "root-body", (540, 78, 136, 128), [48, -10], [136, 128], 0.078, 0.54),
        overlay("head-socket", "root-body", "head-plate", "root-body", (635, 155, 120, 124), [48, 0], [120, 124], 0.09, 0.58),
        overlay("jaw-upper-socket", "head-plate", "jaw-upper", "head-plate", (286, 92, 104, 88), [22, 18], [104, 88], 0.104, 0.5),
        overlay("jaw-lower-socket", "head-plate", "jaw-lower", "head-plate", (260, 205, 116, 104), [8, 54], [116, 104], 0.108, 0.5),
        overlay("antenna-upper-socket", "head-plate", "antenna-upper", "head-plate", (294, 0, 106, 86), [28, -62], [106, 86], 0.096, 0.46),
        overlay("antenna-lower-socket", "head-plate", "antenna-lower", "head-plate", (328, 312, 106, 86), [42, 72], [106, 86], 0.098, 0.46),
        overlay("leg-upper-socket", "root-body", "leg-upper-bank", "root-body", (284, 0, 174, 98), [-8, -70], [174, 98], 0.082, 0.48),
        overlay("leg-lower-socket", "root-body", "leg-lower-bank", "root-body", (282, 350, 180, 98), [-8, 72], [180, 98], 0.084, 0.48),
    ]
    socket_style = {
        "alpha": 0.56,
        "bridgeColor": 0x08121A,
        "bridgeAlpha": 0.18,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0x7CB8C9,
        "bridgeCoreAlpha": 0.07,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.92,
        "bridgeSleeveScale": 0.32,
    }
    murk_tint = {"color": 0x7FAFC0, "intensity": 0.1, "stunnedIntensity": 0.17}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": "hookjaw-isopod",
        "species": "Hookjaw Isopod",
        "minBiome": 3,
        "color": 0x7CB8C9,
        "rarity": "epic",
        "radius": 62,
        "hp": 260,
        "speed": [18, 42],
        "spawn": {"minDepth": 900, "maxDepth": 2300, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-hookjaw-isopod",
        "runtimeCreatureId": "hookjaw-isopod",
        "displayName": "Hookjaw Isopod",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-hookjaw-isopod-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Hookjaw Isopod source. The rig uses grouped leg banks, overlapping armor plates, a head shield, paired hook jaws, antennae, abdomen, and tail fan to support latch/drag style animation without noisy individual legs.",
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
    print(f"Wrote hookjaw-isopod with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
