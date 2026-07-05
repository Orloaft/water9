# Water9 fauna animation upgrade triage and imagegen plan

Repo/head: `/mnt/nxt-dev/water9` at `d7aed9a`. This lane is planning only; it did not edit source or runtime assets.

Inputs read:
- `runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`
- `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-metrics.json`
- `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-report.md`
- `tools/build_exploration_fauna_runtime_assets.py`
- `public/assets/generated/exploration-life-2026-07-04/manifest.json`

## Summary

- Runtime scope: 100 normal-gameplay `fauna-exp-*` entries, all currently 3-frame sheets at 7 fps.
- Appraisal evidence: metrics show the new set has median alpha delta 0.153 vs benchmark median 0.260, median area drift 0.002 vs benchmark 0.111, median near-duplicate 0.910 vs benchmark 0.870, and very low lighting/palette variance.
- Builder finding: `tools/build_exploration_fauna_runtime_assets.py` keeps a single alpha cutout intact and applies 3-frame mesh/scale warps. That is adequate for some long eel bodies but weak for compact fish and complex fauna.
- Source strategy: 20 entries need fresh chroma-key source/imagegen, 80 entries should be rebuilt from existing alpha with stronger frame construction.
- Implementation target: prefer 4-frame 8 fps loops for upgraded entries, with species-specific masks/poses instead of global whole-bitmap deformation. A 3-frame loop should remain only if live proof clearly beats the benchmark read.

## Top queue

1. `fauna-exp-nacre-thorn-clam` - Nacre Thorn Clam - P0-known-failure - nautilus/shell - fresh-source-imagegen - score 191, shortcut 9, alpha 0.0416, dup 0.9385, area 0.0168
   - Risk: Known FAIL. Near-static shell, alpha delta 0.042, near-duplicate 0.939, tiny open/bob only.
2. `fauna-exp-saffron-paddle-cuttle` - Saffron Paddle Cuttle - P0-known-failure - cephalopod/cuttle/squid - fresh-source-imagegen - score 177, shortcut 8, alpha 0.0725, dup 0.9168, area 0.0111
   - Risk: Known WEAK. Polished static cuttle with small edge/fin/tentacle warp, alpha delta 0.073.
3. `fauna-exp-prism-bell-jelly` - Prism Bell Jelly - P0-known-failure - jelly/pulse - fresh-source-imagegen - score 180, shortcut 8, alpha 0.0747, dup 0.9255, area 0.0195
   - Risk: Known WEAK. Tentacles twitch but bell/body remains locked, alpha delta 0.075.
4. `fauna-exp-snowcap-snailfish` - Snowcap Snailfish - P0-known-failure - ordinary fish - local-frame-rebuild - score 143, shortcut 6, alpha 0.1021, dup 0.9334, area 0.0004
   - Risk: Known WEAK. Soft fish body is effectively same painting with tail/outline twitch.
5. `fauna-exp-lumen-brow-barreleye` - Lumen Brow Barreleye - P0-known-failure - ordinary fish - local-frame-rebuild - score 140, shortcut 6, alpha 0.1095, dup 0.9384, area 0.0022
   - Risk: Known WEAK. Fin/tail-only motion, locked body and glass head.
6. `fauna-exp-glass-helm-nautilus` - Glass Helm Nautilus - P0-known-failure - nautilus/shell - fresh-source-imagegen - score 145, shortcut 5, alpha 0.0971, dup 0.8923, area 0.0021
   - Risk: Known WEAK. Shell/body nearly static compared with established Nautilus.
7. `fauna-exp-ashveil-butterflyfish` - Ashveil Butterflyfish - P0-known-failure - ordinary fish - local-frame-rebuild - score 131, shortcut 5, alpha 0.0886, dup 0.9131, area 0.0004
   - Risk: Known WEAK. Tall disk body and fins read as a locked still with edge twitch.
8. `fauna-exp-rustjaw-blenny` - Rustjaw Blenny - P0-known-failure - ordinary fish - local-frame-rebuild - score 122, shortcut 5, alpha 0.1005, dup 0.9, area 0.0015
   - Risk: Known WEAK. Body texture and head stay fixed while outline/tail twitches.
9. `fauna-exp-pearl-eye-flounder` - Pearl Eye Flounder - P0-known-failure - flat/ray/flounder - fresh-source-imagegen - score 138, shortcut 5, alpha 0.1016, dup 0.9076, area 0.001
   - Risk: Known WEAK. Flat body barely ripples and needs traveling fin-wave readability.
10. `fauna-exp-aurora-fin-damselfish` - Aurora Fin Damselfish - P0-known-failure - ordinary fish - local-frame-rebuild - score 126, shortcut 5, alpha 0.1042, dup 0.9132, area 0.001
   - Risk: Known WEAK. Bright compact fish with tail/fin twitch and near-zero area drift.
11. `fauna-exp-cinder-vent-clingfish` - Cinder Vent Clingfish - P0-known-failure - ordinary fish - local-frame-rebuild - score 125, shortcut 5, alpha 0.1062, dup 0.9247, area 0.0015
   - Risk: Known WEAK. Bottom-hugging fish is too static; fins should crawl/brace.
12. `fauna-exp-moonspot-drumfish` - Moonspot Drumfish - P0-known-failure - ordinary fish - local-frame-rebuild - score 126, shortcut 5, alpha 0.1079, dup 0.9201, area 0.0002
   - Risk: Known WEAK. Round fish silhouette and markings are locked; tail beat is too small.
13. `fauna-exp-lumen-kite-ray` - Lumen Kite Ray - P1-fresh-source - flat/ray/flounder - fresh-source-imagegen - score 91, shortcut 4, alpha 0.1573, dup 0.9478, area 0.0028
   - Risk: Complex flat/ray/flounder silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.
14. `fauna-exp-obsidian-reef-wrasse` - Obsidian Reef Wrasse - P2-local-high-risk - ordinary fish - local-frame-rebuild - score 90, shortcut 5, alpha 0.1112, dup 0.915, area 0.0
   - Risk: Metrics and body plan suggest a locked-painting shortcut; local rebuild must separate tail/fins/body rather than applying the current global mesh warp.
15. `fauna-exp-mirrorbone-hatchetfish` - Mirrorbone Hatchetfish - P2-local-high-risk - ordinary fish - local-frame-rebuild - score 88, shortcut 5, alpha 0.1146, dup 0.9185, area 0.0022
   - Risk: Metrics and body plan suggest a locked-painting shortcut; local rebuild must separate tail/fins/body rather than applying the current global mesh warp.
16. `fauna-exp-copper-banded-seahorse` - Copper Banded Seahorse - P1-fresh-source - seahorse/garden-eel - fresh-source-imagegen - score 87, shortcut 4, alpha 0.145, dup 0.9334, area 0.0036
   - Risk: Complex seahorse/garden-eel silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.
17. `fauna-exp-basalt-lantern-seahorse` - Basalt Lantern Seahorse - P1-fresh-source - seahorse/garden-eel - fresh-source-imagegen - score 84, shortcut 3, alpha 0.1404, dup 0.9243, area 0.0005
   - Risk: Complex seahorse/garden-eel silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.
