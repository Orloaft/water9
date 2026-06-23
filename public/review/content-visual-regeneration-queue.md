# Water 9 Visual Regeneration Queue

Generated: `2026-06-18T17:21:10.030Z`

This queue converts blocked runtime prototype feedback into source-first regeneration briefs. It does not approve art, does not create accepted threats, and does not count toward the strict 20-threat gate.

## Summary

- Queue items: `1`
- Blocking items: `1`
- Unmapped prototype items: `1`
- Counts toward strict gate: `0`

## Abyssal Serpent

- Target: `abyssal-serpent`
- Status: `rejected-needs-cohesion-regeneration`
- Prompt file: `public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt`
- Sandbox preview-only: `true`
- Target gate candidate: `false`
- Counts toward strict gate: `false`

**Failed checks**

- whole-creature-cohesion
- part-continuity-cohesion
- non-placeholder-art-direction

**Commands**

```bash
sed -n '1,260p' public/review/content-visual-regeneration-prompts/01-abyssal-serpent.txt
npm run sandbox:preview -- --id abyssal-serpent --serve --open --visual
npm run sandbox:preview -- --id abyssal-serpent --with diver --serve --open --visual
npm run content:visual-feedback && npm run content:visual-feedback-check
npm run content:visual-regeneration && npm run content:visual-regeneration-check
```

