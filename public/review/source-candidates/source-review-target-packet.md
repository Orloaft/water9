# Water 9 Source Review Target Packet

Generated: `2026-06-18T17:21:08.495Z`

Focused packet for the current source-review sequencer target. This packet does not approve source art, does not accept threats, and does not count preview-only work toward the 20-threat gate.

## Target

- Candidate: `brine-crown` Brine Crown
- Lane: `approval-ready`
- Status: `approval-ready; human source review required`
- Health status: `replacement-applied`
- Counts toward gate: `false`
- Recommended first: `npm run source:quick-review -- --id brine-crown`

## Command Boundary

This approval lane may expose dry-run source approval commands only. Real approval requires human inspection.

## Evidence

| Item | Link |
| --- | --- |
| Sequencer | /review/source-candidates/source-review-sequencer.html |
| Source image | /assets/generated/fauna-brine-crown-whole-source.png |
| Thumbnail | /review/source-candidates/thumbs/brine-crown-source-thumb.png |
| Key preview | /review/source-candidates/key-previews/brine-crown-key-preview.png |
| Source preview | /?entity=source-brine-crown&companion=diver |
| Quick review | /review/source-candidates/quick-reviews/brine-crown.html |
| Review packet | public/review/source-candidates/source-review-packets/brine-crown.md |
| Plan preview | /review/articulated/brine-crown-plan-preview.png |
| Critic health | /review/source-candidates/source-critic-regeneration-health.html |
| Approval runway | /review/source-approval-runway.html |

## Critic Prompt

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

## Commands

```bash
npm run source:quick-review -- --id brine-crown
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run articulated:plan-check -- --plan tools/scratch/brine-crown-starter-plan.json
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

## Quality Gate Boundary

- Human-approved sources: `0`
- Accepted threats: `0`
- Approval-ready sources: `20`
- Critic regeneration required: `0`
