# Brine Mycelium Shelf

Candidate: `brine-mycelium-shelf`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-brine-mycelium-shelf-whole-source.png`
Depth band: submerged wrecks / hypoxic cave shelves

## Gameplay Read

Creeping sessile fungal shelf that blocks ledges, exhales spore bursts, and extends brittle feeding plates to punish close movement.

## Required Read

- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

## Articulatable Parts

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
- Biological anchor: Blend bracket fungus shelf morphology with marine biofilm/mycelial mats and encrusting sponge/tunicate texture cues.
- Biological anchor: Use puffball-like pore swelling only for the spore sac behavior, not for a terrestrial mushroom body.
- Extra required read: Shelf plates need obvious hinge/thin-root connection zones tying them into the mycelial mat.
- Avoid: Marine fungus references are visually sparse, so generation may default to land bracket mushrooms or coral/sponge slabs.
- Avoid: Spore burst gameplay can lead to baked clouds that cover plate hinges, pore clusters, and crop margins.
- Avoid: Avoid 'mushroom cap and stem', 'forest fungus', 'coral rock', 'foggy spores', and 'cave wall attached' language.
- Preserve motion phase readability: flat encrusted idle
- Preserve motion phase readability: spore sac swells through pore cluster
- Preserve motion phase readability: plates extend outward
- Preserve motion phase readability: spore burst VFX separate
- Preserve motion phase readability: brittle plates recoil
- Reference search term: marine fungal mycelium biofilm
- Reference search term: underwater biofilm mat sulfur bacteria
- Reference search term: bracket fungus shelf morphology
- Reference search term: encrusting sponge tunicate colony

## Reject If

- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.
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
- Shelf plates grow from one low mycelial root mat through visible hinge-root webs; no individual mushroom caps or stems.
- Spore sac, plates, pores, and filament fringe read as one underwater biofilm organism, not a rock or coral slab.
- Plate lips are thick enough for crop-safe articulation and are not hidden by fuzzy texture or baked spore clouds.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater threat called Brine Mycelium Shelf, sessile marine fungal biofilm ambusher shaped like layered bracket fungus and encrusting sponge, low horizontal mycelial root mat, swollen central spore sac, four to six broad shelf plates growing from one low mycelial mat through wide fleshy hinge collars and root webs thick enough to crop, with brittle lips and visible hinge seams, pale sulfur yellow bone white sickly green charcoal and muted teal palette, spore pore clusters, filament whisker fringe, crop-friendly separated plates and sac, readable silhouette at 64px, centered full organism with generous margin, crisp painterly browser-game sprite, no environment, no wall, no floor, no shadow, no haze, no spore cloud, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Blend bracket fungus shelf morphology with marine biofilm/mycelial mats and encrusting sponge/tunicate texture cues.
- Biological anchor: Use puffball-like pore swelling only for the spore sac behavior, not for a terrestrial mushroom body.
- Extra required read: Shelf plates need obvious hinge/thin-root connection zones tying them into the mycelial mat.
- Avoid: Marine fungus references are visually sparse, so generation may default to land bracket mushrooms or coral/sponge slabs.
- Avoid: Spore burst gameplay can lead to baked clouds that cover plate hinges, pore clusters, and crop margins.
- Avoid: Avoid 'mushroom cap and stem', 'forest fungus', 'coral rock', 'foggy spores', and 'cave wall attached' language.
- Preserve motion phase readability: flat encrusted idle
- Preserve motion phase readability: spore sac swells through pore cluster
- Preserve motion phase readability: plates extend outward
- Preserve motion phase readability: spore burst VFX separate
- Preserve motion phase readability: brittle plates recoil
- Reference search term: marine fungal mycelium biofilm
- Reference search term: underwater biofilm mat sulfur bacteria
- Reference search term: bracket fungus shelf morphology
- Reference search term: encrusting sponge tunicate colony

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
- One living encrusting shelf organism, not a pile of land mushrooms dropped underwater.
- Layered shelf plates and central spore pores are readable before surface texture detail.
- Mycelial root web visibly ties the plates into one anchored threat.
- Several large plates have clear hinge zones for extension and recoil animation.
- No wreck wall, cave surface, fog, spore cloud, or environmental substrate baked into the source.

Candidate-specific contract checks:
- Shelf plates grow from one low mycelial root mat through visible hinge-root webs; no individual mushroom caps or stems.
- Spore sac, plates, pores, and filament fringe read as one underwater biofilm organism, not a rock or coral slab.
- Plate lips are thick enough for crop-safe articulation and are not hidden by fuzzy texture or baked spore clouds.

Reject immediately if:
- Avoid terrestrial mushroom caps with stems; keep the form encrusting and underwater-adapted.
- Avoid making the source look like an inert rock or coral slab.
- Avoid dense fuzzy texture that hides the main plates and hinge zones.
- Avoid baked spore clouds or fog covering the anatomy.
- Avoid magenta, hot pink, or purple fungal tissue near the key color.
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
npm run source:imagegen-mark -- --id brine-mycelium-shelf
# run image generation from the prompt above
npm run source:imagegen-status -- --id brine-mycelium-shelf
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id brine-mycelium-shelf --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id brine-mycelium-shelf --image <image-path> --copy
npm run source:image-check -- --id brine-mycelium-shelf
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id brine-mycelium-shelf --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

