# Scan Payout Roster Audit - 2026-07-06

HEAD: 03b2dad  
Scope: biomeFish fauna, biomeFlora flora, and articulated creature manifest/runtime definitions.

## Reward Formula

- Base scan credits: common 320, uncommon 620, rare 1,150, epic 2,100, legendary 3,600.
- Danger bonuses: hostile fish +180, hazardous flora +220, every articulated creature +720.
- Scanner multiplier: `1 + scannerLevel * 0.16`.
- Likely max scanner by biome from `upgradeMax`: B1 Mk 4 (1.64x), B2 Mk 7 (2.12x), B3 Mk 10 (2.60x), B4 Mk 12 (2.92x).
- Aux Seeker scan reward: `Math.round(scanReward(target) * 0.45)`; this is included per roster row but is a Leviathan/auxiliary feature, not early-game.

## Totals By Biome / Kind / Rarity

This table includes all manifest articulated definitions; prototype-only rows are flagged in the last column.

| Biome | Kind | Rarity | Rows | Scanner 0 sum | Likely max scanner sum | Normal runtime rows | Prototype-only rows |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | articulated | rare | 1 | 1870 | 3067 | 0 | 1 |
| B1 | fish | common | 2 | 640 | 1050 | 2 | 0 |
| B1 | fish | uncommon | 11 | 7000 | 11482 | 11 | 0 |
| B1 | fish | rare | 27 | 31230 | 51217 | 27 | 0 |
| B1 | fish | epic | 1 | 2280 | 3739 | 1 | 0 |
| B1 | flora | common | 1 | 320 | 525 | 1 | 0 |
| B1 | flora | uncommon | 1 | 620 | 1017 | 1 | 0 |
| B1 | flora | epic | 1 | 2320 | 3805 | 1 | 0 |
| B2 | articulated | rare | 12 | 22440 | 47568 | 0 | 12 |
| B2 | articulated | epic | 1 | 2820 | 5978 | 1 | 0 |
| B2 | fish | common | 4 | 1280 | 2712 | 4 | 0 |
| B2 | fish | uncommon | 6 | 4080 | 8648 | 6 | 0 |
| B2 | fish | rare | 23 | 26630 | 56456 | 23 | 0 |
| B2 | fish | epic | 5 | 11220 | 23788 | 5 | 0 |
| B2 | flora | common | 1 | 320 | 678 | 1 | 0 |
| B2 | flora | uncommon | 1 | 840 | 1781 | 1 | 0 |
| B2 | flora | epic | 1 | 2320 | 4918 | 1 | 0 |
| B3 | articulated | rare | 16 | 29920 | 77792 | 1 | 15 |
| B3 | articulated | epic | 7 | 19740 | 51324 | 1 | 6 |
| B3 | articulated | legendary | 2 | 8640 | 22464 | 2 | 0 |
| B3 | fish | common | 4 | 1460 | 3796 | 4 | 0 |
| B3 | fish | uncommon | 3 | 1860 | 4836 | 3 | 0 |
| B3 | fish | rare | 16 | 18580 | 48308 | 16 | 0 |
| B3 | fish | epic | 8 | 18240 | 47424 | 8 | 0 |
| B3 | fish | legendary | 1 | 3780 | 9828 | 1 | 0 |
| B3 | flora | common | 1 | 320 | 832 | 1 | 0 |
| B3 | flora | uncommon | 1 | 840 | 2184 | 1 | 0 |
| B3 | flora | epic | 1 | 2320 | 6032 | 1 | 0 |
| B4 | articulated | rare | 25 | 46750 | 136500 | 1 | 24 |
| B4 | articulated | epic | 7 | 19740 | 57638 | 1 | 6 |
| B4 | articulated | legendary | 5 | 21600 | 63070 | 3 | 2 |
| B4 | fish | common | 3 | 1140 | 3328 | 3 | 0 |
| B4 | fish | uncommon | 5 | 3280 | 9576 | 5 | 0 |
| B4 | fish | rare | 11 | 13010 | 37990 | 11 | 0 |
| B4 | fish | epic | 7 | 15960 | 46606 | 7 | 0 |
| B4 | fish | legendary | 1 | 3780 | 11038 | 1 | 0 |
| B4 | flora | common | 1 | 320 | 934 | 1 | 0 |
| B4 | flora | uncommon | 1 | 840 | 2453 | 1 | 0 |
| B4 | flora | epic | 1 | 2320 | 6774 | 1 | 0 |

