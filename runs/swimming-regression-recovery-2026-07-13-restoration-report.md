# Swimming Regression Recovery — Known-Good Restoration

Date: 2026-07-13  
Branch: `swimming-backgrounds`  
Control: `04f9e4d`  
Starting HEAD: `1a909693748dfe2da2792ef85a933358943bdb6a`

## Result

The rejected swimming-backgrounds product stack was removed with a forward
restoration. `package.json` and the complete runtime source tree now match the
known-good `04f9e4d` product boundary byte-for-byte. Historical proposal
commits, reports, manifests, capture tools, and evidence remain in history and
were not rewritten.

Exact product paths restored:

- `package.json`
- `src/articulated.ts`
- `src/helpers.ts`
- `src/hud.ts`
- `src/main.ts`
- `src/scene-articulated.ts`
- `src/scene-entities.ts`
- `src/scene-playtest.ts`
- `src/scene-rendering.ts`
- `src/scene.ts`
- `src/state.ts`
- `src/types.ts`
- removed post-control additions `src/interaction-readability.ts` and
  `src/swimming-feel.ts`

## Equivalence proof

Before commit, both commands were clean:

```text
git diff --exit-code 04f9e4d -- package.json src
exit 0

git diff --name-status 04f9e4d -- package.json src
(no output)
```

This also provides the clean runtime/config A/B equivalence check: the restored
working tree and `04f9e4d` contain identical `package.json` and `src` content.

The restored behavior specifically includes:

- legacy speed-selected `diver-idle-*` / `diver-swim-*` state and original
  display-width rules, with no input-intent coast/brake/vertical selector;
- exact per-frame camera centering via
  `cameras.main.centerOn(player.x, player.y)`, with no lead/spring or
  threat-driven offset/zoom;
- old swim authority: 300 base thrust (620 at the boat), +34 per upgrade,
  1.45 drag while propelling, and 2.65 drag while coasting.

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | PASS; Vite production build completed. Existing unresolved-at-build asset and chunk-size warnings remain. |
| `npx tsc --noEmit --pretty false` | Inherited exit 2 with the same 25 control diagnostics; no repair was attempted. |
| articulated terrain/collision constraints smoke | PASS. |
| save/load smoke | PASS. |
| sonar/controller smoke | PASS. |
| focused articulated playtest | FAIL against the post-control fixture: removed post-control review APIs/semantics produce missing creature/UI/joint assertions. This fixture is not valid at the restored product boundary and was not weakened or repaired. |
| general performance guardrails | Non-representative FAIL after the incompatible focused playtest left a single 26.8 s cadence sample and missing metrics; retained as evidence and not used for the baseline verdict. |
| `04f9e4d` B4 control-compatible harness | Honest FAIL: 222 independent-rAF samples, p95/p99 33.3/33.4 ms, 2.70% over 33.34 ms; outer-frame p95 5.3 ms; draw-total max 8.3 ms. The old staging request for 1650 m resolved to 600 m, which is itself a control limitation. |

The B4 measurement used the exact `04f9e4d` harness streamed from git with
only its relative import path adapted for stdin execution. Thresholds and test
logic were unchanged.

## Runtime visual proof and inspection

Bulky proof is outside git at:

`/home/orlovboros/artifacts/managers/water9/swimming-regression-recovery-2026-07-13/restored-control/`

`runtime-captures/manifest.json` inventories 10 actual normal-play `#game
canvas` states at 1440x900 and their color/grayscale pairs: representative B1
surface (78 m), B2 mid (756 m), B3 deep (1248 m), B4 deep (1650 m), plus B1,
B3, and B4 cutoff pairs. All captures report started, alive, unpaused play with
no radio/logbook/cargo/sonar/loading overlay and no browser errors. The manifest
records exact file hashes, live legacy-diver texture keys, and centered-camera
deltas of at most 0.5 world pixel.

Worker visual inspection found the expected pre-proposal presentation restored:

- the legacy diver pose/scale is coherent and clearly readable in B1, B2, and
  B4 representative frames;
- hard-centered framing is visible across all representative captures;
- no Slice 1–4 local-separation ellipses, landmark grammar, threat LOD, or
  camera-lead treatment remains;
- B1 cutoff frames retain the old abrupt/simple presentation; B3/B4 cutoff
  frames can change sharply depending on threat/terrain staging.

Known control weaknesses remain visible and are not acceptance claims: the B3
deep grayscale frame nearly loses the diver against a screen-filling structure,
the B4 environment is structure-heavy, and one B4 cutoff frame is dominated by
an attacking gulper. This is restoration evidence only; manager and Alex
acceptance remain external.

## Evidence index

- normal-play captures and manifest: `restored-control/runtime-captures/`
- save/load: `restored-control/save-load-smoke.json`
- sonar/controller: `restored-control/sonar-map-controller-smoke.json`
- focused playtest and screenshots: `restored-control/playtest-report.json`,
  `restored-control/playtest-screens/`
- general perf guardrail evidence: `restored-control/perf-guardrails-smoke.json`
- control-compatible B4 report and canvas pairs:
  `restored-control/b4-control-harness/`

No artifact above is tracked in git.
