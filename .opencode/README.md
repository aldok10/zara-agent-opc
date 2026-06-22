# Zara Agent - OpenCode Directory

This directory contains Zara Agent's OpenCode extensions.

## Structure (per OpenCode docs)

```
.opencode/
├── agent/               # Agent markdown definitions (auto-loaded)
│   ├── zara.md          # Primary build agent
│   ├── sketch.md        # Primary plan agent (Sketch, read-only)
│   ├── atlas.md         # Subagent: Atlas (architecture)
│   ├── lens.md          # Subagent: Lens (code review)
│   ├── probe.md         # Subagent: Probe (testing strategy)
│   ├── shield.md        # Subagent: Shield (security)
│   ├── pulse.md         # Subagent: Pulse (delivery)
│   ├── rhythm.md        # Subagent: Rhythm (loop engineering)
│   ├── hive.md          # Subagent: Hive (parallel coordination)
│   └── forge.md         # Subagent: Forge (implementation)
├── plugin/              # Plugin scripts (auto-loaded)
│   ├── zara.mjs         # Composition root (loads all modules)
│   └── zara/            # Plugin modules (dev, memory, evolve, flow,
│                        #   observe, empathy, social, relationship, voice, infra)
├── instructions/        # Canonical system instructions
├── commands/            # Custom command docs
└── skills/              # Custom skills
```

## How It Works

1. `opencode.json` (project root) - main config with agent definitions
2. `AGENTS.md` (project root) - auto-loaded instructions (like CLAUDE.md)
3. `.opencode/agent/*.md` - agent prompts with YAML frontmatter
4. `.opencode/plugin/zara.mjs` - composition root that loads modules from `.opencode/plugin/zara/`

## Usage

- Tab to switch between `build` (default) and `plan` agents
- `@architect` (Atlas), `@code-reviewer` (Lens), `@testing-lead` (Probe), `@security-reviewer` (Shield), `@delivery-lead` (Pulse), `@loop-engineer` (Rhythm), `@swarm` (Hive), `@implementation` (Forge) to invoke subagents
