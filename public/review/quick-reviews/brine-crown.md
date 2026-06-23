# Quick Review: brine-crown

Generated: `2026-06-17T01:39:12.942Z`
Sandbox kind: `articulated`
Sandbox URL: http://127.0.0.1:5177/?sandbox=brine-crown
Overall status: `passed`

## Artifacts

- Visual report: `tools/scratch/quick-review-brine-crown-visual-report.json`
- Visual screenshots: `tools/scratch/quick-review-brine-crown-visuals`
- Acceptance audit: `public/review/content-acceptance-audit.md`
- Exemplar pack: `public/review/exemplar-packs/brine-crown.md`

## Commands

### OK: npm run sandbox:index

- Exit code: `0`
- Duration: `124ms`

### OK: npm run sandbox:preview -- --id brine-crown --json

- Exit code: `0`
- Duration: `111ms`

### OK: npm run sandbox:visual -- --ids brine-crown --report tools/scratch/quick-review-brine-crown-visual-report.json --out-dir tools/scratch/quick-review-brine-crown-visuals --states idle,lunge,stunned

- Exit code: `0`
- Duration: `5153ms`

### OK: npm run review:articulated:quick

- Exit code: `0`
- Duration: `80884ms`

### OK: npm run source:gallery

- Exit code: `0`
- Duration: `1845ms`

### OK: npm run content:acceptance-audit -- --id brine-crown

- Exit code: `0`
- Duration: `146ms`

### OK: npm run content:exemplar-pack -- --id brine-crown

- Exit code: `0`
- Duration: `143ms`

## Manual Follow-Up

```bash
npm run sandbox:preview -- --id brine-crown --serve --open --visual
```

```bash
npm run content:exemplar-pack -- --id brine-crown
```

```bash
npm run content:acceptance-audit -- --id brine-crown
```

