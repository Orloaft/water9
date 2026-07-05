#!/usr/bin/env python3
"""Build runtime sprite sheets for generated exploration fauna.

The source art is image-generated raster cutout work. This builder keeps that
art as the visual source, but creates gameplay loops with stronger
morphotype-specific deformation so the runtime read is animated rather than a
locked painting.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

GENERATED = Path("public/assets/generated")
PACK = GENERATED / "exploration-life-2026-07-04"
MANIFEST = PACK / "manifest.json"
RUN_DIR = Path("runs/water9-fauna-animation-upgrade-2026-07-05")
PROOF = RUN_DIR / "proof"
FRAME_COUNT = 4
FRAME_RATE = 8

BENCHMARK_KEYS = [
    "fauna-shallow-nautilus",
    "fauna-shallow-squid",
    "fauna-deep-glass-squid",
    "fauna-abyss-bigfin-squid",
    "fauna-abyss-vampire-squid",
]

NAMED_FAILURE_KEYS = [
    "fauna-exp-nacre-thorn-clam",
    "fauna-exp-saffron-paddle-cuttle",
    "fauna-exp-prism-bell-jelly",
    "fauna-exp-snowcap-snailfish",
    "fauna-exp-lumen-brow-barreleye",
    "fauna-exp-glass-helm-nautilus",
    "fauna-exp-ashveil-butterflyfish",
    "fauna-exp-rustjaw-blenny",
    "fauna-exp-pearl-eye-flounder",
    "fauna-exp-aurora-fin-damselfish",
    "fauna-exp-cinder-vent-clingfish",
    "fauna-exp-moonspot-drumfish",
]


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("image has no nontransparent pixels")
    return bbox


def fit_size(crop_width: int, crop_height: int, key: str, silhouette: str = "") -> tuple[int, int]:
    aspect = crop_width / max(1, crop_height)
    text = f"{key} {silhouette}".lower()
    if key == "fauna-abyss-viperfish":
        return 190, 86
    if any(term in text for term in ["needlefish", "pipefish", "snipe", "eel", "ribbonfish", "rattail", "halfbeak", "razorfish", "thread"]):
        return 190, 78
    if any(term in text for term in ["jelly", "seahorse", "urchin", "clam", "tripodfish"]):
        return 120, 150
    if aspect >= 2.3:
        return 184, 82
    if aspect <= 0.72:
        return 112, 154
    if any(term in text for term in ["ray", "flounder", "cuttle", "squid", "crab", "prawn", "shrimp"]):
        return 156, 118
    return 146, 104


def build_base_frame(alpha_path: Path, key: str, silhouette: str = "") -> Image.Image:
    source = Image.open(alpha_path).convert("RGBA")
    left, top, right, bottom = alpha_bbox(source)
    crop_width = right - left
    crop_height = bottom - top
    pad_x = max(14, round(crop_width * 0.06))
    pad_y = max(12, round(crop_height * 0.08))
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(source.width, right + pad_x)
    bottom = min(source.height, bottom + pad_y)
    crop = source.crop((left, top, right, bottom))

    target_width, target_height = fit_size(crop.width, crop.height, key, silhouette)
    # Four-frame loops move farther than the old static-source warps, so keep a
    # little more clear water around the source art to avoid clipped beats.
    scale = min((target_width - 10) / crop.width, (target_height - 10) / crop.height)
    resized = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    frame.alpha_composite(resized, ((target_width - resized.width) // 2, (target_height - resized.height) // 2))
    return frame


def transform_mesh(image: Image.Image, mesh: list[tuple[tuple[int, int, int, int], tuple[float, ...]]]) -> Image.Image:
    return image.transform(
        image.size,
        Image.Transform.MESH,
        mesh,
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )


def horizontal_body_wave(
    image: Image.Image,
    phase: float,
    amplitude: float,
    *,
    cycles: float,
    tail_bias: float,
    head_bias: float = 0.0,
    base_weight: float = 0.22,
) -> Image.Image:
    width, height = image.size
    strip = 3
    mesh: list[tuple[tuple[int, int, int, int], tuple[float, ...]]] = []
    for x0 in range(0, width, strip):
        x1 = min(width, x0 + strip)
        center = (x0 + x1) / (2 * width)
        weight = base_weight + tail_bias * ((1 - center) ** 1.7) + head_bias * (center**2.1)
        offset = math.sin(center * math.tau * cycles + phase) * amplitude * weight
        mesh.append(((x0, 0, x1, height), (x0, -offset, x0, height - offset, x1, height - offset, x1, -offset)))
    return transform_mesh(image, mesh)


def vertical_body_wave(
    image: Image.Image,
    phase: float,
    amplitude: float,
    *,
    cycles: float,
    tail_bias: float = 1.0,
) -> Image.Image:
    width, height = image.size
    strip = 3
    mesh: list[tuple[tuple[int, int, int, int], tuple[float, ...]]] = []
    for y0 in range(0, height, strip):
        y1 = min(height, y0 + strip)
        center = (y0 + y1) / (2 * height)
        weight = 0.25 + tail_bias * (center**1.65)
        offset = math.sin(center * math.tau * cycles + phase) * amplitude * weight
        mesh.append(((0, y0, width, y1), (-offset, y0, -offset, y1, width - offset, y1, width - offset, y0)))
    return transform_mesh(image, mesh)


def ray_undulation(image: Image.Image, phase: float, amplitude: float) -> Image.Image:
    width, height = image.size
    strip = 3
    mesh: list[tuple[tuple[int, int, int, int], tuple[float, ...]]] = []
    for x0 in range(0, width, strip):
        x1 = min(width, x0 + strip)
        center = (x0 + x1) / (2 * width)
        wing_weight = 0.25 + abs(center - 0.5) * 1.85
        offset = math.sin(center * math.tau * 1.55 + phase) * amplitude * wing_weight
        mesh.append(((x0, 0, x1, height), (x0, -offset, x0, height - offset, x1, height - offset, x1, -offset)))
    return transform_mesh(image, mesh)


def bell_drag(image: Image.Image, phase: float, amplitude: float) -> Image.Image:
    width, height = image.size
    strip = 3
    mesh: list[tuple[tuple[int, int, int, int], tuple[float, ...]]] = []
    for y0 in range(0, height, strip):
        y1 = min(height, y0 + strip)
        center = (y0 + y1) / (2 * height)
        lower_weight = max(0.0, (center - 0.25) / 0.75) ** 1.7
        offset = math.sin(phase - center * math.pi * 0.9) * amplitude * lower_weight
        mesh.append(((0, y0, width, y1), (-offset, y0, -offset, y1, width - offset, y1, width - offset, y0)))
    return transform_mesh(image, mesh)


def scale_center(image: Image.Image, scale_x: float, scale_y: float, dx: float = 0.0, dy: float = 0.0) -> Image.Image:
    width, height = image.size
    scaled = image.resize((max(1, round(width * scale_x)), max(1, round(height * scale_y))), Image.Resampling.BICUBIC)
    frame = Image.new("RGBA", image.size, (0, 0, 0, 0))
    frame.alpha_composite(
        scaled,
        (
            round((width - scaled.width) / 2 + dx),
            round((height - scaled.height) / 2 + dy),
        ),
    )
    return frame


def region_mask(size: tuple[int, int], x0: float, y0: float, x1: float, y1: float, blur: float) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle(
        (
            round(width * x0),
            round(height * y0),
            round(width * x1),
            round(height * y1),
        ),
        fill=220,
    )
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    return mask


def shift_layer(layer: Image.Image, dx: float, dy: float) -> Image.Image:
    width, height = layer.size
    x_shift = round(dx)
    y_shift = round(dy)
    source_left = max(0, -x_shift)
    source_top = max(0, -y_shift)
    source_right = min(width, width - x_shift)
    source_bottom = min(height, height - y_shift)
    shifted = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    if source_right <= source_left or source_bottom <= source_top:
        return shifted
    shifted.alpha_composite(layer.crop((source_left, source_top, source_right, source_bottom)), (max(0, x_shift), max(0, y_shift)))
    return shifted


def regional_offset(
    image: Image.Image,
    x_range: tuple[float, float],
    y_range: tuple[float, float],
    dx: float,
    dy: float,
    *,
    blur: float = 4.0,
) -> Image.Image:
    mask = region_mask(image.size, x_range[0], y_range[0], x_range[1], y_range[1], blur)
    transparent = Image.new("RGBA", image.size, (0, 0, 0, 0))
    moving = Image.composite(image, transparent, mask)
    base = Image.composite(transparent, image, mask)
    moved = shift_layer(moving, dx, dy)
    base.alpha_composite(moved)
    return base


def apply_lighting(image: Image.Image, phase: float, strength: float) -> Image.Image:
    strength *= 1.6
    bright = 1.0 + math.sin(phase + math.pi * 0.25) * strength
    contrast = 1.0 + math.cos(phase) * strength * 0.55
    frame = ImageEnhance.Brightness(image).enhance(max(0.85, bright))
    return ImageEnhance.Contrast(frame).enhance(max(0.88, contrast))


def motion_kind(key: str, silhouette: str = "") -> str:
    text = f"{key} {silhouette}".lower()
    if "clam" in text:
        return "clam"
    if "nautilus" in text:
        return "nautilus"
    if "jelly" in text:
        return "jelly"
    if any(term in text for term in ["squid", "cuttle"]):
        return "cephalopod"
    if any(term in text for term in ["shrimp", "prawn", "crab", "copepod"]):
        return "crustacean"
    if any(term in text for term in ["seahorse", "garden eel"]):
        return "vertical"
    if any(term in text for term in ["ray", "flounder", "sea moth"]):
        return "flat"
    if "tripodfish" in text:
        return "tripod"
    if "urchin" in text:
        return "pulse"
    if any(term in text for term in ["eel", "needle", "pipefish", "halfbeak", "ribbon", "rattail", "razorfish", "hagfish", "thread", "snipe"]):
        return "long"
    return "fish"


def fish_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    frame = horizontal_body_wave(base, phase, max(2.8, min(9.0, height * 0.105)), cycles=1.22, tail_bias=1.55, head_bias=0.22)
    tail_dy = math.sin(phase + math.pi * 0.35) * max(3.5, height * 0.105)
    fin_dy = math.sin(phase + math.pi * 0.95) * max(1.7, height * 0.052)
    frame = regional_offset(frame, (0.0, 0.38), (0.05, 0.95), 0, tail_dy, blur=3)
    frame = regional_offset(frame, (0.34, 0.76), (0.50, 1.0), 0, fin_dy, blur=3)
    frame = scale_center(
        frame,
        1.0 + math.cos(phase) * 0.010,
        1.0 - math.cos(phase) * 0.014,
        dx=math.cos(phase + math.pi * 0.4) * max(0.8, width * 0.006),
        dy=math.sin(phase + math.pi * 0.25) * max(1.0, height * 0.018),
    )
    return apply_lighting(frame, phase, 0.038)


def long_frame(base: Image.Image, phase: float) -> Image.Image:
    _, height = base.size
    frame = horizontal_body_wave(base, phase, max(4.0, min(12.0, height * 0.17)), cycles=1.92, tail_bias=1.12, head_bias=0.50, base_weight=0.38)
    end_dy = math.sin(phase + math.pi * 0.72) * max(2.5, height * 0.08)
    frame = regional_offset(frame, (0.0, 0.26), (0.04, 0.96), 0, end_dy, blur=3)
    frame = regional_offset(frame, (0.74, 1.0), (0.04, 0.96), 0, -end_dy * 0.78, blur=3)
    return apply_lighting(frame, phase, 0.034)


def cephalopod_frame(base: Image.Image, phase: float) -> Image.Image:
    _, height = base.size
    pulse = math.sin(phase)
    frame = horizontal_body_wave(base, phase + 0.35, max(2.0, height * 0.07), cycles=1.10, tail_bias=0.68, head_bias=0.82, base_weight=0.24)
    frame = scale_center(frame, 1.0 + pulse * 0.018, 1.0 - pulse * 0.052)
    sweep = math.sin(phase + math.pi * 0.3) * max(3.6, height * 0.13)
    frame = regional_offset(frame, (0.0, 0.38), (0.06, 0.98), 0, sweep, blur=3)
    frame = regional_offset(frame, (0.62, 1.0), (0.06, 0.96), 0, -sweep * 0.86, blur=3)
    frame = regional_offset(frame, (0.18, 0.88), (0.0, 0.25), 0, -sweep * 0.42, blur=3)
    return apply_lighting(frame, phase, 0.044)


def jelly_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    pulse = math.sin(phase)
    frame = scale_center(base, 1.0 + pulse * 0.085, 1.0 - pulse * 0.095)
    frame = bell_drag(frame, phase + math.pi * 0.15, max(3.6, width * 0.08))
    frame = regional_offset(frame, (0.14, 0.86), (0.45, 1.0), 0, -pulse * max(2.6, height * 0.055), blur=5)
    return apply_lighting(frame, phase, 0.048)


def clam_frame(base: Image.Image, phase: float) -> Image.Image:
    _, height = base.size
    pulse = math.sin(phase)
    frame = scale_center(base, 1.0 + pulse * 0.018, 1.0 + pulse * 0.065)
    open_px = pulse * max(3.0, height * 0.065)
    frame = regional_offset(frame, (0.08, 0.92), (0.0, 0.48), 0, -open_px, blur=4)
    frame = regional_offset(frame, (0.08, 0.92), (0.52, 1.0), 0, open_px * 0.92, blur=4)
    frame = regional_offset(frame, (0.52, 1.0), (0.30, 0.84), math.cos(phase) * 2.2, math.sin(phase) * 1.6, blur=4)
    return apply_lighting(frame, phase, 0.046)


def nautilus_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    frame = horizontal_body_wave(base, phase, max(2.2, height * 0.058), cycles=0.95, tail_bias=0.38, head_bias=0.56, base_weight=0.12)
    sweep = math.sin(phase + math.pi * 0.25) * max(4.2, height * 0.155)
    reach = math.cos(phase + math.pi * 0.18) * max(1.4, width * 0.018)
    frame = regional_offset(frame, (0.0, 0.45), (0.14, 1.0), reach, sweep, blur=2)
    frame = regional_offset(frame, (0.55, 1.0), (0.14, 1.0), -reach * 0.72, -sweep * 0.9, blur=2)
    frame = scale_center(
        frame,
        1.0 + math.sin(phase) * 0.016,
        1.0 - math.sin(phase) * 0.024,
        dx=math.cos(phase) * max(0.8, width * 0.006),
        dy=math.sin(phase + math.pi * 0.35) * max(1.0, height * 0.014),
    )
    return apply_lighting(frame, phase, 0.052)


def crustacean_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    frame = horizontal_body_wave(base, phase + 0.25, max(2.0, height * 0.052), cycles=1.0, tail_bias=0.86, head_bias=0.38)
    leg = math.sin(phase) * max(2.8, width * 0.03)
    claw = math.sin(phase + math.pi * 0.5) * max(2.2, height * 0.06)
    frame = regional_offset(frame, (0.06, 0.90), (0.56, 1.0), leg, claw * 0.46, blur=3)
    frame = regional_offset(frame, (0.0, 0.32), (0.08, 0.58), -leg * 0.55, -claw, blur=3)
    frame = regional_offset(frame, (0.68, 1.0), (0.08, 0.58), leg * 0.55, claw, blur=3)
    return apply_lighting(frame, phase, 0.042)


def vertical_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    frame = vertical_body_wave(base, phase, max(3.2, width * 0.055), cycles=1.22, tail_bias=1.28)
    curl = math.sin(phase + math.pi * 0.4) * max(2.6, width * 0.04)
    frame = regional_offset(frame, (0.18, 0.84), (0.0, 0.36), curl * 0.68, 0, blur=3)
    frame = regional_offset(frame, (0.16, 0.88), (0.64, 1.0), -curl, 0, blur=3)
    frame = regional_offset(frame, (0.40, 1.0), (0.13, 0.74), 0, math.sin(phase) * max(1.2, height * 0.022), blur=3)
    return apply_lighting(frame, phase, 0.038)


def flat_frame(base: Image.Image, phase: float) -> Image.Image:
    _, height = base.size
    pulse = math.sin(phase)
    frame = ray_undulation(base, phase + 0.35, max(2.6, height * 0.095))
    frame = regional_offset(frame, (0.0, 0.32), (0.08, 0.92), 0, pulse * max(2.4, height * 0.07), blur=3)
    frame = regional_offset(frame, (0.68, 1.0), (0.08, 0.92), 0, -pulse * max(2.4, height * 0.07), blur=3)
    return apply_lighting(frame, phase, 0.04)


def pulse_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    pulse = math.sin(phase)
    frame = scale_center(base, 1.0 + pulse * 0.088, 1.0 - pulse * 0.065)
    frame = vertical_body_wave(frame, phase + math.pi * 0.25, max(2.1, width * 0.038), cycles=1.58, tail_bias=0.95)
    frame = regional_offset(frame, (0.0, 1.0), (0.0, 0.34), math.cos(phase) * 2.2, -pulse * max(0.9, height * 0.014), blur=3)
    frame = regional_offset(frame, (0.0, 1.0), (0.66, 1.0), -math.cos(phase) * 2.5, pulse * max(0.9, height * 0.014), blur=3)
    return apply_lighting(frame, phase, 0.052)


def tripod_frame(base: Image.Image, phase: float) -> Image.Image:
    width, height = base.size
    frame = fish_frame(base, phase)
    stance = math.sin(phase + math.pi * 0.5) * max(2.2, width * 0.024)
    frame = regional_offset(frame, (0.16, 0.84), (0.52, 1.0), stance, math.cos(phase) * max(1.6, height * 0.032), blur=3)
    return frame


def make_motion_frames(base: Image.Image, key: str, silhouette: str = "") -> list[Image.Image]:
    kind = motion_kind(key, silhouette)
    phases = [index * math.tau / FRAME_COUNT for index in range(FRAME_COUNT)]
    frames: list[Image.Image] = []
    for phase in phases:
        if kind == "clam":
            frame = clam_frame(base, phase)
        elif kind == "nautilus":
            frame = nautilus_frame(base, phase)
        elif kind == "jelly":
            frame = jelly_frame(base, phase)
        elif kind == "cephalopod":
            frame = cephalopod_frame(base, phase)
        elif kind == "crustacean":
            frame = crustacean_frame(base, phase)
        elif kind == "vertical":
            frame = vertical_frame(base, phase)
        elif kind == "flat":
            frame = flat_frame(base, phase)
        elif kind == "pulse":
            frame = pulse_frame(base, phase)
        elif kind == "tripod":
            frame = tripod_frame(base, phase)
        elif kind == "long":
            frame = long_frame(base, phase)
        else:
            frame = fish_frame(base, phase)
        frames.append(frame)
    return frames


def union_alpha_bbox(frames: list[Image.Image]) -> tuple[int, int, int, int] | None:
    left = top = 10**9
    right = bottom = -1
    for frame in frames:
        bbox = frame.getchannel("A").getbbox()
        if not bbox:
            continue
        left = min(left, bbox[0])
        top = min(top, bbox[1])
        right = max(right, bbox[2])
        bottom = max(bottom, bbox[3])
    if right < left or bottom < top:
        return None
    return left, top, right, bottom


def normalize_loop_margins(frames: list[Image.Image], min_margin: int = 3) -> list[Image.Image]:
    if not frames:
        return frames
    width, height = frames[0].size
    bbox = union_alpha_bbox(frames)
    if bbox is None:
        return frames

    left, top, right, bottom = bbox
    union_width = right - left
    union_height = bottom - top
    scale = min(1.0, (width - min_margin * 2) / max(1, union_width), (height - min_margin * 2) / max(1, union_height))
    if scale < 1.0:
        frames = [scale_center(frame, scale, scale) for frame in frames]
        bbox = union_alpha_bbox(frames)
        if bbox is None:
            return frames
        left, top, right, bottom = bbox

    dx = round(width / 2 - (left + right) / 2)
    dy = round(height / 2 - (top + bottom) / 2)
    if dx or dy:
        frames = [shift_layer(frame, dx, dy) for frame in frames]
    return frames


def write_sheet(key: str, frames: list[Image.Image], frame_rate: int = FRAME_RATE) -> None:
    frames = normalize_loop_margins(frames)
    cell_width = max(frame.width for frame in frames)
    cell_height = max(frame.height for frame in frames)
    sheet = Image.new("RGBA", (cell_width * len(frames), cell_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        frame_path = GENERATED / f"{key}-{index}.png"
        frame.save(frame_path)
        sheet.alpha_composite(frame, (index * cell_width + (cell_width - frame.width) // 2, (cell_height - frame.height) // 2))
    sheet.save(GENERATED / f"{key}.png")
    manifest = {
        "schema": "asset-forge/sprite-frames@1",
        "name": key,
        "image": f"{key}.png",
        "frameWidth": cell_width,
        "frameHeight": cell_height,
        "columns": len(frames),
        "rows": 1,
        "frameCount": len(frames),
        "anchor": {"x": 0.5, "y": 0.5},
        "directions": [],
        "animations": {"swim": {"frames": list(range(len(frames))), "frameRate": frame_rate, "loop": True}},
    }
    (GENERATED / f"{key}.frames.json").write_text(json.dumps(manifest, indent=2) + "\n")


def draw_entry_tile(key: str, label: str, outline: tuple[int, int, int, int]) -> Image.Image:
    tile = Image.new("RGBA", (360, 170), (6, 16, 24, 255))
    draw = ImageDraw.Draw(tile)
    draw.rectangle((0, 0, 359, 169), outline=outline)
    for index in range(FRAME_COUNT):
        frame = Image.open(GENERATED / f"{key}-{index}.png").convert("RGBA")
        frame.thumbnail((74, 78), Image.Resampling.LANCZOS)
        x = 12 + index * 84 + (74 - frame.width) // 2
        y = 18 + (78 - frame.height) // 2
        tile.alpha_composite(frame, (x, y))
        draw.text((15 + index * 84, 104), f"f{index}", fill=(142, 231, 244, 255))
    if len(label) > 45:
        label = label[:42] + "..."
    draw.text((10, 132), label, fill=(215, 255, 246, 255))
    return tile


def build_contact_sheet(entries: Iterable[dict[str, object]]) -> None:
    rows = []
    for entry in entries:
        key = str(entry["id"])
        display_name = str(entry["displayName"])
        biome = entry.get("biomeBand", "?")
        kind = motion_kind(key, str(entry.get("silhouette", "")))
        rows.append(draw_entry_tile(key, f"B{biome} {kind} {display_name}", (39, 67, 82, 255)))

    columns = 4
    sheet_rows = math.ceil(len(rows) / columns)
    sheet = Image.new("RGBA", (columns * 360, sheet_rows * 170), (6, 16, 24, 255))
    for index, tile in enumerate(rows):
        sheet.alpha_composite(tile, ((index % columns) * 360, (index // columns) * 170))
    PROOF.mkdir(parents=True, exist_ok=True)
    sheet.save(PROOF / "new-fauna-builder-contact-sheet.png")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-viperfish",
        action="store_true",
        help="also rebuild the legacy bespoke fauna-abyss-viperfish asset; off by default to preserve unrelated dirty tracked files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = json.loads(MANIFEST.read_text())
    entries = [
        entry
        for entry in manifest["entries"]
        if entry.get("status") == "processed" and str(entry.get("id", "")).startswith("fauna-exp-")
    ]
    entries.sort(key=lambda entry: (entry["biomeBand"], entry["displayName"]))
    for entry in entries:
        key = str(entry["id"])
        silhouette = str(entry.get("silhouette", ""))
        base = build_base_frame(Path(str(entry["alpha"])), key, silhouette)
        write_sheet(key, make_motion_frames(base, key, silhouette))

    if args.include_viperfish:
        viper_base = build_base_frame(PACK / "alpha/fauna-abyss-viperfish-bespoke.png", "fauna-abyss-viperfish", "viperfish")
        write_sheet("fauna-abyss-viperfish", make_motion_frames(viper_base, "fauna-abyss-viperfish", "viperfish"))

    build_contact_sheet(entries)
    print(f"wrote {len(entries)} generated fauna sheets with {FRAME_COUNT} frames at {FRAME_RATE} fps")
    print(f"wrote {PROOF / 'new-fauna-builder-contact-sheet.png'}")


if __name__ == "__main__":
    main()
