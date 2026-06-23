# Water9 Next Source Review

Focused review packet for the current human source-approval bottleneck. This page does not approve anything; decision commands are dry-run only.

## Target

- Candidate: Brine Crown (`brine-crown`)
- Status: `needs-review`
- Gate truth: not approved yet
- Warning: Not approved: human reviewer must inspect source, key, sandbox preview, and plan preview before running approval.

## Evidence

| Item | Link |
| --- | --- |
| Source | /assets/generated/fauna-brine-crown-whole-source.png |
| Magenta key preview | /review/source-candidates/key-previews/brine-crown-key-preview.png |
| Sandbox screenshot | /review/source-candidates/quick-reviews/brine-crown-source-preview.png |
| Articulation plan preview | /review/articulated/brine-crown-plan-preview.png |
| Quick review | /review/source-candidates/quick-reviews/brine-crown.html |
| Review packet | public/review/source-candidates/source-review-packets/brine-crown.md |
| Contract | public/review/source-candidates/art-contracts/brine-crown.md |
| Sandbox lab | /review/sandbox/lab.html?id=source-brine-crown&with=diver |

## Required Read

- One rooted radial organism, not a collage of coral, starfish, and vent tubes.
- Central crown or toxic throat is the first read.
- Low anchored basal mat with uneven rays/fronds and visible hinge/root zones.
- Readable toxic blisters, spine halo, and corrosive danger cues at game scale.
- No loose detached parts, environmental shadows, haze, floor plane, or particles baked into the source.

## Contract Checks

- Short radial lobes are fused flat into one basal mat and do not read as tentacles, octopus arms, or free limbs.
- Central crown cup, toxic throat, brine blisters, roots, and mineral spines share one rooted vent-organism anatomy.
- The creature remains stationary and low to the seafloor, not a free-swimming cephalopod or decorative starfish.

## Reject Risks

- Avoid a decorative reef; the source must read as a dangerous organism.
- Avoid perfect radial ornament symmetry that feels like a logo.
- Avoid magenta or hot pink body colors that will key out.
- Avoid loose vent tubes or starfish arms that do not grow from the same mat.
- Keep toxic clouds, bubbles, and brine puddles as separate VFX rather than baked source art.
- Reject cephalopod tentacles, curled octopus arms, eyes, free-swimming anatomy, or loose starfish limbs.

## Commands

```bash
npm run source:review-dossier && npm run source:next-review && npm run source:next-review-check
npm run sandbox:preview -- --id source-brine-crown --with diver --serve --open --visual
npm run sandbox:preview -- --id brine-crown --with diver --serve --open --visual
npm run source:approval-runway:preview
npm run source:cohesion-decisions && npm run source:cohesion-decisions-check
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict
npm run source:accept -- --id brine-crown --status approved --reviewed-by <human-reviewer> --note 'Approved after inspecting the whole source before any rigging.' --visual-check whole-creature-cohesion --visual-check part-continuity-cohesion --visual-check readable-silhouette --visual-check no-collage-artifacts --visual-check non-placeholder-art-direction --visual-check crop-safe-anatomy --visual-check clean-magenta-key --visual-check gameplay-read --visual-check neutral-riggable-pose --visual-check visible-attack-lane --score whole-creature-cohesion=<4-5> --score part-continuity-cohesion=<4-5> --score readable-silhouette=<4-5> --score no-collage-artifacts=<4-5> --score non-placeholder-art-direction=<4-5> --score crop-safe-anatomy=<4-5> --score clean-magenta-key=<4-5> --score gameplay-read=<4-5> --score neutral-riggable-pose=<4-5> --score visible-attack-lane=<4-5> --visual-note whole-creature-cohesion='<specific rationale>' --visual-note part-continuity-cohesion='<specific rationale>' --visual-note readable-silhouette='<specific rationale>' --visual-note no-collage-artifacts='<specific rationale>' --visual-note non-placeholder-art-direction='<specific rationale>' --visual-note crop-safe-anatomy='<specific rationale>' --visual-note clean-magenta-key='<specific rationale>' --visual-note gameplay-read='<specific rationale>' --visual-note neutral-riggable-pose='<specific rationale>' --visual-note visible-attack-lane='<specific rationale>' --source-reviewed --source-visual-board public/review/source-visual-board.json --dry-run
npm run source:accept -- --id brine-crown --status rejected --reviewed-by <human-reviewer> --note 'Rejected after inspecting the source, magenta key, sandbox preview, visual board, and plan preview because the whole source does not read as one cohesive creature.' --failed-check whole-creature-cohesion --visual-note whole-creature-cohesion='<specific failure rationale citing source, key preview, sandbox screenshot, visual board, and plan preview>' --source-rejected --source-visual-board public/review/source-visual-board.json --dry-run
```

