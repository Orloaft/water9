# Water9 Fauna Animation Runtime Inventory

## Summary Verdict
Runtime fish/fauna coverage is broad and integrated: 138 biome fish entries are referenced by normal gameplay, and every fish entry found has a packed frame manifest and base PNG at the expected runtime path. The newly added `fauna-exp-*` set accounts for 100 runtime entries, and they are consistently 3-frame spritesheets at 7 fps, while the neutral benchmarks span 3-4 frames and include classic cephalopod/nautilus entries plus two new cuttle-like entries.
No missing fish manifests, missing fish frame files, duplicate benchmark-key reuse, or one-frame runtime fish entries were found in this lane; the main risk for visual lanes is not integration failure but whether 3 frames are sufficient for complex body plans. Articulated fauna are separately integrated through `articulated-creatures.parts.json`: 5 are normal-gameplay eligible by legacy/accepted rules and 32 are prototype-gated.

## Runtime Inventory Counts
- Established fish entries: 38
- Newly added `fauna-exp-*` fish entries: 100
- Missing/partial fish sprite entries: 0
- Shared-key fish entries: 4 entries across 2 duplicate asset keys
- Articulated/prototype manifest entries: 37 total; 5 normal gameplay, 32 prototype-only

## Starting Repo State
Starting HEAD: `d7aed9a`

8 modified tracked files, 509 untracked paths before this lane outputs; dominated by fauna generated assets, small-life manifest, src/content.ts/src/helpers.ts, review artifacts, and asset build tooling.

## Benchmark Map
| Species | Asset key | Biome | Category | Frames | FPS | Manifest | Why benchmark |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nautilus | `fauna-shallow-nautilus` | 1 | established | 4 | 8 | `public/assets/generated/fauna-shallow-nautilus.frames.json` | named neutral-fauna benchmark requested by manager |
| Reef Squid | `fauna-shallow-squid` | 1 | established | 4 | 8 | `public/assets/generated/fauna-shallow-squid.frames.json` | named neutral-fauna benchmark requested by manager |
| Glass Squid | `fauna-deep-glass-squid` | 2 | established | 4 | 8 | `public/assets/generated/fauna-deep-glass-squid.frames.json` | named neutral-fauna benchmark requested by manager |
| Saffron Paddle Cuttle | `fauna-exp-saffron-paddle-cuttle` | 2 | newly-added | 3 | 7 | `public/assets/generated/fauna-exp-saffron-paddle-cuttle.frames.json` | cuttlefish-like runtime entry found for comparison against squid/cephalopod motion |
| Velvet Glass Cuttle | `fauna-exp-velvet-glass-cuttle` | 2 | newly-added | 3 | 7 | `public/assets/generated/fauna-exp-velvet-glass-cuttle.frames.json` | cuttlefish-like runtime entry found for comparison against squid/cephalopod motion |
| Bigfin Squid | `fauna-abyss-bigfin-squid` | 3 | established | 3 | 8 | `public/assets/generated/fauna-abyss-bigfin-squid.frames.json` | named neutral-fauna benchmark requested by manager |

