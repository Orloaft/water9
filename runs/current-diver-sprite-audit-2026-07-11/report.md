# Current Diver Sprite Audit and Replacement Proposal

- Audit date: 2026-07-11
- Repository: `/mnt/nxt-dev/water9`
- Audited HEAD: `72f2bae`
- Scope: read-only game/runtime audit; only this report and supporting files below were written
- Status: **COMPLETE**

## Executive verdict

**Replace the package. Do not spend another art pass trying to reconcile the current 83-frame set.** Preserve the readable brass pressure-suit idea, large cyan faceplate, backpack mass, warm/cool palette split, and the horizontal swim silhouette. The rest is actively holding the game back: 45 of 83 configured frames can never be selected in normal play; scanner, sampler, and sonar have no diver action pose at all; the five live state families come from visibly different pose/proportion regimes; and thousands of colors inside tiny sources create painterly noise that the pixel-art renderer reduces to sparkle and shape wobble.

The core failure is partly art and partly integration. The art lacks registration, palette discipline, consistent anatomy, and action coverage. The selector then ignores most of the art it ships and maps every tool except mining to generic idle/swim. A replacement should be a **hybrid**: baked body/action silhouettes for locomotion and major tool gestures, modular tool/hand and effect layers for variants. That protects silhouette quality without multiplying every body frame by every tool upgrade.

## Ranked findings

| Severity | Finding | Evidence and impact |
|---|---|---|
| Critical | Scanner, sampler, and sonar have no character animation or attachment mapping. | `diverAnimation()` only considers `lost`, `mineCooldown`, and speed (`src/helpers.ts:2551-2555`). Tool dispatch changes gameplay but no pose state (`src/scene-combat.ts:121-143`); live captures show generic upright idle under scanner arc, sampler progress arc, and sonar ring. Tool intent is unreadable without effects/HUD. |
| Critical | The package advertises 15 animation families/83 PNGs, but normal play can select only idle 11, swim 7, boost 5, mine 8, and die 7: 38 frames total. | Counts are declared at `src/constants.ts:108-125`; the selector returns only those five at `src/helpers.ts:2551-2555`. Walk, descend, ascend, hover, recoil, damage, revive, up, down, left, and right are loaded but unreachable. |
| High | Art direction and body volume are inconsistent across families. | Contact sheet: idle is an upright brass chibi suit; swim/boost stretch into a broad prone body; die becomes a wet heap then appears to reassemble; revive is a darker green/black kneeling suit; top-down directions use another squat rendering language. These do not read as one registered model. |
| High | Frame-to-frame registration is unstable. | Alpha-centroid span is 3.11×2.24 source px for swim and 5.42×1.45 px for mine before origin compensation; die shifts 18.20×4.08 px. `diverOrigin()` is one constant per family, not per frame (`src/helpers.ts:2596-2615`), so internal shifts remain visible as wobble. |
| High | The game is configured for hard pixel rendering, but the sources are painterly miniatures. | Phaser forces `antialias:false` and `pixelArt:true` (`src/main.ts:34-46`). Individual 66×80 idle frames contain 2,125-2,254 unique visible RGB colors; swim contains 2,056-2,157. This is shaded raster art, not a controlled pixel palette. At the live 29.6-45.9 world-pixel widths, detail aliases into noise. |
| Medium | Death is a repeating timer animation, not a terminal pose. | `die` uses a 10-tick modulo, clamps indices 7-9 to frame 6, then restarts at frame 0 (`src/helpers.ts:2560-2562`). A lost player therefore repeatedly collapses every 2.22 s rather than entering and holding a final pose. |
| Medium | Left/right is mechanically mirrored without asymmetry policy. | Swim/boost/mine/damage/recoil use `swimPose`; facing sign sets `flipX` (`src/helpers.ts:2578-2583,2625-2631`). Helmet highlights, tank fittings, gauge/tool hand, and baked boost flame mirror with the body. Idle and die do not flip at all, so facing can change while the image remains right-biased/upright. |
| Medium | Vertical and diagonal movement lacks authored readability. | Input supports arbitrary 2D vectors (`src/scene.ts:1024-1094`), but vertical/diagonal movement selects swim/boost by scalar speed and only rotates up to ±0.72 rad for swim/boost (`src/helpers.ts:2578-2583,2625-2631`). Authored ascend/descend/up/down frames are never used. |
| Medium | Current effect ownership is inconsistent. | Mine bakes a bright green beam into all eight frames, boost bakes flame into the body, while scanner/sampler/sonar draw effects outside the diver. This complicates variants, timing, palette control, and effect scaling. |
| Low | Many stale one-off PNGs create false production signals. | `diver-carry-ore.png`, `diver-interact-use.png`, `diver-push-pull.png`, light variants, and `diver-tool-*` files have no source-code references. They are neither loaded by the configured loop nor rendered in normal play. |

## 1. Proven live runtime identity

### Load and creation path

