# Water9 holistic framerate pass — 2026-07-10

## Goal

Turn the verified July 10 cadence failures into one coherent performance pass: honest end-to-end telemetry, a cheaper default renderer/terrain presentation path, coalesced sonar redraws, explicit dense-B4 work budgets, and deterministic regression gates—without degrading normal-play visuals or gameplay behavior.

Baseline: HEAD `9c88409`. The adversarial retry found B4/deep Canvas p95/p99 33.4 ms, max 66.6 ms, and 158 independent-rAF frames over 33.34 ms while internal `frame.total` p95 remained 4.1 ms.

## Checklist

- [x] PARTIAL `water9-holistic-framerate-pass-2026-07-10` — commit `2aff019`; telemetry truth, retained terrain window, sonar retention/coalescing, strict gates, and B4 fixture floors/ceilings landed. Build, sonar, and articulated-budget smoke pass; startup, restore, settled loading swim, and all B4 repeats still fail. Manager inspected live surface/mid/deep/B4 color and grayscale proof; identity/readability are preserved, but cutoff-adjacent proof remains incomplete. Run id `0c14038e-2107-4a0a-9c63-31b3fba76363`, child session `agent:codex-dev:subagent:ec70fa79-57fe-4148-abff-4587bad459f8`. REPORTED 2026-07-10.
- [x] PARTIAL `water9-holistic-framerate-pass-followup-2026-07-10` — commit `72f2bae`. Startup terrain and collision-mask work are staged across frames, the 1.18 s startup stall is reduced to an 83.4 ms maximum, settled loading/post-restore swim cadence passes, and functional save/load plus build pass. Strict startup and restore cadence still fail; B4 headed/native-compositor acceptance, the complete simultaneous-action fixture, and cutoff-adjacent visual proof remain outstanding. Spawn accepted with run id `ebde298f-e790-47eb-87ce-8c8c9b3bc7c7`, child session `agent:codex-dev:subagent:c8a656d0-6a88-4732-8f17-e661a7f7868f`, resolved model `openai/gpt-5.6-sol`, provider `openai`, `modelApplied: true`. Session-store proof: exactly one matching session, `openai/gpt-5.6-sol`, `thinkingLevel: high`. Manager verified commit scope, `git show --check`, worker evidence, and a fresh `npm run build`. REPORTED 2026-07-10.

## Acceptance rule

Accept only when all of the following are true:

1. The default live runtime no longer has the verified sustained B4/deep failure: deterministic repeated B4 runs meet the repository's strict independent-rAF cadence bands, with raw p95/p99/max and counts over 20/33.34/50 ms reported. No EMA or decaying maximum may be used as the pass oracle.
2. End-to-end metrics expose and timestamp-align independent rAF with `outer.frameTotal`, `outer.render`, and relevant update/draw branches; the operator-facing HUD does not imply `frame.total` is full frame cost.
3. Default renderer choice and terrain presentation are optimized with an explicit supported Canvas fallback. Any renderer change is proven in normal runtime, not merely via a query-string test path.
4. Passive sonar, ping burst, first full-chart open, zoom-bucket changes, startup, restore, ordinary swim/mining, deep traversal, and deterministic dense B4 each have strict, phase-specific cadence assertions.
5. Dense B4 proof enforces population/visible-part floors and explicit simulation/terrain-pass ceilings while exercising sonar aggro, multi-hostile/articulated activity, mining/effects, and the highest-part sub configuration.
6. Build/typecheck and relevant functional/performance Playwright smokes pass. Dev servers use only ports 5180–5199 and no out-of-range process is killed.
7. Manager visually inspects actual `#game canvas` normal-play captures for surface, mid, deep, and B4 (including captures straddling relevant biome cutoffs) plus grayscale readability. Generated/bitmap assets, if touched, are proven loaded by live runtime and compared side-by-side with the accepted benchmark biome.
8. One explicit-path commit contains only assigned source/test changes; pre-existing unrelated dirt and prior run artifacts remain preserved.

## Session evidence

Run id: `0c14038e-2107-4a0a-9c63-31b3fba76363`  
Child session: `agent:codex-dev:subagent:ec70fa79-57fe-4148-abff-4587bad459f8`
