Goal: implement the first Water9 flora replacement slice and follow up on unscannable flora.

Repo pin: /mnt/nxt-dev/water9

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Read before editing:
- runs/water9-flora-style-guide-audit-2026-07-06/manager-synthesis.md
- runs/water9-flora-style-guide-audit-2026-07-06/inventory.md
- runs/water9-flora-style-guide-audit-2026-07-06/style-appraisal.md
- runs/water9-flora-style-guide-audit-2026-07-06/runtime-proof.md
- runs/water9-flora-slice-scannability-2026-07-06.md

Context:
- The repo is intentionally dirty from the prior scan-reward rebalance and flora-audit artifacts. Preserve all existing dirty work. Do not revert, overwrite, or broad-stage unrelated files.
- The style-guide verdict is that old `env-flora-*` scannable sprites look like static catalog specimens, while decorative terrain-integrated flora fits the game better.
- Alex asked to implement the recommended first slice and also do a followup pass to make sure no flora is unscannable.

Scope:
- Replace the gameplay visuals for these active scannable flora only:
  - Moon Sponge
  - Sting Anemone
  - Vent Coral
  - Ember Bloom
- Preserve species names, scan behavior, rewards, spawn logic, biome placement, hazards, and gameplay stats unless a narrowly necessary scannability fix is required.
- Use the decorative terrain-integrated style benchmark: terrain-rooted, smaller, asymmetrical, darker base, selective tip/node glow, readable at gameplay scale.
- Keep existing better references (`terrain-edge-flora-glass-kelp`, `terrain-edge-flora-brine-grass`) unchanged as positive controls.
- Do not touch fauna, economy tuning, scanner reward values, controls, Telegram/OpenClaw config, or unrelated files.

Scannability followup:
- Audit every runtime path that creates visible flora-like content:
  - `Flora` objects in `this.flora`
  - `EnvironmentProp` records with `kind: 'flora'`
  - terrain brush flora placements
  - procedural ecology/fringe painting
  - special-room flora
- Make sure every named/discrete gameplay flora that a player would reasonably expect to scan is scannable.
- Avoid turning ambient moss/fringe/brush texture into hundreds of scanner targets or reward spam. If a thing is genuinely ambient terrain texture, reclassify/name it in code/report as terrain texture rather than gameplay flora, and prove it is not presented as an individual flora target.
- If you find a discrete decorative plant prop that remains categorized as flora and is not scannable, either:
  1. convert it to a real `Flora` scan target with controlled scan behavior/reward implications, or
  2. reclassify it out of the flora category if it is only terrain material, or
  3. document it as an explicit blocker/caveat if conversion would be too risky for this slice.
- Add a small automated audit/smoke if practical so future decorative flora paths cannot silently become unscannable named flora again.

Implementation guidance:
- Prefer adding/replacing generated PNG assets and routing these four species through `floraGameplayAssetKey()` or the existing asset-loading pattern.
- If generating assets, reject centered catalog/specimen compositions. The old static read must be gone.
- If AI image generation is unavailable in your environment, create deterministic bitmap assets using local scripts/canvas/Pillow tooling, but still match the style guide and prove they load in the live runtime.
- Generated/bitmap art must be proven loaded by the live runtime, not merely present on disk.

Visual acceptance:
- Start a dev server only on ports 5180-5199. If one is busy, use another in range; never kill processes outside it.
- Capture normal-play live `#game canvas` proof, not review-harness-only screenshots.
- Required captures: B1 Moon Sponge, B1 Sting Anemone, B2 Vent Coral, B2 Ember Bloom, plus at least one nearby decorative terrain-flora comparison in B1/B2.
- Include grayscale variants for every accepted color capture.
- Include HUD/context viewport captures proving this is Water9 runtime.
- Include scan-target evidence proving the four replacement species remain scannable in runtime.
- Manager acceptance will be visual; passing metrics alone is not enough.

Verification:
- Run `npm run build`.
- Run any existing focused flora/asset/playtest smoke if available.
- Run or create a focused scannability audit/smoke for visible flora paths if practical.
- Leave a report stub early at `runs/water9-flora-slice-scannability-2026-07-06/worker-report.md`.

Git/staging safety:
- Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.
- Because the repo starts dirty, do not commit unless you can safely isolate exactly this slice and explain why. It is acceptable to return with no commit made.

Return:
- Status.
- Changed files.
- Report path.
- Proof image paths.
- Scannability audit result, including any remaining caveats.
- Verification commands and results.
- Commit hash if you commit; otherwise say no commit made.