1. The app enters `DeepdiveScene` unless the URL explicitly requests sandbox mode (`src/main.ts:20-28,50`). The audited URL was normal play: `/?playtest=1`, not `?sandbox`.
2. `loadGeneratedAssets()` loads every numbered PNG described by `diverFrameCounts` as an independent Phaser image key `diver-${animation}-${i}` (`src/helpers.ts:489-498`). There is no atlas metadata for the current diver.
3. The scene creates one normal player image with initial key `diver-swim-0`, depth 2, center origin (`src/scene.ts:165`). It also creates articulated part sprites, but starts every part hidden (`src/scene.ts:166-172`).
4. Every render, `drawPlayer()` hides all articulated parts and unconditionally calls `drawLegacyDiver()` (`src/scene-rendering.ts:3595-3607`). This proves the normal `#game canvas` uses the numbered baked PNGs, not the articulated prototype.
5. `drawLegacyDiver()` selects the numbered texture, applies position/origin/mirror/rotation/alpha/depth, and scales by desired width (`src/scene-rendering.ts:3609-3625`). `fitImageWidth()` is a uniform `desiredWidth/sourceWidth` scale (`src/helpers.ts:2486-2489`).

### Live transform contract

- Texture rectangle: the full standalone PNG; dimensions vary by family and are listed below. No source crop or atlas frame is used.
- Pivot: family-specific normalized origin from `diverOrigin()`: idle `(0.5,0.55)`, swim `(45/104,38/82)`, boost `(48/112,39/86)`, mine `(44/94,40/76)`, all others `(0.5,0.55)`. Swim/boost x is complemented when facing left (`src/helpers.ts:2596-2615`).
- Facing: swim/boost/mine/recoil/damage use horizontal flip and pitch; idle/die/default return no flip or rotation (`src/helpers.ts:2578-2583,2625-2631`).
- Rotation: local movement pitch clamped to ±0.72 rad for swim/boost, ±1.35 for mine/recoil/damage. Lost adds ±1.1 rad (`src/scene-rendering.ts:3621-3623`).
- Display width after global `PLAYER_DRAW_SCALE=0.74` (`src/constants.ts:17`): idle 29.6, swim 42.92, boost 45.88, mine 35.52, die 28.86 world px. Source aspect ratio determines height (`src/helpers.ts:2586-2593`).
- Position/depth: player world `(x,y)`, plus 8 scaled px downward when lost; render depth 2.08; alpha 1 normally and 0.45 when lost (`src/scene-rendering.ts:3619-3624`).
- Collision is independent of art: player collision radius 8 and contact radius 10 (`src/constants.ts:13-14`). Changing pivots or safe bounds must not change gameplay collision.
- Layers: the live player is one baked image. Scanner/sampler/sonar progress and rings are scene graphics; they are not child layers or attachments. Mine and boost effects are baked into their frame PNGs.

### Explicitly ruled out

- **Articulated prototype:** its 11 part textures are loaded (`src/helpers.ts:492-493`, `src/diver-articulated.ts:128-132`) and a complete procedural pose renderer exists (`src/scene-rendering.ts:3637-3726`), but `drawPlayer()` hides the parts and never calls it. It is a dormant preview/fallback, not shipped normal-play identity.
- **Sandbox diver:** `scene-sandbox.ts:174,505` creates its own preview and is entered only by sandbox query parameters. It is test/review-only.
- **One-offs:** carry/interact/push-pull/light/tool PNGs are outside `diverFrameCounts` and have no live source references. `diver-swim.png` is referenced only as an initial/sandbox texture; normal per-frame rendering immediately replaces it with numbered keys.
- **Directional and reaction families:** these are genuinely loaded, but the live selector cannot return their animation names. Loaded is not the same as reachable.

## 2. Current frame/state inventory

### Configured families

| Family | Frames | Source size | Live selector | Cadence/behavior | Facing/pose notes |
|---|---:|---:|---|---|---|
| idle | 0-10 | 66×80 | Yes, speed <9 | 1.9 fps; 5.79 s loop | No flip/rotation; upright even when facing left/up/down. |
| walk | 0-6 | 70×82 | No | Dead code; helper default would be 4.25 fps | A running-on-land cycle, inconsistent with underwater normal play. |
| swim | 0-6 | 104×82 | Yes, speed 9 through 78% top speed | 4.25 fps × speed factor 0.76-1.04; about 2.17-1.58 s loop | Mirrored and pitch-rotated. No accel/decel clip. |
| boost | 0-4 | 112×86 | Yes, speed >78% top speed | 5.6 fps × 0.76-1.12; about 1.17-0.80 s loop | Mirrored/pitched; cyan/orange exhaust is baked. |
| descend | 0-3 | 58×52 | No | Dead code; would be 3.2 fps | Side/upright transitional poses, never selected. |
| ascend | 0-3 | 58×52 | No | Dead code; would be 3.2 fps | Never selected. |
| hover | 0-3 | 58×54 | No | Dead code; would be 3.2 fps | Never selected; idle owns stationary state. |
| mine | 0-7 | 94×76 | Yes, `mineCooldown>0.04` | Cooldown-scrubbed one-shot over roughly 0.44 s at base cooldown 0.48 s; frame 7 holds until cutoff | Mirrored/pitched; suit, tool, sparks, and green beam all baked. |
| recoil | 0-2 | 78×70 | No | Dead code | Never selected by sonar, damage, weapon, or collision. |
| damage | 0-2 | 78×72 | No | Dead code | Hull damage changes a number only (`src/scene-combat.ts:1026-1037`); no hurt pose. |
| die | 0-6 | 76×74 | Yes when `state.lost` | 4.5 fps across virtual 10 ticks; frame 6 held four ticks; whole 2.22 s sequence loops | No facing flip; entire sprite rotated and alpha reduced. |
| revive | 0-3 | 78×82 | No | Dead code | Unhardcore recovery teleports/reset state with no animation (`src/scene.ts:1326-1354`). |
| up | 0-3 | 50×58 | No | Dead code | Top/back view never mapped. |
| down | 0-3 | 50×58 | No | Dead code | Top/front view never mapped. |
| left | 0-3 | 56×50 | No | Dead code | Separate horizontal art is ignored in favor of mirrored swim. |
| right | 0-3 | 56×50 | No | Dead code | Separate horizontal art is ignored. |

