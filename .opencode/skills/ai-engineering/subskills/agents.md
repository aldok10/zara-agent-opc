# AI Agent Architecture

## Definition
**Agent = LLM + Tools + Memory + Control Loop.** The LLM reasons, tools act, memory persists, the loop iterates until an exit condition.

## Core patterns (2026 canon)
- **ReAct**: Think -> Act -> Observe -> loop. Simple, debuggable. Best for single-step tool use.
- **Plan-and-Execute**: plan all steps first, then execute sequentially. Better for multi-step workflows; brittle if the initial plan is wrong.
- **Reflexion**: execute -> evaluate -> reflect -> retry. Self-correcting. Strong for code generation.
- **Tool Use with Verification**: call tool -> verify result -> proceed or retry. Safest for side effects.

## Multi-agent patterns
- **Supervisor-Worker**: one orchestrator delegates to specialists. Clear control, single reasoning point.
- **Role-based**: fixed roles (researcher, coder, reviewer) collaborate. Good for complex workflows.
- **Debate / Verifier-Critic**: two agents argue, one verifies. Improves accuracy; costs 2x+ tokens.
- **Swarm**: many agents, minimal coordination. Good for embarrassingly parallel tasks.

## Tool design
Tools MUST be:
- **Idempotent**  --  agents retry, so repeated calls must be safe
- **Clearly described**  --  the description is what the LLM reads to decide when/how to call
- **Structured output**  --  return JSON, not prose
- **Fail gracefully**  --  informative errors the model can act on

## Memory layers
- **Short-term**: context window, last N messages
- **Long-term**: vector DB, semantic search over past interactions
- **Entity**: knowledge graph, structured facts about entities

## Exit conditions (MANDATORY  --  all three)
- `max_iterations`  --  prevent infinite loops
- `cost_ceiling`  --  prevent runaway spend
- `timeout`  --  wall-clock limit

## Guardrails
- Input validation (reject prompt injection)
- Output validation (format + content policy)
- Tool-call validation (whitelist allowed actions)
- **Human-in-the-loop for irreversible actions**

## Frameworks
- **LangGraph**: graph-based orchestration
- **CrewAI**: role-based
- **AutoGen**: multi-agent conversation
- **Custom**: often better in production  --  less abstraction overhead, full control of loop

## Anti-patterns
- No exit conditions / unbounded tool calling
- No memory management (context overflow)
- Monolithic agent doing everything
- No observability (can't debug failures)
