# Razor Kelp Harp

Candidate: `razor-kelp-harp`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-razor-kelp-harp-whole-source.png`
Depth band: sunless kelp trench / biome 2+

## Gameplay Read

Rooted snare hazard that fans blade-fronds into lanes, waits for the diver to cross, then snaps a cutting curtain inward.

## Required Read

- One cohesive kelp-like ambusher, not a loose pile of seaweed strips.
- Root holdfast and central crown are visible so the entity reads as anchored and sessile.
- Five to seven broad serrated blade-fronds create clear danger lanes at sprite scale.
- Gas bladders, hinge knots, and curled blade tips remain crop-safe for later articulation.
- No water column, sand floor, bubbles, shadows, or detached plant debris baked into the source.

## Articulatable Parts

- single organic bull-kelp holdfast tissue pad
- central crown node
- left outer blade-frond
- left inner blade-frond
- front cutting blade-frond
- right inner blade-frond
- right outer blade-frond
- gas bladder cluster
- integrated serrated blade edges
- curling tip hooks
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
- Biological anchor: Lean on bull kelp holdfast and gas bladder structure with broad ribbon kelp blades, not generic seaweed clumps.
- Extra required read: Holdfast, crown node, hinge knots, and blade lanes must stay visible and connected as one ambusher.
- Avoid: Kelp prompts can produce loose seaweed strips instead of one crop-safe organism with a central crown.
- Avoid: Thin fronds may read as spaghetti or tentacles and fail articulation at game scale.
- Avoid: Serrated edges and slash cues risk becoming baked motion trails or detached debris.
- Avoid: Avoid detached strips, floating debris, hair-thin weed, baked slash trails, and overly plantlike harmless posture.
- Preserve motion phase readability: passive drifting fan
- Preserve motion phase readability: blade-lane telegraph spread
- Preserve motion phase readability: inward cutting curtain snap
- Preserve motion phase readability: swaying reset
- Reference search term: bull kelp holdfast anatomy
- Reference search term: giant kelp gas bladder pneumatocyst
- Reference search term: ribbon kelp blade morphology
- Reference search term: serrated algae edge
- Reference search term: kelp forest holdfast fronds

## Reject If

- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.
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
- A single holdfast root and central crown node are visible as the shared origin for the whole creature.
- Every serrated blade grows from the crown node with a readable hinge knot; no loose seaweed strips or debris.
- Blade lanes form a crop-safe kelp ambush fan with no literal harp strings, floor, current streaks, or slash VFX baked in.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater threat called Razor Kelp Harp, rooted sessile kelp ambusher with a single organic bull-kelp holdfast tissue pad and central crown node, five to seven broad serrated blade-fronds arranged in a curved ambush fan with no literal harp frame, no strings, and no standalone rock, visible gas bladders, curled hook tips, crop-friendly hinge knots, integrated serrated blade edges, dark olive green deep teal amber and bone palette, sharp readable silhouette at 64px, full organism centered with generous margin, painterly browser-game sprite, no environment, no floor, no shadow, no haze, no particles, no text, no duplicate creature

Research audit hardening:
- Lane: sessile-ambush-hazards
- Biological anchor: Lean on bull kelp holdfast and gas bladder structure with broad ribbon kelp blades, not generic seaweed clumps.
- Extra required read: Holdfast, crown node, hinge knots, and blade lanes must stay visible and connected as one ambusher.
- Avoid: Kelp prompts can produce loose seaweed strips instead of one crop-safe organism with a central crown.
- Avoid: Thin fronds may read as spaghetti or tentacles and fail articulation at game scale.
- Avoid: Serrated edges and slash cues risk becoming baked motion trails or detached debris.
- Avoid: Avoid detached strips, floating debris, hair-thin weed, baked slash trails, and overly plantlike harmless posture.
- Preserve motion phase readability: passive drifting fan
- Preserve motion phase readability: blade-lane telegraph spread
- Preserve motion phase readability: inward cutting curtain snap
- Preserve motion phase readability: swaying reset
- Reference search term: bull kelp holdfast anatomy
- Reference search term: giant kelp gas bladder pneumatocyst
- Reference search term: ribbon kelp blade morphology
- Reference search term: serrated algae edge
- Reference search term: kelp forest holdfast fronds

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
- One cohesive kelp-like ambusher, not a loose pile of seaweed strips.
- Root holdfast and central crown are visible so the entity reads as anchored and sessile.
- Five to seven broad serrated blade-fronds create clear danger lanes at sprite scale.
- Gas bladders, hinge knots, and curled blade tips remain crop-safe for later articulation.
- No water column, sand floor, bubbles, shadows, or detached plant debris baked into the source.

Candidate-specific contract checks:
- A single holdfast root and central crown node are visible as the shared origin for the whole creature.
- Every serrated blade grows from the crown node with a readable hinge knot; no loose seaweed strips or debris.
- Blade lanes form a crop-safe kelp ambush fan with no literal harp strings, floor, current streaks, or slash VFX baked in.

Reject immediately if:
- Avoid thin spaghetti seaweed that cannot be cropped or rigged.
- Avoid a generic plant clump; the holdfast, crown, and blade lanes must define one creature.
- Avoid magenta, hot pink, or purple body colors that may key out with the background.
- Avoid loose detached strips or floating debris that look like separate props.
- Keep slash trails, bubbles, and water distortion as separate VFX rather than baked art.
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
npm run source:imagegen-mark -- --id razor-kelp-harp
# run image generation from the prompt above
npm run source:imagegen-status -- --id razor-kelp-harp
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id razor-kelp-harp --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id razor-kelp-harp --image <image-path> --copy
npm run source:image-check -- --id razor-kelp-harp
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id razor-kelp-harp --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

