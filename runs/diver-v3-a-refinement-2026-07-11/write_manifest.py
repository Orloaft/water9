#!/usr/bin/env python3
import hashlib
from pathlib import Path

RUN = Path(__file__).resolve().parent
OUT = RUN / "artifacts" / "manifest.sha256"
paths = sorted(path for path in RUN.rglob("*") if path.is_file() and path != OUT and "__pycache__" not in path.parts)
OUT.write_text("".join(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(RUN)}\n" for path in paths))
print(f"wrote {OUT} with {len(paths)} entries")
