---
description: Multi-agent debate for complex decisions requiring diverse specialist perspectives
---

I need a multi-agent debate on this question:

**Question**: $ARGUMENTS

## Instructions

Use the `deliberate` tool with:
- question: "$ARGUMENTS"
- agents: ["architect", "security-reviewer", "code-reviewer"] (or adjust based on question domain)
- maxRounds: 2

After the debate completes:
1. Present the full debate result to the user
2. If consensus is high (>75%), recommend proceeding with the agreed approach
3. If consensus is low (<50%), highlight the key disagreements and ask user to decide
4. Store the decision outcome in workspace memory via `workspace_write` with type "decision"
5. Persist important decisions to long-term memory via `memory_learn(type: "decision")`
