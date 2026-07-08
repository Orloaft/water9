# Worker Prompt: Flora Inventory

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are the read-only inventory lane for Water9, repo `/mnt/nxt-dev/water9`. Current known HEAD from manager preflight is `03b2dad`.

Goal: identify every active scannable flora species/asset and every decorative flora family that appears to be non-scannable, then explain the runtime/code distinction between them.

Context:
- Alex says older scannable flora looked good as standalone static images but poor in-game.
- Later decorative flora was accidentally non-scannable, but visually fits the game much better.
- We need to use that decorative look as the style guide before producing replacement flora assets.
- The repo starts dirty from a prior approved scan-reward implementation; do not edit source and do not stage/commit.

Scope:
- Read source, manifests, and generated asset metadata only.
- Do not modify `src/`, `tools/`, `public/`, or existing asset files.
- You may create/update only `runs/water9-flora-style-guide-audit-2026-07-06/inventory.md` and optional JSON under that same run directory.

Questions to answer:
1. List active scannable flora species by biome, including species name, hazardous/rare flags, scan rarity/reward if easy to derive, and runtime asset key/path.
2. Identify older/static flora assets still active as scannables, especially `env-flora-*`, `flora-*`, and any biolume/oxygen flora.
3. Identify decorative non-scannable flora assets and placement code paths, especially `terrain-edge-flora-*`, `terrain-stamp-plant-*`, `terrain-brush-flora-*`, and related stamp pools.
4. Explain why each decorative family is non-scannable in runtime terms: prop kind only, terrain stamp, edge accent, background/detail, absent from scan target lists, etc.
5. Name any ambiguous cases where an asset visually reads as flora but is actually fauna, hazard, ore, or background.
6. Produce a candidate "decorative style benchmark" shortlist with exact asset keys and why they are promising.

Useful starting points:
- `src/content.ts`
- `src/helpers.ts`
- `src/types.ts`
- `src/scene-*.ts`
- `public/assets/generated/small-life.manifest.json`
- `public/assets/generated/terrain-edge-flora-*.png`
- `public/assets/generated/terrain-stamp-plant-*.png`
- `public/assets/generated/terrain-brush-flora-*.png`
- `tools/build_terrain_brush_assets.py`
- `tools/build_terrain_material_stamp_assets.py`
- `tools/build_terrain_edge_accent_assets.py`

Return artifact:
- Write `runs/water9-flora-style-guide-audit-2026-07-06/inventory.md`.
- Include a short verdict at the top, then evidence with file/line references.
- Include exact asset keys/paths, not just broad families.

Verification:
- Report `git status --short` and confirm source files were not edited.

Return block:
- Status
- Report path
- Top 5 decorative benchmark candidates
- Caveats/blockers

