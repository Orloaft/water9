# Source Image Inbox

Drop generated whole-source creature images here before batch ingest.

Build the current handoff pack first:

```bash
npm run source:generation-queue
npm run source:contracts
npm run source:inbox-pack
```

Then open `tools/source-inbox/HANDOFF.md`. It lists the current priority order,
the source-art contract for each candidate, and the exact filename expected in
this folder.

`source:inbox-check` and `source:ingest-batch` run the same mechanical source
image validation used after ingest: flat magenta border/background, reasonable
subject coverage, crop margin, and low magenta contamination inside the subject.
Images that fail those checks must be rejected or fixed before rigging.

Accepted filenames:

- `<candidate-id>.png`
- `fauna-<candidate-id>-whole-source.png`

Recommended loop:

```bash
npm run source:generation-queue
npm run source:contracts
npm run source:inbox-pack
npm run source:inbox-check -- --dir tools/source-inbox --strict
npm run source:ingest-batch -- --dir tools/source-inbox --strict --dry-run
npm run source:ingest-batch -- --dir tools/source-inbox --strict
npm run source:check
npm run source:gallery
```

If built-in image generation renders a good source image inline but does not
write an accessible file under `$CODEX_HOME/generated_images`, save/download the
inline image to the exact inbox filename from `HANDOFF.md`, for example:

```bash
tools/source-inbox/gulper-eel-maw.png
```

Then run the same inbox-check and batch-ingest loop above. `npm run
source:imagegen-status -- --id <candidate-id>` also prints the current manual
inbox target and the exact follow-up commands.

For a faster local intake path, run:

```bash
npm run source:inbox-capture
```

This opens a local browser page where you can paste, drop, or choose the
generated image. The server validates the magenta source image and writes it to
the correct inbox filename before you run the normal inbox-check and ingest
commands.

Do not ingest images that fail the required read in the generation queue.
