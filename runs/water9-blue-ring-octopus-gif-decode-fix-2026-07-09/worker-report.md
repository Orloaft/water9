# Blue Ring Octopus GIF Decode Fix Worker Report

Status: complete

Preflight:

```sh
git -C /mnt/nxt-dev/water9 rev-parse --short HEAD
```

Result: `89121a1`

## Root Cause

The previous delivered GIF is structurally corrupt after the first image frame, not a runtime animation problem and not merely subtle source motion.

Evidence:

- `old-gif-ffprobe-output.txt` reproduces `LZW init failed`, `nb_read_frames: "1"`, and `duration: "0.240000"`.
- `old-gif-parse-diagnosis.json` parses the GIF stream through the failure point. Frame 0 has a valid LZW minimum code size of `8`; frame 1 advertises a local color table and then has LZW minimum code size `0`, which is invalid GIF image data. ffmpeg stops after the first decodable frame, so viewers can read it as static.
- The old GIF graphic-control delay metadata was present (`12` centiseconds), so this was not primarily a delay/disposal issue.

## Output

Corrected GIF:

- `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-gif-decode-fix-2026-07-09/blue-ring-octopus-pingpong-8fps-decode-fixed.gif`

It was generated from the current runtime Blue Ring Octopus loose frames:

- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-0.png`
- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-1.png`
- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-2.png`
- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-3.png`
- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-4.png`
- `/mnt/nxt-dev/water9/public/assets/generated/fauna-shallow-blue-ring-octopus-5.png`

Playback order: `0,1,2,3,4,5,4,3,2,1`

The review GIF is scaled to `608x384` on a neutral dark-water background so the motion remains readable on a phone. ffmpeg encoded the 8 fps cadence as alternating `0.12`/`0.13` second frame delays, which is the normal centisecond approximation for about 8 fps.

## Diagnostics

- Decode stream probe: `corrected-gif-ffprobe-stream.json`
- Per-frame delays: `corrected-gif-ffprobe-frames.json`
- Decoded adjacent-frame deltas: `decoded-adjacent-frame-deltas.json`
- Color contact sheet from exact decoded GIF frames: `blue-ring-octopus-decoded-contact-sheet.png`
- Grayscale contact sheet from exact decoded GIF frames: `blue-ring-octopus-decoded-grayscale-contact-sheet.png`
- Phone-scale contact sheet: `blue-ring-octopus-decoded-phone-scale-contact-sheet.png`
- Phone-scale grayscale contact sheet: `blue-ring-octopus-decoded-phone-scale-grayscale-contact-sheet.png`
- Frame-edge/bleed check: `frame-edge-bleed-check.json`
- Source frame trace: `blue-ring-octopus-source-frame-trace.json`
- Old GIF parser diagnosis: `old-gif-parse-diagnosis.json`

## Verification

Corrected GIF decode check:

```sh
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames,avg_frame_rate,r_frame_rate,duration,width,height -of json runs/water9-blue-ring-octopus-gif-decode-fix-2026-07-09/blue-ring-octopus-pingpong-8fps-decode-fixed.gif
```

Result:

```json
{
  "width": 608,
  "height": 384,
  "r_frame_rate": "8/1",
  "avg_frame_rate": "25/3",
  "duration": "1.260000",
  "nb_read_frames": "10"
}
```

Decoded-frame extraction:

```sh
ffmpeg -hide_banner -y -i runs/water9-blue-ring-octopus-gif-decode-fix-2026-07-09/blue-ring-octopus-pingpong-8fps-decode-fixed.gif runs/water9-blue-ring-octopus-gif-decode-fix-2026-07-09/decoded-gif-frames/decoded-%02d.png
```

Result: decoded `10` frames with no LZW/decode error.

Adjacent-frame delta proof:

- `decoded-adjacent-frame-deltas.json`
- Minimum changed fraction in decoded frames: `0.497319`
- Minimum mean absolute RGB delta: `27.5035`
- Every adjacent decoded pair has non-zero movement.

Frame-edge/bleed proof:

- `frame-edge-bleed-check.json`
- All six current runtime loose frames have left/right/top/bottom edge alpha counts `0`.
- `sourceEdgeBleed: false`

Runtime/source changes:

- None. I did not change runtime, manifest, asset, or build scripts.
- No build/typecheck or Blue Ring Octopus runtime smoke was rerun because this fix only replaces the exported preview GIF and writes run diagnostics. The generated trace verifies the preview source frames/order match the runtime manifest frames already under review.

Changed files:

- New run evidence only under `/mnt/nxt-dev/water9/runs/water9-blue-ring-octopus-gif-decode-fix-2026-07-09/`

Caveats/blockers: none.
