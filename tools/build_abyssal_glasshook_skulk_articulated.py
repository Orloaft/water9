#!/usr/bin/env python3
"""Build the articulated Abyssal Glasshook Skulk from bespoke Imagegen source art."""

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
HIGH_SOURCE = GENERATED / "fauna-abyssal-glasshook-skulk-whole-painted-hi.png"
SOURCE = GENERATED / "fauna-abyssal-glasshook-skulk-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-glasshook-skulk.articulated.json"
SOURCE_SIZE = (992, 397)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)
PREFIX = "fauna-abyssal-glasshook-skulk"
CREATURE_ID = "abyssal-glasshook-skulk"
RUNTIME_GEOMETRY_SCALE = 0.5


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.18 if role in {"tail", "fin", "jaw"} else 0.92,
        "angularDrag": 0.76 if role in {"jaw", "fin"} else 0.48 if role == "head" else 0.4,
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
    if part_id == "thorax":
        part["damagedTextureKey"] = f"{PREFIX}-thorax-damaged"
        part["damagedTexture"] = f"{PREFIX}-thorax-damaged.png"
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


def scaled_number(value: float) -> float:
    scaled = value * RUNTIME_GEOMETRY_SCALE
    return int(scaled) if float(scaled).is_integer() else round(scaled, 3)


def scaled_vector(values: list[float]) -> list[float]:
    return [scaled_number(value) for value in values]