## Normal Runtime Totals

This excludes prototype-only articulated creatures unless they are accepted or legacy-spawned by `shouldSpawnArticulatedCreature`.

| Biome | Kind | Rarity | Rows | Scanner 0 sum | Likely max scanner sum | Normal runtime rows | Prototype-only rows |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | fish | common | 2 | 640 | 1050 | 2 | 0 |
| B1 | fish | uncommon | 11 | 7000 | 11482 | 11 | 0 |
| B1 | fish | rare | 27 | 31230 | 51217 | 27 | 0 |
| B1 | fish | epic | 1 | 2280 | 3739 | 1 | 0 |
| B1 | flora | common | 1 | 320 | 525 | 1 | 0 |
| B1 | flora | uncommon | 1 | 620 | 1017 | 1 | 0 |
| B1 | flora | epic | 1 | 2320 | 3805 | 1 | 0 |
| B2 | articulated | epic | 1 | 2820 | 5978 | 1 | 0 |
| B2 | fish | common | 4 | 1280 | 2712 | 4 | 0 |
| B2 | fish | uncommon | 6 | 4080 | 8648 | 6 | 0 |
| B2 | fish | rare | 23 | 26630 | 56456 | 23 | 0 |
| B2 | fish | epic | 5 | 11220 | 23788 | 5 | 0 |
| B2 | flora | common | 1 | 320 | 678 | 1 | 0 |
| B2 | flora | uncommon | 1 | 840 | 1781 | 1 | 0 |
| B2 | flora | epic | 1 | 2320 | 4918 | 1 | 0 |
| B3 | articulated | rare | 1 | 1870 | 4862 | 1 | 0 |
| B3 | articulated | epic | 1 | 2820 | 7332 | 1 | 0 |
| B3 | articulated | legendary | 2 | 8640 | 22464 | 2 | 0 |
| B3 | fish | common | 4 | 1460 | 3796 | 4 | 0 |
| B3 | fish | uncommon | 3 | 1860 | 4836 | 3 | 0 |
| B3 | fish | rare | 16 | 18580 | 48308 | 16 | 0 |
| B3 | fish | epic | 8 | 18240 | 47424 | 8 | 0 |
| B3 | fish | legendary | 1 | 3780 | 9828 | 1 | 0 |
| B3 | flora | common | 1 | 320 | 832 | 1 | 0 |
| B3 | flora | uncommon | 1 | 840 | 2184 | 1 | 0 |
| B3 | flora | epic | 1 | 2320 | 6032 | 1 | 0 |
| B4 | articulated | rare | 1 | 1870 | 5460 | 1 | 0 |
| B4 | articulated | epic | 1 | 2820 | 8234 | 1 | 0 |
| B4 | articulated | legendary | 3 | 12960 | 37842 | 3 | 0 |
| B4 | fish | common | 3 | 1140 | 3328 | 3 | 0 |
| B4 | fish | uncommon | 5 | 3280 | 9576 | 5 | 0 |
| B4 | fish | rare | 11 | 13010 | 37990 | 11 | 0 |
| B4 | fish | epic | 7 | 15960 | 46606 | 7 | 0 |
| B4 | fish | legendary | 1 | 3780 | 11038 | 1 | 0 |
| B4 | flora | common | 1 | 320 | 934 | 1 | 0 |
| B4 | flora | uncommon | 1 | 840 | 2453 | 1 | 0 |
| B4 | flora | epic | 1 | 2320 | 6774 | 1 | 0 |

