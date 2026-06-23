# Water 9 Source Cohesion Batch Decision Template

Generated: `2026-06-18T17:07:20.600Z`

Water 9 Source Cohesion Batch Decisions

This file is a structured handoff for human source/cohesion review. This page does not approve content automatically. It does not approve anything by itself. A reviewer must inspect each source, key preview, sandbox preview, and plan preview before copying decisions into approval commands.

## Workflow

1. Open `public/review/source-candidates/source-cohesion-decision-template.html`.
2. Review each candidate's source, key preview, sandbox preview, and plan preview.
3. Copy `decisionFileTemplate` from the JSON output into a working review file.
4. Replace `<human-reviewer>`, set each decision to `approved` or `rejected`, and fill every score/note field.
5. Use each generated source approval command only after the notes are specific and human-authored.

## Commands

```bash
npm run source:cohesion-decisions && npm run source:cohesion-decisions-check
npm run source:cohesion-decisions-apply
npm run source:cohesion-review && npm run source:cohesion-review-check
```

## Required Checks

- `whole-creature-cohesion`
- `part-continuity-cohesion`
- `readable-silhouette`
- `no-collage-artifacts`
- `non-placeholder-art-direction`
- `crop-safe-anatomy`
- `clean-magenta-key`
- `gameplay-read`
- `neutral-riggable-pose`
- `visible-attack-lane`

## Evidence Preview

The HTML handoff embeds source, magenta key, sandbox, and plan-preview images inline for each candidate. Use the markdown links and generated review pages when working outside the browser.

## Decision JSON Starter

Each HTML candidate card includes a copyable JSON starter for that one decision. Paste completed human-authored decisions into a working `water9/source-cohesion-decisions@1` file before running the dry-run/apply command.

## Summary

- Candidates: 20
- Ready for cohesion review: 20
- Human cohesion approved: 0
- Prototype locked: 20

## Decisions

| Candidate | Species | Default status | Ready | Approved | Blockers |
| --- | --- | --- | ---: | ---: | --- |
| brine-crown | Brine Crown | needs-human-decision | yes | no | human source cohesion approval is still missing |
| glass-sponge-sentinel | Glass Sponge Sentinel | needs-human-decision | yes | no | human source cohesion approval is still missing |
| black-coral-gate | Black Coral Gate | needs-human-decision | yes | no | human source cohesion approval is still missing |
| reliquary-siphonophore | Reliquary Siphonophore | needs-human-decision | yes | no | human source cohesion approval is still missing |
| hadal-trencher-isopod | Hadal Trencher Isopod | needs-human-decision | yes | no | human source cohesion approval is still missing |
| vent-claw-yeti | Vent-Claw Yeti | needs-human-decision | yes | no | human source cohesion approval is still missing |
| abyssal-lantern-mantis | Abyssal Lantern Mantis | needs-human-decision | yes | no | human source cohesion approval is still missing |
| trench-harvest-sea-spider | Trench Harvest Sea Spider | needs-human-decision | yes | no | human source cohesion approval is still missing |
| coronate-sting-crown | Coronate Sting Crown | needs-human-decision | yes | no | human source cohesion approval is still missing |
| chain-vein-siphonophore | Chain Vein Siphonophore | needs-human-decision | yes | no | human source cohesion approval is still missing |
| vampire-cloak-squid | Vampire Cloak Squid | needs-human-decision | yes | no | human source cohesion approval is still missing |
| predatory-tunicate-maw | Predatory Tunicate Maw | needs-human-decision | yes | no | human source cohesion approval is still missing |
| razor-kelp-harp | Razor Kelp Harp | needs-human-decision | yes | no | human source cohesion approval is still missing |
| lantern-anemone-pit | Lantern Anemone Pit | needs-human-decision | yes | no | human source cohesion approval is still missing |
| brine-mycelium-shelf | Brine Mycelium Shelf | needs-human-decision | yes | no | human source cohesion approval is still missing |
| thorn-fan-coralline | Thorn Fan Coralline | needs-human-decision | yes | no | human source cohesion approval is still missing |
| gulper-eel-maw | Gulper Eel Maw | needs-human-decision | yes | no | human source cohesion approval is still missing |
| saber-viperfish | Saber Viperfish | needs-human-decision | yes | no | human source cohesion approval is still missing |
| tripod-stilt-stalker | Tripod Stilt Stalker | needs-human-decision | yes | no | human source cohesion approval is still missing |
| reef-lion-moray | Reef Lion Moray | needs-human-decision | yes | no | human source cohesion approval is still missing |
