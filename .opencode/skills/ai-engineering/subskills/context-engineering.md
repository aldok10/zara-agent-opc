---
type: subskill
title: "Context Engineering"
---

# Context Engineering

## Evolution
Prompt engineering (2023) -> Prompt management (2024) -> **Context engineering (2025-2026)**.

## Definition
"The art of providing all the context for the task to be plausibly solvable by the LLM" (Tobi Lutke).
Mental model: **LLM is the CPU, context window is RAM, you are the OS** deciding what gets loaded.

## The 5 context layers (manage each independently)
1. **System prompt**: persona, constraints, output format, guardrails. Stable, rarely changes.
2. **Retrieved context**: RAG results, tool outputs, file contents. Dynamic, task-specific.
3. **Conversation history**: prior messages, summarized or full. Grows  --  needs active management.
4. **Tool results**: structured data from function calls. Ephemeral, task-specific.
5. **User input**: the actual request. Variable, often ambiguous.

## Context budget
Every layer competes for tokens. Budget per layer:
- System prompt: **< 15%** of window
- Retrieved context: **< 40%**
- History: **< 30%**
- Leave **15%+** headroom for generation

## Context selection
Not all context is equal. **Relevance-rank before including.** Stale context = noise that degrades output.

## Compression strategies
- Summarize old messages
- Extract key facts from long documents
- Maintain rolling "memory" summaries
- Drop low-relevance retrieved chunks

## Dynamic context
Different tasks need different context  --  **route by task type**. A code review needs different context than creative writing. Don't ship one static mega-prompt for everything.

## Anti-patterns
- Context overflow (stuffing everything in)
- Static prompts (one-size-fits-all)
- No context budget
- Including irrelevant retrieved docs (noise)
- No summarization of history

## Key insight
The gap between a good and a great AI application is almost always **context engineering**  --  not model selection or prompt wording.
