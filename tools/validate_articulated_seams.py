#!/usr/bin/env python3
"""Validate visual alpha overlap for articulated creature seams.

Joint error validates math. This validates whether the actual opaque pixels
read as connected after the runtime parent-anchor placement.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "public/assets/generated/articulated-creatures.parts.json"
DEFAULT_ASSET_DIR = ROOT / "public/assets/generated"
PART_WORLD_SCALE = 0.72
BODY_SWIM_WAVE_SCALE = 1.32
TAIL_SWIM_WAVE_SCALE = 1.45
FIN_SWIM_WAVE_SCALE = 1.08
ALPHA_THRESHOLD = 16
MIN_OVERLAP_PIXELS = 48
MIN_SOCKET_CHILD_PIXELS = 24
MIN_SOCKET_PARENT_PIXELS = 32
MAX_SOCKET_PARENT_COLOR_DISTANCE = 135
SOCKET_OVERLAY_ALPHA = 0.7
DEFAULT_PHASE_SAMPLES = 8
POSES = (
    ("right", 1, 0.0, 0.0),
    ("left", -1, 0.0, 0.0),
    ("rise", 1, -0.48, 0.0),
    ("dive", 1, 0.48, 0.0),
    ("lunge", 1, 0.0, 1.0),
)


@dataclass(frozen=True)
class Placement:
    x: float
    y: float
    rotation: float


@dataclass(frozen=True)
class SocketPlacement:
    placement: Placement
    size: tuple[float, float]
    span: float
    parent_anchor: tuple[float, float]
    child_anchor: tuple[float, float]
    bridge_width: float


@dataclass(frozen=True)
class OpaquePixels:
    width: int
    height: int
    pixels: tuple[tuple[int, int, int, int, int], ...]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-dir", type=Path, default=DEFAULT_ASSET_DIR)
    parser.add_argument("--min-overlap", type=int, default=MIN_OVERLAP_PIXELS)
    parser.add_argument("--min-socket-child-overlap", type=int, default=MIN_SOCKET_CHILD_PIXELS)
    parser.add_argument("--min-socket-parent-overlap", type=int, default=MIN_SOCKET_PARENT_PIXELS)
    parser.add_argument("--max-socket-parent-color-distance", type=float, default=MAX_SOCKET_PARENT_COLOR_DISTANCE)
    parser.add_argument("--phase-samples", type=int, default=DEFAULT_PHASE_SAMPLES)
    parser.add_argument(
        "--pixel-stride",
        type=int,
        default=1,
        help="sample every Nth opaque source pixel for faster mechanical seam checks; use 1 for full resolution",
    )
    parser.add_argument(
        "--creature-id",
        dest="creature_ids",
        action="append",
        default=[],
        help="validate only this creature id; may be repeated",
    )
    return parser.parse_args()


def phase_values(sample_count: int) -> list[float]:
    if sample_count <= 1:
        return [1.1]
    return [(math.tau * index) / sample_count for index in range(sample_count)]


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
    pitch: float,
    phase: float,
    attack_blend: float,
) -> float:
    motion = part["motion"]
    wave = swim_wave(part, phase, creature)
    root_rotation = facing * pitch
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


def place_offset_part(part: dict[str, Any], creature: dict[str, Any], facing: int, pitch: float, phase: float, attack_blend: float) -> Placement:
    motion = part["motion"]
    local_x = part["offset"][0] * PART_WORLD_SCALE
    local_y = part["offset"][1] * PART_WORLD_SCALE
    wave = swim_wave(part, phase, creature)
    body_wave = wave if motion["kind"] in ("body", "tail") else 0
    fin_wave = wave if motion["kind"] == "fin" else 0
    jaw_open = (
        (math.sin(phase * motion.get("frequency", 8) + motion.get("phase", 0) - motion.get("lag", 0) * 0.6) * 0.16 + attack_blend * 0.42) * max(0.35, min(1.25, motion.get("amplitude", 21) / 21)) * math.copysign(1, local_y or 1)
        if motion["kind"] == "jaw"
        else 0
    )
    root_rotation = facing * pitch
    cos_r = math.cos(root_rotation)
    sin_r = math.sin(root_rotation)
    world_x = facing * local_x * cos_r - (local_y + body_wave) * sin_r
    world_y = facing * local_x * sin_r + (local_y + body_wave) * cos_r
    return Placement(
        x=world_x,
        y=world_y,
        rotation=facing * (pitch + body_wave * 0.012 + fin_wave * 0.018 + jaw_open),
    )


def place_parts(creature: dict[str, Any], facing: int, pitch: float, phase: float, attack_blend: float) -> dict[str, Placement]:
    parts = {part["id"]: part for part in creature["parts"]}
    placements: dict[str, Placement] = {}
    placing: set[str] = set()

    def place(part_id: str) -> None:
        if part_id in placements:
            return
        if part_id in placing:
            placements[part_id] = place_offset_part(parts[part_id], creature, facing, pitch, phase, attack_blend)
            return
        placing.add(part_id)
        part = parts[part_id]
        parent_id = part.get("parentId")
        parent = parts.get(parent_id) if parent_id else None
        if not parent:
            placements[part_id] = place_offset_part(part, creature, facing, pitch, phase, attack_blend)
        else:
            place(parent["id"])
            rotation = motion_rotation(part, parent, creature, placements, facing, pitch, phase, attack_blend)
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
) -> SocketPlacement:
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
    return SocketPlacement(
        placement=Placement(
            x=(parent_anchor[0] + child_anchor[0]) * 0.5 + tangent_x * along + normal_x * across,
            y=(parent_anchor[1] + child_anchor[1]) * 0.5 + tangent_y * along + normal_y * across,
            rotation=math.atan2(dy, dx) + facing * overlay.get("rotationOffset", 0),
        ),
        size=(display_width, base_height),
        span=span,
        parent_anchor=parent_anchor,
        child_anchor=child_anchor,
        bridge_width=bridge_width,
    )


def alpha_points(
    part: dict[str, Any],
    image: Image.Image,
    placement: Placement,
    facing: int,
    display_size: tuple[float, float] | None = None,
) -> set[tuple[int, int]]:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    width, height = image.size
    origin_x, origin_y = part["origin"]
    scale_x = (display_size[0] / max(1, width)) if display_size else PART_WORLD_SCALE
    scale_y = (display_size[1] / max(1, height)) if display_size else PART_WORLD_SCALE
    cos_r = math.cos(placement.rotation)
    sin_r = math.sin(placement.rotation)
    points: set[tuple[int, int]] = set()
    for py in range(height):
        for px in range(width):
            if pixels[px, py] <= ALPHA_THRESHOLD:
                continue
            local_x = facing * (px - origin_x * width) * scale_x
            local_y = (py - origin_y * height) * scale_y
            world_x = placement.x + local_x * cos_r - local_y * sin_r
            world_y = placement.y + local_x * sin_r + local_y * cos_r
            points.add((round(world_x), round(world_y)))
    return points


def opaque_pixels(image: Image.Image, pixel_stride: int = 1) -> OpaquePixels:
    pixels = image.load()
    width, height = image.size
    points: list[tuple[int, int, int, int, int]] = []
    stride = max(1, int(pixel_stride))
    for py in range(0, height, stride):
        for px in range(0, width, stride):
            r, g, b, alpha = pixels[px, py]
            if alpha > ALPHA_THRESHOLD:
                points.append((px, py, r, g, b))
    return OpaquePixels(width=width, height=height, pixels=tuple(points))


def project_color_points(
    part: dict[str, Any],
    image_pixels: OpaquePixels,
    placement: Placement,
    facing: int,
    display_size: tuple[float, float] | None = None,
) -> dict[tuple[int, int], tuple[int, int, int]]:
    width, height = image_pixels.width, image_pixels.height
    origin_x, origin_y = part["origin"]
    scale_x = (display_size[0] / max(1, width)) if display_size else PART_WORLD_SCALE
    scale_y = (display_size[1] / max(1, height)) if display_size else PART_WORLD_SCALE
    cos_r = math.cos(placement.rotation)
    sin_r = math.sin(placement.rotation)
    points: dict[tuple[int, int], tuple[int, int, int]] = {}
    for px, py, r, g, b in image_pixels.pixels:
        local_x = facing * (px - origin_x * width) * scale_x
        local_y = (py - origin_y * height) * scale_y
        world_x = placement.x + local_x * cos_r - local_y * sin_r
        world_y = placement.y + local_x * sin_r + local_y * cos_r
        points[(round(world_x), round(world_y))] = (r, g, b)
    return points


def mean_color_distance(
    left: dict[tuple[int, int], tuple[int, int, int]],
    right: dict[tuple[int, int], tuple[int, int, int]],
    shared_points: set[tuple[int, int]],
) -> float:
    if not shared_points:
        return 0
    return sum(
        math.sqrt(
            (left[point][0] - right[point][0]) ** 2
            + (left[point][1] - right[point][1]) ** 2
            + (left[point][2] - right[point][2]) ** 2
        )
        for point in shared_points
    ) / len(shared_points)


def int_color(value: Any, fallback: int) -> tuple[int, int, int]:
    color = int(value if isinstance(value, (int, float)) else fallback)
    return (color >> 16) & 255, (color >> 8) & 255, color & 255


def style_value(creature: dict[str, Any], overlay: dict[str, Any], key: str, fallback: Any) -> Any:
    socket_style = creature.get("socketStyle")
    inherited = socket_style.get(key) if isinstance(socket_style, dict) else None
    return overlay.get(key, inherited if inherited is not None else fallback)


def mean_solid_color_distance(
    color: tuple[int, int, int],
    target: dict[tuple[int, int], tuple[int, int, int]],
    shared_points: set[tuple[int, int]],
) -> float:
    if not shared_points:
        return 0
    return sum(
        math.sqrt(
            (color[0] - target[point][0]) ** 2
            + (color[1] - target[point][1]) ** 2
            + (color[2] - target[point][2]) ** 2
        )
        for point in shared_points
    ) / len(shared_points)


def weighted_bridge_color_distance(
    creature: dict[str, Any],
    overlay: dict[str, Any],
    target: dict[tuple[int, int], tuple[int, int, int]],
    shared_points: set[tuple[int, int]],
) -> float:
    bridge_color = int_color(style_value(creature, overlay, "bridgeColor", 0x02060C), 0x02060C)
    core_color = int_color(style_value(creature, overlay, "bridgeCoreColor", 0x73FBD3), 0x73FBD3)
    bridge_alpha = float(style_value(creature, overlay, "bridgeAlpha", 0.32))
    core_alpha = float(style_value(creature, overlay, "bridgeCoreAlpha", 0.16))
    return max(
        mean_solid_color_distance(bridge_color, target, shared_points) * bridge_alpha,
        mean_solid_color_distance(core_color, target, shared_points) * core_alpha,
    )


def capsule_points(a: tuple[float, float], b: tuple[float, float], width: float) -> set[tuple[int, int]]:
    radius = max(1.0, width * 0.5)
    min_x = math.floor(min(a[0], b[0]) - radius)
    max_x = math.ceil(max(a[0], b[0]) + radius)
    min_y = math.floor(min(a[1], b[1]) - radius)
    max_y = math.ceil(max(a[1], b[1]) + radius)
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    length_sq = max(0.0001, dx * dx + dy * dy)
    points: set[tuple[int, int]] = set()
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            t = max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / length_sq))
            closest_x = a[0] + dx * t
            closest_y = a[1] + dy * t
            if math.hypot(x - closest_x, y - closest_y) <= radius:
                points.add((x, y))
    return points


def validate_creature(
    creature: dict[str, Any],
    asset_dir: Path,
    min_overlap: int,
    min_socket_child_overlap: int,
    min_socket_parent_overlap: int,
    max_socket_parent_color_distance: float,
    phases: list[float],
    pixel_stride: int,
) -> tuple[list[str], int]:
    failures: list[str] = []
    images = {
        part["id"]: Image.open(asset_dir / part["texture"]).convert("RGBA")
        for part in creature["parts"]
    }
    overlay_images = {
        overlay["id"]: Image.open(asset_dir / overlay["texture"]).convert("RGBA")
        for overlay in creature.get("socketOverlays", [])
    }
    image_pixels = {part_id: opaque_pixels(image, pixel_stride) for part_id, image in images.items()}
    overlay_pixels = {overlay_id: opaque_pixels(image, pixel_stride) for overlay_id, image in overlay_images.items()}
    parts = {part["id"]: part for part in creature["parts"]}

    checked_poses = 0
    for mode_name, facing, pitch, attack_blend in POSES:
        for phase in phases:
            checked_poses += 1
            pose_name = f"{mode_name}@{phase:.2f}"
            placements = place_parts(creature, facing, pitch, phase, attack_blend)
            maps = {
                part["id"]: project_color_points(part, image_pixels[part["id"]], placements[part["id"]], facing)
                for part in creature["parts"]
            }
            masks = {part_id: set(points) for part_id, points in maps.items()}
            for part in creature["parts"]:
                parent_id = part.get("parentId")
                if not parent_id:
                    continue
                overlap = len(masks[part["id"]] & masks[parent_id])
                child_pixels = max(1, len(masks[part["id"]]))
                coverage = overlap / child_pixels
                if overlap < min_overlap:
                    failures.append(
                        f"{creature['id']} {pose_name} {parent_id}->{part['id']} visual overlap "
                        f"{overlap}px ({coverage:.3f} of child) below {min_overlap}px"
                    )
            for overlay in creature.get("socketOverlays", []):
                parent = parts.get(overlay.get("parentId"))
                child = parts.get(overlay.get("childId"))
                if not parent or not child:
                    continue
                socket = place_socket_overlay(overlay, parent, child, creature, placements, facing)
                overlay_map = project_color_points(overlay, overlay_pixels[overlay["id"]], socket.placement, facing, socket.size)
                overlay_mask = set(overlay_map)
                bridge_mask = capsule_points(socket.parent_anchor, socket.child_anchor, socket.bridge_width)
                connector_mask = overlay_mask | bridge_mask
                child_overlap = len(connector_mask & masks[child["id"]])
                parent_shared = connector_mask & masks[parent["id"]]
                parent_overlap = len(parent_shared)
                if child_overlap < min_socket_child_overlap:
                    failures.append(
                        f"{creature['id']} {pose_name} socket {overlay['id']} covers child {child['id']} by "
                        f"{child_overlap}px below {min_socket_child_overlap}px"
                    )
                if parent_overlap < min_socket_parent_overlap:
                    failures.append(
                        f"{creature['id']} {pose_name} socket {overlay['id']} aligns to parent {parent['id']} by "
                        f"{parent_overlap}px below {min_socket_parent_overlap}px"
                    )
                elif max_socket_parent_color_distance >= 0:
                    overlay_parent_shared = overlay_mask & masks[parent["id"]]
                    overlay_alpha = float(style_value(creature, overlay, "alpha", SOCKET_OVERLAY_ALPHA))
                    color_distance = mean_color_distance(overlay_map, maps[parent["id"]], overlay_parent_shared) * overlay_alpha
                    if color_distance > max_socket_parent_color_distance:
                        failures.append(
                            f"{creature['id']} {pose_name} socket {overlay['id']} parent color distance "
                            f"{color_distance:.1f} exceeds {max_socket_parent_color_distance:.1f}"
                        )
                    bridge_parent_shared = bridge_mask & masks[parent["id"]]
                    bridge_parent_distance = weighted_bridge_color_distance(creature, overlay, maps[parent["id"]], bridge_parent_shared)
                    if bridge_parent_distance > max_socket_parent_color_distance:
                        failures.append(
                            f"{creature['id']} {pose_name} bridge {overlay['id']} parent color distance "
                            f"{bridge_parent_distance:.1f} exceeds {max_socket_parent_color_distance:.1f}"
                        )
                    bridge_child_shared = bridge_mask & masks[child["id"]]
                    bridge_child_distance = weighted_bridge_color_distance(creature, overlay, maps[child["id"]], bridge_child_shared)
                    if bridge_child_distance > max_socket_parent_color_distance:
                        failures.append(
                            f"{creature['id']} {pose_name} bridge {overlay['id']} child color distance "
                            f"{bridge_child_distance:.1f} exceeds {max_socket_parent_color_distance:.1f}"
                        )

    return failures, checked_poses


def main() -> int:
    args = parse_args()
    phases = phase_values(args.phase_samples)
    pixel_stride = max(1, int(args.pixel_stride))
    sample_scale = 1 / (pixel_stride * pixel_stride)
    min_overlap = 0 if args.min_overlap <= 0 else max(1, math.ceil(args.min_overlap * sample_scale))
    min_socket_child_overlap = max(1, math.ceil(args.min_socket_child_overlap * sample_scale))
    min_socket_parent_overlap = max(1, math.ceil(args.min_socket_parent_overlap * sample_scale))
    manifest = json.loads(args.manifest.read_text())
    creatures = list(manifest.get("creatures", []))
    if args.creature_ids:
        wanted = set(args.creature_ids)
        found = {creature.get("id") for creature in creatures}
        missing = sorted(wanted - found)
        if missing:
            print(f"Unknown articulated creature id(s): {', '.join(missing)}", file=sys.stderr)
            return 2
        creatures = [creature for creature in creatures if creature.get("id") in wanted]

    failures: list[str] = []
    checked_poses = 0
    for creature in creatures:
        creature_failures, creature_checked_poses = validate_creature(
            creature,
            args.asset_dir,
            min_overlap,
            min_socket_child_overlap,
            min_socket_parent_overlap,
            args.max_socket_parent_color_distance,
            phases,
            pixel_stride,
        )
        failures.extend(creature_failures)
        checked_poses += creature_checked_poses

    if failures:
        for failure in failures:
            print(f"Articulated seam failure: {failure}", file=sys.stderr)
        return 1

    count = len(creatures)
    scope = f"selected {count}" if args.creature_ids else str(count)
    print(
        f"Validated alpha seam overlap for {scope} articulated creature{'s' if count != 1 else ''} "
        f"across {checked_poses} motion pose samples at pixel stride {pixel_stride}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
