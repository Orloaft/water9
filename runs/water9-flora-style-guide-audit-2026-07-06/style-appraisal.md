# Water9 Flora Asset Style Appraisal

Audit date: 2026-07-06  
Repo HEAD checked before work: `03b2dad`

## Artifacts

- Color contact sheet: `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison.png`
- Grayscale contact sheet: `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-comparison-grayscale.png`
- Metrics inventory: `runs/water9-flora-style-guide-audit-2026-07-06/flora-asset-inventory.json`

The contact sheets render sprites at approximate gameplay display heights: active scannables use `drawFlora` height logic (`radius * ENTITY_SCALE * 4`, or `* 4.7` for rare flora), terrain-edge decorations use a representative edge-prop height, stamps and brush flora use ambient accent heights.

## Summary Judgment

The decorative flora family fits Water9 better because it reads as terrain growth first and asset specimen second. It is smaller, dimmer, lower contrast, more rooted into the ledge, and visually broken into clusters or tendrils. The current scannable family often reads as a centered catalog object: large isolated forms, symmetrical front-on composition, high internal detail, and strong self-contained outlines that make the plants feel pasted over the world rather than grown from it.

Replacement scannables should keep the scan target readable, but they should inherit the decorative family's terrain attachment, scale discipline, darker integrated values, and asymmetrical clustered silhouettes.

## Active Scannable Flora Inventory

| Asset | Source | Gameplay size | Visual appraisal |
| --- | ---: | ---: | --- |
| `env-flora-glass-kelp` | 216x142 | ~52x35 | Broad mound, strong bottom contact, muted value; one of the better env sprites, but still framed as a centered specimen. |
| `env-flora-moon-sponge` | 201x164 | ~38x32 | Compact sponge cluster, decent terrain contact, but rounded mass becomes a small blob at gameplay scale. |
| `env-flora-sting-anemone` | 201x164 | ~57x47 | Radial catalog pose; hazard identity is clear, but the centered flower-like form feels detached from terrain. |
| `env-flora-brine-grass` | 194x162 | ~38x32 | Best scannable direction: thin vertical blades, lower mass, blends into ledge. Needs less centered framing. |
| `env-flora-vent-coral` | 179x161 | ~48x43 | Useful spiky silhouette and bottom contact; slightly too specimen-like and evenly lit. |
| `env-flora-ember-bloom` | 204x163 | ~67x54 | Oversized and high-detail; collapses into a bright orange clump, reads like a reward icon more than terrain flora. |
| `env-flora-black-fan` | 185x172 | ~40x37 | Good color family and fan identity; bottom attachment is weak and the fan reads as a freestanding bush. |
| `env-flora-needle-garden` | 236x169 | ~64x46 | Strong hazard silhouette, but too wide, bright, and isolated; negative space is internal rather than terrain-shaped. |
| `env-flora-crown-polyp` | 184x159 | ~71x61 | Too large and top-lit; dense crown detail turns into a bright mound at play scale. |
| `env-flora-circuit-kelp` | 181x176 | ~38x37 | Clear vertical shapes, but front-on stems do not feel anchored; reads as an aquarium plant specimen. |
| `env-flora-glass-obelisk` | 170x174 | ~51x52 | Clean hazard column, but centered cone silhouette and bright rim make it sticker-like. |
| `env-flora-oracle-polyp` | 184x166 | ~75x68 | Biggest offender: round, centered, glossy, icon-like, and too dominant for terrain flora. |
| `env-flora-oxygen-bloom` | 163x165 | ~50x51 | Readable oxygen identity; round pearl cluster is too self-contained and object-like. |
| `env-flora-lumen-fern` | 214x166 | ~57x44 | Better organic language, but top-heavy and still isolated from ledge shape. |
| `env-flora-lumen-nodule` | 185x163 | ~43x37 | Good low-value integration; small glowing dots are readable, but the mound still has catalog-card framing. |
| `flora-oxygen-kelp` | 100x151 | ~29x51 | Tall, clean, readable. Palette is much brighter than terrain, so it should be reserved for explicit oxygen function. |
| `flora-oxygen-bulb` | 105x166 | ~28x51 | Tall and readable; bulb tops are useful scan affordances, but the form is very front-facing. |
| `flora-biolume-tall` | 86x176 | ~20x44 | Thin vertical silhouette is good; high chroma blue/purple can separate too sharply from background. |
| `biolume-crystal` | 135x126 | ~106x37 | Very wide at runtime because of source aspect; reads as a decorative ledge strip, not a focal flora specimen. |
| `biolume-rock-0` | 38x28 | ~48x37 | Integrates well as small glowing terrain mass; close to desired anchored scannable treatment. |
| `biolume-rock-1` | 94x47 | ~84x37 | Good ledge strip language, but wide scan target could be ambiguous unless paired with distinct scan pulse. |

## Decorative Flora Candidate Inventory

