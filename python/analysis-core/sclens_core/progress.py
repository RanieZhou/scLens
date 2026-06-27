from __future__ import annotations

import json
import sys
from pathlib import Path


class ProgressWriter:
    """Writes progress events to progress.jsonl, one JSON object per line."""

    def __init__(self, output_dir: Path) -> None:
        self._path = output_dir / "progress.jsonl"
        output_dir.mkdir(parents=True, exist_ok=True)
        self._path.write_text("", encoding="utf-8")

    def emit(self, stage: str, progress: int, message: str) -> None:
        line = json.dumps({"stage": stage, "progress": progress, "message": message})
        with self._path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
            f.flush()
        print(f"[{stage}] {progress}% {message}", file=sys.stderr, flush=True)
