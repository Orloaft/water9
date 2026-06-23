# Source Focus Pack: Vampire Cloak Squid (vampire-cloak-squid)

Generated: `2026-06-17T03:27:57.949Z`
Queue rank: `8`
Status: `draft`
Expected output: `public/assets/generated/fauna-vampire-cloak-squid-whole-source.png`
Inbox target: `tools/source-inbox/vampire-cloak-squid.png`
Contract: `public/review/source-candidates/art-contracts/vampire-cloak-squid.md`

## Why This Is Next

- Score: `56`
- Existing rejected attempts: `0`
- Depth band: oxygen-minimum mesopelagic / dark open water
- Gameplay verb: Cephalopod feint attacker that cloaks into a spined umbrella, flashes photophores, then snaps its arms outward for a short-range grab.

## Generate

```bash
npm run source:session -- --id vampire-cloak-squid
```

Use the prompt below exactly. If generation only appears inline, save or paste it through the capture/recovery flow before ingest.

```text
Flat pure #ff00ff magenta background, isolated whole full-body 2D game sprite source art, cohesive underwater enemy called Vampire Cloak Squid, vampire squid inspired cephalopod threat, compact dark mantle with small fin pair, large pale blue eyes, eight arms connected by broad cloak web membrane, soft spine and cirri fringe along arm edges, glowing cyan photophore tips, inside-out defensive umbrella posture readable as an alternate silhouette, black burgundy charcoal ivory cyan palette, side-facing three-quarter view, crop-friendly separated mantle eyes fin pair arm clusters web membrane and photophore tips, crisp painterly browser-game sprite, centered with margin, no environment, no shadow, no ink cloud, no bubbles, no text

Research audit hardening:
- Lane: mobile-predator-motion
- Biological anchor: Vampyroteuthis infernalis webbed arm crown, cirri rows, photophores, and defensive pineapple posture.
- Extra required read: Cloak membrane must visibly connect arm pairs while leaving arm bases separable for rigging.
- Avoid: Vampire language can invite fangs, bat wings, cape shapes, or humanoid styling.
- Avoid: Eight webbed arms risk becoming a tangled octopus mass if grouped clusters and membrane boundaries are unclear.
- Avoid: Avoid giant octopus scale cues; keep compact mantle, large eyes, and umbrella web dominant.
- Preserve motion phase readability: compact drift, cloak umbrella flare, photophore flash, arm snap grab
- Reference search term: Vampyroteuthis infernalis webbed arms
- Reference search term: vampire squid pineapple posture
- Reference search term: vampire squid cirri photophores
- Reference search term: vampire squid side view

Source pose contract:
- Generate a neutral riggable source pose, not the peak attack impact frame.
- Attack direction must still be obvious from the creature silhouette, mouth/claw/spine orientation, or lure/eye aim.
- Primary pivots and hinge zones must be visible: jaw pivots, limb roots, fin roots, tail base, stalk base, or equivalent anatomy.
- Major appendages must be separated enough for later cropping, with small overlaps allowed only where anatomy connects.
- Default pose must show both the idle read and the attack telegraph read without baking in trails, particles, prey, or damage effects.

Required read:
- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

Reject if any of these are true:
- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.
- The subject is a collage, detached prop assembly, duplicate creature, or placeholder design.
- The background is not a clean, flat #ff00ff magenta key.
- The silhouette does not communicate the gameplay verb at small sprite scale.
- The source is a full attack impact frame that hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.
```

## Required Read

- One whole cephalopod with mantle, eyes, arms, and webbing clearly connected.
- Cloak web and arm crown are the main gameplay read, not loose tentacles.
- Eight arms are grouped into riggable clusters without becoming a tangled mass.
- Photophore spots are visible but do not cover the anatomy.
- No ink cloud, particles, water background, shadows, or cropped-off arms baked into the source.

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
- Biological anchor: Vampyroteuthis infernalis webbed arm crown, cirri rows, photophores, and defensive pineapple posture.
- Extra required read: Cloak membrane must visibly connect arm pairs while leaving arm bases separable for rigging.
- Avoid: Vampire language can invite fangs, bat wings, cape shapes, or humanoid styling.
- Avoid: Eight webbed arms risk becoming a tangled octopus mass if grouped clusters and membrane boundaries are unclear.
- Avoid: Avoid giant octopus scale cues; keep compact mantle, large eyes, and umbrella web dominant.
- Motion phase: compact drift, cloak umbrella flare, photophore flash, arm snap grab
- Reference search term: Vampyroteuthis infernalis webbed arms
- Reference search term: vampire squid pineapple posture
- Reference search term: vampire squid cirri photophores
- Reference search term: vampire squid side view

## Reject If

- Avoid bat wings, fangs, capes, or humanoid vampire styling; keep it biological.
- Avoid squid tentacle tangles that obscure the eight-arm cloak structure.
- Avoid magenta or pink photophores that conflict with the background.
- Avoid a giant octopus silhouette; compact mantle and webbed arms should identify vampire squid.
- Keep ink, flash bursts, and stun effects separate from the base anatomy.
- The subject reads as a collage, detached prop assembly, duplicate creature, or placeholder design.
- The source bakes in VFX, prey, UI, shadows, bubbles, or environment that should be separate.
- The background is not a clean, flat #ff00ff magenta key.
- The image hides pivots, limb roots, crop-safe appendages, or neutral riggable anatomy.

## After Generation

```bash
npm run source:imagegen-status -- --id vampire-cloak-squid
npm run source:imagegen-status -- --id vampire-cloak-squid --ingest
# Preferred for pasted, dropped, downloaded, or manually saved output:
npm run source:inbox-capture
# If the output appears inline only, recover it into tools/source-inbox/vampire-cloak-squid.png:
npm run source:recover-inline -- --id vampire-cloak-squid --copy --validate
npm run source:recover-inline -- --id vampire-cloak-squid --image <saved-image-path> --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

## Human Source Approval Dry Run

```bash
npm run source:accept -- --id vampire-cloak-squid --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read \
  --source-reviewed --dry-run
```

## Previous Rejections

- None recorded.

