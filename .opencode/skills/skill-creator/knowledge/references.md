---
type: fact
title: "Skill Creator References"
---
# Skill Creator References

Curated references for building AI agent skills, AI-friendly documentation, skill design patterns, quality/evaluation, and public skill registries.

## Agent Skills Specification

1. **agentskills.io** -- https://agentskills.io -- Open specification for portable AI agent skills. Schema definition, packaging, and interoperability standards.
2. **skills.sh** -- https://skills.sh -- Public skill directory and registry. Browseable catalog with quality scores and usage stats.
3. **OpenClaw / ClawHub** -- https://clawhub.dev -- Skill marketplace with security auditing, versioning, and community reviews.
4. **Anthropic Skills** -- https://github.com/anthropics/skills -- Official Anthropic skill examples and best practices for Claude-based agents.
5. **OpenAI Codex Skills** -- OpenAI documentation on building reusable Codex agent skills and tool definitions.
6. **obra/superpowers** -- https://github.com/obra/superpowers -- Methodology for building composable AI superpowers. Layered skill architecture.
7. **Cursor Rules** -- Community patterns for .cursorrules files. Precursor to structured skill definitions.
8. **CLAUDE.md Conventions** -- Anthropic recommended patterns for project-level AI instructions.
9. **Cline Custom Instructions** -- https://github.com/cline/cline -- Custom instruction patterns for autonomous coding agents.
10. **Windsurf Rules** -- Codium/Windsurf rule system for context-aware AI behavior.
11. **Skill Packaging Spec (agentskills.io v0.2)** -- Manifest format, dependency declaration, and capability negotiation.
12. **Agent Protocol** -- https://agentprotocol.ai -- Standardized API for agent communication and task management.
13. **MCP Tool Specification** -- Anthropic. Model Context Protocol for tool definitions and resource access.
14. **OpenAI Function Calling Spec** -- Structured output and tool use patterns applicable to skill interfaces.
15. **LangChain Tool Abstractions** -- https://docs.langchain.com -- Patterns for wrapping capabilities as composable tools.

## AI-Friendly Documentation

16. **llms.txt Specification** -- https://llmstxt.org -- Standard for making websites AI-readable. Markdown-first, structured for LLM consumption.
17. **AGENTS.md Format** -- Convention for project-level agent instructions. Task routing, constraints, and workflow definitions.
18. **CLAUDE.md Patterns** -- Best practices for Claude project files. Progressive disclosure, context budgets, and priority ordering.
19. **Markdown for Machines** -- Research on optimizing markdown structure for LLM comprehension. Heading hierarchy, link density, and token efficiency.
20. **Progressive Disclosure in Documentation** -- UX research applied to AI context loading. Surface-level first, depth on demand.
21. **Context7 Documentation Format** -- https://context7.com -- Queryable documentation system optimized for AI consumption.
22. **Mintlify Docs-as-Code** -- https://mintlify.com -- Documentation framework with AI-native search and structured content.
23. **Diataxis for AI** -- Adapting the four-quadrant documentation framework for LLM readers.
24. **README Driven Development** -- Tom Preston-Werner (2010). Document-first approach that maps well to AI instruction files.
25. **docs.page AI Optimization** -- Patterns for making documentation queryable by AI coding assistants.

## Skill Design Patterns

26. **Instructional Design for AI Agents** -- Applying Bloom's Taxonomy and Gagne's Nine Events to skill prompts.
27. **Knowledge Engineering Principles** -- Structured knowledge representation for AI consumption. Ontologies, taxonomies, and frames.
28. **Context Engineering** -- Tobi Lutke (2025). Providing AI with optimal context. Compression, relevance, and timing.
29. **Loop Engineering** -- Iterative task execution patterns: Gather > Act > Verify > Repeat. Never one-shot complex work.
30. **Harness Engineering** -- Structured workflows that constrain AI behavior while preserving flexibility.
31. **Prompt Chaining Patterns** -- Sequential prompt composition for multi-step reasoning tasks.
32. **Few-Shot Skill Templates** -- Using examples within skills to demonstrate expected behavior and output format.
33. **Constraint-Based Skill Design** -- Defining boundaries (what NOT to do) as primary skill content.
34. **Adaptive Skill Routing** -- Dispatching to specialized skills based on task classification.
35. **Skill Composition Patterns** -- Combining atomic skills into complex workflows. Inheritance, mixins, and layering.
36. **ReAct Pattern** -- Yao et al. (2022). Reasoning + Acting interleaved for tool-using agents.
37. **Chain-of-Thought in Skills** -- Embedding reasoning scaffolds within skill instructions.
38. **Skill Versioning Strategies** -- Semantic versioning applied to prompt-based skills. Breaking vs non-breaking changes.
39. **Token Budget Management** -- Designing skills that fit within context constraints. Compression techniques.
40. **Error Recovery in Skills** -- Graceful degradation patterns when tools fail or context is insufficient.

