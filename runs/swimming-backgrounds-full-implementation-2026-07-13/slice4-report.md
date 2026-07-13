# Swimming Backgrounds Slice 4 — Interaction Polish and Sustained Performance

Status: **implemented; integrated acceptance remains blocked by the strict B4 cadence gate, deep-darkness ceiling, and external review gates**

Date: 2026-07-13

Branch: `swimming-backgrounds`

Starting HEAD: `cd0447c79559dcdffbc15dfa9ce6a7a8f10650f5`

## Result

Slice 4 integrates a bounded, deterministic local-separation policy; protects
the diver, the nearest actionable threat, and prompt backing without a global
veil; attenuates landmark focal points along interaction corridors; controls
close-range non-dangerous anatomy on giant articulated threats while keeping
dangerous parts and authoritative hit geometry unchanged; fixes deep-B4
staging; and adds an auditable three-seed traversal/recognition evidence set.

The interaction and composition gates pass. The final strict B4 presentation
gate still fails and is not relabelled: Water9's own outer-frame work is within
budget, but Chromium's Canvas shared-image production/presentation path creates
33–50 ms cadence and post-warmup long tasks. A full browser trace, three bounded
rejected experiments, and the unweakened 5 s + 25 s rerun are archived.

## Product changes

- `LOCAL_SEPARATION_POLICY` centralizes six-target bounding, eight-step smooth
  falloff, threat/actionable ranges, prompt colors, corridor radius, edge
  treatment, and large-threat presentation floors.
- A local backdrop is composited above background/landmark layers and below
  navigation terrain. It only uses already-visible threats and loose items, so
  it cannot reveal hidden entities or modify simulation state.
- A priority-edge layer is composited above darkness and below HUD/overlay.
  It protects the legacy diver and only the nearest immediate actionable
  threat, avoiding an all-threat ring field.
- Floating interaction text now has a deterministic `#020509` backing and
  padding. The worst tested foreground/backing pair is 6.3744:1.
- Landmark focal alpha is smoothly reduced along player-to-interaction
  corridors. Seed, chunk, revisit, and cutoff identity remain unchanged.
- At close range, non-dangerous giant-threat body/tail rendering is smoothly
  capped while root/dangerous anatomy retains stronger scale/alpha floors.
  World coordinates, collision capsules, reach, bite geometry, and dangerous
  telegraphs remain authoritative and unchanged.
- The upper→mid cutoff blend is 200 m and lower→transition-deep is 220 m. The
  other spans remain 160 m; all exceed the 120 m minimum.
- `stageDeepBiomePresentation` searches existing B4 deep water, reports the
  requested and actual biome/depth and enclosure, relocates an existing runtime
  encounter for repeatable presentation, and never carves terrain.
- Normal-play review captures can explicitly request the normal threat roster;
  performance evidence retains the intended prototype/busy load.
- No new art was generated, no bitmap integration path changed, V3 was not
  promoted, and the legacy diver remains the default.

## Exact measurement method

Contrast samples exclude DOM HUD pixels and use the raw `#game canvas`. The
draw, authoritative ROI query, and pixel read occur atomically in one browser
evaluation. The diver priority ellipse, hostile-fish presentation/hit ellipse,
or dangerous articulated-part hit ellipse is sampled with 64 rays. Each ray
samples the normalized 0.40–0.62 ellipse-boundary band in 0.005 increments and
contributes its peak-to-trough composited luma; the reported edge contrast is
ray p75. Only visible, immediate actionable threats are eligible.

Prompt contrast is WCAG relative luminance against the actual deterministic
backing. Landmark occupancy uses clipped on-canvas area; interaction-corridor
overlap uses the deterministic composition corridor. Full-frame live cutoff
luma includes moving terrain/fauna and is context only; the controlled
2,576-profile smoke is the authoritative interpolation check.

## Visual and accessibility evidence

The final matrix contains 84 normal-play HUD/runtime frames: four biomes ×
three seeds (`101`, `202`, `303`) × seven representative/cutoff-straddling
depths, with color and grayscale captures. Six additional B3/B4 threat/prompt
captures exercise adversarial interaction states.

- Diver edge contrast: 30/30 sampled deep frames at or above 25 luma points
  (**100%, PASS**, target at least 95%).
