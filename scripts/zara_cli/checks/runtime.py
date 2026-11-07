"""Runtime checks: the MCP binary, the OpenCode config, the pinned submodule."""
from __future__ import annotations

from ..context import Context
from ..process import ProcessError, run
from ..result import Check

MCP_BINARY = "mcp/zarust-memory/target/release/zmem-mcp.exe"


def mcp_health(ctx: Context) -> Check:
    name = "mcp health"
    binary = ctx.path(MCP_BINARY)
    if not binary.is_file():
        return Check(
            name=name,
            ok=False,
            detail=f"missing {MCP_BINARY}",
            fix="build it: cd mcp/zarust-memory && cargo build --release -p zmem-mcp",
        )
    try:
        proc = run(str(binary), ["--check"], cwd=ctx.root, timeout=60)
    except (ProcessError, OSError) as exc:
        return Check(name=name, ok=False, detail=str(exc), fix="rebuild the binary")
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    first = output.splitlines()[0] if output else f"exit {proc.returncode}"
    return Check(
        name=name,
        ok=proc.returncode == 0,
        detail=first,
        fix="rebuild zmem-mcp from the submodule",
    )


def opencode_config(ctx: Context) -> Check:
    name = "opencode config"
    try:
        proc = run("opencode", ["debug", "config"], cwd=ctx.root, timeout=180)
    except ProcessError as exc:
        return Check(name=name, ok=False, detail=str(exc), fix="install opencode")
    ok = proc.returncode == 0
    detail = "loads" if ok else ((proc.stderr or proc.stdout) or "")[-300:]
    return Check(name=name, ok=ok, detail=detail, fix="fix the config error printed above")


def submodule_pinned(ctx: Context) -> Check:
    name = "submodule pinned"
    status = ctx.git("submodule", "status", "--", "mcp/zarust-memory")
    if not status:
        return Check(
            name=name,
            ok=False,
            detail="mcp/zarust-memory is not registered",
            fix="git submodule add https://github.com/aldok10/zarust-memory.git mcp/zarust-memory",
        )
    if status.startswith("-"):
        return Check(
            name=name,
            ok=False,
            detail="submodule not initialized",
            fix="git submodule update --init --recursive",
        )
    return Check(name=name, ok=True, detail=status.split()[0])


def uv_installed(ctx: Context) -> Check:
    name = "uv"
    try:
        proc = run("uv", ["--version"], cwd=ctx.root, timeout=60)
    except (ProcessError, OSError):
        return Check(
            name=name,
            ok=False,
            detail="missing",
            fix="install uv: winget install astral-sh.uv  (or: pip install uv)",
        )
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    detail = output.splitlines()[0] if output else f"exit {proc.returncode}"
    return Check(name=name, ok=proc.returncode == 0, detail=detail,
                 fix="reinstall uv and put it on PATH")


def venv_synced(ctx: Context) -> Check:
    name = "venv"
    python = ctx.path("scripts", ".venv", "Scripts", "python.exe")
    if not python.is_file():
        python = ctx.path("scripts", ".venv", "bin", "python")
    if not python.is_file():
        return Check(
            name=name,
            ok=False,
            detail="scripts/.venv missing",
            fix="run: uv sync --project scripts",
        )
    try:
        proc = run(str(python), ["-c", "import sys; print(sys.version.split()[0])"], cwd=ctx.root, timeout=60)
    except (ProcessError, OSError) as exc:
        return Check(name=name, ok=False, detail=str(exc), fix="recreate it: uv sync --reinstall")
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    version = output.splitlines()[0] if output else f"exit {proc.returncode}"
    return Check(name=name, ok=proc.returncode == 0, detail=f"python {version}",
                 fix="recreate it: uv sync --reinstall")


def lock_current(ctx: Context) -> Check:
    name = "uv.lock"
    if not ctx.exists("scripts", "uv.lock"):
        return Check(name=name, ok=False, detail="scripts/uv.lock missing", fix="run: uv lock --project scripts")
    try:
        proc = run("uv", ["lock", "--check", "--project", "scripts"], cwd=ctx.root, timeout=180)
    except (ProcessError, OSError):
        return Check(name=name, ok=False, detail="uv is not runnable", fix="install uv")
    return Check(name=name, ok=proc.returncode == 0,
                 detail="in sync" if proc.returncode == 0 else ((proc.stderr or proc.stdout) or "")[-300:],
                 fix="run: uv lock --project scripts, then commit scripts/uv.lock")
