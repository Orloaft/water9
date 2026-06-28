#!/usr/bin/env python3
"""Validate Water9 small-life runtime assets against the generated manifest."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path.cwd()
GENERATED = ROOT / "public/assets/generated"
MANIFEST = GENERATED / "small-life.manifest.json"
FOCUSED_FAUNA = {
    "fauna-abyss-hatchet-school",
    "fauna-abyss-lantern-swarm",
    "fauna-abyss-static-fry",
    "fauna-abyss-microfish",
}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def alpha_stats(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    nonzero = sum(1 for value in alpha.getdata() if value > 0)
    width, height = image.size
    if not bbox:
        return {
            "size": [width, height],
            "bbox": None,
            "coverage": 0,
            "margins": [width, height, width, height],
        }
    left, top, right, bottom = bbox
    return {
        "size": [width, height],
        "bbox": [left, top, right, bottom],
        "coverage": nonzero / (width * height),
        "margins": [left, top, width - right, height - bottom],
    }


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate() -> tuple[list[str], list[str], dict[str, object]]:
    errors: list[str] = []
    warnings: list[str] = []
    subprocess.run(["node", "tools/build_small_life_manifest.mjs", "--check"], cwd=ROOT, check=True)
    manifest = json.loads(MANIFEST.read_text())
    seen_assets: set[str] = set()
    stats: dict[str, object] = {"entries": len(manifest["entries"]), "assets": {}}
    for entry in manifest["entries"]:
        key = entry["assetKey"]
        seen_assets.add(key)
        asset = entry["asset"]
        image_path = ROOT / asset["imagePath"]
        if not image_path.exists():
            fail(errors, f"{key}: missing image {rel(image_path)}")
            continue
        asset_stats = alpha_stats(image_path)
        stats["assets"][key] = asset_stats
        coverage = float(asset_stats["coverage"])
        min_coverage = float(asset["minimumCoverage"])
        if coverage < min_coverage:
            fail(errors, f"{key}: coverage {coverage:.4f} below manifest minimum {min_coverage:.4f}")
        bbox = asset_stats["bbox"]
        if bbox is None:
            fail(errors, f"{key}: image has no readable nontransparent pixels")
        margins = asset_stats["margins"]
        min_margin = int(asset["minimumEdgeMarginPx"])
        if any(margin < min_margin for margin in margins):
            if entry["kind"] == "flora" and min(margins) == 0:
                warnings.append(f"{key}: touches image edge; root-origin metadata should justify this before strict validation")
            else:
                fail(errors, f"{key}: margins {margins} below minimum {min_margin}px")
        if entry["kind"] != "fauna":
            continue
        frames_manifest_path = ROOT / asset["framesManifest"]
        if not frames_manifest_path.exists():
            fail(errors, f"{key}: missing frames manifest {rel(frames_manifest_path)}")
            continue
        frames_manifest = json.loads(frames_manifest_path.read_text())
        for field in ["frameWidth", "frameHeight", "frameCount", "anchor"]:
            if frames_manifest.get(field) != asset.get(field):
                fail(errors, f"{key}: {field} drift between manifest and frames manifest")
        sheet = Image.open(image_path).convert("RGBA")
        expected_size = (frames_manifest["frameWidth"] * frames_manifest["frameCount"], frames_manifest["frameHeight"])
        if sheet.size != expected_size:
            fail(errors, f"{key}: sheet size {sheet.size} does not match packed frame geometry {expected_size}")
        frame_coverages = []
        frame_bboxes = []
        for index in range(frames_manifest["frameCount"]):
            loose_path = GENERATED / f"{key}-{index}.png"
            if not loose_path.exists():
                fail(errors, f"{key}: missing loose source frame {rel(loose_path)}")
                continue
            loose = Image.open(loose_path).convert("RGBA")
            if loose.size != (frames_manifest["frameWidth"], frames_manifest["frameHeight"]):
                fail(errors, f"{key}: loose frame {index} size {loose.size} does not match manifest cell")
            loose_stats = alpha_stats(loose_path)
            frame_coverages.append(float(loose_stats["coverage"]))
            frame_bboxes.append(loose_stats["bbox"])
            if key in FOCUSED_FAUNA and loose_stats["bbox"] is None:
                fail(errors, f"{key}: focused frame {index} is unreadable/empty")
        if key in FOCUSED_FAUNA:
            if frame_coverages and min(frame_coverages) < min_coverage:
                fail(errors, f"{key}: focused frame coverage min {min(frame_coverages):.4f} below {min_coverage:.4f}")
            if frame_bboxes:
                widths = [bbox[2] - bbox[0] for bbox in frame_bboxes if bbox]
                heights = [bbox[3] - bbox[1] for bbox in frame_bboxes if bbox]
                if min(widths, default=0) < frames_manifest["frameWidth"] * 0.42:
                    fail(errors, f"{key}: focused frame bbox width too sparse for runtime school silhouette")
                if min(heights, default=0) < frames_manifest["frameHeight"] * 0.35:
                    fail(errors, f"{key}: focused frame bbox height too sparse for runtime school silhouette")
        if asset["looseFramePolicy"] == "legacy-tolerated":
            warnings.append(f"{key}: loose frames are tolerated legacy beside packed runtime sheet")
    for key in ["flora-oxygen-kelp", "flora-oxygen-bulb", "biolume-rock-0", "biolume-rock-1", "biolume-crystal"]:
        if key not in seen_assets:
            fail(errors, f"{key}: special biolume runtime asset missing from manifest")
    return errors, warnings, stats


def main() -> int:
    try:
        errors, warnings, stats = validate()
    except subprocess.CalledProcessError as exc:
        print(f"small-life validation failed while checking manifest: {exc}", file=sys.stderr)
        return exc.returncode or 1
    report_path = Path("/home/orlovboros/projects/manager/runs/water9-small-life-fixes-2026-06-28-validation.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps({"errors": errors, "warnings": warnings, "stats": stats}, indent=2) + "\n")
    for warning in warnings[:8]:
        print(f"warning: {warning}")
    if len(warnings) > 8:
        print(f"warning: {len(warnings) - 8} additional legacy warnings written to {report_path}")
    if errors:
        print(f"small-life validation failed with {len(errors)} error(s); see {report_path}", file=sys.stderr)
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"small-life validation passed ({stats['entries']} manifest entries); report {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
