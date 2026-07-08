# Fauna/Flora Procedural Quality Cleanup

- Session key: `fauna-flora-procedural-quality-cleanup-audit-repair`
- Preflight HEAD: `03b2dad`
- Repo: `/mnt/nxt-dev/water9`
- Status: complete with blocked queue

## Dirty Start

The worktree was already dirty before this pass. Pre-existing dirt included:

- Modified runtime/code files: `package.json`, `src/helpers.ts`, `src/scene-worldgen.ts`, `src/scene-sandbox.ts`, `src/scene-rendering.ts`, `src/scene-entities.ts`, `src/types.ts`, and other gameplay/progression files.
- Modified generated fauna assets: `public/assets/generated/fauna-abyss-goblin-shark*`.
- Untracked previous pass tools/assets/runs, including `tools/build_flora_slice_assets.py`, `tools/build_curated_fauna_pass_assets.py`, `tools/audit_curated_fauna_flora_assets.mjs`, `tools/test_flora_scannability_audit.mjs`, `public/assets/generated/terrain-edge-flora-*.png`, `public/assets/generated/fauna-abyss-mantle-crawler*`, and several `runs/water9-*-2026-07-06*` outputs.

I did not revert or stage unrelated dirty state.

## Inventory

Required inventory written:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/procedural-quality-inventory.json`

Inventory totals:

- Total runtime fauna/flora asset keys inventoried: 167
- Fauna: 137
- Flora: 30
- `source_sheet_slice`: 21
- `derived_from_existing_bitmap`: 106
- `procedural_drawn_png`: 11
- `unknown_provenance`: 29
- Offenders: 48
- Blocked assets requiring source/provenance repair: 40

The audit now fails on procedural drawn PNGs, generic fallback/placeholder key families, missing runtime PNGs, untracked runtime assets, and unknown provenance. Current audit result is intentionally failing because the remaining blocked queue is real.

## Repairs

Repaired the complete known `tools/build_flora_slice_assets.py` output set by replacing each runtime PNG with an existing source-sheet-derived environment flora bitmap under the same runtime key:

- `terrain-edge-flora-moon-sponge` <- byte-identical copy of `env-flora-moon-sponge.png`
- `terrain-edge-flora-sting-anemone` <- byte-identical copy of `env-flora-sting-anemone.png`
- `terrain-edge-flora-vent-coral` <- byte-identical copy of `env-flora-vent-coral.png`
- `terrain-edge-flora-ember-bloom` <- byte-identical copy of `env-flora-ember-bloom.png`

After repair these classify as `derived_from_existing_bitmap`, not `procedural_drawn_png`. They still carry `runtime_untracked` until the runtime PNGs are committed/tracked.

Hardened audit:

- `tools/audit_curated_fauna_flora_assets.mjs`

## Proof

Normal-play `#game canvas` proof from actual Water9 runtime was captured on port 5180. Proof report:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/normal-play-repaired-flora-proof.json`

Color canvas captures:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-moon-sponge.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-sting-anemone.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-vent-coral.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-ember-bloom.png`

Grayscale canvas captures:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-moon-sponge-grayscale.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-surface-flora-sting-anemone-grayscale.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-vent-coral-grayscale.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/canvas-mid-flora-ember-bloom-grayscale.png`

Viewport/HUD context captures:

- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-surface-flora-moon-sponge.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-surface-flora-sting-anemone.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-mid-flora-vent-coral.png`
- `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/viewport-mid-flora-ember-bloom.png`

Proof harness result: `ok: true`, 4 captures, 0 failures.

## Top Offenders

Highest severity offenders from the new gate:

- `fauna-deep-gulper-eel` | `unknown_provenance` | `public/assets/generated/fauna-deep-gulper-eel.png` | required by last proof pass
- `fauna-shallow-lantern-fry` | `unknown_provenance` | `public/assets/generated/fauna-shallow-lantern-fry.png` | required by last proof pass
- `biolume-crystal` | `procedural_drawn_png` | `public/assets/generated/biolume-crystal.png` | special-room Lumen Nodule
- `biolume-rock-0` | `procedural_drawn_png` | `public/assets/generated/biolume-rock-0.png` | special-room Lumen Nodule
- `biolume-rock-1` | `procedural_drawn_png` | `public/assets/generated/biolume-rock-1.png` | special-room Lumen Nodule
- `fauna-abyss-hatchet-school` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-hatchet-school.png` | PIL/ImageDraw in `tools/build_small_life_quality_assets.py`
- `fauna-abyss-lantern-swarm` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-lantern-swarm.png` | PIL/ImageDraw in `tools/build_small_life_quality_assets.py`
- `fauna-abyss-microfish` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-microfish.png` | PIL/ImageDraw in `tools/build_small_life_quality_assets.py`
- `fauna-abyss-snipe-eel` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-snipe-eel.png` | PIL/ImageDraw in `tools/build_small_life_quality_assets.py`
- `fauna-abyss-static-fry` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-static-fry.png` | PIL/ImageDraw in `tools/build_small_life_quality_assets.py`
- `fauna-abyss-viperfish` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-viperfish.png` | also special-room `Abyssal Thresher`
- `flora-oxygen-bulb` | `procedural_drawn_png` | `public/assets/generated/flora-oxygen-bulb.png` | special-room Oxygen Bloom
- `flora-oxygen-kelp` | `procedural_drawn_png` | `public/assets/generated/flora-oxygen-kelp.png` | special-room Oxygen Bloom

The repaired terrain-edge flora now appear below these only because they remain untracked and are known former outputs of `tools/build_flora_slice_assets.py`.

## Verification

- `node tools/audit_curated_fauna_flora_assets.mjs` -> failed as designed: 45 hard failures remain; inventory written.
- `npx tsc --noEmit --pretty false` -> pass.
- `npm run build` -> pass. Vite reported existing unresolved `/assets/generated/...` runtime URL warnings and chunk-size/plugin-timing warnings.
- `node runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/capture-repaired-flora-proof.mjs` -> pass on port 5180.

## BLOCKED_ASSET_QUEUE

Full machine-readable queue is in `procedural-quality-inventory.json` under `blockedAssetQueue`. Shared contract for fauna: species-specific painted/generated bitmap source on flat `#ff00ff` or transparent background, ingested first, then runtime animation frames derived from that bitmap. Shared contract for flora: species-specific source-sheet or painted transparent flora cutout; no PIL/ImageDraw shape construction.

