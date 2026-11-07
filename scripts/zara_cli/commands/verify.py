"""Verification layers and the layered feature gate."""
from __future__ import annotations

import argparse

from .. import console
from ..checks import agents, arch, config, runtime, secrets
from ..context import Context
from ..features import FeatureError, FeatureStore
from ..process import ProcessError, bash, run
from ..result import Check, Report


def test(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("L1 deterministic")
    report.add(*config.validate(ctx))
    report.add(agents.template(ctx))
    report.add(agents.load(ctx))
    return report.emit()


def check(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("L2 consistency")
    report.add(*arch.check_arch(ctx))
    report.add(*config.validate(ctx))
    report.add(config.export_mcp(ctx, check_only=True))
    report.add(secrets.scan(ctx))
    report.add(runtime.mcp_health(ctx))
    report.add(runtime.opencode_config(ctx))
    report.add(runtime.uv_installed(ctx))
    report.add(runtime.venv_synced(ctx))
    report.add(runtime.lock_current(ctx))
    return report.emit()


def e2e(ctx: Context, args: argparse.Namespace) -> int:
    prompt = "Reply with exactly ZARA-OK and nothing else."
    try:
        proc = run(
            "opencode",
            ["run", "--agent", "zara", "--format", "json", prompt],
            cwd=ctx.root,
            timeout=180,
        )
    except ProcessError as exc:
        console.fail(str(exc))
        return 2
    except Exception as exc:  # timeout and other subprocess failures
        console.fail(f"e2e did not complete: {exc}")
        return 1

    output = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        console.fail(f"opencode run exited {proc.returncode}")
        print(output[-1500:])
        return 1
    if "ZARA-OK" not in output:
        console.fail("ZARA-OK not found in the agent output")
        print(output[-1500:])
        return 1
    console.ok("e2e ZARA-OK")
    return 0


def _run_layers(ctx: Context, store: FeatureStore, feature_id: str) -> int:
    feature = store.get(feature_id)
    if not feature.layers:
        console.fail(f"feature {feature_id} has no layers")
        return 2

    labels: list[str] = []
    for layer in feature.layers:
        print(f"==> [{feature_id}] layer: {layer.label}")
        print(f"    cmd: {layer.cmd}")
        proc = bash(layer.cmd, cwd=ctx.root)
        if proc.returncode != 0:
            output = ((proc.stdout or "") + (proc.stderr or "")).strip()
            if output:
                print("\n".join(output.splitlines()[-20:]))
            print()
            print(f"WHAT: layer '{layer.label}' failed for feature {feature_id}.")
            print(f"WHY : {layer.cmd}")
            print(f"FIX : {layer.repair or 'fix the failing command and rerun'}")
            print(f"How to fix: apply the FIX above, then rerun: zara-cli verify {feature_id}")
            return 1
        console.ok(f"{feature_id} {layer.label}")
        labels.append(layer.label)

    store.mark_passing(feature_id, labels)
    console.ok(f"{feature_id} -> passing; evidence recorded")
    return 0


def verify(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    if getattr(args, "all", False):
        pending = sorted(
            [f for f in store.all() if f.state != "blocked"],
            key=lambda f: f.priority,
        )
        if not pending:
            console.info("no feature to verify")
            return 0
        for feature in pending:
            code = _run_layers(ctx, store, feature.id)
            if code != 0:
                return code
        console.ok(f"every feature verified ({len(pending)})")
        return 0

    feature_id = getattr(args, "id", None)
    if not feature_id:
        print("usage: zara-cli verify <id> | --all")
        return 2
    try:
        return _run_layers(ctx, store, feature_id)
    except FeatureError as exc:
        console.fail(str(exc))
        return 2


def vcr(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    passing, activated, ratio = store.vcr()
    print(f"VCR = {passing}/{activated} = {ratio:.2f}")
    checks = store.check()
    code = 0
    for check in checks:
        if not check.ok:
            check.emit()
            code = 1
    if code == 0:
        console.ok("feature state consistent")
    return code
