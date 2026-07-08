# Water9 Scan Reward Balance Audit - 2026-07-06

Goal: analyze all current credit rewards from scanning fauna/flora/articulated
creatures and propose a lower reward curve where only epic/legendary scans
remain large payouts.

Current repo preflight: 03b2dad, clean at dispatch.

Checklist:
- [x] formula-code-audit — session agent:mgr-water9:subagent:37e39a95-f68a-4288-ac8b-cb6f9ed37d7a / run e60fdd09-df5a-42c7-884c-d6c52d37de09 — expected artifact: runs/water9-scan-reward-balance-audit-2026-07-06/code-audit.md — verified 2026-07-06 — REPORTED 2026-07-06
- [x] roster-payout-audit — session agent:mgr-water9:subagent:58d0efb7-d15c-45a1-b8d3-7d10af763af2 / run 3b068fe4-e1cb-476a-93c3-c3c694186eb9 — expected artifacts: runs/water9-scan-reward-balance-audit-2026-07-06/scan-payout-roster.json and runs/water9-scan-reward-balance-audit-2026-07-06/roster-report.md — verified 2026-07-06 — REPORTED 2026-07-06
- [x] progression-proposal — session agent:mgr-water9:subagent:c3fada98-a8b8-4d1e-8d9c-3a6fe8340022 / run 0c0f84e2-5b08-4998-97e5-99bf5db27db6 — expected artifact: runs/water9-scan-reward-balance-audit-2026-07-06/proposal.md — verified 2026-07-06 — REPORTED 2026-07-06
- [x] manager synthesis — expected artifact: runs/water9-scan-reward-balance-audit-2026-07-06/manager-synthesis.md — completed 2026-07-06 — REPORTED 2026-07-06

Acceptance rule:
- Read-only audit; no source changes in this pass.
- Reports must cover direct diver scans and aux sub scans.
- Roster must include fauna, flora, and articulated creature scan rewards by
  biome/rarity/kind, including scanner level multiplier impact where available.
- Proposal must give a concrete replacement curve that sharply lowers common,
  uncommon, and rare rewards; keeps only epic and legendary as large payouts;
  names any quest/progression side effects; and includes the next implementation
  worker prompt.
