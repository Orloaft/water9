#!/usr/bin/env python3
"""Build the prototype articulated Siphon Lily from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-siphon-lily-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-siphon-lily.articulated.json"
ROOT_CENTER = (385.0, 380.0)


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
        "drag": 1.05 if role in {"tail", "fin"} else 0.9,
        "angularDrag": 0.62 if role in {"tail", "fin"} else 0.48,
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
    texture_key = f"fauna-siphon-lily-{part_id}"
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
    alpha: float = 0.5,
) -> dict[str, Any]:
    texture_key = f"fauna-siphon-lily-{overlay_id}"
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
        "bridgeAlpha": 0.15,
        "bridgeCoreAlpha": 0.055,
        "bridgeWidthScale": 0.82,
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
        "alphaFeather": {"all": 10, "curve": 1.45, "minimum": 0.1},
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
    image = apply_alpha_feather(image, {"all": 10, "curve": 1.45, "minimum": 0.1})
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
        "acceptanceNote": "Prototype generated from one magenta-background Siphon Lily source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    crops = {
        "base-foot": (20, 740, 420, 180),
        "stalk-lower": (45, 555, 355, 340),
        "stalk-mid": (85, 360, 300, 350),
        "root-body": (150, 170, 470, 420),
        "cup-head": (130, 55, 620, 365),
        "petal-left": (80, 50, 370, 345),
        "petal-right": (405, 65, 355, 360),
        "rim-fringe": (215, 205, 460, 260),
        "tendril-left": (0, 390, 275, 450),
        "tendril-center": (370, 430, 280, 425),
        "tendril-right": (540, 455, 410, 440),
        "bead-bank": (535, 90, 330, 455),
        "lure-filament": (545, 0, 350, 210),
    }
    centers = {key: center(value) for key, value in crops.items()}
    root_anchors = {
        "head": [30, -150],
        "stalk": [-145, 140],
        "tendrilLeft": [-190, 70],
        "tendrilCenter": [110, 150],
        "tendrilRight": [210, 165],
        "beads": [245, -100],
    }
    head_anchors = {
        "neck": [-40, 120],
        "jawLeft": [-185, -40],
        "jawRight": [175, -45],
        "fringe": [0, 90],
        "lure": [160, -160],
    }
    stalk_mid_anchors = {"top": [100, -140], "bottom": [0, 140]}
    stalk_lower_anchors = {"top": [60, -130], "bottom": [20, 130], "base": [0, 140]}
    base_anchors = {"root": [0, -60]}
    jaw_left_anchors = {"hinge": [126, 64], "tip": [-128, -62]}
    jaw_right_anchors = {"hinge": [-118, 70], "tip": [122, -42]}

    parts = [
        part("base-foot", crops["base-foot"], "tail", {"kind": "tail", "amplitude": 2.2, "frequency": 1.15, "phase": 1.7, "lag": 0.6}, base_anchors, 0.0, 34, 0.9, 0.75, 1.2, 0.95, 0.7, "stalk-lower", centers["stalk-lower"], "base", stalk_lower_anchors["base"], "root"),
        part("stalk-lower", crops["stalk-lower"], "tail", {"kind": "tail", "amplitude": 3.4, "frequency": 1.45, "phase": 1.1, "lag": 0.46}, stalk_lower_anchors, 0.012, 34, 0.86, 0.78, 1.1, 0.9, 0.72, "stalk-mid", centers["stalk-mid"], "bottom", stalk_mid_anchors["bottom"], "top"),
        part("stalk-mid", crops["stalk-mid"], "torso", {"kind": "body", "amplitude": 2.8, "frequency": 1.28, "phase": 0.58, "lag": 0.32}, stalk_mid_anchors, 0.024, 38, 0.96, 0.86, 1.35, 1.05, 0.78, "root-body", centers["root-body"], "stalk", root_anchors["stalk"], "top"),
        part("root-body", crops["root-body"], "torso", {"kind": "body", "amplitude": 1.8, "frequency": 1.18, "phase": 0.0, "lag": 0.12}, root_anchors, 0.038, 52, 1.18, 1.0, 2.3, 1.4, 0.76, damaged=True),
        part("cup-head", crops["cup-head"], "head", {"kind": "body", "amplitude": 1.3, "frequency": 1.12, "phase": 0.18, "lag": 0.08}, head_anchors, 0.056, 46, 1.08, 1.08, 2.0, 1.25, 0.74, "root-body", centers["root-body"], "head", root_anchors["head"], "neck"),
        part("petal-left", crops["petal-left"], "jaw", {"kind": "jaw", "amplitude": 18.0, "frequency": 2.4, "phase": 0.1, "lag": 0.12}, jaw_left_anchors, 0.076, 28, 0.74, 1.18, 0.72, 0.82, 0.78, "cup-head", centers["cup-head"], "jawLeft", head_anchors["jawLeft"], "hinge"),
        part("petal-right", crops["petal-right"], "jaw", {"kind": "jaw", "amplitude": 19.0, "frequency": 2.55, "phase": 0.42, "lag": 0.12}, jaw_right_anchors, 0.078, 28, 0.74, 1.18, 0.72, 0.82, 0.78, "cup-head", centers["cup-head"], "jawRight", head_anchors["jawRight"], "hinge"),
        part("rim-fringe", crops["rim-fringe"], "fin", {"kind": "fin", "amplitude": 4.6, "frequency": 2.2, "phase": 1.2, "lag": 0.28}, {"root": [0, -80], "tip": [0, 90]}, 0.082, 24, 0.62, 0.62, 0.42, 0.62, 0.86, "cup-head", centers["cup-head"], "fringe", head_anchors["fringe"], "root"),
        part("tendril-left", crops["tendril-left"], "tail", {"kind": "tail", "amplitude": 7.0, "frequency": 1.7, "phase": 1.8, "lag": 0.6}, {"root": [118, -120], "tip": [-68, 160]}, 0.018, 30, 0.72, 0.7, 0.58, 0.68, 0.8, "root-body", centers["root-body"], "tendrilLeft", root_anchors["tendrilLeft"], "root"),
        part("tendril-center", crops["tendril-center"], "fin", {"kind": "fin", "amplitude": 8.2, "frequency": 1.85, "phase": 2.25, "lag": 0.58}, {"root": [-60, -140], "tip": [70, 170]}, 0.02, 28, 0.7, 0.72, 0.52, 0.65, 0.82, "root-body", centers["root-body"], "tendrilCenter", root_anchors["tendrilCenter"], "root"),
        part("tendril-right", crops["tendril-right"], "fin", {"kind": "fin", "amplitude": 8.8, "frequency": 1.75, "phase": 2.7, "lag": 0.64}, {"root": [-142, -142], "tip": [150, 150]}, 0.022, 30, 0.7, 0.74, 0.54, 0.68, 0.82, "root-body", centers["root-body"], "tendrilRight", root_anchors["tendrilRight"], "root"),
        part("bead-bank", crops["bead-bank"], "fin", {"kind": "fin", "amplitude": 4.2, "frequency": 1.95, "phase": 0.9, "lag": 0.26}, {"root": [-112, 0], "tip": [102, -72]}, 0.068, 24, 0.58, 0.56, 0.38, 0.55, 0.84, "root-body", centers["root-body"], "beads", root_anchors["beads"], "root"),
        part("lure-filament", crops["lure-filament"], "fin", {"kind": "fin", "amplitude": 7.2, "frequency": 2.35, "phase": 1.65, "lag": 0.34}, {"root": [-104, 82], "tip": [125, -64]}, 0.086, 18, 0.46, 0.52, 0.24, 0.48, 0.9, "cup-head", centers["cup-head"], "lure", head_anchors["lure"], "root"),
    ]
    overlays = [
        overlay("base-foot-socket", "stalk-lower", "base-foot", "stalk-lower", (74, 240, 140, 90), [0, 74], [140, 90], 0.028, 0.48),
        overlay("stalk-lower-socket", "stalk-mid", "stalk-lower", "stalk-mid", (74, 244, 130, 100), [-24, 72], [130, 100], 0.04, 0.52),
        overlay("stalk-mid-socket", "root-body", "stalk-mid", "root-body", (70, 278, 140, 120), [-90, 74], [140, 120], 0.06, 0.54),
        overlay("cup-head-socket", "root-body", "cup-head", "root-body", (150, 38, 150, 130), [0, -76], [150, 130], 0.074, 0.56),
        overlay("petal-left-socket", "cup-head", "petal-left", "cup-head", (52, 80, 132, 112), [-92, -34], [132, 112], 0.092, 0.5),
        overlay("petal-right-socket", "cup-head", "petal-right", "cup-head", (408, 82, 126, 116), [94, -36], [126, 116], 0.094, 0.5),
        overlay("rim-fringe-socket", "cup-head", "rim-fringe", "cup-head", (210, 220, 170, 92), [0, 74], [170, 92], 0.098, 0.48),
        overlay("tendril-left-socket", "root-body", "tendril-left", "root-body", (28, 238, 128, 118), [-128, 64], [128, 118], 0.046, 0.46),
        overlay("tendril-center-socket", "root-body", "tendril-center", "root-body", (270, 258, 128, 118), [72, 90], [128, 118], 0.048, 0.46),
        overlay("tendril-right-socket", "root-body", "tendril-right", "root-body", (322, 268, 132, 118), [120, 98], [132, 118], 0.05, 0.46),
        overlay("bead-bank-socket", "root-body", "bead-bank", "root-body", (330, 46, 124, 132), [124, -70], [124, 132], 0.082, 0.46),
        overlay("lure-filament-socket", "cup-head", "lure-filament", "cup-head", (384, 0, 110, 82), [86, -92], [110, 82], 0.102, 0.44),
    ]
    socket_style = {
        "alpha": 0.52,
        "bridgeColor": 0x07151A,
        "bridgeAlpha": 0.15,
        "bridgeStunnedAlpha": 0.08,
        "bridgeCoreColor": 0x8AF2D2,
        "bridgeCoreAlpha": 0.055,
        "bridgeCoreStunnedAlpha": 0.03,
        "bridgeWidthScale": 0.82,
        "bridgeSleeveScale": 0.3,
    }
    murk_tint = {"color": 0x78D8BC, "intensity": 0.12, "stunnedIntensity": 0.2}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": "siphon-lily",
        "species": "Siphon Lily",
        "minBiome": 3,
        "color": 0x78D8BC,
        "rarity": "epic",
        "radius": 58,
        "hp": 220,
        "speed": [4, 16],
        "spawn": {"minDepth": 760, "maxDepth": 1900, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-siphon-lily",
        "runtimeCreatureId": "siphon-lily",
        "displayName": "Siphon Lily",
        "kind": "articulated-creature",
        "depthBand": "deep",
        "source": "public/assets/generated/fauna-siphon-lily-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Siphon Lily source. The rig uses a rooted stalk, flared cup head, hinged petal jaws, lure filament, bead organs, and three broad tendrils for siphon-pull/snap style motion.",
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
    print(f"Wrote siphon-lily with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
