You own one commit-capable Water9 visual slice: extend the gated refined Diver V3 Concept A with a coherent mining action and produce delivery-ready media showing swimming and mining.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`. Expected starting HEAD: `abe3aad`. Read the existing refinement report and artifacts under `runs/diver-v3-a-refinement-2026-07-11/` before choosing frames or integration points. Preserve all unrelated dirty/untracked work. If any assigned tracked source or intended asset path is already dirty, stop and report the conflict rather than overwriting it.

Create an early report stub at `runs/diver-v3-a-mining-gif-2026-07-11/report.md` before long generation or capture loops.

Scope:
1. Inspect the actual mining state/tool/effects in normal gameplay and the refined gated diver renderer. Write a concise mining frame/timing/socket plan first.
2. Author the minimum fluid mining sequence needed for a strong read (anticipation, strike/contact, recoil/recover; add a hold only if runtime behavior demands it) for both right and genuinely authored left directions. Maintain the accepted Concept A brass/copper/black/cyan materials, fixed registration, helmet/backpack stability, connected anatomy, and gameplay-scale silhouette. Left-facing lighting/details must not be a raw RGB mirror.
3. Integrate only behind a new bounded playtest gate derived from `?playtest=1&diverMotionTest=v3a-refined`; do not alter default gameplay or the prior `v3a`/`v3a-refined` gates. The same gated diver identity must handle both swimming and mining. Align the mining tool, hands, target/impact effects, and actual mining cadence.
4. Prove generated bitmaps are loaded by the live runtime, not procedural stand-ins or stale assets, using browser/local exact hashes for representative new frames.
5. Run `npm run build`, `npx tsc --noEmit --pretty false` with baseline-vs-new diagnosis, `git diff --check`, export/alpha/pivot validation, and a focused Playwright normal-play smoke. Use only ports 5180–5199; if busy, choose another in range and never kill processes outside it. Vite must not watch `.desktop-build`.
6. Capture the actual `#game canvas` during normal play, not a harness/contact sheet: swimming and mining in representative surface/mid/deep context with adjacent captures where biome cutoffs matter, HUD/project identity companions, and grayscale review evidence. Include both directions where practical. Record zero console/page errors or explain any baseline issue.
7. Produce a curated, Telegram-friendly looping GIF at `runs/diver-v3-a-mining-gif-2026-07-11/artifacts/delivery/diver-v3-swim-and-mine.gif`. It should show a short readable swim segment, a clean transition/cut, then an unmistakable mining cycle with impact feedback. Use stable framing, crop to gameplay, avoid browser/debug chrome, keep HUD only if it aids identity, avoid frantic pacing, and optimize file size without destroying sprite readability. Also place 2–4 best PNG screenshots in that delivery folder. Include exact dimensions, duration, frame rate, loop behavior, and byte size in the report.
8. Build color/grayscale review boards comparing swim and mine at gameplay scale. Be blunt about visual problems and iterate until the old ambiguous/static mining read is gone.

Commit the bounded implementation, new runtime assets, durable report/spec/manifest, and compact review/delivery artifacts if consistent with repository retention rules. Bulky raw capture/browser state stays ignored or outside tracked scope. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Return:
- status and blunt visual verdict;
- commit hash;
- changed paths and runtime gate URL;
- report path and delivery GIF/screenshots paths;
- build/typecheck/Playwright/export/hash evidence;
- GIF dimensions/duration/fps/bytes;
- caveats or blockers;
- explicit confirmation that default gameplay and prior gates remain unchanged.
