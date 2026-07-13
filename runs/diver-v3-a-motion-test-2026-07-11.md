# Diver V3 A game-ready motion test

## Goal

Curate the smallest game-ready animated vertical slice from the approved Diver V3 Concept A character bible: 6–8 authored frames spanning hover, swim, and scanner, proven as transparent runtime assets in normal Water9 gameplay.

## Routing

- PREPARED label: `water9-diver-v3-a-motion-test-2026-07-11`
- Tier: complex
- Model: `openai/gpt-5.6-sol`
- Thinking: `high`
- Rationale: identity-preserving visual synthesis, animation continuity, bitmap cleanup, runtime integration, and authoritative multi-depth canvas acceptance make failure expensive and verification ambiguous.

## Checklist

- [x] DISPATCHED — run `e49c3f1d-35d6-46e9-a9e5-1a5a5a6e9f0d`; session `agent:codex-dev:subagent:e41a50e2-4f45-423b-a4ea-501e2c6f141d`; spawn accepted with resolved model `openai/gpt-5.6-sol`, provider `openai`, `modelApplied: true`; session store uniquely confirms `openai/gpt-5.6-sol` and thinking `high`
- [x] 7 authored transparent motion-test frames and atlas/manifest produced; manifest 54/54 OK
- [x] Hover, swim, and scanner reads preserve the approved A identity and connected anatomy
- [x] Assets loaded by live runtime; exact fetched/local scanner PNG hash matched
- [x] `#game canvas` captures from surface, mid, and deep bands plus grayscale/readability board
- [x] Build and focused smoke pass; baseline TypeScript errors remain unrelated
- [x] Manager visually inspected runtime captures against the approved benchmark — motion-test gate accepted; full production not accepted due two-frame cadence, material shimmer/registration breathing, scanner overlap, mirrored lighting
- [x] Alex receives review images and a clear accept/revise gate — REPORTED 2026-07-11

## Expected artifacts

- `runs/diver-v3-a-motion-test-2026-07-11/report.md`
- `runs/diver-v3-a-motion-test-2026-07-11/artifacts/` containing source frames, runtime atlas, metadata/lineage/hash manifest, review sheets, and actual-canvas captures
- Explicit list of runtime source/assets changed; a commit only if safe

## Acceptance rule

Not accepted from metrics, contact sheets, or worker self-verdict alone. The manager must inspect actual `#game canvas` captures during normal play at representative surface/mid/deep bands and grayscale, confirm the approved A identity survives gameplay scale, and confirm the live runtime loads the generated bitmap assets. This is a motion-test gate, not authorization for the full replacement package.
