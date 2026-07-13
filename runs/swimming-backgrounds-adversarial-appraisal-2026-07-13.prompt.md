You are the sole commit-capable integration owner for Water9. This task has two sequential stages: first checkpoint/push the current branch and create a new branch; only after that succeeds, conduct a read-only adversarial appraisal and commit its durable report. Do not implement visual/gameplay improvements yet.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9` only. Start state observed by the manager: branch `ux-work`, HEAD `7497c21`, 12 commits ahead of `origin/ux-work`, with many modified/untracked files under `runs/` and about 1.6 GB in `runs/` overall. Re-inspect; this is not permission to assume every byte is suitable for Git.

Stage 1 — safe checkpoint, push, and branch:

1. Create the report stub at `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md` immediately.
2. Inventory every dirty path. Classify it as durable project record (ledger, prompt, report, manifest, small essential evidence) or bulky/generated/browser proof. Alex asked to “commit and push all changes,” so preserve all meaningful work. Follow `/home/orlovboros/projects/managers/ARTIFACT-RETENTION.md`: bulky proof/browser state must be archived outside Git with a verified manifest, not silently deleted and not committed as repository ballast. The policy is prospective and explicitly forbids deleting, moving, or untracking existing evidence merely for cleanup. Preserve existing untracked bulky evidence in place, archive decision-bearing copies with verified manifests, and if needed add narrowly scoped ignore rules so preserved transient evidence does not leave routine status noisy. Do not discard any pre-existing content. Record exact handling, ignore decisions, and archive paths in the report.
3. Ensure the two manager-created appraisal ledger/prompt files are included as durable records. For all other paths, explicitly enumerate staging paths. If there is ambiguous source/code dirt or an unsafe artifact with no policy-compliant preservation path, stop before committing and explain the blocker.
4. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
5. Commit the current checkpoint on `ux-work` with a clear message. Push `ux-work` to its configured origin. Verify local HEAD equals `origin/ux-work`. Never force-push.
6. Create and check out a branch named exactly `swimming-backgrounds` from that verified pushed tip. If it already exists, do not overwrite or reset it; inspect and report the conflict. Push it with upstream tracking only after the appraisal commit below.

Stage 2 — adversarial appraisal and proposal (no product implementation):

7. Inspect the rendering/gameplay architecture and relevant history/reports, especially existing water-column/background/visual research, but make a fresh judgment from the current runtime. Trace the actual background, depth palette/fog, lights/shadows, particles, camera/parallax, diver movement/animation, input response, and biome-transition code. Cite files and line numbers.
8. Run the game on an available port in 5180–5199; never kill processes outside that range. Capture the actual `#game canvas` during normal play, not a review harness or contact sheet. Cover representative surface, mid, and deep bands and adjacent captures straddling biome cutoffs. Include on-screen runtime identity/HUD. Produce grayscale companions for readability review. Capture while swimming in representative directions/speeds where possible, not only static teleports. If browser capture fails, document exact attempts and still produce the strongest code/evidence-based proposal, clearly marking visual acceptance incomplete.
9. Judge the experience adversarially. At minimum address:
   - immediate visual appeal and whether backgrounds feel authored, alive, spatial, and underwater;
   - biome identity, progression, repetition, landmarking/navigation, scale, negative space, and depth layering/parallax;
   - swimming feel: acceleration/deceleration, direction changes, buoyancy/inertia, animation-to-motion coherence, camera response, feedback, and whether motion sells moving through water;
   - lighting: depth attenuation, ambient/key balance, diver light integration, silhouettes, color separation, fog/occlusion, contrast under grayscale, and UI/gameplay readability;
   - transitions across depth/biome cutoffs, obvious seams, flat bands, pop-in, and visual continuity;
   - interactions among backgrounds, fauna/flora/ore/landmarks/diver/UI;
   - performance and implementation risks, especially expensive full-screen effects or high-overdraw proposals.
10. Be blunt. Rank findings by severity and player impact. Separate observed runtime facts, code facts, and informed hypotheses. Identify what is already strong and must not regress. Compare representative bands side by side and nominate the strongest current biome/band as an internal quality benchmark.
11. Write a concrete proposal in `runs/swimming-backgrounds-adversarial-appraisal-2026-07-13/report.md` containing:
   - executive verdict and top five failures/opportunities;
   - evidence index with capture paths, depths/biomes, and conditions;
   - ranked findings with file/line evidence;
   - a target visual/game-feel direction in plain language;
   - phased work slices ordered by dependency and value, each small enough for review and with likely files/systems;
   - explicit “do now / later / avoid” recommendations;
   - measurable acceptance gates for actual `#game canvas` captures at surface/mid/deep and cutoff pairs, grayscale readability, swimming-response feel, and frame-time/performance;
   - risks, open design choices requiring Alex’s approval, and recommended first implementation slice.
12. Keep bulky captures outside Git per retention policy with a durable manifest/checksums and paths that the manager can inspect. Commit the report, ledger updates, and small durable manifest on `swimming-backgrounds` using explicit-path staging. Do not commit product implementation. Push `swimming-backgrounds` with upstream tracking. Verify clean status and exact local/remote refs.

Do not modify Telegram bindings, gateway config, systemd, cron, or external integrations. Do not use destructive Git/filesystem commands. Preserve all unrelated work.

Return:
- status;
- checkpoint commit and `origin/ux-work` verification;
- new branch/proposal commit and upstream verification;
- exact paths committed vs archived, with manifest path;
- report path and concise top findings/proposal summary;
- commands/tests/captures completed;
- caveats, blockers, and any decisions Alex must make.
