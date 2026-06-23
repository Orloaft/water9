# Water 9 Source Generation Queue

Candidates queued: `0`
Prompt directory: `/mnt/nxt-dev/water9/public/review/source-candidates/generation-queue-prompts`

Use this queue for Imagen/source-art work. Generate one whole-source creature image at a time on a flat `#ff00ff` magenta background. Ingest only outputs that pass the required read and quality checks; otherwise log a rejected attempt.

## Standard Loop

```bash
npm run source:generation-queue
npm run source:imagegen-mark -- --id <candidate-id>
# run image generation from the prompt file
npm run source:imagegen-status -- --id <candidate-id>
# if exactly one generated file appears, this validates and ingests it safely:
npm run source:imagegen-status -- --id <candidate-id> --ingest
# otherwise ingest a specific file explicitly:
npm run source:ingest -- --id <candidate-id> --image <image-path> --copy
npm run source:image-check -- --id <candidate-id>
npm run source:gallery
npm run source:check
```

