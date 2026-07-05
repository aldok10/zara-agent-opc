---
type: fact
title: "Engineering Workflow References"
---
# Engineering Workflow References

Curated references for subskills: brainstorming, execution, parallel-dispatch, planning, subagent-patterns.

---

## Software Development Methodologies

1. Beck et al. "Manifesto for Agile Software Development" (2001) -- 4 values and 12 principles. https://agilemanifesto.org/
2. Schwaber, K. & Sutherland, J. "The Scrum Guide" (2020) -- official Scrum framework definition. https://scrumguides.org/
3. Anderson, D. "Kanban: Successful Evolutionary Change for Your Technology Business" (Blue Hole Press, 2010) -- WIP limits, flow optimization.
4. Fried, J. & Singer, R. "Shape Up: Stop Running in Circles" (Basecamp, 2019) -- appetites, hill charts, cool-down. https://basecamp.com/shapeup
5. Forsgren et al. "Accelerate" (IT Revolution, 2018) -- DORA metrics: lead time, deploy frequency, MTTR, change failure rate.
6. Humble, J. & Farley, D. "Continuous Delivery" (Addison-Wesley, 2010) -- deployment pipelines, blue-green, canary releases.
7. Poppendieck, M. & T. "Lean Software Development" (Addison-Wesley, 2003) -- eliminate waste, defer commitment.
8. Reinertsen, D. "The Principles of Product Development Flow" (Celeritas, 2009) -- queuing theory applied to product development, batch size economics.
9. Kim et al. "The DevOps Handbook" (IT Revolution, 2nd ed. 2021) -- three ways: flow, feedback, continual learning.
10. Kim et al. "The Phoenix Project" (IT Revolution, 2013) -- DevOps principles illustrated through narrative.
11. DORA State of DevOps Reports (annual) -- data-driven insights on engineering performance. https://dora.dev/research/
12. Skelton, M. & Pais, M. "Team Topologies" (IT Revolution, 2019) -- stream-aligned, platform, enabling, and complicated-subsystem teams.
13. Goldratt, E. "The Goal" (North River Press, 1984) -- theory of constraints applied to manufacturing and software.
14. Deming, W.E. "Out of the Crisis" (MIT Press, 1986) -- systems thinking, PDCA cycle, continuous improvement foundations.
15. Fowler, M. "Continuous Integration" (2006) -- CI practices and principles. https://martinfowler.com/articles/continuousIntegration.html
16. DeGrandis, D. "Making Work Visible" (IT Revolution, 2017) -- time thieves, dependency visualization.
17. Kersten, M. "Project to Product" (IT Revolution, 2018) -- flow metrics, value streams for software.
18. SPACE Framework (GitHub/Microsoft, 2021) -- Satisfaction, Performance, Activity, Communication, Efficiency metrics. https://queue.acm.org/detail.cfm?id=3454124
19. Brooks, F. "The Mythical Man-Month" (Addison-Wesley, 1975) -- communication overhead, surgical team, conceptual integrity.
20. Weinberg, G. "The Psychology of Computer Programming" (Dorset House, 1971) -- egoless programming, team dynamics.

## Planning & Estimation

