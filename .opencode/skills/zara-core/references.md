# Zara Core References

Curated references for AI agent architecture, conversational AI, MCP and tool use, session management, and voice/personality design.

## AI Agent Architecture

1. **Multi-Agent Systems: A Modern Approach** -- Wooldridge (2009). Foundation text on agent communication, coordination, and organization.
2. **AutoGen: Enabling Next-Gen LLM Applications** -- Microsoft Research (2023). Multi-agent conversation framework with role specialization.
3. **CrewAI Architecture** -- https://github.com/crewAIInc/crewAI -- Role-based multi-agent orchestration with delegation patterns.
4. **Cognitive Architectures for Language Agents (CoALA)** -- Sumers et al. (2023). Framework mapping memory, action, and decision-making in LLM agents.
5. **ACT-R Cognitive Architecture** -- Anderson et al. Declarative + procedural memory model applicable to AI agent design.
6. **SOAR Cognitive Architecture** -- Laird (2012). Problem spaces, chunking, and learning applied to agent skill acquisition.
7. **Generative Agents: Interactive Simulacra** -- Park et al. (2023). Stanford research on persistent AI agents with memory and reflection.
8. **Voyager: LLM-Powered Embodied Agent** -- Wang et al. (2023). Self-improving agent with skill library and curriculum learning.
9. **MemGPT: Towards LLMs as Operating Systems** -- Packer et al. (2023). Virtual context management and tiered memory for agents.
10. **Reflexion: Language Agents with Verbal Reinforcement** -- Shinn et al. (2023). Self-reflection loops for agent improvement.
11. **LangGraph** -- https://github.com/langchain-ai/langgraph -- Stateful, multi-actor agent orchestration with cycles and persistence.
12. **The Landscape of Emerging AI Agent Architectures** -- AI Snake Oil blog (2024). Survey of production agent patterns.
13. **Building Effective Agents** -- Anthropic (2024). https://docs.anthropic.com/en/docs/build-with-claude/agentic -- Practical patterns for tool-using agents.
14. **Agent Memory Systems Survey** -- Comprehensive review of episodic, semantic, and procedural memory in AI agents. Zhang et al. (2024).
15. **Persistent AI Companions** -- Research on long-term agent relationships, memory consistency, and personality stability over time.

## Conversational AI

16. **Dialogue Management Patterns** -- Finite state, frame-based, and plan-based approaches to conversation control.
17. **Personality Consistency in LLM Agents** -- Research on maintaining coherent personality across sessions without drift.
18. **Emotional Intelligence in AI** -- Picard (2000) "Affective Computing" foundations applied to modern LLM interactions.
19. **Code-Switching in Multilingual AI** -- Patterns for natural language switching based on user preference and context.
20. **Conversational Repair Strategies** -- How agents recover from misunderstandings, ambiguity, and failed tool calls gracefully.
21. **Grounding in Communication** -- Clark & Brennan (1991). Theory of common ground applied to human-AI dialogue.
22. **Turn-Taking in Human-AI Interaction** -- Research on natural conversation flow, interruption handling, and pacing.
23. **Pragmatics for AI** -- Applying Grice's Maxims (quantity, quality, relation, manner) to agent responses.
24. **Contextual Adaptation** -- Adjusting formality, depth, and style based on user signals and task context.
25. **Rapport Building in AI Agents** -- Research on trust formation, consistency, and relational dynamics in long-term AI use.

## MCP & Tool Use

26. **Model Context Protocol Specification** -- Anthropic. https://modelcontextprotocol.io -- Full spec for resources, tools, prompts, and transport.
27. **MCP Server Implementation Guide** -- Building MCP servers with stdio and HTTP transports. Schema definition and capability negotiation.
28. **Tool Use Optimization** -- Patterns for minimizing tool calls while maximizing information gain. Parallel vs sequential strategies.
29. **JSON-RPC 2.0 Specification** -- https://www.jsonrpc.org/specification -- Foundation protocol underlying MCP communication.
30. **Memory System Design (Episodic)** -- Event-based memory with temporal ordering, significance scoring, and decay functions.
31. **Memory System Design (Semantic)** -- Knowledge graphs, entity relationships, and queryable fact stores for agents.
32. **Memory System Design (Procedural)** -- Skill storage, workflow recording, and learned procedure recall.
33. **Tool Selection Strategies** -- How agents choose between available tools. Cost modeling, capability matching, and fallback chains.
34. **Structured Output for Tool Calls** -- JSON schema enforcement, validation, and error handling in tool interfaces.
35. **MCP Resources and Templates** -- Resource URI patterns, template parameters, and dynamic resource generation.

## Session Management

36. **Context Window Optimization** -- Strategies for maximizing useful content within token limits. Priority ordering and compression.
37. **Compaction Strategies for LLM Agents** -- Summarization, key-fact extraction, and progressive context reduction techniques.
38. **State Persistence Patterns** -- File-based, database-backed, and hybrid approaches to maintaining agent state across sessions.
39. **Progressive Context Loading** -- Loading context on-demand based on task relevance rather than bulk preloading.
40. **Sliding Window Attention Patterns** -- Managing long conversations with rolling context and anchor points.
41. **Context Budgeting** -- Allocating token budget across system prompt, conversation history, tool results, and generation.
42. **Session Recovery After Compaction** -- Re-establishing working state from persistent files and git history after context loss.
43. **Conversation Summarization** -- Techniques for creating faithful conversation summaries that preserve decision context.
44. **Priority-Based Context Eviction** -- Algorithms for deciding what to keep vs discard when approaching context limits.
45. **Stateful Agent Architectures** -- Patterns for agents that maintain meaningful state between invocations (checkpoints, journals, progress files).

## Voice & Personality

46. **AI Writing Style Guides** -- Defining consistent voice attributes: tone, formality, humor, directness, and vocabulary constraints.
47. **Anti-Detection Patterns (Natural Voice)** -- Avoiding AI-typical language patterns. Banned word lists, sentence structure variation, and human-like imperfection.
48. **Cultural Adaptation in AI** -- Adjusting communication style for cultural context. Directness norms, formality expectations, and humor appropriateness.
49. **Empathetic Computing** -- Picard & Klein (2002). Detecting and responding to user emotional state without being performative.
50. **Voice Consistency Across Contexts** -- Maintaining personality while adapting to different task types (coding, planning, emotional support).
51. **The Elements of Style** -- Strunk & White. Foundational clarity principles applicable to AI voice design.
52. **On Writing Well** -- William Zinsser (2006). Simplicity, clarity, and warmth in nonfiction writing.
53. **Microcopy: The Complete Guide** -- Kinneret Yifrah (2017). Small-text patterns that build personality and trust.
54. **Conversational Design** -- Erika Hall (2018). Principles for natural, human-centered conversational interfaces.
55. **Brand Voice Development** -- Frameworks for defining and maintaining consistent voice attributes across interactions.
56. **Linguistic Mirroring** -- Research on matching user communication style (length, formality, vocabulary) for rapport.
57. **Personality Trait Modeling** -- Big Five personality framework applied to AI agent characterization and consistency.
58. **Writing Without Bullshit** -- Josh Bernoff (2016). Direct, reader-focused communication that respects attention.
59. **Banned Language Patterns** -- Maintaining lists of overused AI phrases and enforcing natural alternatives.
60. **Voice Drift Detection** -- Monitoring and correcting gradual personality changes over long conversations or multiple sessions.
