# Rigging Focus Pack: Glass Sponge Sentinel (glass-sponge-sentinel)

Generated: `2026-06-18T17:06:58.869Z`
Stage: `human-source-review-needed`
Source: `public/assets/generated/fauna-glass-sponge-sentinel-whole-source.png`
Runtime creature: `glass-sponge-sentinel`

## Blockers

- source candidate needs human approval
- runtime creature needs human rig acceptance

## Source Review

```bash
npm run source:gallery
```

```bash
npm run sandbox:preview -- --id glass-sponge-sentinel --kind source --best --serve --open --visual
```

```bash
npm run source:accept -- --id glass-sponge-sentinel --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane \
  --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> \
  --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' \
  --source-reviewed --dry-run
```

## Articulation Plan

```bash
npm run articulated:prepare-plan -- --id glass-sponge-sentinel --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --preview public/review/articulated/glass-sponge-sentinel-plan-preview.png
npm run articulated:plan-preview -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --out public/review/articulated/glass-sponge-sentinel-plan-preview.png
npm run articulated:plan-check -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json
npm run articulated:extract-plan -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json --dry-run
npm run articulated:extract-plan -- --plan tools/scratch/glass-sponge-sentinel-starter-plan.json
```

## Review And Acceptance

```bash
npm run articulated:check
npm run review:articulated:quick
npm run sandbox:preview -- --id glass-sponge-sentinel --with diver --serve --open --visual
npm run sandbox:visual -- --ids glass-sponge-sentinel --states idle,lunge,stunned --with diver
npm run content:quick-review -- --id glass-sponge-sentinel
npm run content:acceptance-audit -- --id glass-sponge-sentinel
npm run content:accept -- --id glass-sponge-sentinel --status accepted --reviewed-by <human-reviewer> \
  --source-candidate glass-sponge-sentinel \
  --note '<specific rig approval note>' \
  --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior \
  --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> \
  --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' \
  --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run
```

## Required Human Checks

Source:
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

Threat:
- single-source-cohesion
- readable-silhouette
- anatomy-cohesion
- production-visual-cohesion
- socket-seams
- motion-stability
- sandbox-behavior

Threat visual scores: every threat check must be scored `4` or `5`; a score of `3` remains prototype-only.

