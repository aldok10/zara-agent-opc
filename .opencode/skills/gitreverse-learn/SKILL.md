---
name: gitreverse-learn
description: Study external GitHub projects via GitReverse API to extract patterns for Zara improvement
trigger: /learn from <owner/repo>, user asks to learn from a GitHub project wants Zara improvement patterns
---

# GitReverse Learning — Improve Zara by Studying Other Projects

## Why This Skill Exists

GitReverse converts entire codebases into a single natural language prompt ("project essence"). Instead of reading thousands of lines of source, you get the core architecture, goals, and mental model in AI-readable form. Zara then analyzes that essence to find patterns worth adopting.

**The goal**: continuously improve Zara by studying the best projects in the AI engineering ecosystem.

## How It Works

```
GitHub Repo → GitReverse API → Project Essence (prompt) → Zara Analysis → Patterns Stored → Zara Improves
```

---

## API Reference

### Endpoint

```
POST https://www.gitreverse.com/api/reverse-prompt
Content-Type: application/json

{"repoUrl": "owner/repo"}
```

### Response

```json
{
  "prompt": "Build me a [language] [project type] called [name]..."
}
```

Extract the `prompt` field. This is the AI-readable project essence.

### Premium

Deep Reverse ($9/mo): 5 deep analyzes/month + 5 manual controls/month.
Quick Reverse: free, sufficient for most project analysis.

---

## Analysis Protocol

When analyzing a project essence from GitReverse, follow this protocol:

### Step 1: Parse the Essence

Extract from the prompt:
- **Language/stack** — Python, TypeScript, Rust, etc.
- **Core primitive** — graph, role, handoff, code-first, hybrid
- **State model** — stateless, checkpointed, memory pools, vector store
- **Coordination style** — sequential, hierarchical, swarm, graph, event-driven
- **Key features** — what makes it special (3-5 bullet points)

### Step 2: Map to Zara's Architecture

For each pattern found, ask:
- Does Zara already do this? (check memory / existing code)
- If not, would it make Zara better? (impact assessment)
- How hard would it be to adopt? (effort estimation)

### Step 3: Generate Recommendations

Every recommendation must include:
- **What**: the exact pattern/concept
- **Why it matters**: the problem it solves for Zara
- **Effort**: low / medium / high
- **Impact**: low / medium / high
- **Priority**: effort vs impact ratio

### Step 4: Store Learnings

```bash
# Project essence (compressed, ~50 tokens)
memory_learn(key: "external_project:<owner/repo>:essence", value: "<essence>", source: "external_unverified", type: "fact", scope: "external_project:<owner/repo>")

# Adoption recommendation
memory_learn(key: "external_project:<owner/repo>:adoption:<pattern>", value: "<what+why+effort>", source: "inferred", type: "architecture", scope: "external_project:<owner/repo>")

# Learning event
memory_episode(event: "learned from <owner/repo> via GitReverse", outcome: "analyzed and stored N patterns", tags: ["gitreverse", "external-learning"])

reflect(task: "learn from <owner/repo>", pattern: "gitreverse-external-analysis", outcome: "success")
```

---

## Focus Lenses

Use these when the user specifies a focus area:

| Focus | What to Look For |
|-------|-----------------|
| `state-management` | Checkpointing, memory pools, vector stores, persistence |
| `agent-memory` | Conversation history, semantic recall, RAG, working memory |
| `multi-agent-coordination` | Swarm patterns, task routing, agent communication |
| `safety` | Permissions, sandboxing, human-in-loop, guardrails |
| `plugin-system` | MCP, hooks, extensibility, skill architecture |
| `ui/ux` | Terminal UI, desktop app, web interface, visualization |
| `testing` | Test patterns, coverage strategy, CI integration |
| `error-handling` | Recovery, fallbacks, observability, tracing |

### Custom Focus

If the user says `focus on <something else>`, adapt the analysis to prioritize that aspect. For example "focus on task-routing" means prioritize how the project decides which agent does what.

---

## Output Format

Present findings as:

```
## 📖 Learn: <project-name>

### Essence
<1-2 sentence summary>

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
```

---

## Quick Reference

```bash
# Fetch essence from any GitHub repo
curl 'https://www.gitreverse.com/api/reverse-prompt' \
  --compressed -X POST \
  -H 'Content-Type: application/json' \
  --data-raw '{"repoUrl":"owner/repo"}'

# Study for Zara improvement
/learn from owner/repo

# Focused analysis
/learn from owner/repo focus on agent-memory
/learn from owner/repo focus on state-management

# List all studied
/learn list
```

## Notes

- All external knowledge starts as `external_unverified` — user must confirm to upgrade
- Safe to study the same project multiple times (upserts)
- The skill complement's Zara's `self-improvement` loop by adding external signal
- Focus lenses narrow the analysis to what matters most for current Zara gaps
