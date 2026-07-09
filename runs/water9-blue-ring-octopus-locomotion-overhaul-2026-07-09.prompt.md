Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

You are `codex-dev` working in the Water9 repo only: `/mnt/nxt-dev/water9`.

Goal: overhaul the Blue Ring Octopus animation frames so they read as real octopus locomotion, not the current slight twitch/ring shimmer.

Context:
- Alex rejected the current runtime GIF because it only does a slight twitch.
- The prior runtime-clock fix is already dirty in the repo and must be preserved:
  - `src/scene-playtest.ts`
  - `src/scene-rendering.ts`
  - `tools/test_blue_ring_octopus_animation_smoke.mjs`
- Existing untracked proof folders may also be present. Do not delete or clean them.
- Current generated asset paths:
  - `public/assets/generated/fauna-shallow-blue-ring-octopus.png`
  - `public/assets/generated/fauna-shallow-blue-ring-octopus-0.png` through `-3.png`
  - `public/assets/generated/fauna-shallow-blue-ring-octopus.frames.json`
  - `public/assets/source/fauna-flora-source-art-slice-3/fauna-shallow-blue-ring-octopus-source*.png`
  - `public/assets/generated/small-life.manifest.json` has frame metadata that may need updating if frame count changes.

Hard scope:
- Do change Blue Ring Octopus generated/source asset files and any narrowly necessary generation helper or manifest metadata.
- Do not touch unrelated fauna/flora assets.
- Do not refactor runtime animation code unless you prove the asset cannot work otherwise; if runtime code changes are needed, stop and explain before broad edits.
- Do not commit or push.
- Preserve all pre-existing dirty files that are outside this task.

Create this report stub before long work:
`/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/worker-report.md`

Art direction and generation prompt:
- The new sequence must be a readable octopus travel cycle at small gameplay scale.
- Do not make a static octopus with shimmer. Do not make only small arm wiggles.
- The silhouette must change strongly frame-to-frame.
- Preferred cycle:
  1. compact ready pose, arms slightly spread and readable;
  2. arms gather under/behind body, mantle begins compressing;
  3. mantle squeeze/elongation for a jet pulse, body stretches forward, arms trail backward;
  4. strongest travel pose, rear arms swept back as a visible wake/trailing silhouette;
  5. recovery flare, arms open outward and forward again;
  6. settle toward compact ready pose.
- Aim for 6-8 frames at 8-10 fps if the existing loader/manifests support it cleanly. Do not keep four frames unless you document a real constraint.
- Maintain the Blue Ring identity: warm ochre/yellow body, vivid cobalt-blue rings, compact octopus read, eight arms or enough visible arms to read as octopus.
- Keep the asset painterly/game-sprite compatible, transparent/chroma-clean, centered enough to avoid anchor jitter, and readable at the existing gameplay display width.
- Avoid: squid/fish silhouette, symmetric starburst, large teleporting body jumps, cropped arms, muddy ring loss, pure color shimmer, static mantle with moving texture only.

Implementation guidance:
- Inspect the existing generation script before editing. If it has a Blue Ring Octopus frame function, prefer improving that function so the pipeline can be repeated.
- If using AI-generated bitmap sources, save the source and record the exact prompt in the report. Then integrate through the existing asset pipeline or matching manifest structure.
- If increasing frame count, update the spritesheet, loose frames, `.frames.json`, and any manifest/test expectations that declare frame count or loose frame paths.
- Produce a preview GIF or contact sheet that makes the travel cycle obvious.

Verification:
- Run `npm run build`.
- Run the focused Blue Ring Octopus smoke on an available port in 5180-5199. If the smoke script takes env vars for output/port, write outputs under:
  `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-locomotion-overhaul-2026-07-09/`
- Capture actual normal-play `#game canvas` proof in Biome 1 at gameplay scale:
  - full canvas screenshot/contact sheet
  - target crop contact sheet
  - grayscale crop/contact sheet
  - smoke JSON with sampled runtime frame indices
- Include a before/after frame sheet or GIF using the old and new frames.
- Metrics are not enough; your report must state whether the visual read is obviously no longer the old slight twitch.

Return:
- Status.
- Changed files.
- Exact generation prompt(s) used.
- Verification commands and results.
- Artifact paths.
- Caveats/blockers.

