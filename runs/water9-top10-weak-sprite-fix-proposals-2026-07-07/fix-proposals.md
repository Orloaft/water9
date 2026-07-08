Status: complete

# Top 10 Weak Sprite Fix Proposals

- Session key: `top10-weak-sprite-fix-proposals`
- HEAD observed from preflight: `971e654`
- Scope: candidate assets only; no runtime/source/manifests changed.
- Imagegen: skill was read; not used because every offender had a viable local source-pixel repair candidate.
- Candidate contact sheets:
  - `top10-fix-candidates-contact.png`
  - `top10-fix-candidates-contact-gray.png`
- Runtime preview: `runtime-preview/top10-depth-band-preview.png`

## 1. `biolume-rock-0`

- Current failure: Broken sheet remnant/wrong crop: top strip and extra sibling pixels read as source-sheet debris.
- Proposed fix type: `crop repair`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/biolume-rock-0/biolume-rock-0-candidate.png`
- Source/edit target: public/assets/generated/biolume-rock-0.png; checked source slice public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-0-source.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 76x56, transparent dirty RGB pixels 0, white-matte ratio 0.04498.
- Expected gameplay benefit: Leaves one clean luminous nodule silhouette with the sheet strip removed.
- Risk/caveat: The repaired crop keeps only the strongest local nodule; Alex should confirm whether the discarded sibling fragment was intentional.
- Recommendation: `needs Alex art review`

## 2. `biolume-rock-1`

- Current failure: Broken sibling crop: the right edge includes a clipped second nodule from the sheet.
- Proposed fix type: `crop repair`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/biolume-rock-1/biolume-rock-1-candidate.png`
- Source/edit target: public/assets/generated/biolume-rock-1.png; checked source slice public/assets/source/fauna-flora-source-art-slice-1/biolume-rock-1-source.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 118x78, transparent dirty RGB pixels 0, white-matte ratio 0.00485.
- Expected gameplay benefit: Centers the complete left nodule and removes the clipped sibling, so it no longer reads like a sheet fragment.
- Risk/caveat: Composition changes from a clustered rock to a single nodule; should be approved by art direction before runtime swap.
- Recommendation: `needs Alex art review`

## 3. `fauna-abyss-goblin-shark`

- Current failure: White fringe/pale magenta matte halo and flat pink body pop against abyss water.
- Proposed fix type: `rematte`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-abyss-goblin-shark/fauna-abyss-goblin-shark-candidate.png`
- Source/edit target: public/assets/generated/fauna-abyss-goblin-shark.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 360x64, transparent dirty RGB pixels 0, white-matte ratio 0.0.
- Expected gameplay benefit: Darkens semitransparent edge pixels, removes pale matte RGB, and adds an abyss-violet body read without changing frame geometry.
- Risk/caveat: Local rematte preserves anatomy but may still feel too stylized compared with newer painted fauna.
- Recommendation: `approve for integration`

## 4. `fauna-deep-barreleye`

- Current failure: Soft upscale/muddy grayscale: face and body smear together at 34 px gameplay width.
- Proposed fix type: `hybrid rescale/crop + recolor/contrast`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-deep-barreleye/fauna-deep-barreleye-candidate.png`
- Source/edit target: public/assets/generated/fauna-deep-barreleye.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 150x40, transparent dirty RGB pixels 0, white-matte ratio 0.09903.
- Expected gameplay benefit: Increases in-frame body coverage, sharpens edges, and lifts the dome/eye contrast for a clearer species read.
- Risk/caveat: Small-frame local repair cannot add true new anatomy; final art pass could still outperform it.
- Recommendation: `approve for integration`

## 5. `fauna-deep-gulper-eel`

