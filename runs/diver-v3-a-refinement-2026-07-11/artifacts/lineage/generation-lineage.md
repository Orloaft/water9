# Generation and edit lineage

## Authority

- Identity/material authority: `runs/diver-v3-a-character-bible-2026-07-11/artifacts/bible/canonical-neutral-side-master.png`.
- Pose authority: the seven accepted transparent/chroma masters in `runs/diver-v3-a-motion-test-2026-07-11/artifacts/masters/`.
- Concepts B/C and Diver V2 pixels were not used.

## New transition generation

Three built-in image-generation edits used the canonical master plus the adjacent accepted keys as references. The tool exposed no model ID, seed, sampler, steps, or quality controls, so none are claimed.

1. `exec-4b279529-fbfc-4777-a182-71fb0d34623b.png` → `hover-inbetween.png`
2. `exec-3c5383c1-6364-4576-9f56-51334e9c8831.png` → `swim-transition-a.png`
3. `exec-bfac6e5b-84e0-442d-992c-48b709f9c6dd.png` → `swim-transition-b.png`

Each prompt required one right-facing orthographic identity-preserving transition, fixed upper-left light, canonical brass/copper/black/cyan materials, locked helmet/cuirass/backpack, connected anatomy, no effect/text/shadow, and a flat magenta chroma field. The installed `remove_chroma_key.py` helper used border auto-key, soft matte, despill, and one-pixel edge contraction. Original chroma outputs and transparent results are retained.

## Shared-material and registration repaint

`build_refined_assets.py` performs the bounded shared-material/onion-skin workflow:

1. Finds the largest connected cyan visor component in each high-resolution right-facing master.
2. Applies one fixed master-to-runtime scale and places that visor at one common anchor, avoiding per-silhouette scaling and helmet/pack breathing.
3. Builds a 48-color shared palette from opaque subject pixels across all ten masters, with protected cyan beacon and black-rubber anchors.
4. Quantizes RGB through that common palette, locks runtime alpha to `{0,255}`, and zeros transparent RGB.
5. Produces high-resolution authored-left masters by orientation reversal followed by a new screen-space upper-left warm light pass and a port-side valve mark.
6. Produces authored-left runtime cells by the same registration-preserving alpha reversal followed by screen-space relighting and a port-side cyan housing repaint. These are intentionally not raw mirrors.

OpenCV connected-component analysis is used only to locate the painted visor landmark; it synthesizes no pixels. Pillow performs deterministic resizing, palette reduction, relighting, alpha cleanup, and evidence assembly.
