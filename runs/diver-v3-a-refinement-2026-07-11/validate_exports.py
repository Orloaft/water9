#!/usr/bin/env python3
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageOps

RUN = Path(__file__).resolve().parent
RUNTIME = RUN / "artifacts" / "runtime"
PUBLIC = RUN.parents[1] / "public" / "assets" / "generated"
OUT = RUN / "artifacts" / "spec" / "export-validation.json"


def cyan_centroid(im, facing):
    points = []
    for y in range(im.height):
        for x in range(im.width):
            if not (24 <= y <= 58 and ((facing == "r" and x >= 84) or (facing == "l" and x <= 44))):
                continue
            r, g, b, a = im.getpixel((x, y))
            if a and b > 80 and b > r + 20 and g > r + 8:
                points.append((x, y))
    return [round(sum(p[0] for p in points) / len(points), 2), round(sum(p[1] for p in points) / len(points), 2)] if points else None


results = {"pass": True, "frames": [], "registration": {}, "leftAuthorship": []}
right_centroids, left_centroids = [], []
for facing in ("r", "l"):
    for i in range(10):
        filename = f"diver-v3-refined-{facing}-{i}.png"
        path = RUNTIME / filename
        public = PUBLIC / filename
        im = Image.open(path).convert("RGBA")
        alpha = sorted(set(im.getchannel("A").getdata()))
        transparent_rgb_zero = all((r, g, b) == (0, 0, 0) for r, g, b, a in im.getdata() if a == 0)
        same_public = ImageChops.difference(im, Image.open(public).convert("RGBA")).getbbox() is None
        centroid = cyan_centroid(im, facing)
        (right_centroids if facing == "r" else left_centroids).append(centroid)
        entry = {
            "file": filename, "dimensions": list(im.size), "mode": im.mode,
            "alphaValues": alpha, "transparentRgbZero": transparent_rgb_zero,
            "bounds": list(im.getchannel("A").getbbox()), "opaqueRgbColors": len(set(im.convert("RGB").getdata())),
            "cyanCentroid": centroid, "publicExactPixels": same_public,
        }
        entry["pass"] = im.size == (128, 96) and alpha == [0, 255] and transparent_rgb_zero and same_public
        results["pass"] &= entry["pass"]
        results["frames"].append(entry)

for i in range(10):
    right = Image.open(RUNTIME / f"diver-v3-refined-r-{i}.png").convert("RGBA")
    left = Image.open(RUNTIME / f"diver-v3-refined-l-{i}.png").convert("RGBA")
    raw_mirror = ImageOps.mirror(right)
    diff = ImageChops.difference(left, raw_mirror)
    changed_pixels = sum(1 for px in diff.getdata() if px != (0, 0, 0, 0))
    alpha_match = ImageChops.difference(left.getchannel("A"), raw_mirror.getchannel("A")).getbbox() is None
    results["leftAuthorship"].append({"frame": i, "pixelsDifferentFromRawMirror": changed_pixels, "identicalRegistrationAlpha": alpha_match, "pass": changed_pixels > 0 and alpha_match})
    results["pass"] &= changed_pixels > 0 and alpha_match

results["registration"] = {
    "pivot": [64, 52],
    "rightCyanXRange": [min(p[0] for p in right_centroids), max(p[0] for p in right_centroids)],
    "rightCyanYRange": [min(p[1] for p in right_centroids), max(p[1] for p in right_centroids)],
    "leftCyanXRange": [min(p[0] for p in left_centroids), max(p[0] for p in left_centroids)],
    "leftCyanYRange": [min(p[1] for p in left_centroids), max(p[1] for p in left_centroids)],
}
OUT.write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps({"pass": results["pass"], **results["registration"], "leftChangedPixelRange": [min(x["pixelsDifferentFromRawMirror"] for x in results["leftAuthorship"]), max(x["pixelsDifferentFromRawMirror"] for x in results["leftAuthorship"])]}, indent=2))
