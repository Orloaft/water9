# Glass Sponge Sentinel

Candidate: `glass-sponge-sentinel`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-glass-sponge-sentinel-whole-source.png`
Depth band: bathyal hardground / abyssal reef edge

## Gameplay Read

Sessile lane-control sentinel: bait the aim, dodge the brittle needle cone, then punish the exposed recharge window.

## Required Read

- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

## Articulatable Parts

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
- integrated cracked rim plates

## Source Pose Rules

- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

## Cohesion Lock

- One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.
- Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.
- Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.
- Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.
- Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.

## Research Audit Hardening

- Lane: complex-colonial-forms
- Biological anchor: Prioritize Euplectella-style barrel/vase forms with a few bold hexactinellid rib bands over fine reticulate mesh.
- Biological anchor: Use osculum contraction and water-expulsion posture as the primary attack telegraph anchor.
- Extra required read: Needle petals should be large, bluntly grouped silica spicule bundles attached to the rim, not free-floating shards.
- Avoid: Venus flower basket references can overproduce lace-like microdetail that collapses at sprite scale and makes cropping brittle.
- Avoid: Needle cones and spicules may drift into crystal turret, glass weapon, or sci-fi cannon language if prompts overemphasize sharp mineral forms.
- Avoid: Avoid requesting 'crystalline armor' or 'glass cannon' phrasing; keep all hard surfaces described as siliceous sponge spicules.
- Preserve motion phase readability: idle filter-feeding throat open
- Preserve motion phase readability: inhale/compress telegraph
- Preserve motion phase readability: rim petals flare into cone
- Preserve motion phase readability: vent/recoil with exposed throat
- Reference search term: Euplectella aspergillum glass sponge
- Reference search term: Hexactinellida osculum vase sponge
- Reference search term: deep sea glass sponge reef spicules
- Reference search term: Venus flower basket silica lattice

## Reject If

- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.
- collage of unrelated animal parts instead of one physically coherent creature
- detached mouth, detached limbs, duplicate bodies, loose props, bubbles, prey, water vortex, floor plane, cast shadow, or text
- black, white, transparent, textured, gradient, or shadowed background instead of flat #ff00ff magenta
- silhouette that fails to communicate the gameplay verb at small sprite scale
- parts too thin, overlapped, hidden, or ambiguous to crop into articulated sprites
- lighting, palette, or rendering style that changes between body regions
- full attack impact pose, motion smear, or VFX-heavy action frame that hides the neutral riggable anatomy

## Review Checklist

- Single creature: every visible part belongs to one connected anatomy.
- Part continuity: all crop-intended appendages have compatible proportions, visible connection zones, and one lighting/material treatment.
- Design read: the silhouette and largest features match the gameplay verb.
- Extraction read: required articulated parts are visible, separated, and thick enough for clean crops.
- Pose read: neutral source pose preserves visible pivots, attack direction, and crop-safe appendages.
- Source hygiene: flat #ff00ff background, no baked environment, no cast shadow, no text.
- Style cohesion: one palette, one lighting model, one rendering style across the full creature.
- Small-sprite read: the creature remains recognizable when scaled down in the sandbox.
- Sessile sponge read: reject if the output reads as a crystal turret, cannon, coral fan, or free-floating weapon instead of one anchored vase-like sponge.
- Rim attachment read: needle-petal shutters and spicule crown must visibly grow from the flared rim with no detached shards or projectile pieces in the source.
- Lattice readability read: cross-braced ribs must be bold enough to survive 64px preview without dissolving into lace noise.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated full-body 2D game sprite source art, cohesive underwater enemy called Glass Sponge Sentinel, deep-sea hexactinellid glass sponge inspired sessile organism, vase-shaped silica lattice body anchored to a tiny biogenic foot nub fused into the sponge base, not a separate rock prop, side-facing three-quarter view facing right, tall translucent mineral-white woven cage body with bold cross-braced ribs, large dark central osculum throat, flared rim, outer crown of brittle glass spicules, three large crop-friendly needle-petal shutters physically attached to the rim and folded around the mouth, faint cyan and pale violet internal anatomical translucency not matching the magenta background and no glow halo, readable silhouette at 64px, bold clean contours, crop-safe rim plates throat valve lattice rib groups and anchored foot collar with visible biological connection zones, centered with generous crop margin, crisp painterly browser-game sprite, no environment, no shadow, no loose shards, no projectile, no pressure ring, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Prioritize Euplectella-style barrel/vase forms with a few bold hexactinellid rib bands over fine reticulate mesh.
- Biological anchor: Use osculum contraction and water-expulsion posture as the primary attack telegraph anchor.
- Extra required read: Needle petals should be large, bluntly grouped silica spicule bundles attached to the rim, not free-floating shards.
- Avoid: Venus flower basket references can overproduce lace-like microdetail that collapses at sprite scale and makes cropping brittle.
- Avoid: Needle cones and spicules may drift into crystal turret, glass weapon, or sci-fi cannon language if prompts overemphasize sharp mineral forms.
- Avoid: Avoid requesting 'crystalline armor' or 'glass cannon' phrasing; keep all hard surfaces described as siliceous sponge spicules.
- Preserve motion phase readability: idle filter-feeding throat open
- Preserve motion phase readability: inhale/compress telegraph
- Preserve motion phase readability: rim petals flare into cone
- Preserve motion phase readability: vent/recoil with exposed throat
- Reference search term: Euplectella aspergillum glass sponge
- Reference search term: Hexactinellida osculum vase sponge
- Reference search term: deep sea glass sponge reef spicules
- Reference search term: Venus flower basket silica lattice

Source pose contract:
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Cohesion lock:
- One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.
- Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.
- Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.
- Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.
- Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.

Non-negotiable pass/fail requirements:
- One vase-like glass sponge organism, not a generic coral fan or separate sponge colony.
- Large central osculum throat is the first danger read.
- Bold cross-braced lattice ribs remain readable at game scale rather than dissolving into lace noise.
- Needle-cone petals and rim spicules are thick enough to crop and articulate.
- Anchored base, throat, rim, and needle petals share one lighting and material language.

Candidate-specific contract checks:
- Sessile sponge read: reject if the output reads as a crystal turret, cannon, coral fan, or free-floating weapon instead of one anchored vase-like sponge.
- Rim attachment read: needle-petal shutters and spicule crown must visibly grow from the flared rim with no detached shards or projectile pieces in the source.
- Lattice readability read: cross-braced ribs must be bold enough to survive 64px preview without dissolving into lace noise.

Reject immediately if:
- Avoid a generic coral fan or sea plant; it must read as one vase-like glass sponge organism.
- Avoid metal turrets, guns, cannons, crystals, or sci-fi machinery; needles are biological silica spicules.
- Avoid dense lace detail that becomes noise at sprite scale; use bold crop-safe ribs and a few large needle petals.
- Avoid multiple separate sponge colonies; generate one cohesive whole-source creature with one clear silhouette.
- Keep pure magenta only in the background and keep all anatomy fully inside the crop.
- collage of unrelated animal parts instead of one physically coherent creature
- detached mouth, detached limbs, duplicate bodies, loose props, bubbles, prey, water vortex, floor plane, cast shadow, or text
- black, white, transparent, textured, gradient, or shadowed background instead of flat #ff00ff magenta
- silhouette that fails to communicate the gameplay verb at small sprite scale
- parts too thin, overlapped, hidden, or ambiguous to crop into articulated sprites
- lighting, palette, or rendering style that changes between body regions
- full attack impact pose, motion smear, or VFX-heavy action frame that hides the neutral riggable anatomy
```

## Commands

```bash
npm run source:imagegen-mark -- --id glass-sponge-sentinel
# run image generation from the prompt above
npm run source:imagegen-status -- --id glass-sponge-sentinel
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id glass-sponge-sentinel --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id glass-sponge-sentinel --image <image-path> --copy
npm run source:image-check -- --id glass-sponge-sentinel
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id glass-sponge-sentinel --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

