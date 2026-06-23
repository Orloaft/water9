# Water 9 Content Pipeline

This file is the working checklist for turning new underwater threats into
testable game content.

## Quick Preview

Run the dev server and open the sandbox URL:

```bash
npm run dev -- --port 5177
```

Then open one of:

- `http://127.0.0.1:5177/?sandbox=abyssal-gulper`
- `http://127.0.0.1:5177/?sandbox=abyssal-crownmaw`
- `http://127.0.0.1:5177/?sandbox=abyssal-serpent`
- `http://127.0.0.1:5177/?sandbox=chainmaw-eel`
- `http://127.0.0.1:5177/?sandbox=hookjaw-isopod`
- `http://127.0.0.1:5177/?sandbox=cavitation-boxer`
- `http://127.0.0.1:5177/?sandbox=siphon-lily`
- `http://127.0.0.1:5177/?sandbox=harpoon-cone`
- `http://127.0.0.1:5177/?sandbox=sand-battery`
- `http://127.0.0.1:5177/?entity=diver`

For a browseable list of every sandbox-previewable entity, generate the sandbox
index:

```bash
npm run sandbox:index
npm run sandbox:preview -- --id abyssal-gulper
npm run sandbox:preview -- --id diver
npm run sandbox:preview -- --list --kind articulated
npm run sandbox:preview -- --list --rebuild
```

`sandbox:preview` is read-only by default. Use `npm run sandbox:index` or pass
`--rebuild` when you intentionally want to regenerate the sandbox index before
lookup.

For a one-command local preview, let the preview tool start Vite and print the
working URL. It automatically moves to the next open port if the requested port
is busy:

```bash
npm run sandbox:preview -- --id abyssal-gulper --serve
npm run sandbox:preview -- --id abyssal-gulper --with diver --serve --visual
npm run sandbox:preview -- --id diver --serve
npm run sandbox:preview -- --id gulper --kind articulated --best --with diver --serve --visual
```

Add `--open` to request opening the URL in the system browser.

`gulper-eel-maw` is a source-candidate id and is not sandbox-previewable until a
recoverable source image is ingested. For the current playable/prototype gulper
paired with the diver, use `abyssal-gulper` or the `gulper --kind articulated
--best` lookup above.

Then open:

- `http://127.0.0.1:5177/review/sandbox/index.html`

The index includes articulated threats, the diver, subs, fish, flora, shop
items, ore icons, and core stage objects. Use it when adding content so new
entities can be opened in the sandbox without remembering URL parameters.

Controls:

- Left/Right: cycle entity
- Space: lunge pose
- S: stunned pose
- R: reset pose

The sandbox uses the same generated assets and articulated manifest as the
game, so bad sockets, missing textures, and awkward silhouette problems are
visible before a full run. Run `npm run sandbox:check` before opening the
browser to catch missing generated frames, icons, and object textures quickly.
For browser-level preview confidence, run `npm run sandbox:visual`; it opens each
registered articulated sandbox URL plus core entity previews such as `diver`,
`sub-tier1`, `barge-platform`, `bobbit`, and `nest-egg`. It verifies the sandbox
readback matches the requested id, checks for a nonblank canvas, and saves
screenshots plus a JSON report under `tools/scratch/sandbox-visuals*`.
Articulated threats are captured in `idle`, `lunge`, and `stunned` states; final
acceptance requires those per-state screenshots and metrics so one static
nonblank canvas cannot stand in for behavior review. The sandbox report also
records an asset fingerprint for articulated threats; `content:accept` and
`content:gate` require it to match the current runtime/source/texture files.
Saved screenshot filenames include the review stage, companion, and state, and
each screenshot has a sidecar JSON file with the id, review stage, quality
status, state, source URL, and asset fingerprint. Accepted content must carry
those sidecars, so copied screenshots remain auditable outside the report.
The visual checker also records per-state framing metrics from the saved
screenshots. Accepted content must be freshly checked with a reviewable silhouette:
the subject cannot fill nearly the whole viewport, touch both sides of the frame,
or rely on an old nonblank-only report.

Focused browser checks are useful while iterating on one entity or comparing a
new threat against the player scale. Any id in
`public/review/sandbox/manifest.json` can be checked, not just articulated
threats:

```bash
npm run sandbox:visual -- --ids diver
npm run sandbox:visual -- --ids diver,abyssal-gulper
npm run sandbox:visual -- --ids fauna-abyss-viperfish
npm run sandbox:visual -- --ids flora-black-fan
npm run sandbox:visual -- --ids brine-crown --states idle,lunge,stunned
```

For broader smoke coverage of the generated sandbox index:

```bash
npm run sandbox:visual -- --all-catalog
npm run sandbox:visual -- --kinds fish,flora --limit 12
```

For focused still-frame review, render just one creature:

