#!/usr/bin/env python3
"""Build the prototype articulated Velvet Lantern Cuttle from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-velvet-lantern-cuttle-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-velvet-lantern-cuttle.articulated.json"
PREFIX = "fauna-velvet-lantern-cuttle"
RUNTIME_ID = "velvet-lantern-cuttle"
ROOT_CENTER = (580.0, 383.0)


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
        "drag": 0.82 if role in {"torso", "head"} else 1.1,
        "angularDrag": 0.38 if role != "jaw" else 0.56,
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
        "bridgeAlpha": 0.16,
        "bridgeCoreAlpha": 0.07,
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
        "acceptanceNote": "Prototype generated from one magenta-background Velvet Lantern Cuttle source. Needs source, contact-sheet, phase-strip, and sandbox visual acceptance before counting toward the 20-threat goal.",
        "visualChecklist": {},
        "reviewEvidence": {},
    }
    crops = {
        "mantle-core": (230, 128, 700, 510),
        "mantle-tip": (55, 250, 300, 260),
        "fin-skirt-upper": (250, 125, 720, 250),
        "fin-skirt-lower": (300, 470, 820, 270),
        "head-mask": (820, 170, 360, 430),
        "beak-jaw": (1000, 360, 280, 210),
        "arm-crown-upper": (980, 300, 420, 260),
        "arm-crown-lower": (970, 500, 460, 270),
        "strike-tentacle-near": (1110, 340, 530, 220),
        "strike-tentacle-far": (1080, 520, 500, 230),
        "lantern-siphon": (760, 130, 320, 210),
    }
    centers = {key: center(value) for key, value in crops.items()}
    mantle_anchors = {
        "tail": [-310, 18],
        "head": [312, 2],
        "upperFin": [-18, -196],
        "lowerFin": [62, 208],
        "lantern": [244, -170],
    }
    tail_anchors = {"root": [105, -12], "tip": [-116, 22]}
    head_anchors = {"neck": [-116, -2], "beak": [88, 44], "upperArms": [112, 48], "lowerArms": [104, 156], "nearTentacle": [142, 68], "farTentacle": [118, 170], "lantern": [-42, -124]}
    beak_anchors = {"hinge": [-82, -4], "bite": [82, 22]}
    upper_fin_anchors = {"root": [0, 108], "rim": [110, -82]}
    lower_fin_anchors = {"root": [-20, -96], "rim": [170, 92]}
    upper_arm_anchors = {"root": [-116, 10], "tips": [118, 62]}
    lower_arm_anchors = {"root": [-122, -86], "tips": [124, 78]}
    near_tentacle_anchors = {"root": [-178, -2], "club": [186, 18]}
    far_tentacle_anchors = {"root": [-176, -48], "club": [176, 54]}
    lantern_anchors = {"root": [-96, 82], "glow": [96, -46]}

    parts = [
        part("mantle-core", crops["mantle-core"], "torso", {"kind": "body", "amplitude": 1.0, "frequency": 1.0, "phase": 0.0, "lag": 0.08}, mantle_anchors, 0.04, 62, 1.18, 1.0, 3.5, 1.55, 0.68, damaged=True),
        part("mantle-tip", crops["mantle-tip"], "tail", {"kind": "tail", "amplitude": 4.6, "frequency": 1.62, "phase": 1.1, "lag": 0.48}, tail_anchors, 0.022, 26, 0.66, 0.72, 0.6, 0.7, 0.78, "mantle-core", centers["mantle-core"], "tail", mantle_anchors["tail"], "root"),
        part("fin-skirt-upper", crops["fin-skirt-upper"], "fin", {"kind": "fin", "amplitude": 8.4, "frequency": 1.82, "phase": 1.2, "lag": 0.36}, upper_fin_anchors, 0.03, 28, 0.62, 0.58, 0.42, 0.52, 0.96, "mantle-core", centers["mantle-core"], "upperFin", mantle_anchors["upperFin"], "root"),
        part("fin-skirt-lower", crops["fin-skirt-lower"], "fin", {"kind": "fin", "amplitude": 9.0, "frequency": 1.9, "phase": 1.55, "lag": 0.38}, lower_fin_anchors, 0.034, 30, 0.62, 0.58, 0.44, 0.54, 0.96, "mantle-core", centers["mantle-core"], "lowerFin", mantle_anchors["lowerFin"], "root"),
        part("head-mask", crops["head-mask"], "head", {"kind": "body", "amplitude": 1.8, "frequency": 1.25, "phase": 0.18, "lag": 0.12}, head_anchors, 0.066, 42, 1.02, 1.12, 1.45, 1.15, 0.78, "mantle-core", centers["mantle-core"], "head", mantle_anchors["head"], "neck"),
        part("lantern-siphon", crops["lantern-siphon"], "fin", {"kind": "fin", "amplitude": 4.0, "frequency": 2.25, "phase": 0.55, "lag": 0.18}, lantern_anchors, 0.082, 22, 0.5, 0.84, 0.26, 0.46, 0.94, "mantle-core", centers["mantle-core"], "lantern", mantle_anchors["lantern"], "root"),
        part("beak-jaw", crops["beak-jaw"], "jaw", {"kind": "jaw", "amplitude": 8.5, "frequency": 3.0, "phase": 0.15, "lag": 0.08}, beak_anchors, 0.092, 22, 0.5, 1.1, 0.32, 0.54, 0.98, "head-mask", centers["head-mask"], "beak", head_anchors["beak"], "hinge"),
        part("arm-crown-upper", crops["arm-crown-upper"], "jaw", {"kind": "jaw", "amplitude": 11.0, "frequency": 2.7, "phase": 0.4, "lag": 0.12}, upper_arm_anchors, 0.102, 28, 0.56, 0.92, 0.46, 0.62, 0.98, "head-mask", centers["head-mask"], "upperArms", head_anchors["upperArms"], "root"),
        part("arm-crown-lower", crops["arm-crown-lower"], "jaw", {"kind": "jaw", "amplitude": 11.5, "frequency": 2.75, "phase": 0.82, "lag": 0.16}, lower_arm_anchors, 0.106, 30, 0.56, 0.92, 0.48, 0.64, 0.98, "head-mask", centers["head-mask"], "lowerArms", head_anchors["lowerArms"], "root"),
        part("strike-tentacle-near", crops["strike-tentacle-near"], "tail", {"kind": "tail", "amplitude": 12.5, "frequency": 2.35, "phase": 1.05, "lag": 0.28}, near_tentacle_anchors, 0.112, 24, 0.48, 1.0, 0.3, 0.54, 1.0, "head-mask", centers["head-mask"], "nearTentacle", head_anchors["nearTentacle"], "root"),
        part("strike-tentacle-far", crops["strike-tentacle-far"], "tail", {"kind": "tail", "amplitude": 11.5, "frequency": 2.25, "phase": 1.4, "lag": 0.34}, far_tentacle_anchors, 0.108, 24, 0.48, 0.94, 0.3, 0.54, 1.0, "head-mask", centers["head-mask"], "farTentacle", head_anchors["farTentacle"], "root"),
    ]
    overlays = [
        overlay("mantle-tip-socket", "mantle-core", "mantle-tip", "mantle-core", (0, 154, 125, 130), [-304, 14], [125, 130], 0.058, 0.5),
        overlay("head-mask-socket", "mantle-core", "head-mask", "mantle-core", (560, 126, 118, 150), [304, 0], [118, 150], 0.092, 0.54),
        overlay("fin-skirt-upper-socket", "mantle-core", "fin-skirt-upper", "mantle-core", (105, 0, 185, 96), [-12, -184], [185, 96], 0.068, 0.46),
        overlay("fin-skirt-lower-socket", "mantle-core", "fin-skirt-lower", "mantle-core", (150, 384, 210, 100), [62, 196], [210, 100], 0.072, 0.46),
        overlay("lantern-siphon-socket", "mantle-core", "lantern-siphon", "mantle-core", (456, 0, 120, 104), [244, -158], [120, 104], 0.104, 0.46),
        overlay("beak-jaw-socket", "head-mask", "beak-jaw", "head-mask", (170, 170, 98, 86), [82, 42], [98, 86], 0.116, 0.48),
        overlay("arm-crown-upper-socket", "head-mask", "arm-crown-upper", "head-mask", (190, 176, 112, 100), [110, 50], [112, 100], 0.126, 0.48),
        overlay("arm-crown-lower-socket", "head-mask", "arm-crown-lower", "head-mask", (182, 286, 118, 104), [102, 150], [118, 104], 0.13, 0.48),
        overlay("strike-tentacle-near-socket", "head-mask", "strike-tentacle-near", "head-mask", (212, 188, 112, 92), [136, 68], [112, 92], 0.136, 0.46),
        overlay("strike-tentacle-far-socket", "head-mask", "strike-tentacle-far", "head-mask", (202, 312, 116, 90), [118, 168], [116, 90], 0.134, 0.46),
    ]
    socket_style = {
        "alpha": 0.54,
        "bridgeColor": 0x071014,
        "bridgeAlpha": 0.16,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0xF2C46B,
        "bridgeCoreAlpha": 0.07,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.9,
        "bridgeSleeveScale": 0.34,
    }
    murk_tint = {"color": 0x8BCAC0, "intensity": 0.1, "stunnedIntensity": 0.17}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": RUNTIME_ID,
        "species": "Velvet Lantern Cuttle",
        "minBiome": 3,
        "color": 0xF2C46B,
        "rarity": "epic",
        "radius": 64,
        "hp": 225,
        "speed": [18, 54],
        "spawn": {"minDepth": 940, "maxDepth": 2250, "count": 1},
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
        "displayName": "Velvet Lantern Cuttle",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-velvet-lantern-cuttle-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Velvet Lantern Cuttle source: compact cuttlefish-like mantle, velvet fin skirt, head mask, beak, arm crowns, two strike tentacles, rear mantle tip, and lantern siphon. Crop overlap is intentionally generous so the assembled idle silhouette can be judged against the whole-source art before any acceptance.",
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
