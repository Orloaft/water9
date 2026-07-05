from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public/assets/generated/background-phase3"
MANIFEST_PATH = OUT_DIR / "background-phase3.manifest.json"


def rgba(hex_color: str, alpha: int) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16), alpha)


def soften(image: Image.Image, radius: float = 1.1) -> Image.Image:
    glow = image.filter(ImageFilter.GaussianBlur(radius))
    return Image.alpha_composite(glow, image)


def save_landmark(name: str, draw_fn: Callable[[ImageDraw.ImageDraw], None], size: tuple[int, int] = (960, 520)) -> None:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    draw_fn(draw)
    soften(image).save(OUT_DIR / f"water9-biome-landmark-{name}.png")


def shallow_shell_survey(draw: ImageDraw.ImageDraw) -> None:
    for offset, alpha in [(0, 95), (18, 62), (36, 42)]:
        draw.arc((90 + offset, 210 - offset, 410 + offset, 520), 184, 346, fill=rgba("#8ccfc0", alpha), width=22)
        draw.arc((510 - offset, 172 + offset, 860 - offset, 502), 188, 350, fill=rgba("#79b8ac", alpha), width=18)
    for i in range(9):
        x = 130 + i * 74
        y = 330 + (i % 3) * 19
        draw.ellipse((x, y, x + 52, y + 24), fill=rgba("#b6ded2", 34), outline=rgba("#e0fff1", 56), width=2)
    draw.line((575, 132, 760, 196, 742, 324, 554, 280, 575, 132), fill=rgba("#9fc3c5", 72), width=10)
    draw.line((598, 152, 720, 198, 704, 288, 582, 260), fill=rgba("#d9faf1", 46), width=5)
    draw.line((648, 166, 636, 278), fill=rgba("#d9faf1", 38), width=4)
    draw.line((565, 114, 610, 152), fill=rgba("#d9faf1", 46), width=5)


