# Complex Colonial Forms

Lane: `complex-colonial-forms`

Focus:
Audit colonial, chain, siphonophore, coral, and mycelium concepts for non-collage cohesion and simplified source-generation language.

Rules:
- Do not edit files directly from a research assignment.
- Keep output factual, compact, and candidate-id keyed.
- Preserve the game design verb; propose patches only when they improve source generation or articulation.
- Flag anything that risks collage-like source art, weak silhouette, or non-riggable anatomy.
- Use the candidate command blocks to turn accepted research into source art capture, validation, and sandbox preview work.

Lane source handoff:
```bash
npm run source:next-prompt -- --id glass-sponge-sentinel
npm run source:session -- --id glass-sponge-sentinel
npm run source:inbox-capture -- --id glass-sponge-sentinel --open
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel,black-coral-gate,reliquary-siphonophore,chain-vein-siphonophore,brine-mycelium-shelf,thorn-fan-coralline
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel,black-coral-gate,reliquary-siphonophore,chain-vein-siphonophore,brine-mycelium-shelf,thorn-fan-coralline --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel,black-coral-gate,reliquary-siphonophore,chain-vein-siphonophore,brine-mycelium-shelf,thorn-fan-coralline
```

Expected JSON shape:
```json
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "complex-colonial-forms",
  "findings": [
    {
      "id": "<candidate-id>",
      "strengths": [
        "<specific strong read>"
      ],
      "sourceGenerationRisks": [
        "<specific risk>"
      ],
      "suggestedResearchPatch": {
        "biologicalAnchors": [
          "<optional replacement/addition>"
        ],
        "requiredRead": [
          "<optional replacement/addition>"
        ],
        "promptRisks": [
          "<optional replacement/addition>"
        ],
        "motionPhases": [
          "<optional replacement/addition>"
        ]
      },
      "referenceSearchTerms": [
        "<stable biological reference keywords>"
      ]
    }
  ]
}
```

Candidates:

## Glass Sponge Sentinel (glass-sponge-sentinel)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: bathyal hardground / abyssal reef edge

Gameplay verb:
Sessile lane-control sentinel: bait the aim, dodge the brittle needle cone, then punish the exposed recharge window.

Biological anchors:
- Glass sponges / Hexactinellida: rigid silica lattice body, vase or barrel silhouette, deep-water filter-feeder posture.
- Venus flower basket cues: woven cage ribs, cross-braced spicule grid, translucent mineral-white skeleton.
- Osculum and pump anatomy: a large central throat that visibly inhales, compresses, then vents the attack direction.
- Siliceous spicules as defense: brittle needle bundles, star-like spicule clusters, and glassy spear cones that feel organic, not metallic.
- Deep sponge reef habitat logic: sessile sentinel anchored to rock, dangerous because it controls approach lanes rather than chasing.

Required read:
- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

Articulatable parts:
- root rock/base anchor
- lower stalk or foot collar
- main vase body torso
- front lattice rib group
- rear lattice rib group
- left rim plate
- right rim plate
- central osculum/throat valve head
- three brittle needle-cone petals
- outer spicule crown
- small fracture shard overlays
- separate needle-cone projectile / pressure-ring VFX

Prompt risks:
- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.

Source handoff commands:
```bash
npm run source:next-prompt -- --id glass-sponge-sentinel
npm run source:session -- --id glass-sponge-sentinel
npm run source:inbox-capture -- --id glass-sponge-sentinel --open
npm run source:recover-inline -- --id glass-sponge-sentinel --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids glass-sponge-sentinel
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --serve --open --visual
```

## Black Coral Gate (black-coral-gate)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: bathyal ruins / biome 3+

Gameplay verb:
Passage-control ambusher that holds an open arch, telegraphs with glowing hinge polyps, then drops and clamps a living portcullis around the diver.

Biological anchors:
- Black coral / antipatharian branching skeletons: dark thorny axial rods with living polyps on the surface.
- Gorgonian sea fans and whip corals for a gate-like lattice that still reads as one colony.
- Coral polyp retraction and synchronized pulsing as the visual telegraph before closure.
- Basket-star or brittle-star hinge logic for flexible branching arms that fold inward without becoming mechanical.
- Encrusting ruin fauna cues: the organism may mimic an archway, but the body must remain biological, rooted, and alive.

Required read:
- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

Articulatable parts:
- left root mat
- right root mat
- left pillar trunk
- right pillar trunk
- upper crown bridge torso
- central descending portcullis bar cluster
- near folding thorn gate arm
- far folding thorn gate arm
- left hinge polyp knot
- right hinge polyp knot
- lower clamp teeth / latch spines
- glow-polyp warning overlay

Prompt risks:
- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.

Source handoff commands:
```bash
npm run source:next-prompt -- --id black-coral-gate
npm run source:session -- --id black-coral-gate
npm run source:inbox-capture -- --id black-coral-gate --open
npm run source:recover-inline -- --id black-coral-gate --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids black-coral-gate
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids black-coral-gate --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids black-coral-gate
npm run sandbox:preview -- --id black-coral-gate --kind source --serve --open --visual
```

## Reliquary Siphonophore (reliquary-siphonophore)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: bathypelagic / abyssal ruin shafts

Gameplay verb:
Vertical tripwire colony: thread the safe gap, avoid the stinging curtain pulse, then punish the dim reload window.

Biological anchors:
- Siphonophore colony logic: one animal-like colony made from specialized zooids, not a swarm of unrelated jellyfish.
- Portuguese man-of-war and deep siphonophore cues: float/crest, nectophore bells, feeding polyps, and long stinging tentilla.
- Chandelier silhouette: a clear upper float, central living chain, hanging bead organs, and three to five broad readable tripwire tendrils.
- Bioluminescent lure organs and pulsing zooid beads for telegraph clarity.
- Cnidocyte sting behavior: fine biological harpoons implied through glowing tentilla tips, not metal hooks or wires.

