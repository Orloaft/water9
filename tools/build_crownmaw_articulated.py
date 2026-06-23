#!/usr/bin/env python3
"""Build the articulated Abyssal Crownmaw from one cohesive source image."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
SOURCE = GENERATED / "fauna-abyssal-crownmaw-whole-painted.png"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFEST = GENERATED / "fauna-abyssal-crownmaw.articulated.json"


def crop_image(source: Image.Image, crop: dict[str, int]) -> Image.Image:
    x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
    return source.crop((x, y, x + width, y + height))


def margin_value(config: dict[str, Any], key: str, fallback: int = 0) -> int:
    value = config.get(key, config.get("all", fallback))
    return max(0, int(value))


def apply_alpha_feather(image: Image.Image, feather: dict[str, Any] | None) -> Image.Image:
    if not feather:
        return image
    result = image.copy()
    alpha = result.getchannel("A")
    pixels = alpha.load()
    width, height = alpha.size
    left = margin_value(feather, "left")
    right = margin_value(feather, "right")
    top = margin_value(feather, "top")
    bottom = margin_value(feather, "bottom")
    curve = max(0.1, float(feather.get("curve", 1.0)))
    if left <= 0 and right <= 0 and top <= 0 and bottom <= 0:
        return result
    for y in range(height):
        for x in range(width):
            factor = 1.0
            if left > 0:
                factor = min(factor, min(1.0, (x + 0.5) / left))
            if right > 0:
                factor = min(factor, min(1.0, (width - x - 0.5) / right))
            if top > 0:
                factor = min(factor, min(1.0, (y + 0.5) / top))
            if bottom > 0:
                factor = min(factor, min(1.0, (height - y - 0.5) / bottom))
            if factor < 1.0:
                pixels[x, y] = round(pixels[x, y] * (factor ** curve))
    result.putalpha(alpha)
    return result


def apply_dorsal_detached_mask(image: Image.Image) -> Image.Image:
    """Keep the dorsal fin as a severed organic stump instead of a torso rectangle."""
    result = image.copy()
    alpha = result.getchannel("A")
    pixels = alpha.load()
    width, height = alpha.size
    for y in range(height):
        for x in range(width):
            current = pixels[x, y]
            if current <= 0:
                continue
            bottom_limit = 96 - x * 0.32
            fade = 12.0
            if y > bottom_limit:
                current = round(current * max(0.0, min(1.0, (bottom_limit + fade - y) / fade)))
            if x > width - 14:
                current = round(current * max(0.0, min(1.0, (width - x) / 14.0)))
            if y > height - 10:
                current = round(current * max(0.0, min(1.0, (height - y) / 10.0)))
            pixels[x, y] = current
    result.putalpha(alpha)
    return result


def apply_body_cripple_damage(image: Image.Image) -> Image.Image:
    """Add readable dark wound cracks to a crippled torso segment without changing its silhouette."""
    result = image.copy()
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    alpha = result.getchannel("A")
    wound_points = [
        (54, 80),
        (73, 72),
        (92, 84),
        (110, 73),
        (132, 88),
        (151, 80),
    ]
    draw.line(wound_points, fill=(5, 2, 8, 210), width=8, joint="curve")
    draw.line(wound_points, fill=(58, 13, 35, 185), width=4, joint="curve")
    for crack in (
        [(75, 74), (69, 55), (58, 42)],
        [(102, 80), (104, 58), (114, 45)],
        [(126, 84), (143, 68), (156, 57)],
        [(92, 86), (86, 108), (76, 124)],
        [(137, 87), (149, 108), (164, 118)],
    ):
        draw.line(crack, fill=(2, 1, 5, 195), width=3)
        draw.line(crack, fill=(99, 35, 64, 125), width=1)
    for box in ((82, 73, 108, 95), (122, 78, 144, 99), (62, 76, 80, 92)):
        draw.ellipse(box, fill=(7, 3, 12, 130))
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha.point(lambda value: 255 if value > 16 else 0)))
    result.alpha_composite(overlay)
    return result


def severed_wound_profile(overlay_id: str) -> dict[str, Any]:
    profiles: dict[str, dict[str, Any]] = {
        "tail-socket": {
            "ellipse": (8, 15, 62, 52),
            "rim": [(12, 33), (24, 20), (39, 22), (56, 33), (45, 46), (26, 48)],
            "slashes": [[(27, 22), (22, 11)], [(42, 26), (54, 14)], [(34, 46), (30, 58)]],
        },
        "dorsal-fin-socket": {
            "ellipse": (20, 18, 76, 48),
            "rim": [(23, 34), (36, 22), (52, 20), (72, 30), (62, 43), (41, 45)],
            "slashes": [[(39, 23), (35, 10)], [(55, 25), (67, 12)], [(47, 44), (43, 57)]],
        },
        "jaw-socket": {
            "ellipse": (8, 13, 63, 53),
            "rim": [(12, 34), (25, 19), (44, 20), (60, 33), (49, 48), (27, 50)],
            "slashes": [[(25, 21), (19, 10)], [(43, 23), (55, 12)], [(36, 47), (36, 57)]],
        },
    }
    return profiles.get(
        overlay_id,
        {
            "ellipse": (12, 16, 58, 48),
            "rim": [(16, 31), (28, 21), (44, 23), (56, 32), (46, 44), (28, 45)],
            "slashes": [[(30, 22), (24, 12)], [(43, 26), (54, 15)]],
        },
    )


def apply_severed_wound(image: Image.Image, overlay_id: str) -> Image.Image:
    """Paint a readable stump on top of a socket crop without changing its source silhouette."""
    result = image.copy()
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    profile = severed_wound_profile(overlay_id)
    alpha = result.getchannel("A")
    draw.ellipse(profile["ellipse"], fill=(2, 1, 5, 230), outline=(86, 26, 48, 182), width=3)
    draw.line(profile["rim"], fill=(112, 37, 62, 176), width=3, joint="curve")
    draw.line(profile["rim"], fill=(7, 3, 11, 210), width=1, joint="curve")
    for slash in profile["slashes"]:
        draw.line(slash, fill=(2, 1, 5, 190), width=3)
        draw.line(slash, fill=(111, 53, 74, 118), width=1)
    for x, y in profile["rim"][::2]:
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=(143, 69, 86, 120))
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha.point(lambda value: 255 if value > 12 else 0)))
    result.alpha_composite(overlay)
    return result


def socket_occlusion_profile(overlay_id: str) -> dict[str, Any] | None:
    profiles: dict[str, dict[str, Any]] = {
        "tail-socket": {
            "line": [(10, 33), (27, 28), (48, 33), (68, 31)],
            "width": 7,
            "accent": [(14, 38), (30, 34), (51, 38), (66, 36)],
        },
        "body-4-socket": {
            "line": [(8, 40), (28, 34), (52, 38), (78, 36)],
            "width": 8,
            "accent": [(12, 47), (34, 43), (58, 46), (76, 44)],
        },
        "body-3-socket": {
            "line": [(8, 44), (30, 38), (56, 42), (84, 39)],
            "width": 9,
            "accent": [(12, 52), (34, 48), (60, 51), (82, 48)],
        },
        "body-2-socket": {
            "line": [(8, 42), (28, 35), (54, 39), (82, 37)],
            "width": 9,
            "accent": [(12, 50), (34, 46), (58, 49), (80, 46)],
        },
        "pectoral-fin-socket": {
            "line": [(12, 27), (27, 23), (48, 28), (70, 31)],
            "width": 6,
            "accent": [(16, 33), (34, 30), (55, 35), (68, 37)],
        },
        "jaw-socket": {
            "line": [(10, 32), (24, 25), (43, 28), (62, 34)],
            "width": 7,
            "accent": [(13, 38), (29, 34), (48, 37), (60, 41)],
        },
    }
    return profiles.get(overlay_id)


def apply_socket_occlusion(image: Image.Image, overlay_id: str) -> Image.Image:
    """Darken selected normal socket crops so live seams read as organic folds."""
    profile = socket_occlusion_profile(overlay_id)
    if not profile:
        return image
    result = image.copy()
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    alpha = result.getchannel("A")
    draw.line(profile["line"], fill=(2, 5, 10, 116), width=profile["width"], joint="curve")
    draw.line(profile["line"], fill=(34, 54, 72, 86), width=max(1, int(profile["width"] * 0.38)), joint="curve")
    draw.line(profile["accent"], fill=(5, 10, 18, 92), width=max(2, int(profile["width"] * 0.48)), joint="curve")
    overlay.putalpha(ImageChops.multiply(overlay.getchannel("A"), alpha.point(lambda value: 255 if value > 12 else 0)))
    result.alpha_composite(overlay)
    return result


def apply_alpha_cutouts(image: Image.Image, cutouts: list[dict[str, Any]] | None) -> Image.Image:
    if not cutouts:
        return image
    result = image.copy()
    alpha = result.getchannel("A")
    for cutout in cutouts:
        mask = Image.new("L", result.size, 0)
        draw = ImageDraw.Draw(mask)
        kind = cutout.get("kind")
        if kind == "polygon":
            points = [tuple(point) for point in cutout.get("points", [])]
            if len(points) >= 3:
                draw.polygon(points, fill=255)
        elif kind == "rectangle":
            x, y = int(cutout["x"]), int(cutout["y"])
            width, height = int(cutout["width"]), int(cutout["height"])
            draw.rectangle((x, y, x + width, y + height), fill=255)
        elif kind == "ellipse":
            x, y = int(cutout["x"]), int(cutout["y"])
            width, height = int(cutout["width"]), int(cutout["height"])
            draw.ellipse((x, y, x + width, y + height), fill=255)
        alpha.paste(0, mask=mask)
    result.putalpha(alpha)
    return result


def write_crop(
    source: Image.Image,
    filename: str,
    crop: dict[str, int],
    feather: dict[str, Any] | None = None,
    cutouts: list[dict[str, Any]] | None = None,
) -> None:
    apply_alpha_feather(apply_alpha_cutouts(crop_image(source, crop), cutouts), feather).save(GENERATED / filename)


def write_dorsal_detached_crop(
    source: Image.Image,
    filename: str,
    crop: dict[str, int],
    cutouts: list[dict[str, Any]] | None = None,
) -> None:
    apply_alpha_feather(apply_dorsal_detached_mask(apply_alpha_cutouts(crop_image(source, crop), cutouts)), {"all": 5, "curve": 1.25}).save(
        GENERATED / filename
    )


def write_body_damage_crop(
    source: Image.Image,
    filename: str,
    crop: dict[str, int],
    cutouts: list[dict[str, Any]] | None = None,
) -> None:
    apply_body_cripple_damage(apply_alpha_cutouts(crop_image(source, crop), cutouts)).save(GENERATED / filename)


def write_socket_overlay_crop(source: Image.Image, overlay: dict[str, Any], crop: dict[str, int]) -> None:
    base = apply_socket_occlusion(apply_alpha_feather(crop_image(source, crop), {"all": 8, "curve": 1.55}), overlay["id"])
    base.save(GENERATED / overlay["texture"])
    if overlay.get("severedTexture"):
        apply_severed_wound(base, overlay["id"]).save(GENERATED / overlay["severedTexture"])


def anatomy(role: str, mass: float, severable: bool, break_threshold: float, mobility: float) -> dict[str, Any]:
    return {
        "role": role,
        "mass": mass,
        "drag": 1.05 if role in {"tail", "fin", "jaw"} else 0.82,
        "angularDrag": 0.72 if role in {"jaw", "fin"} else 0.42 if role == "head" else 0.36,
        "severable": severable,
        "breakThreshold": break_threshold,
        "mobilityFactor": mobility,
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
    if part.get("detachedTexture"):
        result["detachedSrc"] = part["detachedTexture"]
        result["detachedKey"] = part["detachedTextureKey"]
        result["detachedAlphaMask"] = "tapered dorsal sever mask"
    if part.get("damagedTexture"):
        result["damagedSrc"] = part["damagedTexture"]
        result["damagedKey"] = part["damagedTextureKey"]
        result["damagedProcess"] = "deterministic dark wound and crack overlay"
    if part.get("alphaCutouts"):
        result["alphaCutouts"] = part["alphaCutouts"]
    return result


def source_overlay(overlay: dict[str, Any], source_part_id: str, source_crop: dict[str, int]) -> dict[str, Any]:
    alpha_feather = {
        "all": 8,
        "curve": 1.55,
    }
    result = {
        "id": overlay["id"],
        "src": overlay["texture"],
        "parentId": overlay["parentId"],
        "childId": overlay["childId"],
        "sourcePartId": source_part_id,
        "sourceCrop": source_crop,
        "alphaFeather": alpha_feather,
    }
    for key in (
        "alpha",
        "bridgeAlpha",
        "bridgeStunnedAlpha",
        "bridgeCoreAlpha",
        "bridgeCoreStunnedAlpha",
        "bridgeColor",
        "bridgeCoreColor",
        "bridgeWidthScale",
        "bridgeSleeveScale",
    ):
        if key in overlay:
            result[key] = overlay[key]
    if overlay.get("severedTexture"):
        result["severedSrc"] = overlay["severedTexture"]
        result["severedKey"] = overlay["severedTextureKey"]
        result["severedProcess"] = f"deterministic sever wound overlay:{overlay['id']}"
    if socket_occlusion_profile(overlay["id"]):
        result["socketProcess"] = f"deterministic organic socket occlusion:{overlay['id']}"
    return result


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
) -> dict[str, Any]:
    x, y, width, height = crop
    part: dict[str, Any] = {
        "id": part_id,
        "textureKey": f"fauna-abyssal-crownmaw-{part_id}",
        "texture": f"fauna-abyssal-crownmaw-{part_id}.png",
        "sourceCrop": {"x": x, "y": y, "width": width, "height": height},
        "offset": [x + width / 2 - 360, y + height / 2 - 118],
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
    if part_id == "dorsal-fin":
        part["detachedTextureKey"] = "fauna-abyssal-crownmaw-dorsal-fin-detached"
        part["detachedTexture"] = "fauna-abyssal-crownmaw-dorsal-fin-detached.png"
        part["alphaCutouts"] = [
            {"kind": "polygon", "points": [[76, 58], [128, 50], [128, 96], [56, 96], [64, 72]]},
        ]
    elif part_id == "pectoral-fin":
        part["alphaCutouts"] = [
            {"kind": "polygon", "points": [[0, 0], [50, 0], [32, 24], [0, 56]]},
        ]
    elif part_id == "head":
        part["alphaCutouts"] = [
            {"kind": "polygon", "points": [[46, 86], [74, 76], [170, 82], [172, 124], [56, 124], [38, 106]]},
        ]
    elif part_id == "body-2":
        part["damagedTextureKey"] = "fauna-abyssal-crownmaw-body-2-damaged"
        part["damagedTexture"] = "fauna-abyssal-crownmaw-body-2-damaged.png"
    if parent_id:
        part["parentId"] = parent_id
        part["parentAnchor"] = parent_anchor
        part["anchor"] = anchor
        part["restOffset"] = rest_offset or [0, 0]
    if rotation_offset is not None:
        part["rotationOffset"] = rotation_offset
    return part


def main() -> int:
    source = Image.open(SOURCE).convert("RGBA")

    parts = [
        runtime_part(
            "tail",
            (0, 67, 140, 118),
            0.0,
            {"kind": "tail", "amplitude": 11.8, "frequency": 2.45, "phase": 1.78, "lag": 1.55},
            {"front": [50, -6], "tip": [-58, 14]},
            [0.72, 0.52],
            18,
            0.46,
            0.62,
            anatomy("tail", 0.72, True, 0.72, 0.55),
            "body-4",
            "back",
            "front",
        ),
        runtime_part(
            "body-4",
            (76, 58, 164, 128),
            0.018,
            {"kind": "tail", "amplitude": 8.4, "frequency": 2.25, "phase": 1.18, "lag": 1.28},
            {"front": [55, -3], "back": [-55, 2]},
            [0.5, 0.5],
            26,
            0.78,
            0.78,
            anatomy("tail", 1.35, True, 0.86, 0.62),
            "body-3",
            "back",
            "front",
            [2, 0],
        ),
        runtime_part(
            "body-3",
            (190, 42, 172, 152),
            0.038,
            {"kind": "body", "amplitude": 5.4, "frequency": 1.95, "phase": 0.78, "lag": 0.86},
            {"front": [60, -2], "back": [-62, 0]},
            [0.5, 0.5],
            34,
            1.0,
            0.94,
            anatomy("torso", 2.6, False, 1.45, 0.84),
            "body-2",
            "back",
            "front",
            [3, 0],
        ),
        runtime_part(
            "body-2",
            (315, 28, 182, 170),
            0.058,
            {"kind": "body", "amplitude": 3.5, "frequency": 1.78, "phase": 0.44, "lag": 0.56},
            {"front": [65, -2], "back": [-64, 0]},
            [0.5, 0.5],
            40,
            1.1,
            1.02,
            anatomy("torso", 3.05, False, 1.5, 0.86),
            "body-1",
            "back",
            "front",
            [4, 0],
        ),
        runtime_part(
            "body-1",
            (455, 48, 138, 122),
            0.08,
            {"kind": "body", "amplitude": 1.5, "frequency": 1.52, "phase": 0.14, "lag": 0.18},
            {"front": [56, -2], "back": [-54, 0], "dorsalFin": [6, -58], "pectoralFin": [42, 50]},
            [0.5, 0.5],
            42,
            1.18,
            1.08,
            anatomy("torso", 3.3, False, 1.55, 0.86),
        ),
        runtime_part(
            "dorsal-fin",
            (428, 5, 128, 96),
            0.102,
            {"kind": "fin", "amplitude": 4.4, "frequency": 2.35, "phase": 1.28, "lag": 0.35},
            {"root": [2, 36]},
            [0.45, 0.78],
            12,
            0.44,
            0.55,
            anatomy("fin", 0.34, True, 0.62, 0.78),
            "body-1",
            "dorsalFin",
            "root",
            [0, -2],
        ),
        runtime_part(
            "pectoral-fin",
            (483, 110, 122, 108),
            0.126,
            {"kind": "fin", "amplitude": 7.2, "frequency": 2.9, "phase": 0.2, "lag": 0.5},
            {"root": [-28, -34]},
            [0.28, 0.18],
            13,
            0.44,
            0.55,
            anatomy("fin", 0.38, True, 0.62, 0.78),
            "body-1",
            "pectoralFin",
            "root",
            [-5, -8],
        ),
        runtime_part(
            "head",
            (548, 44, 172, 124),
            0.14,
            {"kind": "root", "amplitude": 2.2, "frequency": 1.25, "phase": 0},
            {"neck": [-64, 0], "lowerJaw": [-25, 41]},
            [0.5, 0.5],
            39,
            1.22,
            1.25,
            anatomy("head", 3.15, False, 1.7, 0.56),
            "body-1",
            "front",
            "neck",
            [-5, 0],
        ),
        runtime_part(
            "jaw",
            (574, 102, 146, 122),
            0.134,
            {"kind": "jaw", "amplitude": 17.0, "frequency": 3.1, "phase": 0, "lag": 0.2},
            {"hinge": [-45, -34], "bite": [60, 18]},
            [0.19, 0.24],
            19,
            0.52,
            1.35,
            anatomy("jaw", 0.62, True, 0.82, 0.86),
            "head",
            "lowerJaw",
            "hinge",
            [-6, -4],
        ),
    ]

    overlays = [
        {
            "id": "tail-socket",
            "textureKey": "fauna-abyssal-crownmaw-tail-socket",
            "texture": "fauna-abyssal-crownmaw-tail-socket.png",
            "severedTextureKey": "fauna-abyssal-crownmaw-tail-wound",
            "severedTexture": "fauna-abyssal-crownmaw-tail-wound.png",
            "parentId": "body-4",
            "childId": "tail",
            "offset": [-16, 0],
            "origin": [0.5, 0.5],
            "size": [78, 64],
            "depth": 0.026,
            "bridgeAlpha": 0.18,
            "alpha": 0.62,
            "bridgeCoreAlpha": 0.08,
            "bridgeWidthScale": 1.14,
            "bridgeSleeveScale": 0.48,
        },
        {
            "id": "body-4-socket",
            "textureKey": "fauna-abyssal-crownmaw-body-4-socket",
            "texture": "fauna-abyssal-crownmaw-body-4-socket.png",
            "parentId": "body-3",
            "childId": "body-4",
            "offset": [-6, 0],
            "origin": [0.5, 0.5],
            "size": [88, 78],
            "depth": 0.048,
            "alpha": 0.64,
            "bridgeAlpha": 0.22,
            "bridgeCoreAlpha": 0.09,
            "bridgeWidthScale": 0.98,
            "bridgeSleeveScale": 0.28,
        },
        {
            "id": "body-3-socket",
            "textureKey": "fauna-abyssal-crownmaw-body-3-socket",
            "texture": "fauna-abyssal-crownmaw-body-3-socket.png",
            "parentId": "body-2",
            "childId": "body-3",
            "offset": [-4, 0],
            "origin": [0.5, 0.5],
            "size": [92, 86],
            "depth": 0.068,
            "alpha": 0.66,
            "bridgeAlpha": 0.22,
            "bridgeCoreAlpha": 0.09,
            "bridgeWidthScale": 1.0,
            "bridgeSleeveScale": 0.32,
        },
        {
            "id": "body-2-socket",
            "textureKey": "fauna-abyssal-crownmaw-body-2-socket",
            "texture": "fauna-abyssal-crownmaw-body-2-socket.png",
            "parentId": "body-1",
            "childId": "body-2",
            "offset": [-4, 0],
            "origin": [0.5, 0.5],
            "size": [90, 82],
            "depth": 0.09,
            "alpha": 0.66,
            "bridgeAlpha": 0.23,
            "bridgeCoreAlpha": 0.095,
            "bridgeWidthScale": 1.02,
            "bridgeSleeveScale": 0.36,
        },
        {
            "id": "dorsal-fin-socket",
            "textureKey": "fauna-abyssal-crownmaw-dorsal-fin-socket",
            "texture": "fauna-abyssal-crownmaw-dorsal-fin-socket.png",
            "severedTextureKey": "fauna-abyssal-crownmaw-dorsal-fin-wound",
            "severedTexture": "fauna-abyssal-crownmaw-dorsal-fin-wound.png",
            "parentId": "body-1",
            "childId": "dorsal-fin",
            "offset": [0, -14],
            "origin": [0.5, 0.5],
            "size": [98, 64],
            "depth": 0.117,
            "alpha": 0.58,
            "bridgeAlpha": 0.22,
            "bridgeCoreAlpha": 0.095,
            "bridgeWidthScale": 1.0,
            "bridgeSleeveScale": 0.34,
        },
        {
            "id": "pectoral-fin-socket",
            "textureKey": "fauna-abyssal-crownmaw-pectoral-fin-socket",
            "texture": "fauna-abyssal-crownmaw-pectoral-fin-socket.png",
            "parentId": "body-1",
            "childId": "pectoral-fin",
            "offset": [0, 14],
            "origin": [0.5, 0.5],
            "size": [82, 58],
            "depth": 0.137,
            "alpha": 0.5,
            "bridgeAlpha": 0.24,
            "bridgeCoreAlpha": 0.085,
            "bridgeWidthScale": 1.05,
            "bridgeSleeveScale": 0.42,
        },
        {
            "id": "head-socket",
            "textureKey": "fauna-abyssal-crownmaw-head-socket",
            "texture": "fauna-abyssal-crownmaw-head-socket.png",
            "parentId": "body-1",
            "childId": "head",
            "offset": [-2, 0],
            "origin": [0.5, 0.5],
            "size": [94, 82],
            "depth": 0.146,
            "alpha": 0.66,
            "bridgeAlpha": 0.24,
            "bridgeCoreAlpha": 0.095,
            "bridgeWidthScale": 1.0,
            "bridgeSleeveScale": 0.44,
        },
        {
            "id": "jaw-socket",
            "textureKey": "fauna-abyssal-crownmaw-jaw-socket",
            "texture": "fauna-abyssal-crownmaw-jaw-socket.png",
            "severedTextureKey": "fauna-abyssal-crownmaw-jaw-wound",
            "severedTexture": "fauna-abyssal-crownmaw-jaw-wound.png",
            "parentId": "head",
            "childId": "jaw",
            "offset": [-4, 5],
            "origin": [0.5, 0.5],
            "size": [72, 58],
            "depth": 0.158,
            "alpha": 0.52,
            "bridgeAlpha": 0.25,
            "bridgeCoreAlpha": 0.11,
            "bridgeWidthScale": 1.08,
            "bridgeSleeveScale": 0.5,
        },
    ]

    overlay_sources = {
        "tail-socket": ("body-4", {"x": 0, "y": 32, "width": 78, "height": 64}),
        "body-4-socket": ("body-3", {"x": 0, "y": 38, "width": 88, "height": 78}),
        "body-3-socket": ("body-2", {"x": 0, "y": 44, "width": 92, "height": 86}),
        "body-2-socket": ("body-1", {"x": 0, "y": 24, "width": 90, "height": 82}),
        "dorsal-fin-socket": ("body-1", {"x": 14, "y": 0, "width": 98, "height": 64}),
        "pectoral-fin-socket": ("body-1", {"x": 48, "y": 58, "width": 82, "height": 58}),
        "head-socket": ("body-1", {"x": 44, "y": 12, "width": 94, "height": 82}),
        "jaw-socket": ("head", {"x": 18, "y": 50, "width": 72, "height": 58}),
    }

    socket_style = {
        "alpha": 0.6,
        "bridgeColor": 0x07101A,
        "bridgeAlpha": 0.2,
        "bridgeStunnedAlpha": 0.12,
        "bridgeCoreColor": 0x506A87,
        "bridgeCoreAlpha": 0.08,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 0.88,
    }
    murk_tint = {
        "color": 0x86A9B6,
        "intensity": 0.13,
        "stunnedIntensity": 0.18,
    }
    quality = {
        "status": "prototype",
        "sourceCohesion": "single-source",
        "backgroundKey": "magenta",
        "reviewedBy": None,
        "acceptanceNote": "Needs explicit visual acceptance from sandbox/contact-sheet review before counting toward the 20-threat goal.",
    }
    creature = {
        "id": "abyssal-crownmaw",
        "species": "Abyssal Crownmaw",
        "minBiome": 4,
        "color": 0x7BA8C7,
        "rarity": "legendary",
        "radius": 62,
        "hp": 310,
        "speed": [26, 50],
        "spawn": {
            "minDepth": 1650,
            "maxDepth": 2800,
            "count": 1,
        },
        "murkTint": murk_tint,
        "parts": [
            {key: value for key, value in part.items() if key not in {"sourceCrop", "alphaCutouts"}}
            for part in parts
        ],
        "socketOverlays": overlays,
        "socketStyle": socket_style,
        "quality": quality,
    }

    part_by_id = {part["id"]: part for part in parts}
    for part in parts:
        write_crop(source, part["texture"], part["sourceCrop"], cutouts=part.get("alphaCutouts"))
        if part.get("detachedTexture"):
            write_dorsal_detached_crop(source, part["detachedTexture"], part["sourceCrop"], part.get("alphaCutouts"))
        if part.get("damagedTexture"):
            write_body_damage_crop(source, part["damagedTexture"], part["sourceCrop"], part.get("alphaCutouts"))
    for overlay in overlays:
        source_part_id, crop = overlay_sources[overlay["id"]]
        source_part_path = GENERATED / part_by_id[source_part_id]["texture"]
        source_part_image = Image.open(source_part_path).convert("RGBA")
        write_socket_overlay_crop(source_part_image, overlay, crop)

    source_manifest = {
        "schema": "asset-forge/articulated-creature@1",
        "name": "fauna-abyssal-crownmaw",
        "runtimeCreatureId": "abyssal-crownmaw",
        "displayName": "Abyssal Crownmaw",
        "kind": "articulated-creature",
        "depthBand": "abyss",
        "source": "public/assets/generated/fauna-abyssal-crownmaw-whole-painted.png",
        "sourceTransform": {},
        "coordinateSpace": {
            "units": "pixels",
            "origin": "center",
        },
        "parts": [source_part(part) for part in parts],
        "socketOverlays": [
            source_overlay(overlay, overlay_sources[overlay["id"]][0], overlay_sources[overlay["id"]][1])
            for overlay in overlays
        ],
        "notes": "Generated from one purpose-built high-resolution Crownmaw source image on chroma key, then cut into overlapping anatomical pieces. This source is intended as the first clean proof that the articulated rig can use cohesive full-creature concept art rather than rescuing a tiny legacy sprite. Socket overlays are parent-source crops with feathered alpha borders so joints read as organic sleeves instead of rectangular patches.",
        "murkTint": murk_tint,
        "socketStyle": socket_style,
        "quality": quality,
    }
    SOURCE_MANIFEST.write_text(json.dumps(source_manifest, indent=2) + "\n")

    runtime_manifest = json.loads(RUNTIME_MANIFEST.read_text())
    creatures = runtime_manifest.setdefault("creatures", [])
    creatures[:] = [candidate for candidate in creatures if candidate.get("id") != creature["id"]]
    creatures.append(creature)
    RUNTIME_MANIFEST.write_text(json.dumps(runtime_manifest, indent=2) + "\n")
    print(f"Wrote {creature['id']} with {len(parts)} parts and {len(overlays)} socket overlays")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
