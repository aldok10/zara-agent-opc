"""Architecture rule engine: every violation is WHAT / WHY / FIX."""
from __future__ import annotations

import json
import re
from pathlib import Path

from ..context import Context
from ..process import bash
from ..result import Check

RULES_FILE = ".harness/arch-rules.json"


def _targets(ctx: Context, patterns: list[str], excludes: list[str]):
    seen: set[str] = set()
    for pattern in patterns:
        for path in ctx.root.glob(pattern):
            if not path.is_file():
                continue
            rel = path.relative_to(ctx.root).as_posix()
            if any(rel == ex or rel.startswith(ex.rstrip("/") + "/") for ex in excludes):
                continue
            if rel in seen:
                continue
            seen.add(rel)
            yield path, rel


def _check_rule(ctx: Context, rule: dict) -> Check:
    name = f"{rule.get('id', 'rule')} {rule.get('description', '')}".strip()
    fix = rule.get("fix", "")
    kind = rule.get("type")

    if kind == "forbidden_pattern":
        regex = re.compile(rule.get("pattern", ""))
        hits: list[str] = []
        for path, rel in _targets(ctx, rule.get("include", []), rule.get("exclude", [])):
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for number, line in enumerate(text.splitlines(), 1):
                if regex.search(line):
                    hits.append(f"{rel}:{number}")
        detail = ", ".join(hits[:5]) if hits else ""
        return Check(name=name, ok=not hits, detail=detail, fix=fix)

    if kind == "required_file":
        target = rule.get("path", "")
        exists = ctx.path(target).is_file()
        return Check(name=name, ok=exists, detail="" if exists else target, fix=fix)

    if kind == "command":
        proc = bash(rule.get("cmd", "true"), cwd=ctx.root, timeout=300)
        expected = int(rule.get("expect_exit", 0))
        ok = proc.returncode == expected
        output = ((proc.stdout or "") + (proc.stderr or "")).strip()
        detail = "" if ok else (output[-400:] or f"exit {proc.returncode}")
        return Check(name=name, ok=ok, detail=detail, fix=fix)

    return Check(name=name, ok=False, detail=f"unknown rule type {kind!r}", fix=fix)


def check_arch(ctx: Context) -> list[Check]:
    path: Path = ctx.path(RULES_FILE)
    if not path.is_file():
        return [Check(
            name="arch rules",
            ok=False,
            detail=f"{RULES_FILE} is missing",
            fix="restore .harness/arch-rules.json from git history",
        )]
    data = json.loads(path.read_text(encoding="utf-8"))
    return [_check_rule(ctx, rule) for rule in data.get("rules", [])]
