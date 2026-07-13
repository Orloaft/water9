# Worker task: Water9 diver v2 curated asset-production stage

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repository: `/mnt/nxt-dev/water9` only. Work only in this repo. Read the complete audit and its manifest example first:

- `runs/current-diver-sprite-audit-2026-07-11/report.md`
- `runs/current-diver-sprite-audit-2026-07-11/artifacts/proposed-diver-v2-manifest.example.json`
- the existing color/grayscale sheets and authentic runtime captures in that audit's `artifacts/`

Goal: produce a meticulous, reviewable first-stage replacement asset pack. This is not a request to generate 100 unrelated final frames. Follow the audit's recommended workflow: lock one master character, create pixel masters, then key poses for the narrow prototype covering `idle_hover`, `swim_accel`, `swim_cruise`, `swim_decel`, `scanner_deploy`, `scanner_scan_hold`, and `scanner_recover`, plus a modular scanner attachment and separate scanner-effect reference. Do not change game source or integrate the new art in this stage.

Create `runs/diver-v2-asset-production-2026-07-11/report.md` immediately as an early stub, then update it throughout so an interrupted run is recoverable.

Visual direction and immutable identity:

- Compact industrial saturation diver, not astronaut: oversized cyan pressure helmet, short armored brass/black torso, weighted fins/boots, twin-cylinder/rebreather backpack, one readable working hand and one bracing arm.
- Preserve the accepted current themes: brass pressure suit, cyan faceplate, backpack mass, warm/cool split, strong horizontal swim silhouette.
- Right-facing orthographic side view is canonical. No text, glyphs, decals, or sharp baked highlights that break mirroring.
- Stable helmet diameter, torso volume, backpack placement, limb lengths, camera, palette, and upper-left broad lighting across every pose.
- Body palette must end at 16–24 opaque RGB colors; binary body alpha only; transparent RGB zero. Effects are separate and may use alpha.
- Production cells are 128×96, pivot `(56,48)`, safe bounds `(8,8)-(120,88)`, nominal front-hand `(78,47)`, back-hand `(65,45)`, backpack `(37,39)`, effect origin `(91,47)`. Root/helmet/torso deviation across loops must be at most one native pixel unless intentionally documented.
- No baked beam, cone, ring, bubbles, exhaust, sparks, HUD arc, shadow, environment, or glow in body art.

Generation method:

- Use the built-in image-generation path for concept/reference renders. Treat raw generations as reference material, never automatically as shipped sprites.
- For transparent deliverables, first generate on a perfectly uniform removable chroma-key background, remove it locally, and validate alpha. Do not silently downgrade or switch to a CLI/API/model path. If clean transparency cannot be achieved, report the exact blocker rather than inventing a workaround.
- Save final project-bound assets inside this run directory; do not leave dependencies only under a tool cache or home directory.
- Persist the exact prompt and reference lineage for every retained generation. Generate focused variants and curate deliberately; do not bulk-produce arbitrary alternatives.
- Hand-clean/reduce approved key art into actual pixel-authored production cells, palette-lock it, remove orphan pixels/fringes, and onion-skin registration. AI output is pose/reference material until this cleanup passes.

Required artifacts:

1. `artifacts/master/`: master model/reference board with right side hover, cruise neutral, front/back/three-quarter construction references, palette/material callouts, and scale ruler. Retain 2–4 meaningfully distinct candidates only if needed, plus a clear selected master. Never fake labels via generated illegible text; assemble labels deterministically after generation.
2. `artifacts/production/`: individual transparent 128×96 PNG cells for the complete narrow slice (6 idle; 4 accel; 8 cruise; 4 decel; 3 scanner deploy; 4 scanner hold; 2 scanner recover), modular scanner attachment frames as needed, and separate scanner-effect reference layers. Key-pose-first is mandatory; in-betweens may be hand-authored or constrained from approved keys.
3. `artifacts/spec/`: locked palette, per-frame pivot/socket metadata, clip timing/events, machine-readable manifest, prompt ledger, source/derivation lineage, and validator output.
4. `artifacts/review/`: labeled color and grayscale contact sheets at 1× and 2×; actual-gameplay-footprint previews at 30px, 44px, and 60px; right/left mirror sheet; onion-skin/root-stability sheet; action-read sheet showing bodies without scanner effect/HUD; side-by-side comparison against accepted current runtime imagery. Nearest-neighbor only for sprite scaling.

Validation:

- Programmatically validate dimensions, file naming, binary body alpha, transparent corners/RGB, palette membership, safe bounds, pivot/socket presence, required frame counts, no orphan manifest entries, and root deviation.
- Visually inspect every retained frame at 1×, 2×, and gameplay scale in both color and grayscale. Explicitly reject/redraft identity drift, registration wobble, noisy clusters, lost limbs/tools, ambiguous scanner gesture, or broken mirrored lighting.
- The scanner action must be recognizable from the body/attachment silhouette before its effect is shown.
- This stage does not require a live server or game integration. Do not claim runtime acceptance.

Safety and ownership:

- Preserve all pre-existing dirt and unrelated run artifacts. Do not modify or delete them.
- Write only under `runs/diver-v2-asset-production-2026-07-11/` unless the task becomes impossible; report rather than widening scope.
- Do not commit unless explicitly necessary; if you do, stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Report requirements:

- State the selected master and why it won, all generated/retained/rejected variants, exact paths, prompts and generation route, post-processing performed, validator results, frame coverage, any deviations from the audit contract, and remaining risks.
- Include a blunt readiness verdict: `READY_FOR_MANAGER_ART_REVIEW`, `NEEDS_ANOTHER_ASSET_ITERATION`, or `BLOCKED`.
- Do not mark this runtime-ready; integration and authentic `#game canvas` surface/mid/deep/grayscale proof are a separate future stage.

Return: status, report path, artifact directories, validator summary, generated/curated asset count, readiness verdict, blockers/caveats, and git status summary.
