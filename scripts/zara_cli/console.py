"""Console output. Plain ASCII, stable prefixes, no decoration."""
from __future__ import annotations

import sys

PREFIX_OK = "[PASS]"
PREFIX_FAIL = "[FAIL]"
PREFIX_WARN = "[WARN]"


def utf8_streams() -> None:
    """Never crash on a non-ASCII byte in the console code page."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass


def section(title: str) -> None:
    print(f"\n== {title}")


def ok(message: str) -> None:
    print(f"{PREFIX_OK} {message}")


def fail(message: str) -> None:
    print(f"{PREFIX_FAIL} {message}")


def warn(message: str) -> None:
    print(f"{PREFIX_WARN} {message}")


def info(message: str) -> None:
    print(f"      {message}")


def bullet(message: str) -> None:
    print(f" - {message}")
