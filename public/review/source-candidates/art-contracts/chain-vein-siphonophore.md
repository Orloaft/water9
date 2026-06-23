# Chain Vein Siphonophore

Candidate: `chain-vein-siphonophore`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-chain-vein-siphonophore-whole-source.png`
Depth band: bathypelagic vertical shafts / biome 2+

## Gameplay Read

Living tripwire colony that unfolds from a compact soft colony curl, stretches stinging lines across a lane, then contracts its feeding polyps inward toward the player.

## Required Read

- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

## Articulatable Parts

- front float bract
- continuous soft colony stem
- upper nectophore bell pair
- middle nectophore bell pair
- lower nectophore bell pair
- left shield bract
- right shield bract
- feeding polyp cluster
- four broad stinging tendrils
- tentilla bead nodes
- terminal lure bulb
- sting bead tissue accents

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
- Biological anchor: Reference Praya dubia and Apolemia for a long flexible stem with repeated nectophore units and attached zooids.
- Biological anchor: Describe tentilla bead nodes as cnidocyte batteries along living tendrils, not beads threaded on wire.
- Extra required read: The central stem must be visibly continuous through all bell pairs, bracts, feeding polyps, and tendril attachment points.
- Avoid: Chain terminology risks literal metal links or mechanical tripwire imagery, especially with 'reels' and 'trip mine' adjacent concepts.
- Avoid: Segmented bells and bead nodes can appear as detached pearls unless connective tissue is strongly specified.
- Avoid: Avoid 'chain links', 'wire', 'hook', 'cable', 'mine', or 'mechanical reel' terms in visual prompts.
- Preserve motion phase readability: compact chain curl
- Preserve motion phase readability: nectophores extend and align
- Preserve motion phase readability: tendrils spread across lane
- Preserve motion phase readability: feeding cluster reels inward
- Preserve motion phase readability: sting nodes pulse then slacken
- Reference search term: Praya dubia siphonophore colony
- Reference search term: Apolemia uvaria siphonophore chain
- Reference search term: siphonophore nectophore stem zooids
- Reference search term: siphonophore tentilla cnidocyte batteries

## Reject If

- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.
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
- All bells, bracts, polyps, and tendrils attach to one continuous soft colony stem; no literal chain links or wire.
- Tentilla swellings remain organic tissue on broad tendrils, not pearl beads, jewelry, hooks, or detached ornaments.
- The vertical tripwire silhouette keeps visible safe gaps while preserving one connected siphonophore organism.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater enemy called Chain Vein Siphonophore, deep-sea siphonophore colony, long continuous flexible soft-tissue colony stem with paired translucent nectophore swimming bells, no metal links, protective bracts like glassy fins, compact feeding polyp cluster, four broad hanging stinging tendrils with soft connected tentilla swellings and terminal lure bulb, readable vertical tripwire silhouette with visible safe gaps, cold cyan ivory black deep teal palette with amber lure accent, side-facing three-quarter view, crop-friendly separated bells bracts stem polyps and tendrils, crisp painterly browser-game sprite, no environment, no shadow, no haze, no bubbles, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Reference Praya dubia and Apolemia for a long flexible stem with repeated nectophore units and attached zooids.
- Biological anchor: Describe tentilla bead nodes as cnidocyte batteries along living tendrils, not beads threaded on wire.
- Extra required read: The central stem must be visibly continuous through all bell pairs, bracts, feeding polyps, and tendril attachment points.
- Avoid: Chain terminology risks literal metal links or mechanical tripwire imagery, especially with 'reels' and 'trip mine' adjacent concepts.
- Avoid: Segmented bells and bead nodes can appear as detached pearls unless connective tissue is strongly specified.
- Avoid: Avoid 'chain links', 'wire', 'hook', 'cable', 'mine', or 'mechanical reel' terms in visual prompts.
- Preserve motion phase readability: compact chain curl
- Preserve motion phase readability: nectophores extend and align
- Preserve motion phase readability: tendrils spread across lane
- Preserve motion phase readability: feeding cluster reels inward
- Preserve motion phase readability: sting nodes pulse then slacken
- Reference search term: Praya dubia siphonophore colony
- Reference search term: Apolemia uvaria siphonophore chain
- Reference search term: siphonophore nectophore stem zooids
- Reference search term: siphonophore tentilla cnidocyte batteries

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
- One continuous colonial organism, not separate beads or loose jellyfish pieces.
- Continuous soft colony stem, swimming bells, feeding cluster, and stinging lines are all visible.
- Tripwire tendrils are few, broad, and separated enough to rig.
- The safe gap between hanging lines remains readable at sprite scale.
- All anatomy stays isolated on pure magenta with no water haze, shadows, plankton, or baked glow clouds.

Candidate-specific contract checks:
- All bells, bracts, polyps, and tendrils attach to one continuous soft colony stem; no literal chain links or wire.
- Tentilla swellings remain organic tissue on broad tendrils, not pearl beads, jewelry, hooks, or detached ornaments.
- The vertical tripwire silhouette keeps visible safe gaps while preserving one connected siphonophore organism.

Reject immediately if:
- Avoid making it a single jellyfish umbrella; it must read as a siphonophore colony.
- Avoid detached beads or pearls that do not connect to the central stem.
- Avoid literal chains, wires, hooks, or mechanical trip mines.
- Avoid overly thin tendrils that disappear at 64px.
- Keep pure magenta only in the background and avoid magenta internal glow.
- Keep electric arcs and contact sparks separate from the base sprite.
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
npm run source:imagegen-mark -- --id chain-vein-siphonophore
# run image generation from the prompt above
npm run source:imagegen-status -- --id chain-vein-siphonophore
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id chain-vein-siphonophore --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id chain-vein-siphonophore --image <image-path> --copy
npm run source:image-check -- --id chain-vein-siphonophore
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id chain-vein-siphonophore --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