## Top 20 Current Scanner-0 Payouts

| Rank | Kind | Biome/min | Species | Rarity | Reward 0 | Likely max at first biome | Why high |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | articulated | B4+ | Abyssal Crownmaw | legendary | 4320 | 12614 | legendary base 3600c + 720c articulated danger bonus |
| 2 | articulated | B3+ | Abyssal Gulper | legendary | 4320 | 11232 | legendary base 3600c + 720c articulated danger bonus |
| 3 | articulated | B4+ | Abyssal Reliquary Wyrm | legendary | 4320 | 12614 | legendary base 3600c + 720c articulated danger bonus; prototype-only in normal runtime |
| 4 | articulated | B4+ | Abyssal Riftmaw | legendary | 4320 | 12614 | legendary base 3600c + 720c articulated danger bonus; prototype-only in normal runtime |
| 5 | articulated | B3+ | Abyssal Serpent | legendary | 4320 | 11232 | legendary base 3600c + 720c articulated danger bonus |
| 6 | fish | B3 | Black Swallower | legendary | 3780 | 9828 | legendary base 3600c + 180c hostile bonus |
| 7 | articulated | B2+ | Abyssal Mandible Bobbit | epic | 2820 | 5978 | epic base 2100c + 720c articulated danger bonus |
| 8 | articulated | B3+ | Chainmaw Eel | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 9 | articulated | B3+ | Harpoon Cone | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 10 | articulated | B3+ | Hookjaw Isopod | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 11 | articulated | B3+ | Siphon Lily | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 12 | articulated | B3+ | Trap-Jaw Bristle | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 13 | articulated | B3+ | Velvet Lantern Cuttle | epic | 2820 | 7332 | epic base 2100c + 720c articulated danger bonus; prototype-only in normal runtime |
| 14 | flora | B3 | Crown Polyp | epic | 2320 | 6032 | epic base 2100c + 220c hazard bonus |
| 15 | flora | B2 | Ember Bloom | epic | 2320 | 4918 | epic base 2100c + 220c hazard bonus |
| 16 | flora | B4 | Oracle Polyp | epic | 2320 | 6774 | epic base 2100c + 220c hazard bonus |
| 17 | flora | B1 | Sting Anemone | epic | 2320 | 3805 | epic base 2100c + 220c hazard bonus |
| 18 | fish | B4 | Anchorfin Eel | epic | 2280 | 6658 | epic base 2100c + 180c hostile bonus |
| 19 | fish | B4 | Ancient Mask Angler | epic | 2280 | 6658 | epic base 2100c + 180c hostile bonus |
| 20 | fish | B3 | Bonefin Lantern Shark | epic | 2280 | 5928 | epic base 2100c + 180c hostile bonus |

## Early B1/B2 Scanner-0 Summary

Ordering is by minimum configured spawn depth/Y and normal-runtime articulated gating.