18. `fauna-exp-blue-lantern-goby` - Blue Lantern Goby - P2-local-high-risk - ordinary fish - local-frame-rebuild - score 82, shortcut 5, alpha 0.1158, dup 0.9054, area 0.0023
   - Risk: Metrics and body plan suggest a locked-painting shortcut; local rebuild must separate tail/fins/body rather than applying the current global mesh warp.
19. `fauna-exp-ghostfin-croaker` - Ghostfin Croaker - P2-local-high-risk - ordinary fish - local-frame-rebuild - score 82, shortcut 5, alpha 0.1151, dup 0.9078, area 0.0025
   - Risk: Metrics and body plan suggest a locked-painting shortcut; local rebuild must separate tail/fins/body rather than applying the current global mesh warp.
20. `fauna-exp-goldcap-tripodfish` - Goldcap Tripodfish - P1-fresh-source - odd/sessile - fresh-source-imagegen - score 81, shortcut 4, alpha 0.2481, dup 0.9491, area 0.0565
   - Risk: Complex odd/sessile silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

## Morphotype inventory and animation read

### ordinary fish

Move: Tail beats must drive a subtle whole-body S curve; pectoral, dorsal, anal, and gill/eye highlights should flutter or parallax enough to read at runtime scale.
Coherence: Head, eye, markings, and lighting must stay attached to the same anatomy; no texture crawl across the body.
Failure: Locked torso with tail/fin twitch, high near-duplicate scores, zero area drift, or markings sliding independently of the fish.
Benchmark: Compare against established four-frame runtime fish where available, plus the neutral benchmark metric envelope from Nautilus/Reef Squid/Glass Squid/Bigfin Squid/Vampire Squid.

- B1 `fauna-exp-amber-comb-blenny` - Amber Comb Blenny (P3-local-standard, local-frame-rebuild, rank 82)
- B1 `fauna-exp-amber-snout-boxfish` - Amber Snout Boxfish (P3-local-standard, local-frame-rebuild, rank 45)
- B1 `fauna-exp-aurora-fin-damselfish` - Aurora Fin Damselfish (P0-known-failure, local-frame-rebuild, rank 10)
- B1 `fauna-exp-blue-lantern-goby` - Blue Lantern Goby (P2-local-high-risk, local-frame-rebuild, rank 18)
- B1 `fauna-exp-cobalt-sawtail-minnow` - Cobalt Sawtail Minnow (P3-local-standard, local-frame-rebuild, rank 44)
- B1 `fauna-exp-copperglass-cardinal` - Copperglass Cardinal (P3-local-standard, local-frame-rebuild, rank 42)
- B1 `fauna-exp-goldbar-squirrelfish` - Goldbar Squirrelfish (P3-local-standard, local-frame-rebuild, rank 95)
- B1 `fauna-exp-ivory-spined-cardinal` - Ivory Spined Cardinal (P3-local-standard, local-frame-rebuild, rank 88)
- B1 `fauna-exp-lumeneye-squirrelfish` - Lumeneye Squirrelfish (P3-local-standard, local-frame-rebuild, rank 81)
- B1 `fauna-exp-midnight-hogfish` - Midnight Hogfish (P3-local-standard, local-frame-rebuild, rank 55)
- B1 `fauna-exp-mottle-reef-cowfish` - Mottle Reef Cowfish (P3-local-standard, local-frame-rebuild, rank 68)
- B1 `fauna-exp-night-reef-boxfish` - Night Reef Boxfish (P3-local-standard, local-frame-rebuild, rank 67)
- B1 `fauna-exp-obsidian-reef-wrasse` - Obsidian Reef Wrasse (P2-local-high-risk, local-frame-rebuild, rank 14)
- B1 `fauna-exp-opalstripe-tilefish` - Opalstripe Tilefish (P3-local-standard, local-frame-rebuild, rank 80)
- B1 `fauna-exp-teal-mask-filefish` - Teal Mask Filefish (P3-local-standard, local-frame-rebuild, rank 54)
- B1 `fauna-exp-tideglass-cardinal` - Tideglass Cardinal (P3-local-standard, local-frame-rebuild, rank 43)
- B2 `fauna-exp-ashveil-butterflyfish` - Ashveil Butterflyfish (P0-known-failure, local-frame-rebuild, rank 7)
- B2 `fauna-exp-blackwater-hatchet` - Blackwater Hatchet (P3-local-standard, local-frame-rebuild, rank 84)
- B2 `fauna-exp-bluefire-dragonet` - Bluefire Dragonet (P3-local-standard, local-frame-rebuild, rank 71)
- B2 `fauna-exp-blueglass-anthias` - Blueglass Anthias (P3-local-standard, local-frame-rebuild, rank 89)
- B2 `fauna-exp-cinder-vent-clingfish` - Cinder Vent Clingfish (P0-known-failure, local-frame-rebuild, rank 11)
- B2 `fauna-exp-cyan-pulse-lanternfish` - Cyan Pulse Lanternfish (P3-local-standard, local-frame-rebuild, rank 57)
- B2 `fauna-exp-ghostfin-croaker` - Ghostfin Croaker (P2-local-high-risk, local-frame-rebuild, rank 19)
- B2 `fauna-exp-ivory-sail-chimaera` - Ivory Sail Chimaera (P3-local-standard, local-frame-rebuild, rank 83)
- B2 `fauna-exp-lumen-brow-barreleye` - Lumen Brow Barreleye (P0-known-failure, local-frame-rebuild, rank 5)
- B2 `fauna-exp-moonmask-lionfish` - Moonmask Lionfish (P3-local-standard, local-frame-rebuild, rank 97)
- B2 `fauna-exp-reef-amber-snapper` - Reef Amber Snapper (P3-local-standard, local-frame-rebuild, rank 70)
- B2 `fauna-exp-rustscale-hatchetfish` - Rustscale Hatchetfish (P3-local-standard, local-frame-rebuild, rank 34)
- B2 `fauna-exp-scarletline-hawkfish` - Scarletline Hawkfish (P3-local-standard, local-frame-rebuild, rank 46)
- B2 `fauna-exp-verdigris-parrotfish` - Verdigris Parrotfish (P3-local-standard, local-frame-rebuild, rank 56)
- B3 `fauna-exp-brassstripe-fusilier` - Brassstripe Fusilier (P3-local-standard, local-frame-rebuild, rank 75)
- B3 `fauna-exp-cobalt-triggerfish` - Cobalt Triggerfish (P3-local-standard, local-frame-rebuild, rank 36)
- B3 `fauna-exp-halo-dot-lanternfish` - Halo Dot Lanternfish (P3-local-standard, local-frame-rebuild, rank 47)
- B3 `fauna-exp-ironmask-ratfish` - Ironmask Ratfish (P3-local-standard, local-frame-rebuild, rank 33)
- B3 `fauna-exp-moonspot-drumfish` - Moonspot Drumfish (P0-known-failure, local-frame-rebuild, rank 12)
- B3 `fauna-exp-neonbar-dartfish` - Neonbar Dartfish (P3-local-standard, local-frame-rebuild, rank 90)
- B3 `fauna-exp-obsidian-swallowtail` - Obsidian Swallowtail (P3-local-standard, local-frame-rebuild, rank 51)
- B3 `fauna-exp-pearlside-grunt` - Pearlside Grunt (P3-local-standard, local-frame-rebuild, rank 35)
- B3 `fauna-exp-rustjaw-blenny` - Rustjaw Blenny (P0-known-failure, local-frame-rebuild, rank 8)
- B3 `fauna-exp-saberfin-smelt` - Saberfin Smelt (P3-local-standard, local-frame-rebuild, rank 85)
- B3 `fauna-exp-snowcap-snailfish` - Snowcap Snailfish (P0-known-failure, local-frame-rebuild, rank 4)
- B3 `fauna-exp-twilight-surgeonfish` - Twilight Surgeonfish (P3-local-standard, local-frame-rebuild, rank 58)
- B4 `fauna-exp-ancient-mask-angler` - Ancient Mask Angler (P3-local-standard, local-frame-rebuild, rank 39)
- B4 `fauna-exp-blueflame-grouperlet` - Blueflame Grouperlet (P3-local-standard, local-frame-rebuild, rank 78)
- B4 `fauna-exp-brineglass-snailfish` - Brineglass Snailfish (P3-local-standard, local-frame-rebuild, rank 38)
- B4 `fauna-exp-cinderstripe-cardinal` - Cinderstripe Cardinal (P3-local-standard, local-frame-rebuild, rank 77)
- B4 `fauna-exp-copperbelly-damselfish` - Copperbelly Damselfish (P3-local-standard, local-frame-rebuild, rank 59)
- B4 `fauna-exp-glassfin-fangtooth` - Glassfin Fangtooth (P3-local-standard, local-frame-rebuild, rank 50)
- B4 `fauna-exp-ivorymask-goatfish` - Ivorymask Goatfish (P3-local-standard, local-frame-rebuild, rank 76)
- B4 `fauna-exp-kelpglass-rockfish` - Kelpglass Rockfish (P3-local-standard, local-frame-rebuild, rank 49)
- B4 `fauna-exp-lattice-eye-barreleye` - Lattice Eye Barreleye (P3-local-standard, local-frame-rebuild, rank 37)
- B4 `fauna-exp-mirrorbone-hatchetfish` - Mirrorbone Hatchetfish (P2-local-high-risk, local-frame-rebuild, rank 15)

