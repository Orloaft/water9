# Water9 Current Fauna Roster Behavior Audit - 2026-07-06

## Status And Preflight

- Status: report/data artifact only; no source or runtime assets edited, staged, or committed.
- Repo pin: `/mnt/nxt-dev/water9`.
- Preflight command: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `539c6b8`.
- HEAD expectation: manager preflight requested `539c6b8` or descendant; current HEAD is exactly `539c6b8`.
- Dirty-state caveat: working tree was already dirty before this audit, including `src/content.ts`, `src/helpers.ts`, generated fauna assets, and other `runs/` artifacts. Per task, current disk was treated as source of truth.
- Active fauna scanned: 138 active `biomeFish` entries from `src/content.ts`.
- July 5 comparison: prior classification had 138 entries, so entry-count delta is 0. Missing current species: 0. Prior species absent today: 0.

## Summary

| Metric | Value |
| --- | --- |
| Current entries | 138 |
| July 5 entries | 138 |
| Delta | 0 |
| Critical mismatches | 1 |
| High mismatches | 23 |
| Critical + high mismatches | 24 |

## Recommended Class Counts

| Recommended behavior class | Entries |
| --- | --- |
| openWaterSchoolingFish | 18 |
| cruiserSoloSwimmer | 38 |
| hoverDrifter | 9 |
| cephalopodHover | 12 |
| verticalAnchored | 6 |
| benthicWalker | 10 |
| sessileAttached | 3 |
| bottomRestingGlider | 15 |
| predatorPursuerAmbusher | 27 |

## Mismatch Severity Counts

| Severity | Entries |
| --- | --- |
| none | 75 |
| low | 9 |
| medium | 30 |
| high | 23 |
| critical | 1 |

## Highest-Severity Mismatches