```bash
npm run articulated:preview -- --creature-id chainmaw-eel \
  --out tools/scratch/chainmaw-contact-sheet.png \
  --phase-strip-out tools/scratch/chainmaw-phase-strip.png
```

The renderer fails on unknown ids, so bad preview links and typoed manifests are
caught immediately.

The seam validator also supports focused iteration on one rig. Use this after
editing a builder before paying for the full all-creature seam pass:

```bash
npm run articulated:seams -- --creature-id cavitation-boxer
```


For a browser gallery of all articulated creatures, run:

```bash
npm run review:articulated
```

For routine iteration after the first full render, use the incremental path. It
hashes each creature's source manifest and generated textures into
`render-cache.json`, then rerenders only changed review sheets while still
rebuilding the gallery metadata:

```bash
npm run review:articulated:quick
```

Then open:

- `http://127.0.0.1:5177/review/articulated/index.html`

The gallery shows quality status, source links, lightweight thumbnails, full
contact sheets, phase strips, source-parity overlays, dry-run acceptance command
templates, manual visual cohesion checks, required evidence flags, and one-click
sandbox links for each registered creature. It also emits `review-manifest.json`
for automation. Each review item includes an input fingerprint derived from the
runtime creature, source manifest, whole source image, and generated textures.
The final gate compares that fingerprint against the current files so accepted
content cannot rely on stale contact sheets or phase strips after assets change.

Verify the review packet, thumbnails, and render cache with:

```bash
npm run review:check
```

## Quality Gate

The long-term bar is 20 accepted underwater threats. The strict gate is:

```bash
npm run content:gate
```

This gate now counts only creatures with accepted quality metadata. A creature can
be registered, load in-game, and still count as `prototype` until it has passed
visual review. That distinction is intentional: it prevents placeholder or
non-cohesive rigs from quietly satisfying the 20-threat goal.

During development, current-manifest smoke validation is:

```bash
npm run content:gate:smoke
```

The smoke gate allows prototypes so we can verify that the sandbox/catalog and
articulated infrastructure still work while content is being built. The final
gate does not allow prototypes.

Every threat must satisfy the structural gate:

- unique id, species name, rarity, biome/depth placement
- at least 5 articulated parts and 3 socket overlays
- head, torso, and tail anatomy roles
- explicit motion kinds for every part
- valid parent/child anchors and existing textures
- source-manifest provenance for generated parts
- source parity, seam sampling, thumbnail review packet, contact sheet, phase
  strip, and browser playtest screenshots before it is considered shippable

Every accepted threat must also satisfy the cohesion gate:

- the browser review sheet and sandbox preview have been visually approved for
  coherent silhouette, readable anatomy, stable pose timing, and non-placeholder
  art direction
- `quality.status` is `accepted`
- `quality.sourceCohesion` is `single-source`
- `quality.backgroundKey` is `magenta`
- `quality.reviewedBy` records who accepted the sandbox/contact-sheet review
- `quality.sourceCandidateId` links the rig to an approved source-candidate
  record from `public/review/source-candidates/source-candidates.json`
- that source-candidate record has been promoted to `rigged`, points back to
  the accepted creature id, and uses the same whole-source image as the
  articulated source manifest
- all visible parts come from one whole-source creature design rather than a
  collage of rescued placeholders
- `quality.visualChecklist` records explicit approval for source cohesion,
  readable silhouette, believable anatomy, production-intent visual cohesion,
  clean socket seams, stable phase-strip motion, and sandbox behavior
- `quality.visualScores` records a 1-5 score for every visual checklist item;
  every accepted score must be 4 or 5. A score of 3 means the creature remains a
  technical prototype even if it renders and animates.
- automated parity/seam checks are treated as necessary evidence, not proof of
  aesthetic acceptance

After visual review, promote or demote a prototype with the gallery's generated
dry-run command template. The template intentionally does not pre-fill approval
flags; add each flag only after that exact evidence has been inspected. Removing
`--dry-run` requires every visual check flag, every visual score, and every
evidence flag:

```bash
npm run content:accept -- --id chainmaw-eel --status accepted --reviewed-by <human-reviewer> \
  --source-candidate <approved-source-candidate-id> \
  --note "Approved after source, contact sheet, phase strip, sandbox, and source-candidate review." \
  --visual-check single-source-cohesion \
  --visual-check readable-silhouette \
  --visual-check anatomy-cohesion \
  --visual-check production-visual-cohesion \
  --visual-check socket-seams \
  --visual-check motion-stability \
  --visual-check sandbox-behavior \
  --score single-source-cohesion=4 \
  --score readable-silhouette=4 \
  --score anatomy-cohesion=4 \
  --score production-visual-cohesion=4 \
  --score socket-seams=4 \
  --score motion-stability=4 \
  --score sandbox-behavior=4 \
  --source-reviewed \
  --contact-reviewed \
  --phase-reviewed \
  --sandbox-reviewed
```