### long eel/ribbon/needle

Move: The full spine should travel in a controlled wave from head/mid-body to tail, with fins and luminous stripes riding the body curve.
Coherence: Head size, eye, jaw, stripe spacing, and body thickness must remain coherent across the bend.
Failure: A single global warp, crop instability, kinked spine, or tail-only flick that does not advance along the body.
Benchmark: Compare against passable candidates Abyssal Thread Eel, Starless Lantern Eel, Cathedral Fin Ribbonfish, and Anchorfin Eel, then against Bigfin Squid for silhouette-change strength.

- B1 `fauna-exp-brightscale-halfbeak` - Brightscale Halfbeak (P2-local-high-risk, local-frame-rebuild, rank 62)
- B1 `fauna-exp-ember-needle-pipefish` - Ember Needle Pipefish (P2-local-high-risk, local-frame-rebuild, rank 52)
- B1 `fauna-exp-reef-needle-snipefish` - Reef Needle Snipefish (P2-local-high-risk, local-frame-rebuild, rank 61)
- B1 `fauna-exp-ribbonjaw-cleaner-wrasse` - Ribbonjaw Cleaner Wrasse (P4-benchmark-adjacent, local-frame-rebuild, rank 87)
- B2 `fauna-exp-copper-ribbon-eel` - Copper Ribbon Eel (P2-local-high-risk, local-frame-rebuild, rank 53)
- B2 `fauna-exp-silvercap-grenadier` - Silvercap Grenadier (P4-benchmark-adjacent, local-frame-rebuild, rank 96)
- B2 `fauna-exp-vent-jade-eelpout` - Vent Jade Eelpout (P3-local-standard, local-frame-rebuild, rank 69)
- B3 `fauna-exp-abyssal-thread-eel` - Abyssal Thread Eel (P4-benchmark-adjacent, local-frame-rebuild, rank 93)
- B3 `fauna-exp-black-velvet-cusk` - Black Velvet Cusk (P3-local-standard, local-frame-rebuild, rank 48)
- B3 `fauna-exp-bonefin-lantern-shark` - Bonefin Lantern Shark (P3-local-standard, local-frame-rebuild, rank 99)
- B3 `fauna-exp-emberjaw-bristlefish` - Emberjaw Bristlefish (P3-local-standard, local-frame-rebuild, rank 74)
- B3 `fauna-exp-glassjaw-viperfish` - Glassjaw Viperfish (P3-local-standard, local-frame-rebuild, rank 73)
- B3 `fauna-exp-hollow-eye-cusk` - Hollow Eye Cusk (P3-local-standard, local-frame-rebuild, rank 92)
- B3 `fauna-exp-ivory-ridge-rattail` - Ivory Ridge Rattail (P4-benchmark-adjacent, local-frame-rebuild, rank 91)
- B3 `fauna-exp-knifecrest-snipe-eel` - Knifecrest Snipe Eel (P2-local-high-risk, local-frame-rebuild, rank 64)
- B3 `fauna-exp-onyx-frillshark-fry` - Onyx Frillshark Fry (P3-local-standard, local-frame-rebuild, rank 72)
- B3 `fauna-exp-starless-lantern-eel` - Starless Lantern Eel (P4-benchmark-adjacent, local-frame-rebuild, rank 98)
- B3 `fauna-exp-sulfur-eye-hagfish` - Sulfur Eye Hagfish (P2-local-high-risk, local-frame-rebuild, rank 63)
- B4 `fauna-exp-anchorfin-eel` - Anchorfin Eel (P4-benchmark-adjacent, local-frame-rebuild, rank 79)
- B4 `fauna-exp-bonewhisker-brotula` - Bonewhisker Brotula (P3-local-standard, local-frame-rebuild, rank 60)
- B4 `fauna-exp-cathedral-fin-ribbonfish` - Cathedral Fin Ribbonfish (P4-benchmark-adjacent, local-frame-rebuild, rank 94)
- B4 `fauna-exp-cinder-maw-dragonfish` - Cinder Maw Dragonfish (P3-local-standard, local-frame-rebuild, rank 86)
- B4 `fauna-exp-cobalt-gulper-fry` - Cobalt Gulper Fry (P4-benchmark-adjacent, local-frame-rebuild, rank 100)
- B4 `fauna-exp-hadal-needlefish` - Hadal Needlefish (P2-local-high-risk, local-frame-rebuild, rank 66)
- B4 `fauna-exp-sable-razorfish` - Sable Razorfish (P3-local-standard, local-frame-rebuild, rank 32)
- B4 `fauna-exp-silverthread-needlefish` - Silverthread Needlefish (P2-local-high-risk, local-frame-rebuild, rank 65)

### cephalopod/cuttle/squid

