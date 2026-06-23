# Water 9 Next Source Decision Draft

Generated: `2026-06-18T17:21:08.945Z`

This focused draft does not approve source art. It extracts the current next source-review target into a one-decision file that a human reviewer can edit after inspecting the source, key preview, sandbox preview, and plan preview.

## Target

- id: `brine-crown`
- species: Brine Crown
- status: `needs-review`
- reviewed-only filename: `water9-source-cohesion-reviewed-decisions.json`

## Evidence

- source: /assets/generated/fauna-brine-crown-whole-source.png
- magenta key: /review/source-candidates/key-previews/brine-crown-key-preview.png
- sandbox preview: /review/source-candidates/quick-reviews/brine-crown-source-preview.png
- plan preview: /review/articulated/brine-crown-plan-preview.png

## Decision File Draft

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

## Commands

```bash
npm run source:next-decision-draft
npm run source:next-decision-draft-check
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict
npm run source:cohesion-decisions-apply -- --decisions water9-source-cohesion-reviewed-decisions.json --strict --apply
```
