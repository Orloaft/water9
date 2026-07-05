# Water9 Fauna Animation Manager Final Appraisal

Status: REJECTED_FOR_ACCEPTANCE

Date: 2026-07-05

## Verdict

The newly added `fauna-exp-*` runtime fauna are integrated broadly enough to appear in normal gameplay, but the batch is not up to the established neutral-fauna animation bar yet. The strongest evidence is consistent across the inventory, static-frame, live-canvas, and articulated lanes: the new fish/small-life set relies heavily on 3-frame spritesheets with small same-canvas warps, and many entries read at gameplay scale as sliding still paintings rather than creatures with visible internal swimming motion.

The existing benchmarks still set the bar: Nautilus, Reef Squid, Glass Squid, Bigfin Squid, and Abyss Vampire Squid retain clearer silhouettes, stronger pose or appendage change, and better grayscale separation in live canvas proof.

## Evidence Reviewed

- Runtime inventory: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/inventory-runtime-report.md`
- Static frame audit: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-report.md`
- Live normal-play canvas proof: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-report.md`
- Articulated/runtime motion audit: `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-report.md`
- Live proof sheets inspected:
  - `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/live-contact-sheet-color.png`
  - `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/live-canvas-captures/live-contact-sheet-grayscale.png`
  - `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/frame-proof/benchmark-vs-new-fauna-frame-contact.png`
  - `/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/representative-phase-strip.png`

## What Passed

- Normal gameplay fish integration is not the blocker. The inventory found 138 biome fish entries, including 100 new `fauna-exp-*` entries, with expected packed frame manifests and runtime PNGs present.
- Several new entries are directionally promising: Kelp Arrow Squid, Glass Helm Nautilus, Moonmask Lionfish, Abyssal Thread Eel, Starless Lantern Eel, Cathedral Fin Ribbonfish, and Anchorfin Eel have stronger shape or path readability than the weakest fish.
- The live canvas lane captured actual `#game canvas` proof across normal play, with color and grayscale contact sheets. This is usable acceptance evidence, not only sandbox/review-page evidence.

## Why The Batch Fails The Bar

- Every newly added small-life set audited uses 3 frames, while the main neutral benchmarks are usually 4 frames or show materially stronger silhouette and lighting changes.
- Frame metrics show the systemic shortcut: new fauna have low area drift, low palette/lighting variance, and high near-duplicate scores relative to the benchmark set.
- In live canvas, many new entries lose readability in grayscale or against dark terrain/water, especially Blackwater Hatchet, Brightscale Halfbeak, Tideglass Cardinal, Saberfin Smelt, and eel-like or thin-body variants.
- Several entries move across the scene while body deformation stays subtle, making the animation read as translation rather than swimming.
- The articulated creature system is real, but it is not an accepted replacement bar yet: accepted articulated count is 0, prototype gating remains in force, `npm run articulated:validate` fails on normal-spawning legacy articulated threats, and the spawn-budget smoke misses a signature biome 4 creature.

## Priority Fix Recommendation

Fix acceptance by improving a focused subset before expanding the roster:

1. Raise representative weak entries from 3-frame twitch cycles to 4-frame cycles with visible body, fin, appendage, and silhouette change. Start with Saffron Paddle Cuttle, Glass Helm Nautilus, Blue Lantern Goby, Blackwater Hatchet, Tideglass Cardinal, Brightscale Halfbeak, Saberfin Smelt, and Nacre Thorn Clam.
2. Increase gameplay-scale grayscale separation for thin/dark fish, especially mid/deep and abyss entries.
3. Re-run the same acceptance package after fixes: static metrics, live normal-play color/grayscale `#game canvas` sheets, and a manager visual inspection against Nautilus/Reef Squid/Glass Squid/Bigfin/Abyss Vampire Squid.
4. Treat articulated fauna as a separate prototype-quality gate until validation passes, accepted counts are nonzero, and normal-gameplay proof shows the rigs at the expected standard.

## Verification

- HEAD reviewed: `d7aed9a` on `ux-work`.
- Source/asset dirty state was pre-existing fauna work and preserved.
- This manager synthesis added only this report under the run artifact directory and updated the manager ledger.
