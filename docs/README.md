# Docs

Topic files for the harness. `AGENTS.md` is the router; read only what the task
needs. One file per question, so no page is a duplicate of another.

## Read in this order

| # | File | Answers |
|---|---|---|
| 1 | [harness-design.md](harness-design.md) | What is the harness made of? Five subsystems, eight editable components, the recursive loop |
| 2 | [architecture.md](architecture.md) | How do the parts fit? Components, data flow, boundaries |
| 3 | [verification.md](verification.md) | What counts as done? Three layers, evidence, failure handling |
| 4 | [memory-contract.md](memory-contract.md) | How does memory work? Nine MCP tools, the database, write and read rules, retention, failure modes |
| 5 | [guardrails.md](guardrails.md) | What is forbidden? Permission matrix, agent scope, trust boundary, architecture rules |
| 6 | [quality-document.md](quality-document.md) | Where is the debt? Module grades and gaps |
| 7 | [environment.md](environment.md) | What must be installed? Toolchain, submodule, binary, platform notes |

## Reference

| File | Contents |
|---|---|
| [decisions/](decisions/) | Architecture decision records: context, decision, consequences, reversal condition |
| [decisions/0001-adopt-harness-engineering.md](decisions/0001-adopt-harness-engineering.md) | Why the repo follows the five subsystems and eight components |
| [decisions/0002-pin-mcp-by-submodule.md](decisions/0002-pin-mcp-by-submodule.md) | Why the MCP server is pinned by gitlink, not by a package lock |

## Rules for these files

- Update the doc in the same commit as the change it describes. No stale docs.
- A claim about runtime state must be verified or marked unverified.
- Tables over prose when the content is a list of facts.
- No emoji.