Move: Mantle should compress/extend, side fins should ripple, and arms/tentacles should change spacing as a group rather than being dragged as one blob.
Coherence: Eye, mantle stripes, and arm attachments must remain anatomically anchored.
Failure: Static mantle with only fringe wobble, fused tentacle mass, or source painting stretched uniformly.
Benchmark: Compare directly against Reef Squid, Glass Squid, Bigfin Squid, and Vampire Squid benchmark rows.

- B1 `fauna-exp-kelp-arrow-squid` - Kelp Arrow Squid (P1-fresh-source, fresh-source-imagegen, rank 22)
- B2 `fauna-exp-saffron-paddle-cuttle` - Saffron Paddle Cuttle (P0-known-failure, fresh-source-imagegen, rank 2)
- B2 `fauna-exp-velvet-glass-cuttle` - Velvet Glass Cuttle (P1-fresh-source, fresh-source-imagegen, rank 24)

### nautilus/shell

Move: Shell-body relationship should change: shell can rock slightly while the soft body, tentacles, mantle fringe, or shell opening shows a readable phase.
Coherence: Spiral shell volume, hinge/opening geometry, and tentacle roots must stay coherent.
Failure: Whole shell bob, tiny open/close, or tentacles shimmering while the shell/body read as a single static sticker.
Benchmark: Compare directly against established Nautilus; clam also needs a shell-specific open/close contact sheet.

- B1 `fauna-exp-nacre-thorn-clam` - Nacre Thorn Clam (P0-known-failure, fresh-source-imagegen, rank 1)
- B2 `fauna-exp-glass-helm-nautilus` - Glass Helm Nautilus (P0-known-failure, fresh-source-imagegen, rank 6)

### jelly/pulse

Move: Bell should visibly squash/expand with tentacles trailing on a delayed phase; the rim and oral arms should pulse, not just translate.
Coherence: Bell crown, rim symmetry, and tentacle root positions must remain connected.
Failure: Tentacle-only twitch, rigid bell, or vertical bob that hides the pulse.
Benchmark: No direct accepted jelly benchmark exists in the prior appraisal; compare to the benchmark metric envelope and Vampire Squid pulse/appendage readability.

- B1 `fauna-exp-prism-bell-jelly` - Prism Bell Jelly (P0-known-failure, fresh-source-imagegen, rank 3)

### crustacean

Move: Antennae, legs, claws, and tail fan should articulate in offset phases while the carapace stays stable.
Coherence: Leg roots, claw joints, shell markings, and eye stalks must stay attached; no copied legs smearing into one shape.
Failure: Whole-body sway only, fused leg mass, or appendages that vanish at runtime scale.
Benchmark: No direct accepted crustacean benchmark was in the appraisal; compare to cephalopod appendage readability and the neutral benchmark metric envelope.

- B1 `fauna-exp-opal-fan-shrimp` - Opal Fan Shrimp (P1-fresh-source, fresh-source-imagegen, rank 26)
- B1 `fauna-exp-silver-hinge-crab` - Silver Hinge Crab (P1-fresh-source, fresh-source-imagegen, rank 25)
- B2 `fauna-exp-brass-knuckle-prawn` - Brass Knuckle Prawn (P1-fresh-source, fresh-source-imagegen, rank 41)
- B2 `fauna-exp-chimney-ghost-shrimp` - Chimney Ghost Shrimp (P1-fresh-source, fresh-source-imagegen, rank 29)
- B2 `fauna-exp-vent-pearl-copepod` - Vent Pearl Copepod (P1-fresh-source, fresh-source-imagegen, rank 27)

### seahorse/garden-eel

Move: Vertical body should sway with a head/torso phase offset; seahorse dorsal fin and curled tail should flutter, garden eel should bend from a stable lower body.
Coherence: Snout, eye, belly plates, and tail curl must keep their identity and not collapse into a ribbon.
Failure: Simple vertical bob, rigid body, or body bend that detaches the head/tail curl.
Benchmark: Compare against passable eel candidates for body wave and against benchmark metric envelope for visible frame difference.

- B1 `fauna-exp-basalt-lantern-seahorse` - Basalt Lantern Seahorse (P1-fresh-source, fresh-source-imagegen, rank 17)
- B1 `fauna-exp-copper-banded-seahorse` - Copper Banded Seahorse (P1-fresh-source, fresh-source-imagegen, rank 16)
- B1 `fauna-exp-shellback-garden-eel` - Shellback Garden Eel (P1-fresh-source, fresh-source-imagegen, rank 21)

### flat/ray/flounder

Move: Edge fins or ray wings need a traveling wave; eyes and dorsal markings should stay fixed to the flat body while the perimeter flexes.
Coherence: Flat body footprint, eye placement, and top-surface markings must remain coherent.
Failure: Locked pancake shape, tail-only twitch, or uniform scale pulse with no traveling fin/wave read.
Benchmark: No direct accepted ray/flounder benchmark exists in the appraisal; compare to benchmark metric envelope and produce a side-by-side original/upgraded flat-fish sheet.

- B1 `fauna-exp-pearl-eye-flounder` - Pearl Eye Flounder (P0-known-failure, fresh-source-imagegen, rank 9)
- B2 `fauna-exp-lumen-kite-ray` - Lumen Kite Ray (P1-fresh-source, fresh-source-imagegen, rank 13)
- B2 `fauna-exp-ventstripe-moray` - Ventstripe Moray (P2-local-high-risk, local-frame-rebuild, rank 30)

### odd/sessile

Move: Motion must match the body plan: urchin spines pulse, tripod legs brace, walking fins step, mudskipper/sea moth fins crawl, without pretending all are fish.
Coherence: Contact points, spines, legs, and head/eye features must keep shape and not smear.
Failure: Generic fish warp, uniform scale pulse, or unreadable appendage changes at runtime size.
Benchmark: No direct accepted odd/sessile benchmark exists in the appraisal; compare to neutral benchmark metric envelope and a morph-specific contact sheet.

- B1 `fauna-exp-glimmer-spine-urchin` - Glimmer Spine Urchin (P1-fresh-source, fresh-source-imagegen, rank 23)
- B1 `fauna-exp-opal-eye-mudskipper` - Opal Eye Mudskipper (P3-local-standard, local-frame-rebuild, rank 31)
- B2 `fauna-exp-ghostplate-sea-moth` - Ghostplate Sea Moth (P1-fresh-source, fresh-source-imagegen, rank 40)
- B2 `fauna-exp-goldcap-tripodfish` - Goldcap Tripodfish (P1-fresh-source, fresh-source-imagegen, rank 20)
- B2 `fauna-exp-tin-plate-searobin` - Tin Plate Searobin (P1-fresh-source, fresh-source-imagegen, rank 28)

## Imagegen-needed entries

Use built-in image generation by default. Do not require a CLI fallback or `OPENAI_API_KEY`. Each accepted source should be saved as a candidate first, then keyed and rebuilt into runtime assets only after proof passes.

