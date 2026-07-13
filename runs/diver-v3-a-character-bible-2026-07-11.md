# Diver v3 A character bible — 2026-07-11

## Goal

Lock Alex's selected Concept A as the canonical diver direction and turn it into a production-ready visual bible and registered orthographic master before any animation frames are attempted.

## Routing

- PREPARED — label `water9-diver-v3-a-character-bible-2026-07-11`
- Tier: complex
- Model: `openai/gpt-5.6-sol`
- Thinking: `high`
- Rationale: preserving an approved generated character across refined views requires high-ambiguity visual synthesis, anatomy/material continuity, generation lineage, and subjective acceptance; mistakes here would propagate through every later animation family.

## Checklist

- [x] DISPATCHED — run `d1bc1a95-c0b4-4b5a-ba4c-ef91f3002352`; child `agent:codex-dev:subagent:b97aebc4-e1c3-491b-9c48-8357bddee77e`; spawn accepted with `resolvedModel=openai/gpt-5.6-sol`, `resolvedProvider=openai`, `modelApplied=true`; unique session-store match confirms `openai/gpt-5.6-sol` and `thinkingLevel=high`.
- [x] Refine Concept A into a canonical high-resolution neutral side-view master without drifting its identity.
- [x] Produce a coherent orthographic/turnaround registration board and explicit silhouette, proportion, material, palette, lighting, pivot, hand, and tool-socket rules.
- [x] Produce native/gameplay-scale and grayscale review boards suitable for Telegram feedback.
- [x] Document exact generation lineage and distinguish generated pixels from any manual cleanup.
- [ ] Manager visually inspects all review boards; Alex approves the locked bible before motion-test production. Manager inspection passed the side master and gameplay-scale read; front/back are accepted only as upright construction references, not exact pose-matched orthographics. Awaiting Alex.
  - 2026-07-13 heartbeat: stale-run continuation decision requested from Alex; no worker dispatched.
- [x] REPORTED 2026-07-11 — delivered the review images and concise verdict to Alex.

## Expected artifacts

- `runs/diver-v3-a-character-bible-2026-07-11/report.md`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/master/`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/character-bible.md`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/review/character-bible-board.png`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/review/orthographic-registration.png`
- `runs/diver-v3-a-character-bible-2026-07-11/artifacts/review/gameplay-scale-and-grayscale.png`
- generation lineage and SHA-256 manifest under `artifacts/`

## Acceptance rule

Concept A's identity must remain unmistakable: brass heritage pressure suit, cyan faceplate, heavy backpack mass, readable gloves/fins, painterly industrial materials, and the selected silhouette. Reject generic sci-fi drift, procedural/mechanically assembled shapes, inconsistent anatomy between views, fake orthographic consistency, noisy reduction, or disconnected tool ergonomics. Generator completion and metric checks are not acceptance. Manager and Alex must approve the actual review images before animation production. No runtime/source integration or animation frames are in scope.