Total: **83 configured/loaded frames; 38 selector-reachable frames; 45 loaded-but-unmapped frames.** `current-diver-frame-metadata.json` records exact per-frame dimensions, alpha bounds, alpha centroids, opaque/semitransparent pixel counts, and visible RGB counts.

### State combinations and missing reads

| Gameplay condition | Actual diver result | Missing/duplicated coverage |
|---|---|---|
| Stationary/hover | idle loop | No facing, buoyancy control, or equipped-tool read. |
| Acceleration/cruise/deceleration | swim based only on current scalar speed; boost over threshold | No explicit start/stop transition. Momentum can swap families abruptly. |
| Up/down/diagonal | same swim/boost, rotated up to ±41° | Authored up/down/ascend/descend frames unused; steep vertical input is visually clamped. |
| Drill/mine | eight-frame baked mine action while cooldown >0.04 | Only unique live tool pose. Beam/effect is inseparable from body. |
| Scanner | idle/swim/boost according to motion | Scan target/progress arc does all communication (`src/scene-entities.ts:1223-1248`). No deploy/aim/hold/recover. |
| Sampler | idle/swim/boost according to motion | Flora sample arc and target removal do all communication (`src/scene-combat.ts:163-199`). No reach/contact/extract/recover. |
| Sonar | idle/swim/boost according to motion | Expanding rings and chart do all communication (`src/scene-sonar.ts:9-61`, `src/scene-rendering.ts:4019-4027`). No brace/emit/recoil. |
| Hurt/contact | existing locomotion | `damage` and `recoil` never selected. HUD/hull/status carry feedback. |
| Death | die loop | No stable final hold; no authored directional handoff. |
| Revive/respawn | state reset/teleport | `revive` never selected. |
| Carry/drop cargo | existing locomotion | `diver-carry-ore.png` is unused; drop is a spawned loose item (`src/scene-combat.ts:1010-1023`). |
| Interact/use/recovery | existing locomotion | Unused one-off interact/push-pull PNGs; no runtime state. |
| Sub piloting | diver hidden | Correct: player sprite and articulated parts are both hidden (`src/scene-rendering.ts:3596-3599`). |

## 3. Visual examination

### What works

- The helmet is the best anchor: oversized cyan glass inside a near-black rim remains recognizable at gameplay scale and survives grayscale as a bright face target.
- Warm brass suit plates against cool water give immediate player/world separation in shallow and mid captures.
- Backpack, helmet, and short heavy limbs imply a pressure-rated industrial diver rather than a generic wetsuit.
- Swim frames form a compact horizontal torpedo silhouette. Boost has a strong direction cue even at a glance.
- Alpha corners are clean and almost all configured frames use hard 0/255 alpha. There is no magenta rectangle or obvious matte halo in the live idle/swim families.

### What fails, by visual criterion

- **Silhouette/role read:** idle reads as “small antique astronaut” more quickly than “working diver.” The faceplate succeeds, but hands/tools collapse into torso noise. Mine reads only because of the long green line. Scanner/sampler/sonar do not read from body pose at all.
- **Anatomy/proportion:** helmet, torso, tanks, hand size, and leg length change across idle, swim, mine, die, and revive. The mine body is taller/thinner than swim; revive uses an especially large dark tank and a differently shaped helmet.
- **Pose clarity and motion arcs:** idle mostly swaps micro-details rather than describing a deliberate breath/buoyancy cycle. Swim fin/leg arcs are small and irregular. Mine frames alter beam and arm shapes but do not give a clean anticipation-contact-recovery arc. Death is a readable fall, but the last frames look like the suit rebuilding itself and then the timer loops.
- **Volume consistency:** swim and boost preserve a broad prone volume fairly well, but family transitions pop: idle width 29.6 world px, mine 35.5, swim 42.9, boost 45.9, then die 28.9. These changes are more than posture.
- **Pixel-grid discipline:** there is no locked pixel cluster language. More than two thousand visible RGB values per small frame produce single-pixel highlight churn. Nearest-neighbor enlargement exposes noisy antialiased-looking painted detail even though alpha is hard.
- **Palette/material separation:** cyan visor and orange/brass suit are good macro-separation. At actual size, however, brass plates, hoses, gloves, tanks, and shadows merge into a mid-dark brown mass. Grayscale confirms the torso/limbs often share one value band.
- **Lighting consistency:** the visor and top rim imply upper-left/front light, but highlights migrate between frames and directional/revive art is much darker. Mirroring reverses the authored light and hardware asymmetry.
- **Transparency/edges:** idle/swim are hard-alpha and matte-free. Boost, mine, die, and damage contain some semitransparent effect pixels (boost total 1,337; mine 1,079; die 603). These are acceptable for effects, but baking them into the actor prevents independent blend/tint/timing control.
- **Subpixel wobble/registration:** fixed family pivots cannot compensate shifting painted mass. Swim centroid moves 3.11 source px horizontally and mine 5.42; this is visible as helmet/torso jitter rather than intentional weight shift.
- **World scale:** the player is legible because the HUD/camera isolate it, but at 30-46 world px wide it is materially smaller and less imposing than many high-detail flora/fauna cutouts. The helmet survives; most suit mechanics do not.
- **Grayscale:** the face window stays distinct, but body/tool separation weakens badly. Mine beam becomes a bright white rule; without it the gesture is ambiguous. Scanner/sampler/sonar rely entirely on brighter external arcs/rings.

