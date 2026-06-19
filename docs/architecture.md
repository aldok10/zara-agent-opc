# Architecture

## Overview

Zara is your **senior engineering partner** — warm, direct, and committed to your growth. She coordinates 7 specialized sub-agents to solve complex engineering problems, grounded in the DevIQ knowledge base. Zara follows a hub-and-spoke architecture with herself as the central coordinator, always asking: does this need to exist? Does the stdlib do it? What's the minimum that works?

```mermaid
graph TB
    User[Developer/User] --> Zara[Zara Orchestrator]
    
    Zara --> Architect[Architecture Agent]
    Zara --> CodeReview[Code Review Agent]
    Zara --> Testing[Testing Lead]
    Zara --> Practices[Practices & Principles]
    Zara --> DDD[DDD Specialist]
    Zara --> Security[Security Reviewer]
    Zara --> Delivery[Delivery Lead]
    
    Zara --> Knowledge[Knowledge Base<br/>DevIQ 240+ Articles]
    Zara --> Skills[Skills System<br/>Hermes-Inspired]
    Zara --> Memory[Memory System<br/>Journal + Index]
    Zara --> Swarm[Swarm Coordinator<br/>Multi-Agent Tasks]
    
    Knowledge --> Sections[12 Sections<br/>antipatterns, architecture,<br/>code-smells, design-patterns,<br/>DDD, laws, practices,<br/>principles, terms, testing,<br/>tools, values]
    
    subgraph "External Integrations"
        Context7[Context7 MCP<br/>Live Docs]
        Hivemind[Hivemind<br/>Cross-Agent Memory]
    end
    
    Zara --> Context7
    Zara --> Hivemind
```

## Agent Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ReceivingTask
    ReceivingTask --> QueryMemory: Check past learnings
    QueryMemory --> LoadSkills: Check existing skills
    LoadSkills --> Decompose: Analyze task
    Decompose --> Delegate: Assign to sub-agent(s)
    Delegate --> Execute: Sub-agent works
    Execute --> Review: Check quality
    Review --> CreateSkill: Extract learnings
    CreateSkill --> Journal: Store in memory
    Journal --> [*]
    
    Review --> Delegate: Needs revision
    Delegate --> [*]: Task complete
```

## Prompt Architecture

Zara uses a layered prompt system:

```mermaid
graph TD
    SystemPrompt[System Prompt<br/>Identity + Safety] --> ToolPrompt[Tool Prompt<br/>Tool Usage]
    ToolPrompt --> WorkflowPrompt[Workflow Prompt<br/>Orchestration]
    WorkflowPrompt --> UserPrompt[User Prompt<br/>Task Instructions]
    
    SystemPrompt --> |Pinned| AgentContext[Agent Context]
    ToolPrompt --> |Tool Definitions| AgentContext
    WorkflowPrompt --> |Workflows| AgentContext
    UserPrompt --> |Task| AgentContext
```

### Prompt Layers

| Layer | Content | Purpose |
|-------|---------|---------|
| **System** | Agent identity, safety rules, core behavior | Immutable foundation |
| **Tool** | Tool definitions, usage instructions | Capability definition |
| **Workflow** | Task orchestration, delegation patterns | Process guidance |
| **User** | User-supplied instructions | Task context |

## Memory System

```mermaid
graph LR
    Session[Session] --> Journal[journal.jsonl<br/>Append-only log]
    Task[Task] --> Skill[skills/<name>.md<br/>Reusable workflow]
    Skill --> Index[skills-index.json<br/>Registry]
    
    subgraph "Persistence"
        Journal
        Index
        Sessions[sessions/<date>-<name>.md]
    end
    
    subgraph "Retrieval"
        Query[Query Memory] --> Journal
        Query --> Index
        Query --> Sessions
    end
```

### Memory Components

| Component | Format | Purpose |
|-----------|--------|---------|
| Journal | JSONL | Append-only task log |
| Skills Index | JSON | Skill registry with usage |
| Sessions | Markdown | Per-session detailed logs |
| Skills | Markdown | Reusable workflow patterns |

## Tool Execution

```mermaid
sequenceDiagram
    participant Z as Zara
    participant T as Tool System
    participant E as External
    participant M as Memory
    
    Z->>T: Invoke tool
    T->>T: Validate security
    T->>E: Execute (if allowed)
    E-->>T: Result
    T-->>Z: Formatted response
    Z->>M: Journal result
```

## Sub-Agent System

Each sub-agent has:

1. **Specialized Prompt** — Domain-specific system prompt
2. **Knowledge Sources** — Relevant DevIQ sections
3. **Trigger Patterns** — When to engage this agent
4. **Output Format** — Structured response template

### Communication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Z as Zara Orchestrator
    participant S as Sub-Agent
    participant K as Knowledge Base
    
    U->>Z: Request engineering task
    Z->>Z: Analyze task type
    Z->>K: Query relevant articles
    K-->>Z: Article references
    Z->>S: Delegate to specialist
    S->>S: Apply domain expertise
    S-->>Z: Structured response
    Z->>Z: Synthesize with context
    Z-->>U: Complete response with citations
```

## Swarm Coordination

For complex tasks with 3+ workstreams:

```mermaid
graph TB
    Coordinator[Zara Coordinator] --> Worker1[Worker 1]
    Coordinator --> Worker2[Worker 2]
    Coordinator --> Worker3[Worker 3]
    Worker1 --> Verifier[Verifier<br/>Quality Gate]
    Worker2 --> Verifier
    Worker3 --> Verifier
    Verifier --> Synthesizer[Final Synthesis]
```

## Configuration Flow

```mermaid
graph LR
    Defaults[Default Values] --> Config[config.yaml]
    Env[Environment Variables] --> Config
    Config --> Runtime[Runtime Configuration]
    Runtime --> Agent[Agent Behavior]
```
