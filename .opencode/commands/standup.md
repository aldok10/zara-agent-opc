---
description: Standup - git + MCP metrics + patterns + memory + @pulse deep analysis
---

# Standup - Full Activity + Delivery Health

Generates a complete standup from git, MCP metrics, memory, and patterns.
Supports a `/standup deep` mode that dispatches to **@pulse** for delivery health analysis.

## Parsing

```
/standup              → quick standup (default)
/standup deep         → deep standup + @pulse delivery health analysis
/standup pulse        → same as deep
```

## Data Sources (Quick Mode)

Fetch these in parallel:

### Git Activity
`!git log --oneline --since="yesterday" --author="$(git config user.name)"`
`!git diff --stat`
`!git stash list`

### MCP Metrics & Memory
- `metrics_today` - tool usage, patterns, success rates
- `patterns` - learned patterns from recent work
- `memory_recall(query: "recent work decisions")` - key decisions from memory
- `workflow_rules` - active workflow rules
- `zara_evolve_status` - learning progress

### Knowledge (Optional, for context)
- `knowledge_passage(query: "[current project context]")` - relevant patterns for what's being built

## Deep Mode (Dispatch to @pulse)

If arg is `deep` or `pulse`:
1. Run the quick mode standup first
2. Then: `task(subagent_type: "delivery-lead", prompt: "Delivery health assessment: analyze tech debt, shipping velocity, blocker patterns from this standup data. Suggest priorities for the next work session. Standup data: [insert standup results]")`
3. Append @pulse's findings as a `📦 Delivery Health` section in the output

## Output Format (Quick Mode)

```
## Standup - [date]

### ✅ Done
• <from git log>
• <from metrics_today>

### 🔄 Doing
• <from git diff - unstaged/uncommitted>
• <from stash list>

### 📊 Metrics
• Tools used today: [N]
• Success rate: [X%]
• Patterns active: [N]
• Session time: [Xh]

### 🧠 Patterns & Learnings
• <from patterns - what's repeating>
• <from memory_recall - key decisions>
• <from evolve_status>

### ⏭️ Suggested Next
• <context-aware suggestion from memory/workflow>
• <if blockers detected: unblocking suggestion>
```

Keep it tight. 5-8 bullet points total. No fluff.
