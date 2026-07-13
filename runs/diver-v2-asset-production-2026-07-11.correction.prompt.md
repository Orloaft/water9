# Correction: redraw rejected diver v2 pixel production art

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Continue the existing Water9 diver v2 asset run in `/mnt/nxt-dev/water9`. Read the original prompt, report, manager ledger rejection, selected master board, all review sheets, production cells, scripts, and manifest. Preserve the selected high-resolution master, useful validation tooling, palette/manifest contract, prompts, and lineage. Do not recapture or change game source.

The first pixel-production pass is visually rejected. Its validator PASS does not override these concrete failures:

- The pixel diver looks like a generic schematic avatar rather than the selected compact industrial pressure suit.
- Arms and legs are thin stick-like segments; boots/fins, gloves, elbows, knees, shoulder armor, and waist mass are underbuilt.
- Helmet, torso, and backpack lack the selected master's heavy interlocking mass; hover looks top-heavy and cruise looks like a helmet towing lines.
- Brass/rubber/steel materials collapse into broad flat shapes without enough disciplined 2–4 px clusters to preserve industrial richness.
- Scanner is a tiny floating cyan rectangle at the end of a straight generic arm. The body does not convincingly deploy, brace, aim, hold, and recover a tool.
- The 30 px preview loses anatomy and action intent; 44 px is only barely adequate. The replacement must improve these reads, not merely enlarge labels or effects.

Correction objective: redraw the 31 body cells and 9 scanner attachments from stronger native pixel masters that remain faithful to the selected master while obeying the 16–24-color, binary-alpha, 128×96, pivot/socket, safe-bounds, and mirroring constraints.

Specific art changes required:

1. Build a compact continuous torso/hip/pack silhouette with overlapping armored masses. Increase shoulder, forearm/glove, thigh, knee, boot/fin thickness; eliminate one-pixel or near-one-pixel limb stems at gameplay scale.
2. Preserve a large cyan visor but reconnect it visually to a substantial neck ring/chest/pack so the helmet does not float.
3. Use disciplined mid-size pixel clusters for brass rims, dark rubber joints, steel cylinders, and cyan visor planes. Keep palette locked, edges crisp, and no painterly noise.
4. Give idle a visible buoyant settle through weighted boot/fins, asymmetric but mirror-safe arm posture, and small breathing/float motion while the helmet/torso root stays registered.
5. Make cruise a powerful 2.1:1 compact horizontal silhouette: tucked bracing arm, working arm readable, tank/torso/helmet forming one coherent body, thick paired legs/fins with distinct kick phases.
6. Scanner must be unmistakable without effect/HUD: use a substantial wrist/handheld industrial scanner head connected to the glove, one working arm presenting it, rear arm bracing the wrist/chest or balancing the body, helmet aimed toward the device/target. Deploy/hold/recover need visibly distinct anticipation, presentation, lock, and withdrawal poses. Avoid a straight stick arm and floating tool.
7. At 30 px, the silhouette must still show helmet, pack, torso, two limb groups, and scanner intent. If needed, simplify interior detail but do not thin structural masses.

Work key-pose-first: correct `idle_hover_00`, `swim_cruise_00`, `scanner_deploy_02`, and `scanner_scan_hold_00`; make a focused review sheet comparing corrected keys against both the rejected keys and selected master at 1×/2×/30/44/60 px. Only after those four keys visibly pass your own critical review should you propagate the style to all required in-betweens. Do not solve this by regenerating independent AI frames; author consistent pixel art from the locked master.

Regenerate every dependent color/grayscale, mirror, onion, action-read, gameplay-scale, and comparison sheet. Re-run the validator. Update report, visual-inspection record, prompt/lineage, hashes, and readiness verdict. Explicitly document how each named rejection was removed, with side-by-side before/after evidence. Do not claim runtime acceptance.

Write only inside `runs/diver-v2-asset-production-2026-07-11/`. Preserve unrelated dirt. No commit required. If committing becomes necessary: Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Return: status, updated report, corrected artifact paths, before/after review path, validator result, blunt art-review verdict, and blockers/caveats.
