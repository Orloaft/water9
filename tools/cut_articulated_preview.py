#!/usr/bin/env python3
"""Cut runtime articulated part PNGs from one transparent creature image.

The runtime manifest places each part as:

    top_left = offset - origin * size

This helper crops those same overlapping windows from a unified source PNG,
writes one PNG per runtime part instance, emits a manifest copy that points at
the emitted PNGs, and builds a composed preview using the same placement math.

Example:
    python3 tools/cut_articulated_preview.py \
      --source path/to/whole-serpent.png \
      --manifest public/assets/generated/articulated-creatures.parts.json \
      --creature-id abyssal-serpent \
      --asset-prefix fauna-abyssal-serpent-unified \
      --fit-alpha \
      --out-dir tools/scratch/articulated-cut
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


DEFAULT_MANIFEST = Path("public/assets/generated/articulated-creatures.parts.json")
DEFAULT_OUT_DIR = Path("tools/scratch/articulated-cut")
TRANSPARENT = (0, 0, 0, 0)


@dataclass(frozen=True)
class PartLayout:
    index: int
    id: str
    texture_key: str
    texture: str
    offset: tuple[float, float]
    origin: tuple[float, float]
    size: tuple[int, int]
    depth: float

    @property
    def box(self) -> tuple[float, float, float, float]:
        width, height = self.size
        left = self.offset[0] - self.origin[0] * width
        top = self.offset[1] - self.origin[1] * height
        return (left, top, left + width, top + height)


@dataclass(frozen=True)
class OutputPart:
    layout: PartLayout
    texture_key: str
    texture: str
    path: Path


def slug(value: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "-", value.strip()).strip("-")
    return safe or "part"


def parse_vec(value: Any, key: str, length: int) -> tuple[float, ...]:
    if not isinstance(value, list | tuple) or len(value) != length:
        raise ValueError(f"{key} must be a {length}-item array")
    return tuple(float(item) for item in value)


def parse_part(part: dict[str, Any], index: int) -> PartLayout:
    offset = parse_vec(part.get("offset"), "offset", 2)
    origin = parse_vec(part.get("origin"), "origin", 2)
    size = parse_vec(part.get("size"), "size", 2)
    return PartLayout(
        index=index,
        id=str(part.get("id") or f"part-{index}"),
        texture_key=str(part.get("textureKey") or Path(str(part.get("texture") or f"part-{index}.png")).stem),
        texture=str(part.get("texture") or f"part-{index}.png"),
        offset=(offset[0], offset[1]),
        origin=(origin[0], origin[1]),
        size=(max(1, int(round(size[0]))), max(1, int(round(size[1])))),
        depth=float(part.get("depth") or 0),
    )


def load_manifest(path: Path, creature_id: str | None) -> tuple[dict[str, Any], dict[str, Any], int | None, list[PartLayout]]:
    manifest = json.loads(path.read_text())
    if manifest.get("schema") != "asset-forge/sprite-parts@1":
        raise ValueError(f"{path} is not an asset-forge/sprite-parts@1 runtime manifest")

    if isinstance(manifest.get("creatures"), list):
        creatures = manifest["creatures"]
        if not creatures:
            raise ValueError(f"{path} has no creatures")
        selected_index = 0
        if creature_id:
            for index, candidate in enumerate(creatures):
                if candidate.get("id") == creature_id:
                    selected_index = index
                    break
            else:
                raise ValueError(f"creature id {creature_id!r} was not found in {path}")
        creature = creatures[selected_index]
    else:
        selected_index = None
        creature = manifest
        if creature_id and creature.get("id") != creature_id:
            raise ValueError(f"top-level creature id is {creature.get('id')!r}, not {creature_id!r}")

    raw_parts = creature.get("parts")
    if not isinstance(raw_parts, list) or not raw_parts:
        raise ValueError("selected creature has no runtime parts")
    parts = [parse_part(part, index) for index, part in enumerate(raw_parts)]
    return manifest, creature, selected_index, parts


def union_box(boxes: list[tuple[float, float, float, float]]) -> tuple[float, float, float, float]:
    return (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )


def alpha_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    if threshold <= 0:
        return alpha.getbbox()
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    return mask.getbbox()


def fit_source_to_layout(
    image: Image.Image,
    layout_box: tuple[float, float, float, float],
    alpha_threshold: int,
    fit_mode: str,
) -> tuple[float, float, float]:
    bbox = alpha_bbox(image, alpha_threshold)
    if not bbox:
        raise ValueError("source image has no non-transparent pixels to fit")

    layout_w = layout_box[2] - layout_box[0]
    layout_h = layout_box[3] - layout_box[1]
    if layout_w <= 0 or layout_h <= 0:
        raise ValueError("manifest layout bounds are empty")

    source_w = bbox[2] - bbox[0]
    source_h = bbox[3] - bbox[1]
    scale_x = source_w / layout_w
    scale_y = source_h / layout_h
    scale = max(scale_x, scale_y) if fit_mode == "cover" else min(scale_x, scale_y)

    layout_cx = (layout_box[0] + layout_box[2]) * 0.5
    layout_cy = (layout_box[1] + layout_box[3]) * 0.5
    source_cx = (bbox[0] + bbox[2]) * 0.5
    source_cy = (bbox[1] + bbox[3]) * 0.5
    return source_cx - layout_cx * scale, source_cy - layout_cy * scale, scale


def source_extent(
    layout: PartLayout,
    root_x: float,
    root_y: float,
    scale: float,
) -> tuple[float, float, float, float]:
    left, top, right, bottom = layout.box
    return (
        root_x + left * scale,
        root_y + top * scale,
        root_x + right * scale,
        root_y + bottom * scale,
    )


def crop_part(
    source: Image.Image,
    layout: PartLayout,
    root_x: float,
    root_y: float,
    scale: float,
) -> Image.Image:
    return source.transform(
        layout.size,
        Image.Transform.EXTENT,
        source_extent(layout, root_x, root_y, scale),
        resample=Image.Resampling.BICUBIC,
        fillcolor=TRANSPARENT,
    )


def build_outputs(parts: list[PartLayout], out_dir: Path, prefix: str, texture_mode: str) -> list[OutputPart]:
    outputs: list[OutputPart] = []
    used_paths: set[Path] = set()
    shared: dict[str, OutputPart] = {}

    for layout in parts:
        if texture_mode == "preserve":
            texture = Path(layout.texture).name
            texture_key = layout.texture_key
            key = texture
            if key in shared:
                outputs.append(OutputPart(layout, texture_key, texture, shared[key].path))
                continue
        else:
            stem = f"{prefix}-{slug(layout.id)}"
            texture = f"{stem}.png"
            texture_key = stem

        path = out_dir / texture
        if path in used_paths:
            stem = Path(texture).stem
            texture = f"{stem}-{layout.index:02d}.png"
            texture_key = Path(texture).stem
            path = out_dir / texture
        used_paths.add(path)

        output = OutputPart(layout, texture_key, texture, path)
        outputs.append(output)
        if texture_mode == "preserve":
            shared[key] = output

    return outputs


def ensure_writable(paths: list[Path], overwrite: bool) -> None:
    existing = [path for path in paths if path.exists()]
    if existing and not overwrite:
        formatted = "\n".join(f"  {path}" for path in existing[:12])
        extra = "" if len(existing) <= 12 else f"\n  ...and {len(existing) - 12} more"
        raise FileExistsError(f"refusing to overwrite existing files without --overwrite:\n{formatted}{extra}")


def write_manifest_copy(
    original_manifest: dict[str, Any],
    selected_index: int | None,
    outputs: list[OutputPart],
    manifest_out: Path,
) -> None:
    manifest = copy.deepcopy(original_manifest)
    creature = manifest["creatures"][selected_index] if selected_index is not None else manifest
    for output in outputs:
        part = creature["parts"][output.layout.index]
        part["textureKey"] = output.texture_key
        part["texture"] = output.texture
    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    manifest_out.write_text(json.dumps(manifest, indent=2) + "\n")


def iround(value: float) -> int:
    return int(math.floor(value + 0.5))


def compose_preview(outputs: list[OutputPart], preview_path: Path, padding: int) -> None:
    bounds = union_box([output.layout.box for output in outputs])
    width = max(1, int(math.ceil(bounds[2] - bounds[0])) + padding * 2)
    height = max(1, int(math.ceil(bounds[3] - bounds[1])) + padding * 2)
    preview = Image.new("RGBA", (width, height), TRANSPARENT)

    for output in sorted(outputs, key=lambda item: (item.layout.depth, item.layout.index)):
        image = Image.open(output.path).convert("RGBA")
        left, top, _, _ = output.layout.box
        x = iround(left - bounds[0] + padding)
        y = iround(top - bounds[1] + padding)
        preview.alpha_composite(image, (x, y))

    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(preview_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Whole transparent creature PNG to cut from.")
    parser.add_argument("--manifest", default=DEFAULT_MANIFEST, type=Path, help="Runtime sprite-parts manifest to use.")
    parser.add_argument("--creature-id", default=None, help="Creature id inside the manifest. Defaults to the first creature.")
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR, type=Path, help="Directory for emitted part PNGs and defaults.")
    parser.add_argument("--preview", type=Path, default=None, help="Composed preview path. Defaults inside --out-dir.")
    parser.add_argument("--manifest-out", type=Path, default=None, help="Copied manifest path. Defaults inside --out-dir.")
    parser.add_argument("--asset-prefix", default=None, help="Prefix for emitted texture names. Defaults to the source stem.")
    parser.add_argument("--texture-mode", choices=("unique", "preserve"), default="unique", help="Emit per-instance textures or preserve manifest texture names.")
    parser.add_argument("--root-x", type=float, default=None, help="Source pixel x that corresponds to manifest coordinate 0.")
    parser.add_argument("--root-y", type=float, default=None, help="Source pixel y that corresponds to manifest coordinate 0.")
    parser.add_argument("--scale", type=float, default=1.0, help="Source pixels per manifest pixel.")
    parser.add_argument("--fit-alpha", action="store_true", help="Fit manifest layout bounds to the source alpha bounds.")
    parser.add_argument("--fit-mode", choices=("contain", "cover"), default="contain", help="Fit mode used with --fit-alpha.")
    parser.add_argument("--alpha-threshold", type=int, default=0, help="Alpha values at or below this count as transparent for --fit-alpha.")
    parser.add_argument("--preview-padding", type=int, default=24, help="Transparent padding around the composed preview.")
    parser.add_argument("--overwrite", action="store_true", help="Allow replacing existing output files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.scale <= 0:
            raise ValueError("--scale must be positive")
        if args.preview_padding < 0:
            raise ValueError("--preview-padding cannot be negative")
        if args.fit_alpha and (args.root_x is not None or args.root_y is not None or args.scale != 1.0):
            raise ValueError("use either --fit-alpha or manual --root-x/--root-y/--scale, not both")

        source_path = args.source
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        if not args.manifest.exists():
            raise FileNotFoundError(args.manifest)

        original_manifest, creature, selected_index, parts = load_manifest(args.manifest, args.creature_id)
        source = Image.open(source_path).convert("RGBA")
        layout_bounds = union_box([part.box for part in parts])
        if args.fit_alpha:
            root_x, root_y, scale = fit_source_to_layout(source, layout_bounds, args.alpha_threshold, args.fit_mode)
        else:
            root_x = args.root_x if args.root_x is not None else source.width * 0.5
            root_y = args.root_y if args.root_y is not None else source.height * 0.5
            scale = args.scale

        prefix = slug(args.asset_prefix or source_path.stem)
        out_dir = args.out_dir
        out_dir.mkdir(parents=True, exist_ok=True)
        preview_path = args.preview or out_dir / f"{prefix}-preview.png"
        manifest_out = args.manifest_out or out_dir / f"{prefix}.parts.json"
        outputs = build_outputs(parts, out_dir, prefix, args.texture_mode)

        unique_part_paths = sorted({output.path for output in outputs})
        ensure_writable(unique_part_paths + [preview_path, manifest_out], args.overwrite)

        for output in outputs:
            if output.path.exists() and output.path in [prior.path for prior in outputs[: output.layout.index]]:
                continue
            image = crop_part(source, output.layout, root_x, root_y, scale)
            output.path.parent.mkdir(parents=True, exist_ok=True)
            image.save(output.path)

        write_manifest_copy(original_manifest, selected_index, outputs, manifest_out)
        compose_preview(outputs, preview_path, args.preview_padding)

        alpha = source.getchannel("A").getextrema()
        if alpha[0] > args.alpha_threshold:
            print(
                f"warning: source alpha minimum is {alpha[0]}; if this should be transparent, try --alpha-threshold",
                file=sys.stderr,
            )
        creature_id = creature.get("id") or "(top-level creature)"
        print(f"cut {len(outputs)} parts for {creature_id}")
        print(f"source: {source_path}")
        print(f"manifest copy: {manifest_out}")
        print(f"preview: {preview_path}")
        print(f"root: ({root_x:.2f}, {root_y:.2f}), scale: {scale:.4f}")
        return 0
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
