# ADR 0003 — Keep the V1 config shape

- Status: accepted
- Date: 2026-11-07
- Supersedes: none
- Related: `opencode.json`, `docs/architecture.md`

## Context

OpenCode V2 normalizes the V1 config shape (`agent`, `command`, `mcp`,
`permission`) without warnings. The pinned Harness2 executor used for
benchmarks reads V1 only. One config has to serve both without a conversion
step.

## Decision

Keep `opencode.json` in the V1 shape. Do not introduce a V2-only config file or
a build step that generates one.

## Consequences

- The same repo config works in the TUI, the CLI, and the Harness2 executor.
- V2-only features cannot be expressed until the executor is patched.
- The config stays readable and diffable; no generated file drifts from the
  source.

## Reversal condition

Reverse when the Harness2 executor speaks V2 natively, or when a required
capability exists only in the V2 shape.
