# Visual inspection record — corrected pixel-production pass

Reviewed 2026-07-11 after the manager rejection, key-pose gate, full propagation, and
validator PASS. This is an art-production review only; nothing here claims runtime acceptance.

## Key-pose gate

The mandated keys were redrawn first: `idle_hover_00`, `swim_cruise_00`,
`scanner_deploy_02`, and `scanner_scan_hold_00`. The unchanged selected high-resolution
master, preserved rejected keys, corrected keys, and 1×/2×/30/44/60 px views are together in
`../review/corrected-key-gate-before-after-master.png`.

Blunt gate verdict: **PASS FOR PROPAGATION**. The old keys were visibly schematic. The new
keys preserve thick armored anatomy and action intent at 30 px. Cruise measures 113×51 opaque
bounds, a 2.22:1 horizontal silhouette. Deploy and locked hold are different body poses and
different attachment placements; hold reaches farther and higher while the rear arm braces.

## Full-sheet inspection

| Gate | Artifact | Result |
|---|---|---|
| Every frame, color, 1×/2× | `../review/contact-sheet-color-1x.png`, `contact-sheet-color-2x.png` | PASS — one consistent helmet/chest/pack mass and thick extremities |
| Every frame, grayscale, 1×/2× | `../review/contact-sheet-grayscale-1x.png`, `contact-sheet-grayscale-2x.png` | PASS — visor, pack, torso, arm groups, knees, and fins separate by value |
| 30/44/60 px | `../review/gameplay-footprint-30-44-60.png` | PASS FOR ART REVIEW — all three reads survive 30 px; 44/60 are strong |
| Mirror | `../review/right-left-mirror-sheet.png` | PASS — no text/glyphs or fragile directional glints |
| Root/onion | `../review/onion-skin-root-stability.png` | PASS — full cells are visible; loop roots remain registered |
| Scanner without effect/HUD | `../review/scanner-action-read-no-effect-hud.png` | PASS — tuck, raise, present, brace/lock, withdraw, stow are distinct |
| Runtime comparison | `../review/comparison-current-runtime-vs-v2-cells.png` | REVIEW CONTEXT ONLY — corrected cells are not integrated |

## Rejection removal audit

- **Generic schematic avatar:** replaced by a continuous pack/chest/neck/hip silhouette with
  repeated shoulder, waist, knee, boot, and cylinder vocabulary derived from the master.
- **Stick limbs:** every structural limb is a 9–10 px armored assembly with outline/rubber
  interlock, plate fill, and a 4–6 px joint; no one-pixel structural stems remain.
- **Floating helmet/top-heavy hover:** the 33×32 helmet overlaps a substantial six-pixel neck
  ring and chest; twin cylinders bridge into the torso and hip belt.
- **Flat materials:** broad fields are subdivided into disciplined 2–4 px brass highlights,
  dark joint clusters, steel cylinder strips/bands, and stepped cyan visor planes.
- **Dead hover:** weighted boots/fins settle asymmetrically by one pixel across the loop while
  helmet and torso roots remain fixed.
- **Weak cruise:** the 2.22:1 silhouette keeps pack, torso, helmet, arms, two armored leg paths,
  knee caps, and paired fins in one compact horizontal body.
- **Floating tiny scanner:** the scanner is now a 20×13 px industrial head with glove overlap,
  steel housing, cyan display, brass emitter, thick working arm, and cross-body brace.
- **Ambiguous scanner phases:** deploy anticipates low, raises, and presents; hold advances and
  locks farther/higher; recovery retracts through the raised pose and returns to chest/stow.
- **Lost 30 px read:** the gameplay and focused-key sheets retain helmet, pack, chest, paired
  limb groups, fins, and scanner direction at 30 px. Interior detail is simplified before
  structural mass.

## Caveats

This remains deterministic native pixel art constrained to 20 colors, so it intentionally
does not reproduce every high-resolution rivet. The scanner hold uses controlled one-pixel
wrist/brace variation; its effect is separate. Renderer flip, runtime sockets, world-depth
contrast, event timing, and authentic `#game canvas` proof remain untested future integration
work.
