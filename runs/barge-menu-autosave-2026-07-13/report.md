# Barge-menu autosave report

## Root integration point

`DeepdiveScene.updateSystems()` is the sole normal-gameplay transition that
recognizes a player returning from the water to the barge. It sets `atBoat` and
`docked`, which makes the existing barge menu render. The autosave is invoked
there through the existing `DeepdiveScene.saveGame()` method, after docking
cleanup, cargo sale, and refills have completed.

The guard is a per-transition value:

```ts
const dockedThisFrame = !wasAtBoat && !state.docked && state.started && this.isAtBoat();
```

It therefore cannot run for startup, a restored docked save, HUD renders, or
later update ticks while docked. Diving clears both dock flags; a later physical
return creates a new transition and one new save.

## Changed files

- `src/scene.ts` — autosave at the genuine docking transition, using the
  canonical save serializer/storage slot.
- `src/scene-playtest.ts` — makes the existing `dock` test command enter the
  barge through `updateSystems()` rather than setting dock flags directly.
- `tools/test_barge_menu_autosave.mjs` — focused Playwright/localStorage
  regression smoke.
- `runs/barge-menu-autosave-2026-07-13/report.md` — this report.

## Regression coverage

`tools/test_barge_menu_autosave.mjs` wraps the save-slot `Storage.setItem` and
examines parsed persisted data. It proves:

- startup creates zero save writes;
- the first dock writes exactly once and stores 4,242 credits;
- repeated docked system updates leave the write count at one;
- loading restores the saved 4,242 credits without rewriting the slot;
- diving, changing credits to 7,331, and docking again produces exactly the
  second write with the newer value.

## Verification

- `node tools/test_barge_menu_autosave.mjs` — passed (Playwright; port 5193).
- `WATER9_SAVE_LOAD_OUT_DIR=/mnt/nxt-dev/water9/runs/barge-menu-autosave-2026-07-13 WATER9_SAVE_LOAD_REPORT=/mnt/nxt-dev/water9/runs/barge-menu-autosave-2026-07-13/save-load-smoke.json WATER9_SAVE_LOAD_PORT=5194 npm run water9:save-load-smoke` — passed.
- `npm run build` — passed. Vite retained its pre-existing generated-asset
  runtime-resolution warnings and the >500 kB chunk warning.

## Caveats

No UI/modal was added; the canonical save method supplies the existing save
status feedback. This is behavioral work, so no screenshots were needed.
Pre-existing unrelated `runs/` worktree dirt was left untouched.
