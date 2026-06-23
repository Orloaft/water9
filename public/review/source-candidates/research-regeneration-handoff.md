# Water 9 Research Regeneration Handoff

Generated: `2026-06-18T18:32:29.396Z`

Focused handoff from subagent research findings into the current source-regeneration workspace. This page is read-only: it does not approve source art, does not accept threats, and does not count preview-only work toward the strict 20-threat gate.

## Target

- Candidate: `brine-crown` Brine Crown
- Lane: `sessile-ambush-hazards`
- Regeneration lane: `approval-ready`
- Health status: `replacement-applied`
- Replacement matches current source: `true`
- Distinct replacement ready: `false`
- Audit file: `public/review/source-candidates/research-subagent-audits/02-sessile-ambush-hazards.json`
- Dispatch packet: `public/review/source-candidates/research-dispatch-packets/brine-crown.md`
- Workspace page: `/review/source-candidates/source-regeneration-workspace.html`

## Subagent Finding

### Strengths

- Strong rooted radial hazard concept with central toxic throat, basal mat, blisters, and spine halo supporting a clear stationary area-control read.
- Articulatable part list separates crown, fronds, blister bank, spines, and root skirt well for swelling and spine-raise phases.

### Source Generation Risks

- Mixed anchors of coral, starfish, vent chimneys, and mats may generate a collage instead of one organism.
- Perfect radial symmetry could flatten the sprite into an emblem and reduce readable hinge zones for fronds.
- Corrosive brine cues risk becoming baked puddles, clouds, or environmental floor effects rather than riggable anatomy.

### Suggested Prompt Patches

Biological anchors:
- Emphasize one mat-grown radial animal with vent-mineralized crown cup and blister sacs fused into the same basal tissue.

Required read:
- All rays, spines, and blisters must visibly grow from the low basal mat with no separate vent props.

Prompt risks:
- Watch for coral reef decoration, detached chimney tubes, baked brine pools, and logo-like symmetry.

Motion phases:
- idle low mat with throat closed
- swelling blister telegraph
- spine halo lift
- brine patch VFX emitted separately

Reference search terms:
- hydrothermal vent microbial mat mineral crust
- deep sea brine pool edge
- toxic coral polyps
- starfish radial anatomy
- hydrothermal chimney black smoker

## Regeneration Prompt Alignment

- Prompt includes audit risk language: `false`
- Prompt includes suggested biological anchors: `false`
- Prompt includes suggested required read: `false`
- Prompt includes suggested prompt risks: `false`
- Prompt includes suggested motion phases: `false`

## Safe Handoff Commands

```bash
npm run research:regeneration-handoff
npm run research:regeneration-handoff-check
npm run research:regeneration-handoff:serve-smoke
npm run research:dispatch && npm run research:dispatch-check
npm run research:audits
npm run source:regeneration-workspace && npm run source:regeneration-workspace-check
npm run source:critic-regeneration-health && npm run source:critic-regeneration-health-check
npm run source:approval-runway && npm run source:approval-runway-check
npm run source:review-sequencer && npm run source:review-sequencer-check
npm run source:review-target-packet && npm run source:review-target-packet-check
npm run source:visual-board && npm run source:visual-board-check
npm run content:review-session && npm run content:review-session-check
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
```

## Command Boundary

Overwrite ingest must remain absent until the source-regeneration workspace reports `regenerate-distinct-ready`. This handoff only tells the operator how subagent research should shape the next distinct image attempt.
