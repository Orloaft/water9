# Water 9 Next Quality Gate Review

Generated: `2026-06-18T17:21:10.407Z`

This focused packet does not approve source art or accept a threat. It packages the next actionable strict-gate row from the quality gate matrix.

## Target

- id: `brine-crown`
- species: Brine Crown
- next gate: `human-source-approval`
- source evidence complete: `true`
- runtime evidence complete: `true`
- source approved: `false`
- threat accepted: `false`
- strict gate eligible: `false`

## Evidence

| Evidence | Link |
| --- | --- |
| source art | /assets/generated/fauna-brine-crown-whole-source.png |
| magenta key preview | /review/source-candidates/key-previews/brine-crown-key-preview.png |
| source sandbox preview | /review/source-candidates/quick-reviews/brine-crown-source-preview.png |
| articulation plan preview | /review/articulated/brine-crown-plan-preview.png |
| source parity overlay | /review/articulated/source-parity/brine-crown-source-parity.png |
| contact sheet | /review/articulated/brine-crown-contact.png |
| phase strip | /review/articulated/brine-crown-phase.png |
| sandbox idle | /review/content-review-cockpit/evidence/brine-crown__sandbox-idle.png |
| sandbox lunge | /review/content-review-cockpit/evidence/brine-crown__sandbox-lunge.png |
| sandbox stunned | /review/content-review-cockpit/evidence/brine-crown__sandbox-stunned.png |

## Required Source Read

- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

## Contract Checks

- Short radial lobes are fused flat into one basal mat and do not read as tentacles, octopus arms, or free limbs.
- Central crown cup, toxic throat, brine blisters, roots, and mineral spines share one rooted vent-organism anatomy.
- The creature remains stationary and low to the seafloor, not a free-swimming cephalopod or decorative starfish.

## Global Visual Blockers

These records are not approvals and cannot count toward the strict gate. They are included here so the next approval packet cannot hide rejected prototype work.

- Abyssal Serpent / abyssal-serpent: rejected-needs-cohesion-regeneration (blocking)

## Commands

```bash
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run content:accept -- --id brine-crown --status accepted --reviewed-by <human-reviewer> \
  --source-candidate brine-crown \
  --note '<specific rig approval note>' \
  --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior \
  --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> \
  --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' \
  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run
npm run content:quality-gate-next
npm run content:quality-gate-next-check
npm run content:quality-gate-next:serve-smoke
```
