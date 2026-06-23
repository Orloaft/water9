#!/usr/bin/env python3
"""Build the articulated Abyssal Reliquary Wyrm from bespoke Imagegen source art."""

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
HIGH_SOURCE = GENERATED / "fauna-abyssal-reliquary-wyrm-whole-painted-hi.png"
SOURCE = GENERATED / "fauna-abyssal-reliquary-wyrm-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-reliquary-wyrm.articulated.json"
SOURCE_SIZE = (988, 398)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)
PREFIX = "fauna-abyssal-reliquary-wyrm"
CREATURE_ID = "abyssal-reliquary-wyrm"


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.14 if role in {"tail", "fin", "jaw"} else 0.9,
        "angularDrag": 0.78 if role in {"jaw", "fin"} else 0.5 if role == "head" else 0.43,
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
        "bridgeCoreAlpha": 0.1,
        "bridgeWidthScale": width_scale,
        "bridgeSleeveScale": sleeve_scale,
    }


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
    if part.get("alphaCutouts"):
        result["alphaCutouts"] = part["alphaCutouts"]
    if part.get("damagedTexture"):
        result["damagedSrc"] = part["damagedTexture"]
        result["damagedKey"] = part["damagedTextureKey"]
        result["damagedProcess"] = "deterministic dark wound and crack overlay"
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
    high_source = Image.open(HIGH_SOURCE).convert("RGBA")
    source = high_source.resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    source.save(SOURCE)
    return source


