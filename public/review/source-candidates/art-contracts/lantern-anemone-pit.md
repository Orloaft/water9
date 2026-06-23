# Lantern Anemone Pit

Candidate: `lantern-anemone-pit`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-lantern-anemone-pit-whole-source.png`
Depth band: mesophotic reef caves / biome 2-3

## Gameplay Read

Sessile lure ambusher that presents a deceptive open oral disc, flashes lure polyps, then clamps a ring of stinging petal-tentacles around nearby prey.

## Required Read

- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

## Articulatable Parts

- buried column base
- outer pedal disc skirt
- central mouth pit
- upper lip ring
- left outer petal-tentacle
- right outer petal-tentacle
- front inner petal-tentacle
- rear inner petal-tentacle
- lure bulb cluster
- stinging bead tips
- integrated retraction fold ridges

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
- Biological anchor: Emphasize sea anemone oral disc, tube anemone retraction, and corallimorph mushroom-anemone width with lure bulbs attached to tentacle tissue.
- Extra required read: Central mouth depth and connected column base must remain visible even when petal rings are open.
- Avoid: Flower language may produce a cute decorative bloom or coral cluster rather than a dangerous single predator.
- Avoid: Too many thin tentacles would be noisy and hard to articulate; rings need chunky separated petals.
- Avoid: Glow, sting sparks, halos, and digestive clouds may be baked into source art instead of kept as VFX.
- Avoid: Avoid land-plant leaves, literal teeth, decorative flowers, hair-thin tentacle crowds, and baked glow halos.
- Preserve motion phase readability: open harmless lure pose
- Preserve motion phase readability: lure bulb flash telegraph
- Preserve motion phase readability: petal-tentacle clamp inward
- Preserve motion phase readability: retraction fold close
- Preserve motion phase readability: separate sting VFX pulse
- Reference search term: sea anemone oral disc anatomy
- Reference search term: tube anemone cerianthid retraction
- Reference search term: corallimorph mushroom anemone
- Reference search term: cnidarian stinging tentacles
- Reference search term: bioluminescent anemone lure

## Reject If

- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.
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
- Predator read: reject if the output reads as a cute flower, plant icon, or decorative coral instead of one anchored cnidarian ambusher.
- Mouth-depth read: central pit, lip ring, column base, and petal-tentacle roots must remain visible and physically connected.
- VFX separation read: reject baked halos, sting sparks, digestive clouds, or detached shadow inserts in the source image.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater threat called Lantern Anemone Pit, sessile reef cave anemone ambusher with buried column base, wide corallimorph oral-disc silhouette, central dark mouth pit, two rings of thick fleshy petal-tentacles connected to the mouth rim, glowing cyan lure bulbs embedded in tentacle tissue, stinging bead tips, crop-friendly hinge folds around the oral disc and column base, muted coral red ivory teal sea green and charcoal palette with no magenta body color, readable full creature silhouette at 64px, centered with margin, crisp painterly browser-game sprite, no environment, no land-plant leaves, no decorative flower stem, no sand, no shadow, no bubbles, no glow halo, no text

Research audit hardening:
- Lane: sessile-ambush-hazards
- Biological anchor: Emphasize sea anemone oral disc, tube anemone retraction, and corallimorph mushroom-anemone width with lure bulbs attached to tentacle tissue.
- Extra required read: Central mouth depth and connected column base must remain visible even when petal rings are open.
- Avoid: Flower language may produce a cute decorative bloom or coral cluster rather than a dangerous single predator.
- Avoid: Too many thin tentacles would be noisy and hard to articulate; rings need chunky separated petals.
- Avoid: Glow, sting sparks, halos, and digestive clouds may be baked into source art instead of kept as VFX.
- Avoid: Avoid land-plant leaves, literal teeth, decorative flowers, hair-thin tentacle crowds, and baked glow halos.
- Preserve motion phase readability: open harmless lure pose
- Preserve motion phase readability: lure bulb flash telegraph
- Preserve motion phase readability: petal-tentacle clamp inward
- Preserve motion phase readability: retraction fold close
- Preserve motion phase readability: separate sting VFX pulse
- Reference search term: sea anemone oral disc anatomy
- Reference search term: tube anemone cerianthid retraction
- Reference search term: corallimorph mushroom anemone
- Reference search term: cnidarian stinging tentacles
- Reference search term: bioluminescent anemone lure

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
- One anchored anemone organism, not a decorative coral flower cluster.
- Central mouth pit is the first danger read when open.
- Two rings of thick petal-tentacles are broad enough for sprite-scale articulation.
- Lure bulbs, mouth rim, column base, and outer petals are visually connected.
- Danger is communicated through clamp posture, stinging bulbs, and mouth depth rather than gore or particles.

Candidate-specific contract checks:
- Predator read: reject if the output reads as a cute flower, plant icon, or decorative coral instead of one anchored cnidarian ambusher.
- Mouth-depth read: central pit, lip ring, column base, and petal-tentacle roots must remain visible and physically connected.
- VFX separation read: reject baked halos, sting sparks, digestive clouds, or detached shadow inserts in the source image.

Reject immediately if:
- Avoid a cute decorative flower; it must read as a dangerous sessile predator.
- Avoid making the tentacles hair-thin or too numerous for articulation.
- Avoid literal teeth, metal jaws, or land-plant leaves.
- Avoid magenta or pink glow that conflicts with the chroma key background.
- Keep lure halos, sting sparks, and digestive clouds separate from the base source.
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
npm run source:imagegen-mark -- --id lantern-anemone-pit
# run image generation from the prompt above
npm run source:imagegen-status -- --id lantern-anemone-pit
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id lantern-anemone-pit --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id lantern-anemone-pit --image <image-path> --copy
npm run source:image-check -- --id lantern-anemone-pit
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id lantern-anemone-pit --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

