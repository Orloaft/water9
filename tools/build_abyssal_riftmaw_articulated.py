#!/usr/bin/env python3
"""Build the prototype articulated Abyssal Riftmaw from the Gulper blueprint."""

from __future__ import annotations

import colorsys
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from validate_articulated_sources import (
    apply_alpha_cutouts,
    apply_alpha_feather,
    apply_body_cripple_damage,
    apply_severed_wound,
    apply_socket_occlusion,
)


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
BLUEPRINT_SOURCE = GENERATED / "fauna-abyssal-gulper-v2-whole-painted.png"
SOURCE = GENERATED / "fauna-abyssal-riftmaw-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-riftmaw.articulated.json"
SOURCE_SIZE = (887, 444)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)
PREFIX = "fauna-abyssal-riftmaw"
CREATURE_ID = "abyssal-riftmaw"


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.1 if role in {"tail", "fin", "jaw"} else 0.86,
        "angularDrag": 0.76 if role in {"jaw", "fin"} else 0.46 if role == "head" else 0.4,
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


def recolor_blueprint(source: Image.Image) -> Image.Image:
    source = ImageEnhance.Contrast(source).enhance(1.08)
    source = ImageEnhance.Color(source).enhance(1.2)
    pixels = source.load()
    width, height = source.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 12:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if g > r * 1.15 and g > b * 1.15:
                # Keep any accidental key/background green transparent.
                pixels[x, y] = (r, g, b, 0)
                continue
            if b > 95 and g > 80 and r < 95:
                nr, ng, nb = (255, 128, 58)
            else:
                nr, ng, nb = colorsys.hsv_to_rgb((h + 0.09) % 1.0, min(1, s * 1.25), min(1, v * 0.88 + 0.04))
                nr, ng, nb = int(nr * 255), int(ng * 255), int(nb * 255)
                nr = int(nr * 0.78 + 62 * 0.22)
                ng = int(ng * 0.72 + 24 * 0.28)
                nb = int(nb * 0.88 + 92 * 0.12)
            pixels[x, y] = (nr, ng, nb, a)
    return source


