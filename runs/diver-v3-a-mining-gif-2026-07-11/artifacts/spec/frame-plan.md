# Diver V3 A refined mining frame contract

Gate: `?playtest=1&diverMotionTest=v3a-refined-mining`. The accepted parent gate remains `v3a-refined`.

| Index | Drawing | Normalized live cooldown progress | Read |
|---:|---|---:|---|
| 10 | mining-anticipation | 0–22% | cutter raised; hands draw in |
| 11 | mining-contact | 22–48% | full extension; cyan tip/contact star |
| 12 | mining-recoil | 48–73% | compressed low recoil |
| 13 | mining-recover | 73–100% | rising recovery into retrigger |

The base cadence is 480 ms and upgrades reduce it to 240 ms. Frames are selected from normalized `player.mineCooldown`, so pose changes stay synchronized with real terrain mutation cadence. Runtime contact particles remain authoritative. A short live guide is drawn from the cutter-tip direction to the exact stored terrain contact only during valid drill contact.

All drawings are 128×96 RGBA, binary alpha, transparent RGB zero, pivot `(64,52)`. Helmet, faceplate, tanks, and backpack are registration-locked to refined scanner-hold index 8. Left alpha is the exact counterpart of right, followed by screen-space relighting and an authored port-side cyan pressure detail.
