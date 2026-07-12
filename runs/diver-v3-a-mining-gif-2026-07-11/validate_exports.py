#!/usr/bin/env python3
"""Validate live/run bitmap identity, alpha, registration, and authored-left proof."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
RUN = Path(__file__).resolve().parent
RUNTIME = RUN / "artifacts/runtime"
PUBLIC = ROOT / "public/assets/generated"
OUT = RUN / "artifacts/spec/export-validation.json"

results = []
failures = []
for index in range(10, 14):
    right_path = RUNTIME / f"diver-v3-refined-mining-r-{index}.png"
    left_path = RUNTIME / f"diver-v3-refined-mining-l-{index}.png"
    right = Image.open(right_path).convert("RGBA")
    left = Image.open(left_path).convert("RGBA")
    raw_mirror = ImageOps.mirror(right)
    right_np = np.asarray(right)
    left_np = np.asarray(left)
    mirror_np = np.asarray(raw_mirror)
    alpha_match = np.array_equal(left_np[:, :, 3], mirror_np[:, :, 3])
    authored_rgb_difference = int(np.count_nonzero(np.any(left_np[:, :, :3] != mirror_np[:, :, :3], axis=2) & (left_np[:, :, 3] > 0)))
    frame = {
        "index": index,
        "pivot": [64, 52],
        "rightBounds": list(right.getchannel("A").getbbox()),
        "leftBounds": list(left.getchannel("A").getbbox()),
        "alphaValues": sorted(set(right_np[:, :, 3].ravel().tolist()) | set(left_np[:, :, 3].ravel().tolist())),
        "transparentRgbZero": bool(np.all(right_np[right_np[:, :, 3] == 0, :3] == 0) and np.all(left_np[left_np[:, :, 3] == 0, :3] == 0)),
        "leftAlphaMatchesMirror": bool(alpha_match),
        "authoredLeftRgbDifferencePixels": authored_rgb_difference,
        "files": {},
    }
    for facing, run_path in (("r", right_path), ("l", left_path)):
        public_path = PUBLIC / run_path.name
        run_bytes = run_path.read_bytes(); public_bytes = public_path.read_bytes()
        frame["files"][facing] = {
            "bytes": len(run_bytes), "sha256": hashlib.sha256(run_bytes).hexdigest(),
            "publicRunExact": run_bytes == public_bytes,
        }
        if run_bytes != public_bytes:
            failures.append(f"public/run mismatch: {run_path.name}")
    if right.size != (128, 96) or left.size != (128, 96): failures.append(f"bad dimensions: {index}")
    if frame["alphaValues"] != [0, 255]: failures.append(f"non-binary alpha: {index}")
    if not frame["transparentRgbZero"]: failures.append(f"dirty transparent RGB: {index}")
    if not alpha_match: failures.append(f"left alpha registration mismatch: {index}")
    if authored_rgb_difference < 100: failures.append(f"left is too close to raw RGB mirror: {index}")
    results.append(frame)

for a, b in zip(results, results[1:]):
    ia = Image.open(RUNTIME / f"diver-v3-refined-mining-r-{a['index']}.png")
    ib = Image.open(RUNTIME / f"diver-v3-refined-mining-r-{b['index']}.png")
    if np.array_equal(np.asarray(ia), np.asarray(ib)):
        failures.append(f"adjacent drawings identical: {a['index']}->{b['index']}")

payload = {"status": "PASS" if not failures else "FAIL", "cellSize": [128, 96], "pivot": [64, 52], "frames": results, "failures": failures}
OUT.write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps({"status": payload["status"], "frames": len(results), "failures": failures, "authoredLeftDiffRange": [min(x["authoredLeftRgbDifferencePixels"] for x in results), max(x["authoredLeftRgbDifferencePixels"] for x in results)]}))
raise SystemExit(1 if failures else 0)