Use `5` only when the creature is strongly production-ready. Use `4` when it is
good enough to count toward the 20-threat goal. Use `3` or lower to keep it in
prototype status; that is the correct result for placeholder-looking or visually
incohesive rigs.

The accept tool refuses to accept legacy-composite or non-magenta-source rigs,
AI/self-reviewed art, placeholder-quality rigs, missing review evidence, vague
approval notes, and rigs that are not linked with `--source-candidate` to an
approved source-first review record. On successful acceptance, the
source-candidate record is promoted to `rigged` and linked back to the creature;
the strict gate requires that back-link and rejects rigs whose articulated source
image does not match the approved source-candidate image. The strict content gate also cross-checks accepted creatures against
fresh review artifacts: `public/review/articulated/review-manifest.json`, source
thumbnails, contact sheets, phase strips, source-parity overlays, the approved
source-candidate manifest, and the JSON/screenshots from `npm run
sandbox:visual`. A checked approval flag is not enough; accepted content must
have source, review, and browser-preview evidence on disk.

The accept tool and strict gate scan the default sandbox report and any focused
`tools/scratch/sandbox*report*.json` / `tools/scratch/sandbox-visuals*report*.json`
files, then uses the newest report per entity. This means focused checks such as
`npm run sandbox:visual -- --ids brine-crown` can satisfy sandbox evidence for
that accepted creature without requiring one huge all-threat browser run every
time.

Current status: 14 registered prototypes, 0 accepted threats. Abyssal Serpent,
Abyssal Gulper, Abyssal Crownmaw, Chainmaw Eel, Sawback Ray, Thornhalo Urchin,
Hookjaw Isopod, Cavitation Boxer, Siphon Lily, Harpoon Cone, Sand Battery,
Trap-Jaw Bristle, Velvet Lantern Cuttle, and Brine Crown are single-source
magenta prototypes under the stricter gate. They still need visual acceptance
before they count toward the 20-threat goal.

## Image Asset Workflow

Run `npm run content:status` before resuming content work. It reports research
brief counts, source-candidate status, prompt queue size, ingested source images,
accepted articulated threats, sandbox visual coverage, and the next bottleneck
against the 20-threat target.
The JSON output also includes `sourceGenerationSprint`: active sprint ids,
matching files already present in `tools/source-inbox`, missing sprint files,
focused inbox validation/ingest commands, and the active source-image marker for
inline recovery.

For a concrete per-item checklist, run:

```bash
npm run content:readiness
npm run content:stage-board
npm run content:acceptance-audit -- --id brine-crown
```

This writes `public/review/content-readiness.md` and
`public/review/content-readiness.json`. The report lists blockers and next
commands for each source candidate and each articulated threat, including stale
fingerprints, missing source images, missing key previews, missing sandbox
states, and unaccepted quality metadata.

`npm run content:stage-board` writes
`public/review/content-stage-board.md` and
`public/review/content-stage-board.json`. Use it as the operational board for
the 20-threat goal: each source candidate is assigned a stage such as
`source-image-needed`, `source-review-needed`, `rigging-needed`,
`sandbox-review-needed`, or `accepted`, with exact next commands.

`npm run content:acceptance-audit -- --id <candidate-or-creature-id>` writes
`public/review/content-acceptance-audit.md` and `.json`. Use it for the current
vertical slice before attempting approval. It verifies source-gallery evidence,
articulated review evidence, latest sandbox visual evidence, stale fingerprints,
required sandbox states, and screenshot framing metrics, then prints the dry-run
source/threat approval commands. The audit is read-only and does not replace the
human review required by `source:accept` and `content:accept`.

1. Research the biological anchor and gameplay verb. Subagent briefs should
   land in `public/review/source-candidates/research-briefs.json`.
2. Append returned subagent JSON with
   `npm run research:append -- --input <brief-array.json>`. Use `--dry-run`
   first for untrusted batches and `--overwrite` only when intentionally
   replacing an existing brief.
3. Run `npm run research:check` to validate required reads, biological anchors,
   prompt risks, articulatable parts, motion phases, and magenta whole-source
   prompt language.
   For parallel audit/delegation work, generate the subagent pack:

   ```bash
   npm run research:subagent-pack
   ```

   This writes `public/review/source-candidates/research-subagent-pack.md`,
   `public/review/source-candidates/research-subagent-pack.json`, and one
   assignment file per research lane under
   `public/review/source-candidates/research-subagent-assignments/`. Use these
   files as read-only prompts for subagents. Returned findings should be
   reviewed, then applied through normal research manifest edits and validated
   with `npm run research:check`.
4. Import ready briefs with `npm run research:import -- --id <brief-id>`, or
   batch-import every ready brief with `npm run research:import -- --all`. This
   creates draft entries in `public/review/source-candidates/source-candidates.json`.
