#!/usr/bin/env python3
"""Build the prototype articulated Thornhalo Urchin from one cohesive source image."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-thornhalo-urchin-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-thornhalo-urchin.articulated.json"
ROOT_CENTER = (600.0, 626.0)


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
        "drag": 1.18 if role in {"fin", "tail"} else 0.92,
        "angularDrag": 0.7 if role in {"fin", "tail"} else 0.48,
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
    parent_anchor_name: str | None = None,
    child_anchor_name: str | None = None,
    parent_anchor_value: list[float] | None = None,
    severable: bool = False,
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"fauna-thornhalo-urchin-{part_id}"
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
        if parent_anchor_name is None or child_anchor_name is None or parent_anchor_value is None:
            raise ValueError(f"{part_id} missing parent anchors")
        item["parentId"] = parent_id
        item["parentAnchor"] = parent_anchor_name
        item["anchor"] = child_anchor_name
        item["restOffset"] = rest_offset_for(crop, ROOT_CENTER, parent_anchor_value, anchors[child_anchor_name])
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
    child_id: str,
    source_crop: tuple[int, int, int, int],
    offset: list[float],
    size: list[float],
    depth: float,
    alpha: float = 0.52,
) -> dict[str, Any]:
    texture_key = f"fauna-thornhalo-urchin-{overlay_id}"
    return {
        "id": overlay_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "parentId": "body-core",
        "childId": child_id,
        "sourcePartId": "body-core",
        "sourceCrop": crop_dict(source_crop),
        "offset": offset,
        "origin": [0.5, 0.5],
        "size": size,
        "depth": depth,
        "alpha": alpha,
        "bridgeAlpha": 0.16,
        "bridgeCoreAlpha": 0.06,
        "bridgeWidthScale": 0.78,
        "bridgeSleeveScale": 0.24,
    }


def source_overlay(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "src": item["texture"],
        "parentId": item["parentId"],
        "childId": item["childId"],
        "sourcePartId": item["sourcePartId"],
        "sourceCrop": item["sourceCrop"],
        "alphaFeather": {"all": 12, "curve": 1.4, "minimum": 0.1},
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
    image = apply_alpha_feather(image, {"all": 12, "curve": 1.4, "minimum": 0.1})
    image.save(GENERATED / item["texture"])


def radial_anchor(angle_deg: float, radius: float = 250.0) -> list[float]:
    angle = math.radians(angle_deg)
    return [round(math.cos(angle) * radius, 2), round(math.sin(angle) * radius, 2)]


def main() -> int:
    if not SOURCE.exists():
        raise FileNotFoundError(f"missing source {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Prototype generated from one magenta-background Thornhalo Urchin source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    body_crop = (330, 310, 540, 570)
    spine_specs = {
        "spine-n": {"crop": (455, 20, 310, 405), "angle": -90, "anchor": [0, 175], "parent": radial_anchor(-90, 245), "phase": 0.0},
        "spine-ne": {"crop": (690, 95, 390, 380), "angle": -45, "anchor": [-132, 132], "parent": radial_anchor(-45, 255), "phase": 0.45},
        "spine-e": {"crop": (760, 390, 410, 270), "angle": 0, "anchor": [-178, 12], "parent": radial_anchor(0, 258), "phase": 0.9},
        "spine-se": {"crop": (660, 640, 385, 430), "angle": 45, "anchor": [-120, -142], "parent": radial_anchor(45, 255), "phase": 1.35},
        "spine-s": {"crop": (410, 750, 390, 455), "angle": 90, "anchor": [0, -190], "parent": radial_anchor(90, 250), "phase": 1.8},
        "spine-sw": {"crop": (112, 620, 420, 415), "angle": 135, "anchor": [135, -135], "parent": radial_anchor(135, 255), "phase": 2.25},
        "spine-w": {"crop": (20, 390, 430, 290), "angle": 180, "anchor": [190, 4], "parent": radial_anchor(180, 258), "phase": 2.7},
        "spine-nw": {"crop": (110, 92, 410, 395), "angle": -135, "anchor": [138, 138], "parent": radial_anchor(-135, 255), "phase": 3.15},
    }
    anchors = {key: spec["parent"] for key, spec in spine_specs.items()}
    anchors.update({"cap": [0, -24], "feet": [0, 170]})
    parts = [
        part(
            "body-core",
            body_crop,
            "torso",
            {"kind": "body", "amplitude": 1.4, "frequency": 1.15, "phase": 0.0, "lag": 0.1},
            anchors,
            0.05,
            62,
            1.2,
            1.0,
            3.4,
            1.55,
            0.55,
            damaged=True,
        ),
        part(
            "top-plate",
            (396, 250, 420, 310),
            "head",
            {"kind": "body", "amplitude": 0.9, "frequency": 1.05, "phase": 0.3, "lag": 0.08},
            {"root": [0, 78]},
            0.07,
            38,
            0.92,
            0.82,
            1.0,
            0.9,
            0.5,
            "body-core",
            "cap",
            "root",
            anchors["cap"],
        ),
        part(
            "tube-feet-ring",
            (285, 625, 590, 315),
            "fin",
            {"kind": "fin", "amplitude": 3.2, "frequency": 2.2, "phase": 1.0, "lag": 0.28},
            {"root": [0, -118]},
            0.03,
            42,
            0.72,
            0.62,
            0.55,
            0.58,
            0.68,
            "body-core",
            "feet",
            "root",
            anchors["feet"],
        ),
    ]
    for part_id, spec in spine_specs.items():
        parts.append(
            part(
                part_id,
                spec["crop"],
                "tail",
                {"kind": "tail", "amplitude": 5.2, "frequency": 1.85, "phase": spec["phase"], "lag": 0.65},
                {"root": spec["anchor"], "tip": [-spec["anchor"][0], -spec["anchor"][1]]},
                0.08 + len(parts) * 0.004,
                22,
                0.64,
                1.08,
                0.42,
                0.7,
                0.74,
                "body-core",
                part_id,
                "root",
                spec["parent"],
                severable=False,
            )
        )
    overlays = [
        overlay("top-plate-socket", "top-plate", (206, 0, 128, 100), [0, -24], [128, 100], 0.078, 0.48),
        overlay("tube-feet-socket", "tube-feet-ring", (180, 438, 170, 104), [0, 168], [170, 104], 0.058, 0.46),
    ]
    for index, part_id in enumerate(spine_specs):
        parent = spine_specs[part_id]["parent"]
        overlays.append(
            overlay(
                f"{part_id}-socket",
                part_id,
                (230 + int(parent[0] * 0.42), 250 + int(parent[1] * 0.42), 92, 92),
                [round(parent[0] * 0.34, 2), round(parent[1] * 0.34, 2)],
                [92, 92],
                0.13 + index * 0.004,
                0.5,
            )
        )
    socket_style = {
        "alpha": 0.52,
        "bridgeColor": 0x081018,
        "bridgeAlpha": 0.16,
        "bridgeStunnedAlpha": 0.09,
        "bridgeCoreColor": 0x7BC9B4,
        "bridgeCoreAlpha": 0.06,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.78,
        "bridgeSleeveScale": 0.24,
    }
    murk_tint = {"color": 0x76BBA9, "intensity": 0.11, "stunnedIntensity": 0.18}
    part_images: dict[str, Image.Image] = {}
    for item in parts:
        write_part(source, item)
        part_images[item["id"]] = Image.open(GENERATED / item["texture"]).convert("RGBA")
    for item in overlays:
        write_overlay(part_images, item)

    creature = {
        "id": "thornhalo-urchin",
        "species": "Thornhalo Urchin",
        "minBiome": 2,
        "color": 0x7BC9B4,
        "rarity": "rare",
        "radius": 70,
        "hp": 185,
        "speed": [8, 18],
        "spawn": {"minDepth": 260, "maxDepth": 1200, "count": 2},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in item.items() if key != "sourceCrop"} for item in parts],
        "socketOverlays": [{key: value for key, value in item.items() if key not in {"sourcePartId", "sourceCrop"}} for item in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-thornhalo-urchin",
        "runtimeCreatureId": "thornhalo-urchin",
        "displayName": "Thornhalo Urchin",
        "kind": "articulated-creature",
        "depthBand": "deep",
        "source": "public/assets/generated/fauna-thornhalo-urchin-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(item) for item in parts],
        "socketOverlays": [source_overlay(item) for item in overlays],
        "notes": "Prototype built from one magenta-background Thornhalo Urchin source. The rig emphasizes a heavy central test with eight dominant socketed spines and a tube-foot fringe for radial zone-denial motion.",
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
    print(f"Wrote thornhalo-urchin with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
