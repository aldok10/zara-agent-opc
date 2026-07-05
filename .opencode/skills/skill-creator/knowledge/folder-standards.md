---
type: fact
title: "Skill Folder Structure Standards"
---

# Skill Folder Structure Standards

The complete specification for how agent skills are organized on disk, with rationale for each decision.

## Directory Layout

```
{skill-name}/
  SKILL.md              # Entry point. Loads first, always.
  subskills/            # Focused topic files. Load on demand via routing.
    topic-a.md
    topic-b.md
    topic-c.md
  knowledge/            # Deep reference material. Load on demand.
    domain-spec.md
    comparison.md
  examples/             # Working code/config the agent can copy.
    pattern-a/
    template.yaml
  tools/                # Prompt templates, checklists, scripts.
    generation-prompt.md
    audit-checklist.md
```

## Why Each Directory Exists

### SKILL.md (root)

The skill's identity and instruction set. Provides enough context for 80% of tasks. Progressive disclosure starts here -- the agent reads this first and only loads more if the routing table signals a need.

Token cost: ~800-1500 tokens for 80-100 lines.

### subskills/

Workflow-oriented files that answer "how do I handle X?" Each file is ONE focused topic. Loads when keywords in the user's query match the routing table.

Rationale: keeps SKILL.md concise while allowing deep dives. Agent only pays the token cost when it needs the depth.

### knowledge/

Reference material: specs, comparisons, decision matrices, deep facts. Not instructions -- the agent consults these while working, like checking documentation.

Rationale: separates "what to know" from "what to do". Knowledge files are stable (facts rarely change); subskills evolve with workflows.

### examples/

Working templates, code samples, and configs the agent can directly copy and adapt. Must be correct and runnable -- the agent trusts these as ground truth.

Rationale: show, don't tell. A working example communicates faster than paragraphs of description.

### tools/

Prompt templates, audit checklists, scripts. Artifacts the agent USES to generate output, not information it reads for understanding.

Rationale: meta-tools for the agent. A generation prompt is a tool; a style guide is knowledge.

## Token Budget Considerations

| File Type | Target Lines | Approx Tokens | Load Frequency |
|-----------|-------------|---------------|----------------|
| SKILL.md | 80-100 | 800-1500 | Always |
| Subskill | 60-100 | 600-1200 | On demand |
| Knowledge | 100-150 | 1000-2000 | On demand |
| Example | varies | varies | On demand |
| Tool | 50-100 | 500-1200 | On demand |

Total skill if everything loads: ~6000-10000 tokens. But progressive disclosure means typical load is SKILL.md + 1 subskill = ~2000-2500 tokens.

## Progressive Disclosure Principle

Level 1: SKILL.md alone handles the query (80% of cases).
Level 2: SKILL.md + one subskill (15% of cases).
Level 3: SKILL.md + subskill + knowledge file (5% of cases).

Design for level 1. Test that the SKILL.md gives enough instruction for common tasks without needing subskills.

## Naming Conventions

- Directory: lowercase, hyphens, matches `name` in frontmatter. Examples: `typescript-expert`, `ai-engineering`, `system-design`.
- Subskill files: lowercase, hyphens, descriptive. Examples: `type-system.md`, `boundary-validation.md`.
- Knowledge files: lowercase, hyphens, noun-based. Examples: `senior-dna.md`, `versions.md`, `gotchas.md`.
- Tool files: lowercase, hyphens, action-oriented. Examples: `creation-prompt.md`, `audit-checklist.md`.
- Example dirs: lowercase, hyphens, pattern-name. Examples: `skill-template/`, `rate-limiter/`.

## Minimum Viable Skill

A skill MUST have at minimum:
- `SKILL.md` with valid frontmatter and all required sections
- 3 subskill files covering the core topics
- 1 knowledge file with deep reference material
- Directory structure in place (even if examples/tools are sparse initially)

A skill SHOULD also have:
- 1+ example in examples/
- 1+ tool in tools/
- PROJECT.md if there are project-specific overrides
