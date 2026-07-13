# Swimming Backgrounds Full Implementation — 2026-07-13

## Goal

Implement the approved swimming-backgrounds proposal end to end on `swimming-backgrounds`, preserving B1 surface as the internal benchmark while improving depth-band continuity, deep readability, biome composition, swimming/camera feel, interaction clarity, and sustained B4 cadence.

## Product decisions authorized by approval

- Preserve dark/horror atmosphere, but protect immediate route, diver, threat, and interaction readability.
- Use B1 surface as the internal art-direction benchmark.
- Make B4 monumental through negative-space axes and controlled silhouettes, not frequent screen-filling structures.
- Keep the legacy diver as default during the feel pass; evaluate V3 separately and do not promote it implicitly.
- Permit bounded velocity-weighted camera lead only if aiming, jitter, and motion-comfort/accessibility gates pass.
- Treat sustained B4 presentation cadence as a release gate.

## Checklist

- [x] PREPARED `water9-swimming-backgrounds-slice1-20260713` — routing: **complex**, `openai/gpt-5.6-sol`, thinking `high`; rationale: cross-cutting lighting/render transition work changes multiple visual systems, demands normal-play cutoff captures and manager visual judgment, and must preserve scarce B4 performance headroom. Runtime gate: configured command `/home/orlovboros/.npm-global/bin/codex` matched contract; `codex-cli 0.144.1` satisfies minimum `0.144.0`.
- [x] DISPATCHED — run `8655a2bd-ffba-4a3f-82af-2810d2492d94`; child `agent:codex-dev:subagent:84a826d0-d435-43b7-969b-08f1ea03b4a2`. Spawn proof: accepted, resolved model `openai/gpt-5.6-sol`, provider `openai`, model applied. Session-store proof: exactly one matching child, `openai/gpt-5.6-sol`, thinking `high`.
- [x] Slice 1 — implemented generalized depth-band interpolation, smooth lamp falloff, diver separation, protected play corridor, deterministic cutoff matrix, and sustained B4 measurement. Product/report/evidence are committed together; the report honestly records the remaining B4 11.04-point darkness-pair delta, 75% subject-edge pass rate, absent interaction-text sample, and independent-rAF cadence miss.
- [ ] Slice 2 — per-biome composition/landmark grammar, occupied-area/crop/scale budgets, seed-sticky landmarks, protected corridors, and blind-recognition evidence. Expected: product commit, report, seeded normal-play capture matrix, biome-recognition result.
- [ ] Slice 3 — unified swimming feel curve, animation intent, bounded camera lead/spring, accessibility/no-lead path, aiming/collision determinism, and eight-direction evidence. Expected: product commit, report, measurements and normal-play captures; no implicit diver-family switch.
- [ ] Slice 4 — interaction-aware local dimming, threat/prompt separation, landmark exclusions, trace-backed B4 optimization, seeded traversal matrix, accessibility review, and final integrated regression. Expected: product commit(s), final report, performance trace only if timing divergence persists, build/smoke results, and representative runtime proof.
- [ ] Manager inspects actual normal-play `#game canvas` proof in color and grayscale across surface/mid/deep and cutoff pairs, verifies runtime bitmap use if any assets are introduced, verifies commits/branch/status, and reports the integrated result. Worker metrics and self-verdicts are not visual acceptance.

## Acceptance rule

Accept only after all four slices are implemented and integrated, the proposal's visual/navigation, game-feel, and performance gates are exercised honestly, actual normal-play `#game canvas` evidence is manager-inspected across representative depth bands and cutoff pairs in color and grayscale, build and relevant smokes pass, any remaining miss is explicitly reported rather than disguised, and the branch contains only scoped explicit-path commits with unrelated pre-existing dirt preserved.
