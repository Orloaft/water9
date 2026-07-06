# Water9 Fauna Behavior Audit - 2026-07-06

## Goal

Analyze current fauna behavior code and content after the rarity pass, then decide the smallest safe behavior-class implementation slice so non-swimming creatures stop acting like generic fish.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Manager preflight HEAD: `539c6b8`
- User symptom/example: biome 1 has an urchin that swims rapidly at the player, which is not expected for an urchin.
- Previous accepted read-only taxonomy exists at `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md` and `runs/water9-fauna-behavior-classes-2026-07-05/fauna-behavior-classification.json`.
- Previous recommended first implementation slice: `sessileAttached`, `verticalAnchored`, and `benthicWalker`.
- Current repo has pre-existing unrelated dirty fauna assets, `src/content.ts`, `src/helpers.ts`, run ledgers, and proof JSON. Workers must preserve unrelated dirt.

## Checklist

- [x] Current behavior code audit - session key: `agent:mgr-water9:subagent:5013f439-7268-4209-8af5-529faf6da2e0`, run id: `c86f37cd-408b-4673-bdc5-6bb146e54fe6`, label: `water9-fauna-behavior-code-audit-v1` - expected artifact: `runs/water9-fauna-behavior-audit-2026-07-06/code-audit.md` - verified 2026-07-06 - REPORTED 2026-07-06
- [x] Current fauna roster/classification audit - session key: `agent:mgr-water9:subagent:e2678a7f-ecc6-4a1a-8669-ed219fae5e7d`, run id: `0dfbaf29-c271-45b3-b291-386066ab4f5d`, label: `water9-fauna-behavior-roster-audit-v1` - expected artifacts: `runs/water9-fauna-behavior-audit-2026-07-06/roster-audit.md`, `runs/water9-fauna-behavior-audit-2026-07-06/fauna-behavior-delta.json` - verified 2026-07-06 - REPORTED 2026-07-06
- [x] Implementation slice/proof plan audit - session key: `agent:mgr-water9:subagent:2cb0de9b-8347-4667-8932-686b2219f116`, run id: `86d0f29c-5ed0-40da-918e-00d2d7208e5e`, label: `water9-fauna-behavior-slice-plan-v1` - expected artifact: `runs/water9-fauna-behavior-audit-2026-07-06/slice-plan.md` - verified 2026-07-06 - REPORTED 2026-07-06
- [x] Manager synthesis and next worker decision - session key: manager - expected artifact: `runs/water9-fauna-behavior-audit-2026-07-06/manager-synthesis.md` - completed 2026-07-06 - REPORTED 2026-07-06

## Acceptance Rule

Accept this audit only after disk verification shows:

- The current code audit identifies exact movement, spawn, terrain-contact, rendering/facing, scan/combat, sonar/HUD, and proof-tool touch points with file/line references.
- The roster audit accounts for every active `biomeFish` entry in today’s `src/content.ts`, compares it against the July 5 classification JSON, and flags body-plan behavior mismatches by severity.
- The slice plan recommends two or three behavior classes to implement first, explains why those cover Alex’s urchin-style mismatch, and names the exact runtime proof needed on normal-play `#game canvas`.
- No source/runtime asset edits are made by read-only lanes.
- Reports include caveats about pre-existing dirty state and whether a commit-capable integration worker is safe to launch next.
