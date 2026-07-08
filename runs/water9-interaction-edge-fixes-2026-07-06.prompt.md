You are codex-dev working on Water9 only.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo pin: `/mnt/nxt-dev/water9`
Manager saw HEAD before dispatch: `03b2dad`
Run ledger: `/mnt/nxt-dev/water9/runs/water9-interaction-edge-fixes-2026-07-06/water9-interaction-edge-fixes-2026-07-06.md`
Report path: `/mnt/nxt-dev/water9/runs/water9-interaction-edge-fixes-2026-07-06/worker-report.md`

Alex reported after testing the flora slice:
- Some ore is still unmineable.
- Some stamped flora is still not scannable.
- The mantis shrimp enemy gets stuck walking back and forth on a small piece of terrain; it should be able to climb around and jump short distances to keep traveling along destructible wall edges.
- The neutral crab was flipping vertically as it walked along edges.

Create the report file as an early stub before long testing loops. Work in `/mnt/nxt-dev/water9` only. Preserve unrelated dirty state. Do not revert other people's work. You are not alone in the codebase; adapt to existing changes and report any pre-existing dirt that affects commit safety. Do not commit unless the manager explicitly asks later. If you do commit for an explicitly requested follow-up, obey: "Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage."

Scope:
1. Reproduce/root-cause and fix at least one visible-but-unmineable ore case. Check prior related runs for context:
   - `/mnt/nxt-dev/water9/runs/water9-ore-pass-through-mining-fix-2026-07-05/report.md`
   - `/mnt/nxt-dev/water9/runs/water9-ore-anchor-b2-overlay-fix-2026-07-05/report.md`
   - `/mnt/nxt-dev/water9/runs/water9-stray-ore-drops-2026-07-06/report.md`
2. Audit stamped/decorative flora scannability. Anything visually presented as flora and intended as gameplay flora should be in the scan path; anything left unscannable must be explicitly classified as terrain texture/background and must not read as a missed scan target. Check:
   - `/mnt/nxt-dev/water9/runs/water9-flora-style-guide-audit-2026-07-06/manager-synthesis.md`
   - `/mnt/nxt-dev/water9/runs/water9-flora-slice-scannability-2026-07-06/worker-report.md`
3. Improve mantis shrimp wall-edge traversal on destructible terrain. It should not pace forever on small lips/islands; add climb-around and/or short-hop behavior consistent with existing enemy movement architecture.
4. Fix neutral crab orientation on edge walking so it does not vertically flip while following terrain/edges.

Constraints:
- No broad refactors. Keep changes tightly scoped to ore mining hit/anchor logic, flora scan classification/instantiation, and fauna edge movement/orientation.
- Dev servers/smokes must use ports 5180-5199. If a port is busy, choose another in range. Never kill processes outside that range.
- Vite must not watch `.desktop-build`.
- Generated evidence should be in this run directory or ignored paths.

Acceptance proof required:
- `npm run build`
- Existing focused scannability/mining/fauna smokes if present; if missing, add/run narrow scripts under the repo's existing tooling style.
- Normal-play live `#game canvas` proof for:
  - Ore before/after, including direct mining of the previously unmineable visible ore and an adjacent-rock control.
  - Stamped flora scan proof, including HUD/label/context proving runtime identity.
  - Mantis shrimp traversing a destructible wall-edge obstruction without getting stuck pacing.
  - Neutral crab walking edges without vertical flipping.
- Include color captures and any grayscale/contact-sheet proof needed for visual readability. The manager will inspect images before accepting.

Return in `worker-report.md`:
- Status: PASS/BLOCKED
- Root causes found
- Changed files
- Verification commands and results
- Proof artifact paths
- Any remaining caveats or cases intentionally left as non-scannable terrain texture/background
