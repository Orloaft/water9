# Water9 Flora Style Guide Audit - Manager Synthesis

Date: 2026-07-06  
Repo: `/mnt/nxt-dev/water9`  
Verified HEAD: `03b2dad`

## Verdict

The better in-game flora style is the later decorative terrain-integrated family, not the older static scannable `env-flora-*` family.

The scannable flora is functionally correct, but much of it reads like foreground reward tokens: large centered specimens, bright full-body contrast, isolated silhouettes, and scan text dominating the scene. The decorative terrain flora works better because it reads as cave habitat: smaller, rooted into ledges, repeated in clusters, darker at the base, selective glow at tips/nodes, and still legible in grayscale.

## What Is Scannable

Runtime scan targets are not decided by asset name. A plant is scannable only if worldgen creates a `Flora` object in `this.flora`. The scanner searches `this.fish`, `this.flora`, and `this.articulatedCreatures`; decorative terrain props and brush placements are never scan targets.

Active biome scannables:

| Biome | Species | Current runtime asset | Read |
| --- | --- | --- | --- |
| B1 | Glass Kelp | `terrain-edge-flora-glass-kelp` | Already close to desired style |
| B1 | Moon Sponge | `env-flora-moon-sponge` | Older/static |
| B1 | Sting Anemone | `env-flora-sting-anemone` | Older/static, centered hazard token |
| B2 | Brine Grass | `terrain-edge-flora-brine-grass` | Already close to desired style |
| B2 | Vent Coral | `env-flora-vent-coral` | Older/static |
| B2 | Ember Bloom | `env-flora-ember-bloom` | Older/static, too bright/large |
| B3 | Black Fan | `terrain-edge-flora-black-fan` | Already close to desired style |
| B3 | Needle Garden | `env-flora-needle-garden` | Older/static, too wide/bright |
| B3 | Crown Polyp | `terrain-edge-flora-crown-polyps` | Already close to desired style |
| B4 | Circuit Kelp | `env-flora-circuit-kelp` | Older/static |
| B4 | Glass Obelisk | `env-flora-glass-obelisk` | Older/static, centered cone |
| B4 | Oracle Polyp | `terrain-edge-flora-oracle-tendrils` | Already close to desired style |

Special-room scannables:

- Oxygen Bloom: `flora-oxygen-kelp`, `flora-oxygen-bulb`
- Lumen Fern: `terrain-edge-flora-lumen-fern`
- Lumen Nodule: `biolume-rock-0`, `biolume-rock-1`, `biolume-crystal`

## Decorative Non-Scannable Flora To Use As Style Reference

Primary benchmark families:

- `terrain-stamp-plant-glass`
- `terrain-stamp-plant-brine`
- `terrain-stamp-plant-lumen`
- `terrain-stamp-plant-purple`
- `terrain-stamp-fringe-teal`
- `terrain-stamp-fringe-brine`
- `terrain-stamp-fringe-purple`
- `terrain-stamp-fringe-cyan`
- `terrain-brush-flora-1`
- `terrain-brush-flora-4`
- `terrain-brush-flora-6`
- `terrain-brush-flora-7`

Why these are non-scannable:

- `terrain-stamp-*` flora is placed as `EnvironmentProp` decoration and drawn through environment-prop rendering.
- `terrain-brush-flora-*` is placed as `TerrainBrushPlacement` inside terrain visuals.
- Procedural ecology fringe is painted directly into terrain graphics.
- None of these paths creates `Flora` objects with species, scan state, hp, radius, or sprite lifecycle.

Important distinction: the `terrain-edge-flora-*` family is a style reference, but not purely decorative anymore. Several members are already used as active scannable flora visuals. The actual non-scannable decorative proof is strongest for `terrain-stamp-*`, brush flora, and procedural ecology fringe.

## Style Guide

Replacement scannable flora should preserve the decorative family's terrain-first read:

- Target runtime display height: 30-44 px for common flora, 42-56 px for hazardous/rare/function flora, 58 px max except deliberate setpieces.
- Root every sprite into a terrain contact zone: dark base, irregular foot, buried stems, rock mat, sacs, or shadow.
- Use asymmetry: lean, fork, staggered heights, broken clusters, side growth, and terrain-shaped negative space.
- Keep saturated color to about 10-25% of visible pixels, mostly tips, bulbs, veins, nodes, or hazard thorns.
- Make the base darker and quieter than the species cue.
- Avoid centered product-photo composition, radial flower icons, round glossy balls, freestanding aquarium plants, and full-body rim glow.
- Scan readability should come from one clear focal feature plus scanner FX, not from making the whole plant bright.
- Accept only after checking live `#game canvas` captures and grayscale variants at gameplay scale.

