#!/usr/bin/env python3
"""Regression tests for mechanical source-image quality gates.

The source validator is allowed to be mechanical, but it must reject common
failure modes before a human can approve a source for articulation:

- flat placeholder silhouettes
- disconnected parts boards/collages
- translucent source anatomy
- magenta-key bleed inside source anatomy
- stale reports that omit detail/connectivity metrics
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path.cwd()
VALIDATOR = ROOT / "tools" / "validate_source_candidate_images.py"
GOOD_FIXTURE = ROOT / "public" / "assets" / "generated" / "fauna-brine-crown-whole-source.png"


def run_validator(image: Path, candidate_id: str, report: Path) -> tuple[int, dict]:
    result = subprocess.run(
        [
            sys.executable,
            str(VALIDATOR),
            "--image",
            str(image),
            "--id",
            candidate_id,
            "--report",
            str(report),
        ],
        cwd=ROOT,
        check=False,
        text=True,
        capture_output=True,
    )
    try:
        payload = json.loads(report.read_text())
    except Exception as exc:  # noqa: BLE001 - this is a diagnostic smoke test.
        raise AssertionError(
            f"could not read validator report for {candidate_id}: {exc}\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        ) from exc
    return result.returncode, payload


def make_flat_placeholder(path: Path) -> None:
    image = Image.new("RGBA", (256, 256), (255, 0, 255, 255))
    draw = ImageDraw.Draw(image)
    draw.ellipse((58, 82, 198, 178), fill=(18, 30, 46, 255))
    draw.polygon([(188, 130), (230, 98), (230, 162)], fill=(18, 30, 46, 255))
    draw.ellipse((92, 112, 104, 124), fill=(90, 210, 230, 255))
    image.save(path)


def make_disconnected_parts_board(path: Path) -> None:
    image = Image.new("RGBA", (320, 320), (255, 0, 255, 255))
    draw = ImageDraw.Draw(image)
    palette = [
        (22, 45, 70),
        (40, 98, 122),
        (80, 145, 150),
        (150, 210, 190),
        (230, 245, 215),
    ]
    centers = [(72, 72), (160, 72), (248, 72), (72, 160), (160, 160), (248, 160), (112, 248), (208, 248)]
    for index, (cx, cy) in enumerate(centers):
        radius = 26 + (index % 3) * 3
        for offset, color in enumerate(palette):
            inset = offset * 4
            draw.ellipse(
                (cx - radius + inset, cy - radius + inset, cx + radius - inset, cy + radius - inset),
                fill=(*color, 255),
            )
        for spoke in range(6):
            x1 = cx + ((spoke % 3) - 1) * 18
            y1 = cy + ((spoke // 3) * 2 - 1) * 16
            draw.line((cx, cy, x1, y1), fill=(225, 240, 215, 255), width=2)
    image.save(path)


def make_translucent_source_body(path: Path) -> None:
    image = Image.new("RGBA", (320, 240), (255, 0, 255, 255))
    draw = ImageDraw.Draw(image)
    for offset in range(18):
        color = (40 + offset * 6, 95 + offset * 4, 122 + offset * 3, 176)
        draw.ellipse((42 + offset * 6, 70 + offset, 238 + offset * 2, 166 - offset), fill=color)
    draw.polygon([(232, 110), (286, 84), (286, 142)], fill=(90, 145, 150, 176))
    for x in range(78, 230, 14):
        draw.line((x, 94, x + 24, 144), fill=(220, 240, 220, 170), width=2)
    image.save(path)


def make_magenta_bleed_source_body(path: Path) -> None:
    image = Image.new("RGBA", (360, 240), (255, 0, 255, 255))
    draw = ImageDraw.Draw(image)
    draw.ellipse((42, 62, 284, 174), fill=(112, 160, 154, 255), outline=(10, 34, 42, 255), width=4)
    draw.polygon([(272, 104), (326, 78), (326, 150)], fill=(82, 128, 132, 255), outline=(10, 34, 42, 255))
    draw.rectangle((90, 102, 260, 132), fill=(198, 84, 194, 255))
    for x in range(70, 260, 16):
        draw.line((x, 82, x + 30, 158), fill=(210, 236, 229, 255), width=2)
    image.save(path)


def metric_for(payload: dict) -> dict:
    metrics = payload.get("metrics") or []
    if not metrics:
        raise AssertionError(f"validator report had no metrics: {json.dumps(payload, indent=2)}")
    return metrics[0]


def assert_failure_contains(payload: dict, needle: str, label: str) -> None:
    failures = payload.get("failures") or []
    if not any(needle in failure for failure in failures):
        raise AssertionError(f"{label} did not report {needle!r}; failures were {failures}")


def main() -> int:
    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="water9-source-image-quality-") as temp_name:
        temp = Path(temp_name)

        if not GOOD_FIXTURE.is_file():
            failures.append(f"good source fixture is missing: {GOOD_FIXTURE}")
        else:
            code, payload = run_validator(GOOD_FIXTURE, "quality-good-fixture", temp / "good-report.json")
            metric = metric_for(payload)
            if code != 0:
                failures.append(f"known-good source fixture failed image validation: {payload.get('failures')}")
            if not metric.get("detail") or not metric.get("connectivity"):
                failures.append("known-good source fixture report omitted detail/connectivity metrics")

        flat = temp / "flat-placeholder.png"
        make_flat_placeholder(flat)
        code, payload = run_validator(flat, "quality-flat-placeholder", temp / "flat-report.json")
        if code == 0:
            failures.append("flat placeholder unexpectedly passed source-image validation")
        else:
            try:
                assert_failure_contains(payload, "quantized color bins", "flat placeholder")
                assert_failure_contains(payload, "color entropy", "flat placeholder")
                assert_failure_contains(payload, "edge density", "flat placeholder")
            except AssertionError as exc:
                failures.append(str(exc))

        disconnected = temp / "disconnected-parts-board.png"
        make_disconnected_parts_board(disconnected)
        code, payload = run_validator(disconnected, "quality-disconnected-parts-board", temp / "disconnected-report.json")
        if code == 0:
            failures.append("disconnected parts board unexpectedly passed source-image validation")
        else:
            try:
                assert_failure_contains(payload, "largest connected subject component", "disconnected parts board")
                assert_failure_contains(payload, "significant disconnected components", "disconnected parts board")
            except AssertionError as exc:
                failures.append(str(exc))

        translucent = temp / "translucent-source-body.png"
        make_translucent_source_body(translucent)
        code, payload = run_validator(translucent, "quality-translucent-source-body", temp / "translucent-report.json")
        if code == 0:
            failures.append("translucent source body unexpectedly passed source-image validation")
        else:
            try:
                assert_failure_contains(payload, "translucent pixels", "translucent source body")
            except AssertionError as exc:
                failures.append(str(exc))

        magenta_bleed = temp / "magenta-bleed-source-body.png"
        make_magenta_bleed_source_body(magenta_bleed)
        code, payload = run_validator(magenta_bleed, "quality-magenta-bleed-source-body", temp / "magenta-bleed-report.json")
        if code == 0:
            failures.append("magenta-bleed source body unexpectedly passed source-image validation")
        else:
            try:
                assert_failure_contains(payload, "magenta-biased colors", "magenta-bleed source body")
            except AssertionError as exc:
                failures.append(str(exc))

    summary = {
        "schema": "water9/source-image-quality-smoke@1",
        "goodFixture": str(GOOD_FIXTURE),
        "failures": failures,
    }
    if failures:
        print(json.dumps(summary, indent=2), file=sys.stderr)
        return 1
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