5. Export source-art prompts with `npm run source:prompts`. The JSONL packet at
   `public/review/source-candidates/imagen-prompts.jsonl` is the handoff for
   whole-creature source generation on a solid magenta background. The prompt
   exporter reads the same queue prompt files as `source:session`, so audit
   hardening is preserved in batch JSONL handoffs.
   `npm run source:handoff-check` validates that the JSONL prompt packet and
   source handoff pack still match the queue prompt files, including research
   audit hardening, quality checks, source pose rules, and required-read
   criteria.
6. For a small focused Imagen sprint, generate the top queued prompts into one
   packet:

   ```bash
   npm run source:sprint
   ```

   This writes `public/review/source-candidates/source-generation-sprint.md`
   and `.json`. The packet contains the top queued prompts, exact inbox
   filenames such as `tools/source-inbox/gulper-eel-maw.png`, art contracts,
   required-read checks, and the focused batch commands.

   After saving generated images into the listed inbox filenames, validate and
   ingest only that sprint:

   ```bash
   npm run source:inbox-check -- --dir tools/source-inbox --strict --ids gulper-eel-maw,saber-viperfish,glass-sponge-sentinel
   npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids gulper-eel-maw,saber-viperfish,glass-sponge-sentinel --dry-run
   npm run source:ingest-batch -- --dir tools/source-inbox --strict --ids gulper-eel-maw,saber-viperfish,glass-sponge-sentinel
   npm run source:check
   npm run source:gallery
   ```

   Use `--limit <n>` or `--ids <candidate-id,...>` with `source:sprint` when
   the next generation pass should target a smaller or hand-picked set.

   If the image generator renders a good image inline but does not leave a file
   under `$CODEX_HOME/generated_images`, save/download that inline image to your
   browser downloads folder and recover it into the sprint inbox:

   ```bash
   npm run source:recover-inline -- --id gulper-eel-maw
   npm run source:recover-inline -- --id gulper-eel-maw --copy --validate
   npm run source:inbox-check -- --dir tools/source-inbox --strict --ids gulper-eel-maw
   ```

   The recovery tool reads the active `source:session` marker, scans
   `~/Downloads` for images newer than that marker, and copies exactly one
   chosen file into `tools/source-inbox/<candidate-id>.<ext>` only when `--copy`
   is supplied. Add `--validate` to run the source-image magenta/background
   validator before the copy. If several files are found, pass
   `--image <path> --copy --validate` to choose one explicitly.

   For priority-ordered Imagen work, run:

   ```bash
   npm run source:generation-queue
   ```

   This writes `public/review/source-candidates/source-generation-queue.md`,
   `public/review/source-candidates/source-generation-queue.json`, and one
   prompt file per queued candidate under
   `public/review/source-candidates/generation-queue-prompts/`. Use this when
   working through the missing source-image bottleneck; it preserves priority,
   expected output paths, ingest commands, rejection commands, and source
   quality checks in one auditable queue. The generated prompt files include a
   source-pose contract: the image must be a neutral riggable source pose with
   visible pivots and attack direction, not a peak impact frame or VFX-heavy
   action shot. When subagent research audits exist, the prompt files also
   include `Research audit hardening` guidance: biological anchors, additional
   required-read corrections, source-generation risks to avoid, motion-phase
   reads, and reference search terms. Use those prompt files or
   `npm run source:session`; do not copy only the base candidate prompt.

   Validate that the queue and per-candidate prompt files are still current with:

   ```bash
   npm run source:generation-queue:check
   ```

   For a human-readable batch packet that includes each prompt, required visual
   read, expected output path, ingest commands, and rejection commands, run:

   ```bash
   npm run source:handoff-pack
   npm run source:handoff-check
   ```

   Open `public/review/source-candidates/source-handoff-pack.md` when running a
   source-generation batch. Like `source:next-prompt`, it uses the hardened
   queue prompt file for each candidate rather than the weaker base prompt.

   For one high-bar creature review, build an exemplar packet:

   ```bash
   npm run content:exemplar-pack -- --id brine-crown
   ```

   This writes `public/review/exemplar-packs/<id>.md` and `.json` with the
   sandbox preview command, latest sandbox visual evidence, source thumbnails,
   contact sheet, phase strip, source-parity overlay, remaining blockers, and
   dry-run source/threat acceptance commands. Use this before accepting the
   first production-quality exemplar; it is designed to catch the "looks good
   only when explained" failure mode.

   To run the full quick review loop for one entity, use:

   ```bash
   npm run content:quick-review -- --id brine-crown
   ```

   This rebuilds the sandbox index, resolves the preview URL, captures sandbox
   visual evidence, refreshes articulated/source review galleries for
   articulated threats, refreshes the acceptance audit, rebuilds the exemplar
   pack, and writes `public/review/quick-reviews/<id>.md` and `.json`.
   Validate generated quick-review packets with:

   ```bash
   npm run content:quick-review-check -- --id brine-crown
   ```

   For the next missing source-image bottleneck, build a focused source packet:

   ```bash
   npm run source:focus-pack
   npm run source:focus-pack:all
   ```

   This writes `public/review/source-candidates/focus-packs/<id>.md` and `.json`
   for the top queued source candidate, or one packet per queued candidate plus
   `focus-packs/index.md` when using `source:focus-pack:all`. Each packet
   includes the exact hardened prompt, research audit hardening, source contract
   path, inbox target, rejection criteria, post-generation ingest commands, and
   a dry-run human source approval command. Validate packets with
   `npm run source:focus-check` or `npm run source:focus-check:all`; full focus
   pack generation and validation are included in `npm run source:check`.

   After a source image exists, build a rigging focus packet:

   ```bash
   npm run content:rigging-pack
   npm run content:rigging-pack-check
   ```

   This writes `public/review/rigging-packs/<id>.md` and `.json` for each source
   candidate with a whole-source image. It records the current stage, blockers,
   human source approval command, articulation-plan commands, extraction
   commands, sandbox review commands, and final threat-acceptance dry run.

   Build the stricter source-art contracts before generation:

   ```bash
   npm run source:contracts
   ```

   This writes `public/review/source-candidates/art-contracts.md` plus one JSON
   and one Markdown contract per source candidate under
   `public/review/source-candidates/art-contracts/`. These contracts are the
   pass/fail sheets for generated art: they combine the prompt, required visual
   read, neutral source-pose rules, crop/extraction parts,
   global collage/background rejection rules, and exact ingest/reject commands.
   If an image does not satisfy its contract, reject it before extraction or
   rigging.

   Research subagents use the assignment pack generated by:

   ```bash
   npm run research:subagent-pack
   ```

   Save completed subagent findings as
   `water9/subagent-research-audit@1` JSON files under
   `public/review/source-candidates/research-subagent-audits/`. The normal
   `npm run research:check` validates the audit schema when files are present.
   For a strict proof that all assignment lanes returned results, run:

   ```bash
   npm run research:audits -- --require-all-lanes --require-findings
   ```

   Build the project-bound inbox handoff pack:

   ```bash
   npm run source:inbox-pack
   ```

   This writes `tools/source-inbox/HANDOFF.md` and
   `tools/source-inbox/source-inbox-handoff.json` from the current source queue.
   Use this when generated art comes from any tool that can export an image file
   manually or automatically. Each row names the contract, prompt file, exact
   inbox filename, and final project output path. The point is to make generated
   art land as an actual repo-readable file before extraction or rigging starts.
