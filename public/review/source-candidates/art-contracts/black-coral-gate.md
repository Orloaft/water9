# Black Coral Gate

Candidate: `black-coral-gate`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-black-coral-gate-whole-source.png`
Depth band: bathyal ruins / biome 3+

## Gameplay Read

Passage-control ambusher that holds an open arch, telegraphs with glowing hinge polyps, then drops and clamps a living portcullis around the diver.

## Required Read

- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

## Articulatable Parts

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
- Biological anchor: Emphasize antipatharian thorny axial skeletons with living tissue/polyps coating one continuous colony.
- Biological anchor: Use brittle-star-like curling only as motion logic, not as visible starfish anatomy.
- Extra required read: The upper bridge and side pillars should visibly fuse through branching tissue so the portcullis reads as one living colony.
- Avoid: Arch and portcullis language can still bias source generation toward architectural symmetry, detached bars, or a built object rather than a grown colony.
- Avoid: Black coral and sea fan branches may generate hair-thin rods that are not crop-safe for folding arms or clamp teeth.
- Avoid: Avoid 'ruin gate', 'portcullis prop', 'iron bars', or 'symmetrical ornament' language in source prompts.
- Preserve motion phase readability: open feeding arch
- Preserve motion phase readability: hinge polyps brighten and retract
- Preserve motion phase readability: thorn bars fold inward/down
- Preserve motion phase readability: clamp teeth close and reset
- Reference search term: Antipatharia black coral thorny skeleton
- Reference search term: black coral polyps close up
- Reference search term: gorgonian sea fan branching colony
- Reference search term: brittle star arm curling motion

## Reject If

- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.
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
- Both side pillars and crown bridge are visibly fused by living branching coral tissue, not stone architecture.
- Trap bars grow from the same crown with soft polyp hinge knots; no detached prop bars or portcullis hardware.
- Thorn arms, roots, crown, and clamp spines share one black-coral palette and lighting direction.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated full-body 2D game creature source art, cohesive underwater threat called Black Coral Gate, living black coral colony grown into an open feeding-arch silhouette, both pillars and crown visibly fused by branching antipatharian tissue, side-facing three-quarter view, two rooted thorny coral pillars connected by an arched crown bridge, central crop-friendly flexible coral-tine trap bars grown from the crown tissue, folding side thorn arms, thick hinge polyp knots, lower clamp teeth and latch spines, dark charcoal black coral skeleton with bone tips, muted teal blue bioluminescent polyps, oxidized green and ivory accents, readable open gate silhouette at 64px, all parts visibly connected as one organism, crop-safe separated bars hinges roots and crown, crisp painterly browser-game sprite, no environment, no stone doorway, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Emphasize antipatharian thorny axial skeletons with living tissue/polyps coating one continuous colony.
- Biological anchor: Use brittle-star-like curling only as motion logic, not as visible starfish anatomy.
- Extra required read: The upper bridge and side pillars should visibly fuse through branching tissue so the portcullis reads as one living colony.
- Avoid: Arch and portcullis language can still bias source generation toward architectural symmetry, detached bars, or a built object rather than a grown colony.
- Avoid: Black coral and sea fan branches may generate hair-thin rods that are not crop-safe for folding arms or clamp teeth.
- Avoid: Avoid 'ruin gate', 'portcullis prop', 'iron bars', or 'symmetrical ornament' language in source prompts.
- Preserve motion phase readability: open feeding arch
- Preserve motion phase readability: hinge polyps brighten and retract
- Preserve motion phase readability: thorn bars fold inward/down
- Preserve motion phase readability: clamp teeth close and reset
- Reference search term: Antipatharia black coral thorny skeleton
- Reference search term: black coral polyps close up
- Reference search term: gorgonian sea fan branching colony
- Reference search term: brittle star arm curling motion

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
- One cohesive whole-source organism on pure magenta, not separate coral chunks glued onto stone ruins.
- Open arch / portcullis silhouette is the first read, with the bite line clearly visible at game scale.
- Left and right rooted pillars share one material language and connect through a living crown bridge.
- Crop-safe thick bars, hinge knots, root mats, and latch jaws have visible margins for later cutting.
- Danger read comes from closing thorn-bars, glowing hinge polyps, and clamp teeth, not baked-in particles or scenery.

Candidate-specific contract checks:
- Both side pillars and crown bridge are visibly fused by living branching coral tissue, not stone architecture.
- Trap bars grow from the same crown with soft polyp hinge knots; no detached prop bars or portcullis hardware.
- Thorn arms, roots, crown, and clamp spines share one black-coral palette and lighting direction.

Reject immediately if:
- Avoid a literal stone ruin gate with coral decoration; the gate must be the organism.
- Avoid detached bars or symmetrical prop pieces that feel assembled instead of grown.
- Avoid thin hairlike coral branches that cannot be cropped or read at game scale.
- Avoid magenta, hot pink, or purple body values that will conflict with the chroma key.
- Keep bubbles, slam VFX, rubble, sand, and lighting effects separate from the base source.
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
npm run source:imagegen-mark -- --id black-coral-gate
# run image generation from the prompt above
npm run source:imagegen-status -- --id black-coral-gate
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id black-coral-gate --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id black-coral-gate --image <image-path> --copy
npm run source:image-check -- --id black-coral-gate
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id black-coral-gate --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

