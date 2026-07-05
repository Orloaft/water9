# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs >> captures normal-play B1 landmark, mining, and FPS/seam proof from #game canvas
- Location: runs/water9-mining-polish-landmark-fps-2026-07-04/mining-landmark-fps-playwright.spec.mjs:629:1

# Error details

```
Error: page.evaluate: TypeError: Cannot set properties of undefined (setting '48')
    at stagePerfGuardrailReview (http://127.0.0.1:5180/src/scene-playtest.ts?t=1783220432019:1171:28)
    at DeepdiveScene.playtestCommand (http://127.0.0.1:5180/src/scene-playtest.ts?t=1783220432019:2341:10)
    at Object.command (http://127.0.0.1:5180/src/main.ts?t=1783220432019:13:45)
    at eval (eval at evaluate (:302:30), <anonymous>:1:60)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- main [ref=e3]:
  - complementary [ref=e6]:
    - img "Water 9" [ref=e8]
    - generic [ref=e9]:
      - button "Play" [ref=e10] [cursor=pointer]
      - button "Load Game" [disabled] [ref=e11]
      - button "Options" [ref=e12] [cursor=pointer]
      - button "Controls" [ref=e13] [cursor=pointer]
```