### Art versus mapping/compositor diagnosis

- Art problems: inconsistent model and volume, excessive palette, weak key poses, noisy clusters, shifting registration, mirrored lighting, family-to-family style drift.
- Mapping problems: 45 configured frames unreachable; no scanner/sampler/sonar/hurt/revive states; no locomotion transitions; looping death.
- Compositor problems: baked boost/mine effects but external scanner/sampler/sonar effects; no stable attachment sockets; only family pivots; no event markers.
- Gameplay-state problems: tool logic exposes booleans/cooldowns/target progress but no explicit action phase. A new animator needs deploy/hold/contact/recover timers rather than inferring everything from generic cooldowns.

## 4. Runtime evidence and reproducibility

The captures are 1440×900 screenshots of the actual `#game canvas` and HUD. Canvas backing and CSS dimensions match 1440×900. `runtime-capture-metadata.json` records playtest API results, player/state/camera data for every frame, and reports zero console errors and zero page errors.

Commands used/reproducible from repo root:

```bash
npm run dev -- --host 127.0.0.1 --port 5180
AUDIT_URL='http://127.0.0.1:5180/?playtest=1' node runs/current-diver-sprite-audit-2026-07-11/capture_runtime.mjs
python3 runs/current-diver-sprite-audit-2026-07-11/build_contact_sheets.py
```

The server was stopped after capture; no unrelated process was killed. The playtest API was used only to stage normal renderer states and keep captures deterministic. It does not swap the player renderer or inject review art.

| Capture | Verified state | What it proves |
|---|---|---|
| `runtime-surface-idle-hud.png` | depth 36, upper band, idle, drill selected | Upright live scale and shallow value separation with Water9 HUD. |
| `runtime-mid-swim-hud.png` | depth 1050, mid band, vx 18 | Live horizontal swim in a darker band. |
| `runtime-deep-diagonal-boost-hud.png` | depth 2268, lower band, vx/vy 75/75 | Diagonal boost selection and deep legibility. |
| `runtime-tool-mining-live-frame.png` | depth 90, mine cooldown 0.043 | Baked mine action near its last frame plus independent terrain feedback. |
| `runtime-tool-scanner-live.png` | scanner selected, scan target “Lantern Fry” | Generic idle body while external arc/target/HUD communicate scanning. |
| `runtime-tool-sampler-live.png` | sampler selected beside live flora | Generic idle body while external sample arc communicates action. |
| `runtime-tool-sonar-ring-live.png` | sonar selected, live world ring | Generic idle body inside sonar effect; chart was reclosed to expose canvas. |

Surface, mid, deep, mining, scanner, sampler, and sonar were reachable. A distinct mine placement/arming state was not reachable because Water9 currently has drilling/mining, not a placeable mine tool. Hurt/revive and stale directional families were not captured as normal live animations because the selector cannot reach them. Death is nevertheless proven reachable in code and is fully represented in the contact sheets.

## 5. Audit artifact manifest

| Artifact | Purpose | SHA-256 |
|---|---|---|
| `artifacts/current-diver-all-frames-color.png` | Lossless PNG, 4× nearest-neighbor, exact labels for all 83 configured frames | `b4467519a178b3448705298f7d191ac4533d0837b4f3fc6bad057327603221c8` |
| `artifacts/current-diver-all-frames-grayscale.png` | Matching grayscale sheet, same layout/scale | `fa214b845c131381be87a0ac728673cabe17f7be544055a1199e3c6257bdf598` |
| `artifacts/current-diver-frame-metadata.json` | Per-frame path, size, alpha bounds/centroid, color/alpha statistics, reachability | `e41101eda2fa42af62d85468b6be24b84c08960755d0f9791f2e6a2b187b6cbf` |
| `artifacts/runtime-capture-metadata.json` | URL, canvas, state, player/camera data, errors, notes | `e4bc59c68819d34837c355f59ae1d5c6ffb4f28a2d98640919422611e9a15a58` |
| `artifacts/runtime-*.png` | Seven authentic HUD/canvas captures described above | Individual hashes available via `sha256sum artifacts/runtime-*.png` |
| `artifacts/proposed-diver-v2-manifest.example.json` | Machine-readable example of the proposed atlas contract | `dc8977f4b3c1e68766c33c86caec835e25b9c1f2ec48f8ca5ebfe638c2f1a420` |

