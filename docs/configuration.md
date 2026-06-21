# Configuration Guide

Zara uses a layered configuration system:

1. **Default values** — Built into the agent
2. **config.yaml** — YAML configuration file
3. **Environment variables** — Override YAML values
4. **Runtime flags** — Override everything

## Configuration File

The primary configuration file is `config.yaml` in the project root.

```yaml
agent:
  name: Zara                    # Agent name
  role: Engineering Partner with Senior Dev Wisdom  # Agent role
  description: "Your senior dev partner — warm, direct, growth-oriented"  # Agent description
```

## Environment Variables

All configuration options can be set via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ZARA_AGENT_NAME` | Zara | Agent display name |
| `ZARA_AGENT_ROLE` | Engineering Partner with Senior Dev Wisdom | Agent role/title |
| `ZARA_HOME` | ~/.zara | Root directory for runtime data |
| `ZARA_KNOWLEDGE_DIR` | (ZARA_HOME/knowledge) | Knowledge base path |
| `ZARA_SKILLS_DIR` | (ZARA_HOME/skills) | Skills directory |
| `ZARA_MEMORY_DIR` | (ZARA_HOME/memory) | Memory storage path |
| `ZARA_SESSIONS_DIR` | (ZARA_HOME/sessions) | Session logs path |
| `CONTEXT7_API_KEY` | (none) | API key for Context7 docs |
| `ZARA_DEFAULT_MODEL` | claude-sonnet-4-5 | Default LLM model |
| `ZARA_WORKER_MODEL` | deepseek/deepseek-v4-flash | Worker LLM model |
| `CONTEXT7_API_KEY` | (none) | API key for Context7 docs |
| `ZARA_ENABLE_MEMORY` | true | Enable memory system |

## Configuration Sections

### Agent Identity

```yaml
agent:
  name: Zara
  description: "engineering partner — senior dev wisdom, growth mindset, 7 sub-agents"
  version: 1.0.0
```

### Sub-Agents

Configure which sub-agents are active and their prompts:

```yaml
  sub_agents:
    architect:
      enabled: true
      prompt_file: .opencode/agent/architect.md
    # ... other agents
```

### Knowledge Base

```yaml
knowledge:
  enabled: true
  path: /path/to/knowledge
  sections:
    - architecture
    - design-patterns
    # ...
```

### Memory System

```yaml
memory:
  enabled: true
  journal:
    retention_days: 365  # Auto-cleanup old entries
```

### LLM Configuration

```yaml
llm:
  default_model: claude-sonnet-4-5
  temperature: 0.7
  max_tokens: 4096
```

### Security

```yaml
security:
  allowed_commands:
    - git
    - npm
  blocked_commands:
    - rm -rf
    - sudo
```

## Feature Toggles

| Feature | Env Variable | Default | Description |
|---------|-------------|---------|-------------|
| Memory | `ZARA_ENABLE_MEMORY` | true | Cross-session memory |
| Context7 | `CONTEXT7_API_KEY` | (none) | Live docs fetching |

## Examples

### Minimal Setup

```bash
export ZARA_HOME=~/.zara
export CONTEXT7_API_KEY=sk-xxx
```

### Custom Knowledge Base

```bash
export ZARA_KNOWLEDGE_DIR=/shared/team/knowledge
export ZARA_HOME=~/.zara
```
