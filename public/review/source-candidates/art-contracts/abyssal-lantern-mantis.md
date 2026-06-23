# Abyssal Lantern Mantis

Candidate: `abyssal-lantern-mantis`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-abyssal-lantern-mantis-whole-source.png`
Depth band: lower bathyal caves / abyssal reef breaks

## Gameplay Read

Burst striker that locks on with lantern eye spots, coils its raptorial arms, then releases a fast straight-line punch.

## Required Read

- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

## Articulatable Parts

- plated forward head carapace
- left raised compound eye stalk
- right raised compound eye stalk
- left long antenna whip
- right long antenna whip
- compressed thorax torso plates
- left folded blunt-club raptorial strike arm
- right folded blunt-club raptorial strike arm
- small underside walking limb cluster
- rear segmented abdomen chain
- broad stabilizing tail fan

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
- Biological anchor: Mantis shrimp meral saddle joint and folded raptorial appendage anatomy.
- Extra required read: Folded strike arms should show hinge, club or spear tip, and punch vector without weapon-like hardware.
- Avoid: Mixing spearer and smasher behaviors could create ambiguous arm shapes unless saddle joints are emphasized.
- Avoid: Lantern eye spots and colorful mantis references may push toward tropical saturation or sci-fi robot styling.
- Avoid: Avoid neon armor panels; keep glow limited to biological eye-stalk overlays.
- Preserve motion phase readability: aim with eye stalks, coil raptorial arms, spring strike, abdomen recoil
- Reference search term: mantis shrimp raptorial appendage folded
- Reference search term: stomatopod meral saddle anatomy
- Reference search term: mantis shrimp eye stalks
- Reference search term: mantis shrimp tail fan side view

## Reject If

- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid spearer-style needle arms; this candidate uses blunt smasher clubs for a single clear attack read.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.
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
- Strike-arm read: reject if the raptorial appendages become spear tips, drills, guns, or mismatched weapon arms instead of paired blunt smasher clubs.
- Crustacean anatomy read: head, thorax, abdomen, walking limbs, eye stalks, and tail fan must remain one continuous mantis-shrimp body.
- Glow restraint read: cyan lantern spots must be small biological eye-stalk markings, not neon armor panels or baked aim beams.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Abyssal Lantern Mantis, deep-sea smasher mantis shrimp inspired crustacean predator, side-facing three-quarter view facing right, plated head carapace, two raised compound eye stalks with small cyan biological lantern spots, long antenna whips, segmented thorax and abdomen, two oversized folded blunt-club raptorial strike arms with clear meral saddle joints and one obvious forward punch vector, small walking limbs beneath, broad tail fan, dark emerald charcoal shell with bone edges and muted red copper accents, crisp readable silhouette at 64px, crop-friendly separated eye stalks antennae club strike arms walking limbs abdomen and tail fan with visible biological hinge zones, centered with generous margin, no environment, no shadow, no spear tips, no weapon hardware, no motion streaks, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Mantis shrimp meral saddle joint and folded raptorial appendage anatomy.
- Extra required read: Folded strike arms should show hinge, club or spear tip, and punch vector without weapon-like hardware.
- Avoid: Mixing spearer and smasher behaviors could create ambiguous arm shapes unless saddle joints are emphasized.
- Avoid: Lantern eye spots and colorful mantis references may push toward tropical saturation or sci-fi robot styling.
- Avoid: Avoid neon armor panels; keep glow limited to biological eye-stalk overlays.
- Preserve motion phase readability: aim with eye stalks, coil raptorial arms, spring strike, abdomen recoil
- Reference search term: mantis shrimp raptorial appendage folded
- Reference search term: stomatopod meral saddle anatomy
- Reference search term: mantis shrimp eye stalks
- Reference search term: mantis shrimp tail fan side view

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
- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

Candidate-specific contract checks:
- Strike-arm read: reject if the raptorial appendages become spear tips, drills, guns, or mismatched weapon arms instead of paired blunt smasher clubs.
- Crustacean anatomy read: head, thorax, abdomen, walking limbs, eye stalks, and tail fan must remain one continuous mantis-shrimp body.
- Glow restraint read: cyan lantern spots must be small biological eye-stalk markings, not neon armor panels or baked aim beams.

Reject immediately if:
- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid spearer-style needle arms; this candidate uses blunt smasher clubs for a single clear attack read.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.
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
npm run source:imagegen-mark -- --id abyssal-lantern-mantis
# run image generation from the prompt above
npm run source:imagegen-status -- --id abyssal-lantern-mantis
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id abyssal-lantern-mantis --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id abyssal-lantern-mantis --image <image-path> --copy
npm run source:image-check -- --id abyssal-lantern-mantis
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id abyssal-lantern-mantis --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

