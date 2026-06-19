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
| `ZARA_ENABLE_MEMORY` | true | Enable memory system |
| `ZARA_ENABLE_HIVEMIND` | true | Enable hivemind |
| `ZARA_ENABLE_SWARM` | true | Enable swarm coordination |
| `ZARA_ENABLE_SENIOR_DEV` | true | Enable senior dev mode |
| `ZARA_ENABLE_CONTEXT7` | true | Enable Context7 integration |
| `ZARA_ENABLE_SKILL_AUTO_CREATE` | true | Auto-create skills |
| `ZARA_ALLOWED_COMMANDS` | git,npm,... | Allowed shell commands |
| `ZARA_BLOCKED_COMMANDS` | rm -rf,... | Blocked shell commands |

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
    prompt_file: prompts/sub-agents/architect.md
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
| Hivemind | `ZARA_ENABLE_HIVEMIND` | true | Unified AI agent memory |
| Swarm | `ZARA_ENABLE_SWARM` | true | Multi-agent coordination |
| Senior Dev | `ZARA_ENABLE_SENIOR_DEV` | true | Senior dev mode |
| Context7 | `ZARA_ENABLE_CONTEXT7` | true | Live docs fetching |
| Skill Auto-Create | `ZARA_ENABLE_SKILL_AUTO_CREATE` | true | Auto skill creation |

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

### Disable Features

```bash
export ZARA_ENABLE_HIVEMIND=false
export ZARA_ENABLE_CONTEXT7=false
export ZARA_ENABLE_SWARM=false
```