Global save plan for each imagegen entry:
- Generated chroma source: `public/assets/generated/exploration-life-2026-07-04/source/<assetKey>-source-chroma-v2.png`
- Keyed alpha candidate: `public/assets/generated/exploration-life-2026-07-04/alpha/<assetKey>-v2.png`
- Accepted runtime output: `public/assets/generated/<assetKey>-0.png` through `-3.png`, `public/assets/generated/<assetKey>.png`, and `public/assets/generated/<assetKey>.frames.json`
- Review proof: `runs/water9-fauna-animation-upgrade-2026-07-05/proof/<assetKey>-upgrade-contact.png` plus grayscale and live-canvas captures

### 1. Nacre Thorn Clam - `fauna-exp-nacre-thorn-clam`

Why imagegen: Known FAIL. Near-static shell, alpha delta 0.042, near-duplicate 0.939, tiny open/bob only.

Prompt:

```text
Water9 runtime fauna source art for Nacre Thorn Clam (sessile bivalve fauna), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: upper and lower shell visibly separated at the hinge, slightly open mantle/fringe visible, shell spikes readable without fusing into the rim. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-nacre-thorn-clam-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-nacre-thorn-clam-v2.png`
- Runtime: `public/assets/generated/fauna-exp-nacre-thorn-clam-0.png, public/assets/generated/fauna-exp-nacre-thorn-clam-1.png, public/assets/generated/fauna-exp-nacre-thorn-clam-2.png, public/assets/generated/fauna-exp-nacre-thorn-clam-3.png, public/assets/generated/fauna-exp-nacre-thorn-clam.png, public/assets/generated/fauna-exp-nacre-thorn-clam.frames.json`

### 2. Saffron Paddle Cuttle - `fauna-exp-saffron-paddle-cuttle`

Why imagegen: Known WEAK. Polished static cuttle with small edge/fin/tentacle warp, alpha delta 0.073.

Prompt:

```text
Water9 runtime fauna source art for Saffron Paddle Cuttle (cuttlefish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: separate arms/tentacles, readable eye, mantle rim and side fins exposed, enough negative space around the arm cluster for later phase offsets. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-saffron-paddle-cuttle-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-saffron-paddle-cuttle-v2.png`
- Runtime: `public/assets/generated/fauna-exp-saffron-paddle-cuttle-0.png, public/assets/generated/fauna-exp-saffron-paddle-cuttle-1.png, public/assets/generated/fauna-exp-saffron-paddle-cuttle-2.png, public/assets/generated/fauna-exp-saffron-paddle-cuttle-3.png, public/assets/generated/fauna-exp-saffron-paddle-cuttle.png, public/assets/generated/fauna-exp-saffron-paddle-cuttle.frames.json`

### 3. Prism Bell Jelly - `fauna-exp-prism-bell-jelly`

Why imagegen: Known WEAK. Tentacles twitch but bell/body remains locked, alpha delta 0.075.

Prompt:

```text
Water9 runtime fauna source art for Prism Bell Jelly (opaque jellyfish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: bell crown and rim readable, tentacles separated into several strands, oral arms rooted under the bell with space for delayed trailing motion. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-prism-bell-jelly-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-prism-bell-jelly-v2.png`
- Runtime: `public/assets/generated/fauna-exp-prism-bell-jelly-0.png, public/assets/generated/fauna-exp-prism-bell-jelly-1.png, public/assets/generated/fauna-exp-prism-bell-jelly-2.png, public/assets/generated/fauna-exp-prism-bell-jelly-3.png, public/assets/generated/fauna-exp-prism-bell-jelly.png, public/assets/generated/fauna-exp-prism-bell-jelly.frames.json`

### 6. Glass Helm Nautilus - `fauna-exp-glass-helm-nautilus`

Why imagegen: Known WEAK. Shell/body nearly static compared with established Nautilus.

Prompt:

```text
Water9 runtime fauna source art for Glass Helm Nautilus (nautilus), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: spiral shell distinct from soft body, tentacle cluster separated from shell opening, eye and siphon readable. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-glass-helm-nautilus-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-glass-helm-nautilus-v2.png`
- Runtime: `public/assets/generated/fauna-exp-glass-helm-nautilus-0.png, public/assets/generated/fauna-exp-glass-helm-nautilus-1.png, public/assets/generated/fauna-exp-glass-helm-nautilus-2.png, public/assets/generated/fauna-exp-glass-helm-nautilus-3.png, public/assets/generated/fauna-exp-glass-helm-nautilus.png, public/assets/generated/fauna-exp-glass-helm-nautilus.frames.json`

### 9. Pearl Eye Flounder - `fauna-exp-pearl-eye-flounder`

Why imagegen: Known WEAK. Flat body barely ripples and needs traveling fin-wave readability.

Prompt:

```text
Water9 runtime fauna source art for Pearl Eye Flounder (flatfish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: flat body or ray wings with clear perimeter fins, fixed eye placement, and enough edge detail for a traveling ripple. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-pearl-eye-flounder-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-pearl-eye-flounder-v2.png`
- Runtime: `public/assets/generated/fauna-exp-pearl-eye-flounder-0.png, public/assets/generated/fauna-exp-pearl-eye-flounder-1.png, public/assets/generated/fauna-exp-pearl-eye-flounder-2.png, public/assets/generated/fauna-exp-pearl-eye-flounder-3.png, public/assets/generated/fauna-exp-pearl-eye-flounder.png, public/assets/generated/fauna-exp-pearl-eye-flounder.frames.json`

### 13. Lumen Kite Ray - `fauna-exp-lumen-kite-ray`

Why imagegen: Complex flat/ray/flounder silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Lumen Kite Ray (small ray), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: flat body or ray wings with clear perimeter fins, fixed eye placement, and enough edge detail for a traveling ripple. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-lumen-kite-ray-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-lumen-kite-ray-v2.png`
- Runtime: `public/assets/generated/fauna-exp-lumen-kite-ray-0.png, public/assets/generated/fauna-exp-lumen-kite-ray-1.png, public/assets/generated/fauna-exp-lumen-kite-ray-2.png, public/assets/generated/fauna-exp-lumen-kite-ray-3.png, public/assets/generated/fauna-exp-lumen-kite-ray.png, public/assets/generated/fauna-exp-lumen-kite-ray.frames.json`

### 16. Copper Banded Seahorse - `fauna-exp-copper-banded-seahorse`

Why imagegen: Complex seahorse/garden-eel silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Copper Banded Seahorse (seahorse), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: curled tail, dorsal fin, snout, belly plates, and head crest readable with space around tail and fin for flutter masks. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-copper-banded-seahorse-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-copper-banded-seahorse-v2.png`
- Runtime: `public/assets/generated/fauna-exp-copper-banded-seahorse-0.png, public/assets/generated/fauna-exp-copper-banded-seahorse-1.png, public/assets/generated/fauna-exp-copper-banded-seahorse-2.png, public/assets/generated/fauna-exp-copper-banded-seahorse-3.png, public/assets/generated/fauna-exp-copper-banded-seahorse.png, public/assets/generated/fauna-exp-copper-banded-seahorse.frames.json`

### 17. Basalt Lantern Seahorse - `fauna-exp-basalt-lantern-seahorse`

