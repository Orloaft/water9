#!/usr/bin/env python3
"""Build the articulated Abyssal Mandible Bobbit from bespoke Imagegen source art."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from validate_articulated_sources import (
    apply_alpha_cutouts,
    apply_alpha_feather,
    apply_body_cripple_damage,
    apply_severed_wound,
    apply_socket_occlusion,
)


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
HIGH_SOURCE = GENERATED / "fauna-abyssal-mandible-bobbit-topdown-whole-painted-hi.png"
SOURCE = GENERATED / "fauna-abyssal-mandible-bobbit-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-mandible-bobbit.articulated.json"
SOURCE_SIZE = (992, 397)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)
PREFIX = "fauna-abyssal-mandible-bobbit"
CREATURE_ID = "abyssal-mandible-bobbit"


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.12 if role in {"tail", "fin", "jaw"} else 0.88,
        "angularDrag": 0.76 if role in {"jaw", "fin"} else 0.46 if role == "head" else 0.38,
        "severable": severable,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
    }


def runtime_part(
    part_id: str,
    crop: tuple[int, int, int, int],
    depth: float,
    motion: dict[str, Any],
    anchors: dict[str, list[float]],
    origin: list[float],
    hit_radius: float,
    hp_multiplier: float,
    damage_multiplier: float,
    anatomy_data: dict[str, Any],
    parent_id: str | None = None,
    parent_anchor: str | None = None,
    anchor: str | None = None,
    rest_offset: list[float] | None = None,
    rotation_offset: float | None = None,
    alpha_cutouts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    x, y, width, height = crop
    part: dict[str, Any] = {
        "id": part_id,
        "textureKey": f"{PREFIX}-{part_id}",
        "texture": f"{PREFIX}-{part_id}.png",
        "sourceCrop": {"x": x, "y": y, "width": width, "height": height},
        "offset": [x + width / 2 - SOURCE_CENTER[0], y + height / 2 - SOURCE_CENTER[1]],
        "origin": origin,
        "size": [width, height],
        "depth": depth,
        "hitRadius": hit_radius,
        "hpMultiplier": hp_multiplier,
        "damageMultiplier": damage_multiplier,
        "motion": motion,
        "anchors": anchors,
        "anatomy": anatomy_data,
    }
    if parent_id:
        part["parentId"] = parent_id
        part["parentAnchor"] = parent_anchor
        part["anchor"] = anchor
        part["restOffset"] = rest_offset or [0, 0]
    if rotation_offset is not None:
        part["rotationOffset"] = rotation_offset
    if alpha_cutouts:
        part["alphaCutouts"] = alpha_cutouts
    if part_id == "body-2":
        part["damagedTextureKey"] = f"{PREFIX}-body-2-damaged"
        part["damagedTexture"] = f"{PREFIX}-body-2-damaged.png"
    return part


def socket_overlay(
    overlay_id: str,
    parent_id: str,
    child_id: str,
    source_part_id: str,
    crop: tuple[int, int, int, int],
    offset: list[float],
    depth: float,
    alpha: float,
    bridge_alpha: float,
    width_scale: float,
    sleeve_scale: float,
) -> dict[str, Any]:
    _x, _y, width, height = crop
    return {
        "id": overlay_id,
        "textureKey": f"{PREFIX}-{overlay_id}",
        "texture": f"{PREFIX}-{overlay_id}.png",
        "severedTextureKey": f"{PREFIX}-{overlay_id.replace('-socket', '-wound')}",
        "severedTexture": f"{PREFIX}-{overlay_id.replace('-socket', '-wound')}.png",
        "parentId": parent_id,
        "childId": child_id,
        "sourcePartId": source_part_id,
        "sourceCrop": {"x": crop[0], "y": crop[1], "width": width, "height": height},
        "offset": offset,
        "origin": [0.5, 0.5],
        "size": [width, height],
        "depth": depth,
        "alpha": alpha,
        "bridgeAlpha": bridge_alpha,
        "bridgeCoreAlpha": 0.09,
        "bridgeWidthScale": width_scale,
        "bridgeSleeveScale": sleeve_scale,
    }


def source_part(part: dict[str, Any]) -> dict[str, Any]:
    result = {
        "id": part["id"],
        "key": part["textureKey"],
        "src": part["texture"],
        "sourceCrop": part["sourceCrop"],
        "size": {"width": part["sourceCrop"]["width"], "height": part["sourceCrop"]["height"]},
        "anatomy": part["anatomy"],
        "motion": part["motion"],
    }
    if part.get("damagedTexture"):
        result["damagedSrc"] = part["damagedTexture"]
        result["damagedKey"] = part["damagedTextureKey"]
        result["damagedProcess"] = "deterministic dark wound and crack overlay"
    if part.get("alphaCutouts"):
        result["alphaCutouts"] = part["alphaCutouts"]
    return result


def source_overlay(overlay: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": overlay["id"],
        "src": overlay["texture"],
        "parentId": overlay["parentId"],
        "childId": overlay["childId"],
        "sourcePartId": overlay["sourcePartId"],
        "sourceCrop": overlay["sourceCrop"],
        "alphaFeather": {"all": 8, "curve": 1.55},
        "alpha": overlay["alpha"],
        "bridgeAlpha": overlay["bridgeAlpha"],
        "bridgeCoreAlpha": overlay["bridgeCoreAlpha"],
        "bridgeWidthScale": overlay["bridgeWidthScale"],
        "bridgeSleeveScale": overlay["bridgeSleeveScale"],
        "severedSrc": overlay["severedTexture"],
        "severedKey": overlay["severedTextureKey"],
        "severedProcess": f"deterministic sever wound overlay:{overlay['id']}",
        "socketProcess": f"deterministic organic socket occlusion:{overlay['id']}",
    }


def create_source() -> Image.Image:
    if not HIGH_SOURCE.exists():
        raise FileNotFoundError(f"missing high source: {HIGH_SOURCE}")
    source = Image.open(HIGH_SOURCE).convert("RGBA").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    source.save(SOURCE)
    return source


def write_part_images(source: Image.Image, parts: list[dict[str, Any]]) -> None:
    for part in parts:
        crop = apply_alpha_cutouts(crop_image(source, part["sourceCrop"]), part.get("alphaCutouts"))
        crop.save(GENERATED / part["texture"])
        if part.get("damagedTexture"):
            apply_body_cripple_damage(crop).save(GENERATED / part["damagedTexture"])


def write_socket_images(parts: list[dict[str, Any]], overlays: list[dict[str, Any]]) -> None:
    by_id = {part["id"]: part for part in parts}
    for overlay in overlays:
        source_part_data = by_id[overlay["sourcePartId"]]
        source_part_image = Image.open(GENERATED / source_part_data["texture"]).convert("RGBA")
        base = apply_socket_occlusion(
            apply_alpha_feather(crop_image(source_part_image, overlay["sourceCrop"]), {"all": 8, "curve": 1.55}),
            overlay["id"],
        )
        base.save(GENERATED / overlay["texture"])
        apply_severed_wound(base, overlay["id"]).save(GENERATED / overlay["severedTexture"])


def build_parts() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    parts = [
        runtime_part("tail", (20, 142, 166, 88), 0.0, {"kind": "tail", "amplitude": 4.6, "frequency": 1.9, "phase": 1.18, "lag": 0.58}, {"front": [68, 1], "tip": [-66, 1]}, [0.5, 0.5], 18, 0.45, 0.56, anatomy("tail", 0.52, True, 0.68, 0.62), "body-5", "back", "front", [6, 0]),
        runtime_part("body-5", (148, 132, 150, 104), 0.01, {"kind": "tail", "amplitude": 4.2, "frequency": 1.86, "phase": 0.98, "lag": 0.48}, {"front": [62, 0], "back": [-64, 3]}, [0.5, 0.5], 24, 0.62, 0.7, anatomy("tail", 0.88, True, 0.76, 0.66), "body-4", "back", "front", [4, 0]),
        runtime_part("body-4", (270, 118, 148, 122), 0.02, {"kind": "tail", "amplitude": 3.8, "frequency": 1.82, "phase": 0.78, "lag": 0.36}, {"front": [62, 0], "back": [-64, 4]}, [0.5, 0.5], 27, 0.78, 0.78, anatomy("tail", 1.15, True, 0.84, 0.7), "body-3", "back", "front", [4, 0]),
        runtime_part("body-3", (392, 102, 150, 142), 0.03, {"kind": "body", "amplitude": 3.0, "frequency": 1.76, "phase": 0.56, "lag": 0.28}, {"front": [64, -1], "back": [-66, 5]}, [0.5, 0.5], 30, 0.94, 0.88, anatomy("torso", 1.55, False, 1.12, 0.74), "body-2", "back", "front", [4, 0]),
        runtime_part("body-2", (516, 92, 150, 154), 0.04, {"kind": "body", "amplitude": 2.0, "frequency": 1.68, "phase": 0.32, "lag": 0.18}, {"front": [64, -1], "back": [-66, 6]}, [0.5, 0.5], 34, 1.08, 1.0, anatomy("torso", 2.05, False, 1.3, 0.78), "body-1", "back", "front", [5, 0]),
        runtime_part("body-1", (630, 96, 114, 158), 0.05, {"kind": "body", "amplitude": 1.0, "frequency": 1.56, "phase": 0.08, "lag": 0.06}, {"front": [46, 18], "back": [-48, 8]}, [0.5, 0.5], 36, 1.2, 1.06, anatomy("torso", 2.55, False, 1.42, 0.78)),
        runtime_part(
            "head",
            (710, 112, 124, 162),
            0.065,
            {"kind": "root", "amplitude": 0.9, "frequency": 1.36, "phase": 0.0, "lag": 0.04},
            {"neck": [-40, 0], "upperJaw": [70, -12], "lowerJaw": [70, 34], "bite": [76, 0]},
            [0.5, 0.5],
            32,
            1.08,
            1.16,
            anatomy("head", 2.6, False, 1.48, 0.58),
            "body-1",
            "front",
            "neck",
            [-1, 0],
            alpha_cutouts=[
                {"kind": "polygon", "points": [[74, 0], [124, 0], [124, 60], [88, 50]]},
                {"kind": "polygon", "points": [[88, 112], [124, 98], [124, 162], [72, 162]]},
            ],
        ),
        runtime_part(
            "upper-mandible",
            (764, 82, 176, 90),
            0.09,
            {"kind": "jaw", "amplitude": 8.0, "frequency": 1.5, "phase": 0.0, "lag": 0.03},
            {"hinge": [18, 50], "bite": [122, 40]},
            [0.11, 0.82],
            16,
            0.42,
            1.28,
            anatomy("jaw", 0.46, True, 0.72, 0.9),
            "head",
            "upperJaw",
            "hinge",
            [1, -2],
            rotation_offset=-0.02,
            alpha_cutouts=[{"kind": "rectangle", "x": 0, "y": 58, "width": 176, "height": 32}],
        ),
        runtime_part(
            "lower-mandible",
            (754, 214, 176, 90),
            0.088,
            {"kind": "jaw", "amplitude": 8.0, "frequency": 1.52, "phase": 0.0, "lag": 0.03},
            {"hinge": [32, -28], "bite": [122, -18]},
            [0.15, 0.06],
            16,
            0.42,
            1.26,
            anatomy("jaw", 0.46, True, 0.72, 0.9),
            "head",
            "lowerJaw",
            "hinge",
            [1, 2],
            rotation_offset=0.02,
            alpha_cutouts=[
                {"kind": "rectangle", "x": 0, "y": 0, "width": 176, "height": 34},
                {"kind": "polygon", "points": [[126, 44], [176, 34], [176, 90], [116, 90]]},
            ],
        ),
    ]
    overlays = [
        socket_overlay("tail-socket", "body-5", "tail", "body-5", (0, 30, 72, 52), [-24, 0], 0.018, 0.54, 0.2, 1.0, 0.42),
        socket_overlay("body-5-socket", "body-4", "body-5", "body-4", (0, 38, 76, 64), [-26, 0], 0.028, 0.58, 0.22, 1.02, 0.38),
        socket_overlay("body-4-socket", "body-3", "body-4", "body-3", (0, 42, 80, 70), [-28, 0], 0.038, 0.6, 0.22, 1.02, 0.36),
        socket_overlay("body-3-socket", "body-2", "body-3", "body-2", (0, 48, 82, 76), [-28, 0], 0.048, 0.62, 0.23, 1.02, 0.36),
        socket_overlay("body-2-socket", "body-1", "body-2", "body-1", (0, 58, 88, 86), [-30, 0], 0.058, 0.62, 0.24, 1.02, 0.38),
        socket_overlay("head-socket", "body-1", "head", "body-1", (68, 50, 42, 78), [18, 8], 0.075, 0.54, 0.2, 0.92, 0.4),
        socket_overlay("upper-mandible-socket", "head", "upper-mandible", "head", (72, 18, 30, 40), [16, -24], 0.098, 0.42, 0.16, 0.78, 0.4),
        socket_overlay("lower-mandible-socket", "head", "lower-mandible", "head", (72, 106, 32, 40), [16, 24], 0.096, 0.42, 0.16, 0.78, 0.4),
    ]
    return parts, overlays


def main() -> int:
    source = create_source()
    parts, overlays = build_parts()
    write_part_images(source, parts)
    write_socket_images(parts, overlays)

    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source-bespoke-imagegen",
        "backgroundKey": "alpha",
        "reviewedBy": None,
        "acceptanceNote": "Original long Bobbit-worm enemy with articulated mandibles; needs live motion review before acceptance.",
    }
    socket_style = {
        "alpha": 0.78,
        "bridgeColor": 0x2B1324,
        "bridgeAlpha": 0.44,
        "bridgeStunnedAlpha": 0.2,
        "bridgeCoreColor": 0x7BE5EA,
        "bridgeCoreAlpha": 0.2,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 1.16,
        "bridgeSleeveScale": 0.48,
    }
    murk_tint = {"color": 0xC05076, "intensity": 0.12, "stunnedIntensity": 0.2}
    creature = {
        "id": CREATURE_ID,
        "species": "Abyssal Mandible Bobbit",
        "minBiome": 3,
        "color": 0xB84A70,
        "rarity": "epic",
        "radius": 76,
        "hp": 170,
        "speed": [38, 76],
        "spawn": {"minDepth": 980, "maxDepth": 2600, "count": 1},
        "combat": {
            "behavior": "ambusher",
            "hostile": True,
            "detectionRange": 430,
            "leashRange": 760,
            "attackRange": 190,
            "lungeSeconds": 0.92,
            "lungeSpeedScale": 2.9,
            "grabSeconds": 1.35,
            "grabCooldown": 5.8,
            "grabEnabled": True,
            "biteAnchor": "bite",
            "contactPadding": 34,
        },
        "parts": [{key: value for key, value in part.items() if key != "sourceCrop"} for part in parts],
        "socketOverlays": [
            {key: value for key, value in overlay.items() if key not in {"sourcePartId", "sourceCrop"}}
            for overlay in overlays
        ],
        "socketStyle": socket_style,
        "murkTint": murk_tint,
        "quality": quality,
    }
    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    runtime["creatures"] = [candidate for candidate in runtime["creatures"] if candidate["id"] != CREATURE_ID]
    runtime["creatures"].append(creature)
    RUNTIME_MANIFEST.write_text(f"{json.dumps(runtime, indent=2)}\n")
    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": PREFIX,
        "runtimeCreatureId": CREATURE_ID,
        "displayName": "Abyssal Mandible Bobbit",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": f"public/assets/generated/{PREFIX}-whole-painted.png",
        "sourceTransform": {"highSource": f"public/assets/generated/{PREFIX}-topdown-whole-painted-hi.png", "process": "bespoke top-down Imagegen source cut into a long segmented worm with mandible parts"},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": "Long ambush worm with one head, hinged upper and lower mandible parts, and varied top-down body segments.",
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(f"{json.dumps(source_manifest, indent=2)}\n")
    print(f"Wrote Abyssal Mandible Bobbit from {SOURCE} with {len(parts)} parts and {len(overlays)} sockets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