6. Generate a whole-creature source on a solid magenta background. Use
   `npm run source:next-prompt` to print the next copy-ready prompt, or open
   the matching source-art contract for the full pass/fail brief. Pass
   `-- --id <candidate-id>` to target a specific candidate.

   For an executable generation session, use:

   ```bash
   npm run source:session
   npm run source:session -- --id gulper-eel-maw
   ```

   This marks the current imagegen handoff, prints the prompt, source contract,
   manual inbox filename, and exact status/ingest/reject commands, and writes
   `tools/scratch/source-generation-session.json` for the active candidate. The
   printed/session prompt is loaded from the queue prompt file, so it includes
   the subagent audit hardening layer when available.

   If the image was exported as a normal file, put it in
   `tools/source-inbox/` using the filename listed in
   `tools/source-inbox/HANDOFF.md`, then validate and ingest through the inbox:

   ```bash
   npm run source:inbox-capture -- --id gulper-eel-maw
   npm run source:inbox-check -- --dir tools/source-inbox --strict --ids gulper-eel-maw
   npm run source:ingest-current -- --id gulper-eel-maw --dry-run
   npm run source:ingest-current -- --id gulper-eel-maw --apply
   npm run source:check
   npm run source:gallery
   ```

   The inbox check and batch ingest both run mechanical source-image validation
   before copying files into `public/assets/generated`: flat magenta
   border/background, usable subject size, crop margin, and low magenta
   contamination inside the creature. Treat failures here as rejected source
   attempts rather than rigging around them.

   If built-in image generation renders a usable source inline but does not
   create an accessible file under `$CODEX_HOME/generated_images`, save/download
   that inline output to the exact candidate inbox path from
   `tools/source-inbox/HANDOFF.md`, then run the same inbox validation loop.
   `npm run source:imagegen-status -- --id <candidate-id>` prints the current
   manual inbox path and the follow-up validation commands.

   `npm run source:check` also validates source provenance. Every ingested
   source image must record project-file bytes, SHA-256, width, height, and
   filename in `sourceIngest`; stale metadata can be repaired from the actual
   project file with:

   ```bash
   npm run source:provenance -- --repair
   ```

   Before running image generation, mark the current generated-image directory:

   ```bash
   npm run source:imagegen-mark -- --id <candidate-id>
   ```

   After generation, find only the newly created or modified files:

   ```bash
   npm run source:imagegen-status
   ```

   Use the reported `ingestCommand` only after visually checking that the
   handoff file satisfies the candidate's required read. This prevents stale
   files from being ingested under the wrong candidate id.

   If exactly one handoff file is present and it visually satisfies the prompt,
   the status command can ingest it directly. Dry-run first:

   ```bash
   npm run source:imagegen-status -- --ingest --dry-run --id <candidate-id>
   npm run source:imagegen-status -- --ingest --id <candidate-id>
   ```

   Auto-ingest refuses zero handoff files, candidate-id mismatches,
   generated-directory drift, multiple handoff files, existing sources, and
   approved or rigged candidates. For the zero-file case, try inline recovery
   before recording a missing-artifact rejection:

   ```bash
   npm run source:inbox-capture
   npm run source:recover-inline -- --id <candidate-id> --allow-empty
   npm run source:recover-inline -- --id <candidate-id> --copy --validate
   # or choose a manually saved file explicitly:
   npm run source:recover-inline -- --id <candidate-id> --image <saved-image-path> --copy --validate
   ```

   `source:inbox-capture` opens a local paste/drop/file-select page and writes a
   validated image directly into `tools/source-inbox/<candidate-id>.<ext>`.
   This is the preferred path when the image exists visually in the client but
   does not appear under `$CODEX_HOME/generated_images`.

   If image generation rendered in the client but produced no project-accessible
   file and recovery cannot find a saved/downloaded image, record that failed
   handoff directly from the current marker:

   ```bash
   npm run source:imagegen-status -- --reject-missing
   ```

   The rejection is duplicate-safe if rerun for the same marker. Passing
   `--id <candidate-id>` acts as a guard and must match the marker; generated
   directory drift is refused unless `--allow-generated-dir-drift` is passed
   deliberately.

   If a generated image fails the required read, log the rejection instead of
   ingesting it:

   ```bash
   npm run source:reject-attempt -- --id <candidate-id> \
     --image <bad-output-path> \
     --reason "Fails required read: explain the concrete visual mismatch."
   ```

   If the generator produced no accessible file, omit `--image` and record the
   failed handoff in `--reason`, or use `source:imagegen-status -- --reject-missing`
   when the current imagegen marker should supply the rejection metadata.