Why imagegen: Complex seahorse/garden-eel silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Basalt Lantern Seahorse (seahorse), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: curled tail, dorsal fin, snout, belly plates, and head crest readable with space around tail and fin for flutter masks. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-basalt-lantern-seahorse-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-basalt-lantern-seahorse-v2.png`
- Runtime: `public/assets/generated/fauna-exp-basalt-lantern-seahorse-0.png, public/assets/generated/fauna-exp-basalt-lantern-seahorse-1.png, public/assets/generated/fauna-exp-basalt-lantern-seahorse-2.png, public/assets/generated/fauna-exp-basalt-lantern-seahorse-3.png, public/assets/generated/fauna-exp-basalt-lantern-seahorse.png, public/assets/generated/fauna-exp-basalt-lantern-seahorse.frames.json`

### 20. Goldcap Tripodfish - `fauna-exp-goldcap-tripodfish`

Why imagegen: Complex odd/sessile silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Goldcap Tripodfish (tripodfish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: thin body with three long bracing fin legs clearly separated, no seabed, readable eye/head orientation. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-goldcap-tripodfish-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-goldcap-tripodfish-v2.png`
- Runtime: `public/assets/generated/fauna-exp-goldcap-tripodfish-0.png, public/assets/generated/fauna-exp-goldcap-tripodfish-1.png, public/assets/generated/fauna-exp-goldcap-tripodfish-2.png, public/assets/generated/fauna-exp-goldcap-tripodfish-3.png, public/assets/generated/fauna-exp-goldcap-tripodfish.png, public/assets/generated/fauna-exp-goldcap-tripodfish.frames.json`

### 21. Shellback Garden Eel - `fauna-exp-shellback-garden-eel`

Why imagegen: Complex seahorse/garden-eel silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Shellback Garden Eel (garden eel), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: vertical exposed eel body with a gentle S curve, visible head/eyes, no sand or seabed, lower body long enough to bend from a fixed base. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-shellback-garden-eel-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-shellback-garden-eel-v2.png`
- Runtime: `public/assets/generated/fauna-exp-shellback-garden-eel-0.png, public/assets/generated/fauna-exp-shellback-garden-eel-1.png, public/assets/generated/fauna-exp-shellback-garden-eel-2.png, public/assets/generated/fauna-exp-shellback-garden-eel-3.png, public/assets/generated/fauna-exp-shellback-garden-eel.png, public/assets/generated/fauna-exp-shellback-garden-eel.frames.json`

### 22. Kelp Arrow Squid - `fauna-exp-kelp-arrow-squid`

Why imagegen: Complex cephalopod/cuttle/squid silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Kelp Arrow Squid (small squid), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: separate arms/tentacles, readable eye, mantle rim and side fins exposed, enough negative space around the arm cluster for later phase offsets. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-kelp-arrow-squid-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-kelp-arrow-squid-v2.png`
- Runtime: `public/assets/generated/fauna-exp-kelp-arrow-squid-0.png, public/assets/generated/fauna-exp-kelp-arrow-squid-1.png, public/assets/generated/fauna-exp-kelp-arrow-squid-2.png, public/assets/generated/fauna-exp-kelp-arrow-squid-3.png, public/assets/generated/fauna-exp-kelp-arrow-squid.png, public/assets/generated/fauna-exp-kelp-arrow-squid.frames.json`

### 23. Glimmer Spine Urchin - `fauna-exp-glimmer-spine-urchin`

Why imagegen: Complex odd/sessile silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Glimmer Spine Urchin (round urchin fauna), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: round body with individually readable spines and small tube-feet/fringe details that can pulse independently. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-glimmer-spine-urchin-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-glimmer-spine-urchin-v2.png`
- Runtime: `public/assets/generated/fauna-exp-glimmer-spine-urchin-0.png, public/assets/generated/fauna-exp-glimmer-spine-urchin-1.png, public/assets/generated/fauna-exp-glimmer-spine-urchin-2.png, public/assets/generated/fauna-exp-glimmer-spine-urchin-3.png, public/assets/generated/fauna-exp-glimmer-spine-urchin.png, public/assets/generated/fauna-exp-glimmer-spine-urchin.frames.json`

### 24. Velvet Glass Cuttle - `fauna-exp-velvet-glass-cuttle`

Why imagegen: Complex cephalopod/cuttle/squid silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Velvet Glass Cuttle (compact cuttlefish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: separate arms/tentacles, readable eye, mantle rim and side fins exposed, enough negative space around the arm cluster for later phase offsets. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-velvet-glass-cuttle-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-velvet-glass-cuttle-v2.png`
- Runtime: `public/assets/generated/fauna-exp-velvet-glass-cuttle-0.png, public/assets/generated/fauna-exp-velvet-glass-cuttle-1.png, public/assets/generated/fauna-exp-velvet-glass-cuttle-2.png, public/assets/generated/fauna-exp-velvet-glass-cuttle-3.png, public/assets/generated/fauna-exp-velvet-glass-cuttle.png, public/assets/generated/fauna-exp-velvet-glass-cuttle.frames.json`

### 25. Silver Hinge Crab - `fauna-exp-silver-hinge-crab`

Why imagegen: Complex crustacean silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Silver Hinge Crab (side-view crab), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: legs, claws or fan tail, antennae, and eyes separated from the carapace with clean negative spaces so they can be masked and moved. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-silver-hinge-crab-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-silver-hinge-crab-v2.png`
- Runtime: `public/assets/generated/fauna-exp-silver-hinge-crab-0.png, public/assets/generated/fauna-exp-silver-hinge-crab-1.png, public/assets/generated/fauna-exp-silver-hinge-crab-2.png, public/assets/generated/fauna-exp-silver-hinge-crab-3.png, public/assets/generated/fauna-exp-silver-hinge-crab.png, public/assets/generated/fauna-exp-silver-hinge-crab.frames.json`

### 26. Opal Fan Shrimp - `fauna-exp-opal-fan-shrimp`

Why imagegen: Complex crustacean silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Opal Fan Shrimp (shrimp / fan-tail crustacean), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: legs, claws or fan tail, antennae, and eyes separated from the carapace with clean negative spaces so they can be masked and moved. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-opal-fan-shrimp-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-opal-fan-shrimp-v2.png`
- Runtime: `public/assets/generated/fauna-exp-opal-fan-shrimp-0.png, public/assets/generated/fauna-exp-opal-fan-shrimp-1.png, public/assets/generated/fauna-exp-opal-fan-shrimp-2.png, public/assets/generated/fauna-exp-opal-fan-shrimp-3.png, public/assets/generated/fauna-exp-opal-fan-shrimp.png, public/assets/generated/fauna-exp-opal-fan-shrimp.frames.json`

### 27. Vent Pearl Copepod - `fauna-exp-vent-pearl-copepod`

