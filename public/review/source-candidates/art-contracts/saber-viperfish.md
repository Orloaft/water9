# Saber Viperfish

Candidate: `saber-viperfish`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-saber-viperfish-whole-source.png`
Depth band: bathypelagic hunting layer / abyssal descent routes

## Gameplay Read

Lock-on dash striker that flashes its photophore chain, unhinges saber jaws, then commits to a fast straight impale that can be dodged and punished.

## Required Read

- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

## Articulatable Parts

- armored skull wedge
- upper saber tooth row
- lower hinged jaw plate
- dark throat cavity plate
- left reflective eye plate
- right reflective eye plate
- dorsal lure spine
- photophore belly chain
- segmented body trunk
- left pectoral fin blade
- right pectoral fin blade
- forked tail fin

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
- Biological anchor: Chauliodus viperfish hinged jaw, recurved teeth, dorsal lure, and ventral photophores.
- Extra required read: Use fewer oversized fang plates with clear roots in the skull rather than dense needle noise.
- Avoid: Could collapse into generic toothy fish if photophore chain and dorsal lure are underemphasized.
- Avoid: Saber and impale language may invite metal spear, harpoon, or sci-fi blade motifs.
- Avoid: Avoid weaponized armor language; specify translucent deep-sea fish tissues and biological teeth.
- Preserve motion phase readability: photophore lock-on flash, jaw unhinge, straight dash, overextended recovery
- Reference search term: deep sea viperfish side view
- Reference search term: Chauliodus sloani jaw teeth
- Reference search term: viperfish photophores
- Reference search term: viperfish dorsal lure

## Reject If

- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.
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
- Dash predator read: reject if the output reads as a decorative eel or generic fish without an obvious forward bite/lunge axis.
- Jaw crop read: saber teeth, upper and lower jaw plates, skull hinge, body, fins, and tail must remain connected while leaving magenta negative space around crop edges.
- Small-scale silhouette read: long body, oversized mouth, saber teeth, and tail must remain readable at sprite scale without excess fins, duplicate heads, or loose tooth props.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater enemy called Saber Viperfish, deep-sea viperfish inspired vertebrate predator, side-facing three-quarter view facing right, narrow armored skull wedge, huge recurved upper and lower saber teeth, hinged lower jaw, dark throat cavity, reflective pale eyes, long lean segmented body trunk, dorsal lure spine, glowing cyan photophore belly chain, small pectoral fin blades, forked tail fin, charcoal blue black ivory bone and cold cyan palette with no magenta body color, crisp readable silhouette at 64px, crop-friendly separated skull jaw teeth dorsal spine body fins photophore chain and tail with visible hinge zones, centered with generous margin, painterly browser-game sprite, no environment, no shadow, no bubbles, no motion streaks, no target UI, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Chauliodus viperfish hinged jaw, recurved teeth, dorsal lure, and ventral photophores.
- Extra required read: Use fewer oversized fang plates with clear roots in the skull rather than dense needle noise.
- Avoid: Could collapse into generic toothy fish if photophore chain and dorsal lure are underemphasized.
- Avoid: Saber and impale language may invite metal spear, harpoon, or sci-fi blade motifs.
- Avoid: Avoid weaponized armor language; specify translucent deep-sea fish tissues and biological teeth.
- Preserve motion phase readability: photophore lock-on flash, jaw unhinge, straight dash, overextended recovery
- Reference search term: deep sea viperfish side view
- Reference search term: Chauliodus sloani jaw teeth
- Reference search term: viperfish photophores
- Reference search term: viperfish dorsal lure

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
- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

Candidate-specific contract checks:
- Dash predator read: reject if the output reads as a decorative eel or generic fish without an obvious forward bite/lunge axis.
- Jaw crop read: saber teeth, upper and lower jaw plates, skull hinge, body, fins, and tail must remain connected while leaving magenta negative space around crop edges.
- Small-scale silhouette read: long body, oversized mouth, saber teeth, and tail must remain readable at sprite scale without excess fins, duplicate heads, or loose tooth props.

Reject immediately if:
- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.
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
npm run source:imagegen-mark -- --id saber-viperfish
# run image generation from the prompt above
npm run source:imagegen-status -- --id saber-viperfish
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id saber-viperfish --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id saber-viperfish --image <image-path> --copy
npm run source:image-check -- --id saber-viperfish
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id saber-viperfish --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

