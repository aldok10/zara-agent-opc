"""Repository context: the only place that knows where things live."""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Context:
    root: Path

    @classmethod
    def load(cls, root: Path | None = None) -> "Context":
        if root is None:
            root = Path(__file__).resolve().parents[2]
        return cls(root=root)

    def path(self, *parts: str) -> Path:
        return self.root.joinpath(*parts)

    def exists(self, *parts: str) -> bool:
        return self.path(*parts).exists()

    def read_text(self, *parts: str) -> str:
        return self.path(*parts).read_text(encoding="utf-8")

    def write_text(self, text: str, *parts: str) -> None:
        target = self.path(*parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def read_json(self, *parts: str) -> Any:
        return json.loads(self.read_text(*parts))

    def write_json(self, data: Any, *parts: str) -> None:
        self.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", *parts)

    def git(self, *args: str) -> str:
        try:
            proc = subprocess.run(
                ["git", *args],
                cwd=self.root,
                capture_output=True,
                text=True,
                timeout=60,
            )
        except (OSError, subprocess.SubprocessError):
            return ""
        if proc.returncode != 0:
            return ""
        return proc.stdout.strip()

    @property
    def git_sha(self) -> str:
        return self.git("rev-parse", "--short", "HEAD") or "unknown"

    @property
    def git_branch(self) -> str:
        return self.git("branch", "--show-current") or "none"

    @property
    def dirty_count(self) -> int:
        out = self.git("status", "--porcelain")
        return len([line for line in out.splitlines() if line.strip()])

    def tracked_files(self) -> list[Path]:
        out = self.git("ls-files", "-z")
        if not out:
            return []
        return [self.root / name for name in out.split("\0") if name]
