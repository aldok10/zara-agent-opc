"""Lifecycle: clock in, clock out, traces, audit, harness, doctor."""
from __future__ import annotations

import argparse
import json
import platform
import sys
from datetime import datetime, timezone

from .. import console
from ..checks import agents, arch, config, runtime
from ..checks.audit import CRITICAL, RECOMMENDED, run_audit
from ..context import Context
from ..features import FeatureStore
from ..process import ProcessError, bash, run
from ..result import Check, Report

STRAY_NAMES = ("*.orig", "*.rej", "*.bak", ".DS_Store", "debug-*.log")
SKIP_DIRS = {".git", "target", "__pycache__", ".venv"}


def _version(ctx: Context, command: str, args: list[str]) -> str:
    try:
        proc = run(command, args, cwd=ctx.root, timeout=60)
    except (ProcessError, OSError):
        return "missing"
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    return output.splitlines()[0] if output else f"exit {proc.returncode}"


def setup(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("setup")
    report.add(runtime.submodule_pinned(ctx))
    report.add(runtime.mcp_health(ctx))
    report.add(Check(
        name="opencode",
        ok=_version(ctx, "opencode", ["--version"]) != "missing",
        detail=_version(ctx, "opencode", ["--version"]),
        fix="install the OpenCode CLI and put it on PATH",
    ))
    report.add(Check(
        name="python",
        ok=sys.version_info >= (3, 12),
        detail=f"{platform.python_version()} ({platform.system()})",
        fix="install Python 3.12 or newer",
    ))
    report.add(runtime.uv_installed(ctx))
    report.add(runtime.venv_synced(ctx))
    report.add(runtime.lock_current(ctx))
    return report.emit()


def _stray(ctx: Context) -> list[str]:
    found: list[str] = []
    for pattern in STRAY_NAMES:
        for path in ctx.root.rglob(pattern):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            found.append(path.relative_to(ctx.root).as_posix())
    return sorted(found)[:20]


def clean_check(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("clock out")

    report.add(*config.validate(ctx))
    report.add(agents.template(ctx))
    report.add(agents.load(ctx))

    store = FeatureStore.load(ctx)
    report.add(*store.check())

    stray = _stray(ctx)
    report.add(Check(
        name="no stray artifacts",
        ok=not stray,
        detail="; ".join(stray) if stray else "",
        fix="delete the temp or backup files before clocking out",
    ))
    report.add(*arch.check_arch(ctx))
    return report.emit()


def _trace(ctx: Context, event: str) -> None:
    store = FeatureStore.load(ctx)
    active = store.active()
    line = {
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": event,
        "git_sha": ctx.git_sha,
        "branch": ctx.git_branch,
        "dirty_files": ctx.dirty_count,
        "active_feature": active.id if active else "",
    }
    path = ctx.path(".harness", "traces", "traces.jsonl")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(line, ensure_ascii=False) + "\n")
    print(json.dumps(line, ensure_ascii=False))


def session_start(ctx: Context, args: argparse.Namespace) -> int:
    _trace(ctx, "start")
    return 0


def session_end(ctx: Context, args: argparse.Namespace) -> int:
    _trace(ctx, "end")
    return 0


def audit(ctx: Context, args: argparse.Namespace) -> int:
    result = run_audit(ctx)
    counts = result.counts()
    critical_pass, critical_total = counts[CRITICAL]
    recommended_pass, recommended_total = counts[RECOMMENDED]
    total_pass = critical_pass + recommended_pass
    total = critical_total + recommended_total

    print("Harness Engineering Audit")
    print(f"Repo: {ctx.root}")
    print("Ref:  https://walkinglabs.github.io/learn-harness-engineering/en/")
    for item in result.items:
        line = f"{item.description}"
        if item.ok:
            print(f"  {console.PREFIX_OK} [{item.level.upper()}] {line}")
        else:
            print(f"  {console.PREFIX_FAIL if item.level == CRITICAL else console.PREFIX_WARN} [{item.level.upper()}] {line}")

    print()
    print("Summary")
    print(f"  Total:       {total_pass} / {total} harness components present")
    print(f"  Critical:    {critical_pass} / {critical_total} (must-have for basic function)")
    print(f"  Recommended: {recommended_pass} / {recommended_total} (best practice)")

    failures = [item for item in result.items if not item.ok]
    if failures:
        print()
        print("What to fix")
        for item in failures:
            print(f"  - [{item.level.upper()}] {item.fix or item.description}")

    print()
    if critical_pass < critical_total:
        console.fail("CRITICAL items are missing. Address these before running long agent sessions.")
        return 1
    console.ok("All CRITICAL harness components are present.")
    if recommended_pass < recommended_total:
        console.warn("Some RECOMMENDED items are missing. See above for specific fixes.")
    return 0


def harness(ctx: Context, args: argparse.Namespace) -> int:
    forward = list(getattr(args, "forward", []) or []) or ["--list"]
    try:
        proc = run(
            sys.executable,
            ["...harness/run_improvement.py", *forward],
            cwd=ctx.root,
            timeout=1800,
        )
    except ProcessError as exc:
        console.fail(str(exc))
        return 2
    output = (proc.stdout or "") + (proc.stderr or "")
    print(output.rstrip())
    return proc.returncode


def doctor(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    features = store.all()
    counts: dict[str, int] = {}
    for feature in features:
        counts[feature.state] = counts.get(feature.state, 0) + 1
    passing, activated, ratio = store.vcr()

    report = Report("doctor")
    report.add(runtime.submodule_pinned(ctx))
    report.add(runtime.mcp_health(ctx))
    report.add(Check(name="git", ok=bool(ctx.git_sha), detail=ctx.git_sha, fix="run inside a git repo"))
    report.add(Check(name="opencode", ok=_version(ctx, "opencode", ["--version"]) != "missing",
                     detail=_version(ctx, "opencode", ["--version"]), fix="install the OpenCode CLI"))
    report.add(Check(name="features", ok=True, detail=", ".join(f"{k}={v}" for k, v in sorted(counts.items()))))
    report.add(Check(name="vcr", ok=True, detail=f"{passing}/{activated} = {ratio:.2f}"))
    report.add(runtime.uv_installed(ctx))
    report.add(runtime.venv_synced(ctx))
    report.add(runtime.lock_current(ctx))
    report.add(Check(name="audit", ok=ctx.exists("scripts", "zara_cli", "checks", "audit.py"),
                     detail="python" if ctx.exists("scripts", "zara_cli", "checks", "audit.py") else "missing",
                     fix="restore scripts/zara_cli/checks/audit.py from git history"))
    return report.emit()


def init(ctx: Context, args: argparse.Namespace) -> int:
    console.section("clock in")
    print(f"repo: {ctx.root}")
    setup_code = setup(ctx, args)
    test_code = 0
    from . import verify as verify_cmd
    test_code = verify_cmd.test(ctx, args)

    store = FeatureStore.load(ctx)
    active = store.active()
    nxt = store.next_planned()
    console.section("next")
    print(f"active: {active.id if active else 'none'}")
    print(f"next  : {f'{nxt.id} {nxt.title}' if nxt else 'none'}")
    print("clock out: zara-cli clean-check, then one logical commit")
    return 0 if setup_code == 0 and test_code == 0 else 1
