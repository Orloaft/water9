# Worker task: fix Glasshook Skulk wall-chase body folding

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Work only in `/mnt/nxt-dev/water9`.

Alex reports that the Biome 1 Abyssal Glasshook Skulk's articulated body partially folds in on itself while it chases the diver up to a wall, losing its proper body shape. Treat this as a bug hunt: reproduce first, diagnose the root cause, make the narrowest durable fix, prove the bad read is gone, and commit it.

Create the report stub at `runs/glasshook-wall-fold-fix-2026-07-12/report.md` early, before long capture loops. Preserve all unrelated existing tracked and untracked work. There is substantial pre-existing run/evidence dirt; do not clean it, absorb it, rewrite it, or stage it.

Scope and requirements:

1. Inspect the articulated-creature chase, pose/joint solver, terrain contact, facing, and wall/corner constraint paths, especially `src/scene-articulated.ts` and the `abyssal-glasshook-skulk` manifest. Reproduce the actual reported failure in normal Biome 1 gameplay, preferably with a deterministic playtest setup if one exists or a narrowly scoped diagnostic hook if necessary.
2. Capture clear BEFORE evidence from the actual `#game canvas` while the intact Glasshook is actively chasing the diver into/along a wall and its segments fold/overlap or reverse. Record enough joint positions/angles, joint errors, ordering, bend, terrain contacts, and creature velocity/state to establish the cause rather than guessing.
3. Fix the root cause narrowly. The intact articulated chain must retain its intended head/thorax/abdomen/tail topology and recognizable silhouette under sustained wall contact and at a wall/corner, without self-folding, segment inversion, extreme compression, or jitter. Preserve legitimate articulation, chase behavior, terrain avoidance/contact, damage/detachment mechanics, and other articulated species. Avoid a one-frame cosmetic mask or global stiffness increase unless evidence shows that is correct.
4. Add a focused deterministic regression check or diagnostic assertion/metric that would fail on the reproduced fold and pass after the fix. Include before/after numeric evidence. Exercise both facing directions if relevant and at least a vertical wall plus a corner/angled constraint if the world geometry permits.
5. Produce AFTER captures from the actual `#game canvas` during normal Biome 1 gameplay at gameplay scale, matching the bad scenario. Include a concise before/after contact sheet and a grayscale after proof. Captures must visibly identify Water9/Biome 1 and show the intact creature, diver, and wall context. Worker self-verdicts and metric-only proof are insufficient.
6. Run proportionate checks: `npm run build`, existing TypeScript diagnostics with baseline/new-error distinction, the relevant Playwright playtest smoke(s), the new focused regression, and `git diff --check`. Use only ports 5180–5199 for dev servers; if busy choose another in range, and never kill processes outside it. Ensure Vite does not watch `.desktop-build`.
7. Update `lessons.md` with a dated entry only if this incident yields a reusable process lesson, following the repo format and folding rules. Do not manufacture one.
8. Commit only the intended fix, focused regression/support code, durable report/manifest, and reasonably sized review evidence approved by your own inspection. Bulky browser artifacts stay ignored or outside tracked history according to retention policy.

Stage files by explicit path only. `git add -A`, `git add .`, and
`git commit -a` are forbidden. Before committing, run `git status --short`
and confirm every staged path belongs to your assigned stage.

Report must include: preflight HEAD; dirty-start classification; deterministic reproduction steps; root cause with file/line evidence; exact changed files; before/after metric table; artifact paths for actual canvas captures/contact sheet/grayscale; visual inspection notes; commands and results; baseline versus new TypeScript diagnostics; commit hash; final git status; caveats and remaining risks.

Return:

- status (`PASS`, `BLOCKED`, or `FAIL`)
- root cause and fix summary
- commit hash and changed files
- report and visual artifact paths
- verification results
- caveats/blockers
