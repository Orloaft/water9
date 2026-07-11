# Diver V3 A motion-test frame contract

This is a seven-frame review slice, not the full diver replacement.

| Index | Name | Clip | Timing | Behavior | Pivot | Key sockets (lead/support/effect) |
|---:|---|---|---:|---|---|---|
| 0 | hover-settle-a | hover | 180 ms | loop A | 64,52 | 113,57 / 96,73 / 118,57 |
| 1 | hover-settle-b | hover | 180 ms | loop B | 64,52 | 113,58 / 96,72 / 118,58 |
| 2 | swim-propulsion | swim | 125 ms | propulsion | 64,52 | 115,52 / 89,69 / 120,52 |
| 3 | swim-cruise | swim | 145 ms | recovery/cruise | 64,52 | 115,51 / 89,68 / 120,51 |
| 4 | scanner-deploy | scanner | 130 ms | one-shot deploy | 64,52 | 105,61 / 92,61 / 119,58 |
| 5 | scanner-hold | scanner | 240 ms nominal | hold while valid scan target exists | 64,52 | 104,58 / 92,62 / 120,55 |
| 6 | scanner-recover | scanner | 150 ms nominal | 650 ms readable runtime recovery window, then hover | 64,52 | 104,61 / 91,63 / 118,59 |

- Runtime cell: 128×96 RGBA; safe bounds `(6,8)–(122,88)`; right-facing authored orientation.
- Runtime alpha is binary and transparent RGB is zero. High-resolution transparent masters retain graded antialiasing.
- The body/root pivot is fixed. Effects remain modular and originate from the recorded effect socket.
- Runtime selection is gated by `?diverMotionTest=v3a`. Without that flag the legacy diver path remains unchanged.
- Hover and swim are two-frame loops. Scanner deploy advances to hold while a valid target is actively scanned, then recover displays after release.

## Palette and material notes

Reduction consolidates each authored master to a local 32-color runtime palette to suppress painterly shimmer. The hierarchy remains canonical: near-black rubber/outline, brass shadow/mid/light, copper dorsal pack, sparse oxidation, dark cyan visor boundary, and a localized bright cyan beacon. Screen-space light remains upper-left. No scan beam, arc, bubbles, wake, or HUD mark is baked into body frames.
