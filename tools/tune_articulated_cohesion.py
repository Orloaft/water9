#!/usr/bin/env python3
"""Tune articulated creature manifests toward cohesive organic segmentation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public/assets/generated"
RUNTIME_MANIFEST = GENERATED / "articulated-creatures.parts.json"
SOURCE_MANIFESTS = {
    "abyssal-serpent": GENERATED / "fauna-abyssal-serpent-mantle-horror.articulated.json",
    "abyssal-gulper": GENERATED / "fauna-abyssal-gulper.articulated.json",
}

SERPENT_REST_OFFSETS = {
    "tail": [28, 10],
    "body-3": [34, 0],
    "body-2": [36, 0],
    "head": [-18, 0],
}

SERPENT_MOTION = {
    "tail": {"amplitude": 8.6, "frequency": 2.2, "phase": 1.25, "lag": 1.12},
    "body-3": {"amplitude": 4.8, "frequency": 1.95, "phase": 0.9, "lag": 0.72},
    "body-2": {"amplitude": 3.8, "frequency": 1.85, "phase": 0.52, "lag": 0.45},
    "body-1": {"amplitude": 2.2, "frequency": 1.65, "phase": 0.18, "lag": 0.18},
}

GULPER_REST_OFFSETS = {
    "tail": [12, 0],
    "tail-base": [10, 0],
    "body-3": [9, 0],
    "body-2": [7, 0],
    "head": [-6, 0],
    "jaw": [-4, -2],
}

SOCKET_STYLE = {
    "abyssal-serpent": {
        "alpha": 0.64,
        "bridgeColor": 0x071018,
        "bridgeAlpha": 0.22,
        "bridgeStunnedAlpha": 0.12,
        "bridgeCoreColor": 0x607f96,
        "bridgeCoreAlpha": 0.09,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 0.98,
        "bridgeSleeveScale": 0.36,
    },
    "abyssal-gulper": {
        "alpha": 0.54,
        "bridgeColor": 0x05090f,
        "bridgeAlpha": 0.22,
        "bridgeStunnedAlpha": 0.11,
        "bridgeCoreColor": 0x8ea8b8,
        "bridgeCoreAlpha": 0.085,
        "bridgeCoreStunnedAlpha": 0.05,
        "bridgeWidthScale": 1.02,
        "bridgeSleeveScale": 0.34,
    },
}

OVERLAY_STYLE: dict[str, dict[str, dict[str, Any]]] = {
    "abyssal-serpent": {
        "tail-socket": {"alpha": 0.64, "bridgeAlpha": 0.22, "bridgeWidthScale": 1.1, "bridgeSleeveScale": 0.48},
        "body-3-socket": {"alpha": 0.66, "bridgeAlpha": 0.23, "bridgeWidthScale": 1.02, "bridgeSleeveScale": 0.36},
        "body-2-socket": {"alpha": 0.66, "bridgeAlpha": 0.23, "bridgeWidthScale": 1.02, "bridgeSleeveScale": 0.38},
        "fin-back-socket": {"alpha": 0.58, "bridgeAlpha": 0.22, "bridgeWidthScale": 1.0, "bridgeSleeveScale": 0.34},
        "head-socket": {"alpha": 0.64, "bridgeAlpha": 0.24, "bridgeWidthScale": 1.04, "bridgeSleeveScale": 0.44},
        "jaw-socket": {"alpha": 0.56, "bridgeAlpha": 0.25, "bridgeWidthScale": 1.08, "bridgeSleeveScale": 0.5},
        "fin-front-socket": {"alpha": 0.58, "bridgeAlpha": 0.22, "bridgeWidthScale": 1.0, "bridgeSleeveScale": 0.34},
    },
    "abyssal-gulper": {
        "tail-socket": {"alpha": 0.54, "bridgeAlpha": 0.22, "bridgeWidthScale": 1.1, "bridgeSleeveScale": 0.46},
        "tail-base-socket": {"alpha": 0.56, "bridgeAlpha": 0.23, "bridgeWidthScale": 1.08, "bridgeSleeveScale": 0.42},
        "body-3-socket": {"alpha": 0.58, "bridgeAlpha": 0.23, "bridgeWidthScale": 1.02, "bridgeSleeveScale": 0.34},
        "body-2-socket": {"alpha": 0.58, "bridgeAlpha": 0.23, "bridgeWidthScale": 1.02, "bridgeSleeveScale": 0.36},
        "head-socket": {"alpha": 0.56, "bridgeAlpha": 0.24, "bridgeWidthScale": 1.04, "bridgeSleeveScale": 0.42},
        "jaw-socket": {"alpha": 0.5, "bridgeAlpha": 0.24, "bridgeWidthScale": 1.02, "bridgeSleeveScale": 0.46},
    },
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(f"{json.dumps(data, indent=2)}\n")


def part_by_id(creature: dict[str, Any], part_id: str) -> dict[str, Any] | None:
    return next((part for part in creature.get("parts", []) if part.get("id") == part_id), None)


def sync_source_socket_style(source: dict[str, Any], creature_id: str) -> None:
    source["socketStyle"] = SOCKET_STYLE[creature_id]
    overlay_styles = OVERLAY_STYLE[creature_id]
    for overlay in source.get("socketOverlays", []):
        style = overlay_styles.get(overlay.get("id"))
        if not style:
            continue
        overlay.update(style)
        overlay.setdefault("alphaFeather", {"all": 7, "curve": 1.5})
        overlay["socketProcess"] = f"deterministic organic socket occlusion:{overlay['id']}"


def tune_runtime_creature(creature: dict[str, Any]) -> int:
    creature_id = creature.get("id")
    if creature_id not in SOURCE_MANIFESTS:
        return 0
    changed = 0
    creature["socketStyle"] = SOCKET_STYLE[creature_id]

    if creature_id == "abyssal-serpent":
        for part_id, rest_offset in SERPENT_REST_OFFSETS.items():
            part = part_by_id(creature, part_id)
            if part:
                part["restOffset"] = rest_offset
                changed += 1
        for part_id, motion_values in SERPENT_MOTION.items():
            part = part_by_id(creature, part_id)
            if part and isinstance(part.get("motion"), dict):
                part["motion"].update(motion_values)
                changed += 1
    elif creature_id == "abyssal-gulper":
        for part_id, rest_offset in GULPER_REST_OFFSETS.items():
            part = part_by_id(creature, part_id)
            if part:
                part["restOffset"] = rest_offset
                changed += 1

    overlay_styles = OVERLAY_STYLE[creature_id]
    for overlay in creature.get("socketOverlays", []):
        style = overlay_styles.get(overlay.get("id"))
        if not style:
            continue
        overlay.update(style)
        changed += 1
    return changed


def append_note(source: dict[str, Any]) -> None:
    sentence = (
        "Cohesion tuning pass reduces hinged spine motion and regenerates brighter feathered organic socket sleeves "
        "so legacy rigs read closer to Crownmaw-style segmented anatomy."
    )
    notes = str(source.get("notes") or "").strip()
    if sentence not in notes:
        source["notes"] = f"{notes} {sentence}".strip()


def main() -> int:
    runtime = read_json(RUNTIME_MANIFEST)
    changed = 0
    for creature in runtime.get("creatures", []):
        changed += tune_runtime_creature(creature)
        creature_id = creature.get("id")
        if creature_id in SOURCE_MANIFESTS:
            source_path = SOURCE_MANIFESTS[creature_id]
            source = read_json(source_path)
            sync_source_socket_style(source, creature_id)
            append_note(source)
            write_json(source_path, source)
    write_json(RUNTIME_MANIFEST, runtime)
    print(f"Tuned {changed} articulated cohesion manifest entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