| Severity | Biome | Species | Pattern | Hostile | Speed | Radius | July 5 class | Recommended class | Terrain | Why it is wrong today |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| critical | 1 | Glimmer Spine Urchin | stalk | true | [34, 64] | 14 | sessileAttached | sessileAttached | surfaceAttached | Biome 1 urchin likely matching Alex's example: hostile stalk with speed [34, 64] and radius 14 enters pursuit, so a sessile contact hazard reads as rapidly swimming at the player. |
| high | 1 | Basalt Lantern Seahorse | circle | false | [18, 36] | 12 | verticalAnchored | verticalAnchored | nearTerrain | Should stay rooted or near-rooted and mostly upright; current circle movement lets it roam the water column. |
| high | 1 | Blue-ring Octopus | circle | true | [18, 34] | 14 | cephalopodHover | cephalopodHover | openWater | Should hover with pulse-jet bursts and slower orientation; current circle behavior uses generic fish steering and hostile pursuit. |
| high | 1 | Copper Banded Seahorse | circle | false | [18, 36] | 12 | verticalAnchored | verticalAnchored | nearTerrain | Should stay rooted or near-rooted and mostly upright; current circle movement lets it roam the water column. |
| high | 1 | Ember Needle Pipefish | glide | false | [26, 48] | 10 | verticalAnchored | verticalAnchored | nearTerrain | Should stay rooted or near-rooted and mostly upright; current glide movement lets it roam the water column. |
| high | 1 | Glass Ray | glide | false | [18, 32] | 15 | bottomRestingGlider | bottomRestingGlider | nearTerrain | Should skim, rest, or move just above terrain; current glide behavior has no bottom clearance or settle state. |
| high | 1 | Mantis Shrimp | stalk | true | [34, 62] | 12 | benthicWalker | benthicWalker | bottom | Should use floor/near-terrain skitters, pauses, and short hops/lunges; current stalk steering treats it as a swimmer. |
| high | 1 | Nacre Thorn Clam | sway | false | [12, 24] | 12 | sessileAttached | sessileAttached | bottom | Should be attached to terrain with defensive/contact behavior; current sway steering in open water detaches the body plan from its surface. |
| high | 1 | Nautilus | circle | false | [12, 24] | 15 | cephalopodHover | cephalopodHover | openWater | Should hover with pulse-jet bursts and slower orientation; current circle behavior uses generic fish steering. |
| high | 1 | Opal Eye Mudskipper | glide | false | [26, 48] | 11 | bottomRestingGlider | bottomRestingGlider | bottom | Should skim, rest, or move just above terrain; current glide behavior has no bottom clearance or settle state. |
| high | 1 | Pearl Eye Flounder | glide | false | [26, 48] | 14 | bottomRestingGlider | bottomRestingGlider | bottom | Should skim, rest, or move just above terrain; current glide behavior has no bottom clearance or settle state. |
| high | 1 | Shellback Garden Eel | sway | false | [12, 24] | 10 | verticalAnchored | verticalAnchored | bottom | Should stay rooted or near-rooted and mostly upright; current sway movement lets it roam the water column. |
| high | 1 | Silver Hinge Crab | glide | false | [26, 48] | 12 | benthicWalker | benthicWalker | bottom | Should use floor/near-terrain skitters, pauses, and short hops/lunges; current glide steering treats it as a swimmer. |
| high | 1 | Tidepool Octopus | sway | false | [14, 28] | 17 | cephalopodHover | cephalopodHover | openWater | Should hover with pulse-jet bursts and slower orientation; current sway behavior uses generic fish steering. |
| high | 2 | Brass Knuckle Prawn | stalk | true | [34, 64] | 14 | benthicWalker | benthicWalker | bottom | Should use floor/near-terrain skitters, pauses, and short hops/lunges; current stalk steering treats it as a swimmer. |
| high | 2 | Cinder Vent Clingfish | glide | false | [26, 48] | 11 | sessileAttached | sessileAttached | wall | Should be attached to terrain with defensive/contact behavior; current glide steering in open water detaches the body plan from its surface. |
| high | 2 | Glass Helm Nautilus | glide | false | [26, 48] | 11 | cephalopodHover | cephalopodHover | openWater | Should hover with pulse-jet bursts and slower orientation; current glide behavior uses generic fish steering. |
| high | 2 | Goldcap Tripodfish | sway | false | [12, 24] | 12 | verticalAnchored | verticalAnchored | bottom | Should stay rooted or near-rooted and mostly upright; current sway movement lets it roam the water column. |
| high | 2 | Lumen Kite Ray | circle | false | [18, 36] | 14 | bottomRestingGlider | bottomRestingGlider | nearTerrain | Should skim, rest, or move just above terrain; current circle behavior has no bottom clearance or settle state. |
| high | 2 | Sea Spider | circle | true | [18, 34] | 15 | benthicWalker | benthicWalker | bottom | Should use floor/near-terrain skitters, pauses, and short hops/lunges; current circle steering treats it as a swimmer. |
| high | 2 | Tin Plate Searobin | glide | false | [26, 48] | 11 | benthicWalker | benthicWalker | bottom | Should use floor/near-terrain skitters, pauses, and short hops/lunges; current glide steering treats it as a swimmer. |
| high | 2 | Tripodfish | sway | false | [10, 22] | 18 | verticalAnchored | verticalAnchored | bottom | Should stay rooted or near-rooted and mostly upright; current sway movement lets it roam the water column. |
| high | 2 | Vampire Squid | stalk | true | [34, 60] | 14 | cephalopodHover | cephalopodHover | openWater | Should hover with pulse-jet bursts and slower orientation; current stalk behavior uses generic fish steering and hostile pursuit. |
| high | 4 | Abyssal Medusa | circle | false | [10, 22] | 16 | hoverDrifter | hoverDrifter | openWater | Should drift/bob with weak steering and mostly upright orientation; current circle still routes through fish steering. |

## Alex Urchin Callout

The likely example is biome 1 `Glimmer Spine Urchin` (asset `fauna-exp-glimmer-spine-urchin`, count 2). Today it is `hostile: true`, `pattern: 'stalk'`, `speed: [34, 64]`, and `radius: 14` in `src/content.ts`.

