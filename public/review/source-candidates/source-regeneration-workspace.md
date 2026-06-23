# Water 9 Source Regeneration Workspace

Generated: `2026-06-18T17:21:09.181Z`

Focused regeneration workspace for the current source-review sequencer target. This workspace does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.

## Target

- Candidate: `brine-crown` Brine Crown
- Lane: `approval-ready`
- Status: `approval-ready; human source review required`
- Health status: `replacement-applied`
- Replacement matches current source: `true`
- Distinct replacement ready: `false`
- Replacement applied: `true`

## Command Boundary

The replacement is already applied and mechanically ready for source review. Do not regenerate or overwrite source art from this workspace; inspect the approval runway and visual board next.

## Source / Inbox Fingerprints

| File | Exists | Size | SHA-256 |
| --- | --- | ---: | --- |
| `public/assets/generated/fauna-brine-crown-whole-source.png` | `true` | `337378` | `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825` |
| `tools/source-inbox/brine-crown.png` | `true` | `337378` | `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825` |
| `public/review/source-candidates/regeneration-inbox/brine-crown-inbox.png` | `true` | `337378` | `96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825` |

## Replacement Workspace

- Expected inbox replacement: `tools/source-inbox/brine-crown.png`
- Inbox replacement preview: /review/source-candidates/regeneration-inbox/brine-crown-inbox.png
- Replacement scratch directory: `tools/source-inbox/regeneration-workspace/brine-crown`
- Capture UI: `http://127.0.0.1:5188/?id=brine-crown`
- Current source preview: /assets/generated/fauna-brine-crown-whole-source.png
- Source sandbox: /?entity=source-brine-crown&companion=diver
- Critic health: /review/source-candidates/source-critic-regeneration-health.html
- Source approval runway: /review/source-approval-runway.html
- Sequencer: /review/source-candidates/source-review-sequencer.html

## Safe Next Commands

```bash
npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check
npm run source:approval-runway && npm run source:approval-runway-check
npm run source:review-sequencer && npm run source:review-sequencer-check
npm run source:review-target-packet && npm run source:review-target-packet-check
npm run source:visual-board && npm run source:visual-board-check
npm run content:review-session && npm run content:review-session-check
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
```

## Distinct Replacement Gate

- Validate inbox image: `python3 tools/validate_source_candidate_images.py --id brine-crown --image tools/source-inbox/brine-crown.png`
- Rebuild health: `npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check`
- Rebuild sequencer: `npm run source:review-sequencer && npm run source:review-sequencer-check`
- Rebuild target packet: `npm run source:review-target-packet && npm run source:review-target-packet-check`
- Dry-run replacement ingest is only exposed when lane is `regenerate-distinct-ready`.

## Prompt

Prompt file: `public/review/source-candidates/critic-regeneration-prompts/07-brine-crown.txt`

```text
Critic regeneration target: Brine Crown (brine-crown)

Regenerate this source image because a lane critic explicitly found it below the source-approval bar.
Create one cohesive whole-source underwater threat on a flat pure #ff00ff magenta background.
Do not create a parts sheet, animation strip, screenshot, UI icon, environmental prop, or collage.
Preserve the gameplay verb and biological anchors, but redesign weak anatomy so it reads as one living organism.

Flat pure #ff00ff magenta background, isolated full-body 2D game creature source art, cohesive underwater threat called Brine Crown, stationary abyssal vent organism forming one rooted toxic basal mat, inspired by coralline hydrothermal flora without starfish or cephalopod anatomy, central jagged crown cup with dark toxic throat, five to seven short thick radial lobes fused flat into the basal mat, opaque brine blisters glowing sickly green amber, mineral spines around the rim, root-like tendrils, gloomy charcoal deep teal bone oxidized copper palette, crisp readable silhouette, crop-friendly hinge zones, no environment, no shadows, no haze, no duplicate creatures, no detached limbs, no text

Subagent cohesion failures to fix:
- Curled radial lobes read strongly as cephalopod arms, which the contract rejects.
- Dense mineral and coral detail makes the basal mat, crown, blister bank, and spines feel kitbashed.

Subagent animation risk to solve:
- Phase/contact evidence is nearly static; spine raise, blister swelling, and brine-lane growth need heavy deformation or repaint.

Existing regenerate-if-observed risks:
- Curled radial lobes read strongly as cephalopod arms, which the contract rejects.
- Dense mineral and coral detail makes the basal mat, crown, blister bank, and spines feel kitbashed.
- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- human source approval missing
- human source cohesion approval is still missing

Required biological read:
- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

Crop-safe articulatable parts:
- basal mat torso
- central crown cup head
- dark throat pore
- front radial frond
- left radial frond
- right radial frond
- rear radial fronds
- brine blister bank
- spine halo cluster
- root tendril skirt

Prompt risks to avoid:
- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.
- Reject cephalopod tentacles, curled octopus arms, eyes, free-swimming anatomy, or loose starfish limbs.

Hard acceptance bar:
- One continuous organism with connected anatomy and consistent lighting, palette, scale, and material language.
- Strong readable silhouette at small sprite scale.
- Obvious attack lane and neutral riggable pose.
- Clean magenta key, no white/black baked background, no particles, no prey, no text.
- Every later-cropped part must have a visible root, hinge, socket, membrane, stalk, or soft tissue transition.

```
