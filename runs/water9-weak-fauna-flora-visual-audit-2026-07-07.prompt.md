You are `codex-dev` working on Water9, the underwater diving/mining game.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`
Planning HEAD observed by manager: `971e654`
Session key: `weak-sprite-visual-audit`
Run ledger: `runs/water9-weak-fauna-flora-visual-audit-2026-07-07.md`
Output directory: `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/`

Goal
Identify the visually weakest fauna and flora sprites currently shipping in Water9, especially sprites with white fringes / bad background matte, and compile a reviewable prioritized list for Alex before any repair work starts.

Scope
- This is an audit/list task, not a fix task.
- Do not replace art, edit gameplay code, rebalance anything, or commit.
- You may create scripts and evidence files under the output directory only.
- If you need a temporary dev server, use a port in 5180-5199. If a port is busy, pick another in range; do not kill processes outside that range.
- Vite must not watch `.desktop-build`.
- Preserve the existing dirty worktree. Do not revert, stage, or commit anything.

Required approach
1. Create an early report stub at:
   `runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-review.md`
   with `Status: in progress`.
2. Inventory all runtime fauna and flora sprites that can appear in normal play.
   - Include current Asset Forge spritesheets, frame manifests, loose PNGs, and flora assets.
   - Use existing source-of-truth helpers/manifests where possible instead of hand-maintained guesses.
   - Use the previous cleanup output as baseline/context:
     `runs/water9-fauna-flora-procedural-quality-cleanup-2026-07-07/`
   - The cleanup provenance gate was clean at `971e654`; this audit is about visual weakness, not provenance failure.
3. Combine automated checks with visual judgment.
   Automated checks should flag likely:
   - white fringe / light matte contamination around alpha edges
   - opaque or near-opaque rectangular backgrounds
   - bad alpha premultiplication halos
   - low-res/upscaled blur
   - tiny unreadable silhouettes at gameplay scale
   - excessive dark-on-dark loss in grayscale
   - obvious crop/scale problems
   - procedural/simple-shape read or style mismatch
4. Capture actual runtime proof from the live game.
   - Use normal gameplay, not a pure review harness, for acceptance evidence.
   - Capture the actual `#game canvas`.
   - Cover representative depth bands: surface / mid / deep / abyss-hadal, straddling relevant biome cutoffs when practical.
   - Include grayscale proof for readability.
   - Ensure proof shows Water9 runtime identity (HUD/game canvas context) and that sprites are loaded from the runtime path, not mocked stand-ins.
5. Produce review artifacts:
   - `weak-sprite-review.md`: concise ranked review list, worst first.
   - `weak-sprite-review.json`: structured data for every audited candidate and rank.
   - `weak-sprite-top-review-contact.png`: contact sheet of the weakest candidates with labels and failure tags.
   - `weak-sprite-top-review-contact-gray.png`: grayscale version of the same top candidates.
   - `normal-play-proof.json`: metadata for runtime captures, including depths, asset keys observed, and screenshot paths.
   - Include individual PNG/JPG proof captures as needed in the output directory.

Ranking requirements
- Separate the list into:
  - `P0 obvious defects`: white fringe, bad background, rectangular matte, wrong/dirty transparency, or unmistakable broken visual.
  - `P1 weak in gameplay`: not broken, but poor read at game scale, weak silhouette, muddy grayscale, low-res blur, severe style mismatch.
  - `P2 polish candidates`: acceptable but noticeably weaker than surrounding fauna/flora.
- For each ranked asset include:
  - rank
  - asset key / species name
  - fauna or flora
  - runtime file(s)
  - depth/biome where observed
  - failure tags
  - one short evidence note
  - proof image path(s)
  - recommended next action: replace, rematte, rescale/crop, recolor/contrast, or leave for later
- Include a short "do not touch yet" section for assets that look acceptable despite automated suspicion.

Acceptance bar
The manager will not accept metric-only results. The audit must be grounded in actual `#game canvas` captures during normal play plus grayscale contact proof. Contact sheets are review aids, not the only evidence.

Verification
- Run whatever focused scripts/checks you create.
- Run `git status --short` before finishing and report any files you created/modified.
- Do not run a broad build unless you had to touch executable code. This task should not need code changes outside `runs/`.

Return block
When complete, report:
- Status
- Report path
- JSON path
- Contact sheet paths
- Runtime proof path
- Top 10 weakest assets with failure tags
- Verification run
- Caveats/blockers