| Asset | Source | Gameplay size | Visual appraisal |
| --- | ---: | ---: | --- |
| `terrain-edge-flora-glass-kelp` | 279x273 | ~30x29 | Small slanted tuft, low contrast, terrain-rooted; strong replacement reference. |
| `terrain-edge-flora-brine-grass` | 258x235 | ~32x29 | Thin blades and muted violet/green integration; readable without becoming a sticker. |
| `terrain-edge-flora-black-fan` | 252x239 | ~31x29 | Compact fan silhouette, soft rim, dark base; fits edge ecology well. |
| `terrain-edge-flora-lumen-fern` | 269x259 | ~30x29 | Small glowing fern with asymmetry and terrain lean; good scan target candidate if scaled slightly up. |
| `terrain-edge-flora-abyss-sacs` | 259x251 | ~30x29 | Dark nodule cluster, integrated values; good for deep scannables. |
| `terrain-edge-flora-lumen-stalks` | 262x227 | ~34x29 | Broken stalk cluster, good negative space and base attachment. |
| `terrain-edge-flora-crown-polyps` | 276x226 | ~36x29 | Polyp identity survives in a low, ledge-bound cluster. |
| `terrain-edge-flora-oracle-tendrils` | 274x200 | ~40x29 | Best oracle direction: tendrils, asymmetry, dark rooted mass, small purple read. |
| `terrain-stamp-plant-glass` | 110x243 | ~8x18 | Ambient scale only; great shape language for secondary growth, too tiny alone for scannable. |
| `terrain-stamp-plant-brine` | 114x201 | ~10x18 | Fine hairlike growth; useful as supporting base clutter around scannable. |
| `terrain-stamp-plant-lumen` | 126x216 | ~10x18 | Very readable glow accent in grayscale; use sparingly as scan cue. |
| `terrain-stamp-plant-purple` | 130x235 | ~9x18 | Good alien tendril language; too narrow by itself for scan focus. |
| `terrain-brush-flora-0` | 120x138 | ~20x23 | Low, rocky, muted, with strong bottom occupancy; good terrain integration. |
| `terrain-brush-flora-1` | 91x137 | ~15x23 | Thin grass silhouette, good for scatter but too low contrast as a unique scan target. |
| `terrain-brush-flora-2` | 115x133 | ~20x23 | Balanced clump with small cyan accents; good supporting shape. |
| `terrain-brush-flora-3` | 130x131 | ~23x23 | Round growth, integrated and quiet; useful for nodules. |
| `terrain-brush-flora-4` | 124x145 | ~20x23 | Sparse, dark, terrain-friendly; scan identity would need a brighter focal node. |
| `terrain-brush-flora-5` | 101x142 | ~16x23 | Thin red/cyan blades; good hazardous accent when paired with a larger base. |
| `terrain-brush-flora-6` | 90x131 | ~16x23 | Small branching silhouette; good density and low value. |
| `terrain-brush-flora-7` | 77x160 | ~11x23 | Tallest brush form; useful for side growth and ledge wisps. |

## What Decorative Flora Does Better

- It attaches to terrain. Most decorative candidates visually assume a root line, ledge shadow, or side-growth posture; current env scannables often sit as centered objects whose base does not conform to the rock.
- It uses smaller, clustered silhouettes. Decorative sprites read as tufts, fans, sacs, or tendril groups around 18-40 px high in context; env scannables often occupy 45-75 px and dominate the tile.
- It keeps values closer to the terrain. Decorative edge flora averages dark to mid luma with selective glow; many env scannables use bright highlights over the whole body.
- It has less catalog-card symmetry. Edge/stamp/brush assets lean, crop, fork, and break apart; problematic scannables are round, centered, or front-on.
- It leaves terrain-shaped negative space. Decorative forms have air between blades and uneven outlines, which helps them remain part of the cave edge in grayscale.
- It uses accent color as information, not fill. The best decorative pieces reserve cyan, purple, or pink for tips, nodes, or rim accents; weak scannables flood the whole specimen with saturated color.
- It tolerates alpha and darkness. Decorative flora can sit at 0.74-0.86 alpha or lower and still read as world texture; scannables need a controlled focal mark rather than full-body brightness.

## Traits To Avoid In Replacement Scannables

- Sticker-like isolated specimens with transparent padding and a centered product-photo composition.
- Oversized single-object sprites, especially round polyp balls and bright mound clusters above ~60 px display height.
- Flat front-on silhouettes that do not imply rock attachment, current, growth direction, or surface normal.
- Bright all-over rim lighting that separates the entire plant from the terrain.
- Detailed micro-textures across the whole body; these collapse into noisy blobs at gameplay scale.
- Identical top/bottom/left/right breathing room that makes the asset feel like a catalog card.
- Perfect radial flowers, cones, or pearls unless partially buried, clustered, or occluded by terrain.
- Wide runtime aspects caused by short source sprites unless the design intentionally reads as a ledge strip.

## Proposed Replacement Style Guide

### Canvas And Runtime Size

