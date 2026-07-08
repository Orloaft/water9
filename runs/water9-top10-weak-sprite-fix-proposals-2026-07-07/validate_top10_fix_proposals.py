#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / "runs/water9-top10-weak-sprite-fix-proposals-2026-07-07"
TOP10 = [
    "biolume-rock-0",
    "biolume-rock-1",
    "fauna-abyss-goblin-shark",
    "fauna-deep-barreleye",
    "fauna-deep-gulper-eel",
    "fauna-abyss-black-swallower",
    "fauna-abyss-frilled-shark",
    "fauna-abyss-snipe-eel",
    "fauna-deep-sea-spider",
    "fauna-shallow-lantern-fry",
]


def check_png(path: Path) -> tuple[int, int]:
    if not path.exists():
        raise AssertionError(f"missing PNG: {path}")
    im = Image.open(path)
    im.verify()
    im = Image.open(path).convert("RGBA")
    if im.width <= 0 or im.height <= 0:
        raise AssertionError(f"zero-sized PNG: {path}")
    if im.getchannel("A").getextrema()[1] == 0:
        raise AssertionError(f"empty alpha PNG: {path}")
    return im.size


def main():
    report = json.loads((RUN / "fix-proposals.json").read_text())
    proposals = report["proposals"]
    if sorted(proposals.keys()) != sorted(TOP10):
        raise AssertionError("proposal keys do not match top 10")
    for key in TOP10:
        paths = proposals[key]["candidatePaths"]
        if not paths:
            raise AssertionError(f"no candidate paths for {key}")
        for rel in paths:
            check_png(ROOT / rel)
    check_png(RUN / "top10-fix-candidates-contact.png")
    check_png(RUN / "top10-fix-candidates-contact-gray.png")
    check_png(RUN / "runtime-preview/top10-depth-band-preview.png")
    json.loads((RUN / "fix-proposals.json").read_text())
    print("validated 10 proposals, candidate PNGs, contact sheets, runtime preview, and JSON parse")


if __name__ == "__main__":
    main()