## Focused Decision JSON Starter

This is a one-candidate starter copied from the strict batch decision schema. It defaults to `needs-review`; edit it only after human inspection.

```json
{
  "schema": "water9/source-cohesion-decisions@1",
  "reviewer": "<human-reviewer>",
  "reviewedAt": "<YYYY-MM-DD>",
  "policy": {
    "humanAuthored": true,
    "automationCannotApproveCohesion": true,
    "inspectSourceKeySandboxAndPlan": true
  },
  "instructions": [
    "Keep status as needs-review until a real human reviewer has inspected source, key preview, sandbox screenshot, and articulation plan.",
    "For approval, set status to approved, fill reviewer/reviewedAt/overallNote, and give every visual check a score of 4 or 5 with evidence-based notes.",
    "For rejection, set status to rejected, fill reviewer/reviewedAt/overallNote, and list failedChecks with evidence-based notes.",
    "Run strict apply against the edited decision file; this starter is not an approval."
  ],
  "decisions": [
    {
      "id": "brine-crown",
      "species": "Brine Crown",
      "status": "needs-review",
      "overallNote": "",
      "evidenceFingerprint": {
        "schema": "water9/source-cohesion-evidence-fingerprint@1",
        "id": "brine-crown",
        "species": "Brine Crown",
        "files": {
          "source": {
            "url": "/assets/generated/fauna-brine-crown-whole-source.png",
            "exists": true,
            "size": 337378,
            "sha256": "96acc19e0fbeca2427b173239e821100f0d7f6b977c43a55b1ef3d733ce94825"
          },
          "keyPreview": {
            "url": "/review/source-candidates/key-previews/brine-crown-key-preview.png",
            "exists": true,
            "size": 141567,
            "sha256": "98fbfd0e7a6cae35700d6339946b52a08d6426799b14bac87bd86c6f7df85006"
          },
          "sandboxScreenshot": {
            "url": "/review/source-candidates/quick-reviews/brine-crown-source-preview.png",
            "exists": true,
            "size": 332225,
            "sha256": "3df7ccb3b2f61f668e929914578ebe57ac87742cb3f35fad82369e1be2e52b5c"
          },
          "planPreview": {
            "url": "/review/articulated/brine-crown-plan-preview.png",
            "exists": true,
            "size": 2038863,
            "sha256": "bb5be0f7c1298d49b3b4ede0b26b8070068984ad4802360331e7d924fd4ce57a"
          }
        },
        "digest": "735527f4f7fcd03b7b54436336d031f78497962f923e6a39854287cb3ef263cf"
      },
      "failedChecks": [],
      "visualChecks": {
        "whole-creature-cohesion": {
          "score": null,
          "note": ""
        },
        "part-continuity-cohesion": {
          "score": null,
          "note": ""
        },
        "readable-silhouette": {
          "score": null,
          "note": ""
        },
        "no-collage-artifacts": {
          "score": null,
          "note": ""
        },
        "non-placeholder-art-direction": {
          "score": null,
          "note": ""
        },
        "crop-safe-anatomy": {
          "score": null,
          "note": ""
        },
        "clean-magenta-key": {
          "score": null,
          "note": ""
        },
        "gameplay-read": {
          "score": null,
          "note": ""
        },
        "neutral-riggable-pose": {
          "score": null,
          "note": ""
        },
        "visible-attack-lane": {
          "score": null,
          "note": ""
        }
      },
      "reviewer": "<human-reviewer>",
      "reviewedAt": "<YYYY-MM-DD>"
    }
  ]
}
```

