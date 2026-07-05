# Water9 Fauna Static Frame and Image-Quality Audit

## Summary verdict

The new runtime fauna mostly do cut corners: all 101 newly-added/newly-modified fauna frame sets inspected use exactly three frames, while the established neutral-fauna benchmarks are usually four frames and show broader pose, silhouette, and lighting changes. The common pattern is a polished static painting with very small warps or translations in the same canvas, especially for fish and cuttle/nautilus-like entries. A subset of eel/ribbonfish bodies is benchmark-adjacent because the whole spine visibly bends, but even those are constrained by the same three-frame shortcut.

## Method and benchmark bar

- Repo pin and HEAD check: `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD` -> `d7aed9a`.
- Starting state: `git -C /mnt/nxt-dev/water9 status --short` was already dirty. Concise classification: 8 tracked modified files, all fauna/runtime related (`fauna-abyss-viperfish*`, `small-life.manifest.json`, `src/content.ts`, `src/helpers.ts`), plus 510 untracked paths including many generated `fauna-exp-*` PNG/frame manifests, review sheets, one tools script, and pre-existing run artifacts. This lane treated all existing dirt as user/other-worker work.
- Structured parser used: `public/assets/generated/small-life.manifest.json` and each `*.frames.json` manifest were parsed as JSON, then the referenced runtime spritesheet PNGs were sliced by declared `frameWidth`, `frameHeight`, `columns`, and `frameCount`.
- Metrics computed per `assetKey`: frame count, dimensions, alpha bounding boxes, centroid drift, alpha area drift, consecutive alpha-pixel delta, RGBA near-duplicate score, palette and lighting variance, canvas margins/alignment, loose-frame/sheet crop matching, and whether the base PNG is a spritesheet or frame 0.
- Benchmark bar: Nautilus (`fauna-shallow-nautilus`), Reef Squid (`fauna-shallow-squid`), Glass Squid (`fauna-deep-glass-squid`), Bigfin Squid (`fauna-abyss-bigfin-squid`), and Vampire Squid as a cuttle-like runtime benchmark (`fauna-abyss-vampire-squid`). These show either 4-frame cycles or, in Bigfin's 3-frame case, materially stronger silhouette/lighting changes than most new entries.

## Metrics comparison

| Metric | Benchmarks | New fauna |
|---|---:|---:|
| Runtime entries inspected | 5 benchmark assets | 101 new/modified fauna assets |
| Frame count | min 3, median 4, mean 3.8 | all 3 |
| Mean alpha-pixel delta | median 0.260, range 0.106-0.522 | median 0.153, range 0.042-0.577 |
| Area drift over mean | median 0.111, p75 0.341 | median 0.002, p75 0.004 |
| Centroid drift | median 1.30 px | median 1.03 px |
| Near-duplicate score | median 0.870 | median 0.910 |
| Palette variance | median 2.77 | median 0.104 |
| Lighting variance | median 2.69 | median 0.099 |

Interpretation: the new fauna often move alpha pixels, but the nearly zero area drift, low palette/lighting variance, and high near-duplicate scores show the frames are mostly static-source deformations rather than benchmark-level redraws or articulated pose changes. All base PNGs are spritesheets, not standalone frame-0 images. Loose `assetKey-N.png` frames exist for all new fauna; they match spritesheet crops in alpha, with only tiny RGB/hash differences from transparent/rounding noise.

## Ranked failures and weak entries

1. **FAIL: Nacre Thorn Clam** (`fauna-exp-nacre-thorn-clam`)  
   Evidence: mean alpha delta 0.042, near-duplicate score 0.939, area drift 0.017, palette variance 0.097. Visually it is a near-static shell with a tiny bob/opening; it falls below the benchmark bar for living fauna motion.  
   Proof: `frame-proof/worst-shortcuts-frame-contact.png`, row 1.

2. **WEAK: Saffron Paddle Cuttle** (`fauna-exp-saffron-paddle-cuttle`)  
   Evidence: mean alpha delta 0.073, centroid drift 0.67 px, area drift 0.011. Visually the whole animal is a polished static cuttle with a small edge/fin/tentacle warp; the benchmark cuttle/squid entries flex arms and mantle more convincingly.  
   Proof: `frame-proof/benchmark-vs-new-fauna-frame-contact.png`, `frame-proof/worst-shortcuts-frame-contact.png`.

3. **WEAK: Prism Bell Jelly** (`fauna-exp-prism-bell-jelly`)  
   Evidence: mean alpha delta 0.075, near-duplicate score 0.925, centroid drift 0.68 px. Tentacles twitch, but the bell/body remains too locked compared with the jelly/squid benchmark expectations.  
   Proof: `frame-proof/worst-shortcuts-frame-contact.png`.

