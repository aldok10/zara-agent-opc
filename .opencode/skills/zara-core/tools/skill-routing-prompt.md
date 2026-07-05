# Skill Routing Decision Tree Prompt

You are determining which skill to dispatch based on user intent signals. Follow this decision tree to route accurately.

## Input

**User message:** {{the raw user message}}
**Context:** {{conversation history, current file, recent commands}}
**Active skill:** {{currently loaded skill, if any}}

## Signal Extraction

Before routing, extract these signals from the user message:

1. **Action verb**: what does the user want to do? (build, fix, review, deploy, plan, explain)
2. **Domain nouns**: what technologies/concepts are mentioned? (React, Go, API, database, CI)
3. **Artifact type**: what is being produced? (code, config, design doc, test, review)
4. **Complexity**: single task or multi-step workflow?
5. **Specificity**: exact file/function or open-ended exploration?

## Decision Tree

```
Is the user asking about Zara/opencode configuration?
├── YES -> customize-opencode
└── NO -> continue

Is the user greeting, chatting, or asking about themselves?
├── YES -> zara-core (no skill dispatch needed)
└── NO -> continue

Is there a clear programming language?
├── Go -> golang-expert
├── PHP -> php-expert
├── Python -> python-expert
├── TypeScript/JavaScript -> typescript-expert
├── Multiple/None -> continue
└── continue

Is the primary task debugging/fixing a bug?
├── YES -> systematic-debugging
└── NO -> continue

Is the primary task about security?
├── Threat modeling, audit, vulnerabilities, auth -> security-engineering
└── NO -> continue

Is the primary task about testing?
├── Test strategy, coverage, TDD, test writing -> testing-strategy
└── NO -> continue

Is the primary task about system architecture?
├── Design, scaling, infrastructure, patterns -> system-design
└── NO -> continue

Is the primary task about AI/ML systems?
├── RAG, agents, embeddings, prompts, evals -> ai-engineering
└── NO -> continue

Is the primary task about career/leadership?
├── Growth, communication, 1:1, feedback -> career-leadership
└── NO -> continue

Is the primary task about git operations?
├── Branching, merging, history, worktrees -> git-expert
└── NO -> continue

Is this a multi-step workflow?
├── YES -> engineering-workflow (coordinates sub-dispatches)
└── NO -> no skill (handle inline)
```

## Disambiguation Rules

When multiple skills could apply:

| Conflict | Resolution |
|----------|-----------|
| Language + Debugging | systematic-debugging (methodology first, then language expertise) |
| Language + Testing | testing-strategy (if strategy/design); language-expert (if writing specific tests) |
| Language + Security | security-engineering (if audit/threat model); language-expert (if secure coding) |
| Architecture + Language | system-design (if design phase); language-expert (if implementation) |
| Multiple languages | Pick the primary one; mention others as context |

## Context Signals (Tiebreakers)

- **File currently open**: strongest signal for language routing
- **Recent conversation**: stay in current skill unless topic clearly shifts
- **Explicit request**: "use X approach" or "as a Go expert" overrides tree
- **Error message language**: route to that language's expert

## Anti-Patterns

- Do NOT route to a language expert for conceptual questions ("explain CQRS")
- Do NOT route to engineering-workflow for single-file changes
- Do NOT route to system-design for implementation tasks
- Do NOT switch skills mid-task unless the user explicitly changes topic
- Do NOT dispatch multiple skills simultaneously (one active at a time)

## Output Format

```
## Routing Decision

Signals:
- Action: [verb]
- Domain: [nouns]
- Artifact: [type]
- Complexity: [single | multi-step]

Route: [skill-name]
Reason: [one sentence]
Confidence: [high | medium | low]

Alternative: [second-best skill, if confidence < high]
```

## Rules

- One skill at a time. If a task needs multiple, use engineering-workflow to coordinate.
- "I don't know which skill" is acceptable. Route to engineering-workflow for triage.
- Active skill persists until topic changes. Do not re-route on every message.
- User can override: "use python-expert for this" always wins.
- If message is ambiguous after signal extraction, ask one clarifying question instead of guessing.
