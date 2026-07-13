# Save/load entity and sprite corruption

Goal: reproduce and fix the save/load regression where fauna and flora disappear after loading, then entities in the next biome render as green/black squares instead of their sprites.

Routing: PREPARED `save-load-entity-sprite-corruption-20260713` — complex / `openai/gpt-5.6-sol` / thinking `high`. Rationale: ambiguous cross-lifecycle failure spanning serialization, biome regeneration, Phaser scene/object teardown, texture residency, and live visual acceptance; a wrong fix can corrupt all subsequent biome rendering.

Checklist:

- [x] implementation lane — label `save-load-entity-sprite-corruption-20260713` — child `agent:codex-dev:subagent:05fd54e9-ff8b-4c07-b066-7bdfc020c580`, run `b3130878-c5fc-4bf7-86ef-c030ac5747bb` — expected artifact `/mnt/nxt-dev/water9/runs/save-load-entity-sprite-corruption-2026-07-13/report.md` — DISPATCHED; spawn proof: `status=accepted`, `resolvedModel=openai/gpt-5.6-sol`, `resolvedProvider=openai`, `modelApplied=true`; session-store proof: exactly one matching key, `openai/gpt-5.6-sol`, `thinkingLevel=high`; completed and verified at final HEAD `34109a3`; REPORTED 2026-07-13
- [x] reproduce exact sequence with state/entity/texture diagnostics and actual `#game canvas` captures before save, after load, and after entering the next biome
- [x] fix root cause without content-density reduction or unrelated refactors — implementation commit `2d49df7`
- [x] add regression coverage for entity presence and valid sprite rendering across save → load → next-biome transition
- [x] run build/typecheck and focused save/load/biome smoke checks — focused, existing save/load, biome balance, and build pass; TypeScript baseline errors and strict perf cadence caveat documented
- [x] manager visually inspect color and grayscale runtime proof — fauna/flora visible after load and in next biome; no green/black placeholder squares observed
- [x] report commit `34109a3`, remaining caveats, and completion delivered — REPORTED 2026-07-13

Acceptance rule: The same-biome post-load scene retains populated fauna/flora and renders their actual runtime sprite assets; entering the next biome also shows populated fauna/flora with valid sprite textures and no green/black placeholder squares. Evidence must include actual normal-play `#game canvas` color and grayscale captures at all three checkpoints, entity counts plus texture keys/source dimensions/residency, and browser console/page errors. Automated metrics or a worker verdict alone do not satisfy visual acceptance.

Known dirty start: unrelated tracked edits and untracked run/artifact files already exist under `runs/`; preserve them and stage only explicitly assigned paths.
