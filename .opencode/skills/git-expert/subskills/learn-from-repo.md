# Learn From Repo (GitReverse)

Convert a GitHub codebase into a natural-language "project essence" via GitReverse, analyze it, extract patterns worth adopting for Zara.

Triggers: `/learn from <owner/repo>`, user asks to learn from a GitHub project for improvement patterns.

## Scope

- HANDLES: fetching project essence, pattern extraction, adoption recommendations, storing learnings.
- DEFERS: verification of stored knowledge to user (all starts `external_unverified`).

## First Action

POST the repo to GitReverse, extract the `prompt` field (the AI-readable essence):

```bash
curl 'https://www.gitreverse.com/api/reverse-prompt' --compressed -X POST \
  -H 'Content-Type: application/json' --data-raw '{"repoUrl":"owner/repo"}'
```

## Constraints

1. Extract from the essence: language/stack, core primitive, state model, coordination style, key features (3-5).
2. For each pattern found: does Zara do this? Would it help? Effort to adopt?
3. Every recommendation includes: What, Why it matters, Effort (low/med/high), Impact (low/med/high), Priority.
4. All external knowledge starts as `external_unverified` - user confirms to upgrade.

## DO NOT

- Present adoption patterns as verified fact.
- Skip the map-to-Zara step (don't recommend what Zara already does).
- Store without effort/impact assessment.

## Workflow

1. Parse essence - extract stack, primitive, state model, coordination, key features.
2. Map to Zara - for each pattern, check existing memory/code, assess impact + effort.
3. Generate recommendations - What/Why/Effort/Impact/Priority.
4. Store learnings:
   - `memory_learn(key: "external_project:<repo>:essence", value, source: "external_unverified", type: "fact", scope: "external_project:<repo>")`
   - `memory_learn(key: "external_project:<repo>:adoption:<pattern>", value: "<what+why+effort>", source: "inferred", type: "architecture")`
   - `memory_episode(event: "learned from <repo>", outcome: "analyzed N patterns", tags: ["gitreverse"])`
   - `reflect(task: "learn from <repo>", pattern: "gitreverse-external-analysis", outcome: "success")`

## Focus Lenses (when user specifies)

| Focus | Look for |
|-------|----------|
| state-management | Checkpointing, memory pools, vector stores |
| agent-memory | History, semantic recall, RAG, working memory |
| multi-agent-coordination | Swarm, task routing, agent comms |
| safety | Permissions, sandboxing, HITL, guardrails |
| plugin-system | MCP, hooks, extensibility, skill arch |
| ui/ux | Terminal, desktop, web, visualization |
| testing | Test patterns, coverage, CI |
| error-handling | Recovery, fallbacks, observability |

Custom focus (`focus on <x>`): adapt analysis to prioritize that aspect.

## Output Format

```
## Learn: <project>
### Essence
<1-2 sentences>
### Top 3 for Zara
1. **[pattern]** - <what> | effort: <low/med/high>
### Zara's Edge
<1 thing Zara does better>
### Risk
<1 anti-pattern to avoid>
### Stored
project essence, N adoption patterns, episode logged
```

## Commands

`/learn from owner/repo` · `/learn from owner/repo focus on agent-memory` · `/learn list`

## Verification

- `prompt` field extracted successfully from API response.
- Each recommendation has effort + impact.
- `memory_learn` + `memory_episode` + `reflect` all called.
