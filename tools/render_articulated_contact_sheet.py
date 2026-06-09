#!/usr/bin/env python3
"""Render a deterministic visual review sheet for articulated creatures.

This intentionally mirrors the placement math in validate_articulated_seams.py
so the preview exposes the same socket, depth, facing, and motion behavior that
the validator checks numerically.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "public/assets/generated/articulated-creatures.parts.json"
DEFAULT_ASSET_DIR = ROOT / "public/assets/generated"
DEFAULT_OUT = ROOT / "tools/scratch/articulated-contact-sheet.png"
PART_WORLD_SCALE = 0.72
ALPHA_THRESHOLD = 8
BACKGROUND = (4, 10, 16, 255)
PANEL = (8, 20, 29, 255)
PANEL_BORDER = (50, 83, 94, 255)
TEXT = (199, 230, 229, 255)
MUTED_TEXT = (111, 151, 158, 255)
POSES = (
    ("right idle", 1, 0.0, 0.0),
    ("right swim", 1, math.tau * 0.25, 0.0),
    ("left swim", -1, math.tau * 0.5, 0.0),
    ("jaw lunge", 1, math.tau * 0.125, 1.0),
)


@dataclass(frozen=True)
class Placement:
    x: float
    y: float
    rotation: float


@dataclass(frozen=True)
class RenderEntry:
    id: str
    texture: str
    origin: tuple[float, float]
    size: tuple[float, float]
    depth: float
    placement: Placement
    facing: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-dir", type=Path, default=DEFAULT_ASSET_DIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--render-zoom", type=float, default=3.0)
    parser.add_argument("--padding", type=int, default=44)
    return parser.parse_args()


def anchor_offset(part: dict[str, Any], facing: int, rotation: float, anchor: tuple[float, float]) -> tuple[float, float]:
    width, height = part["size"]
    origin_x, origin_y = part["origin"]
    anchor_x, anchor_y = anchor
    local_x = facing * (anchor_x + (0.5 - origin_x) * width) * PART_WORLD_SCALE
    local_y = (anchor_y + (0.5 - origin_y) * height) * PART_WORLD_SCALE
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    return local_x * cos_r - local_y * sin_r, local_x * sin_r + local_y * cos_r


def local_vector(facing: int, rotation: float, offset: tuple[float, float]) -> tuple[float, float]:
    local_x = facing * offset[0] * PART_WORLD_SCALE
    local_y = offset[1] * PART_WORLD_SCALE
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)
    return local_x * cos_r - local_y * sin_r, local_x * sin_r + local_y * cos_r


def motion_rotation(
    part: dict[str, Any],
    part_index: int,
    parent: dict[str, Any] | None,
    placements: dict[str, Placement],
    facing: int,
    phase: float,
    attack_blend: float,
) -> float:
    motion = part["motion"]
    wave = math.sin(
        phase * motion.get("frequency", 2)
        + motion.get("phase", 0)
        - motion.get("lag", 0) * part_index
    ) * motion.get("amplitude", 0) * PART_WORLD_SCALE
    root_rotation = facing * 0
    parent_rotation = placements[parent["id"]].rotation if parent else root_rotation
    rotation_offset = facing * part.get("rotationOffset", 0)

    if motion["kind"] == "jaw":
        jaw_sign = math.copysign(1, part["offset"][1] or 1)
        return parent_rotation + rotation_offset + facing * ((math.sin(phase * 8) * 0.08 + attack_blend * 0.44) * jaw_sign)
    if motion["kind"] == "fin":
        return parent_rotation + rotation_offset + facing * wave * 0.018
    if motion["kind"] in ("body", "tail"):
        local_bend = facing * wave * 0.012
        if parent:
            return parent_rotation * 0.9 + root_rotation * 0.1 + local_bend + rotation_offset
        return root_rotation + local_bend + rotation_offset
    if parent and part.get("inheritRotation", True) is not False:
        return parent_rotation * 0.88 + root_rotation * 0.12 + rotation_offset
    return root_rotation + rotation_offset


def place_offset_part(part: dict[str, Any], part_index: int, facing: int, phase: float, attack_blend: float) -> Placement:
    motion = part["motion"]
    local_x = facing * part["offset"][0] * PART_WORLD_SCALE
    local_y = part["offset"][1] * PART_WORLD_SCALE
    wave = math.sin(
        phase * motion.get("frequency", 2)
        + motion.get("phase", 0)
        - motion.get("lag", 0) * part_index
    ) * motion.get("amplitude", 0) * PART_WORLD_SCALE
    body_wave = wave if motion["kind"] in ("body", "tail") else 0
    fin_wave = wave if motion["kind"] == "fin" else 0
    jaw_open = (
        (math.sin(phase * 8) * 0.16 + attack_blend * 0.42) * math.copysign(1, local_y or 1)
        if motion["kind"] == "jaw"
        else 0
    )
    return Placement(
        x=local_x,
        y=local_y + body_wave,
        rotation=facing * (body_wave * 0.012 + fin_wave * 0.018 + jaw_open),
    )


def place_parts(creature: dict[str, Any], facing: int, phase: float, attack_blend: float) -> dict[str, Placement]:
    parts = {part["id"]: part for part in creature["parts"]}
    indexes = {part["id"]: index for index, part in enumerate(creature["parts"])}
    placements: dict[str, Placement] = {}
    placing: set[str] = set()

    def place(part_id: str) -> None:
        if part_id in placements:
            return
        if part_id in placing:
            placements[part_id] = place_offset_part(parts[part_id], indexes[part_id], facing, phase, attack_blend)
            return
        placing.add(part_id)
        part = parts[part_id]
        parent_id = part.get("parentId")
        parent = parts.get(parent_id) if parent_id else None
        if not parent:
            placements[part_id] = place_offset_part(part, indexes[part_id], facing, phase, attack_blend)
        else:
            place(parent["id"])
            rotation = motion_rotation(part, indexes[part_id], parent, placements, facing, phase, attack_blend)
            parent_anchor = anchor_offset(parent, facing, placements[parent["id"]].rotation, tuple(parent["anchors"][part["parentAnchor"]]))
            rest_offset = local_vector(facing, placements[parent["id"]].rotation, tuple(part.get("restOffset", (0, 0))))
            child_anchor = anchor_offset(part, facing, rotation, tuple(part["anchors"][part["anchor"]]))
            parent_placement = placements[parent["id"]]
            placements[part_id] = Placement(
                x=parent_placement.x + parent_anchor[0] + rest_offset[0] - child_anchor[0],
                y=parent_placement.y + parent_anchor[1] + rest_offset[1] - child_anchor[1],
                rotation=rotation,
            )
        placing.remove(part_id)

    for part in creature["parts"]:
        place(part["id"])
    return placements


def place_socket_overlay(overlay: dict[str, Any], parent_placement: Placement, facing: int) -> Placement:
    offset = local_vector(facing, parent_placement.rotation, tuple(overlay["offset"]))
    return Placement(
        x=parent_placement.x + offset[0],
        y=parent_placement.y + offset[1],
        rotation=parent_placement.rotation + facing * overlay.get("rotationOffset", 0),
    )


def pose_entries(creature: dict[str, Any], facing: int, phase: float, attack_blend: float) -> list[RenderEntry]:
    placements = place_parts(creature, facing, phase, attack_blend)
    parts = {part["id"]: part for part in creature["parts"]}
    entries = [
        RenderEntry(
            id=part["id"],
            texture=part["texture"],
            origin=tuple(part["origin"]),
            size=tuple(part["size"]),
            depth=float(part.get("depth", 0)),
            placement=placements[part["id"]],
            facing=facing,
        )
        for part in creature["parts"]
    ]
    for overlay in creature.get("socketOverlays", []):
        parent = parts.get(overlay.get("parentId"))
        if not parent:
            continue
        entries.append(
            RenderEntry(
                id=overlay["id"],
                texture=overlay["texture"],
                origin=tuple(overlay["origin"]),
                size=tuple(overlay["size"]),
                depth=float(overlay.get("depth", 0)),
                placement=place_socket_overlay(overlay, placements[parent["id"]], facing),
                facing=facing,
            )
        )
    return sorted(entries, key=lambda entry: entry.depth)


def transformed_corners(entry: RenderEntry, image: Image.Image, render_zoom: float) -> list[tuple[float, float]]:
    width, height = image.size
    origin_x, origin_y = entry.origin
    cos_r = math.cos(entry.placement.rotation)
    sin_r = math.sin(entry.placement.rotation)
    points: list[tuple[float, float]] = []
    for px, py in ((0, 0), (width, 0), (0, height), (width, height)):
        local_x = entry.facing * (px - origin_x * width) * PART_WORLD_SCALE
        local_y = (py - origin_y * height) * PART_WORLD_SCALE
        world_x = entry.placement.x + local_x * cos_r - local_y * sin_r
        world_y = entry.placement.y + local_x * sin_r + local_y * cos_r
        points.append((world_x * render_zoom, world_y * render_zoom))
    return points


def bounds_for_entries(entries: Iterable[RenderEntry], images: dict[str, Image.Image], render_zoom: float) -> tuple[float, float, float, float]:
    min_x = math.inf
    min_y = math.inf
    max_x = -math.inf
    max_y = -math.inf
    for entry in entries:
        for x, y in transformed_corners(entry, images[entry.texture], render_zoom):
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    return min_x, min_y, max_x, max_y


def draw_entry(
    cell: Image.Image,
    entry: RenderEntry,
    image: Image.Image,
    offset: tuple[float, float],
    render_zoom: float,
) -> None:
    layer = Image.new("RGBA", cell.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    pixels = image.load()
    width, height = image.size
    origin_x, origin_y = entry.origin
    cos_r = math.cos(entry.placement.rotation)
    sin_r = math.sin(entry.placement.rotation)
    splat = max(1, round(PART_WORLD_SCALE * render_zoom))
    half = max(0, splat // 2)
    offset_x, offset_y = offset

    for py in range(height):
        for px in range(width):
            color = pixels[px, py]
            if color[3] <= ALPHA_THRESHOLD:
                continue
            local_x = entry.facing * (px - origin_x * width) * PART_WORLD_SCALE
            local_y = (py - origin_y * height) * PART_WORLD_SCALE
            world_x = entry.placement.x + local_x * cos_r - local_y * sin_r
            world_y = entry.placement.y + local_x * sin_r + local_y * cos_r
            sx = round(world_x * render_zoom + offset_x)
            sy = round(world_y * render_zoom + offset_y)
            draw.rectangle((sx - half, sy - half, sx - half + splat - 1, sy - half + splat - 1), fill=color)
    cell.alpha_composite(layer)


def render_pose(
    creature: dict[str, Any],
    pose: tuple[str, int, float, float],
    images: dict[str, Image.Image],
    render_zoom: float,
    padding: int,
    font: ImageFont.ImageFont,
) -> Image.Image:
    pose_name, facing, phase, attack_blend = pose
    entries = pose_entries(creature, facing, phase, attack_blend)
    min_x, min_y, max_x, max_y = bounds_for_entries(entries, images, render_zoom)
    label_height = 38
    width = max(320, math.ceil(max_x - min_x) + padding * 2)
    height = max(220, math.ceil(max_y - min_y) + padding * 2 + label_height)
    cell = Image.new("RGBA", (width, height), PANEL)
    draw = ImageDraw.Draw(cell, "RGBA")
    draw.rectangle((0, 0, width - 1, height - 1), outline=PANEL_BORDER)
    draw.text((14, 10), f"{creature['species']} / {pose_name}", font=font, fill=TEXT)
    draw.text((14, 24), f"{creature['id']}  phase={phase:.2f}  facing={facing}", font=font, fill=MUTED_TEXT)

    offset = (padding - min_x, padding + label_height - min_y)
    for entry in entries:
        draw_entry(cell, entry, images[entry.texture], offset, render_zoom)
    return cell


def image_cache(manifest: dict[str, Any], asset_dir: Path) -> dict[str, Image.Image]:
    textures = {
        part["texture"]
        for creature in manifest.get("creatures", [])
        for part in creature.get("parts", [])
    }
    textures.update(
        overlay["texture"]
        for creature in manifest.get("creatures", [])
        for overlay in creature.get("socketOverlays", [])
    )
    return {texture: Image.open(asset_dir / texture).convert("RGBA") for texture in textures}


def compose_sheet(cells: list[list[Image.Image]], gutter: int) -> Image.Image:
    column_widths = [max(row[index].width for row in cells) for index in range(len(cells[0]))]
    row_heights = [max(cell.height for cell in row) for row in cells]
    width = sum(column_widths) + gutter * (len(column_widths) + 1)
    height = sum(row_heights) + gutter * (len(row_heights) + 1)
    sheet = Image.new("RGBA", (width, height), BACKGROUND)
    y = gutter
    for row_index, row in enumerate(cells):
        x = gutter
        for column_index, cell in enumerate(row):
            sheet.alpha_composite(cell, (x, y))
            x += column_widths[column_index] + gutter
        y += row_heights[row_index] + gutter
    return sheet


def main() -> int:
    args = parse_args()
    if args.render_zoom <= 0:
        raise ValueError("--render-zoom must be positive")
    manifest = json.loads(args.manifest.read_text())
    creatures = manifest.get("creatures", [])
    if not creatures:
        raise ValueError(f"{args.manifest} has no creatures")

    font = ImageFont.load_default()
    images = image_cache(manifest, args.asset_dir)
    rows = [
        [render_pose(creature, pose, images, args.render_zoom, args.padding, font) for pose in POSES]
        for creature in creatures
    ]
    sheet = compose_sheet(rows, gutter=18)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"Rendered {len(creatures)} articulated creature rows to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
