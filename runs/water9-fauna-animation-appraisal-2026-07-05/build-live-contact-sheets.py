#!/usr/bin/env python3
import json
import math
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

RUN_DIR = Path('/mnt/nxt-dev/water9/runs/water9-fauna-animation-appraisal-2026-07-05')
CAPTURE_DIR = RUN_DIR / 'live-canvas-captures'
RAW_PATH = RUN_DIR / 'live-canvas-raw.json'
CROP_DIR = CAPTURE_DIR / 'crops'
CROP_DIR.mkdir(parents=True, exist_ok=True)

BENCHMARK_SPECIES = {
    'Reef Squid',
    'Nautilus',
    'Glass Squid',
    'Bigfin Squid',
    'Abyss Vampire Squid',
}

def font(size=18, bold=False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

def slug(value):
    return ''.join(ch if ch.isalnum() else '-' for ch in value.lower()).strip('-')

def crop_for(entry, fish):
    image = Image.open(entry['canvasPath']).convert('RGB')
    zoom = entry.get('camera', {}).get('zoom') or 1
    radius = fish.get('radius') or 12
    half = max(58, int(math.ceil(radius * zoom * 5.2)))
    x = int(round(fish['screenX']))
    y = int(round(fish['screenY']))
    left = max(0, x - half)
    top = max(0, y - half)
    right = min(image.width, x + half)
    bottom = min(image.height, y + half)
    crop = image.crop((left, top, right, bottom))
    crop_path = CROP_DIR / f"{slug(entry['label'])}-f{entry['frameIndex']:02d}-{slug(fish['species'])}.png"
    crop.save(crop_path)
    return crop_path, (left, top, right, bottom)

def load_raw():
    raw = json.loads(RAW_PATH.read_text())
    raw.setdefault('sources', []).append(str(RAW_PATH))
    for extra in sorted(RUN_DIR.glob('live-canvas-supplemental*.json')):
        payload = json.loads(extra.read_text())
        raw['captures'].extend(payload.get('captures', []))
        raw.setdefault('route', []).extend(payload.get('route', []))
        raw.setdefault('runtimeErrors', []).extend(payload.get('runtimeErrors', []))
        raw['sources'].append(str(extra))
    return raw

def comfortably_in_frame(capture, fish):
    box = capture.get('canvasBox') or {'width': 1280, 'height': 800}
    width = box.get('width') or 1280
    height = box.get('height') or 800
    x = fish.get('screenX') or -999
    y = fish.get('screenY') or -999
    return 90 <= x <= width - 90 and 110 <= y <= height - 90

def choose_examples(raw):
    by_species = {}
    for capture in raw['captures']:
        for fish in capture.get('visibleFish', []):
            species = fish['species']
            is_benchmark = species in BENCHMARK_SPECIES
            is_exp = fish.get('experimental') is True
            if not is_benchmark and not is_exp:
                continue
            if not comfortably_in_frame(capture, fish):
                continue
            score = (
                (1000 if is_benchmark else 0)
                + (850 if is_exp else 0)
                + (120 if fish.get('target') else 0)
                + (80 if str(capture.get('label', '')).startswith('supp-') else 0)
                + (fish.get('radius') or 0)
                - abs((fish.get('screenX') or 0) - 640) * 0.02
                - abs((fish.get('screenY') or 0) - 400) * 0.02
            )
            current = by_species.get(species)
            if current is None or score > current['score']:
                by_species[species] = {
                    'capture': capture,
                    'fish': fish,
                    'score': score,
                    'kind': 'benchmark' if is_benchmark else 'new',
                }
    benchmarks = [item for item in by_species.values() if item['kind'] == 'benchmark']
    new = [item for item in by_species.values() if item['kind'] == 'new']
    benchmarks.sort(key=lambda item: (item['capture']['biome'], item['capture']['routeDepth'], item['fish']['species']))
    new.sort(key=lambda item: (item['capture']['biome'], item['capture']['routeDepth'], item['fish']['species']))
    selected = benchmarks[:8] + new[:16]
    return selected

def frame_diffs(raw):
    by_key = {}
    for capture in raw['captures']:
        for fish in capture.get('visibleFish', []):
            if fish['species'] not in BENCHMARK_SPECIES and not fish.get('experimental'):
                continue
            key = (capture['label'], fish['species'])
            by_key.setdefault(key, []).append((capture, fish))
    metrics = {}
    for (label, species), samples in by_key.items():
        samples.sort(key=lambda item: item[0]['frameIndex'])
        diffs = []
        for (prev_capture, prev_fish), (capture, fish) in zip(samples, samples[1:]):
            if capture['frameIndex'] != prev_capture['frameIndex'] + 1:
                continue
            prev_img = Image.open(prev_capture['canvasPath']).convert('L')
            img = Image.open(capture['canvasPath']).convert('L')
            x = int(round((prev_fish['screenX'] + fish['screenX']) / 2))
            y = int(round((prev_fish['screenY'] + fish['screenY']) / 2))
            zoom = capture.get('camera', {}).get('zoom') or 1
            half = max(36, int(math.ceil((fish.get('radius') or 12) * zoom * 4.2)))
            box = (
                max(0, x - half),
                max(0, y - half),
                min(img.width, x + half),
                min(img.height, y + half),
            )
            if box[2] <= box[0] or box[3] <= box[1]:
                continue
            a = prev_img.crop(box)
            b = img.crop(box)
            stat = ImageChops.difference(a, b)
            hist = stat.histogram()
            total = sum(hist)
            mean = sum(i * count for i, count in enumerate(hist)) / max(1, total)
            diffs.append(round(mean, 3))
        if diffs:
            metrics[f'{label}:{species}'] = {
                'samples': len(diffs) + 1,
                'medianLumaDiff': round(median(diffs), 3),
                'minLumaDiff': min(diffs),
                'maxLumaDiff': max(diffs),
            }
    return metrics

def make_sheet(selected, grayscale=False):
    tile_w, tile_h = 240, 192
    cols = 4
    rows = math.ceil(len(selected) / cols)
    title_h = 54
    sheet = Image.new('RGB', (cols * tile_w, title_h + rows * tile_h), (7, 15, 23))
    draw = ImageDraw.Draw(sheet)
    title = 'Water9 live #game canvas fauna contact sheet - grayscale' if grayscale else 'Water9 live #game canvas fauna contact sheet - color'
    draw.text((16, 14), title, fill=(236, 251, 255), font=font(22, True))
    small = font(13)
    label_font = font(14, True)
    for index, item in enumerate(selected):
        col = index % cols
        row = index // cols
        x0 = col * tile_w
        y0 = title_h + row * tile_h
        crop_path, crop_box = crop_for(item['capture'], item['fish'])
        crop = Image.open(crop_path).convert('RGB')
        if grayscale:
            crop = ImageOps.grayscale(crop).convert('RGB')
        crop.thumbnail((tile_w - 18, tile_h - 58), Image.Resampling.LANCZOS)
        panel = Image.new('RGB', (tile_w, tile_h), (12, 27, 38))
        px = (tile_w - crop.width) // 2
        py = 8
        panel.paste(crop, (px, py))
        marker = (115, 251, 211) if item['kind'] == 'benchmark' else (255, 209, 102)
        pd = ImageDraw.Draw(panel)
        pd.rectangle((0, 0, tile_w - 1, tile_h - 1), outline=marker, width=2)
        species = item['fish']['species']
        meta = f"{item['kind']} | B{item['capture']['biome']} {item['capture']['routeDepth']}m | f{item['capture']['frameIndex']}"
        pd.text((9, tile_h - 44), species[:30], fill=(236, 251, 255), font=label_font)
        pd.text((9, tile_h - 23), meta, fill=(176, 211, 222), font=small)
        sheet.paste(panel, (x0, y0))
        item['cropPath'] = str(crop_path)
        item['cropBox'] = crop_box
    out = CAPTURE_DIR / ('live-contact-sheet-grayscale.png' if grayscale else 'live-contact-sheet-color.png')
    sheet.save(out)
    return out

raw = load_raw()
selected = choose_examples(raw)
color = make_sheet(selected, grayscale=False)
gray = make_sheet(selected, grayscale=True)
metrics = frame_diffs(raw)

selected_json = []
for item in selected:
    selected_json.append({
        'kind': item['kind'],
        'species': item['fish']['species'],
        'assetKey': item['fish'].get('assetKey'),
        'biome': item['capture']['biome'],
        'depth': item['capture']['routeDepth'],
        'frameIndex': item['capture']['frameIndex'],
        'screenX': item['fish'].get('screenX'),
        'screenY': item['fish'].get('screenY'),
        'canvasPath': item['capture']['canvasPath'],
        'runtimePath': item['capture']['pagePath'],
        'cropPath': item.get('cropPath'),
        'cropBox': item.get('cropBox'),
    })

(RUN_DIR / 'live-canvas-selection.json').write_text(json.dumps({
    'sources': raw.get('sources', []),
    'colorContactSheet': str(color),
    'grayscaleContactSheet': str(gray),
    'selected': selected_json,
    'frameDiffMetrics': metrics,
}, indent=2) + '\n')

print(json.dumps({
    'selected': len(selected),
    'color': str(color),
    'grayscale': str(gray),
    'selection': str(RUN_DIR / 'live-canvas-selection.json'),
}, indent=2))