def write_part_images(source: Image.Image, parts: list[dict[str, Any]]) -> None:
    for part in parts:
        crop = crop_image(source, part["sourceCrop"])
        crop = apply_alpha_cutouts(crop, part.get("alphaCutouts"))
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
        runtime_part(
            "tail",
            (18, 145, 210, 160),
            0.0,
            {"kind": "tail", "amplitude": 6.4, "frequency": 1.58, "phase": 1.22, "lag": 0.72},
            {"front": [84, -2], "tip": [-92, 42]},
            [0.5, 0.5],
            20,
            0.5,
            0.62,
            anatomy("tail", 0.62, True, 0.72, 0.58),
            "tail-base",
            "back",
            "front",
            [15, 6],
        ),
        runtime_part(
            "tail-base",
            (205, 130, 180, 155),
            0.01,
            {"kind": "tail", "amplitude": 5.4, "frequency": 1.56, "phase": 0.98, "lag": 0.58},
            {"front": [76, 0], "back": [-78, 8], "rearFin": [8, 70]},
            [0.5, 0.5],
            24,
            0.66,
            0.72,
            anatomy("tail", 0.82, True, 0.78, 0.64),
            "body-4",
            "back",
            "front",
            [8, 4],
        ),
        runtime_part(
            "body-4",
            (355, 118, 150, 150),
            0.02,
            {"kind": "tail", "amplitude": 4.2, "frequency": 1.54, "phase": 0.72, "lag": 0.42},
            {"front": [62, -1], "back": [-64, 2], "rearFin": [-34, 74]},
            [0.5, 0.5],
            28,
            0.82,
            0.82,
            anatomy("tail", 1.2, True, 0.86, 0.72),
            "body-3",
            "back",
            "front",
            [1, 0],
        ),
        runtime_part(
            "body-3",
            (478, 102, 150, 162),
            0.03,
            {"kind": "body", "amplitude": 3.1, "frequency": 1.5, "phase": 0.48, "lag": 0.3},
            {"front": [62, 0], "back": [-64, 8], "midFin": [-4, 74]},
            [0.5, 0.5],
            32,
            0.98,
            0.92,
            anatomy("torso", 1.95, False, 1.28, 0.82),
            "body-2",
            "back",
            "front",
            [2, 0],
        ),
        runtime_part(
            "body-2",
            (596, 90, 160, 178),
            0.04,
            {"kind": "body", "amplitude": 2.2, "frequency": 1.48, "phase": 0.24, "lag": 0.18},
            {"front": [66, 2], "back": [-70, 12], "frontFin": [16, 86]},
            [0.5, 0.5],
            38,
            1.18,
            1.02,
            anatomy("torso", 2.9, False, 1.48, 0.84),
            "body-1",
            "back",
            "front",
            [4, 0],
        ),
        runtime_part(
            "body-1",
            (695, 78, 132, 214),
            0.05,
            {"kind": "body", "amplitude": 1.0, "frequency": 1.42, "phase": 0.08, "lag": 0.08},
            {"front": [56, -4], "back": [-58, 16], "throat": [44, 84]},
            [0.5, 0.5],
            40,
            1.22,
            1.08,
            anatomy("torso", 3.18, False, 1.55, 0.82),
        ),
        runtime_part(
            "rear-rib-fin",
            (270, 198, 230, 150),
            0.065,
            {"kind": "fin", "amplitude": 3.0, "frequency": 1.72, "phase": 0.52, "lag": 0.22},
            {"root": [98, -8]},
            [0.43, 0.18],
            13,
            0.42,
            0.58,
            anatomy("fin", 0.36, True, 0.56, 0.78),
            "body-4",
            "rearFin",
            "root",
            [2, 0],
        ),
        runtime_part(
            "mid-rib-fin",
            (455, 198, 210, 155),
            0.07,
            {"kind": "fin", "amplitude": 3.4, "frequency": 1.78, "phase": 0.34, "lag": 0.2},
            {"root": [74, -6]},
            [0.35, 0.18],
            15,
            0.48,
            0.62,
            anatomy("fin", 0.42, True, 0.62, 0.8),
            "body-3",
            "midFin",
            "root",
            [-2, 2],
        ),
        runtime_part(
            "front-rib-fin",
            (630, 190, 220, 160),
            0.075,
            {"kind": "fin", "amplitude": 3.8, "frequency": 1.84, "phase": 0.22, "lag": 0.18},
            {"root": [58, -4]},
            [0.27, 0.16],
            16,
            0.5,
            0.66,
            anatomy("fin", 0.46, True, 0.66, 0.8),
            "body-2",
            "frontFin",
            "root",
            [-4, 2],
        ),
        runtime_part(
            "head",
            (780, 68, 185, 146),
            0.09,
            {"kind": "root", "amplitude": 1.4, "frequency": 1.16, "phase": 0.0},
            {"neck": [-76, 42], "lowerJaw": [34, 126]},
            [0.5, 0.52],
            46,
            1.36,
            1.26,
            anatomy("head", 4.1, False, 1.78, 0.52),
            "body-1",
            "front",
            "neck",
            [-2, -1],
        ),
        runtime_part(
            "jaw",
            (790, 188, 185, 145),
            0.082,
            {"kind": "jaw", "amplitude": 12.8, "frequency": 1.72, "phase": 0.0, "lag": 0.05},
            {"hinge": [40, 18], "bite": [132, 18]},
            [0.22, 0.16],
            24,
            0.58,
            1.34,
            anatomy("jaw", 0.78, True, 0.86, 0.88),
            "head",
            "lowerJaw",
            "hinge",
            [4, 2],
        ),
        runtime_part(
            "throat-tendrils",
            (752, 214, 220, 170),
            0.08,
            {"kind": "fin", "amplitude": 4.4, "frequency": 1.92, "phase": 0.12, "lag": 0.28},
            {"root": [56, 10]},
            [0.25, 0.08],
            16,
            0.38,
            0.58,
            anatomy("fin", 0.34, True, 0.58, 0.82),
            "body-1",
            "throat",
            "root",
            [4, 6],
        ),
    ]

    overlays = [
        socket_overlay("tail-socket", "tail-base", "tail", "tail-base", (0, 44, 82, 76), [-30, 2], 0.018, 0.56, 0.2, 1.08, 0.44),
        socket_overlay("tail-base-socket", "body-4", "tail-base", "body-4", (0, 46, 82, 78), [-30, 2], 0.028, 0.58, 0.21, 1.08, 0.42),
        socket_overlay("body-4-socket", "body-3", "body-4", "body-3", (0, 50, 84, 80), [-30, 4], 0.038, 0.6, 0.22, 1.04, 0.36),
        socket_overlay("body-3-socket", "body-2", "body-3", "body-2", (0, 56, 90, 86), [-32, 5], 0.048, 0.62, 0.23, 1.04, 0.36),
        socket_overlay("body-2-socket", "body-1", "body-2", "body-1", (0, 66, 90, 94), [-31, 6], 0.058, 0.64, 0.24, 1.04, 0.38),
        socket_overlay("rear-rib-fin-socket", "body-4", "rear-rib-fin", "body-4", (16, 88, 90, 54), [-10, 22], 0.078, 0.5, 0.2, 1.02, 0.42),
        socket_overlay("mid-rib-fin-socket", "body-3", "mid-rib-fin", "body-3", (30, 94, 90, 56), [-4, 24], 0.082, 0.5, 0.2, 1.02, 0.42),
        socket_overlay("front-rib-fin-socket", "body-2", "front-rib-fin", "body-2", (42, 108, 92, 58), [0, 26], 0.086, 0.5, 0.2, 1.02, 0.42),
        socket_overlay("head-socket", "body-1", "head", "body-1", (80, 46, 50, 78), [24, 0], 0.098, 0.6, 0.22, 1.02, 0.42),
        socket_overlay("jaw-socket", "head", "jaw", "head", (20, 112, 82, 34), [4, 26], 0.108, 0.52, 0.22, 1.04, 0.5),
        socket_overlay("throat-tendrils-socket", "body-1", "throat-tendrils", "body-1", (76, 118, 54, 70), [24, 38], 0.092, 0.48, 0.2, 1.02, 0.5),
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
        "acceptanceNote": (
            "Original bespoke Imagegen monster source. First articulated cut needs human motion review in the live "
            "preview before it can count toward accepted threat quality."
        ),
    }
    socket_style = {
        "alpha": 0.78,
        "bridgeColor": 0x17263A,
        "bridgeAlpha": 0.44,
        "bridgeStunnedAlpha": 0.2,
        "bridgeCoreColor": 0x72E6EF,
        "bridgeCoreAlpha": 0.2,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 1.18,
        "bridgeSleeveScale": 0.5,
    }
    murk_tint = {"color": 0x8FC9CF, "intensity": 0.1, "stunnedIntensity": 0.2}

    creature = {
        "id": CREATURE_ID,
        "species": "Abyssal Reliquary Wyrm",
        "minBiome": 4,
        "color": 0x7BB8C5,
        "rarity": "legendary",
        "radius": 92,
        "hp": 270,
        "speed": [24, 48],
        "spawn": {"minDepth": 1650, "maxDepth": 2900, "count": 1},
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
        "displayName": "Abyssal Reliquary Wyrm",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": f"public/assets/generated/{PREFIX}-whole-painted.png",
        "sourceTransform": {
            "highSource": f"public/assets/generated/{PREFIX}-whole-painted-hi.png",
            "process": "bespoke Imagegen source cut into anatomical parts; no blueprint recolor",
        },
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": (
            "Abyssal Reliquary Wyrm is an original source-art monster: armored coffin-like skull, one hinged lower jaw, "
            "rib-fin appendages, long tapering body, and split lure tail. Parts are cropped from the same painting to "
            "avoid the repeated-mouth/stacked-segment failure mode from earlier gulper iterations."
        ),
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(f"{json.dumps(source_manifest, indent=2)}\n")
    print(f"Wrote Abyssal Reliquary Wyrm from {SOURCE} with {len(parts)} parts and {len(overlays)} sockets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
