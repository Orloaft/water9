# Exemplar Review Pack: Brine Crown

Generated: `2026-06-17T01:59:35.457Z`
Runtime id: `brine-crown`
Source candidate: `brine-crown`
Sandbox URL: http://127.0.0.1:5177/?sandbox=brine-crown

## Verdict

- Source approved: `false`
- Threat accepted: `false`
- Ready for strict gate: `false`

## Blockers

- source candidate brine-crown is not human-approved
- brine-crown is not accepted by the strict threat gate

## Commands

```bash
npm run sandbox:preview -- --id brine-crown --serve --open --visual
npm run sandbox:visual -- --ids brine-crown --states idle,lunge,stunned --report tools/scratch/sandbox-visuals-brine-crown-report.json --out-dir tools/scratch/sandbox-visuals-brine-crown
npm run review:articulated:quick
npm run source:gallery
npm run content:acceptance-audit -- --id brine-crown
```

### Source Approval Dry Run

```bash
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> \
  --note '<specific source approval note>' \
  --visual-check whole-creature-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read \
  --source-reviewed --dry-run
```

### Threat Acceptance Dry Run

```bash
npm run content:accept -- --id brine-crown --status accepted --reviewed-by <human-reviewer> \
  --source-candidate brine-crown \
  --note '<specific rig approval note>' \
  --visual-check single-source-cohesion --visual-check readable-silhouette --visual-check anatomy-cohesion --visual-check production-visual-cohesion --visual-check socket-seams --visual-check motion-stability --visual-check sandbox-behavior \
  --score single-source-cohesion=<4-5> --score readable-silhouette=<4-5> --score anatomy-cohesion=<4-5> --score production-visual-cohesion=<4-5> --score socket-seams=<4-5> --score motion-stability=<4-5> --score sandbox-behavior=<4-5> \
  --source-reviewed --contact-reviewed --phase-reviewed --sandbox-reviewed --dry-run
```

## Source Checklist

- [ ] whole-creature-cohesion
- [ ] readable-silhouette
- [ ] no-collage-artifacts
- [ ] non-placeholder-art-direction
- [ ] crop-safe-anatomy
- [ ] clean-magenta-key
- [ ] gameplay-read

## Threat Checklist

- [ ] single-source-cohesion
- [ ] readable-silhouette
- [ ] anatomy-cohesion
- [ ] production-visual-cohesion
- [ ] socket-seams
- [ ] motion-stability
- [ ] sandbox-behavior

## Threat Evidence

- [ ] whole-source
- [ ] contact-sheet
- [ ] phase-strip
- [ ] sandbox-preview

## Review Files

- `whole source`: `public/assets/generated/fauna-brine-crown-whole-source.png` (ok)
- `source thumbnail`: `public/review/source-candidates/thumbs/brine-crown-source-thumb.png` (ok)
- `key preview`: `public/review/source-candidates/key-previews/brine-crown-key-preview.png` (ok)
- `contact sheet`: `public/review/articulated/brine-crown-contact.png` (ok)
- `phase strip`: `public/review/articulated/brine-crown-phase.png` (ok)
- `source parity overlay`: `public/review/articulated/source-parity/brine-crown-source-parity.png` (ok)

## Sandbox States

### idle

- Present: `true`
- Screenshot: `/mnt/nxt-dev/water9/tools/scratch/sandbox-visuals-focused/brine-crown.png`
- Failures: `0`

### lunge

- Present: `true`
- Screenshot: `/mnt/nxt-dev/water9/tools/scratch/sandbox-visuals-focused/brine-crown-lunge.png`
- Failures: `0`

### stunned

- Present: `true`
- Screenshot: `/mnt/nxt-dev/water9/tools/scratch/sandbox-visuals-focused/brine-crown-stunned.png`
- Failures: `0`

## Human Review Standard

- Reject the source if it only works when explained verbally.
- Reject the rig if the assembled creature looks like unrelated parts moving together.
- Reject motion that jitters, pops, flips anatomy, or hides the gameplay read.
- Accept only when the sandbox view reads as production-intent art at game scale.