7. Ingest generated art with
   `npm run source:ingest -- --id <candidate-id> --image <image-path> --copy`.

## Generic Articulation Extraction

For new threats that have a single whole-source image on a magenta background,
prefer the generic extraction path before writing a bespoke builder:

```bash
npm run articulated:prepare-plan -- --id <candidate-id> --overwrite
```

This wrapper creates the starter plan, renders the review-gallery-compatible
`public/review/articulated/<candidate-id>-plan-preview.png`, validates the plan,
and dry-runs extraction. It refuses unapproved source candidates unless
`--allow-unapproved` is passed for mechanical testing. It never runs real
extraction or accepts content.

The expanded commands are:

```bash
npm run articulated:starter-plan -- --id <candidate-id> \
  --out tools/scratch/<candidate-id>-starter-plan.json --overwrite
npm run articulated:plan-preview -- --plan tools/scratch/<candidate-id>-starter-plan.json \
  --out public/review/articulated/<candidate-id>-plan-preview.png
npm run articulated:plan-check -- --plan tools/scratch/<candidate-id>-starter-plan.json
npm run articulated:extract-plan -- --plan tools/scratch/<candidate-id>-starter-plan.json --dry-run
npm run articulated:extract-plan -- --plan tools/scratch/<candidate-id>-starter-plan.json
npm run articulated:sources
npm run articulated:check
npm run review:articulated:quick
npm run sandbox:index
```

`articulated:starter-plan` detects the non-magenta subject box and writes a
valid, editable crop/anchor/socket starter plan to
`tools/scratch/<candidate-id>-starter-plan.json`. It is intentionally
conservative; use the plan preview to adjust crops, anchors, sockets, anatomy,
and motion before extraction.
`npm run content:readiness` also prints this exact command sequence for any
approved source candidate that has not yet been promoted to a rigged prototype.

The plan schema is `water9/articulation-plan@1`. It describes the whole-source
image, runtime creature metadata, rectangular source crops, anchors, joints, and
socket overlay crops. The extractor applies `sourceTransform.chromaKey` so
`#ff00ff` Imagen backgrounds become transparent generated parts while source
provenance remains verifiable. `articulated:extract-plan` also runs the same
structural validation as `articulated:plan-check` before writing any generated
PNGs or manifests, so invalid plans fail before they can enter the sandbox
catalog.

Minimal shape:

