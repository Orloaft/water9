# Water9 Flora Style Guide Audit - 2026-07-06

## Verdict

Runtime scannability is not controlled by asset name. A plant becomes scannable only when worldgen creates a `Flora` object in `this.flora`; the scanner only searches `this.fish`, `this.flora`, and `this.articulatedCreatures`. Decorative terrain growth is drawn as `EnvironmentProp` sprites or `TerrainBrushPlacement` sprites, so even `kind: 'flora'` decorative props are absent from scan target lists.

The best visual benchmark for replacement scannable flora is the later terrain-integrated decorative/stamp style: `terrain-stamp-plant-*`, `terrain-stamp-fringe-*`, and the brush flora variants. Current live scannables are mixed: several still use older `env-flora-*` static wall assets, while a few have already been swapped to better `terrain-edge-flora-*` visuals in `floraGameplayAssetKey`.

Evidence anchors:

- Active flora species come from `src/content.ts:290-310`.
- Live gameplay flora instances are created in `src/scene-worldgen.ts:989-1024`.
- Runtime flora asset overrides are in `src/scene-worldgen.ts:1036-1044`.
- Biolume/special-room flora are pushed into `this.flora` in `src/scene-worldgen.ts:1053-1125`.
- Scanner targets are only `[...this.fish, ...this.flora, ...this.articulatedCreatures]` in `src/scene-entities.ts:1088-1106`.
- Decorative edge props are `EnvironmentProp` objects in `src/scene-worldgen.ts:661-742` and `src/scene-worldgen.ts:822-862`, drawn by `src/scene-rendering.ts:571-594`.
- Terrain brush flora is generated/drawn by `src/scene-rendering.ts:1040-1144` and `src/scene-rendering.ts:1273-1324`.

## Active Scannable Flora By Biome

Reward is base reward at scanner level 0. `scanReward()` adds scanner upgrade bonus at runtime.

| Biome | Species | Flags | Rarity | Reward | Runtime asset key | Path |
|---|---|---:|---|---:|---|---|
| 1 | Glass Kelp | hazardous=false, rare=false | common | 60 | `terrain-edge-flora-glass-kelp` | `public/assets/generated/terrain-edge-flora-glass-kelp.png` |
| 1 | Moon Sponge | hazardous=false, rare=false | uncommon | 140 | `env-flora-moon-sponge` | `public/assets/generated/env-flora-moon-sponge.png` |
| 1 | Sting Anemone | hazardous=true, rare=true | epic | 2040 | `env-flora-sting-anemone` | `public/assets/generated/env-flora-sting-anemone.png` |
| 2 | Brine Grass | hazardous=false, rare=false | common | 60 | `terrain-edge-flora-brine-grass` | `public/assets/generated/terrain-edge-flora-brine-grass.png` |
| 2 | Vent Coral | hazardous=true, rare=false | uncommon | 200 | `env-flora-vent-coral` | `public/assets/generated/env-flora-vent-coral.png` |
| 2 | Ember Bloom | hazardous=true, rare=true | epic | 2040 | `env-flora-ember-bloom` | `public/assets/generated/env-flora-ember-bloom.png` |
| 3 | Black Fan | hazardous=false, rare=false | common | 60 | `terrain-edge-flora-black-fan` | `public/assets/generated/terrain-edge-flora-black-fan.png` |
| 3 | Needle Garden | hazardous=true, rare=false | uncommon | 200 | `env-flora-needle-garden` | `public/assets/generated/env-flora-needle-garden.png` |
| 3 | Crown Polyp | hazardous=true, rare=true | epic | 2040 | `terrain-edge-flora-crown-polyps` | `public/assets/generated/terrain-edge-flora-crown-polyps.png` |
| 4 | Circuit Kelp | hazardous=false, rare=false | common | 60 | `env-flora-circuit-kelp` | `public/assets/generated/env-flora-circuit-kelp.png` |
| 4 | Glass Obelisk | hazardous=true, rare=false | uncommon | 200 | `env-flora-glass-obelisk` | `public/assets/generated/env-flora-glass-obelisk.png` |
| 4 | Oracle Polyp | hazardous=true, rare=true | epic | 2040 | `terrain-edge-flora-oracle-tendrils` | `public/assets/generated/terrain-edge-flora-oracle-tendrils.png` |

