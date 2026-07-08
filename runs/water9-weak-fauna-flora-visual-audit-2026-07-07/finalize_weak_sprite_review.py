#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

from PIL import ImageOps, Image

import audit_weak_sprites as audit


OUT = audit.OUT
JSON_PATH = OUT / "weak-sprite-review.json"
PROOF_PATH = OUT / "normal-play-proof.json"


MANUAL = {
    "biolume-rock-0": {
        "manualRank": 1,
        "priority": "P0 obvious defects",
        "tags": ["sheet-remnant", "wrong-crop", "dirty-transparent-rgb"],
        "note": "The runtime flora PNG still contains a stray top strip from the source sheet, so it reads as a broken crop in play.",
        "action": "replace",
    },
    "biolume-rock-1": {
        "manualRank": 2,
        "priority": "P0 obvious defects",
        "tags": ["sheet-remnant", "wrong-crop", "cropped-sibling-sprite"],
        "note": "The asset includes a second cutout clipped on the right edge, which makes the flora read like a sheet fragment.",
        "action": "rescale/crop",
    },
    "fauna-abyss-goblin-shark": {
        "manualRank": 3,
        "priority": "P1 weak in gameplay",
        "tags": ["white-fringe", "pale-matte-halo", "style-mismatch", "prior-cleanup-watch"],
        "note": "Pale/magenta edge pixels and a flat pink body make it look pasted over dark abyss water.",
        "action": "rematte",
    },
    "fauna-deep-barreleye": {
        "manualRank": 4,
        "priority": "P1 weak in gameplay",
        "tags": ["soft-upscaled-read", "muddy-grayscale"],
        "note": "At runtime size the face and body smear together; grayscale proof loses the species read.",
        "action": "replace",
    },
    "fauna-deep-gulper-eel": {
        "manualRank": 5,
        "priority": "P1 weak in gameplay",
        "tags": ["muddy-grayscale", "dark-on-dark", "prior-cleanup-watch"],
        "note": "The silhouette is large enough, but the body collapses into the mid/deep background outside the mouth.",
        "action": "recolor/contrast",
    },
    "fauna-abyss-black-swallower": {
        "manualRank": 6,
        "priority": "P1 weak in gameplay",
        "tags": ["muddy-grayscale", "dark-on-dark"],
        "note": "The bulky body is too dark for abyss water, so detail reads only as a low-contrast lump.",
        "action": "recolor/contrast",
    },
    "fauna-abyss-frilled-shark": {
        "manualRank": 7,
        "priority": "P1 weak in gameplay",
        "tags": ["thin-silhouette", "dark-on-dark"],
        "note": "Long, low-contrast form becomes a narrow dark slash in abyss/deep captures.",
        "action": "recolor/contrast",
    },
    "fauna-abyss-snipe-eel": {
        "manualRank": 8,
        "priority": "P1 weak in gameplay",
        "tags": ["thin-silhouette", "tiny-at-game-scale"],
        "note": "The needle body is almost a line at gameplay scale and is fragile in grayscale.",
        "action": "rescale/crop",
    },
    "fauna-deep-sea-spider": {
        "manualRank": 9,
        "priority": "P1 weak in gameplay",
        "tags": ["thin-silhouette", "low-readability"],
        "note": "The spidery limbs have little mass and turn into pale strokes against busy terrain.",
        "action": "rescale/crop",
    },
    "fauna-shallow-lantern-fry": {
        "manualRank": 10,
        "priority": "P1 weak in gameplay",
        "tags": ["tiny-at-game-scale", "soft-upscaled-read", "prior-cleanup-watch"],
        "note": "One of the smallest runtime silhouettes; the bright eye survives, but body details blur away.",
        "action": "rescale/crop",
    },
    "fauna-abyss-hadal-shrimp": {
        "manualRank": 11,
        "priority": "P1 weak in gameplay",
        "tags": ["tiny-at-game-scale", "soft-upscaled-read"],
        "note": "Shrimp anatomy is attractive in contact view but mushes at normal gameplay size.",
        "action": "rescale/crop",
    },
    "fauna-deep-tripodfish": {
        "manualRank": 12,
        "priority": "P1 weak in gameplay",
        "tags": ["thin-silhouette", "style-mismatch"],
        "note": "The thin legs and pale body read more like a sketch overlay than neighboring fish.",
        "action": "replace",
    },
    "fauna-abyss-lantern-swarm": {
        "manualRank": 13,
        "priority": "P2 polish candidates",
        "tags": ["tiny-at-game-scale", "swarm-readability"],
        "note": "The swarm idea works, but the grouped fish are hard to parse during normal movement.",
        "action": "leave for later",
    },
    "fauna-abyss-microfish": {
        "manualRank": 14,
        "priority": "P2 polish candidates",
        "tags": ["tiny-at-game-scale", "swarm-readability"],
        "note": "Readable as small life, but weaker than the newer authored fauna around it.",
        "action": "leave for later",
    },
    "fauna-abyss-hatchet-school": {
        "manualRank": 15,
        "priority": "P2 polish candidates",
        "tags": ["tiny-at-game-scale", "swarm-readability"],
        "note": "School silhouettes survive, but individual shapes are hard to inspect in grayscale.",
        "action": "leave for later",
    },
    "terrain-edge-flora-crown-polyps": {
        "manualRank": 16,
        "priority": "P2 polish candidates",
        "tags": ["source-sheet-slice", "low-depth-separation"],
        "note": "Acceptable in context, but weaker than the richer flora replacements and worth a later repaint.",
        "action": "leave for later",
    },
    "terrain-edge-flora-oracle-tendrils": {
        "manualRank": 17,
        "priority": "P2 polish candidates",
        "tags": ["source-sheet-slice", "low-depth-separation"],
        "note": "The bulb cluster is usable but visually flatter than the surrounding abyss flora set.",
        "action": "leave for later",
    },
    "fauna-shallow-comb-jelly": {
        "manualRank": 18,
        "priority": "P2 polish candidates",
        "tags": ["pale-halo", "soft-upscaled-read"],
        "note": "The bright rim is partly biological glow, but it is the most obvious white-edge suspect among acceptable shallow fauna.",
        "action": "leave for later",
    },
}

