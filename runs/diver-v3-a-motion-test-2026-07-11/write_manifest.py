#!/usr/bin/env python3
import hashlib
from pathlib import Path

RUN = Path(__file__).resolve().parent
ROOT = RUN.parents[1]
paths = [p for p in (RUN / "artifacts").rglob("*") if p.is_file() and p.name != "manifest.sha256"]
paths += [ROOT / "public" / "assets" / "generated" / f"diver-v3-motion-{i}.png" for i in range(7)]
paths += [ROOT / "src" / name for name in ("helpers.ts", "scene.ts", "scene-rendering.ts", "scene-playtest.ts")]
lines = []
for path in sorted(set(paths), key=lambda p: str(p.relative_to(ROOT))):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    lines.append(f"{digest}  {path.relative_to(ROOT)}")
(RUN / "artifacts" / "manifest.sha256").write_text("\n".join(lines) + "\n")
