# Source Focus Pack: Hadal Trencher Isopod (hadal-trencher-isopod)

Generated: `2026-06-17T03:16:43.173Z`
Queue rank: `5`
Status: `draft`
Expected output: `public/assets/generated/fauna-hadal-trencher-isopod-whole-source.png`
Inbox target: `tools/source-inbox/hadal-trencher-isopod.png`
Contract: `public/review/source-candidates/art-contracts/hadal-trencher-isopod.md`

## Why This Is Next

- Score: `62`
- Existing rejected attempts: `0`
- Depth band: hadal trench floor / abyssal scavenger lanes
- Gameplay verb: Armored burrow ambusher that braces into the sediment, raises shield plates, then lunges in a short crushing shove.

## Generate

```bash
npm run source:session -- --id hadal-trencher-isopod
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Hadal Trencher Isopod, abyssal giant isopod inspired armored arthropod creature, side-facing three-quarter view facing right, domed overlapping segmented chitin plates, broad head shield, blunt crushing mandibles, thick sweeping antennae, compact jointed legs visible beneath the armor, side shield flanges, curled tail fan plate, pale bone gray chitin with charcoal seams and cold teal abyssal accents, crisp readable silhouette at 64px, crop-friendly separated plates legs antennae mandibles and tail with visible hinge zones, centered with generous margin, no environment, no shadow, no haze, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Bathynomus giganteus lateral and dorsal body references with visible pereopods and pleotelson.
- Extra required read: Show enough underside leg mass below the tergite stack to avoid a smooth fossil-shell silhouette.
- Avoid: Bathynomus plus burrowing cues could drift into trilobite, beetle, or crab collage if underside legs are hidden.
- Avoid: Defensive curl and forward shove may be hard to reconcile in one side-profile rig without clear hinge zones.
- Avoid: Avoid symmetrical top-down armor poses; require a readable lateral shove direction.
- Preserve motion phase readability: brace low in sediment, raise shield plates, short forward shove, curl recoil
- Reference search term: Bathynomus giganteus side view
- Reference search term: giant isopod curled posture
- Reference search term: deep sea isopod pereopods
- Reference search term: isopod pleotelson anatomy

Source pose contract:
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.
- Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.
- Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Required read:
- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

Reject if any of these are true:
- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One cohesive full-body isopod-like threat, not a generic beetle, trilobite, or crab.
- Segmented armored back is the first read, with the head and shove direction clearly visible.
- Legs, antennae, plates, and mouthparts are thick enough to crop and rig at sprite scale.
- Defensive curl and forward lunge shapes must be visually plausible from the same anatomy.
- No sand clouds, seafloor, burrow hole, shadows, haze, or loose debris baked into the source.

## Source Pose Rules

- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.
- Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.
- Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

## Quality Checks

- whole-creature-cohesion
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
- Biological anchor: Bathynomus giganteus lateral and dorsal body references with visible pereopods and pleotelson.
- Extra required read: Show enough underside leg mass below the tergite stack to avoid a smooth fossil-shell silhouette.
- Avoid: Bathynomus plus burrowing cues could drift into trilobite, beetle, or crab collage if underside legs are hidden.
- Avoid: Defensive curl and forward shove may be hard to reconcile in one side-profile rig without clear hinge zones.
- Avoid: Avoid symmetrical top-down armor poses; require a readable lateral shove direction.
- Motion phase: brace low in sediment, raise shield plates, short forward shove, curl recoil
- Reference search term: Bathynomus giganteus side view
- Reference search term: giant isopod curled posture
- Reference search term: deep sea isopod pereopods
- Reference search term: isopod pleotelson anatomy

## Reject If

- Avoid making it look like a land beetle; keep marine isopod proportions and flattened body logic.
- Avoid overly tiny legs hidden under the shell; they need to rig clearly.
- Avoid perfect trilobite symmetry or fossil styling that reads as extinct decoration.
- Avoid magenta, hot pink, or purple body colors that conflict with the chroma key.
- Keep sand burst, impact dust, and burrow opening as separate VFX rather than source art.
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id hadal-trencher-isopod
npm run source:imagegen-status -- --id hadal-trencher-isopod --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/hadal-trencher-isopod.png:
npm run source:recover-inline -- --id hadal-trencher-isopod --copy --validate
npm run source:recover-inline -- --id hadal-trencher-isopod --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id hadal-trencher-isopod --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read \
  --source-reviewed --dry-run
```

## Previous Rejections

- None recorded.