- Source canvas: 160-220 px on the long side for most scannables; up to 260 px only for sparse tendrils or fan silhouettes.
- Alpha bbox should not fill the whole canvas like a card. Keep 4-10 px padding, but let the base approach or touch the bottom/side edge depending on anchor.
- Target runtime display height: 30-44 px for common flora, 42-56 px for rare/hazard/oxygen flora, 58 px maximum for boss-like or quest-critical flora.
- Target runtime width: usually 24-52 px. Avoid >65 px unless it is a low ledge strip with clear scan center.
- Build at least two compatible variants per species: one floor/ceiling rooted and one wall-rooted, or a silhouette that survives rotation.

### Silhouette Rules

- Start from a terrain-contact base: root mat, shadow foot, small rock/sponge mass, or buried stem cluster.
- Use asymmetry: lean, fork, stagger heights, broken clusters, and side growth.
- Keep the readable species cue in the outer contour: needles for hazards, bulbs for oxygen, fan ribs for fan corals, tendrils for oracle forms.
- Reserve a small focal feature for scanning: glowing node, crown tips, oxygen bulbs, or hazard thorns. Do not make the entire plant the focal feature.
- Favor clustered medium shapes over one big round object.

### Palette And Value Rules

- Base colors should sit near terrain values: dark teal, blue-gray, muted violet, brown-green, or charcoal.
- Use saturated color only on 10-25% of visible pixels: tips, veins, nodes, or rim accents.
- Keep grayscale readability: the species cue should still separate through value shape, not only hue.
- Add a dark contact shadow or occlusion band at the root. The root should be darker than the tips.
- Avoid full-body white/cyan glow except for oxygen flora; even oxygen assets should have a dark anchored base.

### Terrain Anchoring Rules

- Design the bottom/side 15-25% as an attachment zone that can overlap a ledge without looking clipped.
- Make the root line irregular, not a flat pedestal.
- For wall flora, bias mass away from the wall normal and keep the root side visually heavier.
- Include small debris, sacs, or secondary tendrils at the base so the sprite blends into terrain brushes.
- Asset should look acceptable when rotated by surface normal and slightly swayed.

### Scan Readability Rules

- At 35-50 px high, the silhouette must be identifiable in both color and grayscale.
- One scan focal point should remain visible after downscaling: bulb cluster, thorn crown, fan ribs, luminous nodule, or tendril fork.
- Scannable should be more legible than ambient brush flora but not larger or brighter than nearby fauna.
- A scan pulse should frame the root/focal cluster, not compensate for a confusing sprite.
- Test replacement candidates on a dark terrain strip at 1x gameplay scale before accepting.

### Prompt Language For Generated Assets

Use language like:

> Small underwater cave-edge flora sprite, terrain-rooted growth attached to rock, asymmetrical cluster, dark teal/violet base, sparse cyan bioluminescent tips, readable silhouette at 40 px tall, transparent background, painterly pixel-friendly game asset, no card framing, no isolated specimen, no centered catalog pose, no full-body glow.

Species-specific prompt modifiers:

- Oxygen flora: `dark rooted kelp base with 3-5 pale cyan oxygen bulbs, bulbs are the only bright elements, readable healing cue, not a floating icon`.
- Hazard flora: `thin thorn crown or needle cluster emerging from rock shadow, red/pink accents only on tips, dangerous silhouette without oversized flower shape`.
- Polyp flora: `low cluster of small crowns and tendrils, partially buried in ledge, irregular base, avoid single round bloom`.
- Fan/fern flora: `leaning fan ribs with broken edge, dark attached foot, selective rim highlights, asymmetrical spread`.
- Nodule flora: `small lumpy rock-growth cluster with a few glowing nodes, wide but low, terrain strip silhouette`.

## Replacement Direction By Species

- Glass Kelp, Brine Grass, Black Fan, Lumen Fern, Crown Polyp, Oracle Polyp: base replacements directly on their `terrain-edge-flora-*` counterparts, scaled slightly up and given a clearer scan focal node.
- Moon Sponge, Vent Coral, Ember Bloom, Needle Garden, Circuit Kelp, Glass Obelisk: generate new terrain-edge-style versions using the decorative rules rather than the current specimen compositions.
- Oxygen Bloom and oxygen special-room plants: keep the strong cyan readability, but add dark roots, reduce all-over brightness, and avoid a freestanding lollipop/bulb pose.
- Biolume rocks/crystals: keep as ledge-bound support assets; if they become primary scan targets, add one distinct focal glow and cap width.

## Caveats

- This audit used static asset inspection and approximate runtime scaling from code; it did not run an interactive screenshot pass through actual world generation.
- The repo is already dirty from unrelated work. This lane only created files under `runs/water9-flora-style-guide-audit-2026-07-06/`.
- Some terrain-edge flora are already routed for certain gameplay flora in `src/scene-worldgen.ts`; this report still compares them as decorative-style references because that is the requested appraisal frame.
