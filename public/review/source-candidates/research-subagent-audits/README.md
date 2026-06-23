# Research Subagent Audits

Save completed subagent research outputs here as JSON files.

Expected schema:

```json
{
  "schema": "water9/subagent-research-audit@1",
  "lane": "mobile-predator-motion",
  "findings": [
    {
      "id": "gulper-eel-maw",
      "strengths": ["The mouth pouch creates a clear inhale silhouette."],
      "sourceGenerationRisks": ["The jaw can drift into a detached portal-mouth if the skull hinge is not explicit."],
      "suggestedResearchPatch": {
        "biologicalAnchors": [],
        "requiredRead": [],
        "promptRisks": [],
        "motionPhases": []
      },
      "referenceSearchTerms": ["pelican eel gulping jaw", "gulper eel side profile"]
    }
  ]
}
```

Validation:

```bash
npm run research:audits
npm run research:audits -- --require-all-lanes --require-findings
```

The default check allows this directory to be empty while research is being
assigned. Use the strict flags when confirming that returned subagent research
has been captured before applying patches to source candidates.
