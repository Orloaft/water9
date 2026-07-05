#!/usr/bin/env python3
"""Author Phase 8 transition-deep painterly swim-by landmarks for Water9."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"


LANDMARKS: list[dict[str, Any]] = [
    {
        "id": "phase8-transition-drowned-mining-gantry",
        "filename": "water9-phase8-transition-drowned-mining-gantry.png",
        "label": "Phase 8 transition-deep drowned mining gantry",
        "safeOpacity": 0.30,
        "scaleRange": [1.28, 2.0],
        "parallaxRange": [0.085, 0.16],
        "readabilityRisk": "medium",
        "lane": "mid",
    },
    {
        "id": "phase8-transition-reef-arch-remnant",
        "filename": "water9-phase8-transition-reef-arch-remnant.png",
        "label": "Phase 8 transition-deep reef arch remnant",
        "safeOpacity": 0.27,
        "scaleRange": [1.18, 1.85],
        "parallaxRange": [0.045, 0.09],
        "readabilityRisk": "low",
        "lane": "far",
    },
    {
        "id": "phase8-transition-cable-buoy-chain",
        "filename": "water9-phase8-transition-cable-buoy-chain.png",
        "label": "Phase 8 transition-deep cable buoy chain",
        "safeOpacity": 0.31,
        "scaleRange": [1.12, 1.72],
        "parallaxRange": [0.13, 0.22],
        "readabilityRisk": "medium",
        "lane": "near",
    },
    {
        "id": "phase8-transition-brine-curtain-ruin",
        "filename": "water9-phase8-transition-brine-curtain-ruin.png",
        "label": "Phase 8 transition-deep brine curtain ruin",
        "safeOpacity": 0.29,
        "scaleRange": [1.16, 1.8],
        "parallaxRange": [0.08, 0.155],
        "readabilityRisk": "medium",
        "lane": "mid",
    },
    {
        "id": "phase8-transition-trench-vent-lattice",
        "filename": "water9-phase8-transition-trench-vent-lattice.png",
        "label": "Phase 8 transition-deep trench vent lattice",
        "safeOpacity": 0.28,
        "scaleRange": [1.1, 1.68],
        "parallaxRange": [0.09, 0.17],
        "readabilityRisk": "medium",
        "lane": "mid",
    },
    {
        "id": "phase8-transition-collapsed-sub-elevator",
        "filename": "water9-phase8-transition-collapsed-sub-elevator.png",
        "label": "Phase 8 transition-deep collapsed sub elevator",
        "safeOpacity": 0.30,
        "scaleRange": [1.2, 1.9],
        "parallaxRange": [0.075, 0.15],
        "readabilityRisk": "medium",
        "lane": "mid",
    },
    {
        "id": "phase8-transition-rib-field",
        "filename": "water9-phase8-transition-rib-field.png",
        "label": "Phase 8 transition-deep whale-bone industrial rib field",
        "safeOpacity": 0.26,
        "scaleRange": [1.22, 1.96],
        "parallaxRange": [0.04, 0.085],
        "readabilityRisk": "low",
        "lane": "far",
    },
    {
        "id": "phase8-transition-pipe-cathedral",
        "filename": "water9-phase8-transition-pipe-cathedral.png",
        "label": "Phase 8 transition-deep broken pipe cathedral",
        "safeOpacity": 0.32,
        "scaleRange": [1.18, 1.86],
        "parallaxRange": [0.12, 0.21],
        "readabilityRisk": "medium",
        "lane": "near",
    },
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    return image, ImageDraw.Draw(image, "RGBA")


def soften(image: Image.Image, radius: float = 0.35) -> Image.Image:
    return image.filter(ImageFilter.GaussianBlur(radius))


def rim(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], width: int = 3, alpha: int = 92) -> None:
    draw.line(points, fill=(102, 156, 180, alpha), width=width, joint="curve")
    draw.line([(x + 2, y - 2) for x, y in points], fill=(185, 220, 218, max(28, alpha // 3)), width=max(1, width - 1), joint="curve")


def bubbles(draw: ImageDraw.ImageDraw, positions: list[tuple[int, int, int]]) -> None:
    for x, y, r in positions:
        draw.ellipse((x - r, y - r, x + r, y + r), outline=(124, 170, 180, 46), width=1)


def drowned_mining_gantry(path: Path) -> None:
    image, draw = canvas((860, 420))
    draw.polygon([(70, 330), (790, 346), (742, 386), (34, 370)], fill=(3, 12, 24, 160))
    rim(draw, [(92, 328), (778, 342)], 7, 116)
    for x in [125, 230, 362, 512, 660, 746]:
        draw.polygon([(x - 22, 342), (x + 19, 345), (x + 62, 76), (x + 28, 72)], fill=(5, 18, 35, 148))
        rim(draw, [(x + 42, 82), (x - 2, 342)], 3, 84)
    for x0, x1 in [(92, 245), (245, 410), (410, 590), (590, 782)]:
        draw.line([(x0, 324), (x1, 96)], fill=(12, 36, 62, 126), width=5)
        draw.line([(x0, 112), (x1, 330)], fill=(12, 36, 62, 108), width=4)
    draw.rectangle((112, 82, 760, 118), fill=(3, 14, 29, 160))
    rim(draw, [(118, 82), (752, 116)], 5, 96)
    draw.ellipse((348, 42, 454, 112), fill=(5, 22, 42, 132), outline=(111, 154, 170, 58), width=4)
    draw.line([(402, 112), (420, 238), (394, 298)], fill=(72, 114, 135, 96), width=4)
    draw.rectangle((368, 292, 444, 356), fill=(2, 9, 20, 150), outline=(86, 126, 146, 54), width=3)
    bubbles(draw, [(502, 78, 5), (538, 63, 3), (578, 96, 4)])
    soften(image).save(path)


def reef_arch(path: Path) -> None:
    image, draw = canvas((820, 420))
    draw.ellipse((62, 58, 758, 650), fill=(4, 21, 33, 132))
    draw.ellipse((196, 128, 642, 610), fill=(0, 0, 0, 0))
    draw.polygon([(80, 350), (230, 376), (260, 250), (202, 116), (118, 170)], fill=(4, 18, 28, 164))
    draw.polygon([(588, 372), (744, 350), (684, 152), (606, 118), (548, 260)], fill=(4, 18, 28, 164))
    for i in range(18):
        a = math.radians(206 + i * 7.4)
        x = 410 + math.cos(a) * 286
        y = 344 + math.sin(a) * 260
        draw.ellipse((x - 24, y - 15, x + 34, y + 18), fill=(11, 42, 53, 92))
    rim(draw, [(120, 170), (190, 92), (314, 58), (484, 62), (636, 120), (728, 320)], 5, 72)
    for x in [172, 214, 612, 660]:
        draw.line([(x, 190), (x + 18, 350)], fill=(48, 92, 86, 68), width=3)
    bubbles(draw, [(340, 98, 4), (370, 82, 3), (502, 94, 5)])
    soften(image, 0.55).save(path)


def cable_buoy_chain(path: Path) -> None:
    image, draw = canvas((760, 390))
    points = []
    for i in range(13):
        t = i / 12
        points.append((64 + t * 642, 120 + math.sin(t * math.tau * 1.45) * 80 + t * 98))
    draw.line(points, fill=(20, 58, 80, 116), width=6)
    rim(draw, points, 2, 82)
    for i, (x, y) in enumerate(points):
        draw.ellipse((x - 26, y - 14, x + 26, y + 14), outline=(126, 163, 172, 112), width=4)
        if i % 3 == 1:
            draw.ellipse((x - 18, y - 58, x + 22, y - 18), fill=(8, 31, 48, 132), outline=(143, 188, 186, 66), width=2)
            draw.line([(x + 3, y - 18), (x, y - 2)], fill=(93, 131, 142, 72), width=2)
    draw.polygon([(36, 280), (166, 248), (186, 312), (72, 338)], fill=(3, 14, 28, 116))
    draw.polygon([(596, 92), (716, 118), (666, 180), (560, 154)], fill=(3, 14, 28, 116))
    bubbles(draw, [(622, 78, 3), (642, 62, 3), (250, 84, 4), (282, 64, 2)])
    soften(image, 0.25).save(path)


def brine_curtain(path: Path) -> None:
    image, draw = canvas((820, 430))
    draw.rectangle((96, 66, 742, 104), fill=(4, 16, 29, 150))
    rim(draw, [(102, 66), (732, 102)], 4, 88)
    for x in [120, 232, 366, 500, 650, 730]:
        draw.polygon([(x - 20, 94), (x + 18, 96), (x + 36, 360), (x - 44, 352)], fill=(2, 9, 18, 118))
        rim(draw, [(x, 104), (x - 10, 352)], 2, 58)
    for i in range(23):
        x = 118 + i * 28
        drift = math.sin(i * 1.9) * 18
        draw.line([(x, 98), (x + drift, 382)], fill=(120, 135, 104, 44 + (i % 4) * 10), width=2 + (i % 3 == 0))
        draw.ellipse((x + drift - 18, 358, x + drift + 22, 396), fill=(68, 74, 44, 18))
    draw.ellipse((146, 314, 714, 454), fill=(4, 11, 18, 76))
    soften(image, 0.6).save(path)


def vent_lattice(path: Path) -> None:
    image, draw = canvas((780, 410))
    for x in [106, 208, 318, 462, 592, 690]:
        draw.polygon([(x - 34, 360), (x + 34, 360), (x + 18, 118), (x - 16, 128)], fill=(3, 12, 24, 138))
        rim(draw, [(x - 8, 132), (x - 20, 356)], 2, 68)
    for y in [146, 210, 274, 330]:
        draw.line([(84, y), (708, y + math.sin(y) * 8)], fill=(12, 40, 60, 114), width=5)
    for i in range(8):
        x = 90 + i * 82
        draw.arc((x - 64, 88, x + 70, 250), 212, 326, fill=(88, 132, 142, 72), width=4)
    for i in range(7):
        x = 128 + i * 88
        draw.ellipse((x - 20, 300, x + 34, 390), fill=(2, 8, 16, 116), outline=(96, 136, 134, 42), width=2)
        draw.line([(x + 7, 298), (x - 18, 242)], fill=(206, 136, 78, 38), width=2)
    soften(image, 0.45).save(path)


def collapsed_sub_elevator(path: Path) -> None:
    image, draw = canvas((840, 430))
    draw.polygon([(150, 94), (540, 152), (512, 332), (104, 292)], fill=(4, 14, 27, 154))
    draw.polygon([(548, 162), (718, 214), (664, 360), (512, 334)], fill=(3, 11, 22, 130))
    rim(draw, [(150, 94), (540, 152), (718, 214)], 5, 86)
    rim(draw, [(104, 292), (512, 332), (664, 360)], 4, 72)
    for i in range(6):
        x = 174 + i * 58
        draw.rectangle((x, 140 + i * 6, x + 34, 228 + i * 5), fill=(1, 7, 16, 100), outline=(84, 121, 140, 48), width=2)
    draw.ellipse((572, 214, 652, 300), fill=(2, 8, 18, 126), outline=(111, 152, 160, 58), width=3)
    for i in range(5):
        draw.line([(98 + i * 22, 288), (64 + i * 15, 386)], fill=(20, 54, 74, 78), width=3)
    bubbles(draw, [(696, 180, 4), (728, 160, 2), (708, 136, 3)])
    soften(image, 0.45).save(path)


def rib_field(path: Path) -> None:
    image, draw = canvas((860, 390))
    draw.polygon([(46, 322), (814, 318), (832, 368), (34, 366)], fill=(2, 9, 18, 132))
    for i in range(12):
        x = 82 + i * 64
        h = 170 + (i % 4) * 26
        draw.arc((x - 48, 300 - h, x + 66, 344), 246, 56, fill=(105, 138, 137, 112), width=7)
        draw.arc((x - 32, 318 - h, x + 48, 334), 246, 54, fill=(196, 211, 190, 42), width=2)
        draw.line([(x + 8, 315), (x + 22, 180 + (i % 5) * 20)], fill=(22, 54, 68, 74), width=3)
    draw.line([(52, 322), (818, 318)], fill=(97, 126, 122, 76), width=5)
    bubbles(draw, [(410, 86, 3), (448, 70, 2), (716, 96, 4)])
    soften(image, 0.45).save(path)


def pipe_cathedral(path: Path) -> None:
    image, draw = canvas((820, 430))
    for i, x in enumerate([92, 190, 298, 420, 552, 682]):
        w = 44 + (i % 3) * 12
        draw.rounded_rectangle((x - w, 58 + (i % 2) * 28, x + w, 384), radius=24, fill=(3, 13, 26, 150), outline=(86, 128, 145, 58), width=3)
        draw.ellipse((x - w + 8, 72 + (i % 2) * 28, x + w - 8, 126 + (i % 2) * 28), fill=(2, 8, 17, 158))
        rim(draw, [(x - w + 5, 92), (x - w + 20, 374)], 2, 58)
    for y in [164, 246, 326]:
        draw.line([(62, y), (738, y + math.sin(y * 0.1) * 16)], fill=(12, 38, 58, 108), width=8)
    for i in range(9):
        x = 70 + i * 82
        draw.line([(x, 92), (x + 24, 384)], fill=(125, 158, 150, 34), width=2)
    bubbles(draw, [(154, 42, 4), (176, 30, 2), (594, 72, 3), (622, 52, 2)])
    soften(image, 0.38).save(path)


DRAWERS: dict[str, Callable[[Path], None]] = {
    "phase8-transition-drowned-mining-gantry": drowned_mining_gantry,
    "phase8-transition-reef-arch-remnant": reef_arch,
    "phase8-transition-cable-buoy-chain": cable_buoy_chain,
    "phase8-transition-brine-curtain-ruin": brine_curtain,
    "phase8-transition-trench-vent-lattice": vent_lattice,
    "phase8-transition-collapsed-sub-elevator": collapsed_sub_elevator,
    "phase8-transition-rib-field": rib_field,
    "phase8-transition-pipe-cathedral": pipe_cathedral,
}


def entry(asset: dict[str, Any]) -> dict[str, Any]:
    path = OUT_DIR / asset["filename"]
    with Image.open(path) as image:
        size = list(image.size)
    return {
        "id": asset["id"],
        "role": "landmark",
        "band": "transitionDeep",
        "label": asset["label"],
        "repeatMode": "anchor",
        "path": rel(path),
        "status": "ready",
        "safeOpacity": asset["safeOpacity"],
        "scaleRange": asset["scaleRange"],
        "parallaxRange": asset["parallaxRange"],
        "readabilityRisk": asset["readabilityRisk"],
        "size": size,
        "authoredPhase": 8,
        "depthLane": asset["lane"],
        "notes": "Phase 8 painterly transition-deep swim-by landmark with recognizable underwater place identity and authored light-response silhouettes.",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for asset in LANDMARKS:
        DRAWERS[asset["id"]](OUT_DIR / asset["filename"])

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    phase8_ids = {asset["id"] for asset in LANDMARKS}
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in phase8_ids]
    manifest["assets"].extend(entry(asset) for asset in LANDMARKS)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = manifest.setdefault("notes", [])
    note = "Phase 8 restores recognizable painterly transition-deep swim-by landmarks while preserving Phase 7 far/mid/near atmosphere."
    if note not in notes:
        notes.append(note)
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "manifest": rel(MANIFEST),
        "generated": [rel(OUT_DIR / asset["filename"]) for asset in LANDMARKS],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
