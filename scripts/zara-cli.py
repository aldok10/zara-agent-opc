#!/usr/bin/env python
"""Launcher: works from any cwd without PYTHONPATH gymnastics."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from zara_cli.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