Useful prompt seed for generated replacements:

```text
Small underwater cave-edge flora sprite, terrain-rooted growth attached to rock, asymmetrical cluster, dark teal/violet base, sparse cyan bioluminescent tips, readable silhouette at 40 px tall, transparent background, painterly pixel-friendly game asset, no card framing, no isolated specimen, no centered catalog pose, no full-body glow.
```

## First Replacement Slice Recommendation

Do a focused B1/B2 replacement slice before touching the whole catalog:

1. Replace Moon Sponge, Sting Anemone, Vent Coral, and Ember Bloom with terrain-edge-style scannable assets.
2. Preserve species identity and scan targeting, but make each asset ledge-rooted and lower contrast.
3. Keep Glass Kelp and Brine Grass as local positive controls because they already use the better `terrain-edge-flora-*` style.
4. Capture B1 and B2 normal-play proof with adjacent decorative terrain flora and grayscale variants.

Why this slice: B1/B2 are the early-game areas where the static flora read is most visible, and they give one common, one uncommon/hazard, and two epic/hazard cases without creating a large integration blast radius.

## Ready Worker Prompt

```text
Goal: replace the first slice of old static scannable flora with terrain-integrated Water9 flora assets.

Repo pin: /mnt/nxt-dev/water9

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN - do not improvise alternate paths, do not write anywhere
else.

Read before editing:
- runs/water9-flora-style-guide-audit-2026-07-06/manager-synthesis.md
- runs/water9-flora-style-guide-audit-2026-07-06/inventory.md
- runs/water9-flora-style-guide-audit-2026-07-06/style-appraisal.md
- runs/water9-flora-style-guide-audit-2026-07-06/runtime-proof.md

Scope:
- Replace the gameplay visuals for these active scannable flora only:
  - Moon Sponge
  - Sting Anemone
  - Vent Coral
  - Ember Bloom
- Preserve species names, scan behavior, rewards, spawn logic, biome placement, hazards, and gameplay stats.
- Use the decorative terrain-integrated style benchmark: terrain-rooted, smaller, asymmetrical, darker base, selective tip/node glow, readable at gameplay scale.
- Do not touch fauna, economy, scanner logic, controls, Telegram/OpenClaw config, or unrelated files.
- Preserve existing dirty state. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Implementation guidance:
- Prefer adding/replacing generated PNG assets and routing these four species through `floraGameplayAssetKey()` or the existing asset-loading pattern.
- Keep existing better references (`terrain-edge-flora-glass-kelp`, `terrain-edge-flora-brine-grass`) unchanged as positive controls.
- If generating assets, reject centered catalog/specimen compositions. The old static read must be gone.

Visual acceptance:
- Start a dev server only on ports 5180-5199. If one is busy, use another in range; never kill processes outside it.
- Capture normal-play live `#game canvas` proof, not review-harness-only screenshots.
- Required captures: B1 Moon Sponge, B1 Sting Anemone, B2 Vent Coral, B2 Ember Bloom, plus at least one nearby decorative terrain-flora comparison in B1/B2.
- Include grayscale variants for every accepted color capture.
- Include HUD/context viewport captures proving this is Water9 runtime.
- Manager acceptance will be visual; passing metrics alone is not enough.

Verification:
- Run `npm run build`.
- Run any existing focused flora/asset smoke if available.
- Confirm the four species remain scannable in runtime proof.

Return:
- Status.
- Changed files.
- Report path.
- Proof image paths.
- Verification commands and results.
- Caveats/blockers.
- Commit hash if you commit; otherwise say no commit made.
```

## Evidence

Reports:

- `runs/water9-flora-style-guide-audit-2026-07-06/inventory.md`
- `runs/water9-flora-style-guide-audit-2026-07-06/style-appraisal.md`
- `runs/water9-flora-style-guide-audit-2026-07-06/runtime-proof.md`

Key proof images:

- `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison-grayscale.png`
- `runs/water9-flora-style-guide-audit-2026-07-06/flora-runtime-contact-sheet.png`

Runtime proof covered 10 live `#game canvas` captures, 10 grayscale variants, and 10 HUD/context viewport captures. The B3/B4 decorative-only depth proof has a caveat: reachable-depth teleporting landed shallower than requested for those decorative-only captures, while B3/B4 scannable captures reached 864m and 1278m.

## Acceptance

Accepted for analysis. The audit identifies the decorative non-scannable flora families, explains why they are not scannable, names the older scannable assets that should be replaced, and provides a style guide plus a ready first-slice implementation prompt.
