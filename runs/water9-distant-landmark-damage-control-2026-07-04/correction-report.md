# Water9 Distant Landmark Correction Report

Status: in progress

- Preflight HEAD: `7776913`
- Repo verified: `/mnt/nxt-dev/water9`
- Starting from the current dirty tree; preserving unrelated dirty files and rejected proof artifacts.
- Target: correct B1 surface/upper, B2 mid, B3 lower, and verify B4 lower against July 3 runtime reference proofs.
- Initial diagnosis: rejected proof used an immediate B1 surface anchor at alpha 1, oversized B2 sulfide shelf framing, and B3 lower visibility/placement that left the canvas nearly blank except the lamp cone.

Patch direction: remove B1 surface immediate shell anchor, restore smaller distant B1/B2/B3 anchor scale/alpha, raise B3 lower background plate visibility, then capture normal gameplay #game canvas color/grayscale proof on ports 5180-5199.
