"""Process helpers. Windows-safe: resolves shims and never guesses bash."""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


class ProcessError(RuntimeError):
    """Raised when a required executable is missing."""


def resolve(command: str) -> list[str]:
    """Return an argv prefix that runs on this platform (.cmd/.bat need cmd /c)."""
    path = shutil.which(command)
    if path is None:
        raise ProcessError(f"{command} is not on PATH")
    if os.name == "nt" and path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path]
    return [path]


def run(
    command: str,
    args: list[str] | None = None,
    *,
    cwd: Path,
    timeout: int = 300,
    check: bool = False,
) -> subprocess.CompletedProcess:
    argv = resolve(command) + list(args or [])
    return subprocess.run(
        argv,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=check,
    )


_BASH: list[str] | None = None


def _is_wsl(path: Path) -> bool:
    """True for the Windows Subsystem launcher, which has no make/git/python."""
    lowered = str(path).lower()
    windir = os.environ.get("WINDIR", r"C:\Windows").lower()
    return lowered.startswith(os.path.join(windir, "system32")) or "windowsapps" in lowered


def _git_bash_candidates() -> list[Path]:
    """Git Bash installs, derived from git on PATH then from the usual roots."""
    found: list[Path] = []

    def add(path: Path) -> None:
        if path not in found:
            found.append(path)

    git = shutil.which("git")
    if git:
        for parent in list(Path(git).resolve().parents)[:4]:
            add(parent / "bin" / "bash.exe")
            add(parent / "usr" / "bin" / "bash.exe")

    for env in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"):
        base = os.environ.get(env)
        if not base:
            continue
        add(Path(base) / "Git" / "bin" / "bash.exe")
        add(Path(base) / "Programs" / "Git" / "bin" / "bash.exe")
    return found


def bash_argv() -> list[str]:
    """Resolve bash, preferring Git Bash over the WSL launcher on Windows.

    `shutil.which("bash")` returns C:\\Windows\\system32\\bash.exe on a host with
    WSL enabled, and that shell has no make, git or python. Layers run through
    this helper, so picking the wrong bash silently turns every gate red.
    """
    global _BASH
    if _BASH is not None:
        return _BASH

    if os.name == "nt":
        for candidate in _git_bash_candidates():
            if candidate.is_file():
                _BASH = [str(candidate), "-c"]
                return _BASH

    path = shutil.which("bash")
    if path is None:
        raise ProcessError(
            "bash is not on PATH; install Git for Windows (it ships Git Bash)"
        )
    if os.name == "nt" and _is_wsl(Path(path)):
        raise ProcessError(
            f"only WSL bash was found ({path}); install Git for Windows so the "
            "gates run in Git Bash, which has make, git and python"
        )
    _BASH = [path, "-c"]
    return _BASH


def bash(
    command: str,
    *,
    cwd: Path,
    timeout: int = 600,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        bash_argv() + [command],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def bash_ok(command: str, *, cwd: Path, timeout: int = 600) -> tuple[bool, str]:
    try:
        proc = bash(command, cwd=cwd, timeout=timeout)
    except (ProcessError, subprocess.SubprocessError) as exc:
        return False, str(exc)
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    return proc.returncode == 0, output
