#!/usr/bin/env python3
"""Deterministic correction pass for the Diver v2 native pixel production art."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
BODY = ART / "production" / "body"
ATT = ART / "production" / "attachments"
FX = ART / "production" / "effects"
SPEC = ART / "spec"
REVIEW = ART / "review"
MASTER = ART / "master"
REJECTED = ART / "rejected-first-pass"
for p in (BODY, ATT, FX, SPEC, REVIEW, MASTER, REJECTED):
    p.mkdir(parents=True, exist_ok=True)

P = {
    "outline": "#10181c", "deep": "#1b2426", "rubber": "#27343a",
    "rubber_hi": "#3b4b50", "brass_deep": "#3d2c20", "brass_shadow": "#5a4026",
    "brass_mid": "#7b552b", "brass": "#9a6b32", "brass_hi": "#d4a44b",
    "brass_pale": "#e0c071", "visor_deep": "#052f38", "visor_shadow": "#073f4a",
    "visor_mid": "#0e7183", "visor": "#0e8fa5", "visor_hi": "#63c9d7",
    "visor_pale": "#8ee7f4", "steel": "#52646a", "steel_hi": "#71858a",
    "accent": "#e56f3f", "accent_deep": "#873b2a",
}
RGB = {k: tuple(bytes.fromhex(v[1:])) for k, v in P.items()}
RGBA = {k: RGB[k] + (255,) for k in P}
FONT = ImageFont.load_default()
CLIPS = {
    "idle_hover": ([180] * 6, True),
    "swim_accel": ([90, 90, 90, 110], False),
    "swim_cruise": ([90] * 8, True),
    "swim_decel": ([90, 100, 110, 130], False),
    "scanner_deploy": ([80, 90, 110], False),
    "scanner_scan_hold": ([120] * 4, True),
    "scanner_recover": ([90, 110], False),
}
KEYS = ("idle_hover_00", "swim_cruise_00", "scanner_deploy_02", "scanner_scan_hold_00")


def image(): return Image.new("RGBA", (128, 96), (0, 0, 0, 0))
def rect(d, b, c): d.rectangle(b, fill=RGBA[c])
def poly(d, pts, c): d.polygon(pts, fill=RGBA[c])
def ell(d, b, c): d.ellipse(b, fill=RGBA[c])
def line(d, pts, c, w=1): d.line(pts, fill=RGBA[c], width=w)


def preserve_rejected_first_pass():
    """Snapshot once. Later rebuilds must never replace the rejection evidence."""
    marker = REJECTED / "preserved.txt"
    if marker.exists():
        return
    for src_dir, dst_name in ((BODY, "body"), (ATT, "attachments")):
        dst = REJECTED / dst_name
        dst.mkdir(exist_ok=True)
        for p in src_dir.glob("*.png"):
            shutil.copy2(p, dst / p.name)
    for name in ("contact-sheet-color-2x.png", "gameplay-footprint-30-44-60.png", "scanner-action-read-no-effect-hud.png"):
        p = REVIEW / name
        if p.exists(): shutil.copy2(p, REJECTED / name)
    marker.write_text("Rejected first pixel-production pass preserved before correction.\n")


def joint(d, x, y, r=5, metal="brass_mid"):
    ell(d, (x-r, y-r, x+r, y+r), "outline")
    ell(d, (x-r+2, y-r+2, x+r-2, y+r-2), metal)
    rect(d, (x-1, y-r+2, x+2, y-r+4), "brass_hi")


def armored_limb(d, points, width=9, metal="brass_mid", joints=True):
    """Continuous thick limb with rubber interlocks and plate clusters."""
    line(d, points, "outline", width + 4)
    line(d, points, "rubber", width + 1)
    for a, b in zip(points, points[1:]):
        line(d, (a, b), metal, width - 2)
        # Broad upper-left plate, never a one-pixel limb highlight.
        mx = (a[0] + b[0]) // 2; my = (a[1] + b[1]) // 2
        rect(d, (mx-2, my-width//2+1, mx+2, my-width//2+3), "brass_hi")
    if joints and len(points) > 2:
        for x, y in points[1:-1]: joint(d, x, y, max(4, width//2), metal)


def glove(d, x, y, facing=1, brace=False):
    pts = [(x-5,y-5),(x+4,y-5),(x+7*facing,y-2),(x+7*facing,y+3),(x+2,y+6),(x-5,y+4)]
    poly(d, pts, "outline")
    rect(d, (x-3,y-3,x+3,y+3), "brass_shadow" if brace else "brass_mid")
    rect(d, (x-2,y-2,x+2,y), "brass_hi")
    if not brace:
        rect(d, (x+3*facing,y-1,x+6*facing,y+2), "rubber")


def helmet(d, cx, cy, aim=0):
    # 33x32 shell plus an interlocking neck ring. Cyan remains large at 30 px.
    ell(d, (cx-17,cy-16,cx+16,cy+16), "outline")
    ell(d, (cx-15,cy-14,cx+14,cy+14), "brass_deep")
    rect(d, (cx-10,cy-14,cx+7,cy-11), "brass_mid")
    rect(d, (cx-7,cy-13,cx+5,cy-11), "brass_hi")
    # Substantial rim and visor planes, shifted subtly toward the aimed side.
    rect(d, (cx-11,cy-8+aim,cx+15,cy+9+aim), "outline")
    rect(d, (cx-9,cy-6+aim,cx+12,cy+7+aim), "brass")
    rect(d, (cx-7,cy-5+aim,cx+10,cy+5+aim), "visor_deep")
    rect(d, (cx-5,cy-4+aim,cx+10,cy+4+aim), "visor_mid")
    rect(d, (cx-3,cy-3+aim,cx+9,cy+2+aim), "visor")
    rect(d, (cx-2,cy-3+aim,cx+5,cy-1+aim), "visor_hi")
    rect(d, (cx-14,cy-5,cx-11,cy+5), "steel")
    rect(d, (cx+13,cy-4,cx+16,cy+5), "brass_hi")
    # Neck ring physically connects helmet to chest.
    rect(d, (cx-11,cy+12,cx+9,cy+18), "outline")
    rect(d, (cx-8,cy+13,cx+7,cy+16), "rubber_hi")
    rect(d, (cx-5,cy+13,cx+5,cy+14), "steel_hi")


def upright_pack(d, phase=0):
    # Twin steel cylinders linked by brass bands and a dark pack bridge.
    rect(d, (31,30,48,61), "outline")
    rect(d, (33,32,39,58), "steel")
    rect(d, (41,32,46,58), "steel")
    rect(d, (34,34,36,51), "steel_hi")
    rect(d, (42,34,44,51), "steel_hi")
    rect(d, (31,38,47,43), "brass_deep")
    rect(d, (33,39,46,41), "brass_hi")
    rect(d, (32,53,47,58), "brass_deep")
    rect(d, (34,54,46,56), "brass")
    rect(d, (38,27,43,32), "outline")
    rect(d, (39,28,42,31), "brass_hi")
    rect(d, (45,36,52,56), "rubber")


def upright_core(d):
    # Shoulder/chest/waist/hip are deliberately one overlapping mass.
    poly(d, [(43,42),(50,36),(64,36),(72,43),(73,58),(67,68),(48,68),(42,59)], "outline")
    rect(d, (46,42,69,60), "brass_shadow")
    rect(d, (49,40,66,47), "brass")
    rect(d, (52,40,62,43), "brass_hi")
    rect(d, (47,50,69,57), "rubber")
    rect(d, (50,51,65,54), "rubber_hi")
    rect(d, (49,58,68,65), "brass_mid")
    rect(d, (52,59,64,61), "brass_hi")
    rect(d, (47,64,69,70), "outline")
    rect(d, (50,64,66,67), "brass_deep")
    rect(d, (54,64,58,68), "brass_hi")
    # Shoulder armor interlocks behind the arm.
    joint(d, 47, 46, 7, "brass")
    joint(d, 67, 46, 7, "brass")


def weighted_leg(d, hip, knee, ankle, fin_dir=0):
    armored_limb(d, (hip,knee,ankle), 10, "brass_shadow")
    # Oversized knee cap.
    joint(d, knee[0], knee[1], 6, "brass")
    x,y=ankle
    poly(d, [(x-6,y-4),(x+5,y-4),(x+7,y+7),(x+11,y+9),(x+11+fin_dir,y+12),(x-7,y+12)], "outline")
    rect(d, (x-4,y-2,x+4,y+6), "brass_mid")
    rect(d, (x-2,y-1,x+3,y+1), "brass_hi")
    rect(d, (x-6,y+7,x+9+fin_dir,y+11), "rubber")
    rect(d, (x-4,y+8,x+6+fin_dir,y+9), "rubber_hi")


def draw_upright(breath=0, scanner_pose=-1, hold_phase=0):
    im=image(); d=ImageDraw.Draw(im)
    upright_pack(d)
    upright_core(d)
    helmet(d, 59, 31, 1 if scanner_pose >= 1 else 0)
    # Weighted asymmetrical settle; roots remain registered while extremities breathe.
    weighted_leg(d, (52,66), (49,70+breath), (48,75+breath), 1)
    weighted_leg(d, (63,66), (65,69-breath), (66,75-breath), 2)
    if scanner_pose < 0:
        armored_limb(d, ((46,47),(42,55),(46,61+breath)), 9, "brass_shadow")
        glove(d, 46,62+breath, brace=True)
        armored_limb(d, ((67,47),(73,54),(70,61-breath)), 9, "brass_mid")
        glove(d, 71,62-breath)
    else:
        # Front working arm: tucked anticipation -> presentation -> lock.
        work = [((67,47),(70,54),(72,57)), ((67,47),(73,47),(79,45)), ((67,47),(74,43),(83,43))][scanner_pose]
        if scanner_pose == 2 and hold_phase:
            work = ((67,47),(74,42),(84+hold_phase,42))
        armored_limb(d, work, 10, "brass_mid")
        wx,wy=work[-1]; glove(d,wx,wy)
        # Rear arm visibly braces chest/wrist instead of hanging as a spare line.
        brace = [((46,47),(51,55),(59,56)), ((46,47),(55,49),(69,48)), ((46,47),(57,50),(75,48))][scanner_pose]
        if scanner_pose == 2 and hold_phase:
            brace = ((46,47),(57,50),(75+hold_phase,47))
        armored_limb(d, brace, 9, "brass_shadow")
        bx,by=brace[-1]; glove(d,bx,by,brace=True)
    return im


def cruise_pack(d):
    rect(d, (29,33,53,57), "outline")
    rect(d, (31,35,50,44), "steel")
    rect(d, (31,47,50,55), "steel")
    rect(d, (33,36,46,38), "steel_hi")
    rect(d, (33,48,46,50), "steel_hi")
    rect(d, (28,42,53,48), "brass_deep")
    rect(d, (31,43,51,46), "brass_hi")
    rect(d, (26,36,31,54), "rubber")


def cruise_core(d):
    poly(d, [(43,35),(64,33),(73,38),(77,49),(69,59),(45,61),(37,53),(37,42)], "outline")
    rect(d, (41,38,70,56), "brass_shadow")
    rect(d, (44,37,66,43), "brass")
    rect(d, (48,37,61,39), "brass_hi")
    rect(d, (42,47,71,54), "rubber")
    rect(d, (46,48,65,51), "rubber_hi")
    rect(d, (42,55,65,60), "brass_mid")
    joint(d, 47, 40, 6, "brass")
    joint(d, 68, 42, 6, "brass")


def cruise_leg(d, hip, knee, ankle, fin_tip, bright=False):
    armored_limb(d, (hip,knee,ankle), 10, "brass_mid" if bright else "brass_shadow")
    joint(d,knee[0],knee[1],6,"brass")
    x,y=ankle; tx,ty=fin_tip
    poly(d, [(x-3,y-6),(x+5,y-4),(tx+3,ty-4),(tx-2,ty+5),(x-5,y+6)], "outline")
    poly(d, [(x-2,y-3),(x+3,y-2),(tx,ty-2),(tx-1,ty+2),(x-3,y+3)], "rubber")
    line(d, ((x,y),(tx,ty)), "rubber_hi", 2)


def draw_swim(kick=0):
    im=image(); d=ImageDraw.Draw(im)
    cruise_pack(d); cruise_core(d); helmet(d,75,34)
    phase=[0,-1,-2,-1,0,1,2,1][kick%8]
    cruise_leg(d,(47,55),(35,57+phase),(24,59+phase),(10,61+phase),False)
    cruise_leg(d,(53,57),(39,61-phase),(27,62-phase),(13,56-phase),True)
    # Tucked rear arm under chest and readable working arm ahead.
    armored_limb(d,((48,43),(56,52),(65,54)),9,"brass_shadow")
    glove(d,66,54,brace=True)
    armored_limb(d,((68,42),(84,45),(112,44)),10,"brass_mid")
    glove(d,113,44)
    return im


def draw_transition(t, reverse=False):
    if reverse: t=3-t
    if t==0: return draw_upright(0)
    if t==3: return draw_swim(0)
    im=image(); d=ImageDraw.Draw(im)
    if t==1:
        upright_pack(d); upright_core(d); helmet(d,63,32)
        weighted_leg(d,(51,66),(43,70),(36,75),2)
        weighted_leg(d,(62,66),(55,71),(48,76),3)
        armored_limb(d,((67,47),(75,50),(82,48)),10,"brass_mid"); glove(d,83,48)
        armored_limb(d,((46,47),(43,55),(48,60)),9,"brass_shadow"); glove(d,49,60,brace=True)
    else:
        cruise_pack(d); cruise_core(d); helmet(d,71,35)
        cruise_leg(d,(47,55),(36,59),(25,62),(10,65),False)
        cruise_leg(d,(53,57),(42,63),(31,64),(16,58),True)
        armored_limb(d,((66,42),(76,47),(85,47)),10,"brass_mid"); glove(d,86,47)
        armored_limb(d,((48,43),(56,53),(65,54)),9,"brass_shadow"); glove(d,66,54,brace=True)
    return im


ATT_POSES = [(73,57,0),(80,45,-1),(85,43,0),(87,42,0),(86,42,-1),(87,42,0),(86,42,1),(80,45,-1),(73,57,0)]
def attachment(i):
    im=image(); d=ImageDraw.Draw(im); x,y,tilt=ATT_POSES[i]
    # Connector overlaps glove; 17x12 industrial head is readable without effects.
    rect(d,(x-3,y-3+tilt,x+2,y+3+tilt),"outline")
    rect(d,(x-2,y-1+tilt,x+3,y+1+tilt),"brass_hi")
    rect(d,(x+1,y-6+tilt,x+17,y+6+tilt),"outline")
    rect(d,(x+3,y-4+tilt,x+14,y+4+tilt),"steel")
    rect(d,(x+5,y-3+tilt,x+13,y+2+tilt),"visor_deep")
    rect(d,(x+6,y-2+tilt,x+13,y+1+tilt),"visor")
    rect(d,(x+7,y-2+tilt,x+11,y-1+tilt),"visor_hi")
    rect(d,(x+14,y-3+tilt,x+18,y+3+tilt),"brass")
    rect(d,(x+16,y-1+tilt,x+19,y+1+tilt),"brass_pale")
    return im


def effect(i):
    im=image(); d=ImageDraw.Draw(im); colors=[(14,143,165,70),(99,201,215,110),(142,231,244,150)]
    x0,y0=91,47; length=12+i*5; spread=4+i*2
    d.polygon([(x0,y0),(x0+length,y0-spread),(x0+length,y0+spread)],fill=colors[0])
    d.line([(x0,y0-spread//2),(x0+length,y0-spread)],fill=colors[1],width=1)
    d.arc((x0+length-5,y0-spread,x0+length+5,y0+spread),-70,70,fill=colors[2],width=1)
    return im


def clean_save(path, im):
    px=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=px[x,y]; px[x,y]=(r,g,b,255) if a else (0,0,0,0)
    # Polygon tips can rasterize as a single diagonal-only pixel. Production art
    # forbids that dust; remove only truly orthogonally isolated pixels.
    dust=[]
    for y in range(1,im.height-1):
        for x in range(1,im.width-1):
            if px[x,y][3] and not any(px[nx,ny][3] for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1))):
                dust.append((x,y))
    for x,y in dust: px[x,y]=(0,0,0,0)
    im.save(path)


def make_frame(name):
    clip=name.rsplit("_",1)[0]; i=int(name[-2:])
    if clip=="idle_hover": return draw_upright([0,1,1,0,-1,-1][i])
    if clip=="swim_accel": return draw_transition(i)
    if clip=="swim_cruise": return draw_swim(i)
    if clip=="swim_decel": return draw_transition(i,True)
    if clip=="scanner_deploy": return draw_upright(0,i)
    if clip=="scanner_scan_hold": return draw_upright(0,2,[2,1,2,1][i])
    return draw_upright(0,[1,0][i])


def checker(w,h,cell=8):
    out=Image.new("RGB",(w,h),(30,38,41)); d=ImageDraw.Draw(out)
    for y in range(0,h,cell):
        for x in range(0,w,cell):
            if (x//cell+y//cell)%2: d.rectangle((x,y,x+cell-1,y+cell-1),fill=(47,57,60))
    return out


def compose(name, attach=True, rejected=False):
    base=(REJECTED/"body" if rejected else BODY)/f"{name}.png"
    im=Image.open(base).convert("RGBA")
    if attach and name.startswith("scanner"):
        idx=(int(name[-2:]) if name.startswith("scanner_deploy") else 3+int(name[-2:]) if name.startswith("scanner_scan_hold") else 7+int(name[-2:]))
        ap=(REJECTED/"attachments" if rejected else ATT)/f"scanner_attachment_{idx:02d}.png"
        im.alpha_composite(Image.open(ap).convert("RGBA"))
    return im


def focused_key_review():
    # Reference crop is the selected high-resolution master, intentionally unchanged.
    master=Image.open(MASTER/"selected-master-board.png").convert("RGB")
    master_crop=master.crop((45,55,1870,755)); master_crop.thumbnail((900,345),Image.Resampling.LANCZOS)
    out=Image.new("RGB",(1536,1120),(7,19,23)); out.paste(master_crop,(315,35)); d=ImageDraw.Draw(out)
    d.text((20,12),"CORRECTED KEY GATE — unchanged selected master / rejected / corrected",fill=(235,220,180),font=FONT)
    scales=(1,2,30,44,60)
    for row,n in enumerate(KEYS):
        y=390+row*180; d.text((12,y),n,fill=(235,225,200),font=FONT)
        for col,(label,rejected) in enumerate((("REJECTED",True),("CORRECTED",False))):
            x=120+col*700; d.text((x,y),label,fill=(220,115,95) if rejected else (120,225,175),font=FONT)
            sp=compose(n,rejected=rejected); bbox=sp.getbbox(); crop=sp.crop(bbox)
            xx=x
            for s in scales:
                if s in (1,2): size=(crop.width*s,crop.height*s)
                else:
                    ratio=s/max(crop.size); size=(round(crop.width*ratio),round(crop.height*ratio))
                q=crop.resize(size,Image.Resampling.NEAREST); out.paste(q,(xx,y+25),q)
                d.text((xx,y+145),f"{s}x" if s<3 else f"{s}px",fill=(150,185,190),font=FONT); xx+=max(95,size[0]+18)
    out.save(REVIEW/"corrected-key-gate-before-after-master.png")


def build_manifest():
    frames={}
    for clip,(durations,_) in CLIPS.items():
        for i in range(len(durations)):
            n=f"{clip}_{i:02d}"; events=[]
            if n=="swim_accel_03": events=["enterCruise"]
            if n in ("swim_cruise_00","swim_cruise_04"): events=["kick"]
            if n=="swim_decel_03": events=["enterHover"]
            if n=="scanner_deploy_02": events=["scannerReady"]
            if n=="scanner_recover_01": events=["scannerStowed"]
            swim=n.startswith("swim_cruise")
            frames[n]={"file":f"../production/body/{n}.png","pivot":[56,48],"sockets":{"frontHand":[78,47],"backHand":[65,45],"backpack":[37,39],"effectOrigin":[91,47]},"root":{"helmet":[75,34] if swim else [59,31],"torso":[55,49] if swim else [57,52]},"events":events}
    scanner_names=[f"scanner_attachment_{i:02d}" for i in range(9)]
    return {"$schema":"diver-v2-manifest.schema.json","schemaVersion":1,"cellSize":[128,96],"contentSafeBounds":[8,8,120,88],"facingAuthored":"right","mirrorForLeft":True,"filter":"nearest","premultiplyAlpha":False,"anchor":[56,48],"palette":"diver-v2-palette.json","slots":{"frontHand":[78,47],"backHand":[65,45],"backpack":[37,39],"effectOrigin":[91,47]},"clips":{k:{"frames":[f"{k}_{i:02d}" for i in range(len(v[0]))],"durationsMs":v[0],"loop":v[1]} for k,v in CLIPS.items()},"frames":frames,"attachments":{"scanner":{"frames":scanner_names,"files":[f"../production/attachments/{n}.png" for n in scanner_names],"socket":"frontHand"}},"effects":{"scannerReference":{"frames":[f"../production/effects/scanner_effect_reference_{i:02d}.png" for i in range(4)],"socket":"effectOrigin","productionStatus":"reference-not-runtime-integrated"}},"collision":{"policy":"gameplay-owned-not-frame-owned","radius":8,"contactRadius":10}}


def contact_sheet(manifest,scale=1,gray=False):
    ordered=[n for clip in CLIPS for n in manifest["clips"][clip]["frames"]]; cw,ch=128*scale,96*scale; lh=14
    out=checker(cw*4,(ch+lh)*8,max(4,8*scale)); d=ImageDraw.Draw(out)
    for j,n in enumerate(ordered):
        x=(j%4)*cw; y=(j//4)*(ch+lh); sp=compose(n).resize((cw,ch),Image.Resampling.NEAREST)
        if gray: sp=ImageOps.grayscale(sp).convert("RGBA")
        out.paste(sp,(x,y),sp); d.text((x+2,y+ch+1),n,fill=(220,225,220),font=FONT)
    return out


def all_reviews(manifest):
    for scale in (1,2):
        contact_sheet(manifest,scale).save(REVIEW/f"contact-sheet-color-{scale}x.png")
        contact_sheet(manifest,scale,True).save(REVIEW/f"contact-sheet-grayscale-{scale}x.png")
    preview=Image.new("RGB",(760,250),(4,17,22)); d=ImageDraw.Draw(preview)
    for col,n in enumerate(("idle_hover_00","swim_cruise_00","scanner_scan_hold_00")):
        x0=12+col*250; d.text((x0,8),n,fill=(210,220,215),font=FONT)
        for row,target in enumerate((30,44,60)):
            sp=compose(n); crop=sp.crop(sp.getbbox()); ratio=target/max(crop.size); size=(round(crop.width*ratio),round(crop.height*ratio)); q=crop.resize(size,Image.Resampling.NEAREST)
            y=34+row*70; preview.paste(q,(x0+35,y),q); d.text((x0,y+20),f"{target}px",fill=(140,180,185),font=FONT)
    preview.save(REVIEW/"gameplay-footprint-30-44-60.png")
    mirror=checker(800,880); md=ImageDraw.Draw(mirror)
    for j,n in enumerate(("idle_hover_00","swim_cruise_00","scanner_scan_hold_00","scanner_deploy_02")):
        sp=compose(n).resize((256,192),Image.Resampling.NEAREST); y=j*215+18
        mirror.paste(sp,(80,y),sp); left=ImageOps.mirror(sp); mirror.paste(left,(460,y),left); md.text((20,y-14),n+" — authored R / mirrored L",fill=(235,235,225),font=FONT)
    mirror.save(REVIEW/"right-left-mirror-sheet.png")
    action=checker(1792,220); ad=ImageDraw.Draw(action)
    names=("idle_hover_00","scanner_deploy_00","scanner_deploy_01","scanner_deploy_02","scanner_scan_hold_00","scanner_recover_00","scanner_recover_01")
    for j,n in enumerate(names):
        sp=compose(n).resize((256,192),Image.Resampling.NEAREST); action.paste(sp,(j*256,0),sp); ad.text((j*256+2,198),n,fill=(235,235,225),font=FONT)
    action.save(REVIEW/"scanner-action-read-no-effect-hud.png")
    onion=checker(1536,384); od=ImageDraw.Draw(onion)
    for row,clip in enumerate(("idle_hover","swim_cruise","scanner_scan_hold")):
        base=Image.new("RGBA",(128,96),(0,0,0,0))
        for n in manifest["clips"][clip]["frames"]:
            layer=Image.open(BODY/f"{n}.png").copy(); layer.putalpha(layer.getchannel("A").point(lambda p:42 if p else 0)); base.alpha_composite(layer)
        big=base.resize((512,384),Image.Resampling.NEAREST); onion.paste(big,(row*512,0),big); od.text((row*512+4,4),clip+" onion",fill=(235,235,225),font=FONT)
        px=row*512+56*4; py=48*4; od.line((px-8,py,px+8,py),fill=(255,80,80)); od.line((px,py-8,px,py+8),fill=(255,80,80))
    onion.save(REVIEW/"onion-skin-root-stability.png")
    runtime=Image.open(ROOT.parent/"current-diver-sprite-audit-2026-07-11"/"artifacts"/"runtime-mid-swim-hud.png").convert("RGB"); runtime.thumbnail((720,450),Image.Resampling.LANCZOS)
    compare=Image.new("RGB",(1280,450),(4,17,22)); compare.paste(runtime,(0,0)); cd=ImageDraw.Draw(compare); cd.text((730,12),"CORRECTED DIVER V2 REVIEW CELLS (not integrated)",fill=(220,225,215),font=FONT)
    for j,n in enumerate(("idle_hover_00","swim_cruise_00","scanner_scan_hold_00")):
        sp=compose(n).resize((256,192),Image.Resampling.NEAREST); x=720+(j%2)*270; y=42+(j//2)*202; compare.paste(sp,(x,y),sp); cd.text((x+4,y+180),n,fill=(220,225,215),font=FONT)
    compare.save(REVIEW/"comparison-current-runtime-vs-v2-cells.png")


def write_hash_ledger():
    paths=[MASTER/"selected-master-board.png", ROOT/"generate_assets.py", ROOT/"validate_assets.py"]
    paths += sorted(BODY.glob("*.png")) + sorted(ATT.glob("*.png")) + sorted(FX.glob("*.png"))
    paths += sorted(REVIEW.glob("*.png"))
    paths += [SPEC/"diver-v2-manifest.json",SPEC/"diver-v2-palette.json",SPEC/"diver-v2.gpl"]
    ledger={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    (SPEC/"artifact-hashes.json").write_text(json.dumps({"algorithm":"sha256","artifacts":ledger},indent=2)+"\n")


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--keys-only",action="store_true"); args=ap.parse_args()
    preserve_rejected_first_pass()
    names=KEYS if args.keys_only else tuple(f"{clip}_{i:02d}" for clip,(ds,_) in CLIPS.items() for i in range(len(ds)))
    for n in names: clean_save(BODY/f"{n}.png",make_frame(n))
    for i in range(9): clean_save(ATT/f"scanner_attachment_{i:02d}.png",attachment(i))
    focused_key_review()
    if args.keys_only:
        print("Generated four corrected keys and focused before/after gate; full propagation intentionally deferred.")
        return
    for i in range(4): effect(i).save(FX/f"scanner_effect_reference_{i:02d}.png")
    manifest=build_manifest(); (SPEC/"diver-v2-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    (SPEC/"diver-v2-palette.json").write_text(json.dumps({"name":"diver-v2-body-20","colors":[{"name":k,"hex":v} for k,v in P.items()]},indent=2)+"\n")
    (SPEC/"diver-v2.gpl").write_text("GIMP Palette\nName: Diver v2 body 20\nColumns: 5\n#\n"+"\n".join(f"{RGB[k][0]:3d} {RGB[k][1]:3d} {RGB[k][2]:3d} {k}" for k in P)+"\n")
    all_reviews(manifest)
    write_hash_ledger()
    print("Generated corrected 31 body cells, 9 scanner attachments, 4 effect references, and all review sheets.")


if __name__=="__main__": main()
