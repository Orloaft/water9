# Gulper Eel Maw

Candidate: `gulper-eel-maw`
Status: `needs-review`
Expected output: `public/assets/generated/fauna-gulper-eel-maw-whole-source.png`
Depth band: bathypelagic abyss / open blackwater lanes

## Gameplay Read

Inhale ambusher that blooms a huge mouth pouch, pulls the diver into a short suction cone, then snaps shut before a deflated recovery window.

## Required Read

- One cohesive whole eel-like vertebrate, not a worm, snake, or loose floating mouth.
- Strict flat side-profile creature sheet pose: one continuous left-to-right eel spine line, mouth and head on the right, single whip tail on the left.
- Large lateral pelican-eel gape and throat pouch occupy the front 35-45% of the creature; connected eel body and tail occupy the rear 55-65%.
- Long whip tail, tiny head hinges, throat membrane, and lure tip remain connected as one riggable body.
- Jaw hoops and pouch membrane are thick enough to crop and animate at sprite scale.
- Visible continuous anatomy chain: upper jaw hoop and lower jaw hoop pivot on the same tiny skull collar, skull collar connects to narrow neck, neck connects to ribbon body, ribbon body tapers into one whip tail with cyan lure bulb.
- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- No water vortex, prey fish, bubbles, blackwater haze, floor plane, or cast shadow baked into the source.

## Articulatable Parts

- upper hinged jaw hoop
- lower hinged jaw hoop
- expandable throat pouch membrane
- small skull hinge collar
- dark inner mouth plate
- narrow eel neck segment
- front ribbon body segment
- rear whip tail segment
- tail-tip lure bulb
- left tiny pectoral fin
- right tiny pectoral fin
- gill slit seam plates

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
- Biological anchor: Pelican eel expandable buccal cavity, tiny skull, loose throat pouch, and whip tail.
- Extra required read: Show jaw hoops, skull hinge collar, pouch membrane, neck, body, and tail lure as one continuous animal.
- Avoid: Huge mouth focus can generate a detached maw or worm-like monster without eel vertebrate continuity.
- Avoid: Black flexible body may lose hinge, fin, and lure readability at sprite scale.
- Avoid: Avoid suction vortices, prey silhouettes, or floating-mouth horror imagery in the source.
- Preserve motion phase readability: tail lure bait, mouth pouch bloom, suction hold, snap shut, deflated recovery
- Reference search term: pelican eel mouth open
- Reference search term: gulper eel buccal cavity
- Reference search term: Eurypharynx pelecanoides anatomy
- Reference search term: pelican eel tail lure

## Reject If

- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth, front-facing circular portal mouth, extra eel heads, duplicated body segments, or tentacled radial creature; all jaw and pouch structures must connect to the body.
- Avoid centered radial composition, mirrored front-facing views, circular portal mouths, starburst layouts, repeated curled appendages, or any multi-limbed silhouette.
- Avoid armor plates, horns, spikes, teeth crowns, suction-cup pores, crab anatomy, octopus anatomy, or tentacle anatomy; keep plain soft pelican-eel biology.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.
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
- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- Spatial ratio read: mouth pouch occupies roughly the front 35-45% while connected body and tail occupy the rear 55-65%, preventing a detached maw or portal-creature read.
- Rig crop read: jaw hoops, pouch membrane, pectoral fins, tail base, and tail lure have visible magenta negative space around their outer edges while remaining connected at the roots.

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater enemy called Gulper Eel Maw, abyssal pelican eel inspired vertebrate predator, strict flat side-profile creature sheet pose facing right, asymmetrical lateral silhouette, not centered radial composition, one continuous left-to-right eel spine line, open pelican-eel mouth and tiny skull head on the right, one connected ribbon body trailing left into a single whip tail with cyan lure bulb, large lateral pelican-eel gape and throat pouch occupy the front 35-45% of the creature, connected eel body and tail occupy the rear 55-65%, tiny skull hinge collar, upper and lower jaw hoops as thick biological cartilage crescents connected to the same skull hinge, visible continuous anatomy chain from jaw hoops to skull collar to narrow neck to ribbon body to whip tail, dark inner mouth plate, semi-opaque blue-gray throat pouch membrane with a dark rim readable at 64px, smooth flexible black deep-sea eel skin, sparse gill slits, small pectoral fins, charcoal black deep teal ivory and cold blue palette with no magenta body color, jaw hoops pouch membrane pectoral fins tail lure and tail base have visible magenta negative space around their outer edges while remaining biologically connected at their roots, crop-friendly visually distinct but physically connected jaw hoops pouch membrane neck ribbon body tail lure and fins with visible hinge zones, centered with generous margin, crisp painterly browser-game sprite, no environment, no shadow, no bubbles, no water vortex, no prey, no text, no circular portal mouth, no starburst layout, no repeated curled appendages, no armor plates, no horns, no spikes, no teeth crown, no suction-cup pores, no crab octopus or tentacle anatomy

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Pelican eel expandable buccal cavity, tiny skull, loose throat pouch, and whip tail.
- Extra required read: Show jaw hoops, skull hinge collar, pouch membrane, neck, body, and tail lure as one continuous animal.
- Avoid: Huge mouth focus can generate a detached maw or worm-like monster without eel vertebrate continuity.
- Avoid: Black flexible body may lose hinge, fin, and lure readability at sprite scale.
- Avoid: Avoid suction vortices, prey silhouettes, or floating-mouth horror imagery in the source.
- Preserve motion phase readability: tail lure bait, mouth pouch bloom, suction hold, snap shut, deflated recovery
- Reference search term: pelican eel mouth open
- Reference search term: gulper eel buccal cavity
- Reference search term: Eurypharynx pelecanoides anatomy
- Reference search term: pelican eel tail lure

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
- One cohesive whole eel-like vertebrate, not a worm, snake, or loose floating mouth.
- Strict flat side-profile creature sheet pose: one continuous left-to-right eel spine line, mouth and head on the right, single whip tail on the left.
- Large lateral pelican-eel gape and throat pouch occupy the front 35-45% of the creature; connected eel body and tail occupy the rear 55-65%.
- Long whip tail, tiny head hinges, throat membrane, and lure tip remain connected as one riggable body.
- Jaw hoops and pouch membrane are thick enough to crop and animate at sprite scale.
- Visible continuous anatomy chain: upper jaw hoop and lower jaw hoop pivot on the same tiny skull collar, skull collar connects to narrow neck, neck connects to ribbon body, ribbon body tapers into one whip tail with cyan lure bulb.
- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- No water vortex, prey fish, bubbles, blackwater haze, floor plane, or cast shadow baked into the source.

Candidate-specific contract checks:
- Lateral-axis read: all major anatomy follows one side-profile eel axis from mouth/right to tail/left; reject if the image reads as radial, front-facing, mirrored, or multi-limbed.
- Spatial ratio read: mouth pouch occupies roughly the front 35-45% while connected body and tail occupy the rear 55-65%, preventing a detached maw or portal-creature read.
- Rig crop read: jaw hoops, pouch membrane, pectoral fins, tail base, and tail lure have visible magenta negative space around their outer edges while remaining connected at the roots.

Reject immediately if:
- Avoid a generic snake or leech; keep the tiny skull, huge mouth pouch, and long eel body visible.
- Avoid a detached monster mouth, front-facing circular portal mouth, extra eel heads, duplicated body segments, or tentacled radial creature; all jaw and pouch structures must connect to the body.
- Avoid centered radial composition, mirrored front-facing views, circular portal mouths, starburst layouts, repeated curled appendages, or any multi-limbed silhouette.
- Avoid armor plates, horns, spikes, teeth crowns, suction-cup pores, crab anatomy, octopus anatomy, or tentacle anatomy; keep plain soft pelican-eel biology.
- Avoid making suction currents part of the base sprite; pull effects should be separate VFX.
- Avoid bright magenta, hot pink, or purple anatomy that conflicts with chroma keying.
- Avoid over-detailing the black body so the hinge zones and lure remain readable.
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
npm run source:imagegen-mark -- --id gulper-eel-maw
# run image generation from the prompt above
npm run source:imagegen-status -- --id gulper-eel-maw
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id gulper-eel-maw --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id gulper-eel-maw --image <image-path> --copy
npm run source:image-check -- --id gulper-eel-maw
npm run source:gallery
npm run source:check
# if the output is visually bad:
npm run source:reject-attempt -- --id gulper-eel-maw --attempt-kind visual-failure --image <bad-output-path> --reason "<specific visual failure after inspecting the generated source image>"
# if no generated file is accessible:
npm run source:imagegen-status -- --reject-missing
```

