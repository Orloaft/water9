# Source Focus Pack: Trench Harvest Sea Spider (trench-harvest-sea-spider)

Generated: `2026-06-17T17:51:11.234Z`
Queue rank: `1`
Status: `draft`
Expected output: `public/assets/generated/fauna-trench-harvest-sea-spider-whole-source.png`
Inbox target: `tools/source-inbox/trench-harvest-sea-spider.png`
Contract: `public/review/source-candidates/art-contracts/trench-harvest-sea-spider.md`

## Why This Is Next

- Score: `55`
- Existing rejected attempts: `0`
- Depth band: abyssal soft-bottom plains / carcass falls
- Gameplay verb: Long-legged pinning hunter that steps over obstacles, plants barbed legs around the diver, then siphons during a brief hold.

## Generate

```bash
npm run source:session -- --id trench-harvest-sea-spider
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Trench Harvest Sea Spider, abyssal pycnogonid sea spider inspired arthropod enemy, side-facing three-quarter view facing right, tiny knuckled central body, small head nub, long forward biological proboscis siphon, eight extremely long jointed legs with thick visible knees and hooked terminal claws, subtle dorsal egg-sac lump, pale translucent gray chitin with charcoal joints, cold cyan and dull ivory accents, eerie readable wide silhouette at 64px, crop-friendly separated legs proboscis body claw hooks and egg sac with visible hinge zones, centered with generous margin, no environment, no web, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Deep-sea pycnogonid anatomy with ovigers, proboscis, and segmented walking legs.
- Extra required read: Leg joints should be thickened at coxae and knees while preserving the tiny-body pycnogonid read.
- Avoid: Long limbs can become hair-thin or tangled, making crop-safe rigging fragile.
- Avoid: Forward proboscis may read as a gun barrel or stinger unless kept soft and organic.
- Avoid: Avoid spider eyes, fangs, silk, abdomen bulb, or terrestrial horror-spider cues.
- Rig-only motion note, do not render as a sequence or VFX: slow high step, plant pinning legs, lower proboscis, release and lift
- Reference search term: deep sea pycnogonid giant sea spider
- Reference search term: sea spider proboscis anatomy
- Reference search term: pycnogonid long legs side view
- Reference search term: sea spider ovigers

Source pose contract:
- Generate a single neutral pre-attack source pose, not a sequence, contact sheet, or multiple animation frames.
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Shared source art recipe:
- Shared render recipe: orthographic 2D browser-game sprite source, crisp silhouette, controlled painterly edges, no photographic texture collage.
- Lighting recipe: one cool upper-left rim light and one muted lower-body shadow logic across the entire organism.
- Detail recipe: medium detail density only; no hairline critical anatomy, noisy lace mesh, loose sparkle fields, or unresolved texture fuzz.
- Glow recipe: cyan or cold blue biological glow may mark anatomy, but glow halos, pulses, beams, clouds, and attack flashes are separate VFX, not base source art.
- 64px crop proof: every required hinge, root, mouth rim, fin, tendril, spine, claw, or crop-intended appendage must remain visible after downscale.

Cohesion lock:
- One-source proof: render one continuous organism in one neutral source pose, not a parts board, variants sheet, or disconnected thumbnails.
- Connection proof: every crop-intended appendage must visibly grow from or overlap the same body with a readable hinge, socket, root, or skin transition.
- Style proof: all body regions and crop-intended organs must share one palette, line weight, lighting direction, material language, and shadow logic.
- Proportion proof: body parts must look like they belong to the same animal when articulated; reject mismatched copied fragments or arbitrary size jumps.
- Production proof: reject outputs that read as placeholder shapes, collage kitbash, props, UI icons, environmental rocks, duplicate creatures, or loose weapons.

Required read:
- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

Candidate-specific contract checks:
- Six to eight crop-safe legs remain visibly rooted in a tiny central pycnogonid body with marine joint anatomy.
- Forward proboscis is soft and tapered biological feeding tissue, not a rigid gun barrel, stinger, or weapon.
- Reject spider eyes, fangs, webbing, terrestrial abdomen bulb, hair-thin limbs, or disconnected leg fragments.

Reject if any of these are true:
- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One cohesive sea-spider-inspired arthropod, not a land spider or insect.
- Tiny central body with long articulated legs is the first silhouette read.
- Forward proboscis must read as a biological siphon and not a weapon barrel.
- Legs are separated enough for rigging, with thick joints and clear contact claws.
- No webbing, carcass, seafloor, drifting particles, shadows, blood clouds, or environmental props baked in.

## Source Pose Rules

- Generate a single neutral pre-attack source pose, not a sequence, contact sheet, or multiple animation frames.
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from species-appropriate anatomy: jaws, oral disc, osculum, spines, fins, lures, eyes, claws, or body aim.
- Primary pivots and crop zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, rim folds, throat valves, or equivalent anatomy.
- Major appendages, valves, rims, plates, or tentacles must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

## Quality Checks

- whole-creature-cohesion
- part-continuity-cohesion
- readable-silhouette
- no-collage-artifacts
- non-placeholder-art-direction
- crop-safe-anatomy
- clean-magenta-key
- gameplay-read
- neutral-riggable-pose
- visible-attack-lane

## Research Audit Hardening

- Lane: mobile-predator-motion
- Biological anchor: Deep-sea pycnogonid anatomy with ovigers, proboscis, and segmented walking legs.
- Extra required read: Leg joints should be thickened at coxae and knees while preserving the tiny-body pycnogonid read.
- Avoid: Long limbs can become hair-thin or tangled, making crop-safe rigging fragile.
- Avoid: Forward proboscis may read as a gun barrel or stinger unless kept soft and organic.
- Avoid: Avoid spider eyes, fangs, silk, abdomen bulb, or terrestrial horror-spider cues.
- Motion phase: slow high step, plant pinning legs, lower proboscis, release and lift
- Reference search term: deep sea pycnogonid giant sea spider
- Reference search term: sea spider proboscis anatomy
- Reference search term: pycnogonid long legs side view
- Reference search term: sea spider ovigers

## Reject If

- Avoid a terrestrial spider read; keep pycnogonid tiny-body and marine proboscis anatomy.
- Avoid making legs hair-thin; every limb needs usable thickness for articulation.
- Avoid web strands, silk, or horror-web language because sea spiders do not use webs.
- Avoid a gun-like proboscis; it should be soft biological feeding anatomy.
- Avoid magenta highlights on joints, eyes, or siphon effects.
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id trench-harvest-sea-spider
npm run source:imagegen-status -- --id trench-harvest-sea-spider --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/trench-harvest-sea-spider.png:
npm run source:recover-inline -- --id trench-harvest-sea-spider --copy --validate
npm run source:recover-inline -- --id trench-harvest-sea-spider --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id trench-harvest-sea-spider --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane \
  --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> \
  --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' \
  --source-reviewed --dry-run
```

## Previous Rejections

- None recorded.

