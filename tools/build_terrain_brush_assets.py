#!/usr/bin/env python3
from collections import deque
from pathlib import Path

from PIL import Image


SOURCE = Path("tools/source-inbox/terrain-edge-atlas-imagegen.png")
OUT_DIR = Path("public/assets/generated")
REPORT = Path("tools/scratch/terrain-brush-assets-report.txt")


def is_key(pixel):
    r, g, b = pixel[:3]
    return g > 180 and r < 90 and b < 90


def component_boxes(mask, width, height):
    seen = bytearray(width * height)
    boxes = []
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if seen[index] or not mask[index]:
                continue
            seen[index] = 1
            q = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            count = 0
            while q:
                px, py = q.popleft()
                count += 1
                min_x = min(min_x, px)
                max_x = max(max_x, px)
                min_y = min(min_y, py)
                max_y = max(max_y, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    ni = ny * width + nx
                    if seen[ni] or not mask[ni]:
                        continue
                    seen[ni] = 1
                    q.append((nx, ny))
            if count > 160:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1, count))
    return boxes


def trim_alpha(image):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    return image.crop(bbox) if bbox else image


def crop_with_alpha(source, box, pad=8):
    width, height = source.size
    left, top, right, bottom, _ = box
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(width, right + pad)
    bottom = min(height, bottom + pad)
    crop = source.crop((left, top, right, bottom)).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = pixels[x, y]
            key_distance = ((r - 0) ** 2 + (g - 255) ** 2 + (b - 0) ** 2) ** 0.5
            green_bias = g - max(r, b)
            if key_distance < 118 or (g > 130 and green_bias > 44):
                pixels[x, y] = (0, 0, 0, 0)
            else:
                if g > r * 1.08 and g > b * 1.08:
                    g = min(g, int((r + b) * 0.55))
                pixels[x, y] = (r, g, b, a)
    return trim_alpha(crop)


def classify(box):
    left, top, right, bottom, _ = box
    w = right - left
    h = bottom - top
    cy = (top + bottom) / 2
    if cy < 170:
        return "ledge"
    if cy < 510:
        return "wall"
    if cy < 680:
        return "corner"
    if cy < 930:
        return "fill"
    if cy < 1080:
        return "ore"
    return "flora"


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    width, height = source.size
    raw = source.convert("RGB")
    mask = [not is_key(raw.getpixel((x, y))) for y in range(height) for x in range(width)]
    boxes = sorted(component_boxes(mask, width, height), key=lambda b: (b[1], b[0]))
    groups = {"ledge": [], "wall": [], "corner": [], "fill": [], "ore": [], "flora": []}
    for box in boxes:
        groups[classify(box)].append(box)

    expected = {
        "ledge": 4,
        "wall": 4,
        "corner": 8,
        "fill": 4,
        "ore": 6,
        "flora": 8,
    }
    names = []
    for group, limit in expected.items():
        candidates = groups[group][:limit]
        if group in ("ledge", "wall", "corner", "fill"):
            candidates = sorted(candidates, key=lambda b: (b[1], b[0]))
        else:
            candidates = sorted(candidates, key=lambda b: b[0])
        for index, box in enumerate(candidates):
            asset = crop_with_alpha(source, box)
            if group == "fill":
                # Fill plates should stay opaque rectangles with their own painted edge cropped away.
                asset = source.crop((box[0], box[1], box[2], box[3])).convert("RGBA")
            key = f"terrain-brush-{group}-{index}"
            path = OUT_DIR / f"{key}.png"
            asset.save(path)
            names.append(f"{key} {asset.width}x{asset.height}")

    REPORT.write_text("\n".join(names) + "\n", encoding="utf-8")
    print(REPORT.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