## Newly Added Fauna Map
| Biome | New entries | Species / asset key / frames |
| --- | --- | --- |
| 1 | 31 | Opal Fan Shrimp (fauna-exp-opal-fan-shrimp, 3f), Ember Needle Pipefish (fauna-exp-ember-needle-pipefish, 3f), Prism Bell Jelly (fauna-exp-prism-bell-jelly, 3f), Cobalt Sawtail Minnow (fauna-exp-cobalt-sawtail-minnow, 3f), Ivory Spined Cardinal (fauna-exp-ivory-spined-cardinal, 3f), Amber Comb Blenny (fauna-exp-amber-comb-blenny, 3f), Blue Lantern Goby (fauna-exp-blue-lantern-goby, 3f), Obsidian Reef Wrasse (fauna-exp-obsidian-reef-wrasse, 3f), Silver Hinge Crab (fauna-exp-silver-hinge-crab, 3f), Kelp Arrow Squid (fauna-exp-kelp-arrow-squid, 3f), Basalt Lantern Seahorse (fauna-exp-basalt-lantern-seahorse, 3f), Nacre Thorn Clam (fauna-exp-nacre-thorn-clam, 3f), Aurora Fin Damselfish (fauna-exp-aurora-fin-damselfish, 3f), Ribbonjaw Cleaner Wrasse (fauna-exp-ribbonjaw-cleaner-wrasse, 3f), Mottle Reef Cowfish (fauna-exp-mottle-reef-cowfish, 3f), Glimmer Spine Urchin (fauna-exp-glimmer-spine-urchin, 3f), Reef Needle Snipefish (fauna-exp-reef-needle-snipefish, 3f), Copperglass Cardinal (fauna-exp-copperglass-cardinal, 3f), Pearl Eye Flounder (fauna-exp-pearl-eye-flounder, 3f), Teal Mask Filefish (fauna-exp-teal-mask-filefish, 3f), Goldbar Squirrelfish (fauna-exp-goldbar-squirrelfish, 3f), Night Reef Boxfish (fauna-exp-night-reef-boxfish, 3f), Copper Banded Seahorse (fauna-exp-copper-banded-seahorse, 3f), Midnight Hogfish (fauna-exp-midnight-hogfish, 3f), Opalstripe Tilefish (fauna-exp-opalstripe-tilefish, 3f), Shellback Garden Eel (fauna-exp-shellback-garden-eel, 3f), Brightscale Halfbeak (fauna-exp-brightscale-halfbeak, 3f), Lumeneye Squirrelfish (fauna-exp-lumeneye-squirrelfish, 3f), Opal Eye Mudskipper (fauna-exp-opal-eye-mudskipper, 3f), Tideglass Cardinal (fauna-exp-tideglass-cardinal, 3f), Amber Snout Boxfish (fauna-exp-amber-snout-boxfish, 3f) |
| 2 | 28 | Velvet Glass Cuttle (fauna-exp-velvet-glass-cuttle, 3f), Copper Ribbon Eel (fauna-exp-copper-ribbon-eel, 3f), Glass Helm Nautilus (fauna-exp-glass-helm-nautilus, 3f), Vent Pearl Copepod (fauna-exp-vent-pearl-copepod, 3f), Moonmask Lionfish (fauna-exp-moonmask-lionfish, 3f), Chimney Ghost Shrimp (fauna-exp-chimney-ghost-shrimp, 3f), Brass Knuckle Prawn (fauna-exp-brass-knuckle-prawn, 3f), Saffron Paddle Cuttle (fauna-exp-saffron-paddle-cuttle, 3f), Cinder Vent Clingfish (fauna-exp-cinder-vent-clingfish, 3f), Rustscale Hatchetfish (fauna-exp-rustscale-hatchetfish, 3f), Lumen Brow Barreleye (fauna-exp-lumen-brow-barreleye, 3f), Ivory Sail Chimaera (fauna-exp-ivory-sail-chimaera, 3f), Ashveil Butterflyfish (fauna-exp-ashveil-butterflyfish, 3f), Goldcap Tripodfish (fauna-exp-goldcap-tripodfish, 3f), Verdigris Parrotfish (fauna-exp-verdigris-parrotfish, 3f), Cyan Pulse Lanternfish (fauna-exp-cyan-pulse-lanternfish, 3f), Scarletline Hawkfish (fauna-exp-scarletline-hawkfish, 3f), Vent Jade Eelpout (fauna-exp-vent-jade-eelpout, 3f), Blueglass Anthias (fauna-exp-blueglass-anthias, 3f), Tin Plate Searobin (fauna-exp-tin-plate-searobin, 3f), Reef Amber Snapper (fauna-exp-reef-amber-snapper, 3f), Blackwater Hatchet (fauna-exp-blackwater-hatchet, 3f), Bluefire Dragonet (fauna-exp-bluefire-dragonet, 3f), Lumen Kite Ray (fauna-exp-lumen-kite-ray, 3f), Ventstripe Moray (fauna-exp-ventstripe-moray, 3f), Silvercap Grenadier (fauna-exp-silvercap-grenadier, 3f), Ghostfin Croaker (fauna-exp-ghostfin-croaker, 3f), Ghostplate Sea Moth (fauna-exp-ghostplate-sea-moth, 3f) |
| 3 | 23 | Glassjaw Viperfish (fauna-exp-glassjaw-viperfish, 3f), Abyssal Thread Eel (fauna-exp-abyssal-thread-eel, 3f), Twilight Surgeonfish (fauna-exp-twilight-surgeonfish, 3f), Obsidian Swallowtail (fauna-exp-obsidian-swallowtail, 3f), Cobalt Triggerfish (fauna-exp-cobalt-triggerfish, 3f), Snowcap Snailfish (fauna-exp-snowcap-snailfish, 3f), Ironmask Ratfish (fauna-exp-ironmask-ratfish, 3f), Pearlside Grunt (fauna-exp-pearlside-grunt, 3f), Saberfin Smelt (fauna-exp-saberfin-smelt, 3f), Brassstripe Fusilier (fauna-exp-brassstripe-fusilier, 3f), Starless Lantern Eel (fauna-exp-starless-lantern-eel, 3f), Moonspot Drumfish (fauna-exp-moonspot-drumfish, 3f), Hollow Eye Cusk (fauna-exp-hollow-eye-cusk, 3f), Knifecrest Snipe Eel (fauna-exp-knifecrest-snipe-eel, 3f), Rustjaw Blenny (fauna-exp-rustjaw-blenny, 3f), Onyx Frillshark Fry (fauna-exp-onyx-frillshark-fry, 3f), Black Velvet Cusk (fauna-exp-black-velvet-cusk, 3f), Sulfur Eye Hagfish (fauna-exp-sulfur-eye-hagfish, 3f), Halo Dot Lanternfish (fauna-exp-halo-dot-lanternfish, 3f), Ivory Ridge Rattail (fauna-exp-ivory-ridge-rattail, 3f), Neonbar Dartfish (fauna-exp-neonbar-dartfish, 3f), Bonefin Lantern Shark (fauna-exp-bonefin-lantern-shark, 3f), Emberjaw Bristlefish (fauna-exp-emberjaw-bristlefish, 3f) |
| 4 | 18 | Sable Razorfish (fauna-exp-sable-razorfish, 3f), Ancient Mask Angler (fauna-exp-ancient-mask-angler, 3f), Mirrorbone Hatchetfish (fauna-exp-mirrorbone-hatchetfish, 3f), Anchorfin Eel (fauna-exp-anchorfin-eel, 3f), Glassfin Fangtooth (fauna-exp-glassfin-fangtooth, 3f), Cobalt Gulper Fry (fauna-exp-cobalt-gulper-fry, 3f), Bonewhisker Brotula (fauna-exp-bonewhisker-brotula, 3f), Cinderstripe Cardinal (fauna-exp-cinderstripe-cardinal, 3f), Kelpglass Rockfish (fauna-exp-kelpglass-rockfish, 3f), Ivorymask Goatfish (fauna-exp-ivorymask-goatfish, 3f), Hadal Needlefish (fauna-exp-hadal-needlefish, 3f), Blueflame Grouperlet (fauna-exp-blueflame-grouperlet, 3f), Silverthread Needlefish (fauna-exp-silverthread-needlefish, 3f), Cinder Maw Dragonfish (fauna-exp-cinder-maw-dragonfish, 3f), Copperbelly Damselfish (fauna-exp-copperbelly-damselfish, 3f), Cathedral Fin Ribbonfish (fauna-exp-cathedral-fin-ribbonfish, 3f), Lattice Eye Barreleye (fauna-exp-lattice-eye-barreleye, 3f), Brineglass Snailfish (fauna-exp-brineglass-snailfish, 3f) |

## Integration Findings
- [src/scene.ts](/mnt/nxt-dev/water9/src/scene.ts:117) calls `loadGeneratedAssets` during preload.
- [src/helpers.ts](/mnt/nxt-dev/water9/src/helpers.ts:362) derives `CONTENT_SPRITESHEET_BASES` from every `biomeFish` `assetKey`, then [src/helpers.ts](/mnt/nxt-dev/water9/src/helpers.ts:384) loads `/assets/generated/<assetKey>.frames.json` and the packed PNG spritesheet.
- [src/scene-worldgen.ts](/mnt/nxt-dev/water9/src/scene-worldgen.ts:62) instantiates runtime fish directly from `biomeFish[state.biome]`; this is the source of the 138 normal-gameplay fish entries in the JSON.
- [src/scene-rendering.ts](/mnt/nxt-dev/water9/src/scene-rendering.ts:3348) computes animated frames from `fishFrameCount`; [src/scene-rendering.ts](/mnt/nxt-dev/water9/src/scene-rendering.ts:3350) uses the packed spritesheet when the manifest loaded and falls back to loose `<assetKey>-<frame>` textures otherwise. Because all content keys have manifests in this inventory, normal fish rendering should consume packed spritesheets.
- `public/assets/generated/small-life.manifest.json` mirrors the runtime fish set and is useful audit evidence, but gameplay derives loading from `src/content.ts`, not from that manifest.
- [src/articulated.ts](/mnt/nxt-dev/water9/src/articulated.ts:261) loads `public/assets/generated/articulated-creatures.parts.json` and all part textures; [src/articulated.ts](/mnt/nxt-dev/water9/src/articulated.ts:331) gates prototype spawns behind URL/query prototype flags, and [src/scene-articulated.ts](/mnt/nxt-dev/water9/src/scene-articulated.ts:712) spawns eligible creatures by biome and budget.
- Review/sandbox assets under `public/review/**` are not normal gameplay fish inputs unless a sandbox/review route explicitly loads them; they are not counted as runtime fish entries here.

