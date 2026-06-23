# Thorn Fan Coralline

Candidate: `thorn-fan-coralline`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-thorn-fan-coralline-whole-source.png`
Depth band: current-swept reef wall / biome 1-3

## Gameplay Read

Reef-like fan ambusher that disguises itself as cover, rotates into the current, then lashes thorn ribs to create a temporary damage wall.

## Required Read

- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

## Articulatable Parts

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
- Biological anchor: Favor gorgonian sea fans with thick primary ribs and visible polyps over delicate lace fans.
- Biological anchor: Use fire coral/hydroid stinging polyps as sparse raised beads along ribs, not dense dotted texture.
- Extra required read: The central stalk and left/right lobes should have clear hinge knots so the fan can rotate, fold, and lash as one organism.
- Avoid: Sea fan references often produce fine lace branches that will be too thin for sprite-scale cropping or damage-wall reads.
- Avoid: Coralline algae and fire coral cues can turn into background reef texture unless the central stalk and thorn ribs dominate.
- Avoid: Avoid 'decorative fan coral', 'reef background', 'ornamental symmetry', and dense lace-branch prompts.
- Preserve motion phase readability: cover-like feeding fan open
- Preserve motion phase readability: stalk rotates into current
- Preserve motion phase readability: hinge knots tense and polyps brighten
- Preserve motion phase readability: thorn ribs lash into wall
- Preserve motion phase readability: fan relaxes and reopens
- Reference search term: gorgonian sea fan thick branches
- Reference search term: fire coral stinging polyps
- Reference search term: hydroid colony stinging polyps
- Reference search term: crustose coralline algae reef plating

## Reject If

- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.
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
- Thick primary ribs dominate the silhouette; fine branches remain secondary and do not become lace noise.
- Left and right fan lobes grow from one rooted stalk spine with visible hinge knots and shared coralline plates.
- Raised stinging polyps are sparse anatomy on the ribs, not dotted texture or detached bead rows.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater threat called Thorn Fan Coralline, sessile reef-like gorgonian sea fan ambusher with rooted reef foot and central stalk spine, flattened fan silhouette split into left and right lobes, thick primary gorgonian thorn ribs dominating over a few short secondary crossbars with no lace mesh, fold hinge knots, sparse raised stinging polyps, armored coralline plates, fire-coral danger cues, palette of ivory bone dark teal rust red sulfur yellow and charcoal with no magenta body color, readable full creature at 64px, centered with margin, crisp painterly browser-game sprite, no environment, no reef wall, no current lines, no shadow, no particles, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Favor gorgonian sea fans with thick primary ribs and visible polyps over delicate lace fans.
- Biological anchor: Use fire coral/hydroid stinging polyps as sparse raised beads along ribs, not dense dotted texture.
- Extra required read: The central stalk and left/right lobes should have clear hinge knots so the fan can rotate, fold, and lash as one organism.
- Avoid: Sea fan references often produce fine lace branches that will be too thin for sprite-scale cropping or damage-wall reads.
- Avoid: Coralline algae and fire coral cues can turn into background reef texture unless the central stalk and thorn ribs dominate.
- Avoid: Avoid 'decorative fan coral', 'reef background', 'ornamental symmetry', and dense lace-branch prompts.
- Preserve motion phase readability: cover-like feeding fan open
- Preserve motion phase readability: stalk rotates into current
- Preserve motion phase readability: hinge knots tense and polyps brighten
- Preserve motion phase readability: thorn ribs lash into wall
- Preserve motion phase readability: fan relaxes and reopens
- Reference search term: gorgonian sea fan thick branches
- Reference search term: fire coral stinging polyps
- Reference search term: hydroid colony stinging polyps
- Reference search term: crustose coralline algae reef plating

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
- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

Candidate-specific contract checks:
- Thick primary ribs dominate the silhouette; fine branches remain secondary and do not become lace noise.
- Left and right fan lobes grow from one rooted stalk spine with visible hinge knots and shared coralline plates.
- Raised stinging polyps are sparse anatomy on the ribs, not dotted texture or detached bead rows.

Reject immediately if:
- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.
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
npm run source:imagegen-mark -- --id thorn-fan-coralline
# run image generation from the prompt above
npm run source:imagegen-status -- --id thorn-fan-coralline
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id thorn-fan-coralline --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id thorn-fan-coralline --image <image-path> --copy
npm run source:image-check -- --id thorn-fan-coralline
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id thorn-fan-coralline --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

