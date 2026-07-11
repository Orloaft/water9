# Generation and edit lineage

## Authority and exclusions

- Sole visual authority: `runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/canonical-neutral-side-master.png`.
- Concept A bible and registration boards were inspected before generation.
- Concepts B/C were not inputs. Diver v2 reports were read only for cell/loader/rejection contracts; no v2 raster was supplied to the image model, opened as a visual reference, copied, traced, composited, or sampled.
- There are no rejected generated candidates in this run: the seven requested calls each produced one accepted pose. The unkeyed chroma sources are retained under `artifacts/masters/chroma/`; they are lineage sources, not runtime authority.

## Tool disclosure

Seven identity-preserving reference-guided calls used Codex built-in `image_gen`. The tool did not expose model ID, seed, sampler, steps, quality, or input-fidelity settings, so none are invented here. Each call used the canonical PNG as its only reference and requested one pose on a uniform magenta chroma background.

Generated source identifiers, in frame order:

1. `exec-0d2ed2b8-c95b-4da8-baeb-2c97ff16b170.png` → `hover-settle-a`
2. `exec-79601b51-18d4-4442-bd88-883fff6d7afe.png` → `hover-settle-b`
3. `exec-99017ca7-dccb-4881-b9f8-d57fc0665e4a.png` → `swim-propulsion`
4. `exec-c505d9b4-bade-4bc2-9a48-d9bf248d64d4.png` → `swim-cruise`
5. `exec-06624a45-9af3-4cc5-a213-0f7a39b4e030.png` → `scanner-deploy`
6. `exec-b6f78ff4-0067-443f-bf6d-715538fe7ec6.png` → `scanner-hold`
7. `exec-2440a3a8-bc73-431b-8884-d9482be17362.png` → `scanner-recover`

## Prompt contract

Every call locked: right-facing orthographic Concept A; oversized silvered-brass helmet; cyan rounded-rectangular faceplate; broad brass cuirass; massive high paired copper cylinders; connected bellows limbs and circular joint housings; articulated gloves; weighted boots; two separate short fins; compact horizontal silhouette; fixed upper-left light; painterly industrial material response; one centered pose; no procedural/vector/pixel/puppet construction, repeated parts, disconnected anatomy, generic sci-fi redesign, baked effects, text, watermark, cast shadow, or magenta in the subject.

Pose-specific instructions were: buoyant hover rise; weighted hover settle; asymmetrical propulsion kick/pull; streamlined cruise recovery; two-hand scanner deploy; braced two-hand scanner hold; and two-hand scanner recover. Scanner prompts explicitly required both gloves to wrap distinct grips and effects to remain separate.

## Local edit lineage

1. The installed `remove_chroma_key.py` sampled each border, applied soft matte/despill, contracted one pixel, and produced transparent high-resolution masters. No anatomy or pixels were synthesized in this step.
2. `build_motion_assets.py` trims alpha, fits the authored subject into a common 128×96 cell, Lanczos-downsamples, consolidates RGB to 32 colors, locks runtime alpha to 0/255, clears transparent RGB, places the common `(64,52)` pivot, writes the seven public/runtime PNGs and atlas/JSON, and assembles review boards.
3. `assemble_canvas_review.py` assembles only evidence boards from Playwright-captured live canvases; it does not alter runtime art.

The authoritative hashes are in `artifacts/manifest.sha256`.
