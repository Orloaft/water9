# Source Focus Pack: Saber Viperfish (saber-viperfish)

Generated: `2026-06-17T03:16:43.170Z`
Queue rank: `2`
Status: `draft`
Expected output: `public/assets/generated/fauna-saber-viperfish-whole-source.png`
Inbox target: `tools/source-inbox/saber-viperfish.png`
Contract: `public/review/source-candidates/art-contracts/saber-viperfish.md`

## Why This Is Next

- Score: `84`
- Existing rejected attempts: `0`
- Depth band: bathypelagic hunting layer / abyssal descent routes
- Gameplay verb: Lock-on dash striker that flashes its photophore chain, unhinges saber jaws, then commits to a fast straight impale that can be dodged and punished.

## Generate

```bash
npm run source:session -- --id saber-viperfish
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

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
- Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.
- Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.
- Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Required read:
- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

Reject if any of these are true:
- Avoid a generic toothy fish; the jaw hinge, saber teeth, photophore chain, and dorsal lure must define it.
- Avoid too many tiny teeth that become visual noise; use fewer large crop-safe fangs.
- Avoid metal blades, harpoons, armor plating, or sci-fi weapon cues.
- Avoid baked dash trails or impact sparks that should be generated separately.
- Avoid magenta or hot pink light sources inside the creature.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One whole viperfish-like vertebrate, not a barracuda, dragon, or metal spear device.
- Oversized saber teeth and unhinged jaw are the first danger read.
- Photophore belly chain, dorsal lure spine, fins, tail, and skull share one biological material language.
- Teeth are large readable fang shapes rather than many tiny noisy needles.
- No motion streaks, target reticle, bubbles, prey fish, lighting beams, or shadow baked into the source.

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
- Biological anchor: Chauliodus viperfish hinged jaw, recurved teeth, dorsal lure, and ventral photophores.
- Extra required read: Use fewer oversized fang plates with clear roots in the skull rather than dense needle noise.
- Avoid: Could collapse into generic toothy fish if photophore chain and dorsal lure are underemphasized.
- Avoid: Saber and impale language may invite metal spear, harpoon, or sci-fi blade motifs.
- Avoid: Avoid weaponized armor language; specify translucent deep-sea fish tissues and biological teeth.
- Motion phase: photophore lock-on flash, jaw unhinge, straight dash, overextended recovery
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
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id saber-viperfish
npm run source:imagegen-status -- --id saber-viperfish --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/saber-viperfish.png:
npm run source:recover-inline -- --id saber-viperfish --copy --validate
npm run source:recover-inline -- --id saber-viperfish --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id saber-viperfish --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read \
  --source-reviewed --dry-run
```

## Previous Rejections

- None recorded.

