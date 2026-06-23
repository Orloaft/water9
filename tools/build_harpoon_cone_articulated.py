#!/usr/bin/env python3
"""Build the prototype articulated Harpoon Cone from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-harpoon-cone-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-harpoon-cone.articulated.json"
PREFIX = "fauna-harpoon-cone"
RUNTIME_ID = "harpoon-cone"
ROOT_CENTER = (317.5, 230.0)


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
        "drag": 0.86 if role in {"torso", "head"} else 1.1,
        "angularDrag": 0.4 if role != "jaw" else 0.52,
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
        "bridgeAlpha": 0.18,
        "bridgeCoreAlpha": 0.07,
        "bridgeWidthScale": 0.94,
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
        "acceptanceNote": "Prototype generated from one magenta-background Harpoon Cone source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    crops = {
        "shell-body": (30, 20, 575, 420),
        "foot-skirt": (45, 300, 610, 180),
        "aperture-lip": (500, 150, 185, 220),
        "siphon-feeler": (565, 90, 145, 180),
        "proboscis-base": (575, 210, 170, 190),
        "proboscis-mid": (675, 295, 175, 150),
        "proboscis-tip": (795, 345, 150, 145),
        "harpoon-tooth": (875, 400, 95, 95),
        "venom-glow": (850, 370, 100, 100),
    }
    centers = {key: center(value) for key, value in crops.items()}
    shell_anchors = {
        "aperture": [240, -8],
        "foot": [-10, 145],
        "siphon": [230, -118],
    }
    aperture_anchors = {
        "shell": [-72, -4],
        "proboscis": [70, 52],
        "siphon": [35, -84],
    }
    foot_anchors = {"root": [0, -70], "tail": [-240, 50]}
    siphon_anchors = {"base": [-56, 54], "tip": [34, -66]}
    proboscis_base_anchors = {"root": [-62, -10], "front": [60, 48]}
    proboscis_mid_anchors = {"root": [-68, -36], "front": [72, 36]}
    proboscis_tip_anchors = {"root": [-52, -30], "front": [56, 28], "glow": [36, -2]}
    tooth_anchors = {"root": [-34, -8], "tip": [34, 24]}
    glow_anchors = {"root": [-4, 2], "tip": [32, 24]}

    parts = [
        part("shell-body", crops["shell-body"], "torso", {"kind": "body", "amplitude": 1.0, "frequency": 1.05, "phase": 0.0, "lag": 0.08}, shell_anchors, 0.04, 58, 1.22, 1.0, 3.5, 1.55, 0.72, damaged=True),
        part("foot-skirt", crops["foot-skirt"], "tail", {"kind": "tail", "amplitude": 2.4, "frequency": 1.2, "phase": 1.3, "lag": 0.34}, foot_anchors, 0.018, 36, 0.78, 0.7, 1.1, 0.9, 0.68, "shell-body", centers["shell-body"], "foot", shell_anchors["foot"], "root"),
        part("aperture-lip", crops["aperture-lip"], "head", {"kind": "body", "amplitude": 1.6, "frequency": 1.25, "phase": 0.3, "lag": 0.12}, aperture_anchors, 0.06, 34, 0.96, 1.1, 1.3, 1.05, 0.74, "shell-body", centers["shell-body"], "aperture", shell_anchors["aperture"], "shell"),
        part("siphon-feeler", crops["siphon-feeler"], "fin", {"kind": "fin", "amplitude": 6.0, "frequency": 2.0, "phase": 1.1, "lag": 0.24}, siphon_anchors, 0.074, 18, 0.48, 0.52, 0.26, 0.5, 0.88, "aperture-lip", centers["aperture-lip"], "siphon", aperture_anchors["siphon"], "base"),
        part("proboscis-base", crops["proboscis-base"], "tail", {"kind": "tail", "amplitude": 4.8, "frequency": 1.65, "phase": 0.5, "lag": 0.28}, proboscis_base_anchors, 0.08, 24, 0.7, 0.86, 0.62, 0.72, 0.82, "aperture-lip", centers["aperture-lip"], "proboscis", aperture_anchors["proboscis"], "root"),
        part("proboscis-mid", crops["proboscis-mid"], "tail", {"kind": "tail", "amplitude": 7.4, "frequency": 1.85, "phase": 0.92, "lag": 0.52}, proboscis_mid_anchors, 0.09, 20, 0.62, 0.92, 0.48, 0.62, 0.9, "proboscis-base", centers["proboscis-base"], "front", proboscis_base_anchors["front"], "root"),
        part("proboscis-tip", crops["proboscis-tip"], "tail", {"kind": "tail", "amplitude": 9.6, "frequency": 2.15, "phase": 1.25, "lag": 0.74}, proboscis_tip_anchors, 0.1, 18, 0.58, 1.0, 0.38, 0.58, 0.94, "proboscis-mid", centers["proboscis-mid"], "front", proboscis_mid_anchors["front"], "root"),
        part("harpoon-tooth", crops["harpoon-tooth"], "jaw", {"kind": "jaw", "amplitude": 14.0, "frequency": 3.1, "phase": 0.1, "lag": 0.08}, tooth_anchors, 0.116, 14, 0.42, 1.4, 0.22, 0.48, 1.0, "proboscis-tip", centers["proboscis-tip"], "front", proboscis_tip_anchors["front"], "root"),
        part("venom-glow", crops["venom-glow"], "fin", {"kind": "fin", "amplitude": 3.6, "frequency": 2.8, "phase": 1.7, "lag": 0.12}, glow_anchors, 0.125, 13, 0.35, 1.08, 0.16, 0.42, 1.0, "proboscis-tip", centers["proboscis-tip"], "glow", proboscis_tip_anchors["glow"], "root"),
    ]
    overlays = [
        overlay("foot-skirt-socket", "shell-body", "foot-skirt", "shell-body", (70, 300, 130, 105), [-18, 52], [130, 105], 0.052, 0.52),
        overlay("aperture-lip-socket", "shell-body", "aperture-lip", "shell-body", (438, 156, 120, 120), [34, 0], [120, 120], 0.072, 0.56),
        overlay("siphon-feeler-socket", "aperture-lip", "siphon-feeler", "aperture-lip", (62, 0, 86, 84), [20, -48], [86, 84], 0.088, 0.5),
        overlay("proboscis-base-socket", "aperture-lip", "proboscis-base", "aperture-lip", (70, 106, 92, 92), [42, 32], [92, 92], 0.096, 0.54),
        overlay("proboscis-mid-socket", "proboscis-base", "proboscis-mid", "proboscis-base", (82, 92, 82, 86), [34, 22], [82, 86], 0.105, 0.52),
        overlay("proboscis-tip-socket", "proboscis-mid", "proboscis-tip", "proboscis-mid", (88, 54, 80, 80), [38, 20], [80, 80], 0.114, 0.5),
        overlay("harpoon-tooth-socket", "proboscis-tip", "harpoon-tooth", "proboscis-tip", (76, 72, 70, 70), [36, 20], [70, 70], 0.13, 0.48),
        overlay("venom-glow-socket", "proboscis-tip", "venom-glow", "proboscis-tip", (56, 42, 70, 70), [26, -4], [70, 70], 0.134, 0.44),
    ]
    socket_style = {
        "alpha": 0.56,
        "bridgeColor": 0x081018,
        "bridgeAlpha": 0.18,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0x78EED2,
        "bridgeCoreAlpha": 0.07,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.94,
        "bridgeSleeveScale": 0.34,
    }
    murk_tint = {"color": 0x86C7B6, "intensity": 0.11, "stunnedIntensity": 0.18}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": RUNTIME_ID,
        "species": "Harpoon Cone",
        "minBiome": 3,
        "color": 0x78EED2,
        "rarity": "epic",
        "radius": 62,
        "hp": 230,
        "speed": [8, 26],
        "spawn": {"minDepth": 920, "maxDepth": 2200, "count": 1},
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
        "displayName": "Harpoon Cone",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-harpoon-cone-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Harpoon Cone source: patterned cone shell, foot skirt, aperture, siphon feeler, segmented proboscis, chitin barb, and venom glow. The forward chain is rigged for aim/strike/retract style motion while preserving the whole-source silhouette for review.",
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
