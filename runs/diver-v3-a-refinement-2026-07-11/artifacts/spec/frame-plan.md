# Diver V3 A refinement frame and timing contract

This is a bounded refinement review slice, not the complete action-set replacement.

| Index | Name | Clip | Runtime timing | Right texture | Left texture |
|---:|---|---|---:|---|---|
| 0 | hover-settle-a | hover | 120 ms | `diver-v3-refined-r-0` | `diver-v3-refined-l-0` |
| 1 | hover-inbetween | hover | 120 ms | `diver-v3-refined-r-1` | `diver-v3-refined-l-1` |
| 2 | hover-settle-b | hover | 120 ms | `diver-v3-refined-r-2` | `diver-v3-refined-l-2` |
| 3 | swim-propulsion | swim | 82 ms | `diver-v3-refined-r-3` | `diver-v3-refined-l-3` |
| 4 | swim-transition-a | swim | 82 ms | `diver-v3-refined-r-4` | `diver-v3-refined-l-4` |
| 5 | swim-cruise | swim | 92 ms | `diver-v3-refined-r-5` | `diver-v3-refined-l-5` |
| 6 | swim-transition-b | swim | 82 ms | `diver-v3-refined-r-6` | `diver-v3-refined-l-6` |
| 7 | scanner-deploy | scanner | 220 ms | `diver-v3-refined-r-7` | `diver-v3-refined-l-7` |
| 8 | scanner-hold | scanner | held while live target exists | `diver-v3-refined-r-8` | `diver-v3-refined-l-8` |
| 9 | scanner-recover | scanner | 650 ms readable window | `diver-v3-refined-r-9` | `diver-v3-refined-l-9` |

- Cell: 128×96 RGBA; binary runtime alpha; transparent RGB zero.
- Fixed pivot: `(64,52)` for every direction and frame.
- Registration landmark: visor component centered at `(99,43)` on right; exact horizontal counterpart on authored-left alpha.
- Scanner socket: `(116,52)` right, `(12,52)` left. The modular cone is drawn from that gameplay-space offset toward `player.scanTarget` only while scanner primary is held and the live target remains valid.
- Gate: `?playtest=1&diverMotionTest=v3a-refined`. Default gameplay and the accepted `v3a` prototype remain unchanged.

The three-frame hover loop and four-frame swim loop are the minimum useful additions that remove two-key alternation. No mining, damage, death, boost, idle variants, or unrelated clips were added.