Rarity rules are in `src/helpers.ts:2660-2666`; reward rules are in `src/helpers.ts:2559-2580`.

## Active Special-Room Scannable Flora

These do not come from `biomeFlora`; `populateBiolumeRoom()` pushes them directly into `this.flora`, so they are scannable.

| Runtime context | Species | Flags | Rarity | Reward | Runtime asset key | Path |
|---|---|---:|---|---:|---|---|
| biolume room | Oxygen Bloom | hazardous=false, rare=true | rare | 360 | `flora-oxygen-kelp` | `public/assets/generated/flora-oxygen-kelp.png` |
| biolume room | Oxygen Bloom | hazardous=false, rare=true | rare | 360 | `flora-oxygen-bulb` | `public/assets/generated/flora-oxygen-bulb.png` |
| biolume room | Lumen Fern | hazardous=false, rare=true | rare | 360 | `terrain-edge-flora-lumen-fern` | `public/assets/generated/terrain-edge-flora-lumen-fern.png` |
| biolume room | Lumen Nodule | hazardous=false, rare=true | rare | 360 | `biolume-rock-0` | `public/assets/generated/biolume-rock-0.png` |
| biolume room | Lumen Nodule | hazardous=false, rare=true | rare | 360 | `biolume-rock-1` | `public/assets/generated/biolume-rock-1.png` |
| biolume room | Lumen Nodule | hazardous=false, rare=true | rare | 360 | `biolume-crystal` | `public/assets/generated/biolume-crystal.png` |

## Older/Static Flora Still Active As Scannables

These active scannables still use older static `env-flora-*` assets:

- `env-flora-moon-sponge` - Moon Sponge, biome 1.
- `env-flora-sting-anemone` - Sting Anemone, biome 1.
- `env-flora-vent-coral` - Vent Coral, biome 2.
- `env-flora-ember-bloom` - Ember Bloom, biome 2.
- `env-flora-needle-garden` - Needle Garden, biome 3.
- `env-flora-circuit-kelp` - Circuit Kelp, biome 4.
- `env-flora-glass-obelisk` - Glass Obelisk, biome 4.

Older `env-flora-*` assets are listed in the environment cave-wall source manifest at `public/assets/source/environment-cave-wall-source-manifest.json:152-299` and loaded via `environmentTextureKeys()` at `src/helpers.ts:2068-2084`.

These `env-flora-*` assets exist and are loaded, but are not the live gameplay asset for their matching species because `floraGameplayAssetKey()` overrides them:

- `env-flora-glass-kelp` -> live scannable uses `terrain-edge-flora-glass-kelp`.
- `env-flora-brine-grass` -> live scannable uses `terrain-edge-flora-brine-grass`.
- `env-flora-black-fan` -> live scannable uses `terrain-edge-flora-black-fan`.
- `env-flora-crown-polyp` -> live scannable uses `terrain-edge-flora-crown-polyps`.
- `env-flora-oracle-polyp` -> live scannable uses `terrain-edge-flora-oracle-tendrils`.

Also loaded but not currently an active gameplay flora asset:

- `env-flora-oxygen-bloom`, `env-flora-lumen-fern`, `env-flora-lumen-nodule`.
- `flora-biolume-tall`.
- Sandbox preview-only textures `flora-shallow-kelp`, `flora-shallow-anemone`, `flora-deep-tube`, `flora-deep-coral`; sandbox preview mapping is in `src/scene-sandbox.ts:108-110`, not live worldgen.

Generated metadata caveat: `public/assets/generated/small-life.manifest.json` says active biome flora use `src/helpers.ts:floraAssetKey`; that manifest is stale/incomplete for live asset selection because worldgen now uses `floraGameplayAssetKey()` for several species.

## Decorative Non-Scannable Flora Families

