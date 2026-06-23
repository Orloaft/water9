# Vampire Cloak Squid

Candidate: `vampire-cloak-squid`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-vampire-cloak-squid-whole-source.png`
Depth band: oxygen-minimum mesopelagic / dark open water

## Gameplay Read

Cephalopod feint attacker that cloaks into a spined umbrella, flashes photophores, then snaps its arms outward for a short-range grab.

## Required Read

- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

## Articulatable Parts

- compact dark mantle body
- large pale left eye
- large pale right eye
- broad cloak web membrane
- front webbed arm pair
- left webbed arm pair
- right webbed arm pair
- rear webbed arm pair
- soft arm spine and cirri fringe
- cyan photophore tip lights
- small mantle fin pair
- central mouth and beak shadow

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
- Biological anchor: Vampyroteuthis infernalis webbed arm crown, cirri rows, photophores, and defensive pineapple posture.
- Extra required read: Cloak membrane must visibly connect arm pairs while leaving arm bases separable for rigging.
- Avoid: Vampire language can invite fangs, bat wings, cape shapes, or humanoid styling.
- Avoid: Eight webbed arms risk becoming a tangled octopus mass if grouped clusters and membrane boundaries are unclear.
- Avoid: Avoid giant octopus scale cues; keep compact mantle, large eyes, and umbrella web dominant.
- Preserve motion phase readability: compact drift, cloak umbrella flare, photophore flash, arm snap grab
- Reference search term: Vampyroteuthis infernalis webbed arms
- Reference search term: vampire squid pineapple posture
- Reference search term: vampire squid cirri photophores
- Reference search term: vampire squid side view

## Reject If

- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.
- Reject nautilus shells, beak-like nautilus heads, octopus sucker rows, amber lure organs, and external shell spirals.
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
- Compact mantle, two large blue eyes, fin pair, eight webbed arms, cirri fringe, and cyan photophores read as vampire squid anatomy.
- Reject external shell, nautilus head, octopus sucker rows, fantasy lure organs, bat cape, fangs, or humanoid vampire styling.
- The cloak membrane remains one connected webbed arm structure with crop-safe arm clusters and no tangles hiding pivots.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater enemy called Vampire Cloak Squid, vampire squid inspired cephalopod threat, compact dark mantle with small fin pair, two large pale blue eyes, eight arms connected by broad cloak web membrane, no external shell and no suction-cup rows, soft spine and cirri fringe along arm edges, cyan-only photophore tips, inside-out defensive umbrella posture readable as an alternate silhouette, black burgundy charcoal ivory cyan palette, side-facing three-quarter view, crop-friendly separated mantle eyes fin pair arm clusters web membrane and photophore tips, crisp painterly browser-game sprite, centered with margin, no environment, no shadow, no ink cloud, no bubbles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Vampyroteuthis infernalis webbed arm crown, cirri rows, photophores, and defensive pineapple posture.
- Extra required read: Cloak membrane must visibly connect arm pairs while leaving arm bases separable for rigging.
- Avoid: Vampire language can invite fangs, bat wings, cape shapes, or humanoid styling.
- Avoid: Eight webbed arms risk becoming a tangled octopus mass if grouped clusters and membrane boundaries are unclear.
- Avoid: Avoid giant octopus scale cues; keep compact mantle, large eyes, and umbrella web dominant.
- Preserve motion phase readability: compact drift, cloak umbrella flare, photophore flash, arm snap grab
- Reference search term: Vampyroteuthis infernalis webbed arms
- Reference search term: vampire squid pineapple posture
- Reference search term: vampire squid cirri photophores
- Reference search term: vampire squid side view

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
- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

Candidate-specific contract checks:
- Compact mantle, two large blue eyes, fin pair, eight webbed arms, cirri fringe, and cyan photophores read as vampire squid anatomy.
- Reject external shell, nautilus head, octopus sucker rows, fantasy lure organs, bat cape, fangs, or humanoid vampire styling.
- The cloak membrane remains one connected webbed arm structure with crop-safe arm clusters and no tangles hiding pivots.

Reject immediately if:
- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.
- Reject nautilus shells, beak-like nautilus heads, octopus sucker rows, amber lure organs, and external shell spirals.
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
npm run source:imagegen-mark -- --id vampire-cloak-squid
# run image generation from the prompt above
npm run source:imagegen-status -- --id vampire-cloak-squid
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id vampire-cloak-squid --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id vampire-cloak-squid --image <image-path> --copy
npm run source:image-check -- --id vampire-cloak-squid
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id vampire-cloak-squid --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

