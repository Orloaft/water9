#!/usr/bin/env python3
"""Prepare Water9 Phase 3 painterly background source assets.

This tool is intentionally narrow: it records the expected generated-source
atlas path and, when present, slices that atlas into the five runtime band
plates used by the Phase 3 background lane. It can also convert a generated
#ff00ff chroma-key landmark atlas into transparent cutout PNGs and slice a
generated grayscale atmospheric mask atlas into runtime mask PNGs.
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "tools/source-inbox/water9-phase3-band-plate-atlas.png"
DEFAULT_LANDMARK_SOURCE = ROOT / "tools/source-inbox/water9-phase3-landmark-cutout-atlas-chromakey.png"
LANDMARK_SOURCE_GLOB = "water9-phase3-landmark-cutout-atlas-chromakey*.png"
DEFAULT_MASK_SOURCE = ROOT / "tools/source-inbox/water9-phase3-atmospheric-mask-atlas.png"
MASK_SOURCE_GLOB = "water9-phase3-atmospheric-mask-atlas*.png"
DEFAULT_OUT_DIR = ROOT / "public/assets/generated/background-phase3"
DEFAULT_MANIFEST = DEFAULT_OUT_DIR / "background-phase3.manifest.json"

BANDS = [
    {
        "id": "surface",
        "filename": "water9-phase3-band-surface.png",
        "label": "surface underside shimmer",
        "safeOpacity": 0.48,
        "parallaxRange": [0.0, 0.03],
        "scaleRange": [1.0, 1.08],
        "readabilityRisk": "low",
    },
    {
        "id": "upper",
        "filename": "water9-phase3-band-upper.png",
        "label": "upper water reef distance",
        "safeOpacity": 0.42,
        "parallaxRange": [0.0, 0.04],
        "scaleRange": [1.0, 1.1],
        "readabilityRisk": "low",
    },
    {
        "id": "mid",
        "filename": "water9-phase3-band-mid.png",
        "label": "mid blue-green industrial reef haze",
        "safeOpacity": 0.36,
        "parallaxRange": [0.01, 0.06],
        "scaleRange": [1.0, 1.12],
        "readabilityRisk": "medium",
    },
    {
        "id": "lower",
        "filename": "water9-phase3-band-lower.png",
        "label": "lower cold quiet silhouettes",
        "safeOpacity": 0.32,
        "parallaxRange": [0.01, 0.05],
        "scaleRange": [1.0, 1.12],
        "readabilityRisk": "medium",
    },
    {
        "id": "transitionDeep",
        "filename": "water9-phase3-band-transition-deep.png",
        "label": "transition-deep pressure handoff",
        "safeOpacity": 0.30,
        "parallaxRange": [0.0, 0.04],
        "scaleRange": [1.0, 1.1],
        "readabilityRisk": "medium",
    },
]

EXPECTED_LANDMARKS = [
    {
        "id": "kelp-curtain-cluster",
        "filename": "water9-phase3-landmark-kelp-curtain-cluster.png",
        "safeOpacity": 0.14,
    },
    {
        "id": "drowned-mine-structure",
        "filename": "water9-phase3-landmark-drowned-mine-structure.png",
        "safeOpacity": 0.12,
    },
    {
        "id": "reef-arch-distance",
        "filename": "water9-phase3-landmark-reef-arch-distance.png",
        "safeOpacity": 0.16,
    },
    {
        "id": "cable-buoy-chain",
        "filename": "water9-phase3-landmark-cable-buoy-chain.png",
        "safeOpacity": 0.10,
    },
    {
        "id": "vent-brine-curtain",
        "filename": "water9-phase3-landmark-vent-brine-curtain.png",
        "safeOpacity": 0.11,
    },
]

LANDMARK_GRID2X5_CELLS = {
    "kelp-curtain-cluster": (0, 0),
    "drowned-mine-structure": (0, 2),
    "reef-arch-distance": (1, 0),
    "cable-buoy-chain": (1, 2),
    "vent-brine-curtain": (1, 3),
}

EXPECTED_MASKS = [
    ("sediment-flecks", "water9-phase3-mask-sediment-flecks.png", 0.08),
    ("broad-fog-mottle", "water9-phase3-mask-broad-fog-mottle.png", 0.10),
    ("soft-caustic-ribbons", "water9-phase3-mask-soft-caustic-ribbons.png", 0.08),
    ("plankton-speckle", "water9-phase3-mask-plankton-speckle.png", 0.06),
    ("lamp-scattering-bloom", "water9-phase3-mask-lamp-scattering-bloom.png", 0.07),
]


def rel(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_landmark_source(requested: Path) -> Path:
    if requested.exists() or requested != DEFAULT_LANDMARK_SOURCE.resolve():
        return requested
    candidates = sorted(requested.parent.glob(LANDMARK_SOURCE_GLOB))
    return candidates[-1].resolve() if candidates else requested


def resolve_mask_source(requested: Path) -> Path:
    if requested.exists() or requested != DEFAULT_MASK_SOURCE.resolve():
        return requested
    candidates = sorted(requested.parent.glob(MASK_SOURCE_GLOB))
    return candidates[-1].resolve() if candidates else requested


def choose_layout(width: int, height: int, requested: str) -> str:
    if requested != "auto":
        return requested
    if height >= width * 2:
        return "vertical"
    if width >= height * 2:
        return "horizontal"
    return "vertical"


def choose_landmark_layout(width: int, height: int, requested: str) -> str:
    if requested != "auto":
        return requested
    if abs(width - height) <= max(width, height) * 0.1:
        return "grid2x5"
    return choose_layout(width, height, requested)


def crop_boxes(count: int, width: int, height: int, layout: str) -> list[tuple[int, int, int, int]]:
    boxes: list[tuple[int, int, int, int]] = []
    if layout == "vertical":
        for index in range(count):
            top = round(index * height / count)
            bottom = round((index + 1) * height / count)
            boxes.append((0, top, width, bottom))
    else:
        for index in range(count):
            left = round(index * width / count)
            right = round((index + 1) * width / count)
            boxes.append((left, 0, right, height))
    return boxes


def landmark_crop_boxes(width: int, height: int, layout: str) -> list[tuple[int, int, int, int]]:
    if layout != "grid2x5":
        return crop_boxes(len(EXPECTED_LANDMARKS), width, height, layout)
    column_edges = [round(index * width / 2) for index in range(3)]
    row_edges = [round(index * height / 5) for index in range(6)]
    boxes: list[tuple[int, int, int, int]] = []
    for landmark in EXPECTED_LANDMARKS:
        col, row = LANDMARK_GRID2X5_CELLS[landmark["id"]]
        boxes.append((column_edges[col], row_edges[row], column_edges[col + 1], row_edges[row + 1]))
    return boxes


def expected_entries(
    out_dir: Path,
    generated_landmarks: list[dict[str, Any]],
    generated_masks: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    generated_by_id = {item["id"]: item for item in generated_landmarks}
    generated_masks_by_id = {item["id"]: item for item in generated_masks}
    landmarks = [
        {
            "id": landmark["id"],
            "role": "landmark",
            "repeatMode": "anchor",
            "path": rel(out_dir / landmark["filename"]),
            "status": "ready" if (out_dir / landmark["filename"]).exists() else "expectedGeneratedMedia",
            "safeOpacity": landmark["safeOpacity"],
            "scaleRange": [0.85, 1.6],
            "parallaxRange": [0.05, 0.22],
            "readabilityRisk": "medium",
            **(
                {
                    "sourceCrop": generated_by_id[landmark["id"]]["sourceCrop"],
                    "trimCrop": generated_by_id[landmark["id"]]["trimCrop"],
                    "size": generated_by_id[landmark["id"]]["size"],
                    "chromaKey": generated_by_id[landmark["id"]]["chromaKey"],
                }
                if landmark["id"] in generated_by_id
                else {}
            ),
        }
        for landmark in EXPECTED_LANDMARKS
    ]
    masks = []
    for item_id, filename, safe_opacity in EXPECTED_MASKS:
        generated = generated_masks_by_id.get(item_id)
        path = out_dir / filename
        masks.append(
            {
                "id": item_id,
                "role": "textureMask",
                "repeatMode": "worldSpaceNoise",
                "path": rel(path),
                "status": "ready" if path.exists() else "expectedGeneratedMedia",
                "safeOpacity": safe_opacity,
                "scaleRange": [0.75, 1.4],
                "parallaxRange": [0.45, 0.75],
                "readabilityRisk": "low",
                **(
                    {
                        "sourceCrop": generated["sourceCrop"],
                        "size": generated["size"],
                        "colorMode": generated["colorMode"],
                    }
                    if generated
                    else {}
                ),
            }
        )
    return landmarks, masks


def build_manifest(
    source: Path,
    landmark_source: Path,
    out_dir: Path,
    manifest_path: Path,
    layout: str | None,
    source_size: tuple[int, int] | None,
    generated_bands: list[dict[str, Any]],
    landmark_layout: str | None,
    landmark_source_size: tuple[int, int] | None,
    generated_landmarks: list[dict[str, Any]],
    mask_source: Path,
    mask_layout: str | None,
    mask_source_size: tuple[int, int] | None,
    generated_masks: list[dict[str, Any]],
) -> dict[str, Any]:
    landmarks, masks = expected_entries(out_dir, generated_landmarks, generated_masks)
    expected_bands = []
    generated_by_id = {item["id"]: item for item in generated_bands}
    for band in BANDS:
        path = out_dir / band["filename"]
        generated = generated_by_id.get(band["id"])
        expected_bands.append(
            {
                "id": band["id"],
                "role": "bandPlate",
                "band": band["id"],
                "label": band["label"],
                "repeatMode": "bandClampY",
                "path": rel(path),
                "status": "ready" if path.exists() else "missingSourceAtlas",
                "safeOpacity": band["safeOpacity"],
                "scaleRange": band["scaleRange"],
                "parallaxRange": band["parallaxRange"],
                "readabilityRisk": band["readabilityRisk"],
                **({"sourceCrop": generated["sourceCrop"], "size": generated["size"]} if generated else {}),
            }
        )
    return {
        "schema": "water9/background-phase3-assets@1",
        "generatedAt": utc_now(),
        "generatedBy": rel(Path(__file__)),
        "sourceAtlas": {
            "path": rel(source),
            "status": "present" if source.exists() else "missing",
            "layout": layout,
            "size": list(source_size) if source_size else None,
            "expectedBands": [band["id"] for band in BANDS],
        },
        "landmarkSourceAtlas": {
            "path": rel(landmark_source),
            "status": "present" if landmark_source.exists() else "missing",
            "layout": landmark_layout,
            "size": list(landmark_source_size) if landmark_source_size else None,
            "expectedLandmarks": [landmark["id"] for landmark in EXPECTED_LANDMARKS],
            "chromaKey": "#ff00ff",
        },
        "maskSourceAtlas": {
            "path": rel(mask_source),
            "status": "present" if mask_source.exists() else "missing",
            "layout": mask_layout,
            "size": list(mask_source_size) if mask_source_size else None,
            "expectedMasks": [item_id for item_id, _filename, _safe_opacity in EXPECTED_MASKS],
            "unusedPanelCount": 1 if mask_layout == "grid3x2" else 0,
        },
        "outputDir": rel(out_dir),
        "manifestPath": rel(manifest_path),
        "assets": expected_bands + landmarks + masks,
        "notes": [
            "Band plates are generated only by slicing the source atlas; no fake scenic art is synthesized.",
            "Landmark entries are generated only by removing #ff00ff chroma key from a source atlas; no placeholder art is synthesized.",
            "Mask entries are generated only by slicing a grayscale source atlas; no placeholder art is synthesized.",
        ],
    }


def slice_atlas(source: Path, out_dir: Path, requested_layout: str) -> tuple[str, tuple[int, int], list[dict[str, Any]]]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    layout = choose_layout(width, height, requested_layout)
    boxes = crop_boxes(len(BANDS), width, height, layout)
    generated: list[dict[str, Any]] = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for band, box in zip(BANDS, boxes):
        crop = image.crop(box)
        out_path = out_dir / band["filename"]
        crop.save(out_path)
        generated.append(
            {
                "id": band["id"],
                "path": rel(out_path),
                "sourceCrop": list(box),
                "size": [crop.width, crop.height],
            }
        )
    return layout, (width, height), generated


def remove_magenta_key(image: Image.Image, tolerance: int) -> Image.Image:
    keyed = image.convert("RGBA")
    width, height = keyed.size
    pixels = list(keyed.getdata())
    visited: set[int] = set()
    queue: deque[tuple[int, int]] = deque()

    def is_strict_key(index: int) -> bool:
        red, green, blue, alpha = pixels[index]
        if alpha == 0:
            return True
        return red >= 255 - tolerance and green <= tolerance and blue >= 255 - tolerance

    def is_key_candidate(index: int) -> bool:
        red, green, blue, alpha = pixels[index]
        if is_strict_key(index):
            return True
        min_red_blue = max(96, 255 - tolerance * 3)
        max_green = min(160, tolerance * 4)
        max_red_blue_delta = max(48, tolerance * 3)
        return red >= min_red_blue and blue >= min_red_blue and green <= max_green and abs(red - blue) <= max_red_blue_delta

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if index not in visited and is_key_candidate(index):
            visited.add(index)
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        red, green, blue, _alpha = pixels[index]
        pixels[index] = (red, green, blue, 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    for index, (red, green, blue, alpha) in enumerate(pixels):
        if alpha != 0 and is_strict_key(index):
            pixels[index] = (red, green, blue, 0)

    keyed.putdata(pixels)
    return keyed


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def slice_landmark_atlas(
    source: Path,
    out_dir: Path,
    requested_layout: str,
    key_tolerance: int,
) -> tuple[str, tuple[int, int], list[dict[str, Any]]]:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    layout = choose_landmark_layout(width, height, requested_layout)
    boxes = landmark_crop_boxes(width, height, layout)
    generated: list[dict[str, Any]] = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for landmark, box in zip(EXPECTED_LANDMARKS, boxes):
        keyed = remove_magenta_key(image.crop(box), key_tolerance)
        trim = alpha_bbox(keyed)
        if trim:
            output_image = keyed.crop(trim)
            trim_crop = [box[0] + trim[0], box[1] + trim[1], box[0] + trim[2], box[1] + trim[3]]
        else:
            output_image = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
            trim_crop = list(box)
        out_path = out_dir / landmark["filename"]
        output_image.save(out_path)
        generated.append(
            {
                "id": landmark["id"],
                "path": rel(out_path),
                "sourceCrop": list(box),
                "trimCrop": trim_crop,
                "size": [output_image.width, output_image.height],
                "chromaKey": {"color": "#ff00ff", "tolerance": key_tolerance},
            }
        )
    return layout, (width, height), generated


def choose_mask_layout(width: int, height: int, requested: str) -> str:
    if requested != "auto":
        return requested
    if width >= height * 1.4:
        return "grid3x2"
    return choose_layout(width, height, requested)


def mask_crop_boxes(width: int, height: int, layout: str) -> list[tuple[int, int, int, int]]:
    if layout != "grid3x2":
        return crop_boxes(len(EXPECTED_MASKS), width, height, layout)
    column_edges = [round(index * width / 3) for index in range(4)]
    row_edges = [round(index * height / 2) for index in range(3)]
    boxes: list[tuple[int, int, int, int]] = []
    for index in range(len(EXPECTED_MASKS)):
        col = index % 3
        row = index // 3
        boxes.append((column_edges[col], row_edges[row], column_edges[col + 1], row_edges[row + 1]))
    return boxes


def slice_mask_atlas(source: Path, out_dir: Path, requested_layout: str) -> tuple[str, tuple[int, int], list[dict[str, Any]]]:
    image = Image.open(source).convert("L")
    width, height = image.size
    layout = choose_mask_layout(width, height, requested_layout)
    boxes = mask_crop_boxes(width, height, layout)
    generated: list[dict[str, Any]] = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for (item_id, filename, _safe_opacity), box in zip(EXPECTED_MASKS, boxes):
        crop = image.crop(box)
        out_path = out_dir / filename
        crop.save(out_path)
        generated.append(
            {
                "id": item_id,
                "path": rel(out_path),
                "sourceCrop": list(box),
                "size": [crop.width, crop.height],
                "colorMode": "L",
            }
        )
    return layout, (width, height), generated


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="source atlas PNG path")
    parser.add_argument(
        "--landmark-source",
        default=str(DEFAULT_LANDMARK_SOURCE),
        help="landmark #ff00ff chroma-key source atlas PNG path",
    )
    parser.add_argument(
        "--mask-source",
        default=str(DEFAULT_MASK_SOURCE),
        help="atmospheric grayscale mask source atlas PNG path",
    )
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="runtime asset output directory")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="asset manifest output JSON")
    parser.add_argument("--layout", choices=["auto", "vertical", "horizontal"], default="auto")
    parser.add_argument("--landmark-layout", choices=["auto", "vertical", "horizontal", "grid2x5"], default="auto")
    parser.add_argument("--mask-layout", choices=["auto", "vertical", "horizontal", "grid3x2"], default="auto")
    parser.add_argument("--key-tolerance", type=int, default=32, help="RGB tolerance for #ff00ff removal")
    parser.add_argument("--require-atlas", action="store_true", help="exit non-zero if the source atlas is missing")
    parser.add_argument(
        "--require-landmark-atlas",
        action="store_true",
        help="exit non-zero if the landmark chroma-key atlas is missing",
    )
    parser.add_argument(
        "--require-mask-atlas",
        action="store_true",
        help="exit non-zero if the atmospheric mask atlas is missing",
    )
    args = parser.parse_args()

    source = Path(args.source).resolve()
    landmark_source = resolve_landmark_source(Path(args.landmark_source).resolve())
    mask_source = resolve_mask_source(Path(args.mask_source).resolve())
    out_dir = Path(args.out_dir).resolve()
    manifest_path = Path(args.manifest).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    layout = None
    source_size = None
    generated: list[dict[str, Any]] = []
    landmark_layout = None
    landmark_source_size = None
    generated_landmarks: list[dict[str, Any]] = []
    mask_layout = None
    mask_source_size = None
    generated_masks: list[dict[str, Any]] = []

    if source.exists():
        layout, source_size, generated = slice_atlas(source, out_dir, args.layout)
        status = "ready"
    else:
        if args.require_atlas:
            raise SystemExit(f"missing source atlas: {source}")
        status = "waiting-for-atlas"

    if landmark_source.exists():
        landmark_layout, landmark_source_size, generated_landmarks = slice_landmark_atlas(
            landmark_source,
            out_dir,
            args.landmark_layout,
            args.key_tolerance,
        )
        if status == "ready":
            status = "ready"
        else:
            status = "waiting-for-band-atlas"
    elif args.require_landmark_atlas:
        raise SystemExit(f"missing landmark source atlas: {landmark_source}")

    if mask_source.exists():
        mask_layout, mask_source_size, generated_masks = slice_mask_atlas(
            mask_source,
            out_dir,
            args.mask_layout,
        )
        if status == "ready":
            status = "ready"
        elif source.exists():
            status = "waiting-for-landmark-atlas"
        else:
            status = "waiting-for-band-atlas"
    elif args.require_mask_atlas:
        raise SystemExit(f"missing mask source atlas: {mask_source}")

    manifest = build_manifest(
        source,
        landmark_source,
        out_dir,
        manifest_path,
        layout,
        source_size,
        generated,
        landmark_layout,
        landmark_source_size,
        generated_landmarks,
        mask_source,
        mask_layout,
        mask_source_size,
        generated_masks,
    )
    manifest_path.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")

    result = {
        "status": status,
        "sourceAtlas": rel(source),
        "landmarkSourceAtlas": rel(landmark_source),
        "maskSourceAtlas": rel(mask_source),
        "manifest": rel(manifest_path),
        "generatedBandPlates": [item["path"] for item in generated],
        "generatedLandmarks": [item["path"] for item in generated_landmarks],
        "generatedMasks": [item["path"] for item in generated_masks],
        "expectedBandPlates": [rel(out_dir / band["filename"]) for band in BANDS],
        "expectedLandmarks": [entry["path"] for entry in manifest["assets"] if entry["role"] == "landmark"],
        "expectedMasks": [entry["path"] for entry in manifest["assets"] if entry["role"] == "textureMask"],
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