### Terrain Material Stamp Plants And Fringes

Exact decorative keys:

- `terrain-stamp-plant-glass` -> `public/assets/generated/terrain-stamp-plant-glass.png`
- `terrain-stamp-plant-brine` -> `public/assets/generated/terrain-stamp-plant-brine.png`
- `terrain-stamp-plant-lumen` -> `public/assets/generated/terrain-stamp-plant-lumen.png`
- `terrain-stamp-plant-purple` -> `public/assets/generated/terrain-stamp-plant-purple.png`
- `terrain-stamp-fringe-teal` -> `public/assets/generated/terrain-stamp-fringe-teal.png`
- `terrain-stamp-fringe-brine` -> `public/assets/generated/terrain-stamp-fringe-brine.png`
- `terrain-stamp-fringe-purple` -> `public/assets/generated/terrain-stamp-fringe-purple.png`
- `terrain-stamp-fringe-cyan` -> `public/assets/generated/terrain-stamp-fringe-cyan.png`

Source/build evidence:

- Stamp asset definitions are in `tools/build_terrain_material_stamp_assets.py:15-31`.
- Stamp source manifest entries are in `public/assets/source/terrain-material-stamp-source-manifest.json:121-230`.
- Runtime texture keys are in `src/helpers.ts:2141-2159`.
- Per-biome pools are `fringeStampPool` and `floraStampPool` in `src/helpers.ts:2172-2215`.
- Placement happens through `edgeFloraProp()`, which returns `EnvironmentProp` with `kind: 'flora'` and an `assetKey` from `floraAccentKeys()` in `src/scene-worldgen.ts:822-862`.

Why non-scannable: these are only `EnvironmentProp` records and drawn by `drawEnvironmentProps()`. They have no `species`, `scanned`, `scan`, `scanPulse`, `hp`, or `sprite` lifecycle from the `Flora` interface, and `nearestLife()` never iterates `environmentProps`.

### Terrain Brush Flora

Exact generated keys:

- `terrain-brush-flora-0` -> `public/assets/generated/terrain-brush-flora-0.png`
- `terrain-brush-flora-1` -> `public/assets/generated/terrain-brush-flora-1.png`
- `terrain-brush-flora-2` -> `public/assets/generated/terrain-brush-flora-2.png`
- `terrain-brush-flora-3` -> `public/assets/generated/terrain-brush-flora-3.png`
- `terrain-brush-flora-4` -> `public/assets/generated/terrain-brush-flora-4.png`
- `terrain-brush-flora-5` -> `public/assets/generated/terrain-brush-flora-5.png`
- `terrain-brush-flora-6` -> `public/assets/generated/terrain-brush-flora-6.png`
- `terrain-brush-flora-7` -> `public/assets/generated/terrain-brush-flora-7.png`

Runtime uses only variants `1`, `4`, `6`, and `7` for flora placements (`src/scene-rendering.ts:1310-1324`). The full key list is loaded by `terrainBrushTextureKeys()` at `src/helpers.ts:2108-2116`; source slicing is in `tools/build_terrain_brush_assets.py:80-132`.

Why non-scannable: these are `TerrainBrushPlacement` sprites created inside terrain visual chunks, drawn by `drawTerrainPlacement()`, and never added to `this.flora`. They are terrain decoration/background-detail sprites, not life entities.

### Procedural Ecology Fringe

This is not an asset-key family, but it is visually flora-like terrain growth. `drawTerrainEcologyFringe()` paints moss/glow/rim ellipses directly into terrain edge graphics at `src/scene-rendering.ts:721-794`.

Why non-scannable: it is graphics paint on terrain, not an object and not in any scan list.

### Terrain Edge Flora Assets

Exact generated keys:

- `terrain-edge-flora-glass-kelp`
- `terrain-edge-flora-brine-grass`
- `terrain-edge-flora-black-fan`
- `terrain-edge-flora-lumen-fern`
- `terrain-edge-flora-abyss-sacs`
- `terrain-edge-flora-lumen-stalks`
- `terrain-edge-flora-crown-polyps`
- `terrain-edge-flora-oracle-tendrils`

