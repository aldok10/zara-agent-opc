"""Config references and the generated portable MCP declaration."""
from __future__ import annotations

import difflib
import json
import re

from ..context import Context
from ..result import Check

DRIVE_PATH = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]:[\\/]")


def validate(ctx: Context) -> list[Check]:
    config = ctx.read_json("opencode.json")
    problems: list[str] = []
    checked = 0

    agents = config.get("agent", {})
    for name, agent in agents.items():
        prompt = agent.get("prompt", "")
        match = re.search(r"\{file:(.+?)\}", prompt)
        if match:
            checked += 1
            if not ctx.path(match.group(1)).is_file():
                problems.append(f"agent {name}: missing prompt {match.group(1)}")

    for name, command in config.get("command", {}).items():
        template = command.get("template", "")
        match = re.search(r"\{file:(.+?)\}", template)
        if match:
            checked += 1
            if not ctx.path(match.group(1)).is_file():
                problems.append(f"command {name}: missing template {match.group(1)}")
        agent = command.get("agent")
        if agent:
            checked += 1
            if agent not in agents:
                problems.append(f"command {name}: unknown agent {agent}")

    for instruction in config.get("instructions", []):
        checked += 1
        if not ctx.path(instruction).is_file():
            problems.append(f"instruction missing: {instruction}")

    orchestrator = config.get("mcp", {}).get("Orchestrator", {})
    argv = orchestrator.get("command") or []
    checked += 1
    if not argv or not ctx.path(argv[0]).is_file():
        problems.append("mcp Orchestrator: binary missing")

    return [Check(
        name="config references",
        ok=not problems,
        detail=f"{checked} checked" + (f"; {len(problems)} problem(s): " + "; ".join(problems[:5]) if problems else ""),
        fix="restore the reported file or fix the reference",
    )]


def _port_local(name: str, spec: dict) -> dict:
    argv = spec.get("command")
    if isinstance(argv, str):
        argv = [argv]
    if not argv or not all(isinstance(part, str) and part for part in argv):
        raise ValueError(f'MCP server "{name}" has no usable command')
    entry: dict = {"command": argv[0]}
    if argv[1:]:
        entry["args"] = list(argv[1:])
    env = spec.get("env") or {}
    if env:
        if not isinstance(env, dict):
            raise ValueError(f'MCP server "{name}" has a non-object env')
        entry["env"] = {str(k): str(v) for k, v in env.items()}
    return entry


def _port_remote(name: str, spec: dict) -> dict:
    url = spec.get("url")
    if not isinstance(url, str) or not url.strip():
        raise ValueError(f'MCP server "{name}" has no url')
    entry: dict = {"url": url.strip()}
    headers = spec.get("headers") or {}
    if headers:
        if not isinstance(headers, dict):
            raise ValueError(f'MCP server "{name}" has a non-object headers')
        entry["headers"] = {str(k): str(v) for k, v in headers.items()}
    env = spec.get("env") or {}
    if env:
        if not isinstance(env, dict):
            raise ValueError(f'MCP server "{name}" has a non-object env')
        entry["env"] = {str(k): str(v) for k, v in env.items()}
    return entry


def _document(ctx: Context) -> dict:
    servers = ctx.read_json("opencode.json").get("mcp", {})
    if not isinstance(servers, dict):
        raise ValueError('the "mcp" key in opencode.json is not an object')
    exported: dict = {}
    for name in sorted(servers):
        spec = servers[name]
        if not isinstance(spec, dict):
            raise ValueError(f'MCP server "{name}" is not an object')
        if spec.get("url"):
            exported[name] = _port_remote(name, spec)
        elif spec.get("command"):
            exported[name] = _port_local(name, spec)
        else:
            raise ValueError(f'MCP server "{name}" has neither command nor url')
    return {"mcpServers": exported}


def _diff(expected: str, actual: str) -> str:
    lines = list(difflib.unified_diff(
        actual.splitlines(keepends=True),
        expected.splitlines(keepends=True),
        fromfile=".mcp.json (on disk)",
        tofile=".mcp.json (generated)",
    ))
    if not lines:
        return ""
    head = "".join(lines[:40]).rstrip("\n")
    if len(lines) > 40:
        head += f"\n... {len(lines) - 40} more diff lines"
    return head


def export_mcp(ctx: Context, check_only: bool = False) -> Check:
    name = "mcp export sync"
    fix = "run: zara-cli config export-mcp"
    try:
        expected = json.dumps(_document(ctx), indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    except (ValueError, OSError) as exc:
        return Check(name=name, ok=False, detail=str(exc), fix=fix)

    match = DRIVE_PATH.search(expected)
    if match:
        return Check(
            name=name,
            ok=False,
            detail=f"absolute Windows path in generated .mcp.json: {match.group(0)!r}",
            fix="use a repo-relative path or an environment variable in opencode.json",
        )

    target = ctx.path(".mcp.json")
    actual = target.read_text(encoding="utf-8") if target.is_file() else None

    if not check_only:
        if actual != expected:
            target.write_text(expected, encoding="utf-8", newline="\n")
            return Check(name=name, ok=True, detail="written")
        return Check(name=name, ok=True, detail="already up to date")

    if actual is None:
        return Check(name=name, ok=False, detail=".mcp.json is missing", fix=fix)
    if actual != expected:
        return Check(name=name, ok=False, detail=_diff(expected, actual), fix=fix)
    count = len(json.loads(expected)["mcpServers"])
    return Check(name=name, ok=True, detail=f"{count} server(s)")