DO_NOT_TOUCH = [
    {
        "assetKey": "fauna-exp-ghostfin-croaker",
        "reason": "Automated edge scan sees pale fins, but visual review shows intentional highlights and a clean silhouette.",
    },
    {
        "assetKey": "fauna-exp-ivory-sail-chimaera",
        "reason": "High light-edge score is from the pale sail and body color, not a rectangular matte.",
    },
    {
        "assetKey": "env-flora-vent-coral",
        "reason": "Tight-crop flag is expected for rooted decorative flora; no visible broken transparency in contact view.",
    },
    {
        "assetKey": "env-flora-sting-anemone",
        "reason": "Tight-crop flag is expected for a rooted plant, and the runtime terrain-edge counterpart is acceptable for now.",
    },
    {
        "assetKey": "flora-oxygen-kelp",
        "reason": "Magenta/blue rim is stylistic biolume color, not a white matte defect.",
    },
]


def proof_lookup() -> dict[str, list[str]]:
    if not PROOF_PATH.exists():
        return {}
    proof = json.loads(PROOF_PATH.read_text())
    result: dict[str, list[str]] = {}
    for capture in proof.get("captures", []):
        if not capture.get("ok"):
            continue
        keys = set(capture.get("observedAssetKeys", []))
        if capture.get("assetKey"):
            keys.add(capture["assetKey"])
        for key in keys:
            result.setdefault(key, [])
            for path in (capture.get("screenshotPath"), capture.get("viewportPath")):
                if path and path not in result[key]:
                    result[key].append(path)
    return result


def make_grayscale_runtime_copies() -> None:
    if not PROOF_PATH.exists():
        return
    proof = json.loads(PROOF_PATH.read_text())
    changed = False
    for capture in proof.get("captures", []):
        if not capture.get("ok"):
            continue
        gray_paths = []
        for field in ("screenshotPath", "viewportPath"):
            path_text = capture.get(field)
            if not path_text:
                continue
            path = audit.REPO / path_text
            if not path.exists():
                continue
            gray_path = path.with_name(path.stem + "-gray" + path.suffix)
            ImageOps.grayscale(Image.open(path).convert("RGB")).save(gray_path)
            gray_paths.append(audit.rel(gray_path))
        if gray_paths:
            capture["grayscaleProofPaths"] = gray_paths
            changed = True
    if changed:
        PROOF_PATH.write_text(json.dumps(proof, indent=2) + "\n")


def priority_sort(row: dict) -> tuple:
    if row.get("manualRank"):
        return (0, row["manualRank"])
    order = {"P0 obvious defects": 1, "P1 weak in gameplay": 2, "P2 polish candidates": 3, "acceptable": 4}
    return (order.get(row["priority"], 5), -row.get("score", 0), row["assetKey"])


