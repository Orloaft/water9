#!/usr/bin/env python3
"""Author Phase 5 lower/deep background assets for Water9.

This pass deliberately stays inside the Phase 3 manifest/compositor lane:
it creates transparent authored cutouts for lower and transition-deep shots,
then appends manifest entries consumed by the existing runtime loader.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"

ASSETS = [
    {
        "id": "phase5-lower-drowned-gantry-wide",
        "filename": "water9-phase5-lower-drowned-gantry-wide.png",
        "band": "lower",
        "label": "Phase 5 lower drowned gantry and reef ribs",
        "safeOpacity": 0.24,
        "scaleRange": [1.15, 1.85],
        "parallaxRange": [0.025, 0.075],
    },
    {
        "id": "phase5-lower-cable-reef-span",
        "filename": "water9-phase5-lower-cable-reef-span.png",
        "band": "lower",
        "label": "Phase 5 lower cable span over reef debris",
        "safeOpacity": 0.22,
        "scaleRange": [1.05, 1.7],
        "parallaxRange": [0.03, 0.085],
    },
    {
        "id": "phase5-transition-pressure-ribs-wide",
        "filename": "water9-phase5-transition-pressure-ribs-wide.png",
        "band": "transitionDeep",
        "label": "Phase 5 transition-deep pressure ribs",
        "safeOpacity": 0.26,
        "scaleRange": [1.2, 1.95],
        "parallaxRange": [0.018, 0.06],
    },
    {
        "id": "phase5-transition-brine-curtain-ruin",
        "filename": "water9-phase5-transition-brine-curtain-ruin.png",
        "band": "transitionDeep",
        "label": "Phase 5 transition-deep brine curtain ruin",
        "safeOpacity": 0.23,
        "scaleRange": [1.1, 1.8],
        "parallaxRange": [0.02, 0.065],
    },
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def draw_soft_line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], color: tuple[int, int, int, int], width: int) -> None:
    draw.line(points, fill=color, width=width, joint="curve")


def lower_gantry(path: Path) -> None:
    image = Image.new("RGBA", (760, 300), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ink = (22, 68, 92, 230)
    dim = (43, 101, 112, 128)
    draw.polygon([(22, 220), (170, 148), (338, 168), (548, 92), (738, 132), (738, 184), (520, 146), (342, 230), (156, 202), (22, 258)], fill=(8, 30, 46, 168))
    for x, top, lean in [(96, 120, -26), (198, 150, 18), (334, 118, -12), (470, 86, 24), (618, 104, -20)]:
        draw.line([(x, top), (x + lean, 272)], fill=ink, width=12)
        draw.line([(x - 28, top + 38), (x + lean + 30, 266)], fill=(18, 54, 78, 168), width=5)
    draw.line([(64, 170), (250, 150), (430, 118), (704, 150)], fill=ink, width=10)
    draw.line([(80, 196), (266, 176), (430, 146), (716, 172)], fill=dim, width=5)
    for i in range(10):
        x = 74 + i * 66
        draw.arc((x, 118 + (i % 3) * 9, x + 96, 210 + (i % 2) * 18), 200, 342, fill=(54, 119, 126, 118), width=3)
    for x in range(44, 720, 58):
        draw.ellipse((x, 238 + (x % 37), x + 72, 288), fill=(7, 31, 44, 132))
    image.filter(ImageFilter.GaussianBlur(0.45)).save(path)


def lower_cables(path: Path) -> None:
    image = Image.new("RGBA", (720, 270), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.polygon([(18, 214), (116, 164), (248, 190), (388, 136), (564, 186), (704, 154), (704, 226), (20, 250)], fill=(6, 27, 42, 166))
    for offset, alpha, width in [(0, 220, 5), (24, 138, 3), (-18, 112, 3)]:
        points = [(16, 92 + offset), (156, 122 + offset), (304, 110 + offset), (452, 144 + offset), (704, 118 + offset)]
        draw_soft_line(draw, points, (28, 86, 103, alpha), width)
    for i in range(14):
        x = 58 + i * 44
        y = 104 + ((i * 37) % 43)
        draw.ellipse((x, y, x + 18, y + 10), outline=(54, 118, 124, 132), width=3)
    for x, h in [(114, 110), (238, 84), (390, 126), (562, 92), (640, 132)]:
        draw.line([(x, 154), (x - 16, 154 + h)], fill=(11, 44, 65, 190), width=8)
        draw.line([(x + 18, 162), (x - 28, 160 + h)], fill=(47, 103, 112, 112), width=3)
    image.filter(ImageFilter.GaussianBlur(0.35)).save(path)


def transition_ribs(path: Path) -> None:
    image = Image.new("RGBA", (800, 330), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.polygon([(0, 252), (158, 182), (302, 208), (454, 132), (648, 172), (800, 120), (800, 220), (0, 300)], fill=(5, 19, 40, 174))
    for i in range(9):
        x = 74 + i * 78
        h = 128 + (i % 4) * 28
        top = 94 + (i % 3) * 16
        draw.arc((x - 62, top, x + 72, top + h), 84, 262, fill=(18, 51, 86, 230), width=12)
        draw.arc((x - 40, top + 26, x + 54, top + h + 14), 86, 260, fill=(58, 99, 129, 120), width=3)
    draw.line([(28, 236), (230, 204), (420, 172), (790, 150)], fill=(13, 42, 76, 198), width=12)
    draw.line([(56, 264), (248, 230), (430, 196), (780, 178)], fill=(57, 96, 125, 112), width=4)
    image.filter(ImageFilter.GaussianBlur(0.55)).save(path)


def transition_brine(path: Path) -> None:
    image = Image.new("RGBA", (690, 340), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.polygon([(36, 246), (134, 172), (258, 196), (396, 138), (536, 186), (672, 158), (672, 258), (38, 288)], fill=(4, 17, 36, 168))
    for i in range(18):
        x = 52 + i * 34
        top = 50 + (i * 29) % 74
        bottom = 310 - (i * 17) % 42
        alpha = 92 + (i * 19) % 96
        draw.line([(x, top), (x + ((i % 5) - 2) * 11, bottom)], fill=(68, 119, 128, alpha), width=2 + (i % 3))
    for x in [86, 188, 318, 474, 606]:
        draw.rectangle((x, 146, x + 18, 292), fill=(10, 37, 67, 196))
        draw.line([(x - 20, 176), (x + 58, 236)], fill=(39, 83, 111, 138), width=6)
    for i in range(8):
        x = 110 + i * 68
        draw.ellipse((x, 114 + (i % 2) * 22, x + 82, 166 + (i % 3) * 17), outline=(64, 112, 125, 118), width=3)
    image.filter(ImageFilter.GaussianBlur(0.5)).save(path)


DRAWERS = {
    "phase5-lower-drowned-gantry-wide": lower_gantry,
    "phase5-lower-cable-reef-span": lower_cables,
    "phase5-transition-pressure-ribs-wide": transition_ribs,
    "phase5-transition-brine-curtain-ruin": transition_brine,
}


def manifest_entry(asset: dict[str, Any]) -> dict[str, Any]:
    path = OUT_DIR / asset["filename"]
    with Image.open(path) as image:
        size = list(image.size)
    return {
        "id": asset["id"],
        "role": "landmark",
        "band": asset["band"],
        "label": asset["label"],
        "repeatMode": "anchor",
        "path": rel(path),
        "status": "ready",
        "safeOpacity": asset["safeOpacity"],
        "scaleRange": asset["scaleRange"],
        "parallaxRange": asset["parallaxRange"],
        "readabilityRisk": "medium",
        "size": size,
        "authoredPhase": 5,
        "notes": "Purpose-built Phase 5 lower/deep authored cutout for drowned-industrial and reef structure outside the lamp volume.",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        DRAWERS[asset["id"]](OUT_DIR / asset["filename"])

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    phase5_ids = {asset["id"] for asset in ASSETS}
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in phase5_ids]
    manifest["assets"].extend(manifest_entry(asset) for asset in ASSETS)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = manifest.setdefault("notes", [])
    phase5_note = "Phase 5 appends authored lower/transition-deep landmark cutouts to reduce flat lamp-slab reads while preserving gameplay clarity."
    if phase5_note not in notes:
        notes.append(phase5_note)
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    print(json.dumps({"manifest": rel(MANIFEST), "generated": [rel(OUT_DIR / asset["filename"]) for asset in ASSETS]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