4. **WEAK: Snowcap Snailfish** (`fauna-exp-snowcap-snailfish`)  
   Evidence: mean alpha delta 0.102, area drift 0.000, palette variance 0.014. The body is effectively the same painted fish with a tail/outline twitch.  
   Proof: `frame-proof/worst-shortcuts-frame-contact.png`.

5. **WEAK: Lumen Brow Barreleye** (`fauna-exp-lumen-brow-barreleye`)  
   Evidence: mean alpha delta 0.109, near-duplicate score 0.938, centroid drift 0.59 px. Visually reads as fin/tail-only motion with the body locked.  
   Proof: `frame-proof/worst-shortcuts-frame-contact.png`.

6. **WEAK: Glass Helm Nautilus** (`fauna-exp-glass-helm-nautilus`)  
   Evidence: mean alpha delta 0.097, area drift 0.002, lighting variance 0.008. Compared to the established Nautilus benchmark, its shell and body read as nearly static, with only small tentacle/edge motion.  
   Proof: `frame-proof/benchmark-vs-new-fauna-frame-contact.png`, `frame-proof/worst-shortcuts-frame-contact.png`.

Other weak tail/fin-twitch entries in the same pattern: `fauna-exp-ashveil-butterflyfish`, `fauna-exp-rustjaw-blenny`, `fauna-exp-pearl-eye-flounder`, `fauna-exp-aurora-fin-damselfish`, `fauna-exp-cinder-vent-clingfish`, and `fauna-exp-moonspot-drumfish`.

## Good enough / benchmark-adjacent

- **Abyssal Thread Eel** (`fauna-exp-abyssal-thread-eel`): PASS/benchmark-adjacent for static-frame quality. The whole spine waves across frames; mean alpha delta 0.404. Proof: `frame-proof/passable-candidates-frame-contact.png`.
- **Starless Lantern Eel** (`fauna-exp-starless-lantern-eel`): PASS/benchmark-adjacent. Clear whole-body undulation; mean alpha delta 0.349. Proof: `frame-proof/passable-candidates-frame-contact.png`.
- **Cathedral Fin Ribbonfish** (`fauna-exp-cathedral-fin-ribbonfish`): PASS/benchmark-adjacent. Body curve changes read as swimming rather than a tail twitch; mean alpha delta 0.274. Proof: `frame-proof/passable-candidates-frame-contact.png`.
- **Anchorfin Eel** (`fauna-exp-anchorfin-eel`): PASS/benchmark-adjacent. The spine and tail move together, though still only three frames; mean alpha delta 0.257. Proof: `frame-proof/passable-candidates-frame-contact.png`.
- **Abyssal Viperfish** (`fauna-abyss-viperfish`): visually stronger than the weakest fish because the long body and fins change, mean alpha delta 0.201, but it still shares the three-frame/low-area-drift shortcut. Proof: `frame-proof/benchmark-vs-new-fauna-frame-contact.png`.

## Systemic pattern

The corner cut is not low painterly quality; many individual stills look good. The shortcut is animation construction: exactly three frames for every new fauna, very small area/lighting changes, and repeated same-canvas deformations that make most fish read as static illustrations with tail/fin twitches. The worst cuttle/nautilus-like additions miss the benchmark's more obvious mantle, arm, shell-body, or whole-silhouette motion.

## Confidence and caveats

Confidence is high for frame-count, alpha, palette, and spritesheet-vs-loose-frame findings because they were computed directly from the generated PNGs and JSON manifests. Visual classifications are a static-frame audit only; live runtime interpolation, scaling, and movement behavior are intentionally outside this lane. Thin eel-like bodies can score high alpha delta from legitimate curve changes, so those were visually separated from actual redraw/crop instability.

## Verification performed

- `git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`
- `git -C /mnt/nxt-dev/water9 status --short`
- Parsed `public/assets/generated/small-life.manifest.json`
- Parsed all referenced runtime fauna `*.frames.json` manifests
- Sliced runtime spritesheets and computed metrics with Pillow/NumPy
- Wrote metrics JSON: `runs/water9-fauna-animation-appraisal-2026-07-05/frame-quality-metrics.json`
- Wrote proof sheets:
  - `runs/water9-fauna-animation-appraisal-2026-07-05/frame-proof/benchmark-vs-new-fauna-frame-contact.png`
  - `runs/water9-fauna-animation-appraisal-2026-07-05/frame-proof/worst-shortcuts-frame-contact.png`
  - `runs/water9-fauna-animation-appraisal-2026-07-05/frame-proof/passable-candidates-frame-contact.png`

## Git state after investigation

`git -C /mnt/nxt-dev/water9 status --short` remains dirty. Concise classification after this lane: 8 tracked modified files are still the pre-existing fauna/runtime files listed above; 510 untracked entries are present, including the pre-existing generated/review assets and this run directory. This lane only added/updated files under `runs/water9-fauna-animation-appraisal-2026-07-05/` and did not edit source, assets, config, package, or test files.

