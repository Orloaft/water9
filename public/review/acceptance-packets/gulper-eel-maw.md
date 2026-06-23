# Acceptance Packet: Gulper Eel Maw (gulper-eel-maw)

Stage: `prototype-needs-approved-source`

This packet is the current production path for moving this candidate toward the strict 20-threat gate. It does not grant approval by itself.

## Human Approval Boundary

Source approval commands in this packet are dry-run templates. A real source approval must be generated from the source approval runway after a human inspects the source, magenta key preview, sandbox source preview, visual board, and articulation plan preview.

## Current State

- Source image: `true`
- Source approved: `false`
- Runtime registered: `true`
- Runtime id: `gulper-eel-maw`
- Threat accepted: `false`
- Source review packet: `public/review/source-candidates/source-review-packets/gulper-eel-maw.md`
- Rigging pack: `rigging-packs/gulper-eel-maw.md`
- Sandbox URL: `/?sandbox=gulper-eel-maw`

## Blockers

- strict human source approval is missing
- strict human rig acceptance is missing

## Next Action

```bash
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

## Source Path

```bash
npm run source:gallery
npm run source:image-check
npm run source:preview-check
npm run source:review-dossier
npm run source:approval-runway && npm run source:approval-runway-check && npm run source:approval-runway:preview
npm run source:visual-board && npm run source:visual-board-check
npm run source:accept -- --id gulper-eel-maw --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
```

## Rig And Acceptance Path

```bash
npm run content:rigging-pack -- --id gulper-eel-maw
npm run articulated:prepare-plan -- --id gulper-eel-maw --plan tools/scratch/gulper-eel-maw-starter-plan.json --preview public/review/articulated/gulper-eel-maw-plan-preview.png
npm run sandbox:preview -- --id gulper-eel-maw --with diver --serve --open --visual
npm run sandbox:visual -- --ids gulper-eel-maw --states idle,lunge,stunned --with diver
npm run review:articulated:quick && npm run review:check
npm run content:accept -- --id gulper-eel-maw --status accepted --source-candidate gulper-eel-maw --reviewed-by <human-reviewer> --note '<specific rig approval note>' --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> --visual-note single-source-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note anatomy-cohesion='<specific rationale>' --visual-note production-visual-cohesion='<specific rationale>' --visual-note socket-seams='<specific rationale>' --visual-note motion-stability='<specific rationale>' --visual-note sandbox-behavior='<specific rationale>' --source-reviewed --contact-reviewed --phase-reviewed --parity-reviewed --sandbox-reviewed --dry-run
```

## Final Gate

```bash
npm run content:gate
```
