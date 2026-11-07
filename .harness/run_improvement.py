#!/usr/bin/env python3
"""Harness2 improvement loop: Propose -> Probe -> Compose.

The model is frozen; only the harness changes. A candidate is a prompt overlay in
.harness/candidates/. A probe runs the same task twice through the real OpenCode
CLI: baseline (no overlay) and candidate (overlay attached as a temporary file).
Checks score both runs, the contrast is appended to .harness/ledger.jsonl, and a
candidate is adopted only when it passes every check the baseline fails.

Stdlib only. Dry-run by default. One model call per probe, and only with
--execute.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

BASH = shutil.which("bash") or "bash"
ROOT = Path(__file__).resolve().parent.parent
HARNESS = ROOT / ".harness"
TASKS = HARNESS / "tasks"
CANDIDATES = HARNESS / "candidates"
LEDGER = HARNESS / "ledger.jsonl"
REPORT = HARNESS / "improvement.md"
OVERLAY_DIR = Path(tempfile.gettempdir()) / "harness-overlays"
AGENT = "zara"
CHECK_TIMEOUT = 300
PROBE_TIMEOUT = 900


def die(message: str) -> None:
    print(f"[FAIL] {message}", file=sys.stderr)
    raise SystemExit(2)


def warn(message: str) -> None:
    print(f"[WARN] {message}", file=sys.stderr)


@dataclass(frozen=True)
class Check:
    label: str
    cmd: str


@dataclass(frozen=True)
class Task:
    name: str
    prompt: str
    checks: tuple[Check, ...]
    model_note: str
    probe_model: bool
    path: Path


@dataclass(frozen=True)
class Candidate:
    path: Path
    name: str
    title: str
    body: str


def list_tasks() -> list[Path]:
    if not TASKS.is_dir():
        return []
    return sorted(TASKS.glob("*.json"))


def list_candidates() -> list[Path]:
    if not CANDIDATES.is_dir():
        return []
    return sorted(CANDIDATES.glob("*.md"))


def load_task(name: str) -> Task:
    path = TASKS / f"{name}.json"
    if not path.is_file():
        available = ", ".join(p.stem for p in list_tasks()) or "none"
        die(f"task not found: {path} (available tasks: {available})")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        die(f"task file is not valid JSON: {path}: {exc}")
    if not isinstance(data, dict):
        die(f"task file must contain a JSON object: {path}")

    missing = [key for key in ("name", "prompt", "checks") if key not in data]
    if missing:
        die(f"task file {path} is missing required keys: {', '.join(missing)}")

    raw_checks = data["checks"]
    if not isinstance(raw_checks, list) or not raw_checks:
        die(f"task file {path} needs a non-empty 'checks' list")

    checks: list[Check] = []
    for index, raw in enumerate(raw_checks, 1):
        if not isinstance(raw, dict) or "label" not in raw or "cmd" not in raw:
            die(f"task file {path}: check #{index} needs both 'label' and 'cmd'")
        checks.append(Check(str(raw["label"]), str(raw["cmd"])))

    return Task(
        name=str(data["name"]),
        prompt=str(data["prompt"]),
        checks=tuple(checks),
        model_note=str(data.get("model_note", "")),
        probe_model=bool(data.get("probe_model", True)),
        path=path,
    )


def resolve_candidate(arg: str) -> Path:
    path = Path(arg).expanduser()
    if not path.is_absolute():
        cwd_path = Path.cwd() / path
        root_path = ROOT / path
        if cwd_path.is_file():
            path = cwd_path
        elif root_path.is_file():
            path = root_path
    path = path.resolve()
    if not path.is_file():
        available = ", ".join(p.name for p in list_candidates()) or "none"
        die(f"candidate not found: {path} (available candidates: {available})")
    return path


def load_candidate(arg: str) -> Candidate:
    path = resolve_candidate(arg)
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    body = text
    if lines and lines[0].strip() == "---":
        for index in range(1, len(lines)):
            if lines[index].strip() == "---":
                body = "\n".join(lines[index + 1 :])
                break

    title = path.stem
    for line in body.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break

    body = body.strip()
    if not body:
        die(f"candidate has no body to append: {path}")
    return Candidate(path=path, name=path.stem, title=title, body=body)


def overlay_path(candidate: Candidate) -> Path:
    return OVERLAY_DIR / f"{candidate.name}.md"


def opencode_argv(task: Task, model: str | None, overlay: Path | None) -> list[str]:
    argv = ["opencode", "run", "--agent", AGENT]
    if model:
        argv.extend(["--model", model])
    if overlay is not None:
        argv.extend(["--file", str(overlay)])
    argv.append(task.prompt)
    return argv


def model_label(model: str | None) -> str:
    return model or "cli-default"


def print_argv(argv: list[str], indent: str = "  ") -> None:
    print(f"{indent}{shlex.join(argv)}")


def print_checks(task: Task) -> None:
    for check in task.checks:
        print(f"  - {check.label}: {check.cmd}")


def dry_run(task: Task, candidates: list[Candidate], model: str | None) -> None:
    print("Harness2 dry run: no model calls, no writes")
    print()
    print(f"task        : {task.name} ({task.path})")
    print(f"prompt      : {task.prompt}")
    print(f"checks      : {len(task.checks)}")
    print_checks(task)
    print(f"model note  : {task.model_note or '-'}")
    print(f"probe model : {'yes' if task.probe_model else 'no (checks only)'}")
    print(f"model       : {model_label(model)}")

    if candidates:
        for candidate in candidates:
            print()
            print(f"candidate   : {candidate.name} ({candidate.path})")
            print(f"title       : {candidate.title}")
            print(f"overlay     : {overlay_path(candidate)}")
            print("  overlay body (first 6 lines):")
            for line in candidate.body.splitlines()[:6]:
                print(f"    {line}")
    else:
        print()
        print("candidate   : none (pass --candidate <path> to probe an overlay)")

    print()
    print("baseline argv:")
    print_argv(opencode_argv(task, model, None))
    for candidate in candidates:
        print(f"candidate argv ({candidate.name}):")
        print_argv(opencode_argv(task, model, overlay_path(candidate)))

    calls = (1 + len(candidates)) if task.probe_model else 0
    print()
    print(f"ledger      : {LEDGER}")
    print(f"report      : {REPORT}")
    print(f"cost        : {calls} model call(s) with --execute, 0 now")


def resolve_argv(argv: list[str]) -> list[str]:
    """opencode on Windows is a .cmd shim; CreateProcess cannot run it directly."""
    if not argv or argv[0] != "opencode":
        return argv
    path = shutil.which("opencode")
    if path is None:
        raise FileNotFoundError("opencode is not on PATH")
    if os.name == "nt" and path.lower().endswith((".cmd", ".bat")):
        return ["cmd", "/c", path] + argv[1:]
    return [path] + argv[1:]


def run_probe(argv: list[str], transcript: Path, timeout: int) -> tuple[int, float]:
    started = time.monotonic()
    try:
        proc = subprocess.run(
            resolve_argv(argv),
            cwd=ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        code = proc.returncode
    except FileNotFoundError:
        die(f"cannot run {argv[0]!r}: is the OpenCode CLI on PATH?")
    except subprocess.TimeoutExpired as exc:
        partial = exc.stdout if isinstance(exc.stdout, str) else ""
        output = partial + f"\n[timeout after {timeout}s]\n"
        code = 124
    duration = time.monotonic() - started
    transcript.write_text(output, encoding="utf-8")
    return code, duration


def score(task: Task, transcript: Path) -> tuple[list[str], list[tuple[str, bool, int, str]]]:
    env = dict(os.environ)
    env["HARNESS_OUTPUT"] = str(transcript)
    env["HARNESS_TASK"] = task.name

    passed: list[str] = []
    results: list[tuple[str, bool, int, str]] = []
    for check in task.checks:
        try:
            proc = subprocess.run(
                [BASH, "-c", check.cmd],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                timeout=CHECK_TIMEOUT,
            )
            code = proc.returncode
            detail = ((proc.stdout or "") + (proc.stderr or "")).strip()
        except FileNotFoundError:
            die("bash not found on PATH; task checks run through bash -c")
        except subprocess.TimeoutExpired:
            code = 124
            detail = f"check timed out after {CHECK_TIMEOUT}s"
        ok = code == 0
        results.append((check.label, ok, code, detail))
        if ok:
            passed.append(check.label)
    return passed, results


def print_results(label: str, results: list[tuple[str, bool, int, str]]) -> None:
    print(f"  {label}:")
    for check_label, ok, code, detail in results:
        print(f"    [{'PASS' if ok else 'FAIL'}] {check_label} (exit {code})")
        if not ok and detail:
            for line in detail.splitlines()[-5:]:
                print(f"           {line}")


def append_ledger(entry: dict) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
    with LEDGER.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(line + "\n")


def execute(task: Task, candidates: list[Candidate], model: str | None, timeout: int) -> int:
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)
    transcript_dir = Path(tempfile.mkdtemp(prefix="harness-probe-"))

    print(f"Harness2 execute: task {task.name}")
    print(f"model: {model_label(model)}")
    if not task.probe_model:
        print("probe_model=false: no model calls, checks are command-only")
    print()

    started = time.monotonic()
    baseline_transcript = transcript_dir / "baseline.txt"
    if task.probe_model:
        print("baseline probe:")
        baseline_argv = opencode_argv(task, model, None)
        print_argv(baseline_argv, indent="  ")
        _, baseline_duration = run_probe(baseline_argv, baseline_transcript, timeout)
    else:
        baseline_transcript.write_text("", encoding="utf-8")
        baseline_duration = 0.0

    baseline_pass, baseline_results = score(task, baseline_transcript)
    print_results("baseline checks", baseline_results)
    failed_by_baseline = [c.label for c in task.checks if c.label not in baseline_pass]
    print(f"  baseline failed: {', '.join(failed_by_baseline) or 'nothing'}")
    print()

    exit_code = 0
    for candidate in candidates:
        print(f"candidate probe: {candidate.name} ({candidate.path})")
        candidate_transcript = transcript_dir / f"{candidate.name}.txt"
        candidate_duration = 0.0
        if task.probe_model:
            overlay = overlay_path(candidate)
            overlay.write_text(candidate.body + "\n", encoding="utf-8", newline="\n")
            candidate_argv = opencode_argv(task, model, overlay)
            print_argv(candidate_argv, indent="  ")
            _, candidate_duration = run_probe(candidate_argv, candidate_transcript, timeout)
        else:
            candidate_transcript.write_text("", encoding="utf-8")

        candidate_pass, candidate_results = score(task, candidate_transcript)
        print_results("candidate checks", candidate_results)

        adopted = bool(failed_by_baseline) and set(failed_by_baseline).issubset(set(candidate_pass))
        if adopted:
            print("  verdict: ADOPTED (candidate passes every check the baseline failed)")
        elif not failed_by_baseline:
            print("  verdict: REJECTED (no contrast: baseline failed nothing)")
        else:
            still_failing = [label for label in failed_by_baseline if label not in candidate_pass]
            print(f"  verdict: REJECTED (still failing: {', '.join(still_failing)})")

        duration = round(baseline_duration + candidate_duration, 2)
        append_ledger(
            {
                "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "task": task.name,
                "candidate": str(candidate.path.relative_to(ROOT).as_posix()),
                "model": model_label(model),
                "baseline_pass": baseline_pass,
                "candidate_pass": candidate_pass,
                "adopted": adopted,
                "duration_s": duration,
            }
        )
        print(f"  ledger: appended 1 line to {LEDGER}")
        print()

    if not candidates:
        duration = round(time.monotonic() - started, 2)
        append_ledger(
            {
                "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "task": task.name,
                "candidate": None,
                "model": model_label(model),
                "baseline_pass": baseline_pass,
                "candidate_pass": None,
                "adopted": False,
                "duration_s": duration,
            }
        )
        print(f"ledger: appended 1 baseline-only line to {LEDGER}")

    entries = read_ledger()
    write_report(entries)
    print(f"report: regenerated {REPORT}")
    return exit_code


def read_ledger() -> list[dict]:
    if not LEDGER.is_file():
        die(f"ledger not found: {LEDGER} (run --execute once, or create the empty file)")
    entries: list[dict] = []
    for number, line in enumerate(LEDGER.read_text(encoding="utf-8").splitlines(), 1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError as exc:
            warn(f"ledger line {number} is not valid JSON and was skipped: {exc}")
            continue
        if isinstance(parsed, dict):
            entries.append(parsed)
        else:
            warn(f"ledger line {number} is not a JSON object and was skipped")
    return entries


def format_list(value: object) -> str:
    if value is None:
        return "-"
    if isinstance(value, list):
        return ", ".join(str(item) for item in value) or "(none)"
    return str(value)


def render_report(entries: list[dict]) -> str:
    adopted = [entry for entry in entries if entry.get("adopted")]
    lines = [
        "# Harness improvement",
        "",
        "Generated by `python .harness/run_improvement.py --report` from",
        "`.harness/ledger.jsonl`. Do not edit by hand.",
        "",
        "Adoption rule: **no contrast, no adoption.** A candidate is adopted only when",
        "it passes every check the baseline fails. Everything else is rejected, and the",
        "contrast stays in the ledger.",
        "",
        f"Probes: {len(entries)}. Adopted: {len(adopted)}.",
        "",
    ]

    if not entries:
        lines.extend(["No probes recorded yet.", ""])
        return "\n".join(lines).rstrip() + "\n"

    lines.extend(
        [
            "| ts | task | candidate | model | baseline_pass | candidate_pass | adopted | duration_s |",
            "|---|---|---|---|---|---|---|---|",
        ]
    )
    for entry in entries:
        lines.append(
            "| {ts} | {task} | {candidate} | {model} | {baseline} | {candidate_pass} | {adopted} | {duration} |".format(
                ts=entry.get("ts", "-"),
                task=entry.get("task", "-"),
                candidate=entry.get("candidate") or "-",
                model=entry.get("model", "-"),
                baseline=format_list(entry.get("baseline_pass")),
                candidate_pass=format_list(entry.get("candidate_pass")),
                adopted="yes" if entry.get("adopted") else "no",
                duration=entry.get("duration_s", "-"),
            )
        )

    lines.extend(["", "## Adopted", ""])
    if adopted:
        for entry in adopted:
            lines.append(f"- `{entry.get('candidate')}` on `{entry.get('task')}` ({entry.get('ts')})")
    else:
        lines.append("None yet.")
    lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_report(entries: list[dict]) -> None:
    REPORT.write_text(render_report(entries), encoding="utf-8", newline="\n")


def show_inventory() -> None:
    tasks = list_tasks()
    print("Tasks (.harness/tasks):")
    if not tasks:
        print("  none")
    for path in tasks:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"  {path.stem:<24} INVALID JSON")
            continue
        checks = len(data.get("checks", []))
        probe = "model" if data.get("probe_model", True) else "no model"
        note = str(data.get("model_note", ""))
        print(f"  {path.stem:<24} {checks} check(s)  {probe:<8}  {note}")

    print()
    print("Candidates (.harness/candidates):")
    candidates = list_candidates()
    if not candidates:
        print("  none")
    for path in candidates:
        candidate = load_candidate(str(path))
        print(f"  {candidate.name:<28} {candidate.title}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run_improvement.py",
        description=(
            "Harness2 Propose-Probe-Compose loop. Dry-run by default. "
            "A probe spends one model call per candidate and only with --execute."
        ),
    )
    parser.add_argument("--task", metavar="NAME", help="task name under .harness/tasks/<name>.json")
    parser.add_argument(
        "--candidate",
        action="append",
        default=[],
        metavar="PATH",
        help="candidate overlay markdown, repeatable",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("HARNESS_MODEL") or None,
        help="model id for opencode run --model (default: CLI default, or $HARNESS_MODEL)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=PROBE_TIMEOUT,
        help=f"seconds allowed per model probe (default: {PROBE_TIMEOUT})",
    )

    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true", help="print the plan, zero model calls (default)")
    modes.add_argument("--execute", action="store_true", help="probe baseline and candidates, append to the ledger")
    modes.add_argument("--report", action="store_true", help="regenerate .harness/improvement.md from the ledger")
    modes.add_argument("--list", action="store_true", help="list tasks and candidates")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")

    args = build_parser().parse_args(argv)

    if args.list:
        show_inventory()
        return 0

    if args.report:
        entries = read_ledger()
        write_report(entries)
        adopted = sum(1 for entry in entries if entry.get("adopted"))
        print(f"report: {REPORT} ({len(entries)} probe(s), {adopted} adopted)")
        return 0

    if not args.task:
        die("--task is required; run --list to see tasks")

    task = load_task(args.task)
    candidates = [load_candidate(arg) for arg in args.candidate]

    if args.execute:
        return execute(task, candidates, args.model, args.timeout)

    dry_run(task, candidates, args.model)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
