# Source Focus Pack: Thorn Fan Coralline (thorn-fan-coralline)

Generated: `2026-06-17T18:59:53.318Z`
Queue rank: `1`
Status: `draft`
Expected output: `public/assets/generated/fauna-thorn-fan-coralline-whole-source.png`
Inbox target: `tools/source-inbox/thorn-fan-coralline.png`
Contract: `public/review/source-candidates/art-contracts/thorn-fan-coralline.md`

## Why This Is Next

- Score: `47`
- Existing rejected attempts: `0`
- Depth band: current-swept reef wall / biome 1-3
- Gameplay verb: Reef-like fan ambusher that disguises itself as cover, rotates into the current, then lashes thorn ribs to create a temporary damage wall.

## Generate

```bash
npm run source:session -- --id thorn-fan-coralline
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

```text
Flat pure #ff00ff magenta background, isolated whole/full-body 2D game sprite source art, cohesive underwater threat called Thorn Fan Coralline, sessile reef-like gorgonian sea fan ambusher with rooted reef foot and central stalk spine, flattened fan silhouette split into left and right lobes, thick primary gorgonian thorn ribs dominating over a few short secondary crossbars with no lace mesh, fold hinge knots, sparse raised stinging polyps, armored coralline plates, fire-coral danger cues, palette of ivory bone dark teal rust red sulfur yellow and charcoal with no magenta body color, readable full creature at 64px, centered with margin, crisp painterly browser-game sprite, no environment, no reef wall, no current lines, no shadow, no particles, no text

Research audit hardening:
- Lane: complex-colonial-forms
- Biological anchor: Favor gorgonian sea fans with thick primary ribs and visible polyps over delicate lace fans.
- Biological anchor: Use fire coral/hydroid stinging polyps as sparse raised beads along ribs, not dense dotted texture.
- Extra required read: The central stalk and left/right lobes should have clear hinge knots so the fan can rotate, fold, and lash as one organism.
- Avoid: Sea fan references often produce fine lace branches that will be too thin for sprite-scale cropping or damage-wall reads.
- Avoid: Coralline algae and fire coral cues can turn into background reef texture unless the central stalk and thorn ribs dominate.
- Avoid: Avoid 'decorative fan coral', 'reef background', 'ornamental symmetry', and dense lace-branch prompts.
- Rig-only motion note, do not render as a sequence or VFX: cover-like feeding fan open
- Rig-only motion note, do not render as a sequence or VFX: stalk rotates into current
- Rig-only motion note, do not render as a sequence or VFX: hinge knots tense and polyps brighten
- Rig-only motion note, do not render as a sequence or VFX: thorn ribs lash into wall
- Rig-only motion note, do not render as a sequence or VFX: fan relaxes and reopens
- Reference search term: gorgonian sea fan thick branches
- Reference search term: fire coral stinging polyps
- Reference search term: hydroid colony stinging polyps
- Reference search term: crustose coralline algae reef plating

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
- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

Candidate-specific contract checks:
- Thick primary ribs dominate the silhouette; fine branches remain secondary and do not become lace noise.
- Left and right fan lobes grow from one rooted stalk spine with visible hinge knots and shared coralline plates.
- Raised stinging polyps are sparse anatomy on the ribs, not dotted texture or detached bead rows.

Reject if any of these are true:
- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One rooted fan-shaped reef organism, not background coral decoration.
- Thick thorn ribs and central stalk define the first silhouette at game scale.
- Left and right fan lobes have separable branch groups for folding and lashing.
- Stinging polyp beads sit on the ribs without becoming noisy dotted texture.
- No reef wall, seabed, lighting shaft, fish, bubbles, or baked current lines in the source.

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

- Lane: complex-colonial-forms
- Biological anchor: Favor gorgonian sea fans with thick primary ribs and visible polyps over delicate lace fans.
- Biological anchor: Use fire coral/hydroid stinging polyps as sparse raised beads along ribs, not dense dotted texture.
- Extra required read: The central stalk and left/right lobes should have clear hinge knots so the fan can rotate, fold, and lash as one organism.
- Avoid: Sea fan references often produce fine lace branches that will be too thin for sprite-scale cropping or damage-wall reads.
- Avoid: Coralline algae and fire coral cues can turn into background reef texture unless the central stalk and thorn ribs dominate.
- Avoid: Avoid 'decorative fan coral', 'reef background', 'ornamental symmetry', and dense lace-branch prompts.
- Motion phase: cover-like feeding fan open
- Motion phase: stalk rotates into current
- Motion phase: hinge knots tense and polyps brighten
- Motion phase: thorn ribs lash into wall
- Motion phase: fan relaxes and reopens
- Reference search term: gorgonian sea fan thick branches
- Reference search term: fire coral stinging polyps
- Reference search term: hydroid colony stinging polyps
- Reference search term: crustose coralline algae reef plating

## Reject If

- Avoid background reef scenery; the fan must read as an enemy entity.
- Avoid thin lace branches that disappear at small sprite size.
- Avoid perfect ornamental symmetry that feels like a decorative logo.
- Avoid detached coral chunks or separate fan colonies.
- Keep current streaks, sting flashes, and impact sparks as separate VFX assets.
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id thorn-fan-coralline
npm run source:imagegen-status -- --id thorn-fan-coralline --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/thorn-fan-coralline.png:
npm run source:recover-inline -- --id thorn-fan-coralline --copy --validate
npm run source:recover-inline -- --id thorn-fan-coralline --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id thorn-fan-coralline --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane \
  --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> \
  --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' \
  --source-reviewed --dry-run
```

## Previous Rejections

- None recorded.