## Quality & Evaluation

41. **Skill Effectiveness Measurement** -- Metrics: task completion rate, token efficiency, user satisfaction, error rate.
42. **Agent Behavioral Evaluation** -- Testing agent behavior against expected outcomes. Golden datasets and scenario suites.
43. **A/B Testing Skills** -- Comparing skill variants with controlled experiments. Statistical significance for prompt changes.
44. **Regression Testing for Prompts** -- Detecting behavioral drift when skills are updated. Pin expected behaviors.
45. **LLM-as-Judge Evaluation** -- Using a separate model to evaluate output quality. Rubric design and calibration.
46. **Human-in-the-Loop Evaluation** -- Combining automated metrics with human judgment for skill quality.
47. **Prompt Sensitivity Analysis** -- Measuring how small prompt changes affect output distribution.
48. **Task Decomposition Scoring** -- Evaluating whether skills break complex tasks into appropriate sub-problems.
49. **Context Utilization Metrics** -- Measuring how effectively skills use available context vs generating from priors.
50. **Evals Framework (OpenAI)** -- https://github.com/openai/evals -- Open-source evaluation framework applicable to skill testing.
51. **LMSYS Chatbot Arena** -- https://chat.lmsys.org -- Comparative evaluation methodology transferable to skill comparison.
52. **promptfoo** -- https://github.com/promptfoo/promptfoo -- Open-source tool for testing and evaluating LLM outputs.
53. **DeepEval** -- https://github.com/confident-ai/deepeval -- Testing framework for LLM applications with built-in metrics.

## Public Skill Registries

54. **skills.sh Leaderboard** -- https://skills.sh/leaderboard -- Ranked skills by usage, quality score, and community rating.
55. **ClawHub Security Audits** -- Security review process for marketplace skills. Sandboxing, permission scoping, and supply chain checks.
56. **Anthropic Official Skills Catalog** -- Curated first-party skills from Anthropic for common development tasks.
57. **Matt Pocock TypeScript Skills** -- https://github.com/mattpocock -- Community patterns for TypeScript-focused AI skills.
58. **obra/superpowers Registry** -- Community-contributed superpowers with usage guides and composition patterns.
59. **Vercel Labs AI Patterns** -- https://github.com/vercel-labs -- AI SDK skills and patterns from Vercel's AI team.
60. **Awesome AI Agents** -- https://github.com/e2b-dev/awesome-ai-agents -- Curated list of AI agent projects and their skill systems.
61. **LangChain Hub** -- https://smith.langchain.com/hub -- Shared prompts and chains as reusable skill components.
62. **CrewAI Tools** -- https://github.com/crewAIInc/crewAI-tools -- Pre-built tools and skills for multi-agent systems.
63. **Semantic Kernel Skills** -- https://github.com/microsoft/semantic-kernel -- Microsoft's plugin/skill architecture for AI orchestration.
64. **AutoGPT Plugins** -- https://github.com/Significant-Gravitas/AutoGPT -- Plugin system patterns for autonomous agents.
65. **Skill Portability Standards** -- Cross-platform skill format discussions. Mapping between Anthropic, OpenAI, and open-source formats.
66. **Community Skill Reviews** -- Peer review processes for public skill contributions. Quality gates and acceptance criteria.
67. **Skill Dependency Management** -- Handling skill dependencies, version conflicts, and compatibility matrices.
68. **Skill Discovery and Search** -- How registries index and surface relevant skills. Tagging, categorization, and semantic search.