- Actionable-threat edge contrast: 6/6 at or above 25 (**100%, PASS**). Exact
  samples range from 160.87 to 171.87 luma points.
- Prompt contrast: **6.3744:1, PASS** against the composited `#020509` backing
  (target 4.5:1).
- Landmark visible occupancy: **12.8998% maximum, PASS** against 45%.
- Deterministic projected landmark occupancy: **18.5294% maximum, PASS**.
- Interaction-corridor overlap: **0/96 composition frames, PASS** against the
  5% seeded-frame limit.
- Revisit, chunk, cutoff-identity, and composition misses: **0**. Dominant and
  supporting slots remain at one each.
- Controlled final live cutoff proof: max adjacent mean-luma delta **1.55**,
  max below-luma-24 delta **9.00 percentage points**, position pop **0 px**;
  deterministic alpha jump is **0.053996**, all PASS.
- The broader traversal's live full-frame cutoff maxima are 9.62 luma and
  34.05 below-luma-24 points. They are not treated as the background-only gate
  because moving terrain/fauna differs between frames; the values remain in the
  evidence for audit.
- Deep below-luma-24 maximum is **89.00%, FAIL** against the carried 80% ceiling.
  This was not hidden with a blanket exposure lift.

Compared with the Slice 3 reference, the B4 gulper no longer occupies the
center as a screen-swallowing wall: representative final captures keep the
diver centered, constrain the gulper to a controlled side crop, preserve the
jaw telegraph, and retain negative space in color and grayscale. This is worker
evidence, not manager visual acceptance; no unsupported pixel-segmentation
number is claimed for the old screenshot.

## Recognition deck

`visual-matrix/recognition/` contains 12 randomized raw-canvas cards at a common
760 m depth: three seeds per biome. Cards contain no HUD, quest/depth text, or
biome label. `recognition-index.json` is the anonymous review surface and the
answer key is a separate file.

Human reviews performed: **0**. Therefore no three-reviewer or 80% recognition
claim is made. The deck is ready for independent review, but that external gate
remains open.

## Reliable B4 staging

The focused staging smoke requested B4 at 1650 m and settled at actual B4,
1650 m in `open-deep-water` (`localWaterRatio=1`,
`boundarySolidRatio=0`), with `terrainModified=false`. The authoritative
performance run requested and reached B4, 1650 m in a
`mixed-deep-corridor` (`localWaterRatio=0.943`,
`boundarySolidRatio=0.119`), also without terrain mutation. The final visual
seeds settled at 1650, 1656, and 1650 m in open/mixed existing deep water. The
old silent 1650→552 m fallback is eliminated.

## Trace-backed performance diagnosis

The diagnostic 5 s warmup + 25 s trace ran at actual B4 1650 m. Its independent
rAF p95/p99 was 33.3/33.4 ms with 2.67% over 33.34 ms, while outer-frame p95
was 5.0 ms and background composite p95 was 0.8 ms.

Trace aggregates provide the missing attribution:

- `ProxyMain::BeginMainFrame`: 23,979.0 ms / 1,424 events, max 37.07 ms.
- `LayerTreeHost::DoUpdateLayers`: 17,681.3 ms / 1,425, max 26.2 ms.
- `Canvas2DResourceProviderSharedImage::ProduceCanvasResource`: 17,629.0 ms /
  2,850 (two per presented frame), max 25.248 ms.
- `AnimationCallback`: 5,200.0 ms / 1,424, max 21.6 ms.
- `MajorGC`: 35.6 ms total.

Canvas shared-image production/compositor presentation accounts for the wall
time missing from Water9's instrumentation. Three trace-directed experiments
were bounded and rejected: `desynchronized` worsened over-33.34-ms frames to
22.41% and introduced a 64 ms task; `willReadFrequently` produced 11.76% in a
short run; an 80% backing store produced 11.33%, p99 50 ms, outer p95 8.5 ms,
and composite p95 1.2 ms. All were reverted. Full resolution, intended load,
and observation duration remain intact.

The final unweakened authoritative run remains **FAIL**:

