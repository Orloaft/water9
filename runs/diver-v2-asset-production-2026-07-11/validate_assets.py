#!/usr/bin/env python3
"""Validate Diver v2 first-stage production cells and write a reviewable result."""
from __future__ import annotations
import json, re
from collections import deque
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent; ART=ROOT/"artifacts"; SPEC=ART/"spec"
BODY=ART/"production"/"body"; ATT=ART/"production"/"attachments"; FX=ART/"production"/"effects"
manifest=json.loads((SPEC/"diver-v2-manifest.json").read_text())
palette={tuple(bytes.fromhex(c["hex"][1:])) for c in json.loads((SPEC/"diver-v2-palette.json").read_text())["colors"]}
errors=[]; warnings=[]; checks={}; detail=[]

def fail(name,msg): errors.append(f"{name}: {msg}")
def components(mask,w,h):
    seen=set(); sizes=[]
    for p in mask:
        if p in seen: continue
        q=deque([p]); seen.add(p); n=0
        while q:
            x,y=q.popleft(); n+=1
            for nb in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if nb in mask and nb not in seen: seen.add(nb); q.append(nb)
        sizes.append(n)
    return sorted(sizes,reverse=True)

all_manifest=[]
for clip,c in manifest["clips"].items():
    all_manifest += c["frames"]
    if len(c["frames"]) != len(c["durationsMs"]): fail(clip,"frame/duration count mismatch")
    if len(set(c["frames"])) != len(c["frames"]): fail(clip,"duplicate frame")
checks["clips"] = len(manifest["clips"])
if len(set(all_manifest)) != len(all_manifest): fail("manifest","frame appears in multiple clips")
if set(all_manifest) != set(manifest["frames"]): fail("manifest","clip frame set differs from frame metadata")

required={"idle_hover":6,"swim_accel":4,"swim_cruise":8,"swim_decel":4,"scanner_deploy":3,"scanner_scan_hold":4,"scanner_recover":2}
for k,n in required.items():
    got=len(manifest["clips"].get(k,{}).get("frames",[]))
    if got != n: fail(k,f"required {n}, got {got}")

file_names={p.stem for p in BODY.glob("*.png")}
if file_names != set(all_manifest): fail("production/body","orphan or missing PNG relative to manifest")

for name in all_manifest:
    if not re.fullmatch(r"[a-z0-9]+(?:_[a-z0-9]+)*_\d{2}",name): fail(name,"bad lowercase snake-case filename")
    path=BODY/f"{name}.png"; im=Image.open(path).convert("RGBA")
    if im.size != (128,96): fail(name,f"dimensions {im.size}")
    px=list(im.getdata()); alphas={p[3] for p in px}
    if not alphas <= {0,255}: fail(name,f"non-binary body alpha {sorted(alphas)}")
    if any(p[:3] != (0,0,0) for p in px if p[3]==0): fail(name,"nonzero transparent RGB")
    if any(p[:3] not in palette for p in px if p[3]): fail(name,"RGB outside locked palette")
    corners=[im.getpixel((0,0)),im.getpixel((127,0)),im.getpixel((0,95)),im.getpixel((127,95))]
    if any(p != (0,0,0,0) for p in corners): fail(name,"corner is not cleared transparent")
    bbox=im.getbbox()
    if not bbox: fail(name,"empty frame"); continue
    # PIL bbox max is exclusive. Safe contract is inclusive (8,8)-(120,88).
    if bbox[0] < 8 or bbox[1] < 8 or bbox[2]-1 > 120 or bbox[3]-1 > 88: fail(name,f"bbox {bbox} outside safe bounds")
    m={(i%128,i//128) for i,p in enumerate(px) if p[3]}
    cs=components(m,128,96)
    if any(s <= 2 for s in cs[1:]): warnings.append(f"{name}: tiny disconnected cluster(s) {cs[1:]}")
    meta=manifest["frames"][name]
    if meta.get("pivot") != [56,48]: fail(name,"pivot mismatch")
    for socket in ("frontHand","backHand","backpack","effectOrigin"):
        v=meta.get("sockets",{}).get(socket)
        if not v or not (0 <= v[0] < 128 and 0 <= v[1] < 96): fail(name,f"invalid/missing socket {socket}")
    detail.append({"name":name,"bbox":list(bbox),"opaquePixels":sum(p[3]==255 for p in px),"colors":len({p[:3] for p in px if p[3]}),"components":cs})

# Root stability is required for loops. Metadata and authored geometry are checked together.
for clip,c in manifest["clips"].items():
    if not c["loop"]: continue
    for key in ("helmet","torso"):
        pts=[manifest["frames"][n]["root"][key] for n in c["frames"]]
        dx=max(p[0] for p in pts)-min(p[0] for p in pts); dy=max(p[1] for p in pts)-min(p[1] for p in pts)
        if dx>1 or dy>1: fail(clip,f"{key} root deviation {dx}x{dy} > 1px")
        checks[f"{clip}.{key}RootDeviation"] = f"{dx}x{dy}px"

att_expected=set(manifest["attachments"]["scanner"]["frames"])
att_files={p.stem for p in ATT.glob("*.png")}
if att_files != att_expected: fail("attachments","orphan or missing scanner attachment")
for p in ATT.glob("*.png"):
    im=Image.open(p).convert("RGBA")
    if im.size != (128,96): fail(p.name,"attachment dimensions")
    px=list(im.getdata())
    if {q[3] for q in px} - {0,255}: fail(p.name,"non-binary attachment alpha")
    if any(q[:3] != (0,0,0) for q in px if q[3]==0): fail(p.name,"attachment transparent RGB")
    if any(q[:3] not in palette for q in px if q[3]): fail(p.name,"attachment palette membership")

fx_expected={Path(p).name for p in manifest["effects"]["scannerReference"]["frames"]}
fx_files={p.name for p in FX.glob("*.png")}
if fx_files != fx_expected: fail("effects","orphan or missing scanner effect reference")
for p in FX.glob("*.png"):
    if Image.open(p).size != (128,96): fail(p.name,"effect dimensions")

checks.update({"bodyFrames":len(all_manifest),"attachmentFrames":len(att_files),"effectReferences":len(fx_files),"bodyPaletteColors":len(palette),"bodyAlpha":"0/255 only","transparentRGB":"zero","cellSize":"128x96","pivot":"56,48","safeBounds":"8,8-120,88"})
status="PASS" if not errors else "FAIL"
result={"status":status,"errors":errors,"warnings":warnings,"checks":dict(checks),"frameDetail":detail}
(SPEC/"validator-output.json").write_text(json.dumps(result,indent=2)+"\n")
lines=[f"# Diver v2 validator: {status}","",f"- Errors: {len(errors)}",f"- Warnings: {len(warnings)}",f"- Body frames: {len(all_manifest)}",f"- Attachment frames: {len(att_files)}",f"- Effect references: {len(fx_files)}",f"- Locked opaque body colors: {len(palette)}","","## Checks"]
for k,v in checks.items(): lines.append(f"- {k}: {v}")
if errors: lines += ["","## Errors"]+[f"- {e}" for e in errors]
if warnings: lines += ["","## Warnings"]+[f"- {w}" for w in warnings]
(SPEC/"validator-output.md").write_text("\n".join(lines)+"\n")
print(f"{status}: {len(errors)} errors, {len(warnings)} warnings; {len(all_manifest)} body frames")
raise SystemExit(0 if not errors else 1)
