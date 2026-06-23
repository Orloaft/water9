# Water 9 Source Workstation

Generated: `2026-06-18T17:06:58.063Z`

## Target

- Candidate: `brine-crown` Brine Crown
- Status: `needs-review`
- Doctor status: `source-present`
- Queue rank: `none`
- Expected output: `public/assets/generated/fauna-brine-crown-whole-source.png`
- Prompt file: `none`
- Capture UI: `http://127.0.0.1:5188/?id=brine-crown`
- Manual capture required: `false`
- Missing artifact attempts: `0/5`

## Manual Capture Escalation

- Required: `false`
- No more inline retries: `false`
- Reason: Manual capture escalation starts at 5 missing-artifact attempts.
- Primary command: `npm run source:inbox-capture -- --id brine-crown --open`
- Expected inbox file: `tools/source-inbox/brine-crown.png`

### Recovery Commands

```bash
npm run source:recover-inline -- --id brine-crown --image <saved-image-path> --copy --validate
npm run source:recover-inline -- --id brine-crown --data-url-stdin --copy --validate
npm run source:recover-inline -- --id brine-crown --stdin-base64 --stdin-filename brine-crown.png --copy --validate
```

### Capture Validation Commands

```bash
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:ingest-current -- --id brine-crown --dry-run
npm run source:ingest-current -- --id brine-crown --apply
```

## Inbox Targets

- tools/source-inbox/brine-crown.png
- tools/source-inbox/fauna-brine-crown-whole-source.png

## Commands

```bash
npm run source:next-prompt -- --id brine-crown
npm run source:inbox-capture -- --id brine-crown --open
npm run source:inbox-capture
npm run source:recover-inline -- --id brine-crown --image <saved-image-path> --copy --validate
npm run source:recover-inline -- --id brine-crown --data-url-stdin --copy --validate
npm run source:recover-inline -- --id brine-crown --stdin-base64 --stdin-filename brine-crown.png --copy --validate
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:ingest-current -- --id brine-crown --dry-run
npm run source:ingest-current -- --id brine-crown --apply
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:image-check -- --id brine-crown
npm run source:preview-check
npm run sandbox:preview -- --id brine-crown --kind source --serve --open --visual
npm run source:review-dossier
npm run source:review-dossier-check
npm run source:quick-review-all -- --no-build
npm run source:check
npm run source:gallery
```

## Operator Sequence

- Open the current prompt with npm run source:next-prompt -- --id brine-crown.
- Generate one cohesive whole-source creature on pure #ff00ff and save it as tools/source-inbox/brine-crown.png.
- If the image is only available inline, use source:recover-inline instead of attempting more unrecoverable generations.
- Run npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown; do not ingest until it passes.
- Run npm run source:ingest-current -- --id brine-crown --dry-run, then apply with --apply if the dry run is clean.
- Run npm run source:image-check -- --id brine-crown, npm run source:preview-check, and the source sandbox preview before human review.
- Reject outputs with weak silhouette, detached parts, non-magenta background, crop-hostile anatomy, or non-riggable pose.

## Quality Gate Commands

```bash
npm run source:inbox-check -- --dir tools/source-inbox --strict --ids brine-crown
npm run source:ingest-current -- --id brine-crown --dry-run
npm run source:image-check -- --id brine-crown
npm run source:preview-check
npm run sandbox:preview -- --id brine-crown --kind source --serve --open --visual
npm run source:review-dossier && npm run source:review-dossier-check
npm run source:check
npm run content:status -- --json
```

## Page Utilities

```bash
npm run source:workstation
npm run source:workstation-check
npm run source:workstation:preview
npm run source:ingest-current -- --id brine-crown --dry-run
npm run source:ingest-current -- --id brine-crown --apply
```

## Required Read

- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

## Reject If

- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.
- Reject cephalopod tentacles, curled octopus arms, eyes, free-swimming anatomy, or loose starfish limbs.

## Review Checklist

- Short radial lobes are fused flat into one basal mat and do not read as tentacles, octopus arms, or free limbs.
- Central crown cup, toxic throat, brine blisters, roots, and mineral spines share one rooted vent-organism anatomy.
- The creature remains stationary and low to the seafloor, not a free-swimming cephalopod or decorative starfish.

## Articulatable Parts

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

## Generation Prompt

```text
Flat pure #ff00ff magenta background, isolated full-body 2D game creature source art, cohesive underwater threat called Brine Crown, stationary abyssal vent organism forming one rooted toxic basal mat, inspired by coralline hydrothermal flora without starfish or cephalopod anatomy, central jagged crown cup with dark toxic throat, five to seven short thick radial lobes fused flat into the basal mat, opaque brine blisters glowing sickly green amber, mineral spines around the rim, root-like tendrils, gloomy charcoal deep teal bone oxidized copper palette, crisp readable silhouette, crop-friendly hinge zones, no environment, no shadows, no haze, no duplicate creatures, no detached limbs, no text
```

## Recent Rejections

- none
