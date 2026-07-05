#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


REPO = Path(__file__).resolve().parents[1]
OUT_DIR = Path(os.environ.get("ORE_ACTUAL_GPT_OUT", "/home/orlovboros/projects/manager/runs/water9-ore-glyph-removal-and-sprite-pass-2026-07-01"))
TS_OUT = REPO / "src" / "ore-actual-gpt-stamps.ts"
PUBLIC_ASSET_DIR = REPO / "public" / "assets" / "generated"

LEGACY_SOURCE = Path(os.environ.get(
    "ORE_ACTUAL_GPT_SOURCE",
    "/home/orlovboros/.openclaw/agents/manager/agent/codex-home/generated_images/019f1bde-73e4-7070-a9db-81ba77385a4d/ig_0ab372f7a52f3227016a4493e16c848193a8ce03fd0881696f.png",
))
NEW_SOURCE_A = Path(os.environ.get(
    "ORE_ACTUAL_GPT_SOURCE_A",
    "/home/orlovboros/projects/manager/runs/water9-ore-glyph-removal-and-sprite-pass-2026-07-01/source-sheet-quartz-cobalt-sunstone-relic.png",
))
NEW_SOURCE_B = Path(os.environ.get(
    "ORE_ACTUAL_GPT_SOURCE_B",
    "/home/orlovboros/projects/manager/runs/water9-ore-glyph-removal-and-sprite-pass-2026-07-01/source-sheet-artifact-ores.png",
))

TILES = [
    ("copper", "Copper", LEGACY_SOURCE, 0, "black", 72),
    ("ruby", "Ruby", LEGACY_SOURCE, 1, "black", 58),
    ("precursorEngine", "Precursor Engine", LEGACY_SOURCE, 2, "black", 78),
    ("quartz", "Quartz", NEW_SOURCE_A, 0, "magenta", 70),
    ("cobalt", "Cobalt Bloom", NEW_SOURCE_A, 1, "magenta", 70),
    ("sunstone", "Sunstone", NEW_SOURCE_A, 2, "magenta", 70),
    ("relic", "Relic Shard", NEW_SOURCE_A, 3, "magenta", 74),
    ("drownedIdol", "Drowned Idol", NEW_SOURCE_B, 0, "magenta", 76),
    ("abyssalCrown", "Abyssal Crown", NEW_SOURCE_B, 1, "magenta", 76),
    ("alienAlloy", "Alien Alloy", NEW_SOURCE_B, 2, "magenta", 76),
    ("ruinCore", "Ruin Core", NEW_SOURCE_B, 3, "magenta", 78),
]


def file_sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_magenta(pixel: tuple[int, int, int], tolerance: int = 54) -> bool:
    r, g, b = pixel
    return r > 185 and b > 170 and g < 95 and abs(r - b) < tolerance


def foreground_mask(pixel: tuple[int, int, int], mode: str) -> bool:
    r, g, b = pixel
    if mode == "magenta":
        return not is_magenta(pixel)
    luma = r * 0.2126 + g * 0.7152 + b * 0.0722
    chroma = max(r, g, b) - min(r, g, b)
    return luma > 15 or (luma > 8 and chroma > 18)


def bbox_for(image: Image.Image, mode: str) -> tuple[int, int, int, int]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    xs: list[int] = []
    ys: list[int] = []
    px = rgb.load()
    for y in range(height):
        for x in range(width):
            if foreground_mask(px[x, y], mode):
                xs.append(x)
                ys.append(y)
    if not xs:
        return (0, 0, width, height)
    pad = 8
    return (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(width, max(xs) + pad + 1),
        min(height, max(ys) + pad + 1),
    )


