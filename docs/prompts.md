# Prompts Documentation

## Overview

Zara uses a layered prompt system loaded via OpenCode's `instructions` configuration and agent definitions.

## Prompt Architecture

```
.opencode/
├── instructions/
│   ├── system.md           # Core rules: truth discipline, quality gate, self-correction, search strategy
│   └── system-extended.md  # Extended: handoffs, typed exits, decomposition, token budgets, conflict detection
└── agent/
    ├── zara.md             # Primary agent - identity, refinement trigger, state persistence
    ├── zara-extended.md    # Extended - character, delegation, skill routing table
    ├── sketch.md           # Sketch - planning mode, decomposition protocol
    ├── atlas.md            # Atlas - architecture, entity-relationship mapping
    ├── forge.md            # Forge - implementation pipeline (7 steps)
    ├── scout.md            # Scout - requirements disambiguation
    ├── lens.md             # Lens - code review, false grouping detection
    ├── probe.md            # Probe - testing strategy, correctness
    ├── shield.md           # Shield - security, evidence-based findings
    ├── pulse.md            # Pulse - delivery, quality gate before ship
    ├── rhythm.md           # Rhythm - loop engineering, stuck detection
    ├── hive.md             # Hive - parallel coordination, graceful degradation
    ├── refiner.md          # Refiner - answer quality evaluator (think + judge)
    └── compaction.md       # Compaction - context summarization with state preservation
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

**Instruction file (loaded via `instructions` config):**
- `.opencode/instructions/system.md` - Priority stack, runtime behavior, memory protocol, git safety, voice rules (engineering philosophy merged in)

### 3. Sub-Agent Prompts (`.opencode/agent/*.md`)

Each sub-agent defines:
- Domain expertise and focus areas
- Relevant knowledge sources (DevIQ sections)
- Response format and quality criteria
- Skill & tool integration patterns

### 4. Skill Files (`.opencode/skills/`)

27 project skills with auto-activation via `skill-gate`. Each SKILL.md defines:
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
2. **Behavior/philosophy changes:** Update `.opencode/instructions/system.md`
3. **New sub-agents:** Register in `opencode.json` and add file in `.opencode/agent/`
4. **New skills:** Add directory in `.opencode/skills/` with SKILL.md

### Best Practices

- Keep each file under 500 lines
- Test prompt changes in isolation
- Maintain consistency across agent and skill prompts
- Document why prompts were changed, not just what changed
