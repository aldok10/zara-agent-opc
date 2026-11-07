# ADR 0004 — Do not register an OpenCode plugin

- Status: accepted
- Date: 2026-11-07
- Supersedes: none
- Related: `.harness/arch-rules.json` ARCH-003, `docs/guardrails.md`

## Context

The Zara v1 plugin targets the OpenCode v1 plugin API. OpenCode V2 rejects that
API and fails config load with `NpmInstallFailedError`, which takes the whole
agent system down rather than one feature.

## Decision

The repo never registers a `plugin` entry in `opencode.json`. Behavior that
used to live in the plugin is expressed as instructions, skills, commands, and
the `Orchestrator` MCP server.

## Consequences

- Config load cannot fail because of plugin API drift.
- Plugin-only capabilities (hooks, event interception) are unavailable.
- ARCH-003 enforces the decision: any `"plugin"` key in `opencode.json` fails
  `make check`.

## Reversal condition

Reverse only when the behavior is rewritten against the V2 plugin API and a
failing plugin cannot break config load.
