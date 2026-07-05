---
type: fact
title: "Public Skill Registries - skills.sh, LangChain Hub, CrewAI"
---

# Public Skill Registries

Ecosystem of platforms where AI agent skills, tools, and prompts are shared, discovered, and distributed.

## skills.sh

Public directory for AI agent skills. Community-driven catalog.

### Features

- Browseable skill catalog with search
- Quality scores based on community ratings
- Usage statistics and popularity metrics
- Skill metadata: compatibility, token cost, dependencies
- Direct installation/import support

### Publishing

- Submit via CLI or web interface
- Required: SKILL.md + manifest with metadata
- Quality review process (automated + community)
- Versioned releases with changelogs

## ClawHub

Skill marketplace with security focus.

### Differentiators

- Security auditing of published skills (injection detection)
- Versioned with immutable releases
- Community reviews and trust scores
- Dependency scanning for skill chains
- Namespace-based organization (org/skill-name)

### Use Cases

- Enterprise teams needing vetted skills
- Security-conscious deployments
- Skills that interact with sensitive systems

## LangChain Hub

Prompt and chain registry within the LangChain ecosystem.

### What It Offers

- Prompt templates (single-turn and multi-turn)
- Chain definitions (sequential, conditional, parallel)
- Tool configurations
- Version history with diff view
- Fork and customize existing prompts

### Format

```python
from langchain import hub

prompt = hub.pull("author/prompt-name")
# Returns a PromptTemplate or ChatPromptTemplate
```

### Best Practices for Publishing

- Include clear description and use case
- Tag with relevant categories
- Provide example inputs/outputs
- Specify compatible model families
- Version major changes (don't silently update)

## CrewAI Tools Marketplace

Tools and capabilities for CrewAI agent teams.

### Structure

- Tools: individual capabilities (web search, file read, API call)
- Tasks: pre-defined work units with tool assignments
- Crews: complete multi-agent configurations
- Roles: agent persona definitions

### Integration Pattern

```python
from crewai_tools import tool_name

agent = Agent(
    role="researcher",
    tools=[tool_name],
    goal="Find and summarize information"
)
```

## Semantic Kernel Skills

Microsoft's approach to AI skill packaging.

### Concept Model

- **Skills**: Collections of related functions
- **Functions**: Individual capabilities (native or semantic)
- **Native functions**: Code-backed (C#, Python, Java)
- **Semantic functions**: Prompt-backed with parameters

### Structure

```
skills/
  WriterSkill/
    ShortPoem/
      config.json    # Parameters, description
      skprompt.txt   # The actual prompt template
    Summarize/
      config.json
      skprompt.txt
```

### Strengths

- Strong typing for inputs/outputs
- Planner integration (AI selects which skills to use)
- Enterprise-grade (Azure-backed, Microsoft supported)
- Multi-language SDK support

## OpenAI GPTs Store

Consumer marketplace for custom GPT configurations.

### What's Published

- Custom instructions (system prompts)
- Knowledge files (uploaded documents)
- Action configurations (API integrations)
- Conversation starters (example prompts)

### Limitations as Skill Registry

- Closed ecosystem (OpenAI only)
- No programmatic access to skill definitions
- Can't extract/reuse instructions elsewhere
- Quality varies wildly (no review process beyond basic safety)

### Relevance

- Demonstrates demand for skill sharing
- UX patterns for skill discovery
- Conversation starters = few-shot examples concept

## Comparison Matrix

| Registry | Open Source | Multi-Model | Security Review | Versioning | API Access |
|----------|-----------|-------------|-----------------|------------|-----------|
| skills.sh | Yes | Yes | Community | Yes | Yes |
| ClawHub | Partial | Yes | Automated + manual | Immutable | Yes |
| LangChain Hub | Yes | Yes (via LangChain) | No | Yes | Yes |
| CrewAI Tools | Yes | Partial | No | Package-based | Yes |
| Semantic Kernel | Yes | Yes | Microsoft-backed | Git-based | Yes |
| OpenAI GPTs | No | No (GPT only) | Basic safety | No | No |

## Publishing Best Practices

### Metadata Requirements

Every published skill should include:

- **Name**: Clear, descriptive, searchable
- **Description**: One paragraph, what it does and when to use it
- **Compatibility**: Which models/frameworks it works with
- **Token budget**: Approximate context cost
- **Dependencies**: Other skills or tools required
- **Version**: Semantic versioning (breaking.feature.fix)
- **License**: How others can use/modify it
- **Examples**: At least 2 input/output demonstrations

### Quality Signals

What makes a skill rank higher in registries:

- Clear documentation with usage examples
- Tested across multiple model versions
- Active maintenance (responds to issues)
- Reasonable token budget (not bloated)
- Community ratings and usage stats
- Behavioral eval results published

### Discovery Patterns

How users find skills in registries:

1. **Search**: Keyword and semantic search of descriptions
2. **Browse**: Category/tag-based navigation
3. **Recommend**: "Users who used X also used Y"
4. **Curated**: Editor picks, featured collections
5. **Dependency**: "Required by skill Z" chains

### Portability Considerations

When publishing skills intended for multiple platforms:

- Use markdown (universal format)
- Avoid platform-specific syntax (Cursor-only features, Claude-only tags)
- Provide adapter notes for different systems
- Test on at least 2 platforms before publishing
- Document which features degrade gracefully on unsupported platforms
