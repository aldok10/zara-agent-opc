---
type: fact
title: "Context Engineering"
---
# Context Engineering

Deep technical reference for assembling, optimizing, and managing LLM context windows.

---

## What Context Engineering Is

Context engineering is the discipline of designing what information reaches the model at each turn. It supersedes "prompt engineering" because modern AI systems are not just prompts -- they are assembled contexts built from system instructions, user data, retrieved documents, tool results, memory, and conversation history.

The quality ceiling of any LLM application is determined by what's in the context window, not how cleverly you phrase the prompt.

---

## Context Budget Management

A typical context window must be divided across competing concerns:

| Component | Budget Guidance | Priority |
|-----------|-----------------|----------|
| System prompt | 500-2000 tokens | Fixed, always present |
| User profile/preferences | 200-500 tokens | High, loaded per session |
| Retrieved documents | 2000-8000 tokens | Variable per query |
| Tool definitions | 500-2000 tokens | Fixed per agent capability set |
| Conversation history | 2000-6000 tokens | Rolling, summarize older turns |
| Tool results | 500-3000 tokens | Per turn, summarize if large |
| Working memory | 200-1000 tokens | Persistent scratchpad |

Total budget depends on model (4K to 200K+). But attention quality degrades with length -- use less context more precisely rather than filling the window.

---

## Structured Prompting Patterns

### XML Tags (Anthropic style)

```xml
<system>
You are a code reviewer. Focus on security and correctness.
</system>

<context>
<file path="src/auth.ts">
// file contents here
</file>
<requirements>
Must use parameterized queries. No string interpolation in SQL.
</requirements>
</context>

<task>
Review the auth module for SQL injection vulnerabilities.
</task>
```

### Markdown Sections

```markdown
# Role
Senior backend engineer specializing in distributed systems.

# Context
- Service: payment-processor
- Language: Go 1.22
- Current issue: race condition in batch settlement

# Task
Identify the race condition and propose a fix using sync primitives.
```

### JSON-structured Context

Best for programmatic assembly where sections are dynamically included/excluded:

```json
{
  "role": "data analyst",
  "data_schema": { "tables": ["orders", "users"], "relations": [...] },
  "query": "Monthly revenue trend for Q4",
  "constraints": ["Use only SQL, no pandas", "Include NULL handling"]
}
```

---

## Dynamic Context Assembly

Not all context should be present on every turn. Build a context pipeline that decides what to include:

```python
def assemble_context(turn: Turn, agent: Agent) -> list[Message]:
    messages = []

    # Always present
    messages.append(system_message(agent.system_prompt))

    # Conditionally loaded based on turn content
    if needs_user_profile(turn):
        messages.append(system_message(load_user_profile(turn.user_id)))

    # Retrieved context (only if retrieval-worthy query)
    if should_retrieve(turn.query):
        docs = retrieve(turn.query, top_k=5)
        messages.append(system_message(format_docs(docs)))

    # Memory injection (semantic recall)
    relevant_memories = recall(turn.query, k=3)
    if relevant_memories:
        messages.append(system_message(format_memories(relevant_memories)))

    # Conversation history (summarized if long)
    history = get_history(turn.session_id)
    if token_count(history) > 4000:
        history = summarize_history(history)
    messages.extend(history)

    # Current turn
    messages.append(user_message(turn.query))

    return messages
```

---

## Memory Injection Strategies

### Semantic Recall

Query a vector store with the current context to find relevant past knowledge. Inject as system context before the user message.

### Episodic Recall

Find similar past interactions (by situation/outcome). Inject as "here's what worked before" context.

### Priority-based Selection

When too many memories match, rank by:
1. Recency (exponential decay)
2. Relevance (cosine similarity)
3. Importance (user-assigned or frequency-based)
4. Type priority (policy > architecture > preference > fact)