def keyed_crop(cell: Image.Image, mode: str) -> Image.Image:
    crop = cell.crop(bbox_for(cell, mode)).convert("RGBA")
    data = []
    for r, g, b, _a in crop.getdata():
        if not foreground_mask((r, g, b), mode):
            data.append((0, 0, 0, 0))
            continue
        if mode == "magenta":
            # Feather edge pixels that are close to the chroma key while
            # keeping the saturated generated art fully opaque.
            magenta_distance = abs(r - 255) + g + abs(b - 255)
            alpha = 255 if magenta_distance > 120 else max(0, min(255, int(magenta_distance * 2.1)))
            data.append((r, g, b, alpha))
            continue
        luma = r * 0.2126 + g * 0.7152 + b * 0.0722
        chroma = max(r, g, b) - min(r, g, b)
        alpha = max(72, int((luma - 4) * 5.4), int(chroma * 3.4))
        data.append((r, g, b, max(0, min(255, alpha))))
    crop.putdata(data)
    return crop


def fit_paste(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int], checker: bool = False) -> None:
    x0, y0, x1, y1 = box
    width = x1 - x0
    height = y1 - y0
    draw = ImageDraw.Draw(canvas)
    if checker:
        for y in range(y0, y1, 8):
            for x in range(x0, x1, 8):
                c = (31, 39, 43, 255) if ((x // 8 + y // 8) & 1) else (10, 16, 19, 255)
                draw.rectangle((x, y, x + 7, y + 7), fill=c)
    else:
        draw.rectangle((x0, y0, x1, y1), fill=(0, 0, 0, 255))
    scale = min(width / image.width, height / image.height, 1.0)
    resized = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (x0 + (width - resized.width) // 2, y0 + (height - resized.height) // 2))


def make_contact_sheet(crops: dict[str, list[Image.Image]], filename: str, checker: bool) -> None:
    cell_w, cell_h = 170, 124
    left = 170
    sheet = Image.new("RGBA", (left + cell_w * 5, cell_h * len(TILES)), (5, 9, 12, 255))
    draw = ImageDraw.Draw(sheet)
    for row, (tile, label, *_rest) in enumerate(TILES):
        draw.text((16, row * cell_h + 18), label, fill=(231, 242, 245, 255))
        for col, crop in enumerate(crops[tile]):
            x = left + col * cell_w
            y = row * cell_h
            draw.rectangle((x + 7, y + 7, x + cell_w - 7, y + cell_h - 7), outline=(42, 64, 73, 255))
            fit_paste(sheet, crop, (x + 12, y + 12, x + cell_w - 12, y + cell_h - 12), checker=checker)
    sheet.convert("RGB").save(OUT_DIR / filename)


def sample_stamp(crop: Image.Image, limit: int) -> list[tuple[int, int, int, int, int]]:
    rgba = crop.convert("RGBA")
    width, height = rgba.size
    px = rgba.load()
    block = max(2, int(math.sqrt(width * height / max(1, limit * 2.2))))
    samples: list[tuple[float, int, int, int, int, int, int]] = []
    for y in range(0, height, block):
        for x in range(0, width, block):
            rs = gs = bs = aa = count = 0
            for yy in range(y, min(height, y + block)):
                for xx in range(x, min(width, x + block)):
                    r, g, b, a = px[xx, yy]
                    if a < 24:
                        continue
                    rs += r * a
                    gs += g * a
                    bs += b * a
                    aa += a
                    count += 1
            if not count or aa <= 0:
                continue
            r = int(rs / aa)
            g = int(gs / aa)
            b = int(bs / aa)
            alpha = min(255, int(aa / count))
            luma = r * 0.2126 + g * 0.7152 + b * 0.0722
            chroma = max(r, g, b) - min(r, g, b)
            score = luma + chroma * 0.7 + alpha * 0.45
            nx = int(round(((x + block * 0.5) / width - 0.5) * 200))
            ny = int(round(((y + block * 0.5) / height - 0.5) * 200))
            size = max(1, min(8, int(round(block * 1.15))))
            color = (r << 16) | (g << 8) | b
            samples.append((score, nx, ny, size, color, alpha, count))
    samples.sort(reverse=True)
    picked = samples[:limit]
    picked.sort(key=lambda item: (item[2], item[1]))
    return [(nx, ny, size, color, alpha) for _score, nx, ny, size, color, alpha, _count in picked]


def source_hash() -> str:
    h = hashlib.sha256()
    for source in [LEGACY_SOURCE, NEW_SOURCE_A, NEW_SOURCE_B]:
        h.update(file_sha(source).encode("ascii"))
    return h.hexdigest()


def write_ts(crops: dict[str, list[Image.Image]]) -> None:
    tile_union = " | ".join(f"'{tile}'" for tile, *_rest in TILES)
    lines = [
        f"export type ActualGptOreTile = {tile_union};",
        "export type ActualGptOreSample = readonly [x: number, y: number, size: number, color: number, alpha: number];",
        "export interface ActualGptOreStamp {",
        "  readonly assetKey: string;",
        "  readonly width: number;",
        "  readonly height: number;",
        "  readonly samples: readonly ActualGptOreSample[];",
        "}",
        "",
        f"export const ACTUAL_GPT_ORE_SOURCE_SHA256 = '{source_hash()}';",
        "",
        "export const ACTUAL_GPT_ORE_STAMPS: Record<ActualGptOreTile, readonly ActualGptOreStamp[]> = {",
    ]
    for tile, _label, _source, _row, _mode, limit in TILES:
        lines.append(f"  {tile}: [")
        for index, crop in enumerate(crops[tile], start=1):
            samples = sample_stamp(crop, limit)
            sample_text = ", ".join(f"[{x},{y},{size},0x{color:06x},{alpha}]" for x, y, size, color, alpha in samples)
            lines.append(f"    {{ assetKey: 'ore-actual-gpt-{tile}-{index}', width: {crop.width}, height: {crop.height}, samples: [{sample_text}] }},")
        lines.append("  ],")
    lines.append("};")
    lines.append("")
    TS_OUT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    for source in [LEGACY_SOURCE, NEW_SOURCE_A, NEW_SOURCE_B]:
        if not source.exists():
            raise SystemExit(f"SOURCE_ASSET_MISSING: {source}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(LEGACY_SOURCE, OUT_DIR / "source-sheet-copper-ruby-precursorEngine.png")

    opened: dict[Path, Image.Image] = {}
    crops: dict[str, list[Image.Image]] = {}
    metrics: dict[str, object] = {}
    for tile, label, source_path, row, mode, _limit in TILES:
        source = opened.setdefault(source_path, Image.open(source_path).convert("RGB"))
        cell_w = source.width // 5
        row_count = 3 if source_path == LEGACY_SOURCE else 4
        cell_h = source.height // row_count
        crops[tile] = []
        metrics[tile] = []
        for col in range(5):
            cell = source.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            crop = keyed_crop(cell, mode)
            crops[tile].append(crop)
            crop.save(OUT_DIR / f"source-crop-{tile}-{col + 1}.png")
            crop.save(OUT_DIR / f"extracted-stamp-{tile}-{col + 1}.png")
            crop.save(PUBLIC_ASSET_DIR / f"ore-actual-gpt-{tile}-{col + 1}.png")
            metrics[tile].append({"label": label, "column": col + 1, "width": crop.width, "height": crop.height})

    make_contact_sheet(crops, "source-crops-contact-sheet.png", checker=False)
    make_contact_sheet(crops, "extracted-stamps-contact-sheet.png", checker=True)
    write_ts(crops)

    (OUT_DIR / "source-selection.md").write_text(
        "\n".join([
            "# Source Selection",
            "",
            f"Legacy copper/ruby/precursor sheet: `{LEGACY_SOURCE}`",
            f"Quartz/cobalt/sunstone/relic sheet: `{NEW_SOURCE_A}`",
            f"Artifact ore sheet: `{NEW_SOURCE_B}`",
            "",
            "All sheets were converted into transparent PNG stamp variants and sampled into `src/ore-actual-gpt-stamps.ts` for the live renderer.",
            "",
        ]),
        encoding="utf-8",
    )
    (OUT_DIR / "actual-gpt-extraction-metrics.json").write_text(
        json.dumps({"sources": [str(LEGACY_SOURCE), str(NEW_SOURCE_A), str(NEW_SOURCE_B)], "sha256": source_hash(), "metrics": metrics}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"sources": [str(LEGACY_SOURCE), str(NEW_SOURCE_A), str(NEW_SOURCE_B)], "sha256": source_hash(), "tsOut": str(TS_OUT)}, indent=2))


if __name__ == "__main__":
    main()
