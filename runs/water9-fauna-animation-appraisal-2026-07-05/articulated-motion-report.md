# Articulated Motion Audit

## Summary verdict
Articulated fauna are not yet up to the established neutral-fauna bar as a production-quality set. The runtime system is more than a static sprite swap: it has anchored parts, phase curves, lunge/grab/stun states, socket bridges, damage textures, and detached-part handling, but the content gate and validation evidence still mark the whole articulated set as prototype. Most importantly, the validator fails on two normal-spawning legacy articulated threats, and no articulated creature is accepted for the content gate.

## Runtime/prototype split
- Manifest inventory: 37 articulated creatures in `public/assets/generated/articulated-creatures.parts.json`; sandbox index also reports 37 articulated entries.
- Accepted/runtime: 0 accepted articulated threats. `public/review/articulated/review-manifest.json` has `acceptedCount: 0`; `public/review/content-acceptance-ledger.json` has no entries; `public/review/content-quality-gate-next.json` has `strictGateEligible: 0`.
- Normal gameplay legacy spawnable: `abyssal-serpent`, `abyssal-gulper`, `abyssal-crownmaw`, `abyssal-glasshook-skulk`, `abyssal-mandible-bobbit`. These spawn without prototype flags because `src/articulated.ts:312`-`src/articulated.ts:316` maps them to `legacy`, but their manifest quality remains `prototype`.
- Prototype/review-only: 32 manifests require `prototypeThreats`, `threats=prototype`, or `playtest` via `src/articulated.ts:241`-`src/articulated.ts:245` and `src/articulated.ts:331`-`src/articulated.ts:335`. The 20 content-candidate rows are runtime-registered but `prototype-needs-approved-source`, not accepted.
- Not spawned in normal gameplay: the prototype-only set includes `saber-viperfish`, `brine-crown`, `gulper-eel-maw`, `abyssal-reliquary-wyrm`, and the rest of the source-candidate/prototype roster unless prototype runtime is enabled.

## Motion-system findings
- Runtime loading comes from `public/assets/generated/articulated-creatures.parts.json`; if a part/overlay texture is missing, `ensureArticulatedTextures` creates ellipse placeholders and records placeholder keys. See `src/articulated.ts:261`-`src/articulated.ts:290` and `src/articulated.ts:342`-`src/articulated.ts:390`.
- Motion fields are real: parts carry `motion.kind`, amplitude, frequency, phase, and lag; runtime converts those into swim waves, jaw opening, fin flutter, body pitch, and lunge wake. See `src/scene-articulated.ts:1308`-`src/scene-articulated.ts:1359`, `src/scene-articulated.ts:1382`-`src/scene-articulated.ts:1397`, and `src/scene-articulated.ts:1526`-`src/scene-articulated.ts:1559`.
- State handling is present for idle/patrol, stalk, lunge, grab, recover, stunned, and bobbit burrow phases. The main update slows phase when stunned and boosts motion during lunge at `src/scene-articulated.ts:769`-`src/scene-articulated.ts:845`; bobbit has telegraph/emerge/lunge/drag/release/reset at `src/scene-articulated.ts:981`-`src/scene-articulated.ts:1170`.
- Socket and damage handling are implemented but unevenly populated by content. Anchored overlays bridge parent/child sockets at `src/scene-articulated.ts:1647`-`src/scene-articulated.ts:1723`; damaged/detached texture selection is in `src/scene-articulated.ts:1940`-`src/scene-articulated.ts:1962` and severed overlays at `src/scene-articulated.ts:1974`-`src/scene-articulated.ts:1995`.
- Large turn-history ripple motion is limited to selected IDs at `src/scene-articulated.ts:33`-`src/scene-articulated.ts:39` and `src/scene-articulated.ts:117`-`src/scene-articulated.ts:162`; most 5-part prototype rigs do not get the same body-following treatment.