def markdown(data: dict, ranked: list[dict]) -> str:
    proof = json.loads(PROOF_PATH.read_text()) if PROOF_PATH.exists() else {"captures": []}
    top10 = ranked[:10]
    lines = [
        "Status: complete",
        "",
        "# Weak Fauna / Flora Sprite Visual Audit",
        "",
        "Session key: weak-sprite-visual-audit",
        "Planning HEAD observed by manager: 971e654",
        "Audit date: 2026-07-07",
        "",
        "## Summary",
        "",
        f"- Audited {data['counts']['uniqueAuditedAssets']} unique runtime fauna/flora assets ({data['counts']['fauna']} fauna, {data['counts']['flora']} flora).",
        "- Inventory uses `public/assets/generated/small-life.manifest.json`, current `scene-worldgen.ts` flora runtime mappings, Asset Forge frame manifests, loose frame files, generated flora PNGs, and the previous cleanup inventory as baseline context.",
        "- Cleanup provenance was treated as clean at `971e654`; this list is about visual weakness only.",
        "- Runtime proof was captured from actual `#game canvas` in normal DeepdiveScene play with HUD viewport context, across surface, mid, deep, and abyss-hadal depth bands.",
        "",
        "## Top 10 Weakest",
        "",
    ]
    for row in top10:
        lines.append(f"{row['rank']}. `{row['assetKey']}` ({row['kind']}) - {', '.join(row['failureTags'])}")
    for priority in ("P0 obvious defects", "P1 weak in gameplay", "P2 polish candidates"):
        bucket = [row for row in ranked if row["priority"] == priority]
        lines += ["", f"## {priority}", ""]
        if not bucket:
            lines.append("None.")
            continue
        lines.append("| Rank | Asset / species | Runtime files | Observed depth/biome | Failure tags | Evidence | Next | Proof |")
        lines.append("|---:|---|---|---|---|---|---|---|")
        for row in bucket:
            species = ", ".join(row.get("species") or [])
            files = "<br>".join(f"`{path}`" for path in row.get("runtimeFiles", []) if path)
            biomes = ", ".join(str(item) for item in row.get("biomes", []) if item is not None)
            tags = ", ".join(row.get("failureTags", []))
            proof_paths = "<br>".join(f"`{path}`" for path in row.get("proofImages", [])[:4])
            lines.append(
                f"| {row['rank']} | `{row['assetKey']}`<br>{species} | {files} | {biomes or 'runtime/special'} | {tags} | {row['evidenceNote']} | {row['recommendedNextAction']} | {proof_paths} |"
            )
    lines += [
        "",
        "## Do Not Touch Yet",
        "",
    ]
    for item in DO_NOT_TOUCH:
        lines.append(f"- `{item['assetKey']}`: {item['reason']}")
    lines += [
        "",
        "## Runtime Proof",
        "",
        f"- Metadata: `{audit.rel(PROOF_PATH)}`",
        f"- Color contact sheet: `{audit.rel(OUT / 'weak-sprite-top-review-contact.png')}`",
        f"- Grayscale contact sheet: `{audit.rel(OUT / 'weak-sprite-top-review-contact-gray.png')}`",
        f"- Runtime captures: {sum(1 for item in proof.get('captures', []) if item.get('ok'))} successful, {sum(1 for item in proof.get('captures', []) if item.get('ok') is False)} target misses.",
        "",
        "Representative depth-band proof:",
    ]
    for capture in proof.get("captures", []):
        if capture.get("type") != "depth-band" or not capture.get("ok"):
            continue
        lines.append(
            f"- {capture.get('biomeName')} at {capture.get('depth')} m: `{capture.get('screenshotPath')}`; observed keys: {', '.join(capture.get('observedAssetKeys', [])[:10])}"
        )
    lines += [
        "",
        "## Verification",
        "",
        "- `python3 runs/water9-weak-fauna-flora-visual-audit-2026-07-07/audit_weak_sprites.py`",
        "- `node runs/water9-weak-fauna-flora-visual-audit-2026-07-07/capture_normal_play_proof.mjs http://localhost:<port>/`",
        "- `python3 runs/water9-weak-fauna-flora-visual-audit-2026-07-07/finalize_weak_sprite_review.py`",
        "",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    make_grayscale_runtime_copies()
    data = json.loads(JSON_PATH.read_text())
    lookup = proof_lookup()
    for row in data["candidates"]:
        row["manualRank"] = None
        override = MANUAL.get(row["assetKey"])
        if override:
            row["manualRank"] = override["manualRank"]
            row["priority"] = override["priority"]
            row["failureTags"] = list(dict.fromkeys([*override["tags"], *row.get("failureTags", [])]))
            row["evidenceNote"] = override["note"]
            row["recommendedNextAction"] = override["action"]
            row["score"] = max(row.get("score", 0), 1000 - override["manualRank"])
        row["proofImages"] = list(dict.fromkeys([
            *lookup.get(row["assetKey"], []),
            "runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-top-review-contact.png",
            "runs/water9-weak-fauna-flora-visual-audit-2026-07-07/weak-sprite-top-review-contact-gray.png",
        ]))
    data["doNotTouchYet"] = DO_NOT_TOUCH
    data["rankingMethod"] = "Automated alpha/contrast/scale checks, then visual judgment pass on contact sheets and normal-play captures."
    data["candidates"].sort(key=priority_sort)
    for index, row in enumerate(data["candidates"], 1):
        row["rank"] = index
    ranked = [row for row in data["candidates"] if row["priority"] != "acceptable"]
    audit.contact_sheet(ranked[:24], OUT / "weak-sprite-top-review-contact.png", gray=False, title="Weak fauna/flora review - ranked")
    audit.contact_sheet(ranked[:24], OUT / "weak-sprite-top-review-contact-gray.png", gray=True, title="Weak fauna/flora review - ranked grayscale")
    JSON_PATH.write_text(json.dumps(data, indent=2) + "\n")
    (OUT / "weak-sprite-review.md").write_text(markdown(data, ranked))
    print(json.dumps({
        "ok": True,
        "ranked": len(ranked),
        "top10": [(row["rank"], row["assetKey"], row["failureTags"]) for row in ranked[:10]],
        "report": audit.rel(OUT / "weak-sprite-review.md"),
        "json": audit.rel(JSON_PATH),
    }, indent=2))


if __name__ == "__main__":
    main()