- `fauna-deep-gulper-eel` | `unknown_provenance` | `public/assets/generated/fauna-deep-gulper-eel.png` | species: Gulper Eel
- `fauna-shallow-lantern-fry` | `unknown_provenance` | `public/assets/generated/fauna-shallow-lantern-fry.png` | species: Lantern Fry
- `biolume-crystal` | `procedural_drawn_png` | `public/assets/generated/biolume-crystal.png` | species: Lumen Nodule
- `biolume-rock-0` | `procedural_drawn_png` | `public/assets/generated/biolume-rock-0.png` | species: Lumen Nodule
- `biolume-rock-1` | `procedural_drawn_png` | `public/assets/generated/biolume-rock-1.png` | species: Lumen Nodule
- `fauna-abyss-hatchet-school` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-hatchet-school.png` | species: Abyssal Hatchet School
- `fauna-abyss-lantern-swarm` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-lantern-swarm.png` | species: Lantern Swarm
- `fauna-abyss-microfish` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-microfish.png` | species: Hadopelagic Microfish
- `fauna-abyss-snipe-eel` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-snipe-eel.png` | species: Snipe Eel
- `fauna-abyss-static-fry` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-static-fry.png` | species: Static Fry
- `fauna-abyss-viperfish` | `procedural_drawn_png` | `public/assets/generated/fauna-abyss-viperfish.png` | species: Abyssal Viperfish / Abyssal Thresher
- `flora-oxygen-bulb` | `procedural_drawn_png` | `public/assets/generated/flora-oxygen-bulb.png` | species: Oxygen Bloom
- `flora-oxygen-kelp` | `procedural_drawn_png` | `public/assets/generated/flora-oxygen-kelp.png` | species: Oxygen Bloom
- `fauna-abyss-abyss-jelly` | `unknown_provenance` | `public/assets/generated/fauna-abyss-abyss-jelly.png` | species: Abyssal Jelly
- `fauna-abyss-anglerfish` | `unknown_provenance` | `public/assets/generated/fauna-abyss-anglerfish.png` | species: Anglerfish
- `fauna-abyss-bigfin-squid` | `unknown_provenance` | `public/assets/generated/fauna-abyss-bigfin-squid.png` | species: Bigfin Squid
- `fauna-abyss-black-swallower` | `unknown_provenance` | `public/assets/generated/fauna-abyss-black-swallower.png` | species: Black Swallower
- `fauna-abyss-frilled-shark` | `unknown_provenance` | `public/assets/generated/fauna-abyss-frilled-shark.png` | species: Frilled Shark
- `fauna-abyss-hadal-shrimp` | `unknown_provenance` | `public/assets/generated/fauna-abyss-hadal-shrimp.png` | species: Hadopelagic Shrimp
- `fauna-abyss-medusa` | `unknown_provenance` | `public/assets/generated/fauna-abyss-medusa.png` | species: Abyssal Medusa
- `fauna-abyss-mirror-fry` | `unknown_provenance` | `public/assets/generated/fauna-abyss-mirror-fry.png` | species: Mirror Fry
- `fauna-abyss-vampire-squid` | `unknown_provenance` | `public/assets/generated/fauna-abyss-vampire-squid.png` | species: Abyss Vampire Squid
- `fauna-deep-ash-minnow` | `unknown_provenance` | `public/assets/generated/fauna-deep-ash-minnow.png` | species: Ash Minnow
- `fauna-deep-barreleye` | `unknown_provenance` | `public/assets/generated/fauna-deep-barreleye.png` | species: Barreleye
- `fauna-deep-deep-shrimp` | `unknown_provenance` | `public/assets/generated/fauna-deep-deep-shrimp.png` | species: Deep Sea Shrimp
- `fauna-deep-glass-squid` | `unknown_provenance` | `public/assets/generated/fauna-deep-glass-squid.png` | species: Glass Squid
- `fauna-deep-hatchetfish` | `unknown_provenance` | `public/assets/generated/fauna-deep-hatchetfish.png` | species: Hatchetfish
- `fauna-deep-lanternfish` | `unknown_provenance` | `public/assets/generated/fauna-deep-lanternfish.png` | species: Lanternfish
- `fauna-deep-sea-spider` | `unknown_provenance` | `public/assets/generated/fauna-deep-sea-spider.png` | species: Sea Spider
- `fauna-deep-tripodfish` | `unknown_provenance` | `public/assets/generated/fauna-deep-tripodfish.png` | species: Tripodfish
- `fauna-deep-vampire-squid` | `unknown_provenance` | `public/assets/generated/fauna-deep-vampire-squid.png` | species: Vampire Squid
- `fauna-shallow-blue-ring-octopus` | `unknown_provenance` | `public/assets/generated/fauna-shallow-blue-ring-octopus.png` | species: Blue-ring Octopus
- `fauna-shallow-comb-jelly` | `unknown_provenance` | `public/assets/generated/fauna-shallow-comb-jelly.png` | species: Comb Jelly
- `fauna-shallow-glass-ray` | `unknown_provenance` | `public/assets/generated/fauna-shallow-glass-ray.png` | species: Glass Ray
- `fauna-shallow-jellyfish` | `unknown_provenance` | `public/assets/generated/fauna-shallow-jellyfish.png` | species: Moon Jelly
- `fauna-shallow-mantis-shrimp` | `unknown_provenance` | `public/assets/generated/fauna-shallow-mantis-shrimp.png` | species: Mantis Shrimp
- `fauna-shallow-nautilus` | `unknown_provenance` | `public/assets/generated/fauna-shallow-nautilus.png` | species: Nautilus
- `fauna-shallow-octopus` | `unknown_provenance` | `public/assets/generated/fauna-shallow-octopus.png` | species: Tidepool Octopus
- `fauna-shallow-snap-shrimp` | `unknown_provenance` | `public/assets/generated/fauna-shallow-snap-shrimp.png` | species: Snapping Shrimp
- `fauna-shallow-squid` | `unknown_provenance` | `public/assets/generated/fauna-shallow-squid.png` | species: Reef Squid

## Commit

No commit created. The worktree had extensive pre-existing dirty state, including untracked files in the same suggested tool/asset paths that this cleanup had to inspect and repair (`tools/audit_curated_fauna_flora_assets.mjs`, `public/assets/generated/terrain-edge-flora-*.png`). I avoided staging or claiming ownership across that mixed state. A later commit should stage only the assigned cleanup paths explicitly.
