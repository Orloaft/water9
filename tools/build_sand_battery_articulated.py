#!/usr/bin/env python3
"""Build the prototype articulated Sand Battery from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-sand-battery-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-sand-battery.articulated.json"
PREFIX = "fauna-sand-battery"
RUNTIME_ID = "sand-battery"
ROOT_CENTER = (440.0, 265.0)


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
        "drag": 0.84 if role in {"torso", "head"} else 1.12,
        "angularDrag": 0.42 if role != "jaw" else 0.56,
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
        "bridgeWidthScale": 0.88,
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
        "acceptanceNote": "Prototype generated from one magenta-background Sand Battery source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    crops = {
        "root-body": (95, 55, 690, 420),
        "head-plate": (560, 35, 320, 330),
        "jaw-lip": (690, 120, 240, 260),
        "eye-bank": (520, 20, 330, 120),
        "near-electrode-pad": (615, 110, 240, 210),
        "far-electrode-pad": (380, 45, 260, 180),
        "dorsal-venom-spine": (650, 0, 290, 150),
        "pectoral-frill-near": (515, 305, 310, 210),
        "pectoral-frill-far": (115, 295, 320, 210),
        "sand-skirt": (95, 360, 760, 165),
        "tail-stub": (20, 150, 250, 260),
    }
    centers = {key: center(value) for key, value in crops.items()}
    body_anchors = {
        "head": [250, -80],
        "tail": [-270, 6],
        "farFin": [-210, 150],
        "nearFin": [150, 165],
        "skirt": [0, 180],
        "farElectrode": [80, -145],
    }
    head_anchors = {
        "neck": [-118, 42],
        "jaw": [118, 76],
        "eyes": [-18, -108],
        "nearElectrode": [62, 28],
        "spine": [112, -112],
    }
    tail_anchors = {"root": [100, -4], "tip": [-102, 42]}
    far_fin_anchors = {"root": [110, -82], "tip": [-110, 82]}
    near_fin_anchors = {"root": [-112, -80], "tip": [122, 82]}
    skirt_anchors = {"root": [0, -66], "edge": [0, 62]}
    eye_anchors = {"root": [0, 48], "watch": [84, -26]}
    electrode_near_anchors = {"root": [-84, -32], "pulse": [72, 40]}
    electrode_far_anchors = {"root": [92, 50], "pulse": [-88, -36]}
    spine_anchors = {"root": [-72, 46], "tip": [86, -52]}
    jaw_anchors = {"hinge": [-86, -18], "bite": [88, 54]}

    parts = [
        part("root-body", crops["root-body"], "torso", {"kind": "body", "amplitude": 1.1, "frequency": 1.08, "phase": 0.0, "lag": 0.08}, body_anchors, 0.04, 64, 1.24, 1.0, 3.7, 1.6, 0.62, damaged=True),
        part("tail-stub", crops["tail-stub"], "tail", {"kind": "tail", "amplitude": 5.8, "frequency": 1.65, "phase": 1.1, "lag": 0.58}, tail_anchors, 0.018, 24, 0.68, 0.74, 0.62, 0.72, 0.74, "root-body", centers["root-body"], "tail", body_anchors["tail"], "root"),
        part("pectoral-frill-far", crops["pectoral-frill-far"], "fin", {"kind": "fin", "amplitude": 5.2, "frequency": 1.8, "phase": 1.55, "lag": 0.4}, far_fin_anchors, 0.024, 34, 0.74, 0.68, 0.72, 0.72, 0.82, "root-body", centers["root-body"], "farFin", body_anchors["farFin"], "root"),
        part("sand-skirt", crops["sand-skirt"], "fin", {"kind": "fin", "amplitude": 2.6, "frequency": 2.05, "phase": 1.25, "lag": 0.24}, skirt_anchors, 0.03, 38, 0.64, 0.58, 0.5, 0.58, 0.78, "root-body", centers["root-body"], "skirt", body_anchors["skirt"], "root"),
        part("pectoral-frill-near", crops["pectoral-frill-near"], "fin", {"kind": "fin", "amplitude": 6.0, "frequency": 1.85, "phase": 1.9, "lag": 0.42}, near_fin_anchors, 0.036, 34, 0.74, 0.7, 0.72, 0.72, 0.84, "root-body", centers["root-body"], "nearFin", body_anchors["nearFin"], "root"),
        part("far-electrode-pad", crops["far-electrode-pad"], "fin", {"kind": "fin", "amplitude": 3.8, "frequency": 2.35, "phase": 0.75, "lag": 0.16}, electrode_far_anchors, 0.052, 28, 0.66, 0.9, 0.44, 0.58, 0.88, "root-body", centers["root-body"], "farElectrode", body_anchors["farElectrode"], "root"),
        part("head-plate", crops["head-plate"], "head", {"kind": "body", "amplitude": 1.7, "frequency": 1.28, "phase": 0.18, "lag": 0.12}, head_anchors, 0.066, 46, 1.06, 1.12, 1.7, 1.22, 0.74, "root-body", centers["root-body"], "head", body_anchors["head"], "neck"),
        part("eye-bank", crops["eye-bank"], "fin", {"kind": "fin", "amplitude": 4.2, "frequency": 2.3, "phase": 0.4, "lag": 0.18}, eye_anchors, 0.082, 18, 0.46, 0.56, 0.24, 0.46, 0.9, "head-plate", centers["head-plate"], "eyes", head_anchors["eyes"], "root"),
        part("near-electrode-pad", crops["near-electrode-pad"], "fin", {"kind": "fin", "amplitude": 4.8, "frequency": 2.55, "phase": 1.05, "lag": 0.2}, electrode_near_anchors, 0.09, 28, 0.66, 0.94, 0.44, 0.58, 0.9, "head-plate", centers["head-plate"], "nearElectrode", head_anchors["nearElectrode"], "root"),
        part("dorsal-venom-spine", crops["dorsal-venom-spine"], "fin", {"kind": "fin", "amplitude": 8.4, "frequency": 2.05, "phase": 1.35, "lag": 0.34}, spine_anchors, 0.098, 22, 0.54, 1.12, 0.3, 0.52, 0.92, "head-plate", centers["head-plate"], "spine", head_anchors["spine"], "root"),
        part("jaw-lip", crops["jaw-lip"], "jaw", {"kind": "jaw", "amplitude": 17.0, "frequency": 3.0, "phase": 0.1, "lag": 0.08}, jaw_anchors, 0.112, 26, 0.62, 1.28, 0.44, 0.7, 0.94, "head-plate", centers["head-plate"], "jaw", head_anchors["jaw"], "hinge"),
    ]
    overlays = [
        overlay("tail-stub-socket", "root-body", "tail-stub", "root-body", (0, 150, 120, 112), [-58, 0], [120, 112], 0.052, 0.52),
        overlay("pectoral-frill-far-socket", "root-body", "pectoral-frill-far", "root-body", (0, 260, 142, 112), [-74, 48], [142, 112], 0.056, 0.5),
        overlay("sand-skirt-socket", "root-body", "sand-skirt", "root-body", (218, 304, 190, 100), [0, 86], [190, 100], 0.06, 0.46),
        overlay("pectoral-frill-near-socket", "root-body", "pectoral-frill-near", "root-body", (420, 264, 140, 118), [58, 58], [140, 118], 0.064, 0.5),
        overlay("far-electrode-pad-socket", "root-body", "far-electrode-pad", "root-body", (288, 0, 126, 110), [42, -72], [126, 110], 0.076, 0.5),
        overlay("head-plate-socket", "root-body", "head-plate", "root-body", (500, 34, 142, 132), [70, -38], [142, 132], 0.086, 0.56),
        overlay("eye-bank-socket", "head-plate", "eye-bank", "head-plate", (40, 0, 120, 78), [-12, -58], [120, 78], 0.102, 0.46),
        overlay("near-electrode-pad-socket", "head-plate", "near-electrode-pad", "head-plate", (76, 98, 118, 104), [42, 16], [118, 104], 0.106, 0.5),
        overlay("dorsal-venom-spine-socket", "head-plate", "dorsal-venom-spine", "head-plate", (150, 0, 104, 82), [58, -58], [104, 82], 0.112, 0.48),
        overlay("jaw-lip-socket", "head-plate", "jaw-lip", "head-plate", (170, 134, 112, 98), [70, 40], [112, 98], 0.126, 0.5),
    ]
    socket_style = {
        "alpha": 0.54,
        "bridgeColor": 0x0A1014,
        "bridgeAlpha": 0.17,
        "bridgeStunnedAlpha": 0.1,
        "bridgeCoreColor": 0xB5F2FF,
        "bridgeCoreAlpha": 0.075,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.88,
        "bridgeSleeveScale": 0.32,
    }
    murk_tint = {"color": 0x9DBFAE, "intensity": 0.1, "stunnedIntensity": 0.17}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": RUNTIME_ID,
        "species": "Sand Battery",
        "minBiome": 2,
        "color": 0xB5F2FF,
        "rarity": "rare",
        "radius": 68,
        "hp": 210,
        "speed": [4, 18],
        "spawn": {"minDepth": 540, "maxDepth": 1650, "count": 1},
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
        "displayName": "Sand Battery",
        "kind": "articulated-creature",
        "depthBand": "deep",
        "source": "public/assets/generated/fauna-sand-battery-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Sand Battery source: flattened stargazer-inspired electric ambusher with head plate, mouth hinge, electrode pads, venom spine, shovel fins, tail stub, and burial skirt. Motion emphasizes buried idle, charge pulse, discharge flare, and rebury sifting.",
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