- requested/actual: B4 1650/1650 m; no terrain mutation;
- independent rAF: p95 **33.4 ms**, p99 **50.0 ms**, max **100 ms**;
- over 33.34 ms: **14.98%** (167/1,115), target under 1%;
- post-warmup long tasks: **9 over 50 ms**, max **91 ms**;
- `outer.frameTotal` p95: **6.5 ms, PASS** (target at most 8 ms);
- internal `frameTotal` p95: **4.7 ms**;
- combined background/water/landmark/darkness p95: **1.1 ms, FAIL** by
  0.1 ms against the 1 ms threshold.

For comparison, Slice 3's unresolved-552 m run reported rAF p95/p99
33.4/33.4 ms, 9.43% over 33.34 ms, outer p95 4.8 ms, and composite p95
0.7 ms. The final run is a genuinely deeper/heavier scenario, not a claimed
performance improvement.

## Verification

PASS:

- `npm run build` (final production build).
- `npm run water9:interaction-readability-smoke`: 156 deterministic rows,
  four biomes, three seeds, all cutoff straddles, prompt 6.3744:1, exact deep
  staging, layer order, and giant-threat alpha/scale floors.
- save/load and save/load entity-lifecycle smokes.
- biome creature-balance, depth-band continuity, lighting visibility,
  background composition, swimming/camera feel, progression/radio, controller
  independent movement invariants, large-threat ripple turning, articulated
  terrain collision, and aggro-cue smokes.
- background composition: 96 frames / 192 cutoff comparisons, max projected
  area 18.5294%, corridor overlap 0, revisit/cutoff/chunk misses 0.
- continuity: 2,576 profiles, max alpha delta 0.053996, clear-channel delta 1,
  position delta 0 px.

HONEST FAIL / INHERITED OR OPEN:

- Strict settled B4 Canvas cadence: FAIL as detailed above.
- `npx tsc --noEmit --pretty false`: exit 2 with the same inherited 25
  diagnostics/families; no new diagnostic family was introduced.
- Sonar/controller smoke completed but failed `X button did not scan nearby
  life` and `right trigger analog value did not invoke mining` in the isolated
  rerun.
- Forward-outpost smoke retains the existing `Descend at least 900m` fixture
  failure.
- Legacy large-threat drill-immunity smoke retains the existing
  `missing-normal-fauna` fixture failure.
- Human blind recognition (three independent reviewers): not performed.
- Manager inspection/visual acceptance: not performed by this worker.

## Evidence and provenance

Artifact root:
`/home/orlovboros/artifacts/managers/water9/swimming-backgrounds-full-implementation-2026-07-13/slice4/`

Key paths:

- Matrix measurements:
  `visual-matrix/visual-evidence.json`
- Normal-play matrix: `visual-matrix/normal-play/`
- Adversarial B3/B4 color/grayscale: `visual-matrix/adversarial/`
- Anonymous deck: `visual-matrix/recognition-index.html` and
  `visual-matrix/recognition-index.json`
- Controlled cutoff proof: `continuity-final/slice1-visual-evidence.json`
- Browser trace:
  `performance-trace/b4-canvas-25s-trace.json`
- Traced run report:
  `performance-trace/b4-canvas-traced-25s.json`
- Final strict run:
  `performance-authoritative/b4-canvas-strict-25s.json`
- Trace analysis:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-trace-analysis.json`
- SHA-256 artifact manifest:
  `runs/swimming-backgrounds-full-implementation-2026-07-13/slice4-artifacts.json`
  (**246 files, 167,659,759 bytes**).

The manifest records role, byte size, SHA-256, provenance, capture conditions,
actual/requested deep staging where applicable, and explicit accepted/rejected
evidence status. Bulky PNG and trace artifacts remain outside git.

## Remaining decisions

1. The release-gating B4 presentation cadence is still red. The trace points to
   Chromium Canvas resource presentation, but the gate must remain a FAIL until
   the target environment passes or an explicitly authorized renderer/product
   strategy changes.
2. Decide whether the 89% deep-darkness ceiling requires another bounded art
   pass; immediate diver/threat/prompt contrast now passes without a blanket
   lift.
3. Run three independent blind reviews against the anonymous deck.
4. Manager must inspect the normal-play color/grayscale evidence and make the
   final visual-acceptance decision.
