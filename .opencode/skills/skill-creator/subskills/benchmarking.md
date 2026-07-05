# Benchmarking Skills Against Public Registries

Before finalizing a skill, compare it against established public skill sources. This ensures completeness, identifies blind spots, and incorporates proven patterns.

## Public Skill Registries

| Registry | URL | Focus |
|----------|-----|-------|
| skills.sh | skills.sh | Community-curated agent skills, composable format |
| ClawHub (OpenClaw) | openclaw.com | Marketplace of reusable agent skills with ratings |
| agentskills.io | agentskills.io | Catalog of domain-specific agent capabilities |
| Anthropic Skills | github.com/anthropics/skills | Official reference implementations |
| obra/superpowers | github.com/obra/superpowers | Opinionated skill collections for coding agents |
| mattpocock/skills | github.com/mattpocock/skills | TypeScript-focused agent skill patterns |

## Evaluation Criteria

When comparing your skill against registry equivalents, check:

1. **Structure completeness** -- Does your skill cover the same sections? Missing a routing table, verification, or scope when the registry version has one = gap.
2. **Depth** -- Does your skill go deeper on domain specifics? Registry skills are often generic. Yours should add project-specific patterns and constraints.
3. **Trigger phrases** -- Does the registry skill activate on phrases yours misses? Add missing triggers to your description or routing table.
4. **Knowledge coverage** -- Compare knowledge files. If the registry skill references standards, specs, or tools your version ignores, add them.
5. **Format awareness** -- Does the registry use patterns (progressive disclosure, token budgets) that yours lacks?

## Benchmark Checklist

Run this before marking a skill final:

- [ ] Searched 3+ registries for equivalent or overlapping skills
- [ ] Listed features/sections present in registry skills but absent in yours
- [ ] Evaluated whether missing features are intentional omissions or gaps
- [ ] Incorporated relevant patterns from registry skills (with adaptation, not copy)
- [ ] Verified your skill adds depth beyond what registry versions offer
- [ ] Documented the benchmark comparison in commit message or notes

## Alternative Format Awareness

Agent-friendly documentation exists in multiple formats beyond SKILL.md:

| Format | Pattern | Strengths |
|--------|---------|-----------|
| llms.txt | Root-level file, plain text, structured for LLM consumption | Discoverability, simplicity |
| AGENTS.md | Repo-level agent instructions, conventions, tool use | Project context, team norms |
| CLAUDE.md | Claude-specific project instructions | Model-specific optimization |
| .cursorrules | Editor-specific coding instructions | IDE integration |
| .github/copilot-instructions.md | Copilot-specific project context | GitHub integration |

When benchmarking:
- Check if the domain has an established llms.txt you can reference as knowledge
- Check if repos in the domain use AGENTS.md patterns worth importing
- Understand what makes docs AI-friendly: structured headers, imperative voice, explicit constraints, examples over explanations, token-conscious length

## When to Benchmark

- Always before creating a new skill (discovery phase)
- When extending an existing skill with new subskills
- When an audit reveals coverage gaps
- When a skill gets repeated PARTIAL outcomes in episode reflections

## Benchmark Process (Step-by-Step)

1. Extract the domain keyword from your skill name (e.g., "typescript-expert" -> "typescript agent skill")
2. Search each registry for that keyword or close synonyms
3. For each match found, note: structure format, section count, depth level, unique constraints
4. Create a comparison table: your skill vs registry skill (sections, features, constraints)
5. Identify gaps: what the registry has that you lack
6. Decide per gap: adopt (add to your skill) or omit (document why)
7. Identify advantages: what you have that the registry lacks (project-specific value)
8. Record the comparison output (see Output section below)

## Scoring a Benchmark

Rate your skill against each registry match on these dimensions (1-5 scale):

| Dimension | 1 (Poor) | 5 (Excellent) |
|-----------|----------|---------------|
| Coverage | Misses major subtopics | Covers all key areas |
| Depth | Surface-level, generic advice | Specific patterns, constraints, anti-patterns |
| Structure | Flat, hard to find content | Progressive disclosure, clear routing |
| Actionability | Vague principles | Concrete steps, testable assertions |
| Freshness | Outdated versions/patterns | Current best practices, recent tooling |

Target: score 4+ on all dimensions for your skill's primary domain.

## Output

After benchmarking, record:

```
## Benchmark Results for {skill-name}
Sources checked: [list registries searched]
Matches found: [count and names]
Gaps identified: [features to add]
Patterns adopted: [what was incorporated, from where]
Intentional omissions: [what was skipped and why]
Score: Coverage X/5, Depth X/5, Structure X/5, Actionability X/5, Freshness X/5
```
