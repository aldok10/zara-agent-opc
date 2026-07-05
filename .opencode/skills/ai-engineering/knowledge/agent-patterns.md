# Agent Patterns

Deep technical reference for LLM agent architectures, tool use, multi-agent systems, and safety.

---

## ReAct Loop (Reasoning + Acting)

The foundational agent pattern. Interleave thought traces with tool actions in a loop:

```
Thought: I need to find the user's order status. Let me query the database.
Action: query_orders(user_id="u_123", status="pending")
Observation: [{order_id: "o_456", items: 3, status: "shipped"}]
Thought: The order is shipped. I should provide tracking info.
Action: get_tracking(order_id="o_456")
Observation: {carrier: "FedEx", tracking: "7891234"}
Thought: I have all the info needed.
Answer: Your order o_456 has shipped via FedEx (tracking: 7891234).
```

Key properties: explicit reasoning visible in trace, grounded in observations, naturally handles multi-step tasks. Stop condition: model decides it has enough info to answer.

---

## Tool Use Patterns

### Function Calling (structured)

Define tools via JSON Schema. Model outputs structured calls, runtime executes them.

```python
tools = [{
    "type": "function",
    "function": {
        "name": "search_docs",
        "description": "Search documentation by semantic query",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "limit": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)
```

### Tool Design Principles

- Single responsibility per tool (search vs write vs delete)
- Clear descriptions that explain WHEN to use, not just WHAT it does
- Constrained parameters -- enums over free text where possible
- Return structured data the model can reason about
- Include error states in the schema so the model can recover

### Parallel Tool Calls

Models can emit multiple tool calls in one turn. Execute them concurrently when independent. Reduces latency for gathering multiple pieces of information.

---

## Planning Strategies

### Chain of Thought (CoT)

"Think step by step" -- linearize reasoning. Works for most single-path problems. Cheap (one generation pass).

### Tree of Thought (ToT)

Explore multiple reasoning paths, evaluate each, backtrack from dead ends. Use when problems have branching solutions (puzzles, code architecture decisions).

### Plan-and-Execute

Separate planning from execution:
1. Planner generates a task list
2. Executor handles each task (may be a different model/agent)
3. Replanner adjusts remaining tasks based on results

```python
def plan_and_execute(goal: str):
    plan = planner.generate(f"Break this into steps: {goal}")
    results = []

    for step in plan.steps:
        result = executor.run(step, context=results)
        results.append(result)

        if result.needs_replan:
            remaining = replanner.generate(
                goal=goal, completed=results, remaining=plan.steps
            )
            plan.steps = remaining

    return synthesize(results)
```

---

## Memory Architecture

### Short-term (Context Window)

Current conversation + recent tool results. Limited by context window. Use summarization to compress older turns.

### Long-term (Vector Store)

Persist important facts, decisions, user preferences. Retrieve relevant memories per turn via semantic search.

### Episodic Memory

Store complete interaction episodes with outcomes. Enables learning from past successes/failures. Structure: situation -> action -> result -> reflection.

```python
class EpisodicMemory:
    def store(self, episode):
        self.vector_store.upsert({
            "situation": episode.context,
            "action": episode.action_taken,
            "outcome": episode.result,
            "reflection": episode.what_learned,
            "embedding": embed(episode.summary)
        })

    def recall_similar(self, current_situation, k=3):
        return self.vector_store.search(
            embed(current_situation), top_k=k
        )
```

### Working Memory Pattern

Maintain a structured scratchpad that persists across turns:
- Current goal and sub-goals
- Key facts discovered
- Decisions made and reasoning
- Open questions

---

## Multi-Agent Patterns

### Supervisor

One orchestrator agent delegates to specialist workers. Supervisor decides routing, aggregates results, handles failures.

Best for: well-defined specialist roles, need for central control.

### Peer-to-Peer

Agents communicate directly, passing context and results to each other in a defined graph.

Best for: pipeline-style workflows where each stage transforms data.

### Hierarchical

Multiple layers of supervisors. Top-level breaks into sub-problems, mid-level coordinates execution, leaf agents do work.

Best for: complex multi-domain tasks requiring different expertise at each level.

```python
# LangGraph supervisor pattern
from langgraph.graph import StateGraph, END

def supervisor(state):
    decision = llm.invoke(
        f"Given the task: {state['task']}, which agent should handle this? "
        f"Options: researcher, coder, reviewer. Or 'done' if complete."
    )
    return {"next": decision.agent}

graph = StateGraph(AgentState)
graph.add_node("supervisor", supervisor)
graph.add_node("researcher", researcher_agent)
graph.add_node("coder", coder_agent)
graph.add_node("reviewer", reviewer_agent)

graph.add_conditional_edges("supervisor", route_to_agent)
graph.add_edge("researcher", "supervisor")
graph.add_edge("coder", "supervisor")
graph.add_edge("reviewer", "supervisor")
```

---

## Framework Comparison

| Framework | Strengths | Weaknesses | Best For |
|-----------|-----------|------------|----------|
| LangGraph | Stateful graphs, persistence, human-in-loop | Complexity, LangChain coupling | Production agents with cycles |
| AutoGen | Conversation-based, flexible roles | Verbose, debugging hard | Research, multi-agent chat |
| CrewAI | Simple API, role-based | Less control over flow | Quick prototypes, simple crews |
| OpenAI Swarm | Lightweight, handoff pattern | Experimental, limited features | Simple routing agents |
| Custom (raw) | Full control, minimal deps | Build everything yourself | When frameworks add overhead |

---

## Agent Evaluation

**Task completion rate**: Did the agent achieve the stated goal? Binary or graded.

**Tool use accuracy**: Did it call the right tools with correct parameters? Measure precision/recall of tool calls against gold standard.

**Efficiency**: Number of steps/tokens/tool calls to complete task. Compare against baseline.

**Robustness**: Performance under adversarial inputs, missing tools, ambiguous instructions.

```python
def evaluate_agent_run(trace, ground_truth):
    return {
        "completed": trace.final_answer == ground_truth.expected,
        "tool_precision": len(correct_calls) / len(trace.tool_calls),
        "tool_recall": len(correct_calls) / len(ground_truth.required_calls),
        "steps": len(trace.steps),
        "total_tokens": trace.token_count,
    }
```

---

## Safety and Sandboxing

### Permission Scoping

Define what each agent CAN and CANNOT do. Enforce at the tool execution layer, not the prompt layer.

```python
AGENT_PERMISSIONS = {
    "researcher": {"read_docs": True, "web_search": True, "write_file": False},
    "coder": {"read_file": True, "write_file": True, "execute": "sandbox_only"},
    "reviewer": {"read_file": True, "write_file": False, "approve": True},
}

def execute_tool(agent_id: str, tool_name: str, params: dict):
    if not AGENT_PERMISSIONS[agent_id].get(tool_name):
        return ToolError(f"Agent {agent_id} lacks permission for {tool_name}")
    return tools[tool_name](**params)
```

### Output Validation

Never trust agent output for safety-critical actions. Validate:
- Structured output matches expected schema
- No PII leakage in responses
- Actions are within defined scope
- File paths are within allowed directories

### Sandboxing Execution

Run code-generating agents in isolated environments (Docker containers, gVisor, Firecracker). Limit network access, filesystem scope, and execution time.

### Human-in-the-Loop

Insert approval gates before irreversible actions. The agent pauses, presents its plan, and waits for human confirmation. Use for: database writes, external API calls with side effects, financial transactions.