Source/build evidence is in `tools/build_terrain_edge_accent_assets.py:21-38` and `public/assets/source/terrain-edge-accent-source-manifest.json:124-229`.

Important runtime distinction: this family is not uniformly non-scannable. Six members are active scannable flora visuals: Glass Kelp, Brine Grass, Black Fan, Crown Polyp, Oracle Polyp, and special-room Lumen Fern. I found no current live placement path for `terrain-edge-flora-abyss-sacs` or `terrain-edge-flora-lumen-stalks`; they are loaded but appear unused. Current non-scannable decorative edge growth comes from the `terrain-stamp-*` pools, not directly from `terrain-edge-flora-*`.

## Ambiguous Cases

- `biolume-rock-0`, `biolume-rock-1`, and `biolume-crystal` visually read as rocks/crystals, but runtime creates them as scannable `Flora` species `Lumen Nodule`.
- `terrain-edge-nodule-green`, `terrain-edge-nodule-blue`, and `terrain-stamp-nodule-blue` visually read as biolume growth, but their manifests mark them as ore/mineral accents.
- `terrain-stamp-fringe-*` visually reads as moss/lichen/fern matting, but runtime treats them as decorative `EnvironmentProp` texture choices, not scan flora.
- `env-hazard-ice-spike` is listed beside environment flora in the cave-wall manifest, but its kind is `hazard`, not flora.
- `flora-shallow-*` and `flora-deep-*` look like flora assets, but are sandbox catalogue preview textures, not live gameplay flora.
- Some fauna species names/visuals can read plantlike or sessile at a glance, especially `Shellback Garden Eel`, `Nacre Thorn Clam`, and `Glimmer Spine Urchin`; they are fish/fauna entries in `biomeFish`, not flora.

## Decorative Style Benchmark Shortlist

Top candidates to guide replacement scannable flora:

1. `terrain-stamp-plant-lumen` (`public/assets/generated/terrain-stamp-plant-lumen.png`) - strong glowing vertical sprout silhouette, rooted in terrain, good for abyss/biolume replacements.
2. `terrain-stamp-plant-purple` (`public/assets/generated/terrain-stamp-plant-purple.png`) - tendril form and purple palette fit late-biome alien growth without reading as a flat sticker.
3. `terrain-stamp-fringe-cyan` (`public/assets/generated/terrain-stamp-fringe-cyan.png`) - integrated luminous fern/mat look; good reference for making bases fuse into terrain.
4. `terrain-brush-flora-7` (`public/assets/generated/terrain-brush-flora-7.png`) - tall, narrow silhouette used by live brush placement; promising for readable small-scale anchored plants.
5. `terrain-edge-flora-oracle-tendrils` (`public/assets/generated/terrain-edge-flora-oracle-tendrils.png`) - already active as scannable Oracle Polyp and visually close to the decorative terrain-integrated style.

Runner-up candidates:

- `terrain-edge-flora-crown-polyps` - already active as scannable Crown Polyp; good clustered hazardous-polyp reference.
- `terrain-stamp-plant-glass` and `terrain-stamp-plant-brine` - useful for shallow/thermal non-hazardous forms.
- `terrain-brush-flora-1`, `terrain-brush-flora-4`, `terrain-brush-flora-6` - actually used by live terrain brush flora placements.

## Runtime Distinction Summary

- Scannable: must be a `Flora` object (`src/types.ts:244-266`) in `this.flora`, with `species`, scan fields, hp, radius, and sprite. Created by `makeFloraPatch()` or `populateBiolumeRoom()`. Drawn by `drawFlora()` and scanned by `nearestLife()`.
- Non-scannable decorative prop: `EnvironmentProp` with an `assetKey` and dimensions only. It can have `kind: 'flora'`, but that is a rendering/category label, not a scanner contract.
- Non-scannable terrain brush: `TerrainBrushPlacement` sprite selected by terrain geometry; no species or scan state.
- Non-scannable procedural detail: drawn directly into terrain graphics; no object identity.

