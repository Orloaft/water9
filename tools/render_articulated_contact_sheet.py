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
DEFAULT_PHASE_STRIP_OUT = ROOT / "tools/scratch/articulated-phase-strip.png"
PART_WORLD_SCALE = 0.72
BODY_SWIM_WAVE_SCALE = 1.32
TAIL_SWIM_WAVE_SCALE = 1.45
FIN_SWIM_WAVE_SCALE = 1.08
JAW_ATTACK_DEPTH_LIFT = 0.035
ALPHA_THRESHOLD = 8
BACKGROUND = (4, 10, 16, 255)
PANEL = (8, 20, 29, 255)
PANEL_BORDER = (50, 83, 94, 255)
TEXT = (199, 230, 229, 255)
MUTED_TEXT = (111, 151, 158, 255)
POSES = (
    ("right idle", 1, 0.0, 0.0, False),
    ("right swim", 1, math.tau * 0.25, 0.0, False),
    ("left swim", -1, math.tau * 0.5, 0.0, False),
    ("jaw lunge", 1, math.tau * 0.125, 1.0, False),
    ("stunned swim", 1, math.tau * 0.625, 0.0, True),
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
    # World-space display size after runtime scaling. For parts this is the
    # manifest size times ENTITY_SCALE; for sockets it can stretch per pose.
    size: tuple[float, float]
    depth: float
    placement: Placement
    facing: int
    alpha: float = 1.0
    tint_color: tuple[int, int, int] | None = None
    tint_intensity: float = 0.0


@dataclass(frozen=True)
class BridgeEntry:
    parent: tuple[float, float]
    child: tuple[float, float]
    width: float
    color: tuple[int, int, int]
    alpha: int
    core_color: tuple[int, int, int]
    core_alpha: int


def int_color(value: Any, fallback: int) -> tuple[int, int, int]:
    color = int(value if isinstance(value, (int, float)) else fallback)
    return (color >> 16) & 255, (color >> 8) & 255, color & 255


def murk_tint(creature: dict[str, Any], stunned: bool) -> tuple[tuple[int, int, int] | None, float]:
    tint = creature.get("murkTint")
    if not isinstance(tint, dict):
        return None, 0.0
    color = int_color(tint.get("color"), 0x9bb7c8)
    intensity_value = tint.get("stunnedIntensity") if stunned and tint.get("stunnedIntensity") is not None else tint.get("intensity")
    try:
        intensity = float(intensity_value)
    except (TypeError, ValueError):
        intensity = 0.0
    return color, max(0.0, min(1.0, intensity))


def alpha_byte(value: Any, fallback: float) -> int:
    try:
        alpha = float(value)
    except (TypeError, ValueError):
        alpha = fallback
    return max(0, min(255, round(alpha * 255)))


def style_value(creature: dict[str, Any], overlay: dict[str, Any], key: str, fallback: Any) -> Any:
    socket_style = creature.get("socketStyle")
    inherited = socket_style.get(key) if isinstance(socket_style, dict) else None
    return overlay.get(key, inherited if inherited is not None else fallback)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-dir", type=Path, default=DEFAULT_ASSET_DIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--phase-strip-out", type=Path, default=DEFAULT_PHASE_STRIP_OUT)
    parser.add_argument("--creature-id", action="append", default=[], help="Render only the given creature id. Can be passed more than once.")
    parser.add_argument("--phase-samples", type=int, default=8)
    parser.add_argument("--phase-strip-zoom", type=float, default=2.1)
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


def spine_lag_index(part: dict[str, Any], creature: dict[str, Any]) -> float:
    spine_parts = sorted(
        [candidate for candidate in creature["parts"] if candidate["motion"]["kind"] in ("body", "tail")],
        key=lambda candidate: candidate["offset"][0],
        reverse=True,
    )
    ids = [candidate["id"] for candidate in spine_parts]
    if len(ids) <= 1:
        return 0.0
    if part["id"] in ids:
        return ids.index(part["id"]) / (len(ids) - 1) * 3.2
    by_id = {candidate["id"]: candidate for candidate in creature["parts"]}
    parent = by_id.get(part.get("parentId"))
    while parent:
        if parent["id"] in ids:
            parent_lag = ids.index(parent["id"]) / (len(ids) - 1) * 3.2
            attachment_lag = 0.68 if part["motion"]["kind"] == "fin" else 0.34 if part["motion"]["kind"] == "jaw" else 0.18
            return max(0.0, min(3.2, parent_lag + attachment_lag))
        parent = by_id.get(parent.get("parentId"))
    return 0.0


