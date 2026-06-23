# Reliquary Siphonophore

Candidate: `reliquary-siphonophore`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-reliquary-siphonophore-whole-source.png`
Depth band: bathypelagic / abyssal ruin shafts

## Gameplay Read

Vertical tripwire colony: thread the safe gap, avoid the stinging curtain pulse, then punish the dim reload window.

## Required Read

- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

## Articulatable Parts

- top gas float / crest
- central colony spine torso
- stacked nectophore bell clusters
- left lateral bell fin
- right lateral bell fin
- connected zooid/bract chain with visible membranes
- front feeding polyp cluster
- rear feeding polyp cluster
- four broad tripwire tendrils with bulb tips
- anatomical lure bead
- sting-tip bead anatomy
- separate tripwire pulse / contact spark VFX

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
- Biological anchor: Anchor the top in a pneumatophore/float and the vertical chain in connected nectophores and bracts.
- Biological anchor: Use Marrus/Apolemia-like colony organization for beads and bells rather than decorative strands.
- Extra required read: Every hanging bead or bell should visibly connect to the colony spine through soft tissue or shared membranes.
- Avoid: Reliquary and pearl language can produce jewelry, lantern, or metal cage artifacts that break biological cohesion.
- Avoid: Many dangling organs and glow beads may become a collage of ornaments unless all elements are tied to a central stem.
- Avoid: Avoid 'chandelier', 'reliquary', 'lantern', 'cage', and 'jewelry' as literal object descriptors; use them only as silhouette analogies.
- Preserve motion phase readability: dim vertical drift
- Preserve motion phase readability: lure beads pulse
- Preserve motion phase readability: broad tendrils tighten into tripwire arcs
- Preserve motion phase readability: sting pulse passes down tendrils
- Preserve motion phase readability: dim reload sag
- Reference search term: deep sea siphonophore nectophore colony
- Reference search term: Marrus orthocanna siphonophore
- Reference search term: Apolemia siphonophore chain
- Reference search term: Portuguese man o war tentilla cnidocytes

## Reject If

- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.
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
- Top float, nectophores, zooids, polyps, and tendrils are joined by translucent soft membranes into one colony.
- No chandelier, cage, reliquary, pearl necklace, candle, metal, or jewelry read remains in the silhouette.
- Broad tripwire tendrils are crop-safe and biologically attached, not loose strings or bead chains.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated full-body 2D game sprite source art, cohesive underwater enemy called Reliquary Siphonophore, vertical Marrus/Apolemia-like deep-sea siphonophore colony, vertical side-facing three-quarter view, translucent glassy pneumatophore top float, central living colony spine, connected nectophore bell clusters, translucent zooids joined by soft membranes, dark violet feeding polyps, one cyan lure bead, four broad dangling stinging tripwire tendrils with bulb tips and visible safe gaps, elegant abyssal deep teal cyan ivory black-violet palette, readable silhouette at 64px, crop-friendly separated float bells spine connected zooids tendrils and polyp clusters with clear hinge points, crisp painterly browser-game sprite, full organism centered with margin, no environment, no shadow, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Anchor the top in a pneumatophore/float and the vertical chain in connected nectophores and bracts.
- Biological anchor: Use Marrus/Apolemia-like colony organization for beads and bells rather than decorative strands.
- Extra required read: Every hanging bead or bell should visibly connect to the colony spine through soft tissue or shared membranes.
- Avoid: Reliquary and pearl language can produce jewelry, lantern, or metal cage artifacts that break biological cohesion.
- Avoid: Many dangling organs and glow beads may become a collage of ornaments unless all elements are tied to a central stem.
- Avoid: Avoid 'chandelier', 'reliquary', 'lantern', 'cage', and 'jewelry' as literal object descriptors; use them only as silhouette analogies.
- Preserve motion phase readability: dim vertical drift
- Preserve motion phase readability: lure beads pulse
- Preserve motion phase readability: broad tendrils tighten into tripwire arcs
- Preserve motion phase readability: sting pulse passes down tendrils
- Preserve motion phase readability: dim reload sag
- Reference search term: deep sea siphonophore nectophore colony
- Reference search term: Marrus orthocanna siphonophore
- Reference search term: Apolemia siphonophore chain
- Reference search term: Portuguese man o war tentilla cnidocytes

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
- One cohesive whole-source organism on pure #ff00ff magenta, centered with generous crop margin.
- Vertical chandelier or reliquary colony with a clear top, spine, bell clusters, and dangling hazard zone.
- Tripwire tendrils are broad enough to crop, rig, and see at 64px; avoid hair-thin jelly threads.
- Safe gap is visually plausible: tendrils hang in separate arcs rather than one opaque curtain.
- Ruin/reliquary flavor stays organic shell, glass, and pearl shapes, not a literal lantern, cage, or metal object.

Candidate-specific contract checks:
- Top float, nectophores, zooids, polyps, and tendrils are joined by translucent soft membranes into one colony.
- No chandelier, cage, reliquary, pearl necklace, candle, metal, or jewelry read remains in the silhouette.
- Broad tripwire tendrils are crop-safe and biologically attached, not loose strings or bead chains.

Reject immediately if:
- Avoid a generic jellyfish umbrella; require siphonophore colony structure with float, bells, zooids, and tendrils.
- Avoid loose collage parts; all visible anatomy must belong to one continuous whole-source organism.
- Avoid hair-thin tentacles that cannot be cropped or socketed; use a few broad readable tripwire tendrils.
- Avoid literal metal chandeliers, cages, church relics, candles, or jewelry.
- Keep glow, sting pulses, and contact sparks as separate VFX so they do not cover the base anatomy.
- Keep pure magenta only in the background; avoid magenta internal glow that breaks chroma keying.
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
npm run source:imagegen-mark -- --id reliquary-siphonophore
# run image generation from the prompt above
npm run source:imagegen-status -- --id reliquary-siphonophore
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id reliquary-siphonophore --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id reliquary-siphonophore --image <image-path> --copy
npm run source:image-check -- --id reliquary-siphonophore
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id reliquary-siphonophore --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