The contact-sheet script composites the actual loaded PNGs over a checkerboard and enlarges only with Pillow `Image.Resampling.NEAREST`. It does not redraw, trace, smooth, or substitute review art. Because normal play is a single baked layer, there is no live source-layer composite to reconstruct. The dormant articulated part list is documented in `src/diver-articulated.ts:15-126` and explicitly ruled out above.

## 6. Replacement visual specification

### Intended design

- A compact industrial saturation diver, not a fantasy astronaut: one large pressure helmet, short armored torso, articulated weighted boots/fins, twin-cylinder/rebreather pack, one readable working arm, one bracing arm.
- Silhouette ratio in cruise: roughly 2.1:1 horizontal; in hover: roughly 0.78:1 width-to-height. Helmet occupies 25-28% of upright height. Pack makes the back unmistakable; front hand/tool projects beyond the helmet.
- Authored facing is **right**. Left is mirrored at runtime only after all asymmetrical decals, gauges, text, and directional light are removed from the body. If a unique asymmetric story item matters, provide a left variant for that attachment only.
- Palette: 16-24 opaque RGB entries for body art. Suggested value groups: outline `#10181c`; deepest suit `#2a2a25`; brass shadow `#5a4026`; brass mid `#9a6b32`; brass light `#d4a44b`; visor shadow `#073f4a`; visor mid `#0e8fa5`; visor glint `#8ee7f4`; rubber `#27343a`; warning accent `#e56f3f`. Effects use a separate palette/alpha layer.
- Light direction: upper-left in screen space, broad and consistent. Mirrored body must avoid directional highlights that visibly flip; reserve sharp glints for an unmirrored or runtime effect layer.
- Native content resolution: pixel-authored at 64-72 px actor length inside a **128×96 cell**. This supplies room for tools and recoil while matching the current gameplay footprint. Render nearest-neighbor at an integer-friendly target; avoid scaling a detailed 128 px body down to 30 px without a dedicated gameplay-size cleanup pass.
- Transparent RGBA background; body pixels alpha 0 or 255 only. Semitransparency allowed only in separate effect clips. No matte, colored fringe, premultiplied dark edge, isolated single-pixel dust, or hidden RGB in transparent pixels.
- Common pivot `(56,48)` in every body cell. Body safe bounds `(8,8)-(120,88)`. Nominal front-hand socket `(78,47)`, back-hand `(65,45)`, backpack `(37,39)`, effect origin `(91,47)`, adjusted per frame in manifest where necessary.
- Keep collision/hitbox gameplay-owned at existing radii; never derive it from visible pixels.

### No-go defects

No family-specific redesigns; no changing helmet diameter; no wandering backpack; no extra/missing fingers or hoses; no mirrored glyphs; no baked HUD arcs; no tool changing hands between frames; no per-frame camera/viewpoint shift; no palette growth; no antialiased body edges; no moving pivot; no exhaust/beam embedded in body art; no pose whose purpose is readable only from its filename.

## 7. Proposed animation matrix

Timing is a starting contract for playtest, not a mandate to generate every in-between independently. Generate key poses first, then hand-author in-betweens.

