#!/usr/bin/env python3
"""Add repeatable damage-state art declarations to legacy articulated creatures."""

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
    "abyssal-crownmaw": GENERATED / "fauna-abyssal-crownmaw.articulated.json",
}
ARTICULATED_IDS = set(SOURCE_MANIFESTS)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(f"{json.dumps(data, indent=2)}\n")


def find_one(items: list[dict[str, Any]], key: str, value: str) -> dict[str, Any] | None:
    return next((item for item in items if item.get(key) == value), None)


def add_damaged_part(runtime_creature: dict[str, Any], source_manifest: dict[str, Any], part_id: str) -> bool:
    runtime_part = find_one(runtime_creature.get("parts", []), "id", part_id)
    source_part = find_one(source_manifest.get("parts", []), "id", part_id)
    if runtime_part and not source_part:
        source_part = find_one(source_manifest.get("parts", []), "src", runtime_part.get("texture", ""))
    if not runtime_part or not source_part:
        return False

    base_key = runtime_part["textureKey"]
    base_texture = Path(runtime_part["texture"]).stem
    damaged_key = f"{base_key}-damaged"
    damaged_texture = f"{base_texture}-damaged.png"
    runtime_part["damagedTextureKey"] = damaged_key
    runtime_part["damagedTexture"] = damaged_texture
    source_part["damagedSrc"] = damaged_texture
    source_part["damagedKey"] = damaged_key
    source_part["damagedProcess"] = "deterministic dark wound and crack overlay"
    return True


def add_severed_overlays(runtime_creature: dict[str, Any], source_manifest: dict[str, Any]) -> int:
    runtime_parts = {part["id"]: part for part in runtime_creature.get("parts", [])}
    source_overlays = {overlay["id"]: overlay for overlay in source_manifest.get("socketOverlays", [])}
    count = 0

    for runtime_overlay in runtime_creature.get("socketOverlays", []):
        child = runtime_parts.get(runtime_overlay.get("childId"))
        if not child or child.get("anatomy", {}).get("severable") is not True:
            continue
        source_overlay = source_overlays.get(runtime_overlay["id"])
        if not source_overlay:
            continue
        base_key = runtime_overlay["textureKey"]
        base_texture = Path(runtime_overlay["texture"]).stem
        severed_key = base_key.replace("-socket", "-wound")
        if severed_key == base_key:
            severed_key = f"{base_key}-wound"
        severed_texture = f"{base_texture.replace('-socket', '-wound')}.png"
        if severed_texture == runtime_overlay["texture"]:
            severed_texture = f"{base_texture}-wound.png"

        runtime_overlay["severedTextureKey"] = severed_key
        runtime_overlay["severedTexture"] = severed_texture
        source_overlay["severedSrc"] = severed_texture
        source_overlay["severedKey"] = severed_key
        source_overlay["severedProcess"] = f"deterministic sever wound overlay:{runtime_overlay['id']}"
        count += 1
    return count


def append_note(source_manifest: dict[str, Any], sentence: str) -> None:
    existing = str(source_manifest.get("notes") or "").strip()
    if sentence in existing:
        return
    source_manifest["notes"] = f"{existing} {sentence}".strip()


def main() -> int:
    runtime = read_json(RUNTIME_MANIFEST)
    changed = 0
    for creature in runtime.get("creatures", []):
        creature_id = creature.get("id")
        if creature_id not in ARTICULATED_IDS:
            continue
        source_path = SOURCE_MANIFESTS[creature_id]
        source_manifest = read_json(source_path)
        if add_damaged_part(creature, source_manifest, "body-2"):
            changed += 1
        changed += add_severed_overlays(creature, source_manifest)
        append_note(
            source_manifest,
            "Damage parity pass adds deterministic cripple wounds and severed socket stump declarations so damage states read like organic segmented creatures instead of disappearing parts.",
        )
        write_json(source_path, source_manifest)

    write_json(RUNTIME_MANIFEST, runtime)
    print(f"Updated {changed} legacy articulated damage declarations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
