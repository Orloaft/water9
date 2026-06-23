# Brine Crown

Candidate: `brine-crown`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-brine-crown-whole-source.png`
Depth band: abyssal vents / biome 3+

## Gameplay Read

Stationary area-control hazard that swells, raises spines, and grows corrosive brine patches instead of chasing the diver.

## Required Read

- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

## Articulatable Parts

- basal mat torso
- central crown cup head
- dark throat pore
- front radial frond
- left radial frond
- right radial frond
- rear radial fronds
- brine blister bank
- spine halo cluster
- root tendril skirt

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

- Lane: sessile-ambush-hazards
- Biological anchor: Emphasize one mat-grown radial animal with vent-mineralized crown cup and blister sacs fused into the same basal tissue.
- Extra required read: All rays, spines, and blisters must visibly grow from the low basal mat with no separate vent props.
- Avoid: Mixed anchors of coral, starfish, vent chimneys, and mats may generate a collage instead of one organism.
- Avoid: Perfect radial symmetry could flatten the sprite into an emblem and reduce readable hinge zones for fronds.
- Avoid: Corrosive brine cues risk becoming baked puddles, clouds, or environmental floor effects rather than riggable anatomy.
- Avoid: Watch for coral reef decoration, detached chimney tubes, baked brine pools, and logo-like symmetry.
- Preserve motion phase readability: idle low mat with throat closed
- Preserve motion phase readability: swelling blister telegraph
- Preserve motion phase readability: spine halo lift
- Preserve motion phase readability: brine patch VFX emitted separately
- Reference search term: hydrothermal vent microbial mat mineral crust
- Reference search term: deep sea brine pool edge
- Reference search term: toxic coral polyps
- Reference search term: starfish radial anatomy
- Reference search term: hydrothermal chimney black smoker

## Reject If

- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.
- Reject cephalopod tentacles, curled octopus arms, eyes, free-swimming anatomy, or loose starfish limbs.
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
- Short radial lobes are fused flat into one basal mat and do not read as tentacles, octopus arms, or free limbs.
- Central crown cup, toxic throat, brine blisters, roots, and mineral spines share one rooted vent-organism anatomy.
- The creature remains stationary and low to the seafloor, not a free-swimming cephalopod or decorative starfish.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated full-body 2D game creature source art, cohesive underwater threat called Brine Crown, stationary abyssal vent organism forming one rooted toxic basal mat, inspired by coralline hydrothermal flora without starfish or cephalopod anatomy, central jagged crown cup with dark toxic throat, five to seven short thick radial lobes fused flat into the basal mat, opaque brine blisters glowing sickly green amber, mineral spines around the rim, root-like tendrils, gloomy charcoal deep teal bone oxidized copper palette, crisp readable silhouette, crop-friendly hinge zones, no environment, no shadows, no haze, no duplicate creatures, no detached limbs, no text

Research audit hardening:
- Lane: sessile-ambush-hazards
- Biological anchor: Emphasize one mat-grown radial animal with vent-mineralized crown cup and blister sacs fused into the same basal tissue.
- Extra required read: All rays, spines, and blisters must visibly grow from the low basal mat with no separate vent props.
- Avoid: Mixed anchors of coral, starfish, vent chimneys, and mats may generate a collage instead of one organism.
- Avoid: Perfect radial symmetry could flatten the sprite into an emblem and reduce readable hinge zones for fronds.
- Avoid: Corrosive brine cues risk becoming baked puddles, clouds, or environmental floor effects rather than riggable anatomy.
- Avoid: Watch for coral reef decoration, detached chimney tubes, baked brine pools, and logo-like symmetry.
- Preserve motion phase readability: idle low mat with throat closed
- Preserve motion phase readability: swelling blister telegraph
- Preserve motion phase readability: spine halo lift
- Preserve motion phase readability: brine patch VFX emitted separately
- Reference search term: hydrothermal vent microbial mat mineral crust
- Reference search term: deep sea brine pool edge
- Reference search term: toxic coral polyps
- Reference search term: starfish radial anatomy
- Reference search term: hydrothermal chimney black smoker

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
- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

Candidate-specific contract checks:
- Short radial lobes are fused flat into one basal mat and do not read as tentacles, octopus arms, or free limbs.
- Central crown cup, toxic throat, brine blisters, roots, and mineral spines share one rooted vent-organism anatomy.
- The creature remains stationary and low to the seafloor, not a free-swimming cephalopod or decorative starfish.

Reject immediately if:
- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.
- Reject cephalopod tentacles, curled octopus arms, eyes, free-swimming anatomy, or loose starfish limbs.
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
npm run source:imagegen-mark -- --id brine-crown
# run image generation from the prompt above
npm run source:imagegen-status -- --id brine-crown
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id brine-crown --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id brine-crown --image <image-path> --copy
npm run source:image-check -- --id brine-crown
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id brine-crown --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

