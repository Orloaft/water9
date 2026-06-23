#!/usr/bin/env python3
"""Build the prototype articulated Chainmaw Eel from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-chainmaw-eel-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-chainmaw-eel.articulated.json"


def crop_dict(box: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = box
    return {"x": x, "y": y, "width": width, "height": height}


def crop_box(crop: dict[str, int]) -> tuple[int, int, int, int]:
    return (crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])


def anatomy(role: str, mass: float, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 0.88 if role in {"torso", "head"} else 1.08,
        "angularDrag": 0.38 if role != "jaw" else 0.52,
        "severable": False,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
    }


def runtime_part(
    part_id: str,
    crop: tuple[int, int, int, int],
    depth: float,
    hit_radius: float,
    hp_multiplier: float,
    damage_multiplier: float,
    role: str,
    mass: float,
    break_threshold: float,
    mobility: float,
    motion: dict[str, Any],
    anchors: dict[str, list[float]],
    parent_id: str | None = None,
    parent_anchor: str | None = None,
    anchor: str | None = None,
    rest_offset: list[float] | None = None,
    origin: list[float] | None = None,
    damaged: bool = False,
) -> dict[str, Any]:
    texture_key = f"fauna-chainmaw-eel-{part_id}"
    x, y, width, height = crop
    part: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop_dict(crop),
        "offset": [x + width / 2 - 718, y + height / 2 - 208],
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
        part["parentId"] = parent_id
        part["parentAnchor"] = parent_anchor
        part["anchor"] = anchor
        part["restOffset"] = rest_offset or [0, 0]
    if damaged:
        part["damagedTextureKey"] = f"{texture_key}-damaged"
        part["damagedTexture"] = f"{texture_key}-damaged.png"
    return part


def source_part(part: dict[str, Any]) -> dict[str, Any]:
    result = {
        "id": part["id"],
        "key": part["textureKey"],
        "src": part["texture"],
        "sourceCrop": part["sourceCrop"],
        "size": {
            "width": part["sourceCrop"]["width"],
            "height": part["sourceCrop"]["height"],
        },
        "anatomy": part["anatomy"],
        "motion": part["motion"],
    }
    if part.get("damagedTexture"):
        result["damagedSrc"] = part["damagedTexture"]
        result["damagedKey"] = part["damagedTextureKey"]
        result["damagedProcess"] = "deterministic dark wound and crack overlay"
    return result


def runtime_overlay(
    overlay_id: str,
    parent_id: str,
    child_id: str,
    source_part_id: str,
    source_crop: tuple[int, int, int, int],
    offset: list[float],
    size: list[float],
    depth: float,
    alpha: float = 0.58,
) -> dict[str, Any]:
    texture_key = f"fauna-chainmaw-eel-{overlay_id}"
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
        "bridgeAlpha": 0.2,
        "bridgeCoreAlpha": 0.08,
        "bridgeWidthScale": 0.98,
        "bridgeSleeveScale": 0.36,
    }


def source_overlay(overlay: dict[str, Any]) -> dict[str, Any]:
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


def write_part(source: Image.Image, part: dict[str, Any]) -> None:
    image = source.crop(crop_box(part["sourceCrop"]))
    image.save(GENERATED / part["texture"])
    if part.get("damagedTexture"):
        apply_body_cripple_damage(image).save(GENERATED / part["damagedTexture"])


def write_overlay(part_images: dict[str, Image.Image], overlay: dict[str, Any]) -> None:
    source_part = part_images[overlay["sourcePartId"]]
    image = source_part.crop(crop_box(overlay["sourceCrop"]))
    image = apply_alpha_feather(image, {"all": 9, "curve": 1.5, "minimum": 0.15})
    image.save(GENERATED / overlay["texture"])


def main() -> int:
    if not SOURCE.exists():
        raise FileNotFoundError(f"missing Chainmaw source image: {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Prototype generated from one magenta-background Chainmaw source. Needs sandbox/contact-sheet acceptance before counting toward the 20-threat goal.",
    }
    parts = [
        runtime_part(
            "tail",
            (20, 130, 260, 250),
            0.0,
            23,
            0.72,
            0.72,
            "tail",
            0.82,
            0.78,
            0.58,
            {"kind": "tail", "amplitude": 12.8, "frequency": 2.55, "phase": 1.72, "lag": 1.55},
            {"front": [110, 10], "tip": [-118, 28]},
            "body-5",
            "back",
            "front",
            [22, 2],
        ),
        runtime_part(
            "body-5",
            (175, 112, 290, 270),
            0.01,
            29,
            0.86,
            0.82,
            "tail",
            1.2,
            0.9,
            0.68,
            {"kind": "tail", "amplitude": 9.8, "frequency": 2.35, "phase": 1.25, "lag": 1.18},
            {"front": [126, 2], "back": [-120, 8]},
            "body-4",
            "back",
            "front",
            [36, 0],
        ),
        runtime_part(
            "body-4",
            (390, 88, 300, 292),
            0.02,
            35,
            0.96,
            0.92,
            "torso",
            2.0,
            1.2,
            0.78,
            {"kind": "body", "amplitude": 7.2, "frequency": 2.05, "phase": 0.92, "lag": 0.88},
            {"front": [130, 0], "back": [-132, 2]},
            "body-3",
            "back",
            "front",
            [42, 0],
        ),
        runtime_part(
            "body-3",
            (600, 52, 315, 314),
            0.03,
            42,
            1.05,
            1.0,
            "torso",
            2.6,
            1.35,
            0.84,
            {"kind": "body", "amplitude": 5.5, "frequency": 1.9, "phase": 0.62, "lag": 0.62},
            {"front": [138, -2], "back": [-136, 4]},
            "body-2",
            "back",
            "front",
            [46, 0],
        ),
        runtime_part(
            "body-2",
            (805, 22, 318, 340),
            0.04,
            46,
            1.08,
            1.0,
            "torso",
            2.9,
            1.42,
            0.86,
            {"kind": "body", "amplitude": 3.8, "frequency": 1.75, "phase": 0.38, "lag": 0.42},
            {"front": [140, 0], "back": [-138, 0]},
            "body-1",
            "back",
            "front",
            [44, 0],
            damaged=True,
        ),
        runtime_part(
            "body-1",
            (990, 24, 300, 342),
            0.05,
            47,
            1.12,
            1.02,
            "torso",
            3.05,
            1.48,
            0.86,
            {"kind": "body", "amplitude": 2.2, "frequency": 1.55, "phase": 0.14, "lag": 0.18},
            {"front": [112, 8], "back": [-128, 2], "jawBase": [98, 70]},
        ),
        runtime_part(
            "head",
            (1120, 48, 293, 346),
            0.06,
            45,
            1.16,
            1.15,
            "head",
            2.8,
            1.65,
            0.64,
            {"kind": "body", "amplitude": 1.2, "frequency": 1.35, "phase": 0, "lag": 0.08},
            {"neck": [-112, -2], "lowerJaw": [10, 72], "bite": [118, 26]},
            "body-1",
            "front",
            "neck",
            [22, -2],
        ),
        runtime_part(
            "jaw",
            (1190, 188, 230, 190),
            0.07,
            25,
            0.68,
            1.25,
            "jaw",
            0.7,
            0.85,
            0.88,
            {"kind": "jaw", "amplitude": 20.0, "frequency": 3.3, "phase": 0.2, "lag": 0.1},
            {"hinge": [-92, -36], "bite": [86, 34]},
            "head",
            "lowerJaw",
            "hinge",
            [-8, -4],
            origin=[0.42, 0.42],
        ),
    ]
    overlays = [
        runtime_overlay("tail-socket", "body-5", "tail", "body-5", (0, 92, 86, 92), [-20, 2], [86, 92], 0.025, 0.56),
        runtime_overlay("body-5-socket", "body-4", "body-5", "body-4", (0, 100, 92, 94), [-12, 0], [92, 94], 0.035, 0.58),
        runtime_overlay("body-4-socket", "body-3", "body-4", "body-3", (0, 110, 96, 98), [-10, 0], [96, 98], 0.045, 0.58),
        runtime_overlay("body-3-socket", "body-2", "body-3", "body-2", (0, 122, 98, 104), [-8, 0], [98, 104], 0.055, 0.6),
        runtime_overlay("body-2-socket", "body-1", "body-2", "body-1", (0, 120, 100, 108), [-8, 0], [100, 108], 0.065, 0.6),
        runtime_overlay("head-socket", "body-1", "head", "body-1", (198, 104, 94, 116), [8, 2], [94, 116], 0.075, 0.62),
        runtime_overlay("jaw-socket", "head", "jaw", "head", (92, 174, 82, 84), [0, 20], [82, 84], 0.085, 0.52),
    ]
    socket_style = {
        "alpha": 0.6,
        "bridgeColor": 0x07101A,
        "bridgeAlpha": 0.2,
        "bridgeStunnedAlpha": 0.11,
        "bridgeCoreColor": 0x79B8C9,
        "bridgeCoreAlpha": 0.08,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.98,
        "bridgeSleeveScale": 0.36,
    }
    murk_tint = {"color": 0x83AFC0, "intensity": 0.11, "stunnedIntensity": 0.17}
    part_images: dict[str, Image.Image] = {}
    for part in parts:
        write_part(source, part)
        part_images[part["id"]] = Image.open(GENERATED / part["texture"]).convert("RGBA")
    for overlay in overlays:
        write_overlay(part_images, overlay)

    creature = {
        "id": "chainmaw-eel",
        "species": "Chainmaw Eel",
        "minBiome": 3,
        "color": 0x79B8C9,
        "rarity": "epic",
        "radius": 68,
        "hp": 245,
        "speed": [30, 58],
        "spawn": {"minDepth": 1180, "maxDepth": 2350, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in part.items() if key != "sourceCrop"} for part in parts],
        "socketOverlays": [{key: value for key, value in overlay.items() if key not in {"sourcePartId", "sourceCrop"}} for overlay in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-chainmaw-eel",
        "runtimeCreatureId": "chainmaw-eel",
        "displayName": "Chainmaw Eel",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-chainmaw-eel-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": "Prototype built from a single magenta-background Chainmaw source crop. The top full-body creature was isolated from generated thumbnail studies before chroma removal, then cut into overlapping eel body segments for sandbox review.",
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
    print(f"Wrote chainmaw-eel with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