```json
{
  "schema": "water9/articulation-plan@1",
  "runtimeCreatureId": "example-threat",
  "displayName": "Example Threat",
  "sourceCandidateId": "example-threat",
  "source": "public/assets/generated/fauna-example-threat-whole-source.png",
  "sourceTransform": { "chromaKey": { "color": [255, 0, 255], "tolerance": 24 } },
  "originPoint": [768, 512],
  "minBiome": 3,
  "rarity": "epic",
  "radius": 64,
  "hp": 220,
  "speed": [30, 58],
  "spawn": { "minDepth": 1200, "maxDepth": 2500, "count": 1 },
  "parts": [
    {
      "id": "body",
      "role": "torso",
      "sourceCrop": { "x": 520, "y": 360, "width": 360, "height": 220 },
      "depth": 0.02,
      "anchors": { "front": [140, 0], "back": [-140, 0] },
      "motion": { "kind": "root", "amplitude": 2, "frequency": 1.4, "phase": 0, "lag": 0 },
      "damaged": true
    },
    {
      "id": "head",
      "role": "head",
      "sourceCrop": { "x": 820, "y": 340, "width": 220, "height": 190 },
      "parentId": "body",
      "parentAnchor": "front",
      "anchor": "neck",
      "restOffset": [16, 0],
      "depth": 0.03,
      "anchors": { "neck": [-90, 0], "bite": [84, 0] },
      "motion": { "kind": "body", "amplitude": 1.5, "frequency": 1.4, "phase": 0.2, "lag": 0.1 }
    }
  ],
  "socketOverlays": [
    {
      "id": "head-socket",
      "parentId": "body",
      "childId": "head",
      "sourcePartId": "body",
      "sourceCrop": { "x": 250, "y": 70, "width": 88, "height": 88 },
      "offset": [12, 0],
      "size": [88, 88],
      "depth": 0.04
    }
  ]
}
```

This creates generated part PNGs, a `fauna-<id>.articulated.json` source
manifest, and registers a prototype in
`public/assets/generated/articulated-creatures.parts.json` unless
`--no-register` is passed. The prototype still does not count toward the final
20-threat target until the source candidate and articulated rig pass human
visual review and the strict gate accepts it.
   This copies the image into `public/assets/generated`, resets the candidate to
   `needs-review`, and keeps prior approval cleared.
   For a folder of generated images, name files `<candidate-id>.png` or
   `fauna-<candidate-id>-whole-source.png`, then run
   `npm run source:inbox-check -- --dir <image-directory> --strict` before
   ingesting. The inbox check verifies that each image maps to a known queued
   candidate and that no existing source would be replaced accidentally. Then
   dry-run the batch with
   `npm run source:ingest-batch -- --dir <image-directory> --strict --dry-run`.
   If the report is clean, ingest with
   `npm run source:ingest-batch -- --dir <image-directory> --strict`. The batch
   ingest writes `tools/scratch/source-ingest-batch-report.json` and refuses
   duplicate, unknown, already sourced, approved, or rigged candidates unless
   `--overwrite` is passed intentionally.
8. Run `npm run source:image-check -- --id <candidate-id>` for a focused
   magenta/crop validation pass. If the background is visibly magenta but not
   exact `#ff00ff`, normalize only the border-connected key background with
   `npm run source:normalize-key -- --input <image> --output <image>`, then run
   the focused check again. Run `npm run source:gallery` and inspect
   `public/review/source-candidates/index.html`. The gallery includes both the
   original source thumbnail and a chroma-key preview showing the detected
   subject box plus the magenta-removed cutout on a checkerboard.
9. Approve or reject the source with `npm run source:accept`; approval requires
   every source-art visual check and `--source-reviewed`, including explicit
   approval that the source is production-intent creature art rather than a
   placeholder or proof-of-concept assembly. A source cannot be approved without
   an actual whole-source image, source thumbnail, chroma-key preview, and fresh
   source-gallery fingerprint on disk. After approval, rerun `npm run
   source:gallery` so the review packet records the approved state and fresh
   source-candidate fingerprint.
10. Run `npm run source:check`. This validates candidate metadata and, for
   candidates with source images, checks flat magenta borders, usable background
   ratio, subject margin, subject size, and magenta-like leakage inside the
   non-background creature. Only approved whole-source candidates should move
   into cutting and rigging.
11. Remove magenta with the chroma-key helper.
12. Build a source manifest and crop parts from the single cohesive source.
13. Generate socket, wound, detached, and damaged overlays deterministically.
14. Run `npm run articulated:check`.
15. Open the sandbox and inspect idle, lunge, stunned, and scan readability.
16. Run browser playtest for the new creature id.

The source-candidate stage exists to prevent technically functional rigs from
masking weak creature art. If the whole source looks like a collage, reject it
before any builder script is written.

## Research Intake

Sidecar research batches identified these cohesive candidates for later source
image generation:

- Anvil Mantis: mantis-shrimp striker with two dominant hammer limbs.
- Chimneyback Isopod: low armored vent crawler with dorsal chimney spines.
- Velvet Lantern Cuttle: compact predatory cephalopod with flashing lure face.
- Sawback Ray: flat ray/sawfish hybrid with serrated head-blade and whip tail.
- Basketstar Maw: radial trap with central mouth disk and branching arm trees.
- Reliquary Siphonophore: chandelier-like colony with tendril tripwires.
- Black Coral Gate: ruin doorway/portcullis coral that closes on the diver.
- Brine Bloom Mat: crawling bacterial carpet with gas blisters and filaments.
- Glass Sponge Sentinel: lattice vase sponge that fires brittle needle cones.
- Carnivorous Anemone Throne: ruin-encrusting flower trap around treasure.

Each one should begin as a single whole-organism magenta-background source, then
be cut into articulated parts only after the silhouette works as one creature.

Structured, importer-ready briefs are tracked in
`public/review/source-candidates/research-briefs.json`; validate them with
`npm run research:check`. Older long-form source-art notes for Cavitation Boxer,
Sand Battery, Siphon Lily, and Harpoon Cone remain in `docs/threat-research.md`.

Current source-generation priority is:

1. `gulper-eel-maw`: current blocker missing a project-bound source image; keep
   the lateral eel axis, large mouth pouch, and inhale verb readable at game
   scale.
2. `glass-sponge-sentinel`: strong sessile lane-control read; prior attempts
   failed because no project-bound image file was produced, not because the
   prompt was rejected visually.
3. `lantern-anemone-pit`: clear sessile lure ambusher with a crop-friendly oral
   disc and tentacle parts.

Run one candidate end-to-end at a time because `source:imagegen-mark` and
`source:imagegen-status` use a single handoff marker.

## Candidate Threat Backlog

1. Cavitation Boxer: mantis-shrimp-inspired striker with club arms and sonar blur.
2. Sand Battery: stargazer-inspired buried electric ambusher with venom slow. Prototype registered as `sand-battery`; needs visual acceptance before it counts.
3. Harpoon Cone: cone-snail turret with extending proboscis and paralysis dart.
4. Trap-Jaw Bristle: bobbit-worm grabber with segmented body and bleed pressure.
5. Brine-Rim Reaper: chemosynthetic brine-pool rim hazard with corrosive splash.
6. Glass Net Colony: siphonophore curtain with stinging tentilla and entangle.
7. Slime Eel Clogger: hagfish-inspired panic enemy that clogs thrust/filters.
8. Gulper Lantern: pelican-eel lure predator with engulf grab and ore theft.
9. Reliquary Barreleye: transparent-dome marker that attracts nearby threats.
10. Cathedral Bigfin: bigfin-squid filament snare for ruin shafts.
11. Bell-Choir Siphonophore: modular zooid chain with lure/heal/sting beads.
12. Gatejaw Gulper: ruin-arch ambusher with suction cone and inventory scatter.
13. Cloakmire Vampire: vampire-squid decoy cloud that disrupts scanner clarity.
14. Filter-House Warden: larvacean mucus-house trap that fouls movement/tools.
15. Pallbearer Isopod: armored scavenger that curls into ricochet attacks.
16. Mirror-Maw Tunicate: wall-mounted clamp trap triggered by scan/light focus.

17. Siphon Lily: carnivorous anemone/pitcher-plant hazard that inhales in pulses.
18. Glassback Ray: stealthy refractive ray with slicing dash and bleed flash.
19. Brine Crown: vent/starfish flora that grows corrosive brine patches and spines.
20. Chainmaw Eel: segmented moray-like grabber that drags toward terrain hazards. Prototype registered as `chainmaw-eel`; needs visual acceptance before it counts.

Implementation order should favor the clearest silhouettes first: Cavitation Boxer,
Siphon Lily, Glassback Ray, Pallbearer Isopod, Chainmaw Eel, and Sawback Ray.

Implemented prototypes awaiting visual acceptance:

- `abyssal-serpent`: rebuilt single-source magenta abyssal serpent after the legacy composite failed cohesion review.
- `chainmaw-eel`: single-source magenta eel/moray grabber.
- `sawback-ray`: single-source magenta flattened ray with dorsal saw ridge.
- `thornhalo-urchin`: single-source magenta radial urchin zone-denial hazard.
- `hookjaw-isopod`: single-source magenta armored isopod latch/drag ambusher.
- `cavitation-boxer`: single-source magenta mantis-shrimp brawler with club arms.
- `siphon-lily`: single-source magenta stalked anemone trap with petal jaws.
- `harpoon-cone`: single-source magenta cone-snail ambusher with segmented venom proboscis.
- `sand-battery`: single-source magenta buried electric ambusher with electrode pads and shovel fins.
