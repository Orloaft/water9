# Reef Lion Moray

Candidate: `reef-lion-moray`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-reef-lion-moray-whole-source.png`
Depth band: twilight reef caves / predator corridors

## Gameplay Read

Hybrid reef ambusher that flares venom fins to block escape lanes, lunges with a moray bite, then exposes its folded spine fan during recovery.

## Required Read

- One cohesive vertebrate hybrid, not a separate eel wrapped in decorative lionfish fins.
- Moray head and flared venom spine fan are the first reads at game scale.
- Eel torso, jaws, pectoral fans, dorsal spines, tail coil, and cheek frills remain visibly connected.
- Spines and fin membranes are broad enough to crop and animate without becoming noisy feathers.
- No reef wall, cave hole, coral scenery, sand plume, shadow, bubbles, or poison cloud baked into the source.

## Articulatable Parts

- blunt moray head plate
- upper hooked jaw plate
- lower hinged jaw plate
- inner bite mouth plate
- throat gill pouch
- sinuous eel torso coil
- folding dorsal venom spine fan
- left striped pectoral fan
- right striped pectoral fan
- cheek frill whisker cluster
- banded tail coil segment
- tail blade fin

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
- Biological anchor: Moray eel head and body musculature combined with lionfish/scorpionfish dorsal spine and pectoral fan anatomy.
- Extra required read: Dorsal spines and pectoral fans should share skin patterning and attachment points with the eel torso.
- Avoid: Hybrid design may become pasted-on lionfish fins unless membranes and spines visibly grow from the eel body.
- Avoid: Fin rays and cheek frills can turn into noisy feathers or wing shapes, weakening rig separation.
- Avoid: Avoid ornamental dragon, winged serpent, or separate lionfish-fin collage reads.
- Preserve motion phase readability: coil in ambush, venom fan flare, moray bite lunge, folded spine recovery
- Reference search term: moray eel side view open mouth
- Reference search term: lionfish pectoral fin fan anatomy
- Reference search term: scorpionfish venom dorsal spines
- Reference search term: moray eel gill pores

## Reject If

- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.
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
- Attachment read: pectoral fans must root behind the gill pouch and dorsal spines must root along the eel back; reject loose pasted fin sheets.
- Vertebrate continuity read: head, throat, torso coil, tail, jaws, cheek frills, and fins must share one continuous eel body axis.
- Fin readability read: venom rays must be broad crop-safe biological fins, not feathers, wings, ornamental dragon frills, or noisy hairlines.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater enemy called Reef Lion Moray, hybrid reef vertebrate threat combining moray eel body logic with lionfish venom fin display, side-facing three-quarter view facing right, blunt moray head plate, hooked upper jaw and hinged lower jaw, dark inner bite mouth, throat gill pouch, sinuous eel torso coil, folding dorsal venom spine fan rooted along the eel back, broad striped left and right pectoral fans rooted behind the gill pouch, cheek frill whisker cluster grown from the jawline, banded tail coil and tail blade fin, ivory bone charcoal reef red muted teal sulfur yellow and black warning stripe palette with no magenta body color, readable full creature at 64px, crop-friendly separated head jaws torso coil dorsal spines pectoral fans cheek frills and tail with visible biological attachment zones, centered with generous margin, crisp painterly browser-game sprite, no environment, no reef wall, no cave, no shadow, no bubbles, no poison cloud, no loose fins, no decorative wings, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Moray eel head and body musculature combined with lionfish/scorpionfish dorsal spine and pectoral fan anatomy.
- Extra required read: Dorsal spines and pectoral fans should share skin patterning and attachment points with the eel torso.
- Avoid: Hybrid design may become pasted-on lionfish fins unless membranes and spines visibly grow from the eel body.
- Avoid: Fin rays and cheek frills can turn into noisy feathers or wing shapes, weakening rig separation.
- Avoid: Avoid ornamental dragon, winged serpent, or separate lionfish-fin collage reads.
- Preserve motion phase readability: coil in ambush, venom fan flare, moray bite lunge, folded spine recovery
- Reference search term: moray eel side view open mouth
- Reference search term: lionfish pectoral fin fan anatomy
- Reference search term: scorpionfish venom dorsal spines
- Reference search term: moray eel gill pores

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
- One cohesive vertebrate hybrid, not a separate eel wrapped in decorative lionfish fins.
- Moray head and flared venom spine fan are the first reads at game scale.
- Eel torso, jaws, pectoral fans, dorsal spines, tail coil, and cheek frills remain visibly connected.
- Spines and fin membranes are broad enough to crop and animate without becoming noisy feathers.
- No reef wall, cave hole, coral scenery, sand plume, shadow, bubbles, or poison cloud baked into the source.

Candidate-specific contract checks:
- Attachment read: pectoral fans must root behind the gill pouch and dorsal spines must root along the eel back; reject loose pasted fin sheets.
- Vertebrate continuity read: head, throat, torso coil, tail, jaws, cheek frills, and fins must share one continuous eel body axis.
- Fin readability read: venom rays must be broad crop-safe biological fins, not feathers, wings, ornamental dragon frills, or noisy hairlines.

Reject immediately if:
- Avoid a collage of eel plus loose lionfish fins; the hybrid must read as one continuous vertebrate.
- Avoid thin hairlike spines that disappear at sprite scale; use broad crop-safe venom rays.
- Avoid including reef scenery, cave darkness, or coral props in the isolated source.
- Avoid making the fins look like decorative wings instead of biological pectoral and dorsal fins.
- Avoid magenta, hot pink, or purple warning stripes that could interfere with keying.
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
npm run source:imagegen-mark -- --id reef-lion-moray
# run image generation from the prompt above
npm run source:imagegen-status -- --id reef-lion-moray
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id reef-lion-moray --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id reef-lion-moray --image <image-path> --copy
npm run source:image-check -- --id reef-lion-moray
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id reef-lion-moray --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

