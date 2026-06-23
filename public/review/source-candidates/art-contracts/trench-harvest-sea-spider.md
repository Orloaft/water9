# Trench Harvest Sea Spider

Candidate: `trench-harvest-sea-spider`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png`
Depth band: abyssal soft-bottom plains / carcass falls

## Gameplay Read

Long-legged pinning hunter that steps over obstacles, plants barbed legs around the diver, then siphons during a brief hold.

## Required Read

- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

## Articulatable Parts

- tiny knuckled central body
- small forward head nub
- soft forward proboscis siphon
- left long front stepping leg
- right long front stepping leg
- left long middle pinning leg
- right long middle pinning leg
- left long rear bracing leg
- right long rear bracing leg
- hooked terminal claw cluster
- dorsal rounded egg-sac lump
- cold siphon glow overlay

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
- Biological anchor: Deep-sea pycnogonid anatomy with ovigers, proboscis, and segmented walking legs.
- Extra required read: Leg joints should be thickened at coxae and knees while preserving the tiny-body pycnogonid read.
- Avoid: Long limbs can become hair-thin or tangled, making crop-safe rigging fragile.
- Avoid: Forward proboscis may read as a gun barrel or stinger unless kept soft and organic.
- Avoid: Avoid spider eyes, fangs, silk, abdomen bulb, or terrestrial horror-spider cues.
- Preserve motion phase readability: slow high step, plant pinning legs, lower proboscis, release and lift
- Reference search term: deep sea pycnogonid giant sea spider
- Reference search term: sea spider proboscis anatomy
- Reference search term: pycnogonid long legs side view
- Reference search term: sea spider ovigers

## Reject If

- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.
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
- Six to eight crop-safe legs remain visibly rooted in a tiny central pycnogonid body with marine joint anatomy.
- Forward proboscis is soft and tapered biological feeding tissue, not a rigid gun barrel, stinger, or weapon.
- Reject spider eyes, fangs, webbing, terrestrial abdomen bulb, hair-thin limbs, or disconnected leg fragments.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Trench Harvest Sea Spider, abyssal pycnogonid sea spider inspired arthropod enemy, side-facing three-quarter view facing right, tiny knuckled central body, small head nub, long forward biological proboscis siphon, eight extremely long jointed legs with thick visible knees and hooked terminal claws, subtle dorsal egg-sac lump, pale translucent gray chitin with charcoal joints, cold cyan and dull ivory accents, eerie readable wide silhouette at 64px, crop-friendly separated legs proboscis body claw hooks and egg sac with visible hinge zones, centered with generous margin, no environment, no web, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Deep-sea pycnogonid anatomy with ovigers, proboscis, and segmented walking legs.
- Extra required read: Leg joints should be thickened at coxae and knees while preserving the tiny-body pycnogonid read.
- Avoid: Long limbs can become hair-thin or tangled, making crop-safe rigging fragile.
- Avoid: Forward proboscis may read as a gun barrel or stinger unless kept soft and organic.
- Avoid: Avoid spider eyes, fangs, silk, abdomen bulb, or terrestrial horror-spider cues.
- Preserve motion phase readability: slow high step, plant pinning legs, lower proboscis, release and lift
- Reference search term: deep sea pycnogonid giant sea spider
- Reference search term: sea spider proboscis anatomy
- Reference search term: pycnogonid long legs side view
- Reference search term: sea spider ovigers

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
- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

Candidate-specific contract checks:
- Six to eight crop-safe legs remain visibly rooted in a tiny central pycnogonid body with marine joint anatomy.
- Forward proboscis is soft and tapered biological feeding tissue, not a rigid gun barrel, stinger, or weapon.
- Reject spider eyes, fangs, webbing, terrestrial abdomen bulb, hair-thin limbs, or disconnected leg fragments.

Reject immediately if:
- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.
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
npm run source:imagegen-mark -- --id trench-harvest-sea-spider
# run image generation from the prompt above
npm run source:imagegen-status -- --id trench-harvest-sea-spider
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id trench-harvest-sea-spider --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id trench-harvest-sea-spider --image <image-path> --copy
npm run source:image-check -- --id trench-harvest-sea-spider
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id trench-harvest-sea-spider --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