| Biome | Set | Scans | Scanner 0 total | Likely max scanner | Likely max total | First entries |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | first5 | 5 | 3560 | 4 | 5839 | Lantern Fry 320c; Snapping Shrimp 320c; Opal Fan Shrimp 1150c; Comb Jelly 620c; Ember Needle Pipefish 1150c |
| B1 | first10 | 10 | 6890 | 4 | 11301 | Lantern Fry 320c; Snapping Shrimp 320c; Opal Fan Shrimp 1150c; Comb Jelly 620c; Ember Needle Pipefish 1150c; Glass Kelp 320c; Prism Bell Jelly 1150c; Glass Ray 620c; Cobalt Sawtail Minnow 620c; Ivory Spined Cardinal 620c |
| B1 | allReachable | 44 | 44410 | 4 | 72835 | Lantern Fry 320c; Snapping Shrimp 320c; Opal Fan Shrimp 1150c; Comb Jelly 620c; Ember Needle Pipefish 1150c; Glass Kelp 320c; Prism Bell Jelly 1150c; Glass Ray 620c; Cobalt Sawtail Minnow 620c; Ivory Spined Cardinal 620c |
| B2 | first5 | 5 | 3260 | 7 | 6910 | Ash Minnow 320c; Deep Sea Shrimp 320c; Velvet Glass Cuttle 1150c; Brine Grass 320c; Copper Ribbon Eel 1150c |
| B2 | first10 | 10 | 9310 | 7 | 19736 | Ash Minnow 320c; Deep Sea Shrimp 320c; Velvet Glass Cuttle 1150c; Brine Grass 320c; Copper Ribbon Eel 1150c; Hatchetfish 320c; Glass Helm Nautilus 1150c; Vent Pearl Copepod 1150c; Moonmask Lionfish 2280c; Chimney Ghost Shrimp 1150c |
| B2 | allReachable | 42 | 49510 | 7 | 104959 | Ash Minnow 320c; Deep Sea Shrimp 320c; Velvet Glass Cuttle 1150c; Brine Grass 320c; Copper Ribbon Eel 1150c; Hatchetfish 320c; Glass Helm Nautilus 1150c; Vent Pearl Copepod 1150c; Moonmask Lionfish 2280c; Chimney Ghost Shrimp 1150c |

## Intended-Direction Violations

### Large non-epic/non-legendary payouts

Every rare articulated creature pays 1,870c at scanner 0 because rare base 1,150c combines with the universal articulated +720c danger bonus. Rare hazardous flora pay 1,370c, and rare hostile fish pay 1,330c. These are large despite not being epic or legendary.

