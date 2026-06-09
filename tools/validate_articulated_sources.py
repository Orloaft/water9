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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-manifest", type=Path, default=RUNTIME_MANIFEST)
    parser.add_argument("--source-dir", type=Path, default=GENERATED_DIR)
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


def transformed_source(source: Image.Image, transform: dict[str, Any]) -> Image.Image:
    image = source.copy()
    if transform.get("flipX"):
        image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if transform.get("flipY"):
        image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
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
) -> None:
    if not part.get("sourceCrop"):
        return
    expected = expected_parts.get(part.get("id"))
    if expected is None:
        fail(failures, f"{owner}: expected image could not be built")
        return
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match declared source crop")


def validate_overlay_crop(
    failures: list[str],
    owner: str,
    generated_path: Path,
    source_part_path: Path,
    overlay: dict[str, Any],
) -> None:
    crop = overlay.get("sourceCrop")
    if not crop:
        return
    expected = load_rgba(source_part_path).crop(crop_box(crop))
    actual = load_rgba(generated_path)
    if not images_equal(expected, actual):
        fail(failures, f"{owner}: {generated_path.name} does not match socket source crop from {source_part_path.name}")


def validate_source_manifest(source_path: Path, runtime_by_id: dict[str, Any]) -> list[str]:
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
    try:
        expected_parts = build_expected_part_images(source_image, source_transform, manifest_parts)
    except Exception as error:
        fail(failures, f"{owner}: could not build expected source parts: {error}")
        expected_parts = {}

    runtime_parts_by_texture = {part["texture"]: part for part in runtime.get("parts", [])}
    runtime_overlays_by_texture = {overlay["texture"]: overlay for overlay in runtime.get("socketOverlays", [])}
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
        validate_part_source_crop(failures, part_owner, generated_path, expected_parts, part)

    for runtime_part in runtime.get("parts", []):
        if runtime_part.get("texture") not in source_parts_by_src:
            fail(failures, f"{owner}: runtime part {runtime_part.get('id')} texture {runtime_part.get('texture')} has no source part entry")

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
        source_part_id = overlay.get("sourcePartId")
        source_part = source_parts_by_id.get(source_part_id)
        if not source_part:
            fail(failures, f"{overlay_owner}: sourcePartId {source_part_id!r} is missing from source parts")
            continue
        validate_overlay_crop(failures, overlay_owner, generated_path, GENERATED_DIR / source_part["src"], overlay)

    for runtime_overlay in runtime.get("socketOverlays", []):
        if runtime_overlay.get("texture") not in {overlay.get("src") for overlay in manifest.get("socketOverlays", [])}:
            fail(failures, f"{owner}: runtime socket overlay {runtime_overlay.get('id')} texture {runtime_overlay.get('texture')} has no source overlay entry")

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
        failures.extend(validate_source_manifest(source_path, runtime_by_id))

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
