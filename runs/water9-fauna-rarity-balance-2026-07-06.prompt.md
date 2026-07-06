# Worker Prompt: Water9 Fauna Rarity Balance

Before any work, run `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere else.

You are `codex-dev` working in exactly one repo: `/mnt/nxt-dev/water9`.

Goal: rebalance fauna scan/log rarity so each creature's rarity reflects how common it is to encounter in its biome. Alex observed that we added lots of new fish/sea creatures and a vast majority are marked legendary. Fix the model and prove the in-game/log labels are no longer inflated.

Current manager context:
- Manager preflight HEAD before dispatch: `7ede770`.
- The small-fauna roster is in `src/content.ts` as `biomeFish`.
- `ScanRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'` is in `src/types.ts`.
- Scan labels flow through `scannableRarity`, `rarityLabel`, and `scanReward` in `src/helpers.ts`; `scene-entities.ts` reports `Cataloged ${target.species} (${rarityLabel(rarity)})`.
- Current issue source observed by manager: `fishRarity` in `src/helpers.ts` currently returns `legendary` when `species.count <= 4 || species.radius >= 29`, so many low-count experimental filler fish get legendary even if they are ordinary encounters in their biome slice.
- Articulated creatures use manifest rarity and true large one-off threats can remain legendary.
- Existing report context: `runs/water9-fauna-behavior-classes-2026-07-05/behavior-class-proposal.md` counted 138 active `biomeFish` entries and can help you understand current fauna categories. Do not implement behavior classes in this task.
- The repo may already be dirty from prior fauna/art work. Preserve unrelated changes.

Scope:
- Own the rarity model and focused verification only.
- Prefer a data-driven helper over hand-labeling 138 species one by one, unless the existing architecture strongly favors explicit data.
- The rarity model must be based on encounter commonness in the species' biome: population count, relative count distribution within that biome, depth-band availability/range, and special danger/size traits only as secondary modifiers. A low absolute count alone must not make ordinary filler `legendary`.
- Keep scan rewards coherent with the new rarity labels; do not create huge reward inflation for ordinary creatures.
- Include flora only if you find the same bug applies directly and the change is trivial; otherwise leave flora logic alone and mention it as out of scope.
- Do not change fauna art, animation, movement behavior, biome landmark code, Telegram bindings, gateway config, systemd units, cron, or public integrations.

Suggested implementation shape:
1. Create an early report stub at `runs/water9-fauna-rarity-balance-2026-07-06/report.md`.
2. Add or update a focused audit/check script if useful, for example under `tools/`, that emits `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`.
3. Rework `fishRarity` so it computes rarity from per-biome encounter frequency. Reasonable target distribution per biome: common/uncommon should cover ordinary high/mid count fauna, rare should cover lower-count or dangerous specialists, epic should cover genuinely scarce/high-danger/large encounters, and legendary should be reserved for apex/one-off/top-end encounters. Use exact local data rather than this wording if it suggests a better threshold.
4. Add a lightweight regression check so future roster additions cannot accidentally make most fauna legendary again. The check should fail if active `biomeFish` legendary share is inflated, if a high-count school/common species is legendary, or if representative expected species regress.
5. If possible, prove the scan-log text path with a small deterministic script/test that formats representative `Cataloged <species> (<rarity>)` lines using the same helper functions or a minimal runtime/playtest scan. At minimum, include exact representative before/after labels in the report and audit JSON.

Verification required:
- `npx tsc --noEmit --pretty false`
- `npm run build`
- focused rarity audit/check command
- If you start Vite or a smoke server, use only ports 5180-5199. If a port is busy, pick another in range; never kill processes outside it. Confirm no listeners remain on 5180-5199 before returning.

Commit/staging safety:
- Classify dirty start with `git status --short` before edits and preserve unrelated dirt.
- Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.
- Make one commit if verification passes and commit safety is clean. If pre-existing dirty edits overlap files you must touch, work with them carefully and report exactly what was pre-existing vs yours.

Expected artifacts:
- `runs/water9-fauna-rarity-balance-2026-07-06/report.md`
- `runs/water9-fauna-rarity-balance-2026-07-06/fauna-rarity-audit.json`
- Any focused script/check you add
- Commit hash if committed

Return block:
- Status: PASS / BLOCKED
- Commit: hash or not committed with reason
- Changed files
- Rarity model summary
- Before/after legendary counts by biome and total
- Representative scan/log label examples
- Verification commands and results
- Caveats/blockers