def swim_wave(part: dict[str, Any], phase: float, creature: dict[str, Any]) -> float:
    motion = part["motion"]
    motion_scale = {
        "body": BODY_SWIM_WAVE_SCALE,
        "tail": TAIL_SWIM_WAVE_SCALE,
        "fin": FIN_SWIM_WAVE_SCALE,
    }.get(motion["kind"], 1.0)
    return (
        math.sin(
            phase * motion.get("frequency", 2)
            + motion.get("phase", 0)
            - motion.get("lag", 0) * spine_lag_index(part, creature)
        )
        * motion.get("amplitude", 0)
        * motion_scale
        * PART_WORLD_SCALE
    )


def motion_rotation(
    part: dict[str, Any],
    parent: dict[str, Any] | None,
    creature: dict[str, Any],
    placements: dict[str, Placement],
    facing: int,
    phase: float,
    attack_blend: float,
) -> float:
    motion = part["motion"]
    wave = swim_wave(part, phase, creature)
    root_rotation = facing * 0
    parent_rotation = placements[parent["id"]].rotation if parent else root_rotation
    rotation_offset = facing * part.get("rotationOffset", 0)

    if motion["kind"] == "jaw":
        jaw_sign = math.copysign(1, part["offset"][1] or 1)
        jaw_open_scale = max(0.35, min(1.25, motion.get("amplitude", 21) / 21))
        jaw_pulse = math.sin(phase * motion.get("frequency", 8) + motion.get("phase", 0) - motion.get("lag", 0) * 0.6)
        return parent_rotation + rotation_offset + facing * ((jaw_pulse * 0.08 + attack_blend * 0.44) * jaw_open_scale * jaw_sign)
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