def draw_riftmaw_overpaint(source: Image.Image) -> Image.Image:
    glow = Image.new("RGBA", source.size, (0, 0, 0, 0))
    paint = Image.new("RGBA", source.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    pd = ImageDraw.Draw(paint, "RGBA")

    # Raked dorsal blades make the source distinct without turning into flat placeholder triangles.
    for x, base_y, height, width, lean in [
        (292, 174, 42, 22, -12),
        (372, 158, 54, 24, -16),
        (454, 146, 66, 26, -18),
        (535, 138, 76, 28, -20),
        (615, 132, 62, 26, -18),
        (690, 136, 44, 22, -14),
    ]:
        tip = (x + lean, base_y - height)
        pd.polygon(
            [
                (x - width, base_y + 34),
                (x - width // 2, base_y + 4),
                tip,
                (x + width // 2, base_y + 15),
                (x + width, base_y + 33),
                (x + 3, base_y + 24),
            ],
            fill=(24, 14, 48, 58),
        )
        pd.line([tip, (x + 2, base_y + 28)], fill=(255, 122, 61, 118), width=2)
        pd.line([(x - width // 2, base_y + 18), (x + width // 2, base_y + 22)], fill=(98, 48, 116, 42), width=3)

    # Jaw horn, chin barbels, and a tail vane shift the silhouette without breaking the crop plan.
    pd.polygon([(744, 126), (812, 92), (792, 137), (838, 130), (792, 152)], fill=(32, 18, 51, 58))
    pd.line([(746, 128), (808, 96), (792, 148)], fill=(255, 128, 64, 112), width=2)
    for i, x in enumerate([707, 724, 742]):
        pd.line([(x, 306), (x - 20 - i * 5, 372 + i * 10)], fill=(72, 38, 96, 175), width=4)
        pd.line([(x, 306), (x - 20 - i * 5, 372 + i * 10)], fill=(255, 111, 52, 95), width=1)
    pd.polygon([(62, 282), (26, 232), (96, 248), (60, 332), (22, 360)], fill=(32, 18, 52, 54))
    pd.line([(30, 236), (64, 282), (26, 354)], fill=(247, 106, 56, 105), width=2)

    for x in range(185, 720, 42):
        y = 236 + int(22 * ((x % 97) / 97))
        gd.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 104, 42, 180))
        gd.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 84, 30, 42))
    for x, y in [(746, 166), (760, 170), (774, 178), (790, 190)]:
        gd.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(255, 116, 48, 190))
        gd.ellipse((x - 13, y - 13, x + 13, y + 13), fill=(255, 78, 24, 42))

    source = Image.alpha_composite(source, paint.filter(ImageFilter.GaussianBlur(0.15)))
    source = Image.alpha_composite(source, glow.filter(ImageFilter.GaussianBlur(1.2)))
    return source


def create_source() -> Image.Image:
    if not BLUEPRINT_SOURCE.exists():
        raise FileNotFoundError(f"missing blueprint source: {BLUEPRINT_SOURCE}")
    base = Image.open(BLUEPRINT_SOURCE).convert("RGBA")
    base = base.transpose(Image.Transpose.FLIP_LEFT_RIGHT).resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    source = draw_riftmaw_overpaint(recolor_blueprint(base))
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
            (22, 190, 210, 150),
            0.0,
            {"kind": "tail", "amplitude": 5.6, "frequency": 1.72, "phase": 1.16, "lag": 0.68},
            {"front": [86, 0], "tip": [-92, 32]},
            [0.5, 0.5],
            20,
            0.56,
            0.68,
            anatomy("tail", 0.78, True, 0.76, 0.58),
            "tail-base",
            "back",
            "front",
            [18, 8],
        ),
        runtime_part(
            "tail-base",
            (142, 172, 195, 133),
            0.01,
            {"kind": "tail", "amplitude": 4.8, "frequency": 1.68, "phase": 0.9, "lag": 0.52},
            {"front": [82, 0], "back": [-84, 4]},
            [0.5, 0.5],
            25,
            0.76,
            0.8,
            anatomy("tail", 0.92, True, 0.82, 0.64),
            "body-4",
            "back",
            "front",
            [14, 5],
        ),
        runtime_part(
            "body-4",
            (262, 160, 158, 125),
            0.02,
            {"kind": "tail", "amplitude": 3.9, "frequency": 1.62, "phase": 0.68, "lag": 0.38},
            {"front": [66, 0], "back": [-70, 0]},
            [0.5, 0.5],
            28,
            0.9,
            0.88,
            anatomy("tail", 1.28, True, 0.88, 0.7),
            "body-3",
            "back",
            "front",
            [2, 0],
        ),
        runtime_part(
            "body-3",
            (382, 150, 162, 140),
            0.03,
            {"kind": "body", "amplitude": 3.2, "frequency": 1.64, "phase": 0.64, "lag": 0.46},
            {"front": [68, 0], "back": [-70, 0]},
            [0.5, 0.5],
            31,
            1.0,
            0.94,
            anatomy("torso", 2.25, False, 1.4, 0.84),
            "body-2",
            "back",
            "front",
            [3, 0],
        ),
        runtime_part(
            "body-2",
            (500, 142, 166, 155),
            0.04,
            {"kind": "body", "amplitude": 2.0, "frequency": 1.58, "phase": 0.34, "lag": 0.26},
            {"front": [70, 0], "back": [-72, 0]},
            [0.5, 0.5],
            34,
            1.08,
            1.0,
            anatomy("torso", 2.7, False, 1.45, 0.86),
            "body-1",
            "back",
            "front",
            [4, 0],
        ),
        runtime_part(
            "body-1",
            (520, 105, 180, 205),
            0.05,
            {"kind": "body", "amplitude": 0.9, "frequency": 1.54, "phase": 0.1, "lag": 0.1},
            {"front": [78, -18], "back": [-82, 22], "dorsalFin": [-18, -78], "pectoralFin": [-6, 72]},
            [0.5, 0.5],
            36,
            1.14,
            1.1,
            anatomy("torso", 3.1, False, 1.5, 0.88),
            alpha_cutouts=[
                {"kind": "polygon", "points": [[130, 72], [180, 68], [180, 205], [118, 205], [100, 142]]}
            ],
        ),
        runtime_part(
            "dorsal-fin",
            (492, 88, 180, 105),
            0.07,
            {"kind": "fin", "amplitude": 0.75, "frequency": 1.5, "phase": 0.18, "lag": 0.04},
            {"root": [24, 38]},
            [0.25, 0.75],
            13,
            0.5,
            0.64,
            anatomy("fin", 0.42, True, 0.62, 0.76),
            "body-1",
            "dorsalFin",
            "root",
            [14, 49],
            alpha_cutouts=[
                {"kind": "polygon", "points": [[0, 66], [180, 58], [180, 105], [0, 105]]},
                {"kind": "polygon", "points": [[0, 0], [32, 0], [18, 105], [0, 105]]},
            ],
        ),
        runtime_part(
            "pectoral-fin",
            (507, 228, 170, 130),
            0.08,
            {"kind": "fin", "amplitude": 4.2, "frequency": 2.0, "phase": 0.24, "lag": 0.28},
            {"root": [24, -36]},
            [0.24, 0.25],
            14,
            0.52,
            0.66,
            anatomy("fin", 0.44, True, 0.64, 0.78),
            "body-1",
            "pectoralFin",
            "root",
            [-4, -6],
        ),
        runtime_part(
            "head",
            (650, 110, 205, 132),
            0.09,
            {"kind": "root", "amplitude": 1.9, "frequency": 1.22, "phase": 0.0},
            {"neck": [-88, 22], "lowerJaw": [34, 84]},
            [0.5, 0.5],
            38,
            1.26,
            1.24,
            anatomy("head", 3.35, False, 1.68, 0.58),
            "body-1",
            "front",
            "neck",
            [-4, 0],
        ),
        runtime_part(
            "jaw",
            (640, 205, 212, 135),
            0.076,
            {"kind": "jaw", "amplitude": 12.4, "frequency": 1.84, "phase": 0.0, "lag": 0.06},
            {"hinge": [64, 10], "bite": [72, -200]},
            [0.28, 0.22],
            22,
            0.6,
            1.36,
            anatomy("jaw", 0.62, True, 0.84, 0.9),
            "head",
            "lowerJaw",
            "hinge",
            [10, 10],
            alpha_cutouts=[
                {"kind": "polygon", "points": [[0, 0], [212, 0], [212, 28], [112, 26], [62, 48], [0, 64]]}
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
    return parts, overlays


def main() -> int:
    source = create_source()
    parts, overlays = build_parts()
    write_part_images(source, parts)
    write_socket_images(parts, overlays)

    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source-blueprint-derivative",
        "backgroundKey": "alpha",
        "reviewedBy": None,
        "acceptanceNote": "New monster pass derived from the accepted Abyssal Gulper blueprint. Needs human source, motion, and sandbox review before acceptance.",
    }
    socket_style = {
        "alpha": 0.78,
        "bridgeColor": 0x28143A,
        "bridgeAlpha": 0.46,
        "bridgeStunnedAlpha": 0.22,
        "bridgeCoreColor": 0xFF813C,
        "bridgeCoreAlpha": 0.22,
        "bridgeCoreStunnedAlpha": 0.06,
        "bridgeWidthScale": 1.2,
        "bridgeSleeveScale": 0.52,
    }
    murk_tint = {"color": 0xD76B4A, "intensity": 0.14, "stunnedIntensity": 0.2}

    creature = {
        "id": CREATURE_ID,
        "species": "Abyssal Riftmaw",
        "minBiome": 4,
        "color": 0xC06046,
        "rarity": "legendary",
        "radius": 84,
        "hp": 225,
        "speed": [28, 54],
        "spawn": {"minDepth": 1580, "maxDepth": 2700, "count": 1},
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
        "displayName": "Abyssal Riftmaw",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": f"public/assets/generated/{PREFIX}-whole-painted.png",
        "sourceTransform": {
            "blueprint": "public/assets/generated/fauna-abyssal-gulper-v2-whole-painted.png",
            "process": "deterministic recolor plus silhouette overpaint; same socket topology as Abyssal Gulper",
        },
        "coordinateSpace": {"units": "pixels", "origin": "center"},
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [source_overlay(overlay) for overlay in overlays],
        "notes": (
            "Abyssal Riftmaw is the first follow-on monster using the Abyssal Gulper as a blueprint: "
            "single cohesive source, one head, hinged lower jaw, five-part body/tail chain, dorsal and pectoral fins, "
            "socket overlays, sever wounds, and damage texture."
        ),
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(f"{json.dumps(source_manifest, indent=2)}\n")
    print(f"Wrote Abyssal Riftmaw from {SOURCE} with {len(parts)} parts and {len(overlays)} sockets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