| Clip/action | Purpose/read and key poses | Frames | Timing | Loop/transition/interrupt | Hand/tool/effect needs |
|---|---|---:|---|---|---|
| idle_hover | Neutral buoyant worker; settle, inhale/rise, exhale/fall | 6 | 180 ms each | Loop; may interrupt to locomotion/tool after any frame with 60-100 ms blend/snap pose | Equipped tool may rest as modular attachment; hands fixed to sockets |
| swim_accel | Clear push-off from upright to prone | 4 | 90,90,90,110 ms | One-shot into cruise; tool action may interrupt after frame 1 | Arms tuck; no effect |
| swim_cruise | Sustainable alternating kick with stable helmet/torso | 8 | 80-110 ms speed-scaled | Loop; exit at matched kick phase to decel/boost | Rested attachment optional; no baked wake |
| swim_decel | Drag/brake from prone to hover | 4 | 90,100,110,130 ms | One-shot to hover; tool can interrupt after frame 1 | Hands open slightly, fins flare |
| boost_enter | Brace and engage pack | 3 | 70,70,90 ms | One-shot to boost loop; cannot start heavy tool action after ignition frame | Separate exhaust socket/effect |
| boost_loop | Strong compact propulsion silhouette | 4 | 75-90 ms | Loop while >threshold; exits to boost_recover | Separate exhaust, bubbles/wake |
| boost_recover | Exhaust cutoff and body extension | 3 | 80,90,110 ms | To cruise/decel based speed | Effect fades independently |
| vertical_rise | Head/shoulder tilt up, fins drive down | 6 | 95 ms | Loop when `abs(vy)` dominates and vy<0 | Body may rotate only ±15°, preserving authored vertical read |
| vertical_descend | Weighted boots lead, controlled venting | 6 | 105 ms | Loop when `abs(vy)` dominates and vy>0 | Small separate bubbles; no mirrored light issue |
| diagonal | Use cruise/boost with authored ±25° pose buckets | 0 extra body frames initially | Runtime bucket | Select rise/cruise/descend bucket; do not freely rotate past readable range | Same sockets across buckets |
| scanner_deploy | Raise wrist scanner toward facing | 3 | 80,90,110 ms | One-shot; interruptable by damage; movement cancels after frame 1 | Scanner attachment; effect remains off |
| scanner_scan_hold | Locked forward wrist/helmet alignment | 4 | 120 ms | Loop while held/valid target; movement allowed at reduced pose layer | Scanner attachment; external cone/arc from effect socket |
| scanner_recover | Lower scanner | 2 | 90,110 ms | One-shot to prior locomotion | Scanner remains attached |
| sampler_reach | Lean/reach toward nearby flora | 3 | 90,110,130 ms | One-shot; cancels if target leaves range | Sampler vial/probe in front hand |
| sampler_contact_extract | Contact, clamp, pull/sample confirmation | 4 | 140,180,130,110 ms | Hold frame 1 while progress; one-shot extraction on completion | Probe/vial; target contact event at frame 1, sample event frame 2 |
| sampler_recover | Return vial to belt | 3 | 100,110,130 ms | One-shot; damage may interrupt | Vial swaps to belt socket at event |
| sonar_brace | Widen stance, hand to chest emitter | 2 | 100,130 ms | One-shot; movement damped | Sonar module attachment |
| sonar_emit | Strong chest/hand press, readable before ring | 2 | 80,140 ms | One-shot; `emitPing` event on frame 1 | Ring is separate world effect from effect socket |
| sonar_recoil_recover | Small full-body pressure recoil then settle | 3 | 70,100,140 ms | One-shot to prior locomotion | No baked ring |
| mine_ready | Present cutter/drill and brace off-hand | 3 | 80,90,100 ms | One-shot; aim can continue | Cutter attachment; no beam yet |
| mine_contact_hold | Stable drilling silhouette with two-phase vibration | 4 | 60-90 ms | Loop while held and valid; exits on release/cooldown | Cutter attachment; separate beam/sparks/contact decal |
| mine_place_arm | If a real placeable mine is added: remove device, press to surface, arm | 6 | 100,120,160,180,120,100 ms | One-shot; commit inventory at frame 3; not used for current drill | Mine device attachment, surface socket, arming LED effect |
| mine_recover | Pull cutter back and regain balance | 3 | 80,100,130 ms | One-shot; can chain to locomotion after frame 1 | Cutter remains attached |
| hurt_light | Direction-neutral flinch, helmet protected | 3 | 60,80,120 ms | One-shot overlay; locomotion resumes; invulnerability flash separate | Tool stays attached if safe |
| hurt_heavy | Curl/knockback/recover | 5 | 60,80,100,120,150 ms | One-shot; locks tool through frame 2 | Drop/suppress tool if silhouette collides |
| death | Breach shock, loss of posture, sink/collapse | 8 | 90,100,120,140,160,180,220,∞ | One-shot; hold final frame forever, never modulo-loop | Separate bubbles/leak; equipped tool hidden/dropped at event |
| revive/winch | Only if shown in world: tether pull, kneel, stand | 6 | 120-180 ms | One-shot during unhardcore recovery; otherwise skip and cut to barge | Tether separate; no tool |
| carry_heavy | Two-handed burden silhouette | 6 | 110 ms | Loop; movement reduced; only add when gameplay visibly carries cargo | Carried item socket and per-item attachment |
| interact | Reach/press/turn generic control | 4 | 100-140 ms | One-shot; context event frame 2 | Empty hand or context attachment |

## 8. Architecture decision: hybrid body plus modular tools/effects

Use baked body silhouettes for idle, transitions, locomotion, hurt, and death. For tool actions, bake the torso/arms/hand relationship into a small action-specific body clip so the gesture remains authored and readable. Attach the actual scanner/sampler/cutter/sonar/mine sprite at named per-frame sockets. Render beams, rings, exhaust, bubbles, sparks, and progress arcs as independent effects.

Why not fully monolithic: four tools × upgrades/skins × left/right × every body phase would explode sheet size and make a new tool require repainting the diver. Current mine/boost already demonstrate the effect-timing problem.

Why not fully articulated: the dormant prototype (`src/diver-articulated.ts`, `drawArticulatedDiver`) can vary tools cheaply, but small rotated limbs create seams, inconsistent pixel density, and puppet-like swimming at gameplay scale. Its current generic procedural arm/leg sine pose also has no scanner/sampler/sonar semantics.

Facing policy: author right-facing body once and mirror the body/tool geometry for left. Tool labels and asymmetric decals must be absent or supplied as an unmirrored overlay. Tool upgrades should share the same sockets/bounds and vary attachment texture, not body clips. Effects consume an effect socket and remain facing-aware in code.

## 9. Concrete atlas/schema

### Export contract