21. Patton, J. "User Story Mapping" (O'Reilly, 2014) -- backbone, walking skeleton, release slicing.
22. Brandolini, A. "Event Storming" -- collaborative domain discovery technique. https://www.eventstorming.com/
23. Vacanti, D. "Actionable Agile Metrics for Predictability" (2015) -- Monte Carlo forecasting, cycle time analysis.
24. Zuill, W. "#NoEstimates" (2019) -- forecasting without story points, using throughput data.
25. Nygard, M. "Documenting Architecture Decisions" -- ADR format and practice. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
26. Thoughtworks Technology Radar -- quadrant-based technology assessment framework. https://www.thoughtworks.com/radar
27. RFC Process (IETF-style for engineering teams) -- lightweight decision documents for cross-team alignment.
28. Cohn, M. "Agile Estimating and Planning" (Prentice Hall, 2005) -- relative sizing, velocity-based planning.
29. Weinberg, G. "Quality Software Management Vol.2: First-Order Measurement" -- measurement systems and their effects.
30. Hubbard, D. "How to Measure Anything" (Wiley, 2014) -- calibrated estimation, value of information analysis.
31. Liker, J. "The Toyota Way" (McGraw-Hill, 2004) -- A3 thinking, set-based design, last responsible moment.
32. C4 Model (Brown, S.) -- context, containers, components, code diagrams. https://c4model.com/
33. Wardley Mapping -- strategy visualization through value chain evolution. https://learnwardleymapping.com/
34. Impact Mapping (Adzic, G.) -- goal-oriented planning connecting deliverables to outcomes. https://www.impactmapping.org/
35. North, D. "Introducing BDD" -- behavior-driven development connecting specs to stories. https://dannorth.net/introducing-bdd/

## Execution & Delivery

36. Fowler, M. "Feature Toggles (Feature Flags)" -- release, experiment, ops, permission toggles. https://martinfowler.com/articles/feature-toggles.html
37. Hodgson, P. "Feature Branching vs Trunk-Based Development" -- trade-offs and CI alignment. https://trunkbaseddevelopment.com/
38. Hammant, P. "Trunk Based Development" -- short-lived branches, feature flags, CI emphasis. https://trunkbaseddevelopment.com/
39. Fowler, M. "Code Review" -- practices for effective review. https://martinfowler.com/articles/branching-patterns.html
40. Google Engineering Practices -- code review guide. https://google.github.io/eng-practices/review/
41. Williams, L. & Kessler, R. "Pair Programming Illuminated" (Addison-Wesley, 2002) -- driver/navigator, when to pair.
42. Zuill, W. & Meadows, K. "Software Teaming" (2022) -- mob/ensemble programming practices.
43. Hodgson, P. "Branch by Abstraction" -- safe large-scale refactoring without feature branches.
44. GitHub Flow -- simplified branching model for continuous deployment. https://docs.github.com/en/get-started/using-github/github-flow
45. Martin, R. "Clean Code" (Prentice Hall, 2008) -- readability, small functions, meaningful names (use pragmatically).
46. Ousterhout, J. "A Philosophy of Software Design" (2018) -- deep vs shallow modules, information hiding, complexity management.
47. Bernhardt, G. "Boundaries" (2012) -- functional core, imperative shell separation. https://www.destroyallsoftware.com/talks/boundaries
48. Fowler, M. "Refactoring" (Addison-Wesley, 2nd ed. 2018) -- catalog of safe code transformations.
49. LaunchDarkly Documentation -- feature management platform patterns. https://docs.launchdarkly.com/
50. Canary Release patterns -- progressive rollout with automated rollback triggers.

## AI-Assisted Development

51. Anthropic "Building Effective Agents" (2024) -- agentic patterns: augmented LLM, prompt chaining, routing, orchestrator-workers, evaluator-optimizer. https://www.anthropic.com/research/building-effective-agents
52. OpenAI "Practices for Governing Agentic AI Systems" (2023) -- safety, oversight, and delegation principles.
53. Harrison Chase "Plan-and-Execute Agents" (LangChain blog) -- plan step, execute step, replan loop.
54. Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al. 2023) -- self-reflection for task completion.
55. Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models" (ICLR 2023) -- interleaving thought and action.
56. Significant-Gravitas "Auto-GPT" -- early autonomous agent architecture patterns. https://github.com/Significant-Gravitas/AutoGPT
57. Cognition Labs "Devin" architecture discussions -- SWE-agent task decomposition patterns.
58. SWE-bench (Princeton) -- benchmarks for AI coding agents. https://www.swebench.com/
59. Weng, L. "LLM Powered Autonomous Agents" (2023) -- planning, memory, tool use survey. https://lilianweng.github.io/posts/2023-06-23-agent/
60. Context Engineering principles -- managing context windows, retrieval-augmented generation for code.
61. Schick et al. "Toolformer" (2023) -- teaching LLMs to use tools autonomously.
62. Khattab et al. "DSPy" -- programming framework for LM pipelines with optimization. https://github.com/stanfordnlp/dspy
63. Loop Engineering patterns -- gather-act-verify-repeat, budget management, exit conditions.
64. Multi-agent orchestration -- dispatcher, specialist workers, aggregator patterns (crew.ai, autogen).
65. CrewAI Documentation -- role-based multi-agent collaboration. https://docs.crewai.com/
66. Microsoft AutoGen -- multi-agent conversation framework. https://microsoft.github.io/autogen/
67. Verification patterns for AI output -- self-consistency, tool-grounding, human-in-the-loop checkpoints.
68. Prompt Engineering Guide (DAIR.AI) -- techniques for effective prompting. https://www.promptingguide.ai/
69. Cursor / Cody / Copilot architecture patterns -- IDE-integrated AI assistance design.
70. Aider architecture -- terminal-based AI pair programming patterns. https://aider.chat/docs/

## Team Productivity

71. Newport, C. "Deep Work" (Grand Central, 2016) -- rules for focused work in a distracted world.
72. Graham, P. "Maker's Schedule, Manager's Schedule" (2009) -- protecting uninterrupted blocks. http://paulgraham.com/makersschedule.html
73. Cunningham, W. "Technical Debt" metaphor -- deliberate vs inadvertent, reckless vs prudent quadrant.
74. Tornhill, A. "Software Design X-Rays" (Pragmatic, 2018) -- identifying hotspots, code health from VCS data.
75. Forsgren, N. "Developer Experience: What It Means and Why It Matters" (DX Framework) -- feedback loops, cognitive load, flow state.
76. Spolsky, J. "The Joel Test" (2000) -- 12 questions for engineering team health.
77. Google "Project Aristotle" -- psychological safety as top predictor of team effectiveness.
78. Westrum organizational culture model -- pathological, bureaucratic, generative cultures and their impact on delivery.
79. Noda et al. "DevEx: What Actually Drives Productivity" (ACM Queue 2023) -- flow state, feedback loops, cognitive load as three dimensions.
80. Tufte, E. "The Visual Display of Quantitative Information" (Graphics Press, 1983) -- dashboards and information density for team metrics.
81. McConnell, S. "Software Estimation: Demystifying the Black Art" (Microsoft Press, 2006) -- cone of uncertainty, estimation techniques.
82. Fowler, M. "Technical Debt Quadrant" -- distinguishing types of debt. https://martinfowler.com/bliki/TechnicalDebtQuadrant.html
83. Gregg, B. "Flame Graphs" -- visualization technique for performance profiling applicable to workflow bottlenecks. https://www.brendangregg.com/flamegraphs.html
84. Tuckman's stages -- forming, storming, norming, performing for team development.
85. Larson, W. "An Elegant Puzzle: Systems of Engineering Management" (Stripe Press, 2019) -- sizing teams, system migrations, managing technical quality.
