# Water9 Fauna Pathfinding Appraisal - 2026-07-06

## Goal

Appraise all current fauna movement/behavior for the reported neutral-fauna failure mode: creatures sometimes get wedged between rocks and oscillate back and forth. Produce a ranked proposal for pathfinding/avoidance improvements before implementation.

## Context

- Repo: `/mnt/nxt-dev/water9`
- Manager preflight HEAD: `166b689`
- Recent relevant work: first fauna behavior slice introduced `sessileAttached`, `verticalAnchored`, and `benthicWalker`; most active fauna still use `legacySwimmer`.
- Known user symptom: neutral fauna near rocks can appear stuck, repeatedly moving back and forth instead of choosing a clean path around terrain.
- Pre-existing unrelated dirty state includes viperfish generated assets, `src/content.ts`, `src/helpers.ts`, and several older run files. Preserve it.

## Checklist

- [x] Movement-code audit - session key: `agent:mgr-water9:subagent:680d6f0e-0a8d-46bd-9196-906b2c2fe485`, run id: `29a75088-9b82-4587-a654-661d7ba863a9`, label: `water9-fauna-pathfinding-code-audit` - expected artifact: `runs/water9-fauna-pathfinding-appraisal-2026-07-06/code-audit.md` - verified report on disk, REPORTED 2026-07-06
- [x] Runtime stuckness proof - session key: `agent:mgr-water9:subagent:1260755d-f4ee-4c32-ac4f-e277bd8a1259`, run id: `d04f51c4-0273-48d5-8e58-5874ff088de4`, label: `water9-fauna-pathfinding-runtime-proof` - expected artifact: `runs/water9-fauna-pathfinding-appraisal-2026-07-06/runtime-proof.md`, JSON metrics, normal-play `#game canvas` screenshots if feasible - verified report/metrics/screenshots on disk, REPORTED 2026-07-06
- [x] Proposal synthesis - session key: `agent:mgr-water9:subagent:5bab7c1e-f465-4018-83cc-619638047656`, run id: `4697edc5-2c72-4da8-a554-69579b588918`, label: `water9-fauna-pathfinding-proposal` - expected artifact: `runs/water9-fauna-pathfinding-appraisal-2026-07-06/proposal.md` with first implementation prompt - verified report on disk, REPORTED 2026-07-06
- [x] Optional disk synthesis helper - session key: `agent:mgr-water9:subagent:8b3bc434-2be5-4644-8748-7a3c7e19d852`, run id: `616b515d-fe75-4408-a451-64cd58a93db6`, label: `water9-fauna-pathfinding-synthesis-after-lanes` - expected artifact: `runs/water9-fauna-pathfinding-appraisal-2026-07-06/manager-synthesis-draft.md` or `synthesis-pending.md` - wrote pending note before lane reports landed, REPORTED 2026-07-06
- [x] Manager synthesis and Alex report - session key: manager - expected artifact: `runs/water9-fauna-pathfinding-appraisal-2026-07-06/manager-synthesis.md`, concise recommendation and next step - REPORTED 2026-07-06

## Acceptance Rule

Accept the appraisal only after disk verification shows:

- The proposal identifies the likely stuck/oscillation causes with file/line evidence.
- The proposal distinguishes legacy swimmer issues from the new anchored/benthic classes.
- Runtime proof either reproduces the neutral-fauna oscillation or explains exactly why it could not be reproduced and supplies a concrete instrumentation plan.
- The recommended first slice is bounded, low-risk, and includes verification that uses normal-play `#game canvas` captures plus metrics.
- No implementation commit is made during this appraisal unless Alex separately asks for it.
