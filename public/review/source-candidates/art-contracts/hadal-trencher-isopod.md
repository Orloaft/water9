# Hadal Trencher Isopod

Candidate: `hadal-trencher-isopod`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-hadal-trencher-isopod-whole-source.png`
Depth band: hadal trench floor / abyssal scavenger lanes

## Gameplay Read

Armored burrow ambusher that braces into the sediment, raises shield plates, then lunges in a short crushing shove.

## Required Read

- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

## Articulatable Parts

- broad forward head shield
- central overlapping thorax plate stack
- rear curled abdomen plate stack
- left heavy sensory antenna
- right heavy sensory antenna
- left blunt mandible plate
- right blunt mandible plate
- front compact walking leg pair
- middle compact walking leg pair
- rear anchoring walking leg pair
- left and right side shield flanges
- rear curled tail fan plate

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
- Biological anchor: Bathynomus giganteus lateral and dorsal body references with visible pereopods and pleotelson.
- Extra required read: Show enough underside leg mass below the tergite stack to avoid a smooth fossil-shell silhouette.
- Avoid: Bathynomus plus burrowing cues could drift into trilobite, beetle, or crab collage if underside legs are hidden.
- Avoid: Defensive curl and forward shove may be hard to reconcile in one side-profile rig without clear hinge zones.
- Avoid: Avoid symmetrical top-down armor poses; require a readable lateral shove direction.
- Preserve motion phase readability: brace low in sediment, raise shield plates, short forward shove, curl recoil
- Reference search term: Bathynomus giganteus side view
- Reference search term: giant isopod curled posture
- Reference search term: deep sea isopod pereopods
- Reference search term: isopod pleotelson anatomy

## Reject If

- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.
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
- Trencher silhouette read: reject if the output reads as a generic crab, beetle, or submarine drone instead of one low isopod with a broad armored body.
- Burrow-latch read: head shield, digging claws, leg banks, and rear plates must visibly connect to the same body with crop-safe hinge roots.
- Scale and armor read: dorsal plates and trenching claws must share one palette and lighting style without mismatched pasted shell fragments.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Hadal Trencher Isopod, abyssal giant isopod inspired armored arthropod creature, side-facing three-quarter view facing right, domed overlapping segmented chitin plates, broad head shield, blunt crushing mandibles, thick sweeping antennae, compact jointed legs visible beneath the armor, side shield flanges, curled tail fan plate, pale bone gray chitin with charcoal seams and cold teal abyssal accents, crisp readable silhouette at 64px, crop-friendly separated plates legs antennae mandibles and tail with visible hinge zones, centered with generous margin, no environment, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Bathynomus giganteus lateral and dorsal body references with visible pereopods and pleotelson.
- Extra required read: Show enough underside leg mass below the tergite stack to avoid a smooth fossil-shell silhouette.
- Avoid: Bathynomus plus burrowing cues could drift into trilobite, beetle, or crab collage if underside legs are hidden.
- Avoid: Defensive curl and forward shove may be hard to reconcile in one side-profile rig without clear hinge zones.
- Avoid: Avoid symmetrical top-down armor poses; require a readable lateral shove direction.
- Preserve motion phase readability: brace low in sediment, raise shield plates, short forward shove, curl recoil
- Reference search term: Bathynomus giganteus side view
- Reference search term: giant isopod curled posture
- Reference search term: deep sea isopod pereopods
- Reference search term: isopod pleotelson anatomy

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
- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

Candidate-specific contract checks:
- Trencher silhouette read: reject if the output reads as a generic crab, beetle, or submarine drone instead of one low isopod with a broad armored body.
- Burrow-latch read: head shield, digging claws, leg banks, and rear plates must visibly connect to the same body with crop-safe hinge roots.
- Scale and armor read: dorsal plates and trenching claws must share one palette and lighting style without mismatched pasted shell fragments.

Reject immediately if:
- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.
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
npm run source:imagegen-mark -- --id hadal-trencher-isopod
# run image generation from the prompt above
npm run source:imagegen-status -- --id hadal-trencher-isopod
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id hadal-trencher-isopod --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id hadal-trencher-isopod --image <image-path> --copy
npm run source:image-check -- --id hadal-trencher-isopod
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id hadal-trencher-isopod --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