Why imagegen: Complex crustacean silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Vent Pearl Copepod (tiny crustacean), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: legs, claws or fan tail, antennae, and eyes separated from the carapace with clean negative spaces so they can be masked and moved. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-vent-pearl-copepod-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-vent-pearl-copepod-v2.png`
- Runtime: `public/assets/generated/fauna-exp-vent-pearl-copepod-0.png, public/assets/generated/fauna-exp-vent-pearl-copepod-1.png, public/assets/generated/fauna-exp-vent-pearl-copepod-2.png, public/assets/generated/fauna-exp-vent-pearl-copepod-3.png, public/assets/generated/fauna-exp-vent-pearl-copepod.png, public/assets/generated/fauna-exp-vent-pearl-copepod.frames.json`

### 28. Tin Plate Searobin - `fauna-exp-tin-plate-searobin`

Why imagegen: Complex odd/sessile silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Tin Plate Searobin (walking fish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: walking pectoral rays and fins separated under the body for a stepping/crawling frame cycle. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-tin-plate-searobin-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-tin-plate-searobin-v2.png`
- Runtime: `public/assets/generated/fauna-exp-tin-plate-searobin-0.png, public/assets/generated/fauna-exp-tin-plate-searobin-1.png, public/assets/generated/fauna-exp-tin-plate-searobin-2.png, public/assets/generated/fauna-exp-tin-plate-searobin-3.png, public/assets/generated/fauna-exp-tin-plate-searobin.png, public/assets/generated/fauna-exp-tin-plate-searobin.frames.json`

### 29. Chimney Ghost Shrimp - `fauna-exp-chimney-ghost-shrimp`

Why imagegen: Complex crustacean silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Chimney Ghost Shrimp (vent shrimp), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: legs, claws or fan tail, antennae, and eyes separated from the carapace with clean negative spaces so they can be masked and moved. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-chimney-ghost-shrimp-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-chimney-ghost-shrimp-v2.png`
- Runtime: `public/assets/generated/fauna-exp-chimney-ghost-shrimp-0.png, public/assets/generated/fauna-exp-chimney-ghost-shrimp-1.png, public/assets/generated/fauna-exp-chimney-ghost-shrimp-2.png, public/assets/generated/fauna-exp-chimney-ghost-shrimp-3.png, public/assets/generated/fauna-exp-chimney-ghost-shrimp.png, public/assets/generated/fauna-exp-chimney-ghost-shrimp.frames.json`

### 40. Ghostplate Sea Moth - `fauna-exp-ghostplate-sea-moth`

Why imagegen: Complex odd/sessile silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Ghostplate Sea Moth (sea moth fish), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: appendages, fins, legs, or wing-like plates separated from the body for species-specific masks. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-ghostplate-sea-moth-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-ghostplate-sea-moth-v2.png`
- Runtime: `public/assets/generated/fauna-exp-ghostplate-sea-moth-0.png, public/assets/generated/fauna-exp-ghostplate-sea-moth-1.png, public/assets/generated/fauna-exp-ghostplate-sea-moth-2.png, public/assets/generated/fauna-exp-ghostplate-sea-moth-3.png, public/assets/generated/fauna-exp-ghostplate-sea-moth.png, public/assets/generated/fauna-exp-ghostplate-sea-moth.frames.json`

### 41. Brass Knuckle Prawn - `fauna-exp-brass-knuckle-prawn`

Why imagegen: Complex crustacean silhouette is likely too fused for a single stronger warp; fresh source should separate motion-critical appendages before rebuilding frames.

Prompt:

```text
Water9 runtime fauna source art for Brass Knuckle Prawn (stout prawn), painterly semi-realistic marine creature, clean side-view game sprite, isolated full body on a flat #ff00ff chroma-key background. Use natural marine colors with sparse bioluminescent accents; avoid magenta, pink, purple subject colors, white matte, rocks, sand, bubbles, scenery, text, shadows, frames, and transparent fin membranes. Make the silhouette readable when reduced to the current Water9 runtime sprite size; preserve crisp alpha-friendly edges and leave 8-12 percent empty margin. Motion-friendly source requirements: legs, claws or fan tail, antennae, and eyes separated from the carapace with clean negative spaces so they can be masked and moved. The image should be suitable for deriving a 4-frame loop with coherent anatomy and markings.
```

Save:
- Source: `public/assets/generated/exploration-life-2026-07-04/source/fauna-exp-brass-knuckle-prawn-source-chroma-v2.png`
- Alpha: `public/assets/generated/exploration-life-2026-07-04/alpha/fauna-exp-brass-knuckle-prawn-v2.png`
- Runtime: `public/assets/generated/fauna-exp-brass-knuckle-prawn-0.png, public/assets/generated/fauna-exp-brass-knuckle-prawn-1.png, public/assets/generated/fauna-exp-brass-knuckle-prawn-2.png, public/assets/generated/fauna-exp-brass-knuckle-prawn-3.png, public/assets/generated/fauna-exp-brass-knuckle-prawn.png, public/assets/generated/fauna-exp-brass-knuckle-prawn.frames.json`

## Local frame rebuild entries

These entries should use the existing alpha source first. The implementation owner should avoid the current global-only mesh shortcut by adding masks/anchors, a fourth pose, and morph-specific phase curves.

