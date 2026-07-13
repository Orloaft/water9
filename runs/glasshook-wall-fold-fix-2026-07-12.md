# Glasshook wall-fold fix — 2026-07-12

## Goal

Reproduce and fix the Biome 1 Abyssal Glasshook Skulk articulated body folding into itself while chasing the player into/along a wall, preserving its intended connected silhouette and behavior.

## Checklist

- [x] BLOCKED `glasshook-wall-fold-fix-2026-07-12` — code/regression completed in `cef364d` with report correction `0a8c44f`. Root cause: Glasshook incorrectly used history-ripple turning instead of anchored chain placement. Right-wall, left-wall, and corner regression PASS with zero reversed bends, overlap, and joint error. Build, terrain-collision smoke, focused regression, and diff check PASS. Actual `#game canvas` PNG/contact-sheet/grayscale proof blocked by headless WebGL screenshot hangs/page closure. Spawn proof: accepted; run id `047fa226-9732-4f11-b95a-23bb7c7461ee`; child session `agent:codex-dev:subagent:b1846191-c5f8-4295-a857-cb9c9ecca3e0`; resolved model `openai/gpt-5.6-terra`; provider `openai`; modelApplied `true`. Session-store proof: exactly one matching session; `openai/gpt-5.6-terra`; thinkingLevel `high`. REPORTED 2026-07-12.
- [ ] Manager visually inspects actual `#game canvas` before/after wall-chase proof and rejects any remaining self-overlap/fold. BLOCKED on working runtime canvas capture.
  - 2026-07-13 heartbeat: stale-run continuation decision requested from Alex; no worker dispatched.
- [x] Completion/blocker reported to Alex — REPORTED 2026-07-12.

2026-07-13 heartbeat recovery: retried the real Biome 1 capture on isolated port 5199 with `WATER9_GLASSHOOK_WALL_CAPTURE=1`; Chromium again closed during `Page.captureScreenshot` and the run timed out. The OpenClaw browser path is independently blocked by a pending gateway scope/pairing approval. The failed run's partial JSON was discarded and the previously passing committed regression JSON was restored unchanged. Visual acceptance remains blocked; no source change or redispatch was made.

## Acceptance rule

Accept only if the bug is reproduced before the change and absent afterward during sustained chase against representative vertical and/or corner wall contact in normal Biome 1 gameplay; the Glasshook retains its recognizable connected head/thorax/abdomen/tail silhouette without segments folding through or reversing over one another; grayscale remains readable; focused metrics/regression evidence and build/typecheck/playtest checks pass; default behavior is not broadly degraded; the change is committed safely with unrelated dirt preserved; and the manager visually approves the actual runtime canvas evidence.