## Quality gate status
- `npm run articulated:validate`: failed. It reported manifest texture-size mismatches for `abyssal-glasshook-skulk` and `abyssal-mandible-bobbit`, including part textures, socket textures, and wound/damaged variants; the validator checks these at `tools/validate_articulated_manifest.mjs:173`-`tools/validate_articulated_manifest.mjs:179`, `tools/validate_articulated_manifest.mjs:203`-`tools/validate_articulated_manifest.mjs:209`, and `tools/validate_articulated_manifest.mjs:233`-`tools/validate_articulated_manifest.mjs:239`.
- `npm run water9:articulated-spawn-budget-smoke`: failed. Rerun to `articulated-proof/spawn-budget-smoke.json` showed biome 4 count 9/budget 10 and missing `abyssal-reliquary-wyrm`, so the signature encounter was not preserved.
- `articulated:preview` equivalent: passed for the representative subset using `tools/render_articulated_contact_sheet.py`, generating contact and phase-strip proof under `articulated-proof/`. This proves deterministic assembly/phase preview only, not normal-gameplay acceptance.
- Sandbox screenshots: captured idle/lunge/stunned for `abyssal-gulper`, `abyssal-crownmaw`, `saber-viperfish`, and `abyssal-mandible-bobbit` through Vite on port 5180 with a run-local config that ignores `.desktop-build`. Every sandbox snapshot still reported `reviewStage: prototype`, `qualityStatus: prototype`, and `acceptedForContentGate: false`.

## Visual/motion concerns by creature, ranked
1. `abyssal-glasshook-skulk` and `abyssal-mandible-bobbit`: highest concern because existing validation fails and both are normal-spawning legacy runtime creatures. The failures look like manifest display-size values no longer matching actual PNG dimensions, which can invalidate hit/socket/damage assumptions.
2. All articulated fauna: no accepted articulated runtime content exists. Prototype preview labels are consistently enforced by the sandbox/review manifests, so these should not be counted as accepted neutral-fauna-quality replacements.
3. `abyssal-reliquary-wyrm`: prototype smoke expects this biome 4 signature but did not spawn it; current spawn priority/budget behavior can crowd it out.
4. `saber-viperfish`: visually rich in sandbox, but it is a 5-part source-candidate prototype, not normal gameplay runtime. Its phase strip shows limited whole-body deformation compared with bespoke legacy serpents.
5. 5-part source-candidate rigs generally: many use the same root/body/tail/upper-fin/lower-fin structure with one damaged core texture and no detached part textures, so they are useful review prototypes but not mature articulated motion content.

## Viperfish/prototype note
- Normal runtime viperfish remains small-life sprite-frame fauna: `src/content.ts:230` registers `Abyssal Viperfish` using `fauna-abyss-viperfish`, and `public/assets/generated/small-life.manifest.json:3189`-`public/assets/generated/small-life.manifest.json:3219` records 3 swim frames. `src/scene-worldgen.ts:1130` also uses `fauna-abyss-viperfish` for an Abyssal Thresher nest-room predator.
- The recent bespoke viperfish files under `public/review/exploration-life-2026-07-04/` are review/prototype evidence, not articulated normal-runtime replacement.
- `saber-viperfish` is the articulated viperfish-like source-candidate prototype: `public/assets/generated/articulated-creatures.parts.json:14723` and `public/review/content-runtime-coverage.json:241`-`public/review/content-runtime-coverage.json:251` mark it as prototype/runtime-registered but awaiting source/rig acceptance.

## Confidence and caveats
Confidence is medium-high for the runtime/prototype split and automated gate status because it comes directly from manifests, source code, and executed checks. Confidence is medium for visual motion quality because I used representative phase strips and sandbox proof, not long normal-play capture. One caveat: the first spawn-budget smoke used the script default report path before I reran it with an allowed report path; I did not modify source/assets/config/test files.

## Verification performed
- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `d7aed9a`.
- `git -C /mnt/nxt-dev/water9 status --short` before and after investigation. Existing dirt is fauna/content-heavy: modified viperfish runtime PNGs/frame manifest, `small-life.manifest.json`, `src/content.ts`, `src/helpers.ts`, many untracked generated `fauna-exp-*` sprite-frame assets, viperfish review artifacts, and an untracked build tool. My new files are confined to `runs/water9-fauna-animation-appraisal-2026-07-05/`.
- `npm run articulated:validate` -> failed as described.
- `npm run water9:articulated-spawn-budget-smoke` -> failed as described; allowed rerun report is `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/spawn-budget-smoke.json`.
- Contact/phase proof: `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/representative-contact-sheet.png` and `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/representative-phase-strip.png`.
- Sandbox proof JSON and screenshots: `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-proof/sandbox-screenshots.json` and `sandbox-*-idle/lunge/stunned.png` in the same directory.
- Audit JSON: `runs/water9-fauna-animation-appraisal-2026-07-05/articulated-motion-audit.json`.