```python
def select_memories(candidates, budget_tokens=500):
    scored = []
    for mem in candidates:
        score = (
            mem.relevance * 0.4 +
            recency_score(mem.timestamp) * 0.2 +
            mem.importance * 0.3 +
            type_priority(mem.type) * 0.1
        )
        scored.append((score, mem))

    scored.sort(reverse=True)
    selected, used = [], 0
    for score, mem in scored:
        tokens = token_count(mem.content)
        if used + tokens > budget_tokens:
            break
        selected.append(mem)
        used += tokens
    return selected
```

---

## Tool Result Summarization

Raw tool outputs can be massive (full file contents, API responses, database results). Never dump raw -- extract what matters.

```python
def summarize_tool_result(tool_name: str, raw_result: str, query_context: str) -> str:
    if token_count(raw_result) < 500:
        return raw_result

    summary = llm.generate(
        f"Summarize this {tool_name} result in the context of: {query_context}\n"
        f"Keep only information relevant to the task. Be concise.\n\n"
        f"Raw result:\n{raw_result[:8000]}"
    )
    return summary
```

Alternatively, use structured extraction: if you know what fields matter, parse and select rather than summarizing.

---

## Progressive Disclosure for Agents

Load agent capabilities in tiers to conserve context budget:

**Level 1 (always loaded)**: Core identity, primary tools, key constraints. ~500 tokens.

**Level 2 (loaded on demand)**: Specialized tools, detailed procedures, domain knowledge. Triggered by task classification.

**Level 3 (loaded per-step)**: Full documentation, code examples, reference data. Loaded only when actively needed for current step.

```python
SKILL_TIERS = {
    "level_1": ["core_identity.md", "primary_tools.json"],
    "level_2": {
        "code_review": ["review_checklist.md", "security_patterns.md"],
        "debugging": ["debug_workflow.md", "common_errors.md"],
        "architecture": ["design_patterns.md", "system_constraints.md"],
    },
    "level_3": {
        "code_review": ["full_style_guide.md", "framework_docs.md"],
    }
}

def load_skill_context(task_type: str, depth_needed: int):
    context = load_files(SKILL_TIERS["level_1"])
    if depth_needed >= 2 and task_type in SKILL_TIERS["level_2"]:
        context += load_files(SKILL_TIERS["level_2"][task_type])
    if depth_needed >= 3 and task_type in SKILL_TIERS["level_3"]:
        context += load_files(SKILL_TIERS["level_3"][task_type])
    return context
```

---

## Context Pipeline Example

End-to-end pipeline for a production agent:

```python
class ContextPipeline:
    def __init__(self, config):
        self.max_tokens = config.max_context_tokens
        self.retriever = config.retriever
        self.memory = config.memory_store
        self.summarizer = config.summarizer

    def build(self, turn, agent, history):
        budget = TokenBudget(self.max_tokens)

        # Reserve space for response
        budget.reserve(agent.max_response_tokens)

        # Fixed components
        system = budget.allocate("system", agent.system_prompt, priority=10)
        tools = budget.allocate("tools", agent.tool_definitions, priority=9)

        # Dynamic components compete for remaining budget
        memories = self.memory.recall(turn.query, k=5)
        budget.allocate("memory", format_memories(memories), priority=7)

        if self.should_retrieve(turn):
            docs = self.retriever.search(turn.query, top_k=10)
            reranked = self.reranker.rerank(turn.query, docs, top_n=5)
            budget.allocate("retrieval", format_docs(reranked), priority=8)

        # History gets whatever remains
        compressed_history = self.fit_history(history, budget.remaining())
        budget.allocate("history", compressed_history, priority=6)

        return budget.render()

    def fit_history(self, history, available_tokens):
        if token_count(history) <= available_tokens:
            return history
        # Keep recent turns verbatim, summarize older ones
        recent = history[-4:]
        older = history[:-4]
        summary = self.summarizer.summarize(older)
        return [{"role": "system", "content": f"Previous context: {summary}"}] + recent
```

---

## Anti-patterns

- Stuffing everything into the system prompt regardless of relevance
- Repeating instructions across multiple context sections
- Including full tool results when only a few fields matter
- Loading all available memory without relevance filtering
- Not reserving budget for the model's response
- Treating context window size as "bigger is better" -- attention quality drops with length