- Current failure: Dark-on-dark/muddy grayscale: body collapses into deep water outside the mouth.
- Proposed fix type: `recolor/contrast`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-deep-gulper-eel/fauna-deep-gulper-eel-candidate.png`
- Source/edit target: public/assets/generated/fauna-deep-gulper-eel.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 258x50, transparent dirty RGB pixels 0, white-matte ratio 0.01301.
- Expected gameplay benefit: Keeps the strong mouth silhouette while lifting dorsal planes and rim contrast.
- Risk/caveat: More visible highlights make the eel less cryptic; tune lower if it distracts in motion.
- Recommendation: `approve for integration`

## 6. `fauna-abyss-black-swallower`

- Current failure: Dark-on-dark/muddy grayscale: bulky body reads as one low-contrast lump.
- Proposed fix type: `recolor/contrast`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-abyss-black-swallower/fauna-abyss-black-swallower-candidate.png`
- Source/edit target: public/assets/generated/fauna-abyss-black-swallower.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 390x54, transparent dirty RGB pixels 0, white-matte ratio 0.01143.
- Expected gameplay benefit: Adds cold rim light and midtone body separation while keeping the black-swallower identity.
- Risk/caveat: Could become too similar to the gulper eel if both are integrated without side-by-side tuning.
- Recommendation: `needs Alex art review`

## 7. `fauna-abyss-frilled-shark`

- Current failure: Thin low-contrast silhouette becomes a narrow dark slash in abyss captures.
- Proposed fix type: `hybrid rescale/crop + recolor/contrast`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-abyss-frilled-shark/fauna-abyss-frilled-shark-candidate.png`
- Source/edit target: public/assets/generated/fauna-abyss-frilled-shark.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 186x32, transparent dirty RGB pixels 0, white-matte ratio 0.02878.
- Expected gameplay benefit: Slightly thickens the alpha mass and adds dorsal highlights so the long shark reads in color and grayscale.
- Risk/caveat: The species is naturally slender; over-thickening may weaken the frilled-shark character.
- Recommendation: `needs Alex art review`

## 8. `fauna-abyss-snipe-eel`

- Current failure: Too thin/tiny at gameplay scale; the needle body is almost a line.
- Proposed fix type: `rescale/crop`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-abyss-snipe-eel/fauna-abyss-snipe-eel-candidate.png`
- Source/edit target: public/assets/generated/fauna-abyss-snipe-eel.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 264x52, transparent dirty RGB pixels 0, white-matte ratio 0.00737.
- Expected gameplay benefit: Raises coverage inside the same frame and adds a subtle cool silhouette underlay for gameplay readability.
- Risk/caveat: A readability repair trades away some needle-thin accuracy; use only if gameplay clarity wins.
- Recommendation: `needs Alex art review`

## 9. `fauna-deep-sea-spider`

- Current failure: Thin limbs/low readability: legs turn into pale strokes against busy terrain.
- Proposed fix type: `rescale/crop`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-deep-sea-spider/fauna-deep-sea-spider-candidate.png`
- Source/edit target: public/assets/generated/fauna-deep-sea-spider.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 272x48, transparent dirty RGB pixels 0, white-matte ratio 0.07085.
- Expected gameplay benefit: Thickens limb alpha, raises central body contrast, and keeps the pose centered at gameplay scale.
- Risk/caveat: Leg thickening can make the spider less delicate; review against terrain before integration.
- Recommendation: `needs Alex art review`

## 10. `fauna-shallow-lantern-fry`

- Current failure: Tiny/soft at gameplay scale; eye survives but body detail blurs away.
- Proposed fix type: `rescale/crop`
- Candidate asset path(s): `runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/candidates/fauna-shallow-lantern-fry/fauna-shallow-lantern-fry-candidate.png`
- Source/edit target: public/assets/generated/fauna-shallow-lantern-fry.png
- Prompt used if generated: none; repaired from existing runtime/source pixels.
- Post-processing command: `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- Alpha validation: PNG exists, dimensions 168x33, transparent dirty RGB pixels 0, white-matte ratio 0.02328.
- Expected gameplay benefit: Enlarges the fish within the frame, sharpens the eye/body edge, and keeps a shallow-water blue read.
- Risk/caveat: Runtime size tuning may be a better final lever than asset pixels alone.
- Recommendation: `approve for integration`

## Verification

- `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/make_top10_fix_proposals.py`
- `python3 runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/validate_top10_fix_proposals.py`
- `python3 -m json.tool runs/water9-top10-weak-sprite-fix-proposals-2026-07-07/fix-proposals.json >/dev/null`

## Alex Review Queue

- `biolume-rock-0` and `biolume-rock-1`: confirm single-nodule crop intent.
- `fauna-abyss-black-swallower`, `fauna-abyss-frilled-shark`, `fauna-abyss-snipe-eel`, `fauna-deep-sea-spider`: confirm readability-vs-species-shape tradeoff.
