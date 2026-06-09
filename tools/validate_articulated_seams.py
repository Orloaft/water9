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
ALPHA_THRESHOLD = 16
MIN_OVERLAP_PIXELS = 48
MIN_SOCKET_CHILD_PIXELS = 24
MIN_SOCKET_PARENT_PIXELS = 32
MAX_SOCKET_PARENT_COLOR_DISTANCE = 135
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-dir", type=Path, default=DEFAULT_ASSET_DIR)
    parser.add_argument("--min-overlap", type=int, default=MIN_OVERLAP_PIXELS)
    parser.add_argument("--min-socket-child-overlap", type=int, default=MIN_SOCKET_CHILD_PIXELS)
    parser.add_argument("--min-socket-parent-overlap", type=int, default=MIN_SOCKET_PARENT_PIXELS)
    parser.add_argument("--max-socket-parent-color-distance", type=float, default=MAX_SOCKET_PARENT_COLOR_DISTANCE)
    parser.add_argument("--phase-samples", type=int, default=DEFAULT_PHASE_SAMPLES)
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


def motion_rotation(
    part: dict[str, Any],
    part_index: int,
    parent: dict[str, Any] | None,
    placements: dict[str, Placement],
    facing: int,
    pitch: float,
    phase: float,
    attack_blend: float,
) -> float:
    motion = part["motion"]
    wave = math.sin(
        phase * motion.get("frequency", 2)
        + motion.get("phase", 0)
        - motion.get("lag", 0) * part_index
    ) * motion.get("amplitude", 0) * PART_WORLD_SCALE
    root_rotation = facing * pitch
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


def place_offset_part(part: dict[str, Any], part_index: int, facing: int, pitch: float, phase: float, attack_blend: float) -> Placement:
    motion = part["motion"]
    local_x = part["offset"][0] * PART_WORLD_SCALE
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
    indexes = {part["id"]: index for index, part in enumerate(creature["parts"])}
    placements: dict[str, Placement] = {}
    placing: set[str] = set()

    def place(part_id: str) -> None:
        if part_id in placements:
            return
        if part_id in placing:
            placements[part_id] = place_offset_part(parts[part_id], indexes[part_id], facing, pitch, phase, attack_blend)
            return
        placing.add(part_id)
        part = parts[part_id]
        parent_id = part.get("parentId")
        parent = parts.get(parent_id) if parent_id else None
        if not parent:
            placements[part_id] = place_offset_part(part, indexes[part_id], facing, pitch, phase, attack_blend)
        else:
            place(parent["id"])
            rotation = motion_rotation(part, indexes[part_id], parent, placements, facing, pitch, phase, attack_blend)
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


def alpha_points(part: dict[str, Any], image: Image.Image, placement: Placement, facing: int) -> set[tuple[int, int]]:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    width, height = image.size
    origin_x, origin_y = part["origin"]
    cos_r = math.cos(placement.rotation)
    sin_r = math.sin(placement.rotation)
    points: set[tuple[int, int]] = set()
    for py in range(height):
        for px in range(width):
            if pixels[px, py] <= ALPHA_THRESHOLD:
                continue
            local_x = facing * (px - origin_x * width) * PART_WORLD_SCALE
            local_y = (py - origin_y * height) * PART_WORLD_SCALE
            world_x = placement.x + local_x * cos_r - local_y * sin_r
            world_y = placement.y + local_x * sin_r + local_y * cos_r
            points.add((round(world_x), round(world_y)))
    return points


def color_points(part: dict[str, Any], image: Image.Image, placement: Placement, facing: int) -> dict[tuple[int, int], tuple[int, int, int]]:
    pixels = image.load()
    width, height = image.size
    origin_x, origin_y = part["origin"]
    cos_r = math.cos(placement.rotation)
    sin_r = math.sin(placement.rotation)
    points: dict[tuple[int, int], tuple[int, int, int]] = {}
    for py in range(height):
        for px in range(width):
            r, g, b, alpha = pixels[px, py]
            if alpha <= ALPHA_THRESHOLD:
                continue
            local_x = facing * (px - origin_x * width) * PART_WORLD_SCALE
            local_y = (py - origin_y * height) * PART_WORLD_SCALE
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


def validate_creature(
    creature: dict[str, Any],
    asset_dir: Path,
    min_overlap: int,
    min_socket_child_overlap: int,
    min_socket_parent_overlap: int,
    max_socket_parent_color_distance: float,
    phases: list[float],
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
    parts = {part["id"]: part for part in creature["parts"]}

    checked_poses = 0
    for mode_name, facing, pitch, attack_blend in POSES:
        for phase in phases:
            checked_poses += 1
            pose_name = f"{mode_name}@{phase:.2f}"
            placements = place_parts(creature, facing, pitch, phase, attack_blend)
            maps = {
                part["id"]: color_points(part, images[part["id"]], placements[part["id"]], facing)
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
                overlay_placement = place_socket_overlay(overlay, placements[parent["id"]], facing)
                overlay_map = color_points(overlay, overlay_images[overlay["id"]], overlay_placement, facing)
                overlay_mask = set(overlay_map)
                child_overlap = len(overlay_mask & masks[child["id"]])
                parent_shared = overlay_mask & masks[parent["id"]]
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
                    color_distance = mean_color_distance(overlay_map, maps[parent["id"]], parent_shared)
                    if color_distance > max_socket_parent_color_distance:
                        failures.append(
                            f"{creature['id']} {pose_name} socket {overlay['id']} parent color distance "
                            f"{color_distance:.1f} exceeds {max_socket_parent_color_distance:.1f}"
                        )

    return failures, checked_poses


def main() -> int:
    args = parse_args()
    phases = phase_values(args.phase_samples)
    manifest = json.loads(args.manifest.read_text())
    failures: list[str] = []
    checked_poses = 0
    for creature in manifest.get("creatures", []):
        creature_failures, creature_checked_poses = validate_creature(
            creature,
            args.asset_dir,
            args.min_overlap,
            args.min_socket_child_overlap,
            args.min_socket_parent_overlap,
            args.max_socket_parent_color_distance,
            phases,
        )
        failures.extend(creature_failures)
        checked_poses += creature_checked_poses

    if failures:
        for failure in failures:
            print(f"Articulated seam failure: {failure}", file=sys.stderr)
        return 1

    count = len(manifest.get("creatures", []))
    print(
        f"Validated alpha seam overlap for {count} articulated creature{'s' if count != 1 else ''} "
        f"across {checked_poses} motion pose samples."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
