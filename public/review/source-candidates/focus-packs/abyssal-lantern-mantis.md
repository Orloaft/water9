# Source Focus Pack: Abyssal Lantern Mantis (abyssal-lantern-mantis)

Generated: `2026-06-17T18:11:57.879Z`
Queue rank: `1`
Status: `draft`
Expected output: `public/assets/generated/fauna-abyssal-lantern-mantis-whole-source.png`
Inbox target: `tools/source-inbox/abyssal-lantern-mantis.png`
Contract: `public/review/source-candidates/art-contracts/abyssal-lantern-mantis.md`

## Why This Is Next

- Score: `54`
- Existing rejected attempts: `1`
- Depth band: lower bathyal caves / abyssal reef breaks
- Gameplay verb: Burst striker that locks on with lantern eye spots, coils its raptorial arms, then releases a fast straight-line punch.

## Generate

```bash
npm run source:session -- --id abyssal-lantern-mantis
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater threat called Abyssal Lantern Mantis, deep-sea smasher mantis shrimp inspired crustacean predator, side-facing three-quarter view facing right, plated head carapace, two raised compound eye stalks with small cyan biological lantern spots, long antenna whips, segmented thorax and abdomen, two oversized folded blunt-club raptorial strike arms with clear meral saddle joints and one obvious forward punch vector, small walking limbs beneath, broad tail fan, dark emerald charcoal shell with bone edges and muted red copper accents, crisp readable silhouette at 64px, crop-friendly separated eye stalks antennae club strike arms walking limbs abdomen and tail fan with visible biological hinge zones, centered with generous margin, no environment, no shadow, no spear tips, no weapon hardware, no motion streaks, no particles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Mantis shrimp meral saddle joint and folded raptorial appendage anatomy.
- Extra required read: Folded strike arms should show hinge, club or spear tip, and punch vector without weapon-like hardware.
- Avoid: Mixing spearer and smasher behaviors could create ambiguous arm shapes unless saddle joints are emphasized.
- Avoid: Lantern eye spots and colorful mantis references may push toward tropical saturation or sci-fi robot styling.
- Avoid: Avoid neon armor panels; keep glow limited to biological eye-stalk overlays.
- Rig-only motion note, do not render as a sequence or VFX: aim with eye stalks, coil raptorial arms, spring strike, abdomen recoil
- Reference search term: mantis shrimp raptorial appendage folded
- Reference search term: stomatopod meral saddle anatomy
- Reference search term: mantis shrimp eye stalks
- Reference search term: mantis shrimp tail fan side view

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
- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

Candidate-specific contract checks:
- Strike-arm read: reject if the raptorial appendages become spear tips, drills, guns, or mismatched weapon arms instead of paired blunt smasher clubs.
- Crustacean anatomy read: head, thorax, abdomen, walking limbs, eye stalks, and tail fan must remain one continuous mantis-shrimp body.
- Glow restraint read: cyan lantern spots must be small biological eye-stalk markings, not neon armor panels or baked aim beams.

Reject if any of these are true:
- Avoid robotic boxing gloves, cannons, drills, or mechanical pistons.
- Avoid spearer-style needle arms; this candidate uses blunt smasher clubs for a single clear attack read.
- Avoid tropical rainbow saturation that fights the abyssal threat tone.
- Avoid fish-like fins replacing the crustacean legs and plated abdomen.
- Avoid making the eye glow magenta or hot pink.
- Keep punch trails, shock rings, and aim beams as separate VFX.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One full-body mantis-shrimp-like predator with clear head, torso, abdomen, and tail fan.
- Coiled raptorial arms are the first danger read and must show punch direction.
- Eye stalks, antennae, strike arms, walking limbs, and tail fan need crop-safe separation.
- The creature should feel biological and crustacean, not a robot, gun, or armored fish.
- No punch streaks, shock rings, cave wall, bubbles, shadows, or light cones baked into the source.

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
- Biological anchor: Mantis shrimp meral saddle joint and folded raptorial appendage anatomy.
- Extra required read: Folded strike arms should show hinge, club or spear tip, and punch vector without weapon-like hardware.
- Avoid: Mixing spearer and smasher behaviors could create ambiguous arm shapes unless saddle joints are emphasized.
- Avoid: Lantern eye spots and colorful mantis references may push toward tropical saturation or sci-fi robot styling.
- Avoid: Avoid neon armor panels; keep glow limited to biological eye-stalk overlays.
- Motion phase: aim with eye stalks, coil raptorial arms, spring strike, abdomen recoil
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
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id abyssal-lantern-mantis
npm run source:imagegen-status -- --id abyssal-lantern-mantis --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/abyssal-lantern-mantis.png:
npm run source:recover-inline -- --id abyssal-lantern-mantis --copy --validate
npm run source:recover-inline -- --id abyssal-lantern-mantis --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id abyssal-lantern-mantis --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane \
  --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> \
  --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' \
  --source-reviewed --dry-run
```

## Previous Rejections

- 2026-06-17T03:42:47.227Z: Rejected cache match: cohesive mantis shrimp anatomy, but tropical rainbow saturation and bright reef palette violate the abyssal threat contract.

