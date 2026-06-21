# Zara Agent — OpenCode Directory

This directory contains Zara Agent's OpenCode extensions.

## Structure (per OpenCode docs)

```
.opencode/
├── agent/               # Agent markdown definitions (auto-loaded)
│   ├── zara.md          # Primary build agent
│   ├── plan.md          # Primary plan agent (read-only)
│   ├── architect.md     # Subagent: architecture
│   ├── code-reviewer.md # Subagent: code review
│   ├── testing-lead.md  # Subagent: testing strategy
│   ├── security-reviewer.md # Subagent: security
│   ├── delivery-lead.md # Subagent: delivery
│   └── swarm.md         # Subagent: swarm coordination
├── plugin/              # Plugin scripts (auto-loaded)
│   ├── zara.mjs         # Composition root (loads all modules)
│   └── zara/            # Plugin modules (dev, memory, evolve, flow,
│                        #   observe, empathy, social, relationship, infra)
├── instructions/        # Canonical system instructions
├── commands/            # Custom command docs
└── skills/              # Custom skills
```

## How It Works

1. `opencode.json` (project root) — main config with agent definitions
2. `AGENTS.md` (project root) — auto-loaded instructions (like CLAUDE.md)
3. `.opencode/agent/*.md` — agent prompts with YAML frontmatter
4. `.opencode/plugin/zara.mjs` — composition root that loads modules from `.opencode/plugin/zara/`

## Usage

- Tab to switch between `build` (default) and `plan` agents
- `@architect`, `@code-reviewer`, `@testing-lead`, `@security-reviewer`, `@delivery-lead`, `@swarm` to invoke subagents
