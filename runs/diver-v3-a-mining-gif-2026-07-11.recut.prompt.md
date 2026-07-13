You own a delivery-media-only correction for the completed Water9 Diver V3 mining slice at commit `6427566e3238900992166e371815f97a47b66316`.

Before any work, run
`git -C /mnt/nxt-dev/water9 rev-parse --short HEAD`. If it fails, STOP and
report MOUNT_DOWN — do not improvise alternate paths, do not write anywhere
else.

Repo: `/mnt/nxt-dev/water9`. Read `runs/diver-v3-a-mining-gif-2026-07-11/report.md` and inspect the existing delivery GIF and raw/direct-canvas capture sources. Preserve unrelated dirty work. Do not modify runtime code or generated sprite assets.

Manager rejection: the first 720×450 full-canvas GIF makes the diver too small for a phone, and the opening swim section is too dark. Recut the delivery media so the diver and limb/tool motion are unmistakably readable at Telegram phone size.

Requirements:
- Use only actual normal-play `#game canvas` capture frames from the accepted gated runtime; do not fabricate a harness or procedural animation.
- Use a stable subject-following crop or carefully selected fixed crops around the diver, enlarged enough that the sprite animation is clear while retaining enough environment to prove gameplay context. Avoid disorienting camera jumps.
- Correct the swim segment's presentation with frame selection/crop and modest whole-frame delivery grading if needed; do not repaint the sprite or misrepresent runtime visuals. Preserve intentional underwater mood while preventing near-black unreadability.
- Show a readable swim segment, a clean transition, then at least two unmistakable mining cycles including anticipation/contact/recoil and world impact feedback.
- No browser/debug chrome. Loop cleanly. Target roughly 5–7 seconds, 10–15 fps, Telegram-friendly dimensions and under 5 MB.
- Replace `artifacts/delivery/diver-v3-swim-and-mine.gif` and, if beneficial, replace/add 2–4 tighter delivery PNGs. Update the report's delivery metadata, SHA manifest, and blunt visual verdict. Keep the original runtime/build evidence intact.
- Create a 6-frame contact sheet sampling the final GIF for manager review, in the existing review artifact folder.
- Verify GIF dimensions, duration, frame count/fps, infinite loop, bytes, and hash with available tools. Run `git diff --check`.

Commit only the bounded delivery/review/report/manifest correction. Stage files by explicit path only. `git add -A`, `git add .`, and `git commit -a` are forbidden. Before committing, run `git status --short` and confirm every staged path belongs to your assigned stage.

Return status, commit hash, final GIF and screenshot paths, contact-sheet path, GIF metadata, verification, and any caveat.
