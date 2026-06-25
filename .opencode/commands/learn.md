---
description: Learn about the current project OR learn from external GitHub projects via GitReverse to improve Zara
---

# Learn - Zara's Learning System

You invoked `/learn`. Two modes:

1. **`/learn`** — Extract current project knowledge into memory (existing)
2. **`/learn from <owner/repo>`** — Study an external GitHub project via GitReverse, extract patterns to improve Zara
3. **`/learn list`** — List all external projects studied so far

---

## Mode 1: Project Knowledge Extraction (default)

Run `project_learn` (optionally with a path argument if not cwd).
Show the user what was extracted.
Ask: "Anything to correct? I stored these as 'observed' — tell me if something's wrong and I'll fix it."

### If User Corrects

When the user says something like "no, we use Vitest not Jest" or "that dep list is wrong":

1. Delete the incorrect memory: `memory_delete(pattern: "project:<name>:<category>:<slug>")`
2. Store the correction: `memory_learn(key: "project:<name>:<category>:<slug>", value: "<corrected>", source: "user_explicit", type: "fact", scope: "project:<name>")`
3. Confirm briefly.

---

## Mode 2: Learn from External Project via GitReverse

`/learn from <owner/repo>` — e.g. `/learn from ruvnet/ruflo`

### Why This Exists

GitReverse converts entire GitHub codebases into a single natural language prompt — the "project essence." Instead of reading thousands of lines of source code, you get the core idea, architecture, and goals in AI-readable form. Zara then analyzes that essence to find patterns worth adopting.

**The goal**: continuously improve Zara by studying the best projects in the AI engineering ecosystem. Every external project is a potential source of new patterns, architecture decisions, or features Zara doesn't have yet.

### Execution Steps

#### Step 1: Fetch Project Essence
```bash
curl 'https://www.gitreverse.com/api/reverse-prompt' \
  --compressed -X POST \
  -H 'Content-Type: application/json' \
  --data-raw '{"repoUrl":"<owner/repo>"}'
```

Extract `prompt` field from JSON response. This is the AI-readable project essence.

#### Step 2: Analyze for Zara Improvement
Run the following analysis protocol:

```
Task: Analyze this project essence for Zara improvement patterns.

Project: {project name}
Essence: {prompt from gitreverse}

Frame every finding as: "Gimana caranya Zara bisa jadi lebih baik dengan belajar dari {project name}"

Analyze:

1. CORE PATTERNS — What's the central architecture idea?
   - Mental model (graph/role/handoff/code-first/hybrid)
   - How does it orchestrate? (sequential/swarm/hierarchical/graph)
   - How does it handle state? (stateless/checkpointed/memory pools)

2. TOP 3 ADOPTIONS — 3 konkret yang Zara bisa ambil
   - Per item: what exactly, why it matters, effort to adopt (low/medium/high)
   - Start with the highest-impact, lowest-effort item

3. ZARA'S ADVANTAGE — 1 hal yang Zara udah lebih baik
   - Be honest. Where does Zara's approach already win?

4. RISK WARNING — 1 hal dari project ini yang HARUS DIHINDARI
   - Anti-pattern, over-engineering trap, or design mistake

5. DECISION — Recommended action:
   - ADOPT → implement directly
   - STUDY → needs more research first
   - SKIP → not relevant or Zara already does it better

6. STORE FINDINGS
```

#### Step 3: Store Learnings
After analysis:

```bash
# Store the project essence
memory_learn(
  key: "external_project:<owner/repo>:essence",
  value: "<compressed essence, ~50 tokens>",
  source: "external_unverified",
  type: "fact",
  scope: "external_project:<owner/repo>"
)

# Store each adoption recommendation
memory_learn(
  key: "external_project:<owner/repo>:adoption:<pattern-name>",
  value: "<what + why + effort>",
  source: "inferred",
  type: "architecture",
  scope: "external_project:<owner/repo>"
)

# Record the learning event
memory_episode(
  event: "learned from <owner/repo> via GitReverse",
  outcome: "analyzed and stored N patterns for Zara improvement",
  tags: ["gitreverse", "external-learning", "<category>"]
)

reflect(
  task: "learn from <owner/repo>",
  pattern: "gitreverse-external-analysis",
  outcome: "success"
)
```

#### Step 4: Present to User

Format output as:

```
## 📖 Learn: <project-name>

### Essence
<1-2 sentence summary of what this project does>

### Top 3 for Zara
1. **[pattern]** — <what> | effort: <low/med/high>
2. **[pattern]** — <what> | effort: <low/med/high>
3. **[pattern]** — <what> | effort: <low/med/high>

### Zara's Edge
<1 thing Zara does better>

### Risk
<1 anti-pattern to avoid>

### Stored
✓ Project essence
✓ N adoption patterns
✓ Episode logged

Run /learn list to see all studied projects.
```

---

## Mode 3: List Studied Projects

`/learn list`

```
memory_recall(query: "external_project:", scope: "external_project")
```

Show a table:

| Project | Patterns Found | Adopted? | Studied |
|---------|---------------|----------|---------|
| ruvnet/ruflo | 3 | pending | 2026-06-25 |
| langchain-ai/langgraph | 2 | adopted | 2026-06-20 |

---

## Quick Reference

```bash
# Study a project
/learn from owner/repo

# Study with custom analysis focus
/learn from owner/repo focus on state-management
/learn from owner/repo focus on agent-memory
/learn from owner/repo focus on multi-agent-coordination

# List all studied
/learn list
```

## Notes

- GitReverse API is free for "quick reverse" (shallow analysis)
- Deep Reverse ($9/mo) gives architecture breakdowns — use sparingly
- All external knowledge is stored as `external_unverified` until user confirms
- Safe to run multiple times (upserts, not duplicates)
- Focus analysis with `focus on <topic>` to narrow the lens
