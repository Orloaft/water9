#!/usr/bin/env python3
"""Build the prototype articulated Abyssal Serpent from one cohesive source image."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import apply_alpha_feather, apply_body_cripple_damage

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-abyssal-serpent-mantle-horror-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-serpent-mantle-horror.articulated.json"
PREFIX = "fauna-abyssal-serpent-mantle-horror"
RUNTIME_ID = "abyssal-serpent"


def crop_dict(box: tuple[int, int, int, int]) -> dict[str, int]:
    x, y, width, height = box
    return {"x": x, "y": y, "width": width, "height": height}


def crop_box(crop: dict[str, int]) -> tuple[int, int, int, int]:
    return (crop["x"], crop["y"], crop["x"] + crop["width"], crop["y"] + crop["height"])


def anatomy(role: str, mass: float, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 0.84 if role in {"torso", "head"} else 1.08,
        "angularDrag": 0.36 if role != "jaw" else 0.52,
        "severable": False,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
    }


def anchor(width: int, height: int, x_ratio: float, y_ratio: float = 0.0) -> list[float]:
    return [round(width * x_ratio, 1), round(height * y_ratio, 1)]


def alpha_midline_y(image: Image.Image) -> float:
    bbox = image.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bbox:
        return image.height / 2
    return (bbox[1] + bbox[3]) / 2


def rest_offset(parent: dict[str, Any], child: dict[str, Any], parent_anchor: str, child_anchor: str) -> list[float]:
    return [
        round(child["offset"][0] - parent["offset"][0] - parent["anchors"][parent_anchor][0] + child["anchors"][child_anchor][0], 1),
        round(child["offset"][1] - parent["offset"][1] - parent["anchors"][parent_anchor][1] + child["anchors"][child_anchor][1], 1),
    ]


def runtime_part(
    part_id: str,
    crop: tuple[int, int, int, int],
    source_size: tuple[int, int],
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
    damaged: bool = False,
    origin: list[float] | None = None,
) -> dict[str, Any]:
    texture_key = f"{PREFIX}-{part_id}"
    x, y, width, height = crop
    source_w, source_h = source_size
    part: dict[str, Any] = {
        "id": part_id,
        "textureKey": texture_key,
        "texture": f"{texture_key}.png",
        "sourceCrop": crop_dict(crop),
        "offset": [round(x + width / 2 - source_w / 2, 1), round(y + height / 2 - source_h / 2, 1)],
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
    if damaged:
        part["damagedTextureKey"] = f"{texture_key}-damaged"
        part["damagedTexture"] = f"{texture_key}-damaged.png"
    return part


def attach(child: dict[str, Any], parent: dict[str, Any], parent_anchor: str, child_anchor: str) -> None:
    child["parentId"] = parent["id"]
    child["parentAnchor"] = parent_anchor
    child["anchor"] = child_anchor
    child["restOffset"] = rest_offset(parent, child, parent_anchor, child_anchor)


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
        "bridgeAlpha": 0.2,
        "bridgeCoreAlpha": 0.08,
        "bridgeWidthScale": 0.98,
        "bridgeSleeveScale": 0.35,
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
        raise FileNotFoundError(f"missing Abyssal Serpent source image: {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    source_size = source.size
    width, height = source.size
    if width < 1000 or height < 250:
        raise ValueError(f"unexpected serpent source size: {source.size}")

    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Rebuilt from one magenta-background Abyssal Serpent source after the previous legacy composite preview lacked cohesion. Still needs sandbox/contact-sheet visual acceptance before counting toward the 20-threat goal.",
    }

    crops = {
        "tail": (0, 92, 238, 172),
        "body-5": (145, 70, 265, 198),
        "body-4": (325, 52, 280, 218),
        "body-3": (520, 42, 292, 232),
        "body-2": (715, 34, 292, 242),
        "body-1": (900, 28, 245, 252),
        "head": (1048, 18, 222, 272),
        "jaw": (1076, 156, 190, 150),
    }
    # Clamp the rightmost crops to the final source dimensions in case the image
    # normalization changes by a pixel on another platform.
    crops = {
        key: (x, y, min(w, width - x), min(h, height - y))
        for key, (x, y, w, h) in crops.items()
    }

    parts_by_id: dict[str, dict[str, Any]] = {}
    parts_by_id["tail"] = runtime_part(
        "tail", crops["tail"], source_size, 0.0, 25, 0.74, 0.72, "tail", 0.9, 0.82, 0.58,
        {"kind": "tail", "amplitude": 13.5, "frequency": 2.55, "phase": 1.72, "lag": 1.55},
        {"front": anchor(crops["tail"][2], crops["tail"][3], 0.37), "tip": anchor(crops["tail"][2], crops["tail"][3], -0.43, 0.04)},
    )
    parts_by_id["body-5"] = runtime_part(
        "body-5", crops["body-5"], source_size, 0.01, 31, 0.86, 0.82, "tail", 1.25, 0.94, 0.68,
        {"kind": "tail", "amplitude": 10.2, "frequency": 2.35, "phase": 1.22, "lag": 1.15},
        {"front": anchor(crops["body-5"][2], crops["body-5"][3], 0.39), "back": anchor(crops["body-5"][2], crops["body-5"][3], -0.40)},
    )
    parts_by_id["body-4"] = runtime_part(
        "body-4", crops["body-4"], source_size, 0.02, 38, 0.96, 0.92, "torso", 2.0, 1.18, 0.78,
        {"kind": "body", "amplitude": 7.8, "frequency": 2.05, "phase": 0.9, "lag": 0.84},
        {"front": anchor(crops["body-4"][2], crops["body-4"][3], 0.39), "back": anchor(crops["body-4"][2], crops["body-4"][3], -0.41)},
    )
    parts_by_id["body-3"] = runtime_part(
        "body-3", crops["body-3"], source_size, 0.03, 45, 1.06, 1.0, "torso", 2.65, 1.34, 0.84,
        {"kind": "body", "amplitude": 5.8, "frequency": 1.9, "phase": 0.6, "lag": 0.58},
        {"front": anchor(crops["body-3"][2], crops["body-3"][3], 0.39), "back": anchor(crops["body-3"][2], crops["body-3"][3], -0.41)},
    )
    parts_by_id["body-2"] = runtime_part(
        "body-2", crops["body-2"], source_size, 0.04, 50, 1.1, 1.02, "torso", 2.9, 1.44, 0.86,
        {"kind": "body", "amplitude": 3.9, "frequency": 1.75, "phase": 0.36, "lag": 0.38},
        {"front": anchor(crops["body-2"][2], crops["body-2"][3], 0.39), "back": anchor(crops["body-2"][2], crops["body-2"][3], -0.41)},
        damaged=True,
    )
    parts_by_id["body-1"] = runtime_part(
        "body-1", crops["body-1"], source_size, 0.05, 50, 1.14, 1.05, "torso", 3.05, 1.5, 0.86,
        {"kind": "body", "amplitude": 2.4, "frequency": 1.55, "phase": 0.12, "lag": 0.16},
        {"front": anchor(crops["body-1"][2], crops["body-1"][3], 0.34, -0.02), "back": anchor(crops["body-1"][2], crops["body-1"][3], -0.40)},
    )
    parts_by_id["head"] = runtime_part(
        "head", crops["head"], source_size, 0.06, 47, 1.22, 1.22, "head", 3.0, 1.72, 0.64,
        {"kind": "body", "amplitude": 1.2, "frequency": 1.35, "phase": 0, "lag": 0.08},
        {
            "neck": anchor(crops["head"][2], crops["head"][3], -0.34, -0.02),
            "lowerJaw": anchor(crops["head"][2], crops["head"][3], 0.08, 0.22),
            "bite": anchor(crops["head"][2], crops["head"][3], 0.43, 0.02),
        },
    )
    parts_by_id["jaw"] = runtime_part(
        "jaw", crops["jaw"], source_size, 0.07, 24, 0.66, 1.36, "jaw", 0.72, 0.9, 0.88,
        {"kind": "jaw", "amplitude": 21.0, "frequency": 3.3, "phase": 0.18, "lag": 0.1},
        {"hinge": anchor(crops["jaw"][2], crops["jaw"][3], -0.36, -0.16), "bite": anchor(crops["jaw"][2], crops["jaw"][3], 0.34, 0.12)},
        origin=[0.44, 0.42],
    )

    for part_id in ["tail", "body-5", "body-4", "body-3", "body-2", "body-1"]:
        crop = crops[part_id]
        local_midline = round(alpha_midline_y(source.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))) - crop[3] / 2, 1)
        for anchor_name in ["front", "back"]:
            if anchor_name in parts_by_id[part_id]["anchors"]:
                parts_by_id[part_id]["anchors"][anchor_name][1] = local_midline
        if part_id == "tail" and "tip" in parts_by_id[part_id]["anchors"]:
            parts_by_id[part_id]["anchors"]["tip"][1] = local_midline + 5

    attach(parts_by_id["body-5"], parts_by_id["body-4"], "back", "front")
    attach(parts_by_id["tail"], parts_by_id["body-5"], "back", "front")
    attach(parts_by_id["body-4"], parts_by_id["body-3"], "back", "front")
    attach(parts_by_id["body-3"], parts_by_id["body-2"], "back", "front")
    attach(parts_by_id["body-2"], parts_by_id["body-1"], "back", "front")
    attach(parts_by_id["head"], parts_by_id["body-1"], "front", "neck")
    attach(parts_by_id["jaw"], parts_by_id["head"], "lowerJaw", "hinge")

    parts = [
        parts_by_id["tail"],
        parts_by_id["body-5"],
        parts_by_id["body-4"],
        parts_by_id["body-3"],
        parts_by_id["body-2"],
        parts_by_id["body-1"],
        parts_by_id["head"],
        parts_by_id["jaw"],
    ]
    overlays = [
        runtime_overlay("tail-socket", "body-5", "tail", "body-5", (0, 70, 78, 72), [-18, 0], [78, 72], 0.025, 0.56),
        runtime_overlay("body-5-socket", "body-4", "body-5", "body-4", (0, 126, 84, 78), [-12, 0], [84, 78], 0.035, 0.58),
        runtime_overlay("body-4-socket", "body-3", "body-4", "body-3", (0, 84, 90, 84), [-10, 0], [90, 84], 0.045, 0.58),
        runtime_overlay("body-3-socket", "body-2", "body-3", "body-2", (0, 88, 94, 90), [-8, 0], [94, 90], 0.055, 0.6),
        runtime_overlay("body-2-socket", "body-1", "body-2", "body-1", (0, 92, 94, 92), [-8, 0], [94, 92], 0.065, 0.6),
        runtime_overlay("head-socket", "body-1", "head", "body-1", (154, 92, 86, 98), [8, 0], [86, 98], 0.075, 0.62),
        runtime_overlay("jaw-socket", "head", "jaw", "head", (86, 146, 76, 76), [0, 18], [76, 76], 0.085, 0.52),
    ]
    socket_style = {
        "alpha": 0.6,
        "bridgeColor": 0x06101A,
        "bridgeAlpha": 0.2,
        "bridgeStunnedAlpha": 0.11,
        "bridgeCoreColor": 0x6EE4D6,
        "bridgeCoreAlpha": 0.08,
        "bridgeCoreStunnedAlpha": 0.04,
        "bridgeWidthScale": 0.98,
        "bridgeSleeveScale": 0.35,
    }
    murk_tint = {"color": 0x86B9C7, "intensity": 0.12, "stunnedIntensity": 0.18}

    part_images: dict[str, Image.Image] = {}
    for part in parts:
        write_part(source, part)
        part_images[part["id"]] = Image.open(GENERATED / part["texture"]).convert("RGBA")
    for overlay in overlays:
        write_overlay(part_images, overlay)

    creature = {
        "id": RUNTIME_ID,
        "species": "Abyssal Serpent",
        "minBiome": 3,
        "color": 0x6EE4D6,
        "rarity": "legendary",
        "radius": 82,
        "hp": 290,
        "speed": [32, 62],
        "spawn": {"minDepth": 1320, "maxDepth": 2700, "count": 1},
        "murkTint": murk_tint,
        "parts": [{key: value for key, value in part.items() if key != "sourceCrop"} for part in parts],
        "socketOverlays": [{key: value for key, value in overlay.items() if key not in {"sourcePartId", "sourceCrop"}} for overlay in overlays],
        "socketStyle": socket_style,
        "quality": quality,
    }
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": PREFIX,
        "runtimeCreatureId": RUNTIME_ID,
        "displayName": "Abyssal Serpent",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-abyssal-serpent-mantle-horror-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": "Replacement prototype built from one cohesive magenta-background serpent source after the previous legacy composite failed visual cohesion review. Broad overlapping spine crops preserve the whole-source silhouette for sandbox review.",
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(json.dumps(source_manifest, indent=2) + "\n")

    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    creatures = runtime.setdefault("creatures", [])
    creatures[:] = [candidate for candidate in creatures if candidate.get("id") != RUNTIME_ID]
    creatures.insert(0, creature)
    RUNTIME_MANIFEST.write_text(json.dumps(runtime, indent=2) + "\n")
    print(f"Wrote {RUNTIME_ID} with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