| Kind | Biome/min | Species | Rarity | Reward 0 | Danger bonus | Runtime |
| --- | --- | --- | --- | --- | --- | --- |
| articulated | B3+ | Abyssal Glasshook Skulk | rare | 1870 | 720 | legacy |
| articulated | B4+ | Abyssal Lantern Mantis | rare | 1870 | 720 | prototype |
| articulated | B3+ | Black Coral Gate | rare | 1870 | 720 | prototype |
| articulated | B3+ | Brine Crown | rare | 1870 | 720 | prototype |
| articulated | B2+ | Brine Mycelium Shelf | rare | 1870 | 720 | prototype |
| articulated | B2+ | Cavitation Boxer | rare | 1870 | 720 | prototype |
| articulated | B2+ | Chain Vein Siphonophore | rare | 1870 | 720 | prototype |
| articulated | B2+ | Coronate Sting Crown | rare | 1870 | 720 | prototype |
| articulated | B4+ | Glass Sponge Sentinel | rare | 1870 | 720 | prototype |
| articulated | B4+ | Gulper Eel Maw | rare | 1870 | 720 | prototype |
| articulated | B4+ | Hadal Trencher Isopod | rare | 1870 | 720 | prototype |
| articulated | B2+ | Lantern Anemone Pit | rare | 1870 | 720 | prototype |
| articulated | B3+ | Predatory Tunicate Maw | rare | 1870 | 720 | prototype |
| articulated | B2+ | Razor Kelp Harp | rare | 1870 | 720 | prototype |
| articulated | B2+ | Reef Lion Moray | rare | 1870 | 720 | prototype |
| articulated | B4+ | Reliquary Siphonophore | rare | 1870 | 720 | prototype |
| articulated | B4+ | Saber Viperfish | rare | 1870 | 720 | prototype |
| articulated | B2+ | Sand Battery | rare | 1870 | 720 | prototype |
| articulated | B2+ | Sawback Ray | rare | 1870 | 720 | prototype |
| articulated | B1+ | Thorn Fan Coralline | rare | 1870 | 720 | prototype |
| articulated | B2+ | Thornhalo Urchin | rare | 1870 | 720 | prototype |
| articulated | B4+ | Trench Harvest Sea Spider | rare | 1870 | 720 | prototype |
| articulated | B4+ | Tripod Stilt Stalker | rare | 1870 | 720 | prototype |
| articulated | B2+ | Vampire Cloak Squid | rare | 1870 | 720 | prototype |
| articulated | B4+ | Vent-Claw Yeti | rare | 1870 | 720 | prototype |
| fish | B1 | Blue-ring Octopus | rare | 1330 | 180 | normal |
| fish | B4 | Cobalt Gulper Fry | rare | 1330 | 180 | normal |
| fish | B2 | Gulper Eel | rare | 1330 | 180 | normal |
| fish | B3 | Onyx Frillshark Fry | rare | 1330 | 180 | normal |
| fish | B3 | Abyssal Thread Eel | rare | 1150 | 0 | normal |
| fish | B1 | Amber Comb Blenny | rare | 1150 | 0 | normal |
| fish | B1 | Amber Snout Boxfish | rare | 1150 | 0 | normal |
| fish | B2 | Ashveil Butterflyfish | rare | 1150 | 0 | normal |
| fish | B1 | Basalt Lantern Seahorse | rare | 1150 | 0 | normal |
| fish | B3 | Black Velvet Cusk | rare | 1150 | 0 | normal |
| fish | B2 | Blackwater Hatchet | rare | 1150 | 0 | normal |
| fish | B1 | Blue Lantern Goby | rare | 1150 | 0 | normal |
| fish | B2 | Bluefire Dragonet | rare | 1150 | 0 | normal |
| fish | B4 | Blueflame Grouperlet | rare | 1150 | 0 | normal |
| fish | B4 | Bonewhisker Brotula | rare | 1150 | 0 | normal |
| fish | B1 | Brightscale Halfbeak | rare | 1150 | 0 | normal |
| fish | B4 | Brineglass Snailfish | rare | 1150 | 0 | normal |
| fish | B4 | Cathedral Fin Ribbonfish | rare | 1150 | 0 | normal |
| fish | B2 | Chimney Ghost Shrimp | rare | 1150 | 0 | normal |
| fish | B2 | Cinder Vent Clingfish | rare | 1150 | 0 | normal |
| fish | B3 | Cobalt Triggerfish | rare | 1150 | 0 | normal |
| fish | B1 | Copper Banded Seahorse | rare | 1150 | 0 | normal |
| fish | B2 | Copper Ribbon Eel | rare | 1150 | 0 | normal |
| fish | B1 | Ember Needle Pipefish | rare | 1150 | 0 | normal |
| fish | B2 | Ghostfin Croaker | rare | 1150 | 0 | normal |
| fish | B2 | Ghostplate Sea Moth | rare | 1150 | 0 | normal |
| fish | B2 | Glass Helm Nautilus | rare | 1150 | 0 | normal |
| fish | B1 | Goldbar Squirrelfish | rare | 1150 | 0 | normal |
| fish | B2 | Goldcap Tripodfish | rare | 1150 | 0 | normal |
| fish | B4 | Hadopelagic Microfish | rare | 1150 | 0 | normal |
| fish | B3 | Ironmask Ratfish | rare | 1150 | 0 | normal |
| fish | B3 | Ivory Ridge Rattail | rare | 1150 | 0 | normal |
| fish | B2 | Ivory Sail Chimaera | rare | 1150 | 0 | normal |
| fish | B4 | Ivorymask Goatfish | rare | 1150 | 0 | normal |
| fish | B1 | Kelp Arrow Squid | rare | 1150 | 0 | normal |
| fish | B4 | Kelpglass Rockfish | rare | 1150 | 0 | normal |
| fish | B3 | Lantern Swarm | rare | 1150 | 0 | normal |
| fish | B4 | Lattice Eye Barreleye | rare | 1150 | 0 | normal |
| fish | B2 | Lumen Brow Barreleye | rare | 1150 | 0 | normal |
| fish | B1 | Lumeneye Squirrelfish | rare | 1150 | 0 | normal |
| fish | B1 | Midnight Hogfish | rare | 1150 | 0 | normal |
| fish | B4 | Mirrorbone Hatchetfish | rare | 1150 | 0 | normal |
| fish | B3 | Moonspot Drumfish | rare | 1150 | 0 | normal |
| fish | B1 | Mottle Reef Cowfish | rare | 1150 | 0 | normal |
| fish | B1 | Nacre Thorn Clam | rare | 1150 | 0 | normal |
| fish | B3 | Neonbar Dartfish | rare | 1150 | 0 | normal |
| fish | B1 | Night Reef Boxfish | rare | 1150 | 0 | normal |
| fish | B1 | Obsidian Reef Wrasse | rare | 1150 | 0 | normal |
| fish | B3 | Obsidian Swallowtail | rare | 1150 | 0 | normal |
| fish | B1 | Opal Eye Mudskipper | rare | 1150 | 0 | normal |
| fish | B1 | Opal Fan Shrimp | rare | 1150 | 0 | normal |
| fish | B1 | Opalstripe Tilefish | rare | 1150 | 0 | normal |
| fish | B1 | Pearl Eye Flounder | rare | 1150 | 0 | normal |
| fish | B3 | Pearlside Grunt | rare | 1150 | 0 | normal |
| fish | B1 | Prism Bell Jelly | rare | 1150 | 0 | normal |

