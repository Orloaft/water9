# Water9 Fauna Local Pathfinding First Slice - 2026-07-06

## Goal

Implement the recommended local-navigation slice for legacy swimming fauna so neutral swimmers are less likely to wedge between rocks or jitter back and forth.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Starting HEAD: `f231778`
- Appraisal committed as `f231778` in `runs/water9-fauna-pathfinding-appraisal-2026-07-06/`
- Existing unrelated dirty state includes viperfish generated assets, older run ledgers, `src/content.ts`, `src/helpers.ts`, and older proof files. Preserve it.
- Port range for Vite/proof: `5180-5199`

## Checklist

- [x] Implementation worker - session key: `agent:mgr-water9:subagent:08938579-ee6a-4786-96cd-3aa28b541844`, run id: `312bd034-9623-493b-923e-990936049608`, label: `water9-fauna-local-pathfinding-first-slice` - expected artifacts: commit hash, implementation report under `runs/water9-fauna-pathfinding-appraisal-2026-07-06/implementation-proof/`, JSON metrics, color/grayscale `#game canvas` captures, contact sheet - committed `3fdc468`, proof inspected, REPORTED 2026-07-06
- [x] Manager verification - session key: manager - expected artifacts: inspect worker report/proof images, tick ledger, report synthesized result to Alex - local `tsc`, build, and fauna pathfinding smoke passed; proof contact sheet inspected, REPORTED 2026-07-06

## Acceptance Rule

Accept only after:

- The worker commits a bounded local-navigation slice for legacy swimmers.
- TypeScript and build pass.
- Existing fish facing and aggro cue smokes pass.
- New fauna pathfinding smoke passes and writes JSON metrics.
- Proof includes normal-play live `#game canvas` captures across B1-B4, color and grayscale, with neutral swimmers near terrain, one hostile swimmer near terrain, and one anchored/benthic regression sample.
- Manager inspects proof images before reporting accepted.
