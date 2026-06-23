#!/usr/bin/env python3
"""Build the articulated Abyssal Gulper from a cohesive full-body source."""

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
HIGH_SOURCE = GENERATED / "fauna-abyssal-gulper-v2-whole-painted.png"
SOURCE = GENERATED / "fauna-abyssal-gulper-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-gulper.articulated.json"
SOURCE_SIZE = (887, 444)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.08 if role in {"tail", "fin", "jaw"} else 0.84,
        "angularDrag": 0.74 if role in {"jaw", "fin"} else 0.44 if role == "head" else 0.38,
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
        "textureKey": f"fauna-abyssal-gulper-{part_id}",
        "texture": f"fauna-abyssal-gulper-{part_id}.png",
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
        part["damagedTextureKey"] = "fauna-abyssal-gulper-body-2-damaged"
        part["damagedTexture"] = "fauna-abyssal-gulper-body-2-damaged.png"
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
        "textureKey": f"fauna-abyssal-gulper-{overlay_id}",
        "texture": f"fauna-abyssal-gulper-{overlay_id}.png",
        "severedTextureKey": f"fauna-abyssal-gulper-{overlay_id.replace('-socket', '-wound')}",
        "severedTexture": f"fauna-abyssal-gulper-{overlay_id.replace('-socket', '-wound')}.png",
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
    result = {
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
    return result


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


def main() -> int:
    high_source = Image.open(HIGH_SOURCE).convert("RGBA")
    source = high_source.transpose(Image.Transpose.FLIP_LEFT_RIGHT).resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    source.save(SOURCE)

    parts = [
        runtime_part(
            "tail",
            (22, 190, 210, 150),
            0.0,
            {"kind": "tail", "amplitude": 4.8, "frequency": 1.62, "phase": 1.04, "lag": 0.62},
            {"front": [86, 0], "tip": [-92, 32]},
            [0.5, 0.5],
            20,
            0.52,
            0.66,
            anatomy("tail", 0.72, True, 0.72, 0.55),
            "tail-base",
            "back",
            "front",
            [18, 8],
        ),
        runtime_part(
            "tail-base",
            (142, 172, 195, 133),
            0.01,
            {"kind": "tail", "amplitude": 4.2, "frequency": 1.6, "phase": 0.86, "lag": 0.5},
            {"front": [82, 0], "back": [-84, 4]},
            [0.5, 0.5],
            25,
            0.72,
            0.78,
            anatomy("tail", 0.86, True, 0.78, 0.62),
            "body-4",
            "back",
            "front",
            [14, 5],
        ),
        runtime_part(
            "body-4",
            (262, 160, 158, 125),
            0.02,
            {"kind": "tail", "amplitude": 3.4, "frequency": 1.58, "phase": 0.64, "lag": 0.36},
            {"front": [66, 0], "back": [-70, 0]},
            [0.5, 0.5],
            28,
            0.86,
            0.86,
            anatomy("tail", 1.22, True, 0.86, 0.7),
            "body-3",
            "back",
            "front",
            [2, 0],
        ),
        runtime_part(
            "body-3",
            (382, 150, 162, 140),
            0.03,
            {"kind": "body", "amplitude": 3.4, "frequency": 1.66, "phase": 0.68, "lag": 0.48},
            {"front": [68, 0], "back": [-70, 0]},
            [0.5, 0.5],
            31,
            0.96,
            0.92,
            anatomy("torso", 2.2, False, 1.4, 0.84),
            "body-2",
            "back",
            "front",
            [3, 0],
        ),
        runtime_part(
            "body-2",
            (500, 142, 166, 155),
            0.04,
            {"kind": "body", "amplitude": 2.1, "frequency": 1.6, "phase": 0.36, "lag": 0.28},
            {"front": [70, 0], "back": [-72, 0]},
            [0.5, 0.5],
            34,
            1.06,
            1.0,
            anatomy("torso", 2.65, False, 1.45, 0.86),
            "body-1",
            "back",
            "front",
            [4, 0],
        ),
        runtime_part(
            "body-1",
            (520, 105, 180, 205),
            0.05,
            {"kind": "body", "amplitude": 0.9, "frequency": 1.54, "phase": 0.12, "lag": 0.1},
            {"front": [78, -18], "back": [-82, 22], "dorsalFin": [-18, -78], "pectoralFin": [-6, 72]},
            [0.5, 0.5],
            36,
            1.12,
            1.08,
            anatomy("torso", 3.05, False, 1.5, 0.88),
            alpha_cutouts=[
                {
                    "kind": "polygon",
                    "points": [[130, 72], [180, 68], [180, 205], [118, 205], [100, 142]],
                }
            ],
        ),
        runtime_part(
            "dorsal-fin",
            (492, 88, 180, 105),
            0.07,
            {"kind": "fin", "amplitude": 0.45, "frequency": 1.45, "phase": 0.18, "lag": 0.04},
            {"root": [24, 38]},
            [0.25, 0.75],
            13,
            0.48,
            0.62,
            anatomy("fin", 0.38, True, 0.62, 0.76),
            "body-1",
            "dorsalFin",
            "root",
            [14, 49],
            alpha_cutouts=[
                {
                    "kind": "polygon",
                    "points": [[0, 64], [180, 56], [180, 105], [0, 105]],
                },
                {
                    "kind": "polygon",
                    "points": [[0, 0], [32, 0], [18, 105], [0, 105]],
                },
            ],
        ),
        runtime_part(
            "pectoral-fin",
            (507, 228, 170, 130),
            0.08,
            {"kind": "fin", "amplitude": 4.4, "frequency": 2.05, "phase": 0.24, "lag": 0.3},
            {"root": [24, -36]},
            [0.24, 0.25],
            14,
            0.5,
            0.64,
            anatomy("fin", 0.42, True, 0.62, 0.78),
            "body-1",
            "pectoralFin",
            "root",
            [-4, -6],
        ),
        runtime_part(
            "head",
            (650, 110, 205, 132),
            0.09,
            {"kind": "root", "amplitude": 2.0, "frequency": 1.25, "phase": 0.0},
            {"neck": [-88, 22], "lowerJaw": [34, 84]},
            [0.5, 0.5],
            38,
            1.22,
            1.22,
            anatomy("head", 3.3, False, 1.65, 0.58),
            "body-1",
            "front",
            "neck",
            [-4, 0],
        ),
        runtime_part(
            "jaw",
            (640, 205, 212, 135),
            0.076,
            {"kind": "jaw", "amplitude": 11.6, "frequency": 1.82, "phase": 0.0, "lag": 0.06},
            {"hinge": [64, 10], "bite": [72, -200]},
            [0.28, 0.22],
            22,
            0.58,
            1.35,
            anatomy("jaw", 0.58, True, 0.8, 0.88),
            "head",
            "lowerJaw",
            "hinge",
            [10, 10],
            alpha_cutouts=[
                {
                    "kind": "polygon",
                    "points": [[0, 0], [212, 0], [212, 28], [112, 26], [62, 48], [0, 64]],
                }
            ],
        ),
    ]

    overlays = [
        socket_overlay("tail-socket", "tail-base", "tail", "tail-base", (0, 42, 78, 70), [-28, 0], 0.018, 0.58, 0.22, 1.12, 0.48),
        socket_overlay("tail-base-socket", "body-4", "tail-base", "body-4", (0, 35, 82, 74), [-28, 0], 0.028, 0.6, 0.23, 1.08, 0.42),
        socket_overlay("body-4-socket", "body-3", "body-4", "body-3", (0, 43, 84, 78), [-30, 0], 0.038, 0.62, 0.23, 1.02, 0.34),
        socket_overlay("body-3-socket", "body-2", "body-3", "body-2", (0, 50, 88, 84), [-31, 0], 0.048, 0.62, 0.23, 1.02, 0.36),
        socket_overlay("body-2-socket", "body-1", "body-2", "body-1", (0, 55, 88, 86), [-31, 0], 0.058, 0.62, 0.24, 1.02, 0.38),
        socket_overlay("dorsal-fin-socket", "body-1", "dorsal-fin", "body-1", (42, 0, 92, 60), [4, -14], 0.078, 0.56, 0.22, 1.0, 0.34),
        socket_overlay("pectoral-fin-socket", "body-1", "pectoral-fin", "body-1", (38, 106, 90, 62), [2, 14], 0.088, 0.54, 0.23, 1.02, 0.42),
        socket_overlay("head-socket", "body-1", "head", "body-1", (94, 48, 80, 92), [26, -2], 0.098, 0.62, 0.24, 1.04, 0.42),
        socket_overlay("jaw-socket", "head", "jaw", "head", (42, 76, 74, 54), [4, 18], 0.108, 0.52, 0.25, 1.08, 0.5),
    ]

    socket_style = {
        "alpha": 0.76,
        "bridgeColor": 0x14243A,
        "bridgeAlpha": 0.44,
        "bridgeStunnedAlpha": 0.2,
        "bridgeCoreColor": 0x79B8C9,
        "bridgeCoreAlpha": 0.2,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 1.18,
        "bridgeSleeveScale": 0.52,
    }

    write_part_images(source, parts)
    write_socket_images(parts, overlays)

    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Needs explicit visual acceptance from sandbox/contact-sheet review before counting toward the 20-threat goal.",
    }

    runtime = json.loads(RUNTIME_MANIFEST.read_text())
    existing = next((creature for creature in runtime["creatures"] if creature["id"] == "abyssal-gulper"), {})
    creature = {
        "id": "abyssal-gulper",
        "species": "Abyssal Gulper",
        "minBiome": existing.get("minBiome", 4),
        "color": existing.get("color", 0x8EA8B8),
        "rarity": existing.get("rarity", "legendary"),
        "radius": 82,
        "hp": existing.get("hp", 320),
        "speed": existing.get("speed", [24, 46]),
        "spawn": existing.get("spawn", {"minDepth": 1500, "maxDepth": 2600, "count": 1}),
        "parts": [
            {key: value for key, value in part.items() if key != "sourceCrop"}
            for part in parts
        ],
        "socketOverlays": [
            {key: value for key, value in overlay.items() if key not in {"sourcePartId", "sourceCrop"}}
            for overlay in overlays
        ],
        "socketStyle": socket_style,
        "murkTint": existing.get("murkTint", {"color": 0x9CB8C8, "intensity": 0.08, "stunnedIntensity": 0.22}),
        "quality": quality,
    }
    runtime["creatures"] = [
        creature if candidate["id"] == "abyssal-gulper" else candidate
        for candidate in runtime["creatures"]
    ]
    RUNTIME_MANIFEST.write_text(f"{json.dumps(runtime, indent=2)}\n")

    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-abyssal-gulper",
        "runtimeCreatureId": "abyssal-gulper",
        "displayName": "Abyssal Gulper",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-abyssal-gulper-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": (
            "Rebuilt from a purpose-generated high-resolution side-view source image with a removable chroma key, "
            "then downsampled and cut into ten overlapping anatomical pieces. This v2 source replaces the old tiny "
            "black-swallower upscale so the gulper reads as a cohesive segmented abyss predator with fins, armor folds, "
            "a long tail, and a large expandable jaw pouch."
        ),
        "murkTint": creature["murkTint"],
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(f"{json.dumps(source_manifest, indent=2)}\n")
    print(f"Wrote v2 Abyssal Gulper from {SOURCE} with {len(parts)} parts and {len(overlays)} sockets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