def scale_runtime_geometry(parts: list[dict[str, Any]], overlays: list[dict[str, Any]]) -> None:
    for part in parts:
        part["offset"] = scaled_vector(part["offset"])
        part["size"] = scaled_vector(part["size"])
        part["hitRadius"] = scaled_number(part["hitRadius"])
        if part.get("restOffset"):
            part["restOffset"] = scaled_vector(part["restOffset"])
        part["anchors"] = {key: scaled_vector(value) for key, value in part["anchors"].items()}
        if part["motion"].get("amplitude") is not None:
            part["motion"]["amplitude"] = scaled_number(part["motion"]["amplitude"])
    for overlay in overlays:
        overlay["offset"] = scaled_vector(overlay["offset"])
        overlay["size"] = scaled_vector(overlay["size"])


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
        runtime_part(
            "tail-fan",
            (65, 120, 230, 150),
            0.0,
            {"kind": "tail", "amplitude": 8.4, "frequency": 2.18, "phase": 1.24, "lag": 0.52},
            {"front": [84, 4], "tip": [-92, -4]},
            [0.5, 0.5],
            18,
            0.42,
            0.56,
            anatomy("tail", 0.42, True, 0.62, 0.8),
            "tail-stem",
            "back",
            "front",
            [10, 2],
        ),
        runtime_part(
            "tail-stem",
            (245, 145, 165, 115),
            0.01,
            {"kind": "tail", "amplitude": 6.2, "frequency": 2.05, "phase": 0.84, "lag": 0.4},
            {"front": [70, 0], "back": [-72, 4]},
            [0.5, 0.5],
            20,
            0.58,
            0.66,
            anatomy("tail", 0.58, True, 0.7, 0.76),
            "abdomen-3",
            "back",
            "front",
            [6, 0],
        ),
        runtime_part(
            "abdomen-3",
            (345, 85, 140, 185),
            0.02,
            {"kind": "tail", "amplitude": 4.2, "frequency": 1.95, "phase": 0.48, "lag": 0.24},
            {"front": [60, 8], "back": [-60, 32], "rearSwimmeret": [-12, 82]},
            [0.5, 0.5],
            27,
            0.82,
            0.8,
            anatomy("torso", 1.2, True, 0.82, 0.74),
            "abdomen-2",
            "back",
            "front",
            [4, 0],
        ),
        runtime_part(
            "abdomen-2",
            (465, 65, 150, 205),
            0.03,
            {"kind": "body", "amplitude": 2.8, "frequency": 1.82, "phase": 0.24, "lag": 0.14},
            {"front": [62, 10], "back": [-64, 28], "midSwimmeret": [-2, 88]},
            [0.5, 0.5],
            32,
            1.0,
            0.92,
            anatomy("torso", 1.75, False, 1.1, 0.74),
            "thorax",
            "back",
            "front",
            [5, 0],
        ),
        runtime_part(
            "thorax",
            (585, 70, 155, 205),
            0.04,
            {"kind": "body", "amplitude": 1.2, "frequency": 1.65, "phase": 0.06, "lag": 0.06},
            {"front": [66, 12], "back": [-64, 30], "upperClaw": [40, 84], "lowerClaw": [28, 116], "frontSwimmeret": [-18, 108]},
            [0.5, 0.5],
            36,
            1.16,
            1.04,
            anatomy("torso", 2.35, False, 1.35, 0.72),
        ),
        runtime_part(
            "head",
            (700, 90, 145, 125),
            0.075,
            {"kind": "root", "amplitude": 1.8, "frequency": 1.5, "phase": 0.0, "lag": 0.04},
            {"neck": [-56, 24], "bite": [54, 44]},
            [0.5, 0.5],
            30,
            0.92,
            1.12,
            anatomy("head", 1.22, False, 1.08, 0.7),
            "thorax",
            "front",
            "neck",
            [-2, 0],
        ),
        runtime_part(
            "upper-claw",
            (595, 175, 330, 125),
            0.085,
            {"kind": "jaw", "amplitude": 16.0, "frequency": 2.2, "phase": 0.08, "lag": 0.04},
            {"root": [32, -26], "bite": [250, 12]},
            [0.12, 0.32],
            19,
            0.46,
            1.2,
            anatomy("jaw", 0.62, True, 0.72, 0.86),
            "thorax",
            "upperClaw",
            "root",
            [4, 0],
            rotation_offset=-0.08,
        ),
        runtime_part(
            "lower-claw",
            (590, 245, 265, 125),
            0.082,
            {"kind": "jaw", "amplitude": -14.0, "frequency": 2.25, "phase": 0.0, "lag": 0.04},
            {"root": [44, -8], "bite": [190, 4]},
            [0.16, 0.18],
            18,
            0.44,
            1.18,
            anatomy("jaw", 0.58, True, 0.72, 0.86),
            "thorax",
            "lowerClaw",
            "root",
            [0, 2],
            rotation_offset=0.06,
        ),
        runtime_part(
            "rear-swimmeret",
            (330, 215, 120, 120),
            0.06,
            {"kind": "fin", "amplitude": 5.0, "frequency": 2.45, "phase": 0.5, "lag": 0.18},
            {"root": [48, -12]},
            [0.4, 0.2],
            11,
            0.34,
            0.48,
            anatomy("fin", 0.22, True, 0.5, 0.88),
            "abdomen-3",
            "rearSwimmeret",
            "root",
            [-2, 2],
        ),
        runtime_part(
            "mid-swimmeret",
            (440, 210, 120, 130),
            0.062,
            {"kind": "fin", "amplitude": 5.6, "frequency": 2.55, "phase": 0.32, "lag": 0.16},
            {"root": [48, -12]},
            [0.4, 0.18],
            12,
            0.36,
            0.5,
            anatomy("fin", 0.24, True, 0.52, 0.9),
            "abdomen-2",
            "midSwimmeret",
            "root",
            [-2, 2],
        ),
        runtime_part(
            "front-swimmeret",
            (530, 205, 130, 125),
            0.064,
            {"kind": "fin", "amplitude": 6.0, "frequency": 2.65, "phase": 0.16, "lag": 0.14},
            {"root": [52, -10]},
            [0.4, 0.18],
            12,
            0.36,
            0.52,
            anatomy("fin", 0.26, True, 0.54, 0.9),
            "thorax",
            "frontSwimmeret",
            "root",
            [-2, 2],
        ),
    ]

    overlays = [
        socket_overlay("tail-fan-socket", "tail-stem", "tail-fan", "tail-stem", (0, 30, 78, 62), [-26, 0], 0.018, 0.54, 0.2, 1.0, 0.42),
        socket_overlay("tail-stem-socket", "abdomen-3", "tail-stem", "abdomen-3", (0, 70, 78, 76), [-26, 4], 0.028, 0.58, 0.22, 1.0, 0.4),
        socket_overlay("abdomen-3-socket", "abdomen-2", "abdomen-3", "abdomen-2", (0, 82, 82, 82), [-28, 4], 0.038, 0.6, 0.22, 1.02, 0.38),
        socket_overlay("abdomen-2-socket", "thorax", "abdomen-2", "thorax", (0, 84, 86, 86), [-28, 5], 0.048, 0.62, 0.23, 1.02, 0.38),
        socket_overlay("head-socket", "thorax", "head", "thorax", (105, 52, 48, 68), [24, -2], 0.082, 0.54, 0.2, 1.0, 0.42),
        socket_overlay("upper-claw-socket", "thorax", "upper-claw", "thorax", (88, 102, 58, 58), [18, 20], 0.092, 0.5, 0.2, 1.0, 0.46),
        socket_overlay("lower-claw-socket", "thorax", "lower-claw", "thorax", (76, 132, 64, 56), [16, 32], 0.09, 0.5, 0.2, 1.0, 0.46),
        socket_overlay("rear-swimmeret-socket", "abdomen-3", "rear-swimmeret", "abdomen-3", (30, 116, 70, 54), [-6, 28], 0.07, 0.46, 0.18, 1.0, 0.44),
        socket_overlay("mid-swimmeret-socket", "abdomen-2", "mid-swimmeret", "abdomen-2", (42, 124, 72, 56), [-4, 30], 0.072, 0.46, 0.18, 1.0, 0.44),
        socket_overlay("front-swimmeret-socket", "thorax", "front-swimmeret", "thorax", (26, 142, 78, 54), [-8, 34], 0.074, 0.46, 0.18, 1.0, 0.44),
    ]
    return parts, overlays


