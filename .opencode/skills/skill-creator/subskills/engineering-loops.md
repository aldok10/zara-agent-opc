---
type: subskill
title: "Engineering Loops for Skill Creation"
---

# Engineering Loops for Skill Creation

Skill creation is NOT a one-shot task. Apply loop engineering, context engineering, and harness engineering to produce verified, high-quality skills.

## Loop Engineering: Gather > Draft > Verify > Refine

Every skill goes through this cycle (minimum one full iteration):

### 1. Gather
- Identify the domain, target expertise level, and use cases
- Search existing skills for overlap or patterns to reuse
- Benchmark against public registries (see `subskills/benchmarking.md`)
- Collect domain knowledge: standards, specs, common pitfalls
- Output: requirements doc (topic, scope, 5-10 key capabilities)

### 2. Draft
- Scaffold folder structure
- Write SKILL.md with all required sections
- Create 3+ subskills covering core topics
- Add 1+ knowledge files with reference material
- Output: complete skill directory, all files populated

### 3. Verify
- Run the verification checklist from SKILL.md
- Check line counts, banned words, structure compliance
- Validate routing table covers all subskill files
- Test with sample queries: does the skill activate correctly?
- Output: pass/fail report with specific issues

### 4. Refine
- Fix issues found in verification
- Add depth where benchmark comparison revealed gaps
- Tighten constraints that are too vague to test mechanically
- Re-run verification after changes
- Output: updated skill, clean verification pass

## Context Engineering

Structure skill content for progressive disclosure with explicit token budgets:

| Layer | Content | Budget | Loads |
|-------|---------|--------|-------|
| Metadata | Frontmatter: name, description | ~100 tokens | Always (skill matching) |
| Instructions | SKILL.md body: scope, constraints, routing | <5000 tokens | On skill activation |
| Subskills | Focused topic files | 1000-2000 tokens each | On routing match |
| Knowledge | Deep reference material | 2000-3000 tokens each | On explicit need |
| Tools | Prompts, checklists, scripts | Variable | On specific task type |

Principles: SKILL.md handles 80% without subskills. Routing table dispatches by signal words. Knowledge is pull-based, never speculative. Description triggers determine when the skill loads at all.

## Harness Engineering

Every skill needs mechanically checkable verification. Not "looks good" -- testable assertions.

A verification harness includes:
- Line count checks (wc -l)
- Banned word grep (zero matches = pass)
- Structure validation (required sections present)
- Routing completeness (all files referenced, no orphans)
- Token budget estimation (approximate via line count * 4)
- Description format regex match

Example harness commands:
```bash
# Structure exists
test -f SKILL.md && test -d subskills && test -d knowledge

# Line budget
[ $(wc -l < SKILL.md) -le 150 ]

# No banned words
! grep -riE "delve|realm|meticulous|pivotal|robust|seamless" .

# All subskills routed
for f in subskills/*.md; do grep -q "$(basename $f)" SKILL.md; done
```

## Agent Delegation

Multi-agent workflow for skill creation:

| Phase | Agent | Responsibility |
|-------|-------|---------------|
| Requirements | @scout | Research domain, find existing skills, identify user needs |
| Architecture | @atlas | Decide skill structure, subskill decomposition, knowledge boundaries |
| Implementation | @forge | Write all files, follow format, meet constraints |
| Testing | @probe | Run verification harness, test activation triggers |
| Review | @lens | Check quality, style, banned words, structure compliance |
| Validation | @refiner | Final pass: coherence, completeness, benchmark comparison |

For simple skills (single domain, clear scope): @forge can handle end-to-end with inline verification.
For complex skills (multi-domain, novel patterns): dispatch to agents in sequence.

## Anti-Patterns

- One-shotting: writing a skill in a single pass without verification
- Over-loading: putting 200+ lines in SKILL.md instead of splitting to subskills
- Orphan content: subskill files not referenced in the routing table
- Vague verification: "check quality" instead of testable assertions
- Copy without adaptation: pulling from registries without fitting to project conventions
