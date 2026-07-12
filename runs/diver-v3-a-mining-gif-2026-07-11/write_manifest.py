#!/usr/bin/env python3
from hashlib import sha256
from pathlib import Path

run = Path(__file__).resolve().parent
artifact = run / "artifacts"
paths = sorted(
    p for p in artifact.rglob("*")
    if p.is_file()
    and p.name != "manifest.sha256"
    and not (p.parent.name == "canvas" and p.suffix == ".png")
)
(artifact / "manifest.sha256").write_text("".join(f"{sha256(p.read_bytes()).hexdigest()}  {p.relative_to(run)}\n" for p in paths))