def main() -> int:
    source = create_source()
    parts, overlays = build_parts()
    write_part_images(source, parts)
    write_socket_images(parts, overlays)
    scale_runtime_geometry(parts, overlays)

    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source-bespoke-imagegen",
        "backgroundKey": "alpha",
        "reviewedBy": None,
        "acceptanceNote": "Original smaller-beast Imagegen source. Needs live motion review before acceptance.",
    }
    socket_style = {
        "alpha": 0.78,
        "bridgeColor": 0x12303A,
        "bridgeAlpha": 0.44,
        "bridgeStunnedAlpha": 0.2,
        "bridgeCoreColor": 0x62F0F4,
        "bridgeCoreAlpha": 0.2,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 1.12,
        "bridgeSleeveScale": 0.48,
    }
    murk_tint = {"color": 0x72CACE, "intensity": 0.09, "stunnedIntensity": 0.19}

    creature = {
        "id": CREATURE_ID,
        "species": "Abyssal Glasshook Skulk",
        "minBiome": 3,
        "color": 0x73CBD0,
        "rarity": "rare",
        "radius": scaled_number(54),
        "hp": 92,
        "speed": [46, 82],
        "spawn": {"minDepth": 920, "maxDepth": 2100, "count": 2},
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
        "displayName": "Abyssal Glasshook Skulk",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": f"public/assets/generated/{PREFIX}-whole-painted.png",
        "sourceTransform": {
            "highSource": f"public/assets/generated/{PREFIX}-whole-painted-hi.png",
            "process": "bespoke Imagegen source cut into a compact crustacean-like articulated rig",
        },
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": (
            "Abyssal Glasshook Skulk is a smaller agile predator with a short arched carapace, fan tail, hooked head, "
            "two scythe claws, and swimmerets. It intentionally avoids the eel/wyrm body plan."
        ),
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(f"{json.dumps(source_manifest, indent=2)}\n")
    print(f"Wrote Abyssal Glasshook Skulk from {SOURCE} with {len(parts)} parts and {len(overlays)} sockets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