That combination routes the urchin through the generic hostile pursuit path: `stalk` hostile fauna can acquire aggro inside the runtime detection range, steer toward a lead/flank point around the player, and clamp pursuit velocity above its base speed. A sea urchin should read as a stationary or surface-attached contact hazard. When it swims rapidly at the player, the creature reads like a chasing enemy sprite with the wrong body plan.

## Special Body-Plan Notes

- Urchins and clams: `Glimmer Spine Urchin` is critical because hostile stalk turns a sessile hazard into a pursuer. `Nacre Thorn Clam` is high because even slow sway detaches a clam from terrain.
- Crabs, shrimp, and prawns: `Silver Hinge Crab`, `Mantis Shrimp`, `Sea Spider`, `Brass Knuckle Prawn`, and `Tin Plate Searobin` are high because they need floor contact, tangent motion, pauses, and short lunges rather than full water-column steering. Smaller shrimp entries are medium because brief swimming is plausible, but schooling/open-water behavior still reads wrong.
- Tripodfish, seahorses, pipefish, and garden eels: all six `verticalAnchored` entries are high. They need rooted or near-rooted upright motion and retraction/leaning instead of roaming around an open-water home point.
- Flounders and rays: `Glass Ray`, `Pearl Eye Flounder`, `Opal Eye Mudskipper`, and `Lumen Kite Ray` are high because the current system has no floor clearance, resting, or terrain-following state.
- Jellyfish and drifters: sway is less bad than stalk/glide, but jellyfish still use fish steering and velocity-facing. `Abyssal Medusa` is high because `circle` movement gives an especially intentional patrol read.
- Nautilus and cephalopods: `Nautilus`, `Blue-ring Octopus`, `Tidepool Octopus`, `Vampire Squid`, and `Glass Helm Nautilus` are high. Squid/cuttle entries with glide are medium: they can move, but should hover and pulse-jet rather than tail-swim.
- Clingfish: `Cinder Vent Clingfish` is high because it should attach to vent/wall/floor surfaces and detach only briefly.
- Normal fish: `openWaterSchoolingFish`, most `cruiserSoloSwimmer`, and fish-like `predatorPursuerAmbusher` entries are none/low. The current steering is a usable starting point for them once behavior classes replace overloaded legacy patterns.

## First Classes To Implement

Recommended first slice:

| Priority | Class | Critical/high entries covered | Why first |
| --- | --- | --- | --- |
| 1 | sessileAttached | 3 | Contains the only critical issue, Alex's urchin case, and fixes clam/clingfish surface attachment. |
| 2 | verticalAnchored | 6 | Covers the largest high-severity group with one rooted/upright model. |
| 3 | benthicWalker | 5 | Covers the clearest legged/walking silhouettes and hostile short-lunge cases. |

These three classes cover 14 high-severity entries plus the single critical entry. Raw high-count runners-up are `cephalopodHover` with 5 and `bottomRestingGlider` with 4, but those can follow after the impossible terrain-contact reads are addressed.

1. `sessileAttached`: fixes Alex's urchin case plus clams and clingfish by reusing terrain anchors and disabling translational fish steering.
2. `verticalAnchored`: fixes tripodfish, garden eel, seahorses, and pipefish with a shared rooted/upright model.
3. `benthicWalker`: fixes the most obvious legged and walking silhouettes, including hostile prawns/shrimp as short lunges rather than chase behavior.

`bottomRestingGlider` should follow closely for rays/flounders/mudskippers, but the first three classes address the clearest impossible movement reads.

## Top 10 To Fix First

