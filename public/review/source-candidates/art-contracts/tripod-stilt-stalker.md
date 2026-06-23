# Tripod Stilt Stalker

Candidate: `tripod-stilt-stalker`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-tripod-stilt-stalker-whole-source.png`
Depth band: abyssal plain / soft-sediment ambush fields

## Gameplay Read

Stilted trap sentinel that plants three long fin rays, sweeps a sensory tripline, then hop-stabs across the safe gap with a brittle spear motion.

## Required Read

- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

## Articulatable Parts

- narrow head capsule
- upturned mouth plate
- left glassy eye spot
- right glassy eye spot
- slender body torso
- small dorsal sail fin
- left pectoral sensory ray
- right pectoral sensory ray
- left pelvic tripod stilt
- right pelvic tripod stilt
- rear caudal tripod stilt
- thin tail membrane flag

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
- Biological anchor: Bathypterois tripodfish elongated pelvic and caudal fin rays with perched body posture.
- Extra required read: Include subtle fin-ray membrane or taper cues so the three supports remain fish anatomy.
- Avoid: Stilts can be mistaken for insect legs, spider limbs, or mechanical rods if fin membranes are absent.
- Avoid: Long rays may become hair-thin, low-contrast, or impossible to select cleanly for articulation.
- Avoid: Avoid floor contact props; imply standing posture through ray orientation only.
- Preserve motion phase readability: perched stilt stance, sensory sweep, compressed hop-stab, brittle reset
- Reference search term: tripodfish Bathypterois side view
- Reference search term: tripodfish fin rays
- Reference search term: Bathypterois grallator anatomy
- Reference search term: tripod fish perched posture

## Reject If

- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.
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
- Three supports are translucent tapered fin rays with subtle membranes, not feet, knees, insect legs, or metal rods.
- The body remains a fish axis above the rays with readable head, trunk, dorsal fin, pectoral rays, and tail membrane.
- No seabed, floor contact marks, sediment mound, or prop supports are baked into the isolated source art.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater enemy called Tripod Stilt Stalker, abyssal tripodfish inspired vertebrate threat, side-facing three-quarter view facing right, narrow upturned head capsule with small glassy eye spots, slender pale body torso, small dorsal sail fin, two long pectoral sensory rays spread like feelers, two elongated pelvic fin-ray stilts and one rear caudal tripod stilt supporting the body, thin tail membrane flag, translucent bone ivory charcoal muted teal and cold blue palette with no magenta body color, readable stilted silhouette at 64px, crop-friendly separated head body dorsal fin pectoral rays pelvic stilts caudal stilt and tail membrane with visible hinge zones, centered with generous margin, crisp painterly browser-game sprite, no environment, no seabed, no shadow, no sand, no bubbles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Bathypterois tripodfish elongated pelvic and caudal fin rays with perched body posture.
- Extra required read: Include subtle fin-ray membrane or taper cues so the three supports remain fish anatomy.
- Avoid: Stilts can be mistaken for insect legs, spider limbs, or mechanical rods if fin membranes are absent.
- Avoid: Long rays may become hair-thin, low-contrast, or impossible to select cleanly for articulation.
- Avoid: Avoid floor contact props; imply standing posture through ray orientation only.
- Preserve motion phase readability: perched stilt stance, sensory sweep, compressed hop-stab, brittle reset
- Reference search term: tripodfish Bathypterois side view
- Reference search term: tripodfish fin rays
- Reference search term: Bathypterois grallator anatomy
- Reference search term: tripod fish perched posture

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
- One whole tripodfish-like vertebrate, not a crab, spider, or walking machine.
- Three long stilt fin rays are the first silhouette read and clearly support the body.
- Upturned head, sensory pectoral rays, dorsal fin, body trunk, and tail stilt connect as one fish.
- Stilts and sensory rays are thick and separated enough for crop-safe articulation.
- No seabed, sand cloud, planted shadow, bubbles, particles, or floor contact marks baked into the source.

Candidate-specific contract checks:
- Three supports are translucent tapered fin rays with subtle membranes, not feet, knees, insect legs, or metal rods.
- The body remains a fish axis above the rays with readable head, trunk, dorsal fin, pectoral rays, and tail membrane.
- No seabed, floor contact marks, sediment mound, or prop supports are baked into the isolated source art.

Reject immediately if:
- Avoid making the stilts look like insect legs or metal rods; they are elongated fish fin rays.
- Avoid including a floor plane or sediment mound because the source must remain isolated.
- Avoid hair-thin rays that cannot be selected, cropped, or animated cleanly.
- Avoid turning the fish into a spider silhouette; keep the head, trunk, fins, and tail readable.
- Avoid magenta, hot pink, or purple tissue near the background key color.
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
npm run source:imagegen-mark -- --id tripod-stilt-stalker
# run image generation from the prompt above
npm run source:imagegen-status -- --id tripod-stilt-stalker
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id tripod-stilt-stalker --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id tripod-stilt-stalker --image <image-path> --copy
npm run source:image-check -- --id tripod-stilt-stalker
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id tripod-stilt-stalker --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

