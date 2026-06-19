# Prompts Documentation

## Overview

Zara uses a layered prompt system that separates concerns and makes the agent behavior configurable and maintainable.

## Prompt Architecture

```
prompts/
├── system.md         # Agent identity, safety rules, core behavior
├── tools.md          # Tool usage instructions
├── workflows.md      # Task orchestration patterns
├── examples.md       # Usage examples for prompt engineering
└── sub-agents/       # Specialized sub-agent prompts
    ├── architect.md
    ├── code-reviewer.md
    ├── testing-lead.md
    ├── practices-lead.md
    ├── ddd-specialist.md
    ├── security-reviewer.md
    └── delivery-lead.md
```

## Prompt Layers

### 1. System Prompt (`system.md`)

**Purpose:** Defines the agent's identity, core behavior, safety rules, and immutable characteristics.

**Contents:**
- Agent name and role
- Personality and communication style
- Safety constraints and ethical guidelines
- Core behavioral principles
- Quality gates

**Example structure:**
```markdown
# System Prompt

## Identity
You are {agent_name}, a {agent_role}.

## Core Principles
1. {principle_1}
2. {principle_2}

## Safety Rules
- {rule_1}
- {rule_2}
```

### 2. Tool Prompt (`tools.md`)

**Purpose:** Defines what tools are available and how to use them correctly.

**Contents:**
- Tool inventory and descriptions
- Usage patterns for each tool
- When to use each tool
- Common mistakes to avoid

**Key sections:**
```markdown
## Available Tools

### {Tool Name}
- **Purpose**: ...
- **When to use**: ...
- **When NOT to use**: ...
- **Pattern**: ...
```

### 3. Workflow Prompt (`workflows.md`)

**Purpose:** Defines how Zara orchestrates tasks, delegates to sub-agents, and manages complex workflows.

**Contents:**
- Task decomposition patterns
- Sub-agent delegation rules
- Swarm coordination workflow
- Quality review process
- Memory and journaling requirements

### 4. Sub-Agent Prompts

Each sub-agent has a specialized prompt that defines:
- Domain expertise and focus areas
- Relevant knowledge sources (DevIQ sections)
- Trigger patterns for engagement
- Response format
- Quality criteria

## Prompt Design Principles

### 1. Front-load Context
Put the most important information first. The first 500 tokens matter most.

### 2. Be Specific
Instead of "follow best practices," reference specific principles and articles.

### 3. Use Examples
Show, don't just tell. Include input/output examples.

### 4. Define Boundaries
Clearly state what the agent should and should NOT do.

### 5. Layer Information
Start broad, get specific. System → Tool → Workflow → Task.

### 6. Cite Sources
Ground recommendations in the knowledge base.

## Customizing Prompts

### For Your Organization

1. **Identity changes:** Modify `prompts/system.md`
2. **Tool additions:** Add tools in `prompts/tools.md`
3. **Workflow changes:** Update `prompts/workflows.md`
4. **New sub-agents:** Add files in `prompts/sub-agents/`

### Best Practices

- Test prompt changes in isolation
- Keep a version history of prompt changes
- Use semantic versioning for prompt templates
- Document why prompts were changed, not just what changed