## Missing / Partial / Placeholder Risks
- Missing/partial fish sprite entries: 0; duplicate shared-key fish entries are tracked separately because assets exist but two classic keys are reused across biomes.
- Fish content entries missing frame manifests: 0
- Fish content entries missing base PNGs: 0
- Fish content entries with missing loose frame proof files: 0
- Fish content entries with one or zero frames: 0
- Duplicate `assetKey` values in `biomeFish`: 2
- Articulated part texture placeholder risks: 0

## High-Risk Entries For Visual Lanes
| Species | Asset key | Biome | Reason |
| --- | --- | --- | --- |
| Black Swallower | `fauna-abyss-black-swallower` | 4 | duplicate-assetKey-in-content |
| Goblin Shark | `fauna-abyss-goblin-shark` | 4 | duplicate-assetKey-in-content |
| Black Swallower | `fauna-abyss-black-swallower` | 3 | duplicate-assetKey-in-content |
| Goblin Shark | `fauna-abyss-goblin-shark` | 3 | duplicate-assetKey-in-content |
| Opal Fan Shrimp | `fauna-exp-opal-fan-shrimp` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Ember Needle Pipefish | `fauna-exp-ember-needle-pipefish` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Prism Bell Jelly | `fauna-exp-prism-bell-jelly` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Silver Hinge Crab | `fauna-exp-silver-hinge-crab` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Kelp Arrow Squid | `fauna-exp-kelp-arrow-squid` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Basalt Lantern Seahorse | `fauna-exp-basalt-lantern-seahorse` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Nacre Thorn Clam | `fauna-exp-nacre-thorn-clam` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Glimmer Spine Urchin | `fauna-exp-glimmer-spine-urchin` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Pearl Eye Flounder | `fauna-exp-pearl-eye-flounder` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Copper Banded Seahorse | `fauna-exp-copper-banded-seahorse` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Shellback Garden Eel | `fauna-exp-shellback-garden-eel` | 1 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Velvet Glass Cuttle | `fauna-exp-velvet-glass-cuttle` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Copper Ribbon Eel | `fauna-exp-copper-ribbon-eel` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Vent Pearl Copepod | `fauna-exp-vent-pearl-copepod` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Chimney Ghost Shrimp | `fauna-exp-chimney-ghost-shrimp` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Brass Knuckle Prawn | `fauna-exp-brass-knuckle-prawn` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Saffron Paddle Cuttle | `fauna-exp-saffron-paddle-cuttle` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Ivory Sail Chimaera | `fauna-exp-ivory-sail-chimaera` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Vent Jade Eelpout | `fauna-exp-vent-jade-eelpout` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Lumen Kite Ray | `fauna-exp-lumen-kite-ray` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |
| Ventstripe Moray | `fauna-exp-ventstripe-moray` | 2 | new fauna uses 3 sprite frames despite complex/non-fish body plan |

## Confidence And Caveats
Confidence is high for runtime coverage because the inventory is derived from parsed `src/content.ts`, checked against runtime asset paths, and cross-checked with `small-life.manifest.json`. This lane did not visually appraise frame quality or live canvas motion; a 3-frame manifest is counted as integrated even if the actual images later prove to be visually static, copied, or low-quality. The normal/prototype articulated classification follows the current code paths and assumes no external URL flags unless noted.

## Verification Performed
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `d7aed9a`
- `git -C /mnt/nxt-dev/water9 status --short` captured before output creation and after investigation.
- Parsed `src/content.ts` with the TypeScript compiler API for `biomeFish`.
- Checked frame manifests/base PNGs/loose frame files under `public/assets/generated/`.
- Wrote JSON inventory: `runs/water9-fauna-animation-appraisal-2026-07-05/fauna-runtime-inventory.json`