Required read:
- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

Articulatable parts:
- top gas float / crest
- central colony spine torso
- stacked nectophore bell clusters
- left lateral bell fin
- right lateral bell fin
- connected zooid/bract chain with visible membranes
- front feeding polyp cluster
- rear feeding polyp cluster
- four broad tripwire tendrils with bulb tips
- anatomical lure bead
- sting-tip bead anatomy
- separate tripwire pulse / contact spark VFX

Prompt risks:
- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.

Source handoff commands:
```bash
npm run source:next-prompt -- --id reliquary-siphonophore
npm run source:session -- --id reliquary-siphonophore
npm run source:inbox-capture -- --id reliquary-siphonophore --open
npm run source:recover-inline -- --id reliquary-siphonophore --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids reliquary-siphonophore
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids reliquary-siphonophore --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids reliquary-siphonophore
npm run sandbox:preview -- --id reliquary-siphonophore --kind source --serve --open --visual
```

## Chain Vein Siphonophore (chain-vein-siphonophore)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: bathypelagic vertical shafts / biome 2+

Gameplay verb:
Living tripwire colony that unfolds from a compact soft colony curl, stretches stinging lines across a lane, then contracts its feeding polyps inward toward the player.

Biological anchors:
- Siphonophore colony body plan made of specialized zooids rather than a single jelly bell.
- Nectophore swimming bells arranged along a central stem for segmented propulsion.
- Feeding polyps and bracts clustered beneath the stem for a visible predatory center.
- Long tentilla with cnidocyte batteries represented as bead-like sting nodes.
- Praya and Apolemia-like open-water chain silhouette with flexible colony articulation.

Required read:
- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

Articulatable parts:
- front float bract
- continuous soft colony stem
- upper nectophore bell pair
- middle nectophore bell pair
- lower nectophore bell pair
- left shield bract
- right shield bract
- feeding polyp cluster
- four broad stinging tendrils
- tentilla bead nodes
- terminal lure bulb
- sting bead tissue accents

Prompt risks:
- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.

Source handoff commands:
```bash
npm run source:next-prompt -- --id chain-vein-siphonophore
npm run source:session -- --id chain-vein-siphonophore
npm run source:inbox-capture -- --id chain-vein-siphonophore --open
npm run source:recover-inline -- --id chain-vein-siphonophore --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids chain-vein-siphonophore
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids chain-vein-siphonophore --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids chain-vein-siphonophore
npm run sandbox:preview -- --id chain-vein-siphonophore --kind source --serve --open --visual
```

## Brine Mycelium Shelf (brine-mycelium-shelf)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: submerged wrecks / hypoxic cave shelves

Gameplay verb:
Creeping sessile fungal shelf that blocks ledges, exhales spore bursts, and extends brittle feeding plates to punish close movement.

Biological anchors:
- Marine fungal mycelium and biofilm mats for a spreading, rooted decomposer footprint.
- Bracket fungus and shelf mushroom silhouettes translated into underwater encrusting plates.
- Sulfur bacterial mats for pale filament networks and hypoxic warning coloration.
- Sponge and tunicate encrustation cues for a plausible submerged colony texture.
- Puffball spore-release logic for a clear inhale, swell, and burst attack cycle.

Required read:
- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

Articulatable parts:
- mycelial root mat
- central swollen spore sac
- upper shelf plate
- lower shelf plate
- left feeding plate
- right feeding plate
- front brittle plate lip
- spore pore cluster
- filament whisker fringe
- cracked crust overlays
- integrated warning-color tissue patches

Prompt risks:
- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.

Source handoff commands:
```bash
npm run source:next-prompt -- --id brine-mycelium-shelf
npm run source:session -- --id brine-mycelium-shelf
npm run source:inbox-capture -- --id brine-mycelium-shelf --open
npm run source:recover-inline -- --id brine-mycelium-shelf --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-mycelium-shelf
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-mycelium-shelf --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-mycelium-shelf
npm run sandbox:preview -- --id brine-mycelium-shelf --kind source --serve --open --visual
```

## Thorn Fan Coralline (thorn-fan-coralline)

Status: `candidate-queued`; source candidate: `draft`; has source: `false`
Depth band: current-swept reef wall / biome 1-3

Gameplay verb:
Reef-like fan ambusher that disguises itself as cover, rotates into the current, then lashes thorn ribs to create a temporary damage wall.

Biological anchors:
- Gorgonian sea fan structure for a flattened branching lattice with a rooted stalk.
- Fire coral and hydroid sting cues for contact-danger polyps along the ribs.
- Crustose coralline algae for armored pink-free plating and reef-integrated growth.
- Feather star arm flexibility for fan ribs that can fold, rake, and reopen organically.
- Sea fan current-feeding posture for a believable rotate-and-spread telegraph.

Required read:
- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

Articulatable parts:
- rooted reef foot
- central stalk spine
- left fan lobe
- right fan lobe
- upper rib cluster
- lower rib cluster
- front thorn rake
- rear support ribs
- stinging polyp bead rows
- armored coralline plates
- fold hinge knots
- integrated warning-color wall tissue

Prompt risks:
- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.

Source handoff commands:
```bash
npm run source:next-prompt -- --id thorn-fan-coralline
npm run source:session -- --id thorn-fan-coralline
npm run source:inbox-capture -- --id thorn-fan-coralline --open
npm run source:recover-inline -- --id thorn-fan-coralline --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids thorn-fan-coralline
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids thorn-fan-coralline --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids thorn-fan-coralline
npm run sandbox:preview -- --id thorn-fan-coralline --kind source --serve --open --visual
```