def place_offset_part(part: dict[str, Any], creature: dict[str, Any], facing: int, phase: float, attack_blend: float) -> Placement:
    motion = part["motion"]
    local_x = facing * part["offset"][0] * PART_WORLD_SCALE
    local_y = part["offset"][1] * PART_WORLD_SCALE
    wave = swim_wave(part, phase, creature)
    body_wave = wave if motion["kind"] in ("body", "tail") else 0
    fin_wave = wave if motion["kind"] == "fin" else 0
    jaw_open = (
        (math.sin(phase * motion.get("frequency", 8) + motion.get("phase", 0) - motion.get("lag", 0) * 0.6) * 0.16 + attack_blend * 0.42) * max(0.35, min(1.25, motion.get("amplitude", 21) / 21)) * math.copysign(1, local_y or 1)
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
    placements: dict[str, Placement] = {}
    placing: set[str] = set()

    def place(part_id: str) -> None:
        if part_id in placements:
            return
        if part_id in placing:
            placements[part_id] = place_offset_part(parts[part_id], creature, facing, phase, attack_blend)
            return
        placing.add(part_id)
        part = parts[part_id]
        parent_id = part.get("parentId")
        parent = parts.get(parent_id) if parent_id else None
        if not parent:
            placements[part_id] = place_offset_part(part, creature, facing, phase, attack_blend)
        else:
            place(parent["id"])
            rotation = motion_rotation(part, parent, creature, placements, facing, phase, attack_blend)
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


def place_socket_overlay(
    overlay: dict[str, Any],
    parent: dict[str, Any],
    child: dict[str, Any],
    creature: dict[str, Any],
    placements: dict[str, Placement],
    facing: int,
    stunned: bool,
) -> tuple[Placement, tuple[float, float], float, BridgeEntry]:
    parent_placement = placements[parent["id"]]
    child_placement = placements[child["id"]]
    parent_anchor_name = child.get("parentAnchor")
    child_anchor_name = child.get("anchor")
    parent_anchor_local = tuple(parent.get("anchors", {}).get(parent_anchor_name, (0, 0)))
    child_anchor_local = tuple(child.get("anchors", {}).get(child_anchor_name, (0, 0)))
    parent_anchor_offset = anchor_offset(parent, facing, parent_placement.rotation, parent_anchor_local)
    child_anchor_offset = anchor_offset(child, facing, child_placement.rotation, child_anchor_local)
    parent_anchor = (
        parent_placement.x + parent_anchor_offset[0],
        parent_placement.y + parent_anchor_offset[1],
    )
    child_anchor = (
        child_placement.x + child_anchor_offset[0],
        child_placement.y + child_anchor_offset[1],
    )
    dx = child_anchor[0] - parent_anchor[0]
    dy = child_anchor[1] - parent_anchor[1]
    span = max(1.0, math.hypot(dx, dy))
    tangent_x = dx / span
    tangent_y = dy / span
    normal_x = -dy / span
    normal_y = dx / span
    along = overlay["offset"][0] * PART_WORLD_SCALE
    across = overlay["offset"][1] * PART_WORLD_SCALE
    base_width = overlay["size"][0] * PART_WORLD_SCALE
    base_height = overlay["size"][1] * PART_WORLD_SCALE
    display_width = min(max(base_width, span + base_width * 0.12), base_width * 1.32)
    bridge_width_scale = float(style_value(creature, overlay, "bridgeWidthScale", 1))
    bridge_sleeve_scale = float(style_value(creature, overlay, "bridgeSleeveScale", 0))
    bridge_width = min(
        max(base_height * 0.62 * bridge_width_scale, 4),
        max(6, span * 0.68 * bridge_width_scale, base_height * bridge_sleeve_scale),
    )
    bridge_alpha_key = "bridgeStunnedAlpha" if stunned else "bridgeAlpha"
    core_alpha_key = "bridgeCoreStunnedAlpha" if stunned else "bridgeCoreAlpha"
    return (
        Placement(
            x=(parent_anchor[0] + child_anchor[0]) * 0.5 + tangent_x * along + normal_x * across,
            y=(parent_anchor[1] + child_anchor[1]) * 0.5 + tangent_y * along + normal_y * across,
            rotation=math.atan2(dy, dx) + facing * overlay.get("rotationOffset", 0),
        ),
        (display_width, base_height),
        span,
        BridgeEntry(
            parent=parent_anchor,
            child=child_anchor,
            width=bridge_width,
            color=int_color(style_value(creature, overlay, "bridgeColor", 0x02060C), 0x02060C),
            alpha=alpha_byte(style_value(creature, overlay, bridge_alpha_key, 0.18 if stunned else 0.32), 0.18 if stunned else 0.32),
            core_color=int_color(style_value(creature, overlay, "bridgeCoreColor", int(creature.get("color", 0x73FBD3))), int(creature.get("color", 0x73FBD3))),
            core_alpha=alpha_byte(style_value(creature, overlay, core_alpha_key, 0.09 if stunned else 0.16), 0.09 if stunned else 0.16),
        ),
    )


def pose_entries(creature: dict[str, Any], facing: int, phase: float, attack_blend: float, stunned: bool = False) -> tuple[list[RenderEntry], list[BridgeEntry]]:
    placements = place_parts(creature, facing, phase, attack_blend)
    parts = {part["id"]: part for part in creature["parts"]}
    tint_color, tint_intensity = murk_tint(creature, stunned)
    entries = [
        RenderEntry(
            id=part["id"],
            texture=part["texture"],
            origin=tuple(part["origin"]),
            size=(part["size"][0] * PART_WORLD_SCALE, part["size"][1] * PART_WORLD_SCALE),
            depth=float(part.get("depth", 0)) + (attack_blend * JAW_ATTACK_DEPTH_LIFT if part["id"] == "jaw" else 0),
            placement=placements[part["id"]],
            facing=facing,
            alpha=0.68 if stunned else 1.0,
            tint_color=tint_color,
            tint_intensity=tint_intensity,
        )
        for part in creature["parts"]
    ]
    bridges: list[BridgeEntry] = []
    for overlay in creature.get("socketOverlays", []):
        parent = parts.get(overlay.get("parentId"))
        child = parts.get(overlay.get("childId"))
        if not parent or not child:
            continue
        placement, display_size, _span, bridge = place_socket_overlay(overlay, parent, child, creature, placements, facing, stunned)
        bridges.append(bridge)
        entries.append(
            RenderEntry(
                id=overlay["id"],
                texture=overlay["texture"],
                origin=tuple(overlay["origin"]),
                size=display_size,
                depth=float(overlay.get("depth", 0)),
                placement=placement,
                facing=facing,
                alpha=float(style_value(creature, overlay, "alpha", 1.0)),
                tint_color=tint_color,
                tint_intensity=tint_intensity,
            )
        )
    return sorted(entries, key=lambda entry: entry.depth), bridges


def transformed_corners(entry: RenderEntry, image: Image.Image, render_zoom: float) -> list[tuple[float, float]]:
    width, height = image.size
    origin_x, origin_y = entry.origin
    scale_x = entry.size[0] / max(1, width)
    scale_y = entry.size[1] / max(1, height)
    cos_r = math.cos(entry.placement.rotation)
    sin_r = math.sin(entry.placement.rotation)
    points: list[tuple[float, float]] = []
    for px, py in ((0, 0), (width, 0), (0, height), (width, height)):
        local_x = entry.facing * (px - origin_x * width) * scale_x
        local_y = (py - origin_y * height) * scale_y
        world_x = entry.placement.x + local_x * cos_r - local_y * sin_r
        world_y = entry.placement.y + local_x * sin_r + local_y * cos_r
        points.append((world_x * render_zoom, world_y * render_zoom))
    return points


def bounds_for_entries(
    entries: Iterable[RenderEntry],
    bridges: Iterable[BridgeEntry],
    images: dict[str, Image.Image],
    render_zoom: float,
) -> tuple[float, float, float, float]:
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
    for bridge in bridges:
        radius = bridge.width * render_zoom * 0.72
        for x, y in (bridge.parent, bridge.child):
            sx = x * render_zoom
            sy = y * render_zoom
            min_x = min(min_x, sx - radius)
            min_y = min(min_y, sy - radius)
            max_x = max(max_x, sx + radius)
            max_y = max(max_y, sy + radius)
    return min_x, min_y, max_x, max_y


def draw_bridge(cell: Image.Image, bridge: BridgeEntry, offset: tuple[float, float], render_zoom: float) -> None:
    draw = ImageDraw.Draw(cell, "RGBA")
    offset_x, offset_y = offset
    x1 = bridge.parent[0] * render_zoom + offset_x
    y1 = bridge.parent[1] * render_zoom + offset_y
    x2 = bridge.child[0] * render_zoom + offset_x
    y2 = bridge.child[1] * render_zoom + offset_y
    shadow_width = max(2, round(bridge.width * render_zoom * 0.96))
    core_width = max(1, round(bridge.width * render_zoom * 0.38))
    radius = max(1, bridge.width * render_zoom * 0.46)
    draw.line((x1, y1, x2, y2), fill=(*bridge.color, bridge.alpha), width=shadow_width)
    draw.ellipse((x1 - radius, y1 - radius, x1 + radius, y1 + radius), fill=(*bridge.color, bridge.alpha))
    draw.ellipse((x2 - radius, y2 - radius, x2 + radius, y2 + radius), fill=(*bridge.color, bridge.alpha))
    draw.line((x1, y1, x2, y2), fill=(*bridge.core_color, bridge.core_alpha), width=core_width)


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
    scale_x = entry.size[0] / max(1, width)
    scale_y = entry.size[1] / max(1, height)
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
            red, green, blue = color[:3]
            if entry.tint_color and entry.tint_intensity > 0:
                tint_red = round(255 + (entry.tint_color[0] - 255) * entry.tint_intensity)
                tint_green = round(255 + (entry.tint_color[1] - 255) * entry.tint_intensity)
                tint_blue = round(255 + (entry.tint_color[2] - 255) * entry.tint_intensity)
                red = round(red * tint_red / 255)
                green = round(green * tint_green / 255)
                blue = round(blue * tint_blue / 255)
            local_x = entry.facing * (px - origin_x * width) * scale_x
            local_y = (py - origin_y * height) * scale_y
            world_x = entry.placement.x + local_x * cos_r - local_y * sin_r
            world_y = entry.placement.y + local_x * sin_r + local_y * cos_r
            sx = round(world_x * render_zoom + offset_x)
            sy = round(world_y * render_zoom + offset_y)
            draw.rectangle(
                (sx - half, sy - half, sx - half + splat - 1, sy - half + splat - 1),
                fill=(red, green, blue, round(color[3] * entry.alpha)),
            )
    cell.alpha_composite(layer)


def render_pose(
    creature: dict[str, Any],
    pose: tuple[str, int, float, float, bool],
    images: dict[str, Image.Image],
    render_zoom: float,
    padding: int,
    font: ImageFont.ImageFont,
    forced_bounds: tuple[float, float, float, float] | None = None,
) -> Image.Image:
    pose_name, facing, phase, attack_blend, stunned = pose
    entries, bridges = pose_entries(creature, facing, phase, attack_blend, stunned)
    min_x, min_y, max_x, max_y = forced_bounds or bounds_for_entries(entries, bridges, images, render_zoom)
    label_height = 38
    width = max(320, math.ceil(max_x - min_x) + padding * 2)
    height = max(220, math.ceil(max_y - min_y) + padding * 2 + label_height)
    cell = Image.new("RGBA", (width, height), PANEL)
    draw = ImageDraw.Draw(cell, "RGBA")
    draw.rectangle((0, 0, width - 1, height - 1), outline=PANEL_BORDER)
    draw.text((14, 10), f"{creature['species']} / {pose_name}", font=font, fill=TEXT)
    draw.text((14, 24), f"{creature['id']}  phase={phase:.2f}  facing={facing}  stunned={str(stunned).lower()}", font=font, fill=MUTED_TEXT)

    offset = (padding - min_x, padding + label_height - min_y)
    for bridge in bridges:
        draw_bridge(cell, bridge, offset, render_zoom)
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


def phase_strip_poses(sample_count: int) -> tuple[tuple[str, int, float, float, bool], ...]:
    sample_count = max(2, sample_count)
    return tuple((f"swim {index + 1}/{sample_count}", 1, math.tau * index / sample_count, 0.0, False) for index in range(sample_count))


def union_bounds(bounds: Iterable[tuple[float, float, float, float]]) -> tuple[float, float, float, float]:
    min_x = math.inf
    min_y = math.inf
    max_x = -math.inf
    max_y = -math.inf
    for left, top, right, bottom in bounds:
        min_x = min(min_x, left)
        min_y = min(min_y, top)
        max_x = max(max_x, right)
        max_y = max(max_y, bottom)
    return min_x, min_y, max_x, max_y


def bounds_for_pose(
    creature: dict[str, Any],
    pose: tuple[str, int, float, float, bool],
    images: dict[str, Image.Image],
    render_zoom: float,
) -> tuple[float, float, float, float]:
    _pose_name, facing, phase, attack_blend, stunned = pose
    entries, bridges = pose_entries(creature, facing, phase, attack_blend, stunned)
    return bounds_for_entries(entries, bridges, images, render_zoom)


def main() -> int:
    args = parse_args()
    if args.render_zoom <= 0:
        raise ValueError("--render-zoom must be positive")
    if args.phase_strip_zoom <= 0:
        raise ValueError("--phase-strip-zoom must be positive")
    manifest = json.loads(args.manifest.read_text())
    creatures = manifest.get("creatures", [])
    if args.creature_id:
        wanted = set(args.creature_id)
        creatures = [creature for creature in creatures if creature.get("id") in wanted]
        missing = sorted(wanted - {creature.get("id") for creature in creatures})
        if missing:
            raise ValueError(f"unknown creature id(s): {', '.join(missing)}")
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
    strip_rows = []
    for creature in creatures:
        poses = phase_strip_poses(args.phase_samples)
        shared_bounds = union_bounds(bounds_for_pose(creature, pose, images, args.phase_strip_zoom) for pose in poses)
        strip_rows.append(
            [
                render_pose(creature, pose, images, args.phase_strip_zoom, args.padding, font, forced_bounds=shared_bounds)
                for pose in poses
            ]
        )
    strip = compose_sheet(strip_rows, gutter=14)
    args.phase_strip_out.parent.mkdir(parents=True, exist_ok=True)
    strip.save(args.phase_strip_out)
    print(f"Rendered {len(creatures)} articulated phase-strip rows to {args.phase_strip_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
