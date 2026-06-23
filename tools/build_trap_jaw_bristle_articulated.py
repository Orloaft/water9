#!/usr/bin/env python3
"""Build the prototype articulated Trap-Jaw Bristle from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-trap-jaw-bristle-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-trap-jaw-bristle.articulated.json"
PREFIX = "fauna-trap-jaw-bristle"
RUNTIME_ID = "trap-jaw-bristle"
ROOT_CENTER = (800.0, 425.0)


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
        "drag": 0.84 if role in {"torso", "head"} else 1.08,
        "angularDrag": 0.42 if role != "jaw" else 0.58,
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
    origin: list[float] | None = None,
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"{PREFIX}-{part_id}"
    x, y, width, height = crop
    item: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop_dict(crop),
        "offset": [round(center(crop)[0] - ROOT_CENTER[0], 2), round(center(crop)[1] - ROOT_CENTER[1], 2)],
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
    texture_key = f"{PREFIX}-{overlay_id}"
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
        "bridgeAlpha": 0.17,
        "bridgeCoreAlpha": 0.075,
        "bridgeWidthScale": 0.9,
        "bridgeSleeveScale": 0.34,
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
        "reviewedAt": None,
        "acceptanceNote": "Prototype generated from one magenta-background Trap-Jaw Bristle source. Needs source, contact-sheet, phase-strip, and sandbox visual acceptance before counting toward the 20-threat goal.",
        "visualChecklist": {},
        "reviewEvidence": {},
    }
    crops = {
        "thorax-chain": (500, 250, 600, 350),
        "abdomen-chain": (260, 340, 520, 300),
        "tail-anchor": (90, 430, 310, 250),
        "front-collar": (890, 250, 330, 330),
        "head-shield": (1050, 250, 340, 350),
        "throat-piston": (1120, 335, 310, 200),
        "upper-mandible": (1210, 220, 390, 250),
        "lower-mandible": (1200, 410, 390, 280),
        "bristle-fan-upper": (420, 230, 650, 190),
        "bristle-fan-lower": (420, 495, 760, 195),
        "lateral-bristle-collar": (900, 350, 410, 230),
    }
    centers = {key: center(value) for key, value in crops.items()}
    thorax_anchors = {
        "abdomen": [-230, 42],
        "collar": [232, -8],
        "upperBristle": [-42, -128],
        "lowerBristle": [0, 132],
    }
    abdomen_anchors = {"thorax": [170, -10], "tail": [-170, 64]}
    tail_anchors = {"root": [96, -12], "hook": [-96, 52]}
    collar_anchors = {"thorax": [-118, 20], "head": [112, -4], "bristles": [48, 78]}
    head_anchors = {"neck": [-126, 20], "throat": [30, 32], "upperJaw": [122, -76], "lowerJaw": [116, 88]}
    throat_anchors = {"root": [-92, 2], "tip": [98, 4]}
    upper_jaw_anchors = {"hinge": [-130, 62], "hook": [132, -40]}
    lower_jaw_anchors = {"hinge": [-128, -64], "hook": [130, 58]}
    upper_bristle_anchors = {"root": [-20, 82], "tips": [120, -68]}
    lower_bristle_anchors = {"root": [-20, -84], "tips": [160, 66]}
    collar_bristle_anchors = {"root": [-96, -8], "fan": [106, 34]}

    parts = [
        part("thorax-chain", crops["thorax-chain"], "torso", {"kind": "body", "amplitude": 1.2, "frequency": 1.05, "phase": 0.0, "lag": 0.08}, thorax_anchors, 0.04, 60, 1.18, 1.0, 3.4, 1.5, 0.62, damaged=True),
        part("abdomen-chain", crops["abdomen-chain"], "torso", {"kind": "body", "amplitude": 2.4, "frequency": 1.18, "phase": 0.55, "lag": 0.32}, abdomen_anchors, 0.032, 46, 0.88, 0.82, 2.0, 1.0, 0.68, "thorax-chain", centers["thorax-chain"], "abdomen", thorax_anchors["abdomen"], "thorax", damaged=True),
        part("tail-anchor", crops["tail-anchor"], "tail", {"kind": "tail", "amplitude": 5.8, "frequency": 1.55, "phase": 1.05, "lag": 0.62}, tail_anchors, 0.022, 28, 0.62, 0.7, 0.74, 0.72, 0.78, "abdomen-chain", centers["abdomen-chain"], "tail", abdomen_anchors["tail"], "root"),
        part("front-collar", crops["front-collar"], "torso", {"kind": "body", "amplitude": 1.9, "frequency": 1.22, "phase": 0.22, "lag": 0.16}, collar_anchors, 0.052, 44, 0.96, 0.96, 1.5, 1.08, 0.72, "thorax-chain", centers["thorax-chain"], "collar", thorax_anchors["collar"], "thorax", damaged=True),
        part("head-shield", crops["head-shield"], "head", {"kind": "body", "amplitude": 2.4, "frequency": 1.36, "phase": 0.34, "lag": 0.12}, head_anchors, 0.072, 42, 1.05, 1.18, 1.55, 1.2, 0.78, "front-collar", centers["front-collar"], "head", collar_anchors["head"], "neck"),
        part("throat-piston", crops["throat-piston"], "jaw", {"kind": "jaw", "amplitude": 6.0, "frequency": 2.4, "phase": 0.6, "lag": 0.08}, throat_anchors, 0.084, 24, 0.52, 0.82, 0.35, 0.52, 0.9, "head-shield", centers["head-shield"], "throat", head_anchors["throat"], "root"),
        part("upper-mandible", crops["upper-mandible"], "jaw", {"kind": "jaw", "amplitude": 18.0, "frequency": 3.2, "phase": 0.04, "lag": 0.06}, upper_jaw_anchors, 0.102, 28, 0.64, 1.36, 0.44, 0.72, 0.96, "head-shield", centers["head-shield"], "upperJaw", head_anchors["upperJaw"], "hinge"),
        part("lower-mandible", crops["lower-mandible"], "jaw", {"kind": "jaw", "amplitude": 18.0, "frequency": 3.2, "phase": 0.18, "lag": 0.06}, lower_jaw_anchors, 0.106, 28, 0.64, 1.36, 0.44, 0.72, 0.96, "head-shield", centers["head-shield"], "lowerJaw", head_anchors["lowerJaw"], "hinge"),
        part("bristle-fan-upper", crops["bristle-fan-upper"], "fin", {"kind": "fin", "amplitude": 7.2, "frequency": 2.0, "phase": 1.2, "lag": 0.26}, upper_bristle_anchors, 0.064, 24, 0.46, 0.58, 0.28, 0.48, 0.94, "thorax-chain", centers["thorax-chain"], "upperBristle", thorax_anchors["upperBristle"], "root"),
        part("bristle-fan-lower", crops["bristle-fan-lower"], "fin", {"kind": "fin", "amplitude": 7.8, "frequency": 2.05, "phase": 1.65, "lag": 0.3}, lower_bristle_anchors, 0.068, 26, 0.46, 0.58, 0.3, 0.5, 0.94, "thorax-chain", centers["thorax-chain"], "lowerBristle", thorax_anchors["lowerBristle"], "root"),
        part("lateral-bristle-collar", crops["lateral-bristle-collar"], "fin", {"kind": "fin", "amplitude": 8.6, "frequency": 2.35, "phase": 1.9, "lag": 0.22}, collar_bristle_anchors, 0.086, 24, 0.48, 0.7, 0.28, 0.48, 0.98, "front-collar", centers["front-collar"], "bristles", collar_anchors["bristles"], "root"),
    ]
    overlays = [
        overlay("abdomen-chain-socket", "thorax-chain", "abdomen-chain", "thorax-chain", (0, 84, 154, 174), [-220, 22], [154, 174], 0.074, 0.5),
        overlay("tail-anchor-socket", "abdomen-chain", "tail-anchor", "abdomen-chain", (0, 112, 120, 136), [-172, 56], [120, 136], 0.056, 0.48),
        overlay("front-collar-socket", "thorax-chain", "front-collar", "thorax-chain", (452, 88, 128, 178), [224, -8], [128, 178], 0.092, 0.52),
        overlay("head-shield-socket", "front-collar", "head-shield", "front-collar", (198, 78, 118, 160), [106, -2], [118, 160], 0.112, 0.52),
        overlay("throat-piston-socket", "head-shield", "throat-piston", "head-shield", (110, 144, 110, 94), [32, 28], [110, 94], 0.126, 0.48),
        overlay("upper-mandible-socket", "head-shield", "upper-mandible", "head-shield", (204, 20, 112, 104), [112, -72], [112, 104], 0.134, 0.5),
        overlay("lower-mandible-socket", "head-shield", "lower-mandible", "head-shield", (198, 226, 118, 106), [110, 84], [118, 106], 0.138, 0.5),
        overlay("bristle-fan-upper-socket", "thorax-chain", "bristle-fan-upper", "thorax-chain", (204, 0, 164, 110), [-34, -118], [164, 110], 0.096, 0.45),
        overlay("bristle-fan-lower-socket", "thorax-chain", "bristle-fan-lower", "thorax-chain", (214, 236, 166, 104), [-4, 126], [166, 104], 0.1, 0.45),
        overlay("lateral-bristle-collar-socket", "front-collar", "lateral-bristle-collar", "front-collar", (122, 172, 138, 104), [48, 78], [138, 104], 0.124, 0.45),
    ]
    socket_style = {
        "alpha": 0.54,
        "bridgeColor": 0x071015,
        "bridgeAlpha": 0.17,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0xD6E8C8,
        "bridgeCoreAlpha": 0.075,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.9,
        "bridgeSleeveScale": 0.34,
    }
    murk_tint = {"color": 0x9EBEAE, "intensity": 0.1, "stunnedIntensity": 0.17}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": RUNTIME_ID,
        "species": "Trap-Jaw Bristle",
        "minBiome": 3,
        "color": 0xD6E8C8,
        "rarity": "epic",
        "radius": 66,
        "hp": 240,
        "speed": [10, 34],
        "spawn": {"minDepth": 980, "maxDepth": 2350, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": PREFIX,
        "runtimeCreatureId": RUNTIME_ID,
        "displayName": "Trap-Jaw Bristle",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-trap-jaw-bristle-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Trap-Jaw Bristle source: segmented ambush worm with trap mandibles, throat piston, bristle fans, front collar, abdomen chain, and tail anchor. The crop plan deliberately preserves overlap from the whole source so the assembled silhouette can be judged against the original art before any acceptance.",
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(json.dumps(source_manifest, indent=2) + "\n")

    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    creatures = runtime.setdefault("creatures", [])
    creatures[:] = [candidate for candidate in creatures if candidate.get("id") != RUNTIME_ID]
    creatures.append(creature)
    RUNTIME_MANIFEST.write_text(json.dumps(runtime, indent=2) + "\n")
    print(f"Wrote {RUNTIME_ID} with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