### Early common/uncommon/rare clusters

| Biome | Scans <= early depth | Scanner 0 total | By rarity | Highest early payouts |
| --- | --- | --- | --- | --- |
| B1 | 31 | 27690 | common: 3/960c; uncommon: 11/7000c; rare: 17/19730c | Blue-ring Octopus 1330c; Opal Fan Shrimp 1150c; Ember Needle Pipefish 1150c; Prism Bell Jelly 1150c; Amber Comb Blenny 1150c; Blue Lantern Goby 1150c; Obsidian Reef Wrasse 1150c; Silver Hinge Crab 1150c; Kelp Arrow Squid 1150c; Basalt Lantern Seahorse 1150c |
| B2 | 23 | 20050 | common: 5/1600c; uncommon: 5/3500c; rare: 13/14950c | Velvet Glass Cuttle 1150c; Copper Ribbon Eel 1150c; Glass Helm Nautilus 1150c; Vent Pearl Copepod 1150c; Chimney Ghost Shrimp 1150c; Saffron Paddle Cuttle 1150c; Cinder Vent Clingfish 1150c; Rustscale Hatchetfish 1150c; Lumen Brow Barreleye 1150c; Ivory Sail Chimaera 1150c |

## Data Caveats

- Rewards are computed from src/helpers.ts scanReward/scannableRarity formulas at HEAD 03b2dad, not from a live Phaser runtime.
- Fish/flora rarity was replicated exactly from helpers.ts against src/content.ts biomeFish/biomeFlora data; scanner max by biome was replicated from upgradeMax for the scanner upgrade.
- Articulated rows use public/assets/generated/articulated-creatures.parts.json plus src/articulated.ts runtime gating. Prototype-only articulated creatures are listed but flagged because normal runtime should not spawn them unless prototypeThreats/playtest is enabled.
- Early B1/B2 first-scan ordering is by minimum configured spawn depth/Y, not by a recorded player route or seeded world availability.
- Aux sub reward is the code path in scene-sub.ts: Math.round(scanReward(target) * 0.45); it requires Leviathan auxiliary Seeker behavior and is not early-game.

## Source Pointers

- content: `src/content.ts`
- rewards: `src/helpers.ts:2559-2666`
- scanRuntime: `src/scene-entities.ts:1046-1083`
- auxSub: `src/scene-sub.ts:257-282`
- articulatedManifest: `public/assets/generated/articulated-creatures.parts.json`
- articulatedRuntime: `src/articulated.ts:300-331`
