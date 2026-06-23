# Unmapped Prototype Packet: Cavitation Boxer (cavitation-boxer)

Status: `prototype`

This prototype is visible in sandbox tooling, but it cannot count toward the strict 20-threat gate until it is recreated or linked through an approved source candidate with magenta-background source art.

## Blockers

- prototype is not mapped to a source candidate
- strict gate requires approved magenta source art before rig acceptance

## Current Preview

- Sandbox URL: `/?sandbox=cavitation-boxer`

```bash
npm run sandbox:preview -- --id cavitation-boxer --with diver --serve --open --visual
npm run sandbox:visual -- --ids cavitation-boxer --states idle,lunge,stunned --with diver
npm run content:acceptance-audit -- --id cavitation-boxer
```

## Required Migration

1. Create or select a source-candidate id for this design.
2. Generate/capture/recover a cohesive magenta-background whole-source image.
3. Ingest it through the source inbox pipeline.
4. Pass source review with a human reviewer.
5. Rebuild/confirm the articulated rig from that approved source.
6. Run paired diver sandbox visual checks for idle, lunge, and stunned.
7. Run `content:accept` only after source, contact sheet, phase strip, and sandbox behavior are reviewed.

## Final Gate

```bash
npm run content:gate
```
