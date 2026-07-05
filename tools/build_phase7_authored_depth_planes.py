#!/usr/bin/env python3
"""Author Phase 7 transition-deep multi-plane background assets for Water9."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST = OUT_DIR / "background-phase3.manifest.json"
TRANSITION_BAND = OUT_DIR / "water9-phase3-band-transition-deep.png"

PLANES = [
    {
        "id": "phase7-transition-far-void-haze",
        "filename": "water9-phase7-transition-far-void-haze.png",
        "label": "Phase 7 transition-deep far void and pressure haze",
        "safeOpacity": 0.13,
        "scaleRange": [1.18, 1.55],
        "parallaxRange": [0.006, 0.018],
        "readabilityRisk": "low",
    },
    {
        "id": "phase7-transition-mid-occluding-silhouettes",
        "filename": "water9-phase7-transition-mid-occluding-silhouettes.png",
        "label": "Phase 7 transition-deep mid occluding silhouettes",
        "safeOpacity": 0.24,
        "scaleRange": [1.04, 1.36],
        "parallaxRange": [0.034, 0.075],
        "readabilityRisk": "medium",
    },
    {
        "id": "phase7-transition-near-suspended-matter",
        "filename": "water9-phase7-transition-near-suspended-matter.png",
        "label": "Phase 7 transition-deep near suspended debris and matter",
        "safeOpacity": 0.20,
        "scaleRange": [0.86, 1.18],
        "parallaxRange": [0.075, 0.145],
        "readabilityRisk": "medium",
    },
]


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def band_plate(path: Path) -> None:
    width, height = 864, 364
    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    pixels = image.load()
    for y in range(height):
        y_norm = y / max(1, height - 1)
        for x in range(width):
            x_norm = x / max(1, width - 1)
            sink = 0.5 + 0.5 * math.sin((x_norm * 1.05 + y_norm * 0.34) * math.tau + 0.8)
            diagonal = 0.5 + 0.5 * math.sin((x_norm * 1.45 + y_norm * 2.4) * math.tau)
            pocket = math.exp(-(((x_norm - 0.68) / 0.32) ** 2 + ((y_norm - 0.36) / 0.55) ** 2))
            trench = math.exp(-(((x_norm - 0.22) / 0.25) ** 2 + ((y_norm - 0.76) / 0.42) ** 2))
            value = 0.14 + 0.1 * (1 - y_norm) + 0.038 * sink + 0.028 * diagonal - 0.07 * pocket - 0.05 * trench
            r = int(max(2, min(255, 10 + value * 32)))
            g = int(max(6, min(255, 21 + value * 54)))
            b = int(max(18, min(255, 43 + value * 96)))
            pixels[x, y] = (r, g, b, 255)

    draw = ImageDraw.Draw(image, "RGBA")
    # Large soft voids and angled pressure columns break the old horizontal shelf read.
    voids = [
        (95, 80, 360, 250, (0, 2, 14, 42)),
        (430, 16, 850, 214, (2, 8, 24, 50)),
        (520, 178, 918, 398, (0, 3, 15, 58)),
        (-80, 226, 250, 420, (2, 7, 18, 38)),
    ]
    for box in voids:
        draw.ellipse(box[:4], fill=box[4])
    for i, x in enumerate([-80, 86, 244, 410, 618, 790]):
        top = 18 + (i % 3) * 34
        draw.polygon(
            [(x, height + 30), (x + 148, height + 20), (x + 58, top), (x - 38, top + 70)],
            fill=(5, 19, 38, 24 + (i % 2) * 10),
        )
    for i in range(7):
        x = 36 + i * 126
        y = 48 + (i * 67) % 210
        draw.arc((x - 70, y - 42, x + 110, y + 112), 56, 154, fill=(55, 94, 127, 15), width=2)
    Image.alpha_composite(image, Image.new("RGBA", image.size, (0, 0, 0, 0))).filter(ImageFilter.GaussianBlur(0.35)).save(path)


def far_void(path: Path) -> None:
    image = Image.new("RGBA", (900, 430), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    for box, color in [
        ((-60, 34, 270, 330), (7, 25, 54, 72)),
        ((260, 0, 610, 220), (11, 32, 64, 58)),
        ((590, 166, 960, 456), (1, 7, 22, 82)),
    ]:
        draw.ellipse(box, fill=color)
    for i in range(5):
        x = 38 + i * 172
        draw.polygon(
            [(x - 66, 408), (x + 34, 400), (x + 130, 58 + (i % 3) * 36), (x + 62, 26 + (i % 2) * 42)],
            fill=(15, 43, 78, 20),
        )
    for i in range(18):
        x = 24 + (i * 73) % 850
        y = 24 + (i * 47) % 370
        draw.ellipse((x, y, x + 42 + (i % 5) * 14, y + 10 + (i % 4) * 6), fill=(82, 119, 151, 12 + (i % 4) * 6))
    image.filter(ImageFilter.GaussianBlur(1.25)).save(path)


def mid_silhouettes(path: Path) -> None:
    image = Image.new("RGBA", (860, 390), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    for i, x in enumerate([36, 166, 314, 496, 674, 790]):
        base = 336 - (i % 3) * 18
        top = 74 + (i * 41) % 94
        lean = -46 + (i % 4) * 31
        color = (4, 15, 33, 138 + (i % 3) * 20)
        draw.polygon([(x - 34, base), (x + 54, base + 10), (x + lean + 28, top), (x + lean - 26, top + 24)], fill=color)
        draw.line([(x + lean, top + 10), (x + 18, base)], fill=(30, 66, 99, 94), width=5)
    for i in range(9):
        x = 28 + i * 102
        y = 128 + (i * 37) % 122
        draw.arc((x - 84, y - 60, x + 132, y + 92), 62, 245, fill=(27, 68, 103, 120), width=8)
        draw.arc((x - 56, y - 32, x + 102, y + 72), 64, 238, fill=(74, 112, 140, 58), width=2)
    for i in range(4):
        x = 90 + i * 190
        y = 286 - (i % 2) * 34
        draw.ellipse((x - 100, y - 18, x + 138, y + 44), fill=(3, 14, 30, 58))
    image.filter(ImageFilter.GaussianBlur(0.5)).save(path)


def near_matter(path: Path) -> None:
    image = Image.new("RGBA", (760, 360), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    for i in range(42):
        x = 20 + (i * 89) % 710
        y = 18 + (i * 61) % 316
        length = 18 + (i % 7) * 11
        alpha = 42 + (i % 5) * 18
        color = (107, 151, 175, alpha)
        draw.line([(x, y), (x + length, y - 5 + (i % 4) * 4)], fill=color, width=1 + (i % 3 == 0))
        if i % 3 == 0:
            draw.ellipse((x + length + 4, y - 6, x + length + 10, y), fill=(139, 178, 191, alpha + 18))
    for i in range(10):
        x = 44 + i * 72
        y = 92 + (i * 31) % 180
        draw.polygon(
            [(x, y), (x + 22 + (i % 3) * 10, y + 7), (x + 8, y + 26 + (i % 4) * 5), (x - 16, y + 16)],
            fill=(8, 26, 45, 72 + (i % 4) * 18),
        )
    image.filter(ImageFilter.GaussianBlur(0.22)).save(path)


DRAWERS = {
    "phase7-transition-far-void-haze": far_void,
    "phase7-transition-mid-occluding-silhouettes": mid_silhouettes,
    "phase7-transition-near-suspended-matter": near_matter,
}


def plane_entry(asset: dict[str, Any]) -> dict[str, Any]:
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
        "authoredPhase": 7,
        "notes": "Phase 7 authored transition-deep depth plane: far/mid/near underwater layering with distinct parallax.",
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    band_plate(TRANSITION_BAND)
    for asset in PLANES:
        DRAWERS[asset["id"]](OUT_DIR / asset["filename"])

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    phase7_ids = {asset["id"] for asset in PLANES}
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in phase7_ids]
    for asset in manifest["assets"]:
        if asset.get("id") == "transitionDeep":
            asset["label"] = "Phase 7 transition-deep asymmetric void field"
            asset["safeOpacity"] = 0.12
            asset["parallaxRange"] = [0.002, 0.016]
            asset["scaleRange"] = [1.04, 1.16]
            asset["authoredPhase"] = 7
            asset["notes"] = "Phase 7 replaces the horizontal shelf read with asymmetric far voids and diagonal pressure columns."
            with Image.open(TRANSITION_BAND) as image:
                asset["size"] = list(image.size)
    manifest["assets"].extend(plane_entry(asset) for asset in PLANES)
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    notes = manifest.setdefault("notes", [])
    note = "Phase 7 replaces transition-deep slab reads with authored far/mid/near underwater depth planes and visible parallax separation."
    if note not in notes:
        notes.append(note)
    MANIFEST.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    print(json.dumps({
        "manifest": rel(MANIFEST),
        "generated": [rel(TRANSITION_BAND), *[rel(OUT_DIR / asset["filename"]) for asset in PLANES]],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
