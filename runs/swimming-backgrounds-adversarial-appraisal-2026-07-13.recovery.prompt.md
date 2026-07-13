You are the sole recovery/integration owner for the existing Water9 swimming-backgrounds appraisal run. Finish the current staged work; do not regenerate the inventory or archives unless verification proves a specific artifact incomplete.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9` only. The prior worker ended after substantial durable work but before any new commit. Current expected state: `ux-work` at `7497c21`, ahead of origin by 12; many durable run records/manifests/scripts explicitly staged; 608 bulky files preserved in place, copied to `/home/orlovboros/artifacts/managers/water9/<run-slug>/`, hash-verified, and narrowly ignored; `.gitignore` currently has staged and unstaged changes; report stub exists at `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md`. Verify this from disk and continue from it.

1. Inspect the complete index and worktree. Validate that staged files are durable records under the retention policy and that no bulky screenshot/log/oversized measurement is staged. Validate a representative sample plus manifest counts/checksums against the archive copies. Do not delete, move, reset, unstage wholesale, or redo valid archival work.
2. Reconcile the staged/unstaged `.gitignore` difference and include this recovery prompt plus updated ledger/report using explicit-path staging. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before each commit, run `git status --short` and confirm every staged path belongs to your assigned stage.
3. Finish the checkpoint report section with exact committed-vs-archived handling. Commit the durable checkpoint on `ux-work`, push normally, and prove local HEAD equals `origin/ux-work`. Never force-push. If the remote rejects due to new remote work, stop and report rather than rebasing/merging without approval.
4. Create and check out `swimming-backgrounds` from the verified pushed tip. If it already exists, inspect and report; never overwrite/reset it.
5. Complete the adversarial appraisal already specified in `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13.prompt.md`. Read that full prompt and honor all Stage 2 requirements. Do not implement product changes. Use only ports 5180–5199 and never kill processes outside them.
6. Required live proof: actual `#game canvas` during normal play with HUD/runtime identity, representative surface/mid/deep bands, adjacent pairs straddling biome cutoffs, swimming motion/directions where possible, and grayscale companions. Inspect backgrounds, biome differentiation, layering/parallax, landmark/navigation, swimming acceleration/inertia/animation/camera/feedback, depth lighting/fog/diver light/contrast, interactions/readability, cutoff seams/pop-in, and performance risk. Separate observed runtime facts, code facts, and hypotheses; cite file/line evidence; identify the strongest current internal benchmark.
7. Finish `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md` with executive verdict, top five, evidence index, ranked findings, target direction, phased slices, do-now/later/avoid, measurable visual/game-feel/performance gates, risks/design choices, and recommended first implementation slice. Keep bulky new captures outside Git under the prescribed archive root, add a verified manifest, and preserve originals.
8. Commit only the durable proposal/report/ledger/manifest on `swimming-backgrounds` via explicit paths. Push with upstream tracking. Verify exact local/remote refs and clean routine status (preserved ignored evidence is fine).

Do not modify Telegram/gateway/systemd/cron/external integrations. Do not use destructive Git or filesystem commands. Preserve unrelated work.

Return: status; checkpoint commit and origin proof; proposal commit/branch/upstream proof; committed vs archived paths and manifest; report path; concise ranked findings/proposal; tests/captures; caveats/blockers/decisions.
