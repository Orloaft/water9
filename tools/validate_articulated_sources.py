#!/usr/bin/env python3
"""Validate source-cut provenance for articulated creature assets.

The runtime manifest proves how the rig is assembled. These source manifests
prove where the rendered PNG parts and socket overlays came from.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "public/assets/generated"
RUNTIME_MANIFEST = GENERATED_DIR / "articulated-creatures.parts.json"
OVERLAY_STYLE_KEYS = (
    "alpha",
    "bridgeAlpha",
    "bridgeStunnedAlpha",
    "bridgeCoreAlpha",
    "bridgeCoreStunnedAlpha",
    "bridgeColor",
    "bridgeCoreColor",
    "bridgeWidthScale",
    "bridgeSleeveScale",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-manifest", type=Path, default=RUNTIME_MANIFEST)
    parser.add_argument("--source-dir", type=Path, default=GENERATED_DIR)
    parser.add_argument(
        "--write-expected",
        action="store_true",
        help="Rewrite generated articulated PNGs from their source manifests before validating.",
    )
    return parser.parse_args()


def fail(failures: list[str], message: str) -> None:
    failures.append(message)


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def crop_box(crop: dict[str, Any]) -> tuple[int, int, int, int]:
    x = int(crop["x"])
    y = int(crop["y"])
    width = int(crop["width"])
    height = int(crop["height"])
    return x, y, x + width, y + height


def images_equal(left: Image.Image, right: Image.Image) -> bool:
    if left.size != right.size:
        return False
    return ImageChops.difference(left, right).getbbox() is None


def chroma_key_config(transform: dict[str, Any]) -> dict[str, Any] | None:
    config = transform.get("chromaKey")
    if not config:
        return None
    if isinstance(config, dict):
        return config
    return {}


def apply_chroma_key(image: Image.Image, config: dict[str, Any]) -> Image.Image:
    color = config.get("color", [255, 0, 255])
    tolerance = int(config.get("tolerance", 24))
    feather = max(0, int(config.get("feather", 0)))
    if not (isinstance(color, list) and len(color) == 3):
        raise ValueError("sourceTransform.chromaKey.color must be [r, g, b]")
    key_r, key_g, key_b = (int(color[0]), int(color[1]), int(color[2]))
    result = image.convert("RGBA")
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            distance = max(abs(red - key_r), abs(green - key_g), abs(blue - key_b))
            if distance <= tolerance:
                pixels[x, y] = (red, green, blue, 0)
            elif feather and distance <= tolerance + feather:
                fade = (distance - tolerance) / feather
                pixels[x, y] = (red, green, blue, round(alpha * fade))
    return result


def transformed_source(source: Image.Image, transform: dict[str, Any]) -> Image.Image:
    image = source.copy()
    if transform.get("flipX"):
        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if transform.get("flipY"):
        image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    chroma_key = chroma_key_config(transform)
    if chroma_key is not None:
        image = apply_chroma_key(image, chroma_key)
    return image


def resample_filter(name: str | None) -> int:
    if name == "nearest":
        return Image.Resampling.NEAREST
    if name == "bicubic":
        return Image.Resampling.BICUBIC
    if name == "bilinear":
        return Image.Resampling.BILINEAR
    if name == "lanczos":
        return Image.Resampling.LANCZOS
    return Image.Resampling.NEAREST


def apply_post_process(image: Image.Image, process: dict[str, Any] | None) -> Image.Image:
    if not process:
        return image
    result = image
    contrast = process.get("contrast")
    if contrast is not None:
        result = ImageEnhance.Contrast(result).enhance(float(contrast))
    sharpness = process.get("sharpness")
    if sharpness is not None:
        result = ImageEnhance.Sharpness(result).enhance(float(sharpness))
    unsharp = process.get("unsharpMask")
    if unsharp:
        result = result.filter(
            ImageFilter.UnsharpMask(
                radius=float(unsharp.get("radius", 1)),
                percent=int(unsharp.get("percent", 100)),
                threshold=int(unsharp.get("threshold", 0)),
            )
        )
    return result


def paste_alpha_at(source_alpha: Image.Image, target_size: tuple[int, int], offset: tuple[int, int]) -> Image.Image:
    target = Image.new("L", target_size, 0)
    offset_x, offset_y = offset
    source_w, source_h = source_alpha.size
    target_w, target_h = target_size
    source_left = max(0, -offset_x)
    source_top = max(0, -offset_y)
    target_left = max(0, offset_x)
    target_top = max(0, offset_y)
    width = min(source_w - source_left, target_w - target_left)
    height = min(source_h - source_top, target_h - target_top)
    if width <= 0 or height <= 0:
        return target
    target.paste(
        source_alpha.crop((source_left, source_top, source_left + width, source_top + height)),
        (target_left, target_top),
    )
    return target


def apply_alpha_cutouts(
    image: Image.Image,
    cutouts: list[dict[str, Any]] | None,
    part_images: dict[str, Image.Image] | None = None,
) -> Image.Image:
    if not cutouts:
        return image
    result = image.copy()
    alpha = result.getchannel("A")
    for cutout in cutouts:
        shape_mask = Image.new("L", result.size, 0)
        draw = ImageDraw.Draw(shape_mask)
        kind = cutout.get("kind")
        if kind == "polygon":
            points = [tuple(point) for point in cutout.get("points", [])]
            if len(points) < 3:
                raise ValueError("polygon alpha cutout needs at least three points")
            draw.polygon(points, fill=255)
        elif kind == "rectangle":
            box = crop_box(cutout)
            draw.rectangle(box, fill=255)
        elif kind == "ellipse":
            box = crop_box(cutout)
            draw.ellipse(box, fill=255)
        else:
            raise ValueError(f"unsupported alpha cutout kind {kind!r}")
        mask_source_part_id = cutout.get("maskSourcePartId")
        if mask_source_part_id:
            if part_images is None or mask_source_part_id not in part_images:
                raise ValueError(f"alpha cutout maskSourcePartId {mask_source_part_id!r} is missing")
            mask_offset = cutout.get("maskOffset", [0, 0])
            if not (isinstance(mask_offset, list) and len(mask_offset) == 2):
                raise ValueError("alpha cutout maskOffset must be a two-number list")
            source_alpha = part_images[mask_source_part_id].getchannel("A")
            threshold = int(cutout.get("maskAlphaThreshold", 16))
            source_alpha = source_alpha.point(lambda value: 255 if value > threshold else 0)
            source_mask = paste_alpha_at(source_alpha, result.size, (int(mask_offset[0]), int(mask_offset[1])))
            shape_mask = ImageChops.multiply(shape_mask, source_mask)
        alpha.paste(0, mask=shape_mask)
    result.putalpha(alpha)
    return result


def margin_value(config: dict[str, Any], key: str, fallback: int = 0) -> int:
    value = config.get(key)
    if value is None:
        value = config.get("all")
    if value is None:
        value = fallback
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
    minimum = max(0.0, min(1.0, float(feather.get("minimum", 0.0))))
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
                factor = minimum + (1.0 - minimum) * (factor ** curve)
                pixels[x, y] = round(pixels[x, y] * factor)
    result.putalpha(alpha)
    return result


def apply_body_cripple_damage(image: Image.Image) -> Image.Image:
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
        "tail-base-socket": {
            "line": [(8, 30), (21, 25), (37, 28), (50, 31)],
            "width": 7,
            "accent": [(10, 36), (25, 32), (42, 35), (50, 37)],
        },
        "head-socket": {
            "line": [(8, 34), (23, 29), (42, 31), (60, 35)],
            "width": 7,
            "accent": [(11, 41), (28, 37), (47, 39), (59, 42)],
        },
        "fin-back-socket": {
            "line": [(13, 24), (29, 20), (47, 24), (64, 28)],
            "width": 6,
            "accent": [(16, 31), (34, 27), (52, 31), (64, 34)],
        },
        "fin-front-socket": {
            "line": [(12, 26), (29, 22), (48, 27), (66, 31)],
            "width": 6,
            "accent": [(15, 33), (34, 30), (53, 34), (66, 37)],
        },
    }
    return profiles.get(overlay_id)


def apply_socket_occlusion(image: Image.Image, overlay_id: str) -> Image.Image:
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


def build_part_image(source_image: Image.Image, source_transform: dict[str, Any], part: dict[str, Any]) -> Image.Image:
    crop = part.get("sourceCrop")
    if not crop:
        raise ValueError("part has no sourceCrop")
    expected = transformed_source(source_image, source_transform).crop(crop_box(crop))
    scale = source_transform.get("scale", 1)
    if scale != 1:
        scale = int(scale)
        expected = expected.resize((expected.width * scale, expected.height * scale), resample_filter(source_transform.get("resample")))
    return apply_post_process(expected, source_transform.get("postProcess"))


def build_expected_part_images(
    source_image: Image.Image,
    source_transform: dict[str, Any],
    parts: list[dict[str, Any]],
) -> dict[str, Image.Image]:
    raw_images = {
        part["id"]: build_part_image(source_image, source_transform, part)
        for part in parts
        if part.get("id") and part.get("sourceCrop")
    }
    return {
        part["id"]: apply_alpha_cutouts(raw_images[part["id"]], part.get("alphaCutouts"), raw_images)
        for part in parts
        if part.get("id") in raw_images
    }


def validate_declared_size(failures: list[str], owner: str, path: Path, declared: dict[str, Any] | None) -> None:
    if not declared:
        return
    actual = image_size(path)
    expected = (int(declared["width"]), int(declared["height"]))
    if actual != expected:
        fail(failures, f"{owner}: declared size {expected[0]}x{expected[1]} does not match {path.name} {actual[0]}x{actual[1]}")


def validate_part_source_crop(
    failures: list[str],
    owner: str,
    generated_path: Path,
    expected_parts: dict[str, Image.Image],
    part: dict[str, Any],
    write_expected: bool,
) -> None:
    if not part.get("sourceCrop"):
        return
    expected = expected_parts.get(part.get("id"))
    if expected is None:
        fail(failures, f"{owner}: expected image could not be built")
        return
    if write_expected:
        expected.save(generated_path)
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match declared source crop")


def validate_overlay_crop(
    failures: list[str],
    owner: str,
    generated_path: Path,
    source_part_path: Path,
    overlay: dict[str, Any],
    write_expected: bool,
) -> None:
    crop = overlay.get("sourceCrop")
    if not crop:
        return
    expected = load_rgba(source_part_path).crop(crop_box(crop))
    expected = apply_alpha_feather(expected, overlay.get("alphaFeather"))
    socket_process = overlay.get("socketProcess")
    if socket_process is not None:
        expected_process = f"deterministic organic socket occlusion:{overlay.get('id')}"
        if socket_process != expected_process:
            fail(failures, f"{owner}: unsupported socketProcess {socket_process!r}")
            return
        expected = apply_socket_occlusion(expected, str(overlay.get("id")))
    if write_expected:
        expected.save(generated_path)
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match socket source crop from {source_part_path.name}")


def validate_damaged_part_image(
    failures: list[str],
    owner: str,
    generated_path: Path,
    expected_parts: dict[str, Image.Image],
    part: dict[str, Any],
    write_expected: bool,
) -> None:
    damaged_src = part.get("damagedSrc")
    if not damaged_src:
        return
    process = part.get("damagedProcess")
    if process != "deterministic dark wound and crack overlay":
        fail(failures, f"{owner}: unsupported damagedProcess {process!r}")
        return
    base = expected_parts.get(part.get("id"))
    if base is None and part.get("src"):
        legacy_base_path = GENERATED_DIR / part["src"]
        if legacy_base_path.exists():
            base = load_rgba(legacy_base_path)
    if base is None:
        fail(failures, f"{owner}: damaged image could not be built")
        return
    expected = apply_body_cripple_damage(base)
    if write_expected:
        expected.save(generated_path)
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match declared damaged part process")


def validate_severed_overlay_image(
    failures: list[str],
    owner: str,
    generated_path: Path,
    source_part_path: Path,
    overlay: dict[str, Any],
    write_expected: bool,
) -> None:
    severed_src = overlay.get("severedSrc")
    if not severed_src:
        return
    process = overlay.get("severedProcess")
    expected_process = f"deterministic sever wound overlay:{overlay.get('id')}"
    if process != expected_process:
        fail(failures, f"{owner}: unsupported severedProcess {process!r}")
        return
    expected = load_rgba(source_part_path).crop(crop_box(overlay["sourceCrop"]))
    expected = apply_alpha_feather(expected, overlay.get("alphaFeather"))
    if overlay.get("socketProcess"):
        expected = apply_socket_occlusion(expected, str(overlay.get("id")))
    expected = apply_severed_wound(expected, str(overlay.get("id")))
    if write_expected:
        expected.save(generated_path)
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match declared severed socket process")


def validate_source_manifest(source_path: Path, runtime_by_id: dict[str, Any], write_expected: bool) -> list[str]:
    failures: list[str] = []
    manifest = json.loads(source_path.read_text())
    owner = source_path.name
    if manifest.get("schema") != "asset-forge/articulated-creature@1":
        fail(failures, f"{owner}: unsupported schema {manifest.get('schema')!r}")
        return failures

    runtime_id = manifest.get("runtimeCreatureId")
    runtime = runtime_by_id.get(runtime_id)
    if not runtime:
        fail(failures, f"{owner}: runtimeCreatureId {runtime_id!r} is missing from runtime manifest")
        return failures

    source_ref = manifest.get("source")
    if not source_ref:
        fail(failures, f"{owner}: missing source")
        return failures
    base_source = (ROOT / source_ref).resolve()
    if not base_source.exists():
        fail(failures, f"{owner}: source file does not exist: {source_ref}")
        return failures
    source_image = load_rgba(base_source)
    source_transform = manifest.get("sourceTransform") or {}
    manifest_parts = manifest.get("parts", [])
    if manifest.get("socketStyle") != runtime.get("socketStyle"):
        fail(
            failures,
            f"{owner}: socketStyle {manifest.get('socketStyle')!r} does not match runtime {runtime.get('socketStyle')!r}",
        )
    if manifest.get("murkTint") != runtime.get("murkTint"):
        fail(
            failures,
            f"{owner}: murkTint {manifest.get('murkTint')!r} does not match runtime {runtime.get('murkTint')!r}",
        )
    try:
        expected_parts = build_expected_part_images(source_image, source_transform, manifest_parts)
    except Exception as error:
        fail(failures, f"{owner}: could not build expected source parts: {error}")
        expected_parts = {}

    runtime_parts_by_texture = {part["texture"]: part for part in runtime.get("parts", [])}
    runtime_parts_by_id = {part["id"]: part for part in runtime.get("parts", [])}
    runtime_overlays_by_texture = {overlay["texture"]: overlay for overlay in runtime.get("socketOverlays", [])}
    runtime_overlays_by_id = {overlay["id"]: overlay for overlay in runtime.get("socketOverlays", [])}
    source_parts_by_id = {}
    source_parts_by_src = {}

    for part in manifest_parts:
        part_owner = f"{owner}.{part.get('id')}"
        src = part.get("src")
        if not src:
            fail(failures, f"{part_owner}: missing src")
            continue
        generated_path = GENERATED_DIR / src
        if not generated_path.exists():
            fail(failures, f"{part_owner}: generated source part is missing: {src}")
            continue
        source_parts_by_id[part.get("id")] = part
        source_parts_by_src[src] = part
        validate_declared_size(failures, part_owner, generated_path, part.get("size"))
        runtime_part = runtime_parts_by_texture.get(src)
        if not runtime_part:
            fail(failures, f"{part_owner}: not referenced by runtime creature {runtime_id}")
        elif part.get("key") and runtime_part.get("textureKey") != part.get("key"):
            fail(failures, f"{part_owner}: key {part.get('key')} does not match runtime textureKey {runtime_part.get('textureKey')}")
        elif part.get("anatomy") != runtime_part.get("anatomy"):
            fail(
                failures,
                f"{part_owner}: anatomy {part.get('anatomy')!r} does not match runtime {runtime_part.get('anatomy')!r}",
            )
        if runtime_part:
            if part.get("motion") is not None and part.get("motion") != runtime_part.get("motion"):
                fail(failures, f"{part_owner}: motion {part.get('motion')!r} does not match runtime {runtime_part.get('motion')!r}")
            if part.get("damagedSrc"):
                if runtime_part.get("damagedTexture") != part.get("damagedSrc"):
                    fail(
                        failures,
                        f"{part_owner}: damagedSrc {part.get('damagedSrc')!r} does not match runtime {runtime_part.get('damagedTexture')!r}",
                    )
                if runtime_part.get("damagedTextureKey") != part.get("damagedKey"):
                    fail(
                        failures,
                        f"{part_owner}: damagedKey {part.get('damagedKey')!r} does not match runtime {runtime_part.get('damagedTextureKey')!r}",
                    )
        validate_part_source_crop(failures, part_owner, generated_path, expected_parts, part, write_expected)
        damaged_src = part.get("damagedSrc")
        if damaged_src:
            damaged_path = GENERATED_DIR / damaged_src
            if not damaged_path.exists() and not write_expected:
                fail(failures, f"{part_owner}: generated damaged part is missing: {damaged_src}")
            else:
                validate_damaged_part_image(failures, part_owner, damaged_path, expected_parts, part, write_expected)

    for runtime_part in runtime.get("parts", []):
        if runtime_part.get("texture") not in source_parts_by_src:
            fail(failures, f"{owner}: runtime part {runtime_part.get('id')} texture {runtime_part.get('texture')} has no source part entry")
        source_part = source_parts_by_id.get(runtime_part.get("id")) or source_parts_by_src.get(runtime_part.get("texture"))
        if runtime_part.get("damagedTexture") and (not source_part or source_part.get("damagedSrc") != runtime_part.get("damagedTexture")):
            fail(
                failures,
                f"{owner}: runtime part {runtime_part.get('id')} damagedTexture {runtime_part.get('damagedTexture')} has no source damaged entry",
            )

    for overlay in manifest.get("socketOverlays", []):
        overlay_owner = f"{owner}.socketOverlays.{overlay.get('id')}"
        src = overlay.get("src")
        if not src:
            fail(failures, f"{overlay_owner}: missing src")
            continue
        generated_path = GENERATED_DIR / src
        if not generated_path.exists():
            fail(failures, f"{overlay_owner}: generated socket overlay is missing: {src}")
            continue
        runtime_overlay = runtime_overlays_by_texture.get(src)
        if not runtime_overlay:
            fail(failures, f"{overlay_owner}: not referenced by runtime creature {runtime_id}")
        else:
            for key in ("parentId", "childId"):
                if overlay.get(key) != runtime_overlay.get(key):
                    fail(failures, f"{overlay_owner}: {key} {overlay.get(key)!r} does not match runtime {runtime_overlay.get(key)!r}")
            for key in OVERLAY_STYLE_KEYS:
                if overlay.get(key) != runtime_overlay.get(key):
                    fail(
                        failures,
                        f"{overlay_owner}: {key} {overlay.get(key)!r} does not match runtime {runtime_overlay.get(key)!r}",
                    )
            if overlay.get("severedSrc"):
                if runtime_overlay.get("severedTexture") != overlay.get("severedSrc"):
                    fail(
                        failures,
                        f"{overlay_owner}: severedSrc {overlay.get('severedSrc')!r} does not match runtime {runtime_overlay.get('severedTexture')!r}",
                    )
                if runtime_overlay.get("severedTextureKey") != overlay.get("severedKey"):
                    fail(
                        failures,
                        f"{overlay_owner}: severedKey {overlay.get('severedKey')!r} does not match runtime {runtime_overlay.get('severedTextureKey')!r}",
                    )
        source_part_id = overlay.get("sourcePartId")
        source_part = source_parts_by_id.get(source_part_id)
        if not source_part:
            fail(failures, f"{overlay_owner}: sourcePartId {source_part_id!r} is missing from source parts")
            continue
        validate_overlay_crop(
            failures,
            overlay_owner,
            generated_path,
            GENERATED_DIR / source_part["src"],
            overlay,
            write_expected,
        )
        severed_src = overlay.get("severedSrc")
        if severed_src:
            severed_path = GENERATED_DIR / severed_src
            if not severed_path.exists() and not write_expected:
                fail(failures, f"{overlay_owner}: generated severed socket overlay is missing: {severed_src}")
            else:
                validate_severed_overlay_image(
                    failures,
                    overlay_owner,
                    severed_path,
                    GENERATED_DIR / source_part["src"],
                    overlay,
                    write_expected,
                )

    for runtime_overlay in runtime.get("socketOverlays", []):
        if runtime_overlay.get("texture") not in {overlay.get("src") for overlay in manifest.get("socketOverlays", [])}:
            fail(failures, f"{owner}: runtime socket overlay {runtime_overlay.get('id')} texture {runtime_overlay.get('texture')} has no source overlay entry")
        source_overlay_entry = next(
            (overlay for overlay in manifest.get("socketOverlays", []) if overlay.get("id") == runtime_overlay.get("id")),
            None,
        )
        if runtime_overlay.get("severedTexture") and (
            not source_overlay_entry or source_overlay_entry.get("severedSrc") != runtime_overlay.get("severedTexture")
        ):
            fail(
                failures,
                f"{owner}: runtime socket overlay {runtime_overlay.get('id')} severedTexture {runtime_overlay.get('severedTexture')} has no source severed entry",
            )

    return failures


def main() -> int:
    args = parse_args()
    runtime_manifest = json.loads(args.runtime_manifest.read_text())
    runtime_by_id = {creature["id"]: creature for creature in runtime_manifest.get("creatures", [])}
    source_paths = sorted(args.source_dir.glob("*.articulated.json"))
    failures: list[str] = []
    if not source_paths:
        fail(failures, f"no articulated source manifests found in {args.source_dir}")
    for source_path in source_paths:
        failures.extend(validate_source_manifest(source_path, runtime_by_id, args.write_expected))

    runtime_ids_with_source = {
        json.loads(source_path.read_text()).get("runtimeCreatureId")
        for source_path in source_paths
    }
    for runtime_id in runtime_by_id:
        if runtime_id not in runtime_ids_with_source:
            fail(failures, f"runtime creature {runtime_id} has no articulated source manifest")

    if failures:
        for failure in failures:
            print(f"Articulated source failure: {failure}", file=sys.stderr)
        return 1
    count = len(source_paths)
    print(f"Validated source provenance for {count} articulated creature{'s' if count != 1 else ''}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
