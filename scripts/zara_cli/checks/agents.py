"""Agent prompt shape and agent loading."""
from __future__ import annotations

import json

from ..context import Context
from ..process import ProcessError, run
from ..result import Check

SECTIONS = [
    "## Role",
    "## Inputs (dispatch contract)",
    "## Procedure",
    "## Verification Duty",
    "## Output Contract",
    "## Failure Modes",
    "## Budget",
    "## Boundaries",
]

EXPECTED = {
    "zara", "plan", "atlas", "scout", "lens", "probe", "shield",
    "pulse", "hive", "rhythm", "forge", "refiner", "compaction",
    "sketch",
}


def template(ctx: Context) -> Check:
    directory = ctx.path(".opencode", "agent")
    files = sorted(directory.glob("*.md"))
    if not files:
        return Check(
            name="agent template",
            ok=False,
            detail="no prompts in .opencode/agent",
            fix="restore the agent prompts from git history",
        )

    problems: list[str] = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---"):
            problems.append(f"{path.name}: missing frontmatter")
            continue
        positions = []
        for section in SECTIONS:
            index = text.find(section)
            if index == -1:
                problems.append(f"{path.name}: missing {section}")
            else:
                positions.append(index)
        if positions != sorted(positions):
            problems.append(f"{path.name}: sections out of order")
        if len(text.splitlines()) > 130:
            problems.append(f"{path.name}: {len(text.splitlines())} lines (max 130)")
        if "## Harness Contract" in text:
            problems.append(f"{path.name}: duplicated shared contract")

    return Check(
        name="agent template",
        ok=not problems,
        detail=f"{len(files)} prompts" + ("; " + "; ".join(problems[:6]) if problems else ""),
        fix="restore the 8 sections in order: Role, Inputs, Procedure, Verification Duty, Output Contract, Failure Modes, Budget, Boundaries",
    )


def load(ctx: Context) -> Check:
    name = "agent load"
    try:
        proc = run("opencode", ["debug", "agents"], cwd=ctx.root, timeout=180)
    except ProcessError as exc:
        return Check(name=name, ok=False, detail=str(exc), fix="install opencode or put it on PATH")

    if proc.returncode != 0:
        return Check(
            name=name,
            ok=False,
            detail=((proc.stderr or proc.stdout) or "")[-300:],
            fix="run opencode debug agents and fix the reported config error",
        )
    try:
        agents = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return Check(name=name, ok=False, detail="debug agents did not return JSON", fix="check the opencode version")

    found = {agent.get("id"): agent for agent in agents}
    missing = sorted(EXPECTED - found.keys())
    empty = sorted(
        agent_id for agent_id in EXPECTED
        if agent_id in found and not (found[agent_id].get("system") or "").strip()
    )
    detail = f"{len(EXPECTED & found.keys())}/{len(EXPECTED)} present"
    if missing:
        detail += f"; missing: {', '.join(missing)}"
    if empty:
        detail += f"; empty prompt: {', '.join(empty)}"
    return Check(
        name=name,
        ok=not (missing or empty),
        detail=detail,
        fix="add the missing agent config entry or restore its prompt file",
    )