## Git state after investigation
The final `git status --short` still shows the pre-existing fauna/source dirt plus the new run report directory. Concise classification: source/assets remain dirty from other workers; this audit added only report/proof files under `runs/water9-fauna-animation-appraisal-2026-07-05/`.

```text
 M public/assets/generated/fauna-abyss-viperfish-0.png
 M public/assets/generated/fauna-abyss-viperfish-1.png
 M public/assets/generated/fauna-abyss-viperfish-2.png
 M public/assets/generated/fauna-abyss-viperfish.frames.json
 M public/assets/generated/fauna-abyss-viperfish.png
 M public/assets/generated/small-life.manifest.json
 M src/content.ts
 M src/helpers.ts
?? public/assets/generated/exploration-life-2026-07-04/alpha/fauna-abyss-viperfish-bespoke.png
?? public/assets/generated/exploration-life-2026-07-04/source/fauna-abyss-viperfish-bespoke-source-chroma.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-0.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-1.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel-2.png
?? public/assets/generated/fauna-exp-abyssal-thread-eel.frames.json
?? public/assets/generated/fauna-exp-abyssal-thread-eel.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-0.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-1.png
?? public/assets/generated/fauna-exp-amber-comb-blenny-2.png
?? public/assets/generated/fauna-exp-amber-comb-blenny.frames.json
?? public/assets/generated/fauna-exp-amber-comb-blenny.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-0.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-1.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish-2.png
?? public/assets/generated/fauna-exp-amber-snout-boxfish.frames.json
?? public/assets/generated/fauna-exp-amber-snout-boxfish.png
?? public/assets/generated/fauna-exp-anchorfin-eel-0.png
?? public/assets/generated/fauna-exp-anchorfin-eel-1.png
?? public/assets/generated/fauna-exp-anchorfin-eel-2.png
?? public/assets/generated/fauna-exp-anchorfin-eel.frames.json
?? public/assets/generated/fauna-exp-anchorfin-eel.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-0.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-1.png
?? public/assets/generated/fauna-exp-ancient-mask-angler-2.png
?? public/assets/generated/fauna-exp-ancient-mask-angler.frames.json
?? public/assets/generated/fauna-exp-ancient-mask-angler.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-0.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-1.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish-2.png
?? public/assets/generated/fauna-exp-ashveil-butterflyfish.frames.json
?? public/assets/generated/fauna-exp-ashveil-butterflyfish.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-0.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-1.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish-2.png
?? public/assets/generated/fauna-exp-aurora-fin-damselfish.frames.json
?? public/assets/generated/fauna-exp-aurora-fin-damselfish.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-0.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-1.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse-2.png
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse.frames.json
?? public/assets/generated/fauna-exp-basalt-lantern-seahorse.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-0.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-1.png
?? public/assets/generated/fauna-exp-black-velvet-cusk-2.png
?? public/assets/generated/fauna-exp-black-velvet-cusk.frames.json
?? public/assets/generated/fauna-exp-black-velvet-cusk.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-0.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-1.png
?? public/assets/generated/fauna-exp-blackwater-hatchet-2.png
?? public/assets/generated/fauna-exp-blackwater-hatchet.frames.json
?? public/assets/generated/fauna-exp-blackwater-hatchet.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-0.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-1.png
?? public/assets/generated/fauna-exp-blue-lantern-goby-2.png
?? public/assets/generated/fauna-exp-blue-lantern-goby.frames.json
?? public/assets/generated/fauna-exp-blue-lantern-goby.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-0.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-1.png
?? public/assets/generated/fauna-exp-bluefire-dragonet-2.png
?? public/assets/generated/fauna-exp-bluefire-dragonet.frames.json
?? public/assets/generated/fauna-exp-bluefire-dragonet.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-0.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-1.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet-2.png
?? public/assets/generated/fauna-exp-blueflame-grouperlet.frames.json
?? public/assets/generated/fauna-exp-blueflame-grouperlet.png
?? public/assets/generated/fauna-exp-blueglass-anthias-0.png
?? public/assets/generated/fauna-exp-blueglass-anthias-1.png
?? public/assets/generated/fauna-exp-blueglass-anthias-2.png
?? public/assets/generated/fauna-exp-blueglass-anthias.frames.json
?? public/assets/generated/fauna-exp-blueglass-anthias.png
... 438 more status lines omitted in report; full status is in articulated-motion-audit.json
```
