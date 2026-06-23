#!/usr/bin/env python3
"""Cut the bespoke diver suit source into articulated preview parts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
HIGH_SOURCE = GENERATED / "diver-articulated-suit-v2-whole-painted-hi.png"
SOURCE = GENERATED / "diver-articulated-suit-v2-whole-painted.png"
MANIFEST = GENERATED / "diver-articulated-suit.parts.json"
SOURCE_SIZE = (887, 444)
SOURCE_CENTER = (SOURCE_SIZE[0] / 2, SOURCE_SIZE[1] / 2)
PREFIX = "diver-articulated-suit"


def part(
    part_id: str,
    crop: tuple[int, int, int, int],
    origin: list[float],
    anchors: dict[str, list[float]],
    parent_id: str | None = None,
    parent_anchor: str | None = None,
    anchor: str | None = None,
    rest_offset: list[float] | None = None,
    depth: float = 0,
) -> dict[str, Any]:
    x, y, width, height = crop
    data: dict[str, Any] = {
        "id": part_id,
        "textureKey": f"{PREFIX}-{part_id}",
        "texture": f"{PREFIX}-{part_id}.png",
        "sourceCrop": {"x": x, "y": y, "width": width, "height": height},
        "offset": [x + width / 2 - SOURCE_CENTER[0], y + height / 2 - SOURCE_CENTER[1]],
        "origin": origin,
        "size": [width, height],
        "anchors": anchors,
        "depth": depth,
    }
    if parent_id:
        data["parentId"] = parent_id
        data["parentAnchor"] = parent_anchor
        data["anchor"] = anchor
        data["restOffset"] = rest_offset or [0, 0]
    return data


def main() -> int:
    source = Image.open(HIGH_SOURCE).convert("RGBA").resize(SOURCE_SIZE, Image.Resampling.LANCZOS)
    source.save(SOURCE)

    parts = [
        part("backpack", (245, 45, 150, 180), [0.55, 0.48], {"torso": [54, 46]}, "torso", "backpack", "torso", [-10, -8], -0.04),
        part("torso", (340, 75, 175, 215), [0.48, 0.48], {"neck": [78, -60], "backpack": [-58, -36], "shoulder": [78, 18], "hipRear": [-44, 88], "hipFront": [-2, 92]}, depth=0),
        part("helmet", (485, 75, 145, 135), [0.42, 0.56], {"neck": [-48, 30]}, "torso", "neck", "neck", [0, -2], 0.06),
        part("upper-arm", (365, 160, 150, 95), [0.18, 0.35], {"shoulder": [-48, -10], "elbow": [52, 28]}, "torso", "shoulder", "shoulder", [2, 2], 0.08),
        part("forearm", (500, 185, 155, 80), [0.17, 0.42], {"elbow": [-52, 2], "wrist": [50, 12]}, "upper-arm", "elbow", "elbow", [4, 0], 0.09),
        part("hand", (610, 205, 70, 55), [0.25, 0.5], {"wrist": [-18, 0], "toolGrip": [14, 2]}, "forearm", "wrist", "wrist", [2, 0], 0.1),
        part("tool", (630, 205, 230, 90), [0.12, 0.48], {"grip": [-70, -2], "tip": [92, 12]}, "hand", "toolGrip", "grip", [8, 4], 0.11),
        part("rear-thigh", (220, 265, 170, 90), [0.68, 0.24], {"hip": [46, -28], "knee": [-44, 22]}, "torso", "hipRear", "hip", [0, 2], -0.02),
        part("rear-shin", (65, 280, 185, 100), [0.76, 0.28], {"knee": [58, -26], "foot": [-54, 32]}, "rear-thigh", "knee", "knee", [0, 2], -0.03),
        part("front-thigh", (255, 290, 170, 90), [0.52, 0.22], {"hip": [-18, -28], "knee": [38, 24]}, "torso", "hipFront", "hip", [0, 2], 0.02),
        part("front-shin", (120, 315, 190, 105), [0.64, 0.22], {"knee": [44, -30], "foot": [-42, 36]}, "front-thigh", "knee", "knee", [0, 2], 0.01),
    ]

    for data in parts:
        crop = data["sourceCrop"]
        x, y, width, height = crop["x"], crop["y"], crop["width"], crop["height"]
        source.crop((x, y, x + width, y + height)).save(GENERATED / data["texture"])

    manifest = {
        "schema": "water9/diver-articulated-preview@1",
        "id": "diver-articulated-suit",
        "displayName": "Bespoke Articulated Diver Suit",
        "source": "public/assets/generated/diver-articulated-suit-whole-painted.png",
        "sourceTransform": {
            "highSource": "public/assets/generated/diver-articulated-suit-v2-whole-painted-hi.png",
            "process": "bespoke Imagegen v2 cohesive side-view source cut into player-suit body parts for motion review",
        },
        "parts": parts,
        "quality": {
            "status": "prototype",
            "sourceCohesion": "single-source-bespoke-imagegen",
            "acceptanceNote": "Preview-only articulated diver suit. Needs side-view cleanup and runtime integration after human review.",
        },
    }
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n")
    print(f"Wrote articulated diver preview with {len(parts)} parts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