- `fauna-exp-snowcap-snailfish` - Snowcap Snailfish - rank 4 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-lumen-brow-barreleye` - Lumen Brow Barreleye - rank 5 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ashveil-butterflyfish` - Ashveil Butterflyfish - rank 7 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-rustjaw-blenny` - Rustjaw Blenny - rank 8 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-aurora-fin-damselfish` - Aurora Fin Damselfish - rank 10 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cinder-vent-clingfish` - Cinder Vent Clingfish - rank 11 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-moonspot-drumfish` - Moonspot Drumfish - rank 12 - P0-known-failure - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-obsidian-reef-wrasse` - Obsidian Reef Wrasse - rank 14 - P2-local-high-risk - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-mirrorbone-hatchetfish` - Mirrorbone Hatchetfish - rank 15 - P2-local-high-risk - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-blue-lantern-goby` - Blue Lantern Goby - rank 18 - P2-local-high-risk - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ghostfin-croaker` - Ghostfin Croaker - rank 19 - P2-local-high-risk - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ventstripe-moray` - Ventstripe Moray - rank 30 - P2-local-high-risk - flat/ray/flounder - Use fresh source if listed; otherwise rebuild with perimeter/wave masks and fixed eyes/markings, not a uniform scale pulse.
- `fauna-exp-opal-eye-mudskipper` - Opal Eye Mudskipper - rank 31 - P3-local-standard - odd/sessile - Use fresh source if listed; otherwise create species-specific masks for fins, legs, or spines rather than the generic fish warp.
- `fauna-exp-sable-razorfish` - Sable Razorfish - rank 32 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-ironmask-ratfish` - Ironmask Ratfish - rank 33 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-rustscale-hatchetfish` - Rustscale Hatchetfish - rank 34 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-pearlside-grunt` - Pearlside Grunt - rank 35 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cobalt-triggerfish` - Cobalt Triggerfish - rank 36 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-lattice-eye-barreleye` - Lattice Eye Barreleye - rank 37 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-brineglass-snailfish` - Brineglass Snailfish - rank 38 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ancient-mask-angler` - Ancient Mask Angler - rank 39 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-copperglass-cardinal` - Copperglass Cardinal - rank 42 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-tideglass-cardinal` - Tideglass Cardinal - rank 43 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cobalt-sawtail-minnow` - Cobalt Sawtail Minnow - rank 44 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-amber-snout-boxfish` - Amber Snout Boxfish - rank 45 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-scarletline-hawkfish` - Scarletline Hawkfish - rank 46 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-halo-dot-lanternfish` - Halo Dot Lanternfish - rank 47 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-black-velvet-cusk` - Black Velvet Cusk - rank 48 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-kelpglass-rockfish` - Kelpglass Rockfish - rank 49 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-glassfin-fangtooth` - Glassfin Fangtooth - rank 50 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-obsidian-swallowtail` - Obsidian Swallowtail - rank 51 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ember-needle-pipefish` - Ember Needle Pipefish - rank 52 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-copper-ribbon-eel` - Copper Ribbon Eel - rank 53 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-teal-mask-filefish` - Teal Mask Filefish - rank 54 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-midnight-hogfish` - Midnight Hogfish - rank 55 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-verdigris-parrotfish` - Verdigris Parrotfish - rank 56 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cyan-pulse-lanternfish` - Cyan Pulse Lanternfish - rank 57 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-twilight-surgeonfish` - Twilight Surgeonfish - rank 58 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-copperbelly-damselfish` - Copperbelly Damselfish - rank 59 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-bonewhisker-brotula` - Bonewhisker Brotula - rank 60 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-reef-needle-snipefish` - Reef Needle Snipefish - rank 61 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-brightscale-halfbeak` - Brightscale Halfbeak - rank 62 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-sulfur-eye-hagfish` - Sulfur Eye Hagfish - rank 63 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-knifecrest-snipe-eel` - Knifecrest Snipe Eel - rank 64 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-silverthread-needlefish` - Silverthread Needlefish - rank 65 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-hadal-needlefish` - Hadal Needlefish - rank 66 - P2-local-high-risk - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-night-reef-boxfish` - Night Reef Boxfish - rank 67 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-mottle-reef-cowfish` - Mottle Reef Cowfish - rank 68 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-vent-jade-eelpout` - Vent Jade Eelpout - rank 69 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-reef-amber-snapper` - Reef Amber Snapper - rank 70 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-bluefire-dragonet` - Bluefire Dragonet - rank 71 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-onyx-frillshark-fry` - Onyx Frillshark Fry - rank 72 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-glassjaw-viperfish` - Glassjaw Viperfish - rank 73 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-emberjaw-bristlefish` - Emberjaw Bristlefish - rank 74 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-brassstripe-fusilier` - Brassstripe Fusilier - rank 75 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ivorymask-goatfish` - Ivorymask Goatfish - rank 76 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cinderstripe-cardinal` - Cinderstripe Cardinal - rank 77 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-blueflame-grouperlet` - Blueflame Grouperlet - rank 78 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-anchorfin-eel` - Anchorfin Eel - rank 79 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-opalstripe-tilefish` - Opalstripe Tilefish - rank 80 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-lumeneye-squirrelfish` - Lumeneye Squirrelfish - rank 81 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-amber-comb-blenny` - Amber Comb Blenny - rank 82 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ivory-sail-chimaera` - Ivory Sail Chimaera - rank 83 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-blackwater-hatchet` - Blackwater Hatchet - rank 84 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-saberfin-smelt` - Saberfin Smelt - rank 85 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-cinder-maw-dragonfish` - Cinder Maw Dragonfish - rank 86 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-ribbonjaw-cleaner-wrasse` - Ribbonjaw Cleaner Wrasse - rank 87 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-ivory-spined-cardinal` - Ivory Spined Cardinal - rank 88 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-blueglass-anthias` - Blueglass Anthias - rank 89 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-neonbar-dartfish` - Neonbar Dartfish - rank 90 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-ivory-ridge-rattail` - Ivory Ridge Rattail - rank 91 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-hollow-eye-cusk` - Hollow Eye Cusk - rank 92 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-abyssal-thread-eel` - Abyssal Thread Eel - rank 93 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-cathedral-fin-ribbonfish` - Cathedral Fin Ribbonfish - rank 94 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-goldbar-squirrelfish` - Goldbar Squirrelfish - rank 95 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-silvercap-grenadier` - Silvercap Grenadier - rank 96 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-moonmask-lionfish` - Moonmask Lionfish - rank 97 - P3-local-standard - ordinary fish - Rebuild from existing alpha with 4 frames at 8 fps: mask head/body/tail/fins, add traveling tail beat, fin flutter, small lighting/marking parallax, and stable frame margins.
- `fauna-exp-starless-lantern-eel` - Starless Lantern Eel - rank 98 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-bonefin-lantern-shark` - Bonefin Lantern Shark - rank 99 - P3-local-standard - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.
- `fauna-exp-cobalt-gulper-fry` - Cobalt Gulper Fry - rank 100 - P4-benchmark-adjacent - long eel/ribbon/needle - Rebuild from existing alpha with 4-phase spline/mesh wave, anchored head, constant body thickness, and stable crop; keep passable current pose spacing as reference when alpha delta is already high.

## Proof matrix

- Static color contact sheets: original vs upgraded, frame labels, current metrics printed per row, grouped by morphotype and priority.
- Static grayscale contact sheets at runtime scale, including the top P0/P1 rows and each morphotype representative.
- Metric recomputation from the rebuilt runtime PNG/manifests: frame count, alpha delta, area drift, near-duplicate score, palette/lighting variance, margins, loose frame vs sheet match.
- Live normal-play #game canvas captures, not review routes: surface/biome 1, mid/biome 2-3 cutoff, and deep/biome 4 depth bands with representative upgraded fauna visible.
- Runtime asset-loading proof: browser/network or loader log showing /assets/generated/<assetKey>.frames.json and <assetKey>.png loaded for upgraded entries, plus manifest frameCount/frameRate evidence.
- Side-by-side against accepted benchmark rows: Nautilus, Reef Squid, Glass Squid, Bigfin Squid, Vampire Squid, and passable eel/ribbon candidates where relevant.

## Implementation notes

- Keep the repo pinned to `/mnt/nxt-dev/water9` and run the preflight before work.
- Do not use review/prototype route proof as a substitute for normal gameplay: the acceptance bar needs actual `#game canvas` captures with the runtime loader consuming `/assets/generated/<assetKey>.frames.json` and `<assetKey>.png`.
- Generate side-by-side proof against the accepted benchmark rows and the prior weak rows. Metric PASS is not enough without visual inspection.
- Preserve existing display names, asset keys, content entries, and manifest paths unless the implementation owner intentionally stages accepted runtime replacements.

## Caveats

- This is a triage/planning lane. It used prior appraisal evidence and static proof sheets; it did not run a new live canvas smoke or regenerate any frames.
- Some local-rebuild entries may still need imagegen if mask probing shows fused fins/legs or unreadable alpha edges. Escalate those only after a contact-sheet comparison fails.
- There is no direct accepted benchmark for jelly, crustaceans, flat/ray/flounder, and odd/sessile fauna in the prior appraisal. Those need the neutral benchmark metric envelope plus morph-specific visual proof.
