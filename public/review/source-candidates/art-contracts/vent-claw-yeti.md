# Vent-Claw Yeti

Candidate: `vent-claw-yeti`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-vent-claw-yeti-whole-source.png`
Depth band: abyssal hydrothermal vent fields

## Gameplay Read

Thermal grappler that guards vent lanes, fans its bristled claws, then hooks and drags the diver toward a hot zone.

## Required Read

- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

## Articulatable Parts

- main carapace torso
- abdomen tuck
- left upper claw arm
- left bristled claw hand
- right upper claw arm
- right bristled claw hand
- front walking leg pair
- middle walking leg pair
- rear walking leg pair
- left antenna
- right antenna
- setae glow overlay clusters

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

- Lane: mobile-predator-motion
- Biological anchor: Kiwa hirsuta claw setae and squat lobster body posture.
- Extra required read: Claw arms must attach visibly to a compact squat-lobster carapace with abdomen tucked underneath.
- Avoid: Yeti wording and bristles can produce mammal-like fur, humanoid arms, or fuzzy unreadable claw edges.
- Avoid: Hydrothermal cues may bake vent smoke, heat glow, or chimney shapes into the creature silhouette.
- Avoid: Avoid white furry monster reads; describe bristles as grouped crustacean setae on claw surfaces.
- Preserve motion phase readability: guard stance, claw fan display, hook close, drag recovery
- Reference search term: Kiwa hirsuta yeti crab claws
- Reference search term: yeti crab setae closeup
- Reference search term: squat lobster lateral posture
- Reference search term: hydrothermal vent crab anatomy

## Reject If

- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.
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
- Oversized claws attach to the squat-lobster carapace through visible shoulder and elbow joints.
- Bacterial setae are grouped rows on claw surfaces, not mammal fur, cloud fluff, or a white monster silhouette.
- Reject humanoid arms, vent chimney props, beach-crab proportions, or loose bristle noise hiding crop zones.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Vent-Claw Yeti, abyssal hydrothermal vent yeti crab inspired arthropod enemy, side-facing three-quarter view facing right, compact pale crab carapace, tucked abdomen, long oversized articulated forelimbs, broad hooked claws covered in dense cream bacterial setae bristles, six smaller walking legs, short sensory antennae, reduced dark eye spots, mineral orange and oxidized teal staining on pale bone shell, crisp readable silhouette at 64px, crop-friendly separated claw arms claw hands legs antennae bristle clusters and carapace with visible hinge zones, centered with generous margin, no environment, no vent chimney, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Kiwa hirsuta claw setae and squat lobster body posture.
- Extra required read: Claw arms must attach visibly to a compact squat-lobster carapace with abdomen tucked underneath.
- Avoid: Yeti wording and bristles can produce mammal-like fur, humanoid arms, or fuzzy unreadable claw edges.
- Avoid: Hydrothermal cues may bake vent smoke, heat glow, or chimney shapes into the creature silhouette.
- Avoid: Avoid white furry monster reads; describe bristles as grouped crustacean setae on claw surfaces.
- Preserve motion phase readability: guard stance, claw fan display, hook close, drag recovery
- Reference search term: Kiwa hirsuta yeti crab claws
- Reference search term: yeti crab setae closeup
- Reference search term: squat lobster lateral posture
- Reference search term: hydrothermal vent crab anatomy

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
- One whole crab-like arthropod, not a furry mammal, lobster, or humanoid monster.
- Oversized bristled claws are the first read and clearly indicate grab range.
- Main carapace, abdomen tuck, legs, claws, and antennae stay connected as one riggable body.
- Bristles read as clustered biological setae, not smoke, fur clouds, or flame.
- No vent chimney, lava plume, bubbles, floor plane, cast shadow, or environmental lighting baked in.

Candidate-specific contract checks:
- Oversized claws attach to the squat-lobster carapace through visible shoulder and elbow joints.
- Bacterial setae are grouped rows on claw surfaces, not mammal fur, cloud fluff, or a white monster silhouette.
- Reject humanoid arms, vent chimney props, beach-crab proportions, or loose bristle noise hiding crop zones.

Reject immediately if:
- Avoid mammal-like fur; the bristles are crab setae and bacterial mats.
- Avoid a normal beach crab silhouette; emphasize deep-sea squat posture and huge farming claws.
- Avoid making the vent heat or smoke part of the body silhouette.
- Avoid thin bristles that turn into noise; use readable grouped tufts.
- Avoid magenta or pink glows inside the creature that could key out.
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
npm run source:imagegen-mark -- --id vent-claw-yeti
# run image generation from the prompt above
npm run source:imagegen-status -- --id vent-claw-yeti
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id vent-claw-yeti --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id vent-claw-yeti --image <image-path> --copy
npm run source:image-check -- --id vent-claw-yeti
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id vent-claw-yeti --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