| Rank | Biome | Species | Severity | Current pattern | Recommended class | Terrain |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Glimmer Spine Urchin | critical | stalk | sessileAttached | surfaceAttached |
| 2 | 1 | Shellback Garden Eel | high | sway | verticalAnchored | bottom |
| 3 | 2 | Tripodfish | high | sway | verticalAnchored | bottom |
| 4 | 2 | Goldcap Tripodfish | high | sway | verticalAnchored | bottom |
| 5 | 2 | Brass Knuckle Prawn | high | stalk | benthicWalker | bottom |
| 6 | 1 | Mantis Shrimp | high | stalk | benthicWalker | bottom |
| 7 | 1 | Silver Hinge Crab | high | glide | benthicWalker | bottom |
| 8 | 2 | Tin Plate Searobin | high | glide | benthicWalker | bottom |
| 9 | 1 | Nacre Thorn Clam | high | sway | sessileAttached | bottom |
| 10 | 2 | Cinder Vent Clingfish | high | glide | sessileAttached | wall |

## Medium Watchlist

These are not the first blockers, but they should be covered by the same broad classes rather than bespoke species code:

| Biome | Species | Current pattern | Recommended class | Terrain |
| --- | --- | --- | --- | --- |
| 1 | Opal Fan Shrimp | glide | benthicWalker | nearTerrain |
| 1 | Snapping Shrimp | school | benthicWalker | nearTerrain |
| 2 | Chimney Ghost Shrimp | glide | benthicWalker | nearTerrain |
| 2 | Deep Sea Shrimp | school | benthicWalker | nearTerrain |
| 3 | Hadopelagic Shrimp | school | benthicWalker | nearTerrain |
| 1 | Amber Comb Blenny | glide | bottomRestingGlider | bottom |
| 1 | Blue Lantern Goby | glide | bottomRestingGlider | bottom |
| 1 | Opalstripe Tilefish | glide | bottomRestingGlider | bottom |
| 2 | Bluefire Dragonet | glide | bottomRestingGlider | bottom |
| 3 | Black Velvet Cusk | glide | bottomRestingGlider | nearTerrain |
| 3 | Rustjaw Blenny | glide | bottomRestingGlider | bottom |
| 3 | Snowcap Snailfish | sway | bottomRestingGlider | bottom |
| 3 | Sulfur Eye Hagfish | glide | bottomRestingGlider | nearTerrain |
| 4 | Brineglass Snailfish | sway | bottomRestingGlider | bottom |
| 4 | Ivorymask Goatfish | glide | bottomRestingGlider | bottom |
| 4 | Kelpglass Rockfish | glide | bottomRestingGlider | bottom |
| 1 | Kelp Arrow Squid | circle | cephalopodHover | openWater |
| 1 | Reef Squid | glide | cephalopodHover | openWater |
| 2 | Glass Squid | glide | cephalopodHover | openWater |
| 2 | Saffron Paddle Cuttle | circle | cephalopodHover | openWater |
| 2 | Velvet Glass Cuttle | circle | cephalopodHover | openWater |
| 3 | Bigfin Squid | glide | cephalopodHover | openWater |
| 4 | Abyss Vampire Squid | glide | cephalopodHover | openWater |
| 1 | Comb Jelly | sway | hoverDrifter | openWater |
| 1 | Moon Jelly | sway | hoverDrifter | openWater |
| 1 | Prism Bell Jelly | sway | hoverDrifter | openWater |
| 3 | Abyssal Jelly | sway | hoverDrifter | openWater |
| 3 | Lantern Swarm | sway | hoverDrifter | openWater |
| 4 | Abyssal Hatchet School | sway | hoverDrifter | openWater |
| 2 | Ventstripe Moray | stalk | predatorPursuerAmbusher | nearTerrain |

## Caveats

- This audit did not run a dev server and did not visually inspect live gameplay. It uses current `src/content.ts`, the July 5 JSON/proposal, and limited asset manifest checks where body-plan names needed confirmation.
- The prior JSON had complete coverage for today's 138 entries. No species/asset tuple was added or removed since the July 5 classification.
- `Ventstripe Moray` is the only recommended-class correction in this audit: July 5 classified it as `bottomRestingGlider` with a ray-style note, but it is better represented as a near-terrain `predatorPursuerAmbusher`.
- Severity is a game-feel audit, not a biological taxonomy. The goal is to prioritize broad data-driven movement classes that make silhouettes read correctly in play.