def brine_vent_cluster_field(draw: ImageDraw.ImageDraw) -> None:
    dark = "#02090b"
    steel = "#082022"
    rim = "#f0bd73"
    glow = "#ffe7a6"

    clusters = [
        {"cx": 210, "base": 496, "height": 310, "scale": 0.74, "derrick": True},
        {"cx": 520, "base": 470, "height": 500, "scale": 1.0, "derrick": False},
        {"cx": 810, "base": 508, "height": 360, "scale": 0.82, "derrick": True},
    ]
    for index, cluster in enumerate(clusters):
        cx = int(cluster["cx"])
        base = int(cluster["base"])
        height = int(cluster["height"])
        scale = float(cluster["scale"])
        pod_w = int(116 * scale)
        pod_h = int(34 * scale)
        draw.ellipse((cx - pod_w, base - pod_h, cx + pod_w, base + pod_h), fill=rgba(dark, 128), outline=rgba(rim, 112), width=max(3, int(5 * scale)))
        tower_specs = [(-62, 0.62, 28), (-22, 0.92, 38), (28, 0.76, 26), (70, 0.52, 20)]
        if index == 1:
            tower_specs.extend([(-96, 0.48, 22), (104, 0.66, 24)])
        for offset, height_scale, width in tower_specs:
            top = base - int(height * height_scale)
            x = cx + int(offset * scale)
            w = max(10, int(width * scale))
            draw.rounded_rectangle((x - w // 2, top, x + w // 2, base - int(18 * scale)), radius=max(6, w // 3), fill=rgba(rim, 204))
            draw.rounded_rectangle((x + w // 8, top + 12, x + w // 3, base - int(28 * scale)), radius=4, fill=rgba(glow, 112))
            draw.arc((x - w, top - 22, x + w, top + 16), 190, 350, fill=rgba(glow, 92), width=max(3, int(5 * scale)))
            draw.line((x, top - 6, x + int((offset % 3 - 1) * 28 * scale), top - int(86 * scale)), fill=rgba(glow, 68), width=max(3, int(4 * scale)))
        if cluster["derrick"]:
            lean = -1 if index == 0 else 1
            mast_top = base - int(height * 0.92)
            draw.line((cx - int(86 * scale), base, cx + lean * int(24 * scale), mast_top), fill=rgba(steel, 220), width=max(9, int(16 * scale)))
            draw.line((cx + int(86 * scale), base, cx + lean * int(24 * scale), mast_top), fill=rgba(steel, 196), width=max(8, int(14 * scale)))
            for j in range(4):
                y = base - int((j + 1) * height * 0.17)
                draw.line((cx - int(62 * scale), y, cx + int(60 * scale), y - int(32 * scale)), fill=rgba(rim, 112), width=max(5, int(8 * scale)))

    # Short diagonal fragments imply broken infrastructure without making a horizon.
    for x0, y0, x1, y1, width, alpha in [
        (286, 436, 414, 324, 11, 132),
        (596, 292, 712, 232, 9, 116),
        (728, 462, 910, 330, 10, 128),
    ]:
        draw.line((x0, y0, x1, y1), fill=rgba(steel, alpha), width=width)
        draw.line((x0 + 3, y0 - 5, x1 + 3, y1 - 5), fill=rgba(rim, 56), width=max(3, width // 3))


def midnight_coral_ribs(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(44, 514), (142, 424), (252, 456), (356, 396), (488, 438), (620, 384), (774, 430), (914, 388), (950, 520)], fill=rgba("#03101a", 112))
    draw.line((44, 514, 142, 424, 252, 456, 356, 396, 488, 438, 620, 384, 774, 430, 914, 388), fill=rgba("#1e596b", 58), width=8)

    for x, h, tilt, width in [(94, 470, -30, 34), (198, 520, 22, 42), (318, 444, -18, 30), (646, 506, -10, 40), (768, 468, 30, 34), (874, 414, -24, 28)]:
        draw.line((x, 508, x + tilt, 508 - h), fill=rgba("#020911", 224), width=width)
        draw.line((x + 6, 500, x + tilt + 8, 526 - h), fill=rgba("#185568", 116), width=max(6, width // 4))
        for j in range(6):
            y = 468 - j * h / 7
            arm = (j % 2 * 2 - 1) * (72 + (j % 3) * 28)
            bx = x + tilt * j / 7
            draw.line((bx, y, bx + arm, y - 54 - j * 5), fill=rgba("#03101a", 204), width=12)
            draw.line((bx + 2, y - 5, bx + arm, y - 60 - j * 5), fill=rgba("#2b7890", 86), width=4)

    for x in [412, 488, 566]:
        draw.ellipse((x - 42, 318, x + 42, 404), fill=rgba("#174254", 128), outline=rgba("#89dfe0", 118), width=7)
        draw.ellipse((x - 22, 338, x + 22, 382), fill=rgba("#71cbd1", 78))
        draw.line((x, 402, x - 34, 500), fill=rgba("#0f3548", 156), width=9)

    for i in range(17):
        x = 330 + i * 20
        y = 62 + (i % 5) * 12
        draw.ellipse((x - 3, y, x + 13, y + 18), fill=rgba("#a4fff0", 86))
        draw.line((x + 5, y + 18, x + 1, 292), fill=rgba("#2f6c80", 92), width=5)
    for x in [260, 704]:
        draw.arc((x - 76, 152, x + 76, 452), 76, 284, fill=rgba("#061a28", 162), width=12)
        draw.arc((x - 112, 106, x + 112, 492), 70, 288, fill=rgba("#2b7890", 60), width=5)


def ruin_vault_causeway(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse((324, 70, 662, 410), outline=rgba("#a7d8e5", 92), width=26)
    draw.ellipse((394, 138, 592, 342), outline=rgba("#536f82", 90), width=14)
    draw.rectangle((184, 118, 238, 448), fill=rgba("#26364a", 132))
    draw.polygon([(170, 118), (254, 118), (234, 62), (194, 62)], fill=rgba("#5a7186", 96))
    draw.rectangle((742, 152, 790, 458), fill=rgba("#223348", 126))
    draw.polygon([(720, 152), (810, 152), (786, 88), (746, 88)], fill=rgba("#638094", 82))
    for i in range(7):
        x = 244 + i * 70
        draw.line((x, 407 + i % 2 * 16, x + 112, 366 - i % 2 * 20), fill=rgba("#718ca0", 82), width=13)
        draw.line((x + 16, 432 + i % 2 * 14, x + 128, 390 - i % 2 * 18), fill=rgba("#243448", 128), width=18)
    for i in range(5):
        x = 472 + i * 34
        draw.line((x, 172, x + 68, 304), fill=rgba("#77c8d6", 42), width=5)
        draw.line((x + 68, 172, x, 304), fill=rgba("#77c8d6", 34), width=4)


LANDMARKS = [
    {
        "id": "biome-shallows-shell-survey-terrace",
        "label": "Biome 1 shell fossil terrace and drowned survey frame",
        "band": "upper",
        "name": "shallows-shell-survey-terrace",
        "safeOpacity": 0.18,
        "scaleRange": [1.08, 1.72],
        "parallaxRange": [0.055, 0.13],
        "size": [960, 520],
        "draw": shallow_shell_survey,
        "notes": "First-pass biome landmark for The Shallows: shell/fossil terraces with a small drowned survey frame, kept soft and background-only.",
    },
    {
        "id": "biome-brine-vent-cluster-field",
        "label": "Biome 2 separated brine chimney and extractor cluster field",
        "band": "mid",
        "name": "brine-vent-cluster-field",
        "safeOpacity": 0.62,
        "scaleRange": [1.18, 1.78],
        "parallaxRange": [0.06, 0.13],
        "size": [960, 520],
        "draw": brine_vent_cluster_field,
        "notes": "Biome 2 rejection follow-up: the broad shelf composition is retired in favor of separated vertical chimney/extractor clusters with dark negative space between pods.",
    },
    {
        "id": "biome-midnight-black-coral-ribs",
        "label": "Biome 3 black coral gates pressure ribs lantern pit",
        "band": "lower",
        "name": "midnight-black-coral-ribs",
        "safeOpacity": 0.32,
        "scaleRange": [1.16, 2.0],
        "parallaxRange": [0.038, 0.09],
        "size": [960, 520],
        "draw": midnight_coral_ribs,
        "notes": "Biome landmark parity pass for Midnight Trench: high-contrast black coral gates, pressure ribs, lantern pits, abyss shelf, and siphonophore-chain curtains.",
    },
    {
        "id": "biome-ruins-vault-causeway-lattice",
        "label": "Biome 4 vault aperture broken causeway alloy lattice",
        "band": "lower",
        "name": "ruins-vault-causeway-lattice",
        "safeOpacity": 0.3,
        "scaleRange": [1.1, 1.82],
        "parallaxRange": [0.035, 0.085],
        "size": [960, 520],
        "draw": ruin_vault_causeway,
        "notes": "First-pass biome landmark for Ancient Ruins: vault aperture, obelisks, broken causeway, and alloy lattice.",
    },
]


def manifest_entry(item: dict) -> dict:
    return {
        "id": item["id"],
        "role": "landmark",
        "band": item["band"],
        "label": item["label"],
        "repeatMode": "anchor",
        "path": f"public/assets/generated/background-phase3/water9-biome-landmark-{item['name']}.png",
        "status": "ready",
        "safeOpacity": item["safeOpacity"],
        "scaleRange": item["scaleRange"],
        "parallaxRange": item["parallaxRange"],
        "readabilityRisk": "medium",
        "size": item["size"],
        "authoredPhase": 12,
        "biomeLandmark": True,
        "notes": item["notes"],
    }


def update_manifest() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    obsolete_ids = {"biome-brine-vent-sulfide-shelf"}
    ids = {item["id"] for item in LANDMARKS} | obsolete_ids
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("id") not in ids]
    insert_at = next(
        (index for index, asset in enumerate(manifest["assets"]) if asset.get("role") == "textureMask"),
        len(manifest["assets"]),
    )
    for offset, item in enumerate(LANDMARKS):
        manifest["assets"].insert(insert_at + offset, manifest_entry(item))
    note = "Biome 2 rejection follow-up retires the broad Brine Vent Shelf landmark and replaces it with separated vertical cluster-field composition."
    notes = manifest.setdefault("notes", [])
    if note not in notes:
        notes.append(note)
    retired_note = "Biome landmark parity pass strengthens Brine Vent Shelf and Midnight Trench authored cutouts while keeping runtime selection biome-scoped."
    manifest["notes"] = [existing for existing in notes if existing != retired_note]
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for item in LANDMARKS:
        save_landmark(item["name"], item["draw"], tuple(item["size"]))
    update_manifest()


if __name__ == "__main__":
    main()
