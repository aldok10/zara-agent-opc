# Prompts Documentation

## Overview

Zara uses a layered prompt system loaded via OpenCode's `instructions` configuration and agent definitions.

## Prompt Architecture

```
.opencode/
├── instructions/
│   ├── system.md           # Operational instructions (recall, context, git safety)
│   └── philosophy.md       # Engineering philosophy (priorities, decision-making)
└── agent/
    ├── zara.md             # Primary agent — full Zara identity & behavior
    ├── plan.md             # Planning mode — analysis without changes
    ├── architect.md        # System design sub-agent
    ├── code-reviewer.md    # Code review sub-agent
    ├── testing-lead.md     # Testing strategy sub-agent
    ├── security-reviewer.md # Security review sub-agent
    ├── delivery-lead.md    # Delivery management sub-agent
    └── swarm.md            # Parallel coordination sub-agent
```

## Prompt Layers

### 1. Identity Prompt (`.opencode/agent/zara.md`)

**Purpose:** Defines the agent's identity, core behavior, relationship, and methodologies.

**Contents:**
- Core Identity & Personality
- Connection DNA (session start protocol)
- 8 Engineering Principles
- Leadership DNA & Emotional Intelligence
- Adaptive Communication (language matching, banned patterns)
- Memory & Context Awareness
- Engineering Lead priorities
- Privacy & Security Shield
- Development Methodology (skill chain, iron laws)
- Execution Style (action-first for D4 users)
- Session Ritual (greeting, energy matching, adaptive music)
- Growth Mission

### 2. Operational Instructions (`.opencode/instructions/`)

**Purpose:** Defines runtime behavior, context management, and safety rules.

**Two files:**
- `system.md` — Connection DNA, context protection, memory protocol, anti-AI writing, git safety
- `philosophy.md` — Priority stack, architecture review, AI engineering considerations

### 3. Sub-Agent Prompts (`.opencode/agent/*.md`)

Each sub-agent defines:
- Domain expertise and focus areas
- Relevant knowledge sources (DevIQ sections)
- Response format and quality criteria
- Skill & tool integration patterns

### 4. Skill Files (`.opencode/skills/`)

26 project skills with auto-activation via `skill-gate`. Each SKILL.md defines:
- Trigger conditions
- Step-by-step workflow
- Verification steps
- MCP tool integration points

## Prompt Design Principles

### 1. Front-load Context
Put the most important information first. The first 500 tokens matter most.

### 2. Be Specific
Instead of "follow best practices," reference specific principles and patterns.

### 3. Define Boundaries
Clearly state what the agent should and should NOT do.

### 4. Layer Information
Start broad, get specific. Identity → Instructions → Skills → Task.

### 5. Actionable Examples
Show exact behavior patterns with concrete examples.

## Customizing Prompts

### For Your Organization

1. **Identity changes:** Modify `.opencode/agent/zara.md`
2. **Behavior changes:** Update `.opencode/instructions/system.md`
3. **Philosophy changes:** Tweak `prompts/philosophy.md`
4. **New sub-agents:** Register in `opencode.json` and add file in `.opencode/agent/`
5. **New skills:** Add directory in `.opencode/skills/` with SKILL.md

### Best Practices

- Keep each file under 500 lines
- Test prompt changes in isolation
- Maintain consistency across agent and skill prompts
- Document why prompts were changed, not just what changed
