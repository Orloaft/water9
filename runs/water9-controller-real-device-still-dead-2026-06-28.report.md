# Water9 Controller Real-Device Follow-Up

Date: 2026-06-28
Starting commit: `61cc6b2`

## Root Cause

The previous browser Gamepad API fix still left the real-device path mostly opaque and event-dependent: if the browser withheld pads until focus/user gesture, exposed no `navigator.getGamepads()` in the current context, or selected a pad only through polling rather than `gamepadconnected`, Alex had no in-game way to see where input stopped.

The gameplay mapping itself was mostly present, but the startup/focus path and diagnostics were not strong enough for a physical Xbox-controller retest.

## Changed Files

- `src/state.ts`: expanded controller state with API support, secure-context, focus, poll timing, visible pad counts, raw buttons/axes, last mapped action, and user-facing hint fields.
- `src/scene.ts`: hardens browser Gamepad API polling, records diagnostics every poll, polls during loading/title, marks pointer/key/focus gestures, focuses the game surface, selects pads from polling alone, and records the last mapped controller action.
- `src/hud.ts`: replaces the minimal controller badge with an in-game diagnostic panel showing API, secure context, focus, last poll, active pad, button values, axes, and last action.
- `src/styles.css`: styles the expanded diagnostic panel on desktop and mobile.
- `tools/test_sonar_map_controller_smoke.mjs`: removes reliance on dispatching `gamepadconnected` before startup and asserts the diagnostic fields render while still covering title start, movement, sonar, pause, sonar map, and sub controls.

## Verification

- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed. Vite reported the existing large chunk-size warning.
- `npm run water9:sonar-map-controller-smoke`: passed.
  - Report: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.json`
  - Screenshot: `/home/orlovboros/projects/manager/runs/water9-sonar-map-controller-smoke-2026-06-28.png`
- `git diff --check`: passed.

## Real-Device Caveat

I cannot physically test Alex's PC Xbox controller from this environment. The smoke now avoids trusting `gamepadconnected` as the only proof and validates the app can discover a browser-visible pad through `navigator.getGamepads()` polling, but the final hardware proof still requires Alex's machine.

## Alex Retest Instructions

1. Open Water9 in Chrome or Edge on `localhost` or HTTPS. If opening from another machine over plain `http://LAN-IP`, the diagnostic should show `Secure no` and browser gamepads may be blocked.
2. Add `?debug=1` to the URL if the controller panel is not already visible.
3. Click anywhere on the title/game screen.
4. Press any Xbox controller button.
5. Read the controller panel:
   - `API yes`, `Secure yes`, `Focus yes`, and `Pad #... / 1 visible` means the browser is exposing the controller.
   - `Buttons` should change when pressing A/B/Start/View/triggers.
   - `Axes` should change when moving the left stick.
   - `Action` should change to `confirm`, `pause`, `sonar map`, `left stick move`, `mine held`, etc.
6. From the title, press A to start. In gameplay, left stick should move, Start should pause, View should open/close the sonar map, and A should dive/confirm.
7. If it still does not move, send the exact controller-panel values for `API`, `Secure`, `Focus`, `Pad`, `Buttons`, `Axes`, and `Action`.