## Git State After Investigation
```
 M public/assets/generated/fauna-abyss-viperfish-0.png
 M public/assets/generated/fauna-abyss-viperfish-1.png
 M public/assets/generated/fauna-abyss-viperfish-2.png
 M public/assets/generated/fauna-abyss-viperfish.frames.json
 M public/assets/generated/fauna-abyss-viperfish.png
 M public/assets/generated/small-life.manifest.json
 M src/content.ts
 M src/helpers.ts
?? public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png
?? public/assets/generated/exploration-life-2026-07-04/source/fauna-abyss-viperfish-bespoke-source-chroma.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-0.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-1.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-2.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel.frames.json
?? public/assets/generated/fauna-exp-abyssal-thread-eel.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-0.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-1.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-2.png
?? public/assets/generated/fauna-exp-amber-comb-blenny.frames.json
?? public/assets/generated/fauna-exp-amber-comb-blenny.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-0.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-1.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-2.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish.frames.json
?? public/assets/generated/fauna-exp-amber-snout-boxfish.png
?? public/assets/generated/fauna-exp-anchorfin-eel-0.png
?? public/assets/generated/fauna-exp-anchorfin-eel-1.png
?? public/assets/generated/fauna-exp-anchorfin-eel-2.png
?? public/assets/generated/fauna-exp-anchorfin-eel.frames.json
?? public/assets/generated/fauna-exp-anchorfin-eel.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-0.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-1.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-2.png
?? public/assets/generated/fauna-exp-ancient-mask-angler.frames.json
?? public/assets/generated/fauna-exp-ancient-mask-angler.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-0.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-1.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-2.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish.frames.json
?? public/assets/generated/fauna-exp-ashveil-butterflyfish.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-0.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-1.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-2.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish.frames.json
?? public/assets/generated/fauna-exp-aurora-fin-damselfish.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-0.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-1.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-2.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse.frames.json
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-0.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-1.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-2.png
?? public/assets/generated/fauna-exp-black-velvet-cusk.frames.json
?? public/assets/generated/fauna-exp-black-velvet-cusk.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-0.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-1.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-2.png
?? public/assets/generated/fauna-exp-blackwater-hatchet.frames.json
?? public/assets/generated/fauna-exp-blackwater-hatchet.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-0.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-1.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-2.png
?? public/assets/generated/fauna-exp-blue-lantern-goby.frames.json
?? public/assets/generated/fauna-exp-blue-lantern-goby.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-0.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-1.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-2.png
?? public/assets/generated/fauna-exp-bluefire-dragonet.frames.json
?? public/assets/generated/fauna-exp-bluefire-dragonet.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-0.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-1.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-2.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet.frames.json
?? public/assets/generated/fauna-exp-blueflame-grouperlet.png
?? public/assets/generated/fauna-exp-blueglass-anthias-0.png
?? public/assets/generated/fauna-exp-blueglass-anthias-1.png
?? public/assets/generated/fauna-exp-blueglass-anthias-2.png
?? public/assets/generated/fauna-exp-blueglass-anthias.frames.json
?? public/assets/generated/fauna-exp-blueglass-anthias.png
?? public/assets/generated/fauna-exp-bonefin-lantern-shark-0.png
?? public/assets/generated/fauna-exp-bonefin-lantern-shark-1.png
?? public/assets/generated/fauna-exp-bonefin-lantern-shark-2.png
?? public/assets/generated/fauna-exp-bonefin-lantern-shark.frames.json
?? public/assets/generated/fauna-exp-bonefin-lantern-shark.png
?? public/assets/generated/fauna-exp-bonewhisker-brotula-0.png
?? public/assets/generated/fauna-exp-bonewhisker-brotula-1.png
?? public/assets/generated/fauna-exp-bonewhisker-brotula-2.png
?? public/assets/generated/fauna-exp-bonewhisker-brotula.frames.json
?? public/assets/generated/fauna-exp-bonewhisker-brotula.png
?? public/assets/generated/fauna-exp-brass-knuckle-prawn-0.png
?? public/assets/generated/fauna-exp-brass-knuckle-prawn-1.png
?? public/assets/generated/fauna-exp-brass-knuckle-prawn-2.png
?? public/assets/generated/fauna-exp-brass-knuckle-prawn.frames.json
?? public/assets/generated/fauna-exp-brass-knuckle-prawn.png
?? public/assets/generated/fauna-exp-brassstripe-fusilier-0.png
?? public/assets/generated/fauna-exp-brassstripe-fusilier-1.png
?? public/assets/generated/fauna-exp-brassstripe-fusilier-2.png
?? public/assets/generated/fauna-exp-brassstripe-fusilier.frames.json
?? public/assets/generated/fauna-exp-brassstripe-fusilier.png
?? public/assets/generated/fauna-exp-brightscale-halfbeak-0.png
?? public/assets/generated/fauna-exp-brightscale-halfbeak-1.png
?? public/assets/generated/fauna-exp-brightscale-halfbeak-2.png
?? public/assets/generated/fauna-exp-brightscale-halfbeak.frames.json
?? public/assets/generated/fauna-exp-brightscale-halfbeak.png
?? public/assets/generated/fauna-exp-brineglass-snailfish-0.png
?? public/assets/generated/fauna-exp-brineglass-snailfish-1.png
?? public/assets/generated/fauna-exp-brineglass-snailfish-2.png
?? public/assets/generated/fauna-exp-brineglass-snailfish.frames.json
?? public/assets/generated/fauna-exp-brineglass-snailfish.png
?? public/assets/generated/fauna-exp-cathedral-fin-ribbonfish-0.png
?? public/assets/generated/fauna-exp-cathedral-fin-ribbonfish-1.png
?? public/assets/generated/fauna-exp-cathedral-fin-ribbonfish-2.png
?? public/assets/generated/fauna-exp-cathedral-fin-ribbonfish.frames.json
?? public/assets/generated/fauna-exp-cathedral-fin-ribbonfish.png
?? public/assets/generated/fauna-exp-chimney-ghost-shrimp-0.png
?? public/assets/generated/fauna-exp-chimney-ghost-shrimp-1.png
?? public/assets/generated/fauna-exp-chimney-ghost-shrimp-2.png
?? public/assets/generated/fauna-exp-chimney-ghost-shrimp.frames.json
?? public/assets/generated/fauna-exp-chimney-ghost-shrimp.png
?? public/assets/generated/fauna-exp-cinder-maw-dragonfish-0.png
?? public/assets/generated/fauna-exp-cinder-maw-dragonfish-1.png
?? public/assets/generated/fauna-exp-cinder-maw-dragonfish-2.png
?? public/assets/generated/fauna-exp-cinder-maw-dragonfish.frames.json
?? public/assets/generated/fauna-exp-cinder-maw-dragonfish.png
?? public/assets/generated/fauna-exp-cinder-vent-clingfish-0.png
?? public/assets/generated/fauna-exp-cinder-vent-clingfish-1.png
?? public/assets/generated/fauna-exp-cinder-vent-clingfish-2.png
?? public/assets/generated/fauna-exp-cinder-vent-clingfish.frames.json
?? public/assets/generated/fauna-exp-cinder-vent-clingfish.png
?? public/assets/generated/fauna-exp-cinderstripe-cardinal-0.png
?? public/assets/generated/fauna-exp-cinderstripe-cardinal-1.png
?? public/assets/generated/fauna-exp-cinderstripe-cardinal-2.png
?? public/assets/generated/fauna-exp-cinderstripe-cardinal.frames.json
?? public/assets/generated/fauna-exp-cinderstripe-cardinal.png
?? public/assets/generated/fauna-exp-cobalt-gulper-fry-0.png
?? public/assets/generated/fauna-exp-cobalt-gulper-fry-1.png
?? public/assets/generated/fauna-exp-cobalt-gulper-fry-2.png
?? public/assets/generated/fauna-exp-cobalt-gulper-fry.frames.json
?? public/assets/generated/fauna-exp-cobalt-gulper-fry.png
?? public/assets/generated/fauna-exp-cobalt-sawtail-minnow-0.png
?? public/assets/generated/fauna-exp-cobalt-sawtail-minnow-1.png
?? public/assets/generated/fauna-exp-cobalt-sawtail-minnow-2.png
?? public/assets/generated/fauna-exp-cobalt-sawtail-minnow.frames.json
?? public/assets/generated/fauna-exp-cobalt-sawtail-minnow.png
?? public/assets/generated/fauna-exp-cobalt-triggerfish-0.png
?? public/assets/generated/fauna-exp-cobalt-triggerfish-1.png
?? public/assets/generated/fauna-exp-cobalt-triggerfish-2.png
?? public/assets/generated/fauna-exp-cobalt-triggerfish.frames.json
?? public/assets/generated/fauna-exp-cobalt-triggerfish.png
?? public/assets/generated/fauna-exp-copper-banded-seahorse-0.png
?? public/assets/generated/fauna-exp-copper-banded-seahorse-1.png
?? public/assets/generated/fauna-exp-copper-banded-seahorse-2.png
?? public/assets/generated/fauna-exp-copper-banded-seahorse.frames.json
?? public/assets/generated/fauna-exp-copper-banded-seahorse.png
?? public/assets/generated/fauna-exp-copper-ribbon-eel-0.png
?? public/assets/generated/fauna-exp-copper-ribbon-eel-1.png
?? public/assets/generated/fauna-exp-copper-ribbon-eel-2.png
?? public/assets/generated/fauna-exp-copper-ribbon-eel.frames.json
?? public/assets/generated/fauna-exp-copper-ribbon-eel.png
?? public/assets/generated/fauna-exp-copperbelly-damselfish-0.png
?? public/assets/generated/fauna-exp-copperbelly-damselfish-1.png
?? public/assets/generated/fauna-exp-copperbelly-damselfish-2.png
?? public/assets/generated/fauna-exp-copperbelly-damselfish.frames.json
?? public/assets/generated/fauna-exp-copperbelly-damselfish.png
?? public/assets/generated/fauna-exp-copperglass-cardinal-0.png
?? public/assets/generated/fauna-exp-copperglass-cardinal-1.png
?? public/assets/generated/fauna-exp-copperglass-cardinal-2.png
?? public/assets/generated/fauna-exp-copperglass-cardinal.frames.json
?? public/assets/generated/fauna-exp-copperglass-cardinal.png
?? public/assets/generated/fauna-exp-cyan-pulse-lanternfish-0.png
?? public/assets/generated/fauna-exp-cyan-pulse-lanternfish-1.png
?? public/assets/generated/fauna-exp-cyan-pulse-lanternfish-2.png
?? public/assets/generated/fauna-exp-cyan-pulse-lanternfish.frames.json
?? public/assets/generated/fauna-exp-cyan-pulse-lanternfish.png
?? public/assets/generated/fauna-exp-ember-needle-pipefish-0.png
?? public/assets/generated/fauna-exp-ember-needle-pipefish-1.png
?? public/assets/generated/fauna-exp-ember-needle-pipefish-2.png
?? public/assets/generated/fauna-exp-ember-needle-pipefish.frames.json
?? public/assets/generated/fauna-exp-ember-needle-pipefish.png
?? public/assets/generated/fauna-exp-emberjaw-bristlefish-0.png
?? public/assets/generated/fauna-exp-emberjaw-bristlefish-1.png
?? public/assets/generated/fauna-exp-emberjaw-bristlefish-2.png
?? public/assets/generated/fauna-exp-emberjaw-bristlefish.frames.json
?? public/assets/generated/fauna-exp-emberjaw-bristlefish.png
?? public/assets/generated/fauna-exp-ghostfin-croaker-0.png
?? public/assets/generated/fauna-exp-ghostfin-croaker-1.png
?? public/assets/generated/fauna-exp-ghostfin-croaker-2.png
?? public/assets/generated/fauna-exp-ghostfin-croaker.frames.json
?? public/assets/generated/fauna-exp-ghostfin-croaker.png
?? public/assets/generated/fauna-exp-ghostplate-sea-moth-0.png
?? public/assets/generated/fauna-exp-ghostplate-sea-moth-1.png
?? public/assets/generated/fauna-exp-ghostplate-sea-moth-2.png
?? public/assets/generated/fauna-exp-ghostplate-sea-moth.frames.json
?? public/assets/generated/fauna-exp-ghostplate-sea-moth.png
?? public/assets/generated/fauna-exp-glass-helm-nautilus-0.png
?? public/assets/generated/fauna-exp-glass-helm-nautilus-1.png
?? public/assets/generated/fauna-exp-glass-helm-nautilus-2.png
?? public/assets/generated/fauna-exp-glass-helm-nautilus.frames.json
?? public/assets/generated/fauna-exp-glass-helm-nautilus.png
?? public/assets/generated/fauna-exp-glassfin-fangtooth-0.png
?? public/assets/generated/fauna-exp-glassfin-fangtooth-1.png
?? public/assets/generated/fauna-exp-glassfin-fangtooth-2.png
?? public/assets/generated/fauna-exp-glassfin-fangtooth.frames.json
?? public/assets/generated/fauna-exp-glassfin-fangtooth.png
?? public/assets/generated/fauna-exp-glassjaw-viperfish-0.png
?? public/assets/generated/fauna-exp-glassjaw-viperfish-1.png
?? public/assets/generated/fauna-exp-glassjaw-viperfish-2.png
?? public/assets/generated/fauna-exp-glassjaw-viperfish.frames.json
?? public/assets/generated/fauna-exp-glassjaw-viperfish.png
?? public/assets/generated/fauna-exp-glimmer-spine-urchin-0.png
?? public/assets/generated/fauna-exp-glimmer-spine-urchin-1.png
?? public/assets/generated/fauna-exp-glimmer-spine-urchin-2.png
?? public/assets/generated/fauna-exp-glimmer-spine-urchin.frames.json
?? public/assets/generated/fauna-exp-glimmer-spine-urchin.png
?? public/assets/generated/fauna-exp-goldbar-squirrelfish-0.png
?? public/assets/generated/fauna-exp-goldbar-squirrelfish-1.png
?? public/assets/generated/fauna-exp-goldbar-squirrelfish-2.png
?? public/assets/generated/fauna-exp-goldbar-squirrelfish.frames.json
?? public/assets/generated/fauna-exp-goldbar-squirrelfish.png
?? public/assets/generated/fauna-exp-goldcap-tripodfish-0.png
?? public/assets/generated/fauna-exp-goldcap-tripodfish-1.png
?? public/assets/generated/fauna-exp-goldcap-tripodfish-2.png
?? public/assets/generated/fauna-exp-goldcap-tripodfish.frames.json
?? public/assets/generated/fauna-exp-goldcap-tripodfish.png
?? public/assets/generated/fauna-exp-hadal-needlefish-0.png
?? public/assets/generated/fauna-exp-hadal-needlefish-1.png
?? public/assets/generated/fauna-exp-hadal-needlefish-2.png
?? public/assets/generated/fauna-exp-hadal-needlefish.frames.json
?? public/assets/generated/fauna-exp-hadal-needlefish.png
?? public/assets/generated/fauna-exp-halo-dot-lanternfish-0.png
?? public/assets/generated/fauna-exp-halo-dot-lanternfish-1.png
?? public/assets/generated/fauna-exp-halo-dot-lanternfish-2.png
?? public/assets/generated/fauna-exp-halo-dot-lanternfish.frames.json
?? public/assets/generated/fauna-exp-halo-dot-lanternfish.png
?? public/assets/generated/fauna-exp-hollow-eye-cusk-0.png
?? public/assets/generated/fauna-exp-hollow-eye-cusk-1.png
?? public/assets/generated/fauna-exp-hollow-eye-cusk-2.png
?? public/assets/generated/fauna-exp-hollow-eye-cusk.frames.json
?? public/assets/generated/fauna-exp-hollow-eye-cusk.png
?? public/assets/generated/fauna-exp-ironmask-ratfish-0.png
?? public/assets/generated/fauna-exp-ironmask-ratfish-1.png
?? public/assets/generated/fauna-exp-ironmask-ratfish-2.png
?? public/assets/generated/fauna-exp-ironmask-ratfish.frames.json
?? public/assets/generated/fauna-exp-ironmask-ratfish.png
?? public/assets/generated/fauna-exp-ivory-ridge-rattail-0.png
?? public/assets/generated/fauna-exp-ivory-ridge-rattail-1.png
?? public/assets/generated/fauna-exp-ivory-ridge-rattail-2.png
?? public/assets/generated/fauna-exp-ivory-ridge-rattail.frames.json
?? public/assets/generated/fauna-exp-ivory-ridge-rattail.png
?? public/assets/generated/fauna-exp-ivory-sail-chimaera-0.png
?? public/assets/generated/fauna-exp-ivory-sail-chimaera-1.png
?? public/assets/generated/fauna-exp-ivory-sail-chimaera-2.png
?? public/assets/generated/fauna-exp-ivory-sail-chimaera.frames.json
?? public/assets/generated/fauna-exp-ivory-sail-chimaera.png
?? public/assets/generated/fauna-exp-ivory-spined-cardinal-0.png
?? public/assets/generated/fauna-exp-ivory-spined-cardinal-1.png
?? public/assets/generated/fauna-exp-ivory-spined-cardinal-2.png
?? public/assets/generated/fauna-exp-ivory-spined-cardinal.frames.json
?? public/assets/generated/fauna-exp-ivory-spined-cardinal.png
?? public/assets/generated/fauna-exp-ivorymask-goatfish-0.png
?? public/assets/generated/fauna-exp-ivorymask-goatfish-1.png
?? public/assets/generated/fauna-exp-ivorymask-goatfish-2.png
?? public/assets/generated/fauna-exp-ivorymask-goatfish.frames.json
?? public/assets/generated/fauna-exp-ivorymask-goatfish.png
?? public/assets/generated/fauna-exp-kelp-arrow-squid-0.png
?? public/assets/generated/fauna-exp-kelp-arrow-squid-1.png
?? public/assets/generated/fauna-exp-kelp-arrow-squid-2.png
?? public/assets/generated/fauna-exp-kelp-arrow-squid.frames.json
?? public/assets/generated/fauna-exp-kelp-arrow-squid.png
?? public/assets/generated/fauna-exp-kelpglass-rockfish-0.png
?? public/assets/generated/fauna-exp-kelpglass-rockfish-1.png
?? public/assets/generated/fauna-exp-kelpglass-rockfish-2.png
?? public/assets/generated/fauna-exp-kelpglass-rockfish.frames.json
?? public/assets/generated/fauna-exp-kelpglass-rockfish.png
?? public/assets/generated/fauna-exp-knifecrest-snipe-eel-0.png
?? public/assets/generated/fauna-exp-knifecrest-snipe-eel-1.png
?? public/assets/generated/fauna-exp-knifecrest-snipe-eel-2.png
?? public/assets/generated/fauna-exp-knifecrest-snipe-eel.frames.json
?? public/assets/generated/fauna-exp-knifecrest-snipe-eel.png
?? public/assets/generated/fauna-exp-lattice-eye-barreleye-0.png
?? public/assets/generated/fauna-exp-lattice-eye-barreleye-1.png
?? public/assets/generated/fauna-exp-lattice-eye-barreleye-2.png
?? public/assets/generated/fauna-exp-lattice-eye-barreleye.frames.json
?? public/assets/generated/fauna-exp-lattice-eye-barreleye.png
?? public/assets/generated/fauna-exp-lumen-brow-barreleye-0.png
?? public/assets/generated/fauna-exp-lumen-brow-barreleye-1.png
?? public/assets/generated/fauna-exp-lumen-brow-barreleye-2.png
?? public/assets/generated/fauna-exp-lumen-brow-barreleye.frames.json
?? public/assets/generated/fauna-exp-lumen-brow-barreleye.png
?? public/assets/generated/fauna-exp-lumen-kite-ray-0.png
?? public/assets/generated/fauna-exp-lumen-kite-ray-1.png
?? public/assets/generated/fauna-exp-lumen-kite-ray-2.png
?? public/assets/generated/fauna-exp-lumen-kite-ray.frames.json
?? public/assets/generated/fauna-exp-lumen-kite-ray.png
?? public/assets/generated/fauna-exp-lumeneye-squirrelfish-0.png
?? public/assets/generated/fauna-exp-lumeneye-squirrelfish-1.png
?? public/assets/generated/fauna-exp-lumeneye-squirrelfish-2.png
?? public/assets/generated/fauna-exp-lumeneye-squirrelfish.frames.json
?? public/assets/generated/fauna-exp-lumeneye-squirrelfish.png
?? public/assets/generated/fauna-exp-midnight-hogfish-0.png
?? public/assets/generated/fauna-exp-midnight-hogfish-1.png
?? public/assets/generated/fauna-exp-midnight-hogfish-2.png
?? public/assets/generated/fauna-exp-midnight-hogfish.frames.json
?? public/assets/generated/fauna-exp-midnight-hogfish.png
?? public/assets/generated/fauna-exp-mirrorbone-hatchetfish-0.png
?? public/assets/generated/fauna-exp-mirrorbone-hatchetfish-1.png
?? public/assets/generated/fauna-exp-mirrorbone-hatchetfish-2.png
?? public/assets/generated/fauna-exp-mirrorbone-hatchetfish.frames.json
?? public/assets/generated/fauna-exp-mirrorbone-hatchetfish.png
?? public/assets/generated/fauna-exp-moonmask-lionfish-0.png
?? public/assets/generated/fauna-exp-moonmask-lionfish-1.png
?? public/assets/generated/fauna-exp-moonmask-lionfish-2.png
?? public/assets/generated/fauna-exp-moonmask-lionfish.frames.json
?? public/assets/generated/fauna-exp-moonmask-lionfish.png
?? public/assets/generated/fauna-exp-moonspot-drumfish-0.png
?? public/assets/generated/fauna-exp-moonspot-drumfish-1.png
?? public/assets/generated/fauna-exp-moonspot-drumfish-2.png
?? public/assets/generated/fauna-exp-moonspot-drumfish.frames.json
?? public/assets/generated/fauna-exp-moonspot-drumfish.png
?? public/assets/generated/fauna-exp-mottle-reef-cowfish-0.png
?? public/assets/generated/fauna-exp-mottle-reef-cowfish-1.png
?? public/assets/generated/fauna-exp-mottle-reef-cowfish-2.png
?? public/assets/generated/fauna-exp-mottle-reef-cowfish.frames.json
?? public/assets/generated/fauna-exp-mottle-reef-cowfish.png
?? public/assets/generated/fauna-exp-nacre-thorn-clam-0.png
?? public/assets/generated/fauna-exp-nacre-thorn-clam-1.png
?? public/assets/generated/fauna-exp-nacre-thorn-clam-2.png
?? public/assets/generated/fauna-exp-nacre-thorn-clam.frames.json
?? public/assets/generated/fauna-exp-nacre-thorn-clam.png
?? public/assets/generated/fauna-exp-neonbar-dartfish-0.png
?? public/assets/generated/fauna-exp-neonbar-dartfish-1.png
?? public/assets/generated/fauna-exp-neonbar-dartfish-2.png
?? public/assets/generated/fauna-exp-neonbar-dartfish.frames.json
?? public/assets/generated/fauna-exp-neonbar-dartfish.png
?? public/assets/generated/fauna-exp-night-reef-boxfish-0.png
?? public/assets/generated/fauna-exp-night-reef-boxfish-1.png
?? public/assets/generated/fauna-exp-night-reef-boxfish-2.png
?? public/assets/generated/fauna-exp-night-reef-boxfish.frames.json
?? public/assets/generated/fauna-exp-night-reef-boxfish.png
?? public/assets/generated/fauna-exp-obsidian-reef-wrasse-0.png
?? public/assets/generated/fauna-exp-obsidian-reef-wrasse-1.png
?? public/assets/generated/fauna-exp-obsidian-reef-wrasse-2.png
?? public/assets/generated/fauna-exp-obsidian-reef-wrasse.frames.json
?? public/assets/generated/fauna-exp-obsidian-reef-wrasse.png
?? public/assets/generated/fauna-exp-obsidian-swallowtail-0.png
?? public/assets/generated/fauna-exp-obsidian-swallowtail-1.png
?? public/assets/generated/fauna-exp-obsidian-swallowtail-2.png
?? public/assets/generated/fauna-exp-obsidian-swallowtail.frames.json
?? public/assets/generated/fauna-exp-obsidian-swallowtail.png
?? public/assets/generated/fauna-exp-onyx-frillshark-fry-0.png
?? public/assets/generated/fauna-exp-onyx-frillshark-fry-1.png
?? public/assets/generated/fauna-exp-onyx-frillshark-fry-2.png
?? public/assets/generated/fauna-exp-onyx-frillshark-fry.frames.json
?? public/assets/generated/fauna-exp-onyx-frillshark-fry.png
?? public/assets/generated/fauna-exp-opal-eye-mudskipper-0.png
?? public/assets/generated/fauna-exp-opal-eye-mudskipper-1.png
?? public/assets/generated/fauna-exp-opal-eye-mudskipper-2.png
?? public/assets/generated/fauna-exp-opal-eye-mudskipper.frames.json
?? public/assets/generated/fauna-exp-opal-eye-mudskipper.png
?? public/assets/generated/fauna-exp-opal-fan-shrimp-0.png
?? public/assets/generated/fauna-exp-opal-fan-shrimp-1.png
?? public/assets/generated/fauna-exp-opal-fan-shrimp-2.png
?? public/assets/generated/fauna-exp-opal-fan-shrimp.frames.json
?? public/assets/generated/fauna-exp-opal-fan-shrimp.png
?? public/assets/generated/fauna-exp-opalstripe-tilefish-0.png
?? public/assets/generated/fauna-exp-opalstripe-tilefish-1.png
?? public/assets/generated/fauna-exp-opalstripe-tilefish-2.png
?? public/assets/generated/fauna-exp-opalstripe-tilefish.frames.json
?? public/assets/generated/fauna-exp-opalstripe-tilefish.png
?? public/assets/generated/fauna-exp-pearl-eye-flounder-0.png
?? public/assets/generated/fauna-exp-pearl-eye-flounder-1.png
?? public/assets/generated/fauna-exp-pearl-eye-flounder-2.png
?? public/assets/generated/fauna-exp-pearl-eye-flounder.frames.json
?? public/assets/generated/fauna-exp-pearl-eye-flounder.png
?? public/assets/generated/fauna-exp-pearlside-grunt-0.png
?? public/assets/generated/fauna-exp-pearlside-grunt-1.png
?? public/assets/generated/fauna-exp-pearlside-grunt-2.png
?? public/assets/generated/fauna-exp-pearlside-grunt.frames.json
?? public/assets/generated/fauna-exp-pearlside-grunt.png
?? public/assets/generated/fauna-exp-prism-bell-jelly-0.png
?? public/assets/generated/fauna-exp-prism-bell-jelly-1.png
?? public/assets/generated/fauna-exp-prism-bell-jelly-2.png
?? public/assets/generated/fauna-exp-prism-bell-jelly.frames.json
?? public/assets/generated/fauna-exp-prism-bell-jelly.png
?? public/assets/generated/fauna-exp-reef-amber-snapper-0.png
?? public/assets/generated/fauna-exp-reef-amber-snapper-1.png
?? public/assets/generated/fauna-exp-reef-amber-snapper-2.png
?? public/assets/generated/fauna-exp-reef-amber-snapper.frames.json
?? public/assets/generated/fauna-exp-reef-amber-snapper.png
?? public/assets/generated/fauna-exp-reef-needle-snipefish-0.png
?? public/assets/generated/fauna-exp-reef-needle-snipefish-1.png
?? public/assets/generated/fauna-exp-reef-needle-snipefish-2.png
?? public/assets/generated/fauna-exp-reef-needle-snipefish.frames.json
?? public/assets/generated/fauna-exp-reef-needle-snipefish.png
?? public/assets/generated/fauna-exp-ribbonjaw-cleaner-wrasse-0.png
?? public/assets/generated/fauna-exp-ribbonjaw-cleaner-wrasse-1.png
?? public/assets/generated/fauna-exp-ribbonjaw-cleaner-wrasse-2.png
?? public/assets/generated/fauna-exp-ribbonjaw-cleaner-wrasse.frames.json
?? public/assets/generated/fauna-exp-ribbonjaw-cleaner-wrasse.png
?? public/assets/generated/fauna-exp-rustjaw-blenny-0.png
?? public/assets/generated/fauna-exp-rustjaw-blenny-1.png
?? public/assets/generated/fauna-exp-rustjaw-blenny-2.png
?? public/assets/generated/fauna-exp-rustjaw-blenny.frames.json
?? public/assets/generated/fauna-exp-rustjaw-blenny.png
?? public/assets/generated/fauna-exp-rustscale-hatchetfish-0.png
?? public/assets/generated/fauna-exp-rustscale-hatchetfish-1.png
?? public/assets/generated/fauna-exp-rustscale-hatchetfish-2.png
?? public/assets/generated/fauna-exp-rustscale-hatchetfish.frames.json
?? public/assets/generated/fauna-exp-rustscale-hatchetfish.png
?? public/assets/generated/fauna-exp-saberfin-smelt-0.png
?? public/assets/generated/fauna-exp-saberfin-smelt-1.png
?? public/assets/generated/fauna-exp-saberfin-smelt-2.png
?? public/assets/generated/fauna-exp-saberfin-smelt.frames.json
?? public/assets/generated/fauna-exp-saberfin-smelt.png
?? public/assets/generated/fauna-exp-sable-razorfish-0.png
?? public/assets/generated/fauna-exp-sable-razorfish-1.png
?? public/assets/generated/fauna-exp-sable-razorfish-2.png
?? public/assets/generated/fauna-exp-sable-razorfish.frames.json
?? public/assets/generated/fauna-exp-sable-razorfish.png
?? public/assets/generated/fauna-exp-saffron-paddle-cuttle-0.png
?? public/assets/generated/fauna-exp-saffron-paddle-cuttle-1.png
?? public/assets/generated/fauna-exp-saffron-paddle-cuttle-2.png
?? public/assets/generated/fauna-exp-saffron-paddle-cuttle.frames.json
?? public/assets/generated/fauna-exp-saffron-paddle-cuttle.png
?? public/assets/generated/fauna-exp-scarletline-hawkfish-0.png
?? public/assets/generated/fauna-exp-scarletline-hawkfish-1.png
?? public/assets/generated/fauna-exp-scarletline-hawkfish-2.png
?? public/assets/generated/fauna-exp-scarletline-hawkfish.frames.json
?? public/assets/generated/fauna-exp-scarletline-hawkfish.png
?? public/assets/generated/fauna-exp-shellback-garden-eel-0.png
?? public/assets/generated/fauna-exp-shellback-garden-eel-1.png
?? public/assets/generated/fauna-exp-shellback-garden-eel-2.png
?? public/assets/generated/fauna-exp-shellback-garden-eel.frames.json
?? public/assets/generated/fauna-exp-shellback-garden-eel.png
?? public/assets/generated/fauna-exp-silver-hinge-crab-0.png
?? public/assets/generated/fauna-exp-silver-hinge-crab-1.png
?? public/assets/generated/fauna-exp-silver-hinge-crab-2.png
?? public/assets/generated/fauna-exp-silver-hinge-crab.frames.json
?? public/assets/generated/fauna-exp-silver-hinge-crab.png
?? public/assets/generated/fauna-exp-silvercap-grenadier-0.png
?? public/assets/generated/fauna-exp-silvercap-grenadier-1.png
?? public/assets/generated/fauna-exp-silvercap-grenadier-2.png
?? public/assets/generated/fauna-exp-silvercap-grenadier.frames.json
?? public/assets/generated/fauna-exp-silvercap-grenadier.png
?? public/assets/generated/fauna-exp-silverthread-needlefish-0.png
?? public/assets/generated/fauna-exp-silverthread-needlefish-1.png
?? public/assets/generated/fauna-exp-silverthread-needlefish-2.png
?? public/assets/generated/fauna-exp-silverthread-needlefish.frames.json
?? public/assets/generated/fauna-exp-silverthread-needlefish.png
?? public/assets/generated/fauna-exp-snowcap-snailfish-0.png
?? public/assets/generated/fauna-exp-snowcap-snailfish-1.png
?? public/assets/generated/fauna-exp-snowcap-snailfish-2.png
?? public/assets/generated/fauna-exp-snowcap-snailfish.frames.json
?? public/assets/generated/fauna-exp-snowcap-snailfish.png
?? public/assets/generated/fauna-exp-starless-lantern-eel-0.png
?? public/assets/generated/fauna-exp-starless-lantern-eel-1.png
?? public/assets/generated/fauna-exp-starless-lantern-eel-2.png
?? public/assets/generated/fauna-exp-starless-lantern-eel.frames.json
?? public/assets/generated/fauna-exp-starless-lantern-eel.png
?? public/assets/generated/fauna-exp-sulfur-eye-hagfish-0.png
?? public/assets/generated/fauna-exp-sulfur-eye-hagfish-1.png
?? public/assets/generated/fauna-exp-sulfur-eye-hagfish-2.png
?? public/assets/generated/fauna-exp-sulfur-eye-hagfish.frames.json
?? public/assets/generated/fauna-exp-sulfur-eye-hagfish.png
?? public/assets/generated/fauna-exp-teal-mask-filefish-0.png
?? public/assets/generated/fauna-exp-teal-mask-filefish-1.png
?? public/assets/generated/fauna-exp-teal-mask-filefish-2.png
?? public/assets/generated/fauna-exp-teal-mask-filefish.frames.json
?? public/assets/generated/fauna-exp-teal-mask-filefish.png
?? public/assets/generated/fauna-exp-tideglass-cardinal-0.png
?? public/assets/generated/fauna-exp-tideglass-cardinal-1.png
?? public/assets/generated/fauna-exp-tideglass-cardinal-2.png
?? public/assets/generated/fauna-exp-tideglass-cardinal.frames.json
?? public/assets/generated/fauna-exp-tideglass-cardinal.png
?? public/assets/generated/fauna-exp-tin-plate-searobin-0.png
?? public/assets/generated/fauna-exp-tin-plate-searobin-1.png
?? public/assets/generated/fauna-exp-tin-plate-searobin-2.png
?? public/assets/generated/fauna-exp-tin-plate-searobin.frames.json
?? public/assets/generated/fauna-exp-tin-plate-searobin.png
?? public/assets/generated/fauna-exp-twilight-surgeonfish-0.png
?? public/assets/generated/fauna-exp-twilight-surgeonfish-1.png
?? public/assets/generated/fauna-exp-twilight-surgeonfish-2.png
?? public/assets/generated/fauna-exp-twilight-surgeonfish.frames.json
?? public/assets/generated/fauna-exp-twilight-surgeonfish.png
?? public/assets/generated/fauna-exp-velvet-glass-cuttle-0.png
?? public/assets/generated/fauna-exp-velvet-glass-cuttle-1.png
?? public/assets/generated/fauna-exp-velvet-glass-cuttle-2.png
?? public/assets/generated/fauna-exp-velvet-glass-cuttle.frames.json
?? public/assets/generated/fauna-exp-velvet-glass-cuttle.png
?? public/assets/generated/fauna-exp-vent-jade-eelpout-0.png
?? public/assets/generated/fauna-exp-vent-jade-eelpout-1.png
?? public/assets/generated/fauna-exp-vent-jade-eelpout-2.png
?? public/assets/generated/fauna-exp-vent-jade-eelpout.frames.json
?? public/assets/generated/fauna-exp-vent-jade-eelpout.png
?? public/assets/generated/fauna-exp-vent-pearl-copepod-0.png
?? public/assets/generated/fauna-exp-vent-pearl-copepod-1.png
?? public/assets/generated/fauna-exp-vent-pearl-copepod-2.png
?? public/assets/generated/fauna-exp-vent-pearl-copepod.frames.json
?? public/assets/generated/fauna-exp-vent-pearl-copepod.png
?? public/assets/generated/fauna-exp-ventstripe-moray-0.png
?? public/assets/generated/fauna-exp-ventstripe-moray-1.png
?? public/assets/generated/fauna-exp-ventstripe-moray-2.png
?? public/assets/generated/fauna-exp-ventstripe-moray.frames.json
?? public/assets/generated/fauna-exp-ventstripe-moray.png
?? public/assets/generated/fauna-exp-verdigris-parrotfish-0.png
?? public/assets/generated/fauna-exp-verdigris-parrotfish-1.png
?? public/assets/generated/fauna-exp-verdigris-parrotfish-2.png
?? public/assets/generated/fauna-exp-verdigris-parrotfish.frames.json
?? public/assets/generated/fauna-exp-verdigris-parrotfish.png
?? public/review/exploration-life-2026-07-04/fauna-abyss-viperfish-bespoke-final-alpha-preview.png
?? public/review/exploration-life-2026-07-04/fauna-abyss-viperfish-bespoke-key-preview.png
?? public/review/exploration-life-2026-07-04/runtime-animation-contact-sheet.png
?? public/review/exploration-life-2026-07-04/runtime-contact-sheet.png
?? runs/water9-fauna-animation-appraisal-2026-07-05/
?? runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.md
?? runs/water9-ore-anchor-b2-overlay-fix-2026-07-05.prompt.md
?? tools/build_exploration_fauna_runtime_assets.py
?? runs/water9-fauna-animation-appraisal-2026-07-05/fauna-runtime-inventory.json
?? runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md
```