- Cell: 128×96 RGBA.
- Atlas: start 1024×1024; one PNG for body clips and one 512×512 attachment/effect atlas if desired. Do not require power-of-two on platforms that do not, but keep it for predictable packing.
- Padding: 2 transparent pixels between cells plus 1-pixel color extrusion for any texture sampling path. With strict nearest rendering, extrusion is still cheap insurance.
- Pivot: integer `(56,48)` in every cell; per-frame override allowed only when validator documents why. Visual root (helmet/torso) must remain stable even when limbs move.
- Safe bounds: `(8,8)-(120,88)`; effect overflow belongs in the effect atlas.
- Naming: lowercase snake case, two-digit index: `swim_cruise_00`, `scanner_scan_hold_02`.
- Metadata: JSON with schema version, image/cell size, frame rect, pivot, named sockets, clip order, per-frame duration, loop flag, and events. Example: `artifacts/proposed-diver-v2-manifest.example.json`.
- Export: PNG-32 sRGB, no indexed-alpha surprises, no premultiplication, transparent RGB cleared to zero, no resampling, no color-profile conversion after palette lock.
- Validator checks: unique names, rects in bounds/non-overlap, required clip coverage, consistent pivots, transparent corners, body alpha only 0/255, palette membership, socket coordinates inside cell, event names from an enum, matching frame/duration counts, and no orphan frames.

### Row/group layout

Packing can be machine-driven; this logical row table is the review layout and stable naming order.

| Logical rows | Contents |
|---|---|
| 0 | idle_hover 00-05; reserved neutral/tool-rest variants |
| 1 | swim_accel 00-03; swim_decel 00-03 |
| 2 | swim_cruise 00-07 |
| 3 | boost_enter 00-02; boost_loop 00-03; boost_recover 00-02 |
| 4 | vertical_rise 00-05; vertical_descend 00-01 |
| 5 | vertical_descend 02-05; hurt_light 00-02; reserved |
| 6 | scanner deploy/hold/recover (3+4+2) |
| 7 | sampler reach/contact/recover (3+4+3) |
| 8 | sonar brace/emit/recover (2+2+3); reserved |
| 9 | mine ready/contact/recover (3+4+3) |
| 10 | hurt_heavy 00-04; interact 00-03 |
| 11 | death 00-07 |
| 12 | optional revive/winch 00-05; carry_heavy 00-01 |
| 13 | optional carry_heavy 02-05; reserved future tool actions |

This is about 105 body cells before optional clips, roughly 1.29 MB of raw cell pixels if tightly packed by occupied cells; a 1024² RGBA texture is 4 MiB uncompressed GPU memory. Current configured standalone textures total 443,704 pixels/~1.69 MiB RGBA; live families total ~1.00 MiB. The proposed increase is acceptable for one player actor, but splitting body and attachments permits lazy loading and keeps effects out of body cells.

## 10. AI-assisted generation workflow

1. **Reference pack:** crop representative Water9 shallow/mid/deep screenshots, current idle/swim strengths, world material samples, and a scale ruler showing 30/44/60 px actor previews. Include the exact palette and silhouette thumbnails.
2. **Master neutral design:** generate a higher-resolution right-facing model sheet with front/side/back/three-quarter views, then choose one. Lock helmet, tank, torso, limb lengths, hand/tool sockets, palette/material callouts, and light direction. This is design reference only, not the shipped sprite.
3. **Pixel master:** hand-reduce the approved side/hover and cruise neutrals into the 128×96 cells. Establish the actual cluster vocabulary and 16-24-color body palette here.
4. **Key poses by action:** generate/reference only the anticipation, contact, extreme, and recovery poses. Require the neutral design image and a transparent pose skeleton/anchor overlay in every request.
5. **Consistency pass:** overlay each key pose at 50% against the master; correct helmet diameter, torso/pack registration, limb length, tool hand, and pivot before any in-betweens.
6. **In-betweens:** hand-author or constrained-warp from approved keys. Do not ask a generative model for 100 independent final frames.
7. **Pixel cleanup/palette lock:** nearest-only reduction, indexed palette audit, remove orphan pixels, enforce 0/255 body alpha, clean transparent RGB, and correct mirrored readability.
8. **Registration/socket pass:** onion-skin helmet/torso, validate root and socket trajectories, then preview every clip at 1× and actual game scale in color and grayscale.
9. **Atlas pack/validate:** generate manifest, pack with padding/extrusion, run validator and contact-sheet generator, then capture the same seven runtime proofs plus hurt/death/left-facing tests.

### Prompt architecture

Use a fixed immutable header, a pose-specific block, and a strict negative block. Feed the approved master reference and pose guide with every action request.

**Master design example**

> Design one compact industrial saturation diver for Water9. Right-facing side view, heavy brass/black pressure suit, oversized cyan glass helmet, short armored torso, weighted fins/boots, twin rebreather pack, one clear working hand. Upper-left broad light. Match the attached Water9 scale and material board. Neutral hover, orthographic side view, stable proportions, transparent background. Provide a clean silhouette and material callouts; this is the immutable character reference for later poses.

**Action key example**

