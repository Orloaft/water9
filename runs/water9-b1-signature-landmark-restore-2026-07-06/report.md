Status: DONE

Preflight HEAD: 2c4ff8d

Dirty-start classification and commit safety:

- Pre-existing unrelated dirt was present before editing: fauna/viperfish generated assets, fauna run ledgers, `src/content.ts`, and `src/helpers.ts`.
- `src/content.ts` was not touched.
- `src/helpers.ts` had unrelated pre-existing spritesheet-loader dirt near the generated fauna asset list. My B1 landmark edits were in separate hunks around the B1 landmark constants/surface framing. I staged only my `src/helpers.ts` hunks with `git apply --cached`; the unrelated helper dirt remains unstaged.
- Staging was explicit-path only. I did not use `git add -A`, `git add .`, or `git commit -a`.

What changed:

- `public/assets/generated/background-phase3/water9-biome-landmark-shallows-living-coral-terrace.png` - new B1-only transparent bitmap landmark.
- `public/assets/generated/background-phase3/background-phase3.manifest.json` - added the ready runtime manifest entry for `biome-shallows-living-coral-terrace`.
- `src/helpers.ts` - normal B1 landmark selection now points to the new signature asset; B1 surface-only framing moves the landmark lower in the first-water composition and increases B1-only surface size/alpha.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/build-b1-signature-landmark.py` - reproducible asset builder for the bitmap.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/capture-b1-signature-proof.mjs` - focused runtime proof capture.

Landmark / asset / runtime selection details:

- New asset id: `biome-shallows-living-coral-terrace`.
- Texture key: `water9-biome-landmark-shallows-living-coral-terrace`.
- Runtime path: `/assets/generated/background-phase3/water9-biome-landmark-shallows-living-coral-terrace.png`.
- The old `biome-shallows-shell-survey-terrace` was not added to any active pool.
- B1 normal/surface pools now select the living coral terrace through the existing B1-only organic landmark path. B1 still uses the existing organic band plate and remains guarded from generic Phase 3/Phase 11/industrial fallback anchors.
- Proof JSON confirms the bitmap loaded from the live runtime path with HTTP 200/image PNG, 337637 bytes, and renderer source dimensions 1280x520.

Proof paths:

- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-signature-landmark-proof.json` - runtime metadata, active band/depth, anchor ids, texture keys, loaded sprite dimensions, live asset fetch proof.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-first-water-depth78-surface-signature-normal-gameplay-canvas.png` - actual `#game canvas`, B1 surface/first-water below 120m. Actual proof depth: 48m, active band: `surface`, signature anchor alpha 0.34.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-first-water-depth78-surface-signature-normal-gameplay-canvas-grayscale.png` - grayscale pass for first-water capture.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-mid-depth558-signature-normal-gameplay-canvas.png` - actual `#game canvas`, normal B1 beyond first-water. Actual proof depth: 534m, active band: `mid`, two signature anchors visible.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-mid-depth558-signature-normal-gameplay-canvas-grayscale.png` - grayscale pass for normal B1 capture.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b2-preservation-depth420-normal-gameplay-canvas.png` - outside-B1 preservation capture; B2 still shows `biome-brine-vent-sulfide-shelf`, and the B1 signature did not leak.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b2-preservation-depth420-normal-gameplay-canvas-grayscale.png` - grayscale pass for preservation capture.
- `runs/water9-b1-signature-landmark-restore-2026-07-06/b1-signature-proof-contact-sheet.png` - quick side-by-side review sheet; raw captures above are the acceptance evidence.

Manager visual acceptance notes I recommend checking:

- First-water color and grayscale captures should read as a broad organic coral canopy behind the player, not as the rejected shell/survey frame.
- Mid-B1 capture keeps the signature readable through terrain framing and in grayscale.
- B2 preservation capture keeps the brine shelf language and does not show the new B1 asset.

Verification commands and results:

```text
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
2c4ff8d

python3 runs/water9-b1-signature-landmark-restore-2026-07-06/build-b1-signature-landmark.py
{
  "path": "/mnt/nxt-dev/water9/public/assets/generated/background-phase3/water9-biome-landmark-shallows-living-coral-terrace.png",
  "size": [1280, 520],
  "transparentPixels": 300048,
  "semiTransparentPixels": 365552,
  "opaquePixels": 0
}

npm run build
PASS - Vite build completed. Existing unresolved /assets/generated UI runtime-reference warnings and chunk-size warning remained.

node runs/water9-b1-signature-landmark-restore-2026-07-06/capture-b1-signature-proof.mjs
PASS - wrote b1-signature-landmark-proof.json; proof failures: [].

ss -ltnp | rg ':(5180|5181|5182|5183|5184|5185|5186|5187|5188|5189|5190|5191|5192|5193|5194|5195|5196|5197|5198|5199)\b' || true
PASS - no listeners remained on 5180-5199 after proof.

git diff --cached --check
PASS
```

Commit hash:

- Implementation/proof commit: `d4c863d` (`Restore B1 signature landmark`).
- This report was finalized after the implementation commit so it could include the commit hash; it remains an untracked run artifact on disk.

Caveats / blockers:

- No blocker.
- Existing unrelated repo dirt remains exactly outside the committed slice.
- The first-water proof filename contains `depth78`, but the actual stabilized runtime depth in metadata is 48m; it is still below the 120m surface cutoff and uses the `surface` active band.
