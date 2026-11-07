# Agent Layer Architecture

Module doc for `.opencode/`. Contract and assembly rules only; the session
protocol lives in [AGENTS.md](../AGENTS.md) and the shared rules live in
`instructions/`.

## Directory contract

| Directory | Holds | Must not hold |
|---|---|---|
| `agent/` | One prompt file per agent, YAML frontmatter + body | Scripts, secrets, API keys, executable code |
| `commands/` | Command templates, `{file:...}` targets of `opencode.json` | Logic that belongs in an agent or a skill |
| `skills/` | Knowledge and procedures (markdown) | Runtime code, importable modules |
| `instructions/` | Shared rules inherited by every agent | Agent-specific behavior, per-agent overrides |

`.opencode/` is configuration, not an application. Nothing here is executed
except through OpenCode or `scripts/`.

## Prompt assembly order

Each agent's effective prompt is composed in this order:

1. `.opencode/instructions/system.md` — global rules, voice, memory policy.
2. `.opencode/instructions/system-extended.md` — extended protocol, budgets.
3. The agent file, e.g. `.opencode/agent/forge.md`.
4. Session context — command template, dispatched task, conversation.

Later layers may narrow earlier ones, never contradict them. A rule that must
apply to every agent belongs in `instructions/`, not in an agent file.

## Agent table

Source of truth: `agent` block of `opencode.json`. `steps` is the tool-call
budget; `default` means the key is absent and the runtime default applies.

| Agent | Mode | Temp | Steps | edit | bash | Purpose |
|---|---|---|---|---|---|---|
| `zara` | primary | 0.3 | default | inherit | inherit | Default partner; executes by default |
| `plan` | primary | 0.2 | default | deny | deny | Planning mode; prompt is `agent/sketch.md` |
| `atlas` | subagent | 0.2 | 15 | deny | deny | Architecture, patterns, tradeoffs |
| `scout` | subagent | 0.2 | 10 | deny | deny | Requirements clarification, read-only |
| `lens` | subagent | 0.1 | 15 | deny | deny | Code review, smells, refactoring |
| `probe` | subagent | 0.2 | 15 | deny | deny | Test strategy, coverage, correctness |
| `shield` | subagent | 0.1 | 15 | deny | deny | Threat modeling, secure design, auth |
| `pulse` | subagent | 0.3 | 15 | deny | deny | Delivery, velocity, tech debt |
| `hive` | subagent | 0.2 | 20 | deny | deny | Swarm decomposition and synthesis |
| `rhythm` | subagent | 0.2 | 15 | deny | deny | Loop design, verification, failure modes |
| `forge` | subagent | 0.2 | 30 | allow | allow | Implementation: plan, code, verify, ship |
| `refiner` | subagent | 0.2 | 15 | deny | deny | Answer quality: evaluate and judge |
| `compaction` | unset | 0.1 | default | inherit | inherit | Context compaction; frontmatter denies both |

`inherit` means no `permission` entry in `opencode.json`; the global
`permission` block applies (bash allowed except the denied git patterns).

### Auto-discovered agents

OpenCode also loads every `agent/*.md` file, whether or not it is registered.
One file is discovered this way:

| Agent | Mode | Temp | Steps | edit | bash | Purpose |
|---|---|---|---|---|---|---|
| `sketch` | primary | 0.2 | default | deny | deny | Same prompt as `plan`; discovered from `agent/sketch.md` |

`sketch` and `plan` therefore share one prompt file but are two separate agent
ids. Editing `sketch.md` changes both. Every other agent has exactly one config
entry; there is no discovery-only writer.

## Rules

- A command's `agent` field must name an agent present in `opencode.json`.
  Auto-discovery does not satisfy this; `zara-cli config validate` checks the
  registered set.
- A skill must not import runtime code. Skills are markdown knowledge and
  procedures; anything executable belongs in `scripts/` or the MCP server.
- A new agent needs three things in one commit: a prompt file in `agent/`, an
  entry in the `agent` block of `opencode.json`, and a row in the table above.
  Registering without a row, or adding a row without a config entry, is drift.
- One prompt file serves one agent. If two ids must differ in behavior, give
  them separate files; sharing a file means the `agent` field of any command
  pointing at the other id silently changes behavior.

## How to verify

```bash
opencode debug agents            # JSON: id + assembled system prompt
uv run --project scripts zara-cli config validate  # references resolve, command agents exist
```

`opencode debug agents` proves load and assembly. `zara-cli config validate`
proves the references. `make test` runs both plus an expected-agent check; `make check`
adds the arch rules. Do not claim the layer is consistent from a config read
alone.