> Using the attached approved diver master without redesign, create the sampler contact key pose. Same right-facing orthographic camera, helmet size, torso, backpack, limb lengths, palette groups, and upper-left light. Diver leans 8 degrees forward; rear arm braces; front hand holds the supplied sampler probe at socket target (91,47); probe tip makes obvious contact. Preserve common root pivot (56,48) and fit opaque body within safe bounds (8,8)-(120,88). Transparent background. Produce one key pose, not a sheet.

**Negative constraints**

> No new suit details, no changed helmet or tank count, no extra limbs/fingers/hoses, no text or logos, no camera rotation, no foreshortened three-quarter view, no soft shadow, no glow, no water background, no baked beam/ring/bubbles/sparks, no anti-aliased body edge, no semitransparent body pixel, no cropped fins/tool, no palette expansion, no moving root, no left-facing pose.

AI output should be treated as pose/reference material until a human pixel cleanup and registration pass approves it.

## 11. Water9 integration plan

1. Add a typed `DiverVisualState`/action-phase model near `src/types.ts` rather than extending the current flat animation union indefinitely. Keep locomotion and action as separate tracks: locomotion `{hover,accel,cruise,decel,boost,rise,descend}` plus action `{none,scanner,sampler,sonar,mine,hurt,death,...}`.
2. Replace the per-PNG load loop in `loadGeneratedAssets()` (`src/helpers.ts:489-498`) with atlas image + validated manifest loading. Keep legacy keys temporarily behind a visual feature flag for A/B and rollback.
3. Replace `diverAnimation()/diverFrame()/diverOrigin()/diverDisplayWidth()` (`src/helpers.ts:2551-2615`) with a state machine that consumes explicit timers and manifest timings/events. Fix death to one-shot/hold.
4. Update `drawPlayer()/drawLegacyDiver()` (`src/scene-rendering.ts:3595-3625`) to render body, attachment, and effect layers using manifest pivots/sockets. Do not reuse the dormant articulated renderer wholesale; its data can inform socket conventions.
5. Expose tool phases from `useSelectedToolPrimary()`, `sampleNearbyFlora()`, and `sonarPing()` (`src/scene-combat.ts:121-199`, `src/scene-sonar.ts:9-61`). Scanner needs deploy/hold/recover while `scanNearbyLife()` already owns target progress (`src/scene-entities.ts:1223-1248`). Mining needs ready/contact/recover around current cooldown/contact feedback.
6. Keep effects in their current systems but start them from animation events: sonar ring at `emitPing`, sample completion at `extract`, drill sparks/beam at `contact`, boost exhaust at `ignite`.
7. Add machine checks and visual smoke captures for every clip, left mirror, sockets, grayscale, actual-scale view, transition continuity, and no orphan/unreachable manifest clips.
8. After parity and signoff, remove 83 numbered images, stale one-offs, and the unused articulated diver prototype only in a separate cleanup commit. Do not mix removal with the first renderer migration.

### Compatibility and risk

- Save compatibility is low risk: saves persist selected tool, player position/velocity/facing, and `lost`, not animation frame/time (`src/save-load.ts:240-284,340-357`). Map loaded `lost=true` directly to the final death hold or replay once by policy; document the choice.
- Gameplay collision/range must remain unchanged: keep current collision radii and forward reach independent of sprite cells.
- Tool input timing is the main behavior risk. Animation events must not delay fuel/cargo mutation unless design explicitly changes gameplay. Prefer gameplay commits immediately and visuals follow, except a future placeable mine where commit timing is intentionally authored.
- Memory rises if a sparse 1024² atlas is always resident. Tight packing or two atlases controls this. Draw calls rise from one to typically two/three for player body+tool+effect, negligible for a single actor but still verify Canvas and WebGL paths.
- The current game defaults to Phaser Canvas unless `?renderer=webgl` (`src/main.ts:30-35`); validate atlas extrusion, mirroring, and alpha in both renderers.

## Acceptance criteria for replacement

- Every manifest clip is either reachable in a documented runtime state or marked optional/not shipped; no silent 45-frame graveyard.
- Scanner, sampler, sonar, and mining actions are identifiable from diver silhouette alone before effects/HUD.
- Helmet/torso root deviates at most 1 native pixel across loop frames unless the action explicitly moves it.
- Body uses approved palette and 0/255 alpha only; transparent RGB is zero; no matte/fringe at 1× on light/dark checkerboards.
- Color and grayscale contact sheets pass at 1×, 2×, and actual gameplay scale in shallow/mid/deep captures.
- Right/left mirror tests preserve light/material logic and do not mirror text/glyphs.
- Death plays once and holds; tool transitions have explicit interrupt rules; save/load during any tool state returns to a safe neutral state.
- Runtime captures repeat the seven proofs in this audit plus left-facing, hurt, death-final-hold, and transition stress tests with zero console/page errors.

## Final recommendation

Commission a new master design and a narrow vertical slice first: `idle_hover`, `swim_accel/cruise/decel`, scanner deploy/hold/recover, and one modular scanner attachment/effect. Integrate that behind a feature flag and judge it at actual Water9 scale in all three depth bands. If it passes root stability, grayscale, mirror, and action-read gates, complete sampler/sonar/mine/hurt/death from the same locked master. The existing package remains useful only as thematic reference and rollback coverage—not as a production base worth polishing.
