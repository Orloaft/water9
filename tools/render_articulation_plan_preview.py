#!/usr/bin/env python3
"""Render a crop/anchor preview for a water9 articulation plan."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ROLE_COLORS = {
    "head": (255, 218, 92, 255),
    "jaw": (255, 132, 90, 255),
    "torso": (104, 222, 160, 255),
    "tail": (126, 190, 255, 255),
    "fin": (218, 142, 255, 255),
}
SOCKET_COLOR = (255, 255, 255, 230)
ANCHOR_COLOR = (25, 255, 217, 255)
PARENT_ANCHOR_COLOR = (255, 96, 128, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--max-width", type=int, default=1600)
    parser.add_argument("--show-sockets", action="store_true", default=True)
    return parser.parse_args()


def crop_box(crop: dict[str, Any]) -> tuple[int, int, int, int]:
    x = int(crop["x"])
    y = int(crop["y"])
    width = int(crop["width"])
    height = int(crop["height"])
    return x, y, x + width, y + height


def source_path(plan: dict[str, Any]) -> Path:
    source = plan.get("source")
    if not source:
        raise ValueError("plan.source is required")
    path = (ROOT / source).resolve()
    if not path.exists():
        raise FileNotFoundError(f"plan.source does not exist: {source}")
    return path


def scaled_point(point: tuple[float, float], scale: float) -> tuple[int, int]:
    return round(point[0] * scale), round(point[1] * scale)


def scaled_box(box: tuple[int, int, int, int], scale: float) -> tuple[int, int, int, int]:
    return tuple(round(value * scale) for value in box)


def anchor_world(part: dict[str, Any], anchor_name: str) -> tuple[float, float] | None:
    crop = part.get("sourceCrop") or part.get("crop")
    anchors = part.get("anchors") or {}
    anchor = anchors.get(anchor_name)
    if not crop or not anchor or len(anchor) != 2:
        return None
    return (
        float(crop["x"]) + float(crop["width"]) / 2 + float(anchor[0]),
        float(crop["y"]) + float(crop["height"]) / 2 + float(anchor[1]),
    )


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: tuple[int, int, int, int]) -> None:
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    bbox = draw.textbbox(xy, text, font=font)
    pad = 3
    draw.rectangle((bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad), fill=(0, 8, 12, 210))
    draw.text(xy, text, fill=fill, font=font)


def draw_cross(draw: ImageDraw.ImageDraw, xy: tuple[int, int], color: tuple[int, int, int, int], radius: int = 5) -> None:
    x, y = xy
    draw.line((x - radius, y, x + radius, y), fill=color, width=2)
    draw.line((x, y - radius, x, y + radius), fill=color, width=2)
    draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=color)


def main() -> int:
    args = parse_args()
    plan = json.loads(args.plan.read_text())
    if plan.get("schema") != "water9/articulation-plan@1":
        raise ValueError(f"{args.plan}: expected schema water9/articulation-plan@1")

    image = Image.open(source_path(plan)).convert("RGBA")
    scale = min(1.0, args.max_width / max(1, image.width))
    if scale < 1:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    parts = plan.get("parts") or []
    parts_by_id = {part.get("id"): part for part in parts}
    for part in parts:
        crop = part.get("sourceCrop") or part.get("crop")
        if not crop:
            continue
        role = part.get("role") or (part.get("anatomy") or {}).get("role") or "part"
        color = ROLE_COLORS.get(role, (220, 240, 255, 255))
        box = scaled_box(crop_box(crop), scale)
        draw.rectangle(box, outline=color, width=max(2, round(3 * scale)))
        draw.rectangle(box, fill=(*color[:3], 30))
        draw_label(draw, (box[0] + 4, box[1] + 4), f"{part.get('id')} [{role}]", color)
        for anchor_name in (part.get("anchors") or {}):
            point = anchor_world(part, anchor_name)
            if point:
                draw_cross(draw, scaled_point(point, scale), ANCHOR_COLOR)

    if args.show_sockets:
        for socket in plan.get("socketOverlays") or []:
            crop = socket.get("sourceCrop") or socket.get("crop")
            source_part = parts_by_id.get(socket.get("sourcePartId"))
            if not crop or not source_part:
                continue
            source_crop = source_part.get("sourceCrop") or source_part.get("crop")
            if not source_crop:
                continue
            x0 = float(source_crop["x"]) + float(crop["x"])
            y0 = float(source_crop["y"]) + float(crop["y"])
            box = scaled_box((round(x0), round(y0), round(x0 + crop["width"]), round(y0 + crop["height"])), scale)
            draw.rectangle(box, outline=SOCKET_COLOR, width=max(1, round(2 * scale)))
            draw_label(draw, (box[0] + 4, box[1] + 18), f"socket:{socket.get('id')}", SOCKET_COLOR)

    for part in parts:
        parent = parts_by_id.get(part.get("parentId"))
        if not parent:
            continue
        parent_point = anchor_world(parent, str(part.get("parentAnchor")))
        child_point = anchor_world(part, str(part.get("anchor")))
        if parent_point:
            draw_cross(draw, scaled_point(parent_point, scale), PARENT_ANCHOR_COLOR, 7)
        if child_point:
            draw_cross(draw, scaled_point(child_point, scale), ANCHOR_COLOR, 7)
        if parent_point and child_point:
            draw.line((*scaled_point(parent_point, scale), *scaled_point(child_point, scale)), fill=(255, 255, 255, 120), width=1)

    result = Image.alpha_composite(image, overlay)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.out, optimize=True, compress_level=9)
    print(json.dumps({
        "plan": str(args.plan),
        "out": str(args.out),
        "source": plan.get("source"),
        "parts": len(parts),
        "socketOverlays": len(plan.get("socketOverlays") or []),
        "size": [result.width, result.height],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
