---
name: skill-creator
description: "Create and maintain agent skills: SKILL.md authoring, subskills, knowledge files, examples, tools. Use when asked to create a new skill, add subskills, or improve existing skills."
---

# Skill Creator

Create production-quality agent skills that follow project standards. A skill teaches Zara a new domain -- structured as progressive disclosure layers so the LLM loads only what it needs.

## Scope

- HANDLES: creating new skills, adding subskills/knowledge/examples/tools to existing skills, auditing skills for quality, refactoring skills that violate standards.
- DEFERS: domain expertise to the relevant expert skill; system design to `system-design`; AI engineering patterns to `ai-engineering`.

## First Action

1. Identify the skill topic and target audience (what domain, what expertise level).
2. Check if a skill already exists: `ls ~/.config/opencode/zara/skills/` and `.opencode/skills/`.
3. If creating new: scaffold the full folder structure. If extending: read existing SKILL.md first.
4. Gather domain knowledge -- ask user or research before writing.

## Standard Folder Structure

Every skill MUST follow this layout:

```
{skill-name}/
  SKILL.md            # Required: main agent instructions (80-100 lines target)
  subskills/          # Required: 3-5 focused topic files (60-100 lines each)
  knowledge/          # Required: deep reference material (100-150 lines each)
  examples/           # Required: working code/config/templates
  tools/              # Required: LLM prompts, scripts, checklists
```

Minimum viable skill: SKILL.md + 3 subskills + 1 knowledge file.

## SKILL.md Format

Frontmatter + these sections (in order): Title, Scope (HANDLES/DEFERS), First Action, Constraints, DO NOT, Route to Subskill (table), Verification, Knowledge, AI-Era Context, Related Skills.

See `subskills/skill-format.md` for the section-by-section guide and `examples/skill-template/SKILL.md` for a working template with placeholders.

## OKF Spec Rules

- `name` MUST match the directory name exactly.
- `name`: lowercase, hyphens only, max 64 characters.
- `description`: max 1024 characters. Format: "{what}: {details}. {when to use}."
- Body MUST be under 500 lines (target 80-100 for SKILL.md).
- Subskills: 60-100 lines each. ONE topic per file.
- Knowledge: 100-150 lines each. Deep reference, not instructions.
- No frontmatter in subskill files (only SKILL.md and knowledge files use it).

## Constraints

1. Progressive disclosure: SKILL.md loads first; subskills/knowledge load on demand via routing table.
2. Token budget: SKILL.md alone should give enough context for 80% of queries. Subskills handle the other 20%.
3. Each subskill covers ONE focused topic. If it covers two, split it.
4. Knowledge files are reference material (facts, specs, comparisons) -- not workflow instructions.
5. Tools dir contains prompt templates, checklists, scripts -- artifacts the agent uses to generate output.
6. Examples dir contains working templates the agent can copy/adapt.
7. Write for an LLM reader: be direct, use structure, avoid ambiguity.
8. Every claim should be actionable. No filler paragraphs.
9. Before finalizing any skill, benchmark against public skill registries: skills.sh, ClawHub (OpenClaw marketplace), agentskills.io catalog, Anthropic skills (github.com/anthropics/skills), obra/superpowers. Identify gaps and incorporate best patterns.
10. Apply loop engineering: skill creation follows Gather > Draft > Verify > Refine cycle. Never one-shot a skill.
11. Apply context engineering: structure content for progressive disclosure -- metadata (100 tokens), instructions (<5000 tokens), references (on-demand).
12. Apply harness engineering: every skill must have a verification checklist that can be mechanically checked.
13. Integrate multi-agent workflow: use @scout for requirements, @atlas for architecture patterns, @probe for test coverage, @lens for quality review, @refiner for final validation.

## DO NOT

- NEVER use banned words: delve/realm/meticulous/pivotal/robust/seamless/leverage/navigate/comprehensive/facilitate/landscape/foster.
- NEVER use em dashes in prose (use -- instead).
- NEVER exceed 500 lines in any single file.
- NEVER create a subskill that overlaps significantly with another.
- NEVER write vague descriptions ("various things", "and more").
- NEVER skip the folder structure -- partial skills are worse than none.
- NEVER put workflow instructions in knowledge files (those go in subskills).
- NEVER use emojis in skill files.

## Route to Subskill

| Signal | Load |
|--------|------|
| SKILL.md format, sections, frontmatter | `subskills/skill-format.md` |
| knowledge file, reference, deep info | `subskills/knowledge-writing.md` |
| subskill, topic file, focused instruction | `subskills/subskill-writing.md` |
| benchmark, compare, public registry, gaps | `subskills/benchmarking.md` |
| loop, cycle, context budget, harness, delegation | `subskills/engineering-loops.md` |
| audit, review, quality check | Load `tools/skill-audit-prompt.md` |
| generate, scaffold, new skill from scratch | Load `tools/skill-creation-prompt.md` |

## Verification

Before marking a skill complete:
1. All required directories exist with at least minimum content.
2. `name` in frontmatter matches directory name.
3. Description follows "{what}: {details}. {when to use}." format.
4. SKILL.md is 80-100 lines (hard max 150).
5. No banned words anywhere.
6. No em dashes in prose.
7. Routing table covers all subskills.
8. Knowledge files have frontmatter with `type` and `title`.
9. At least 3 subskills, 1 knowledge file, 1 example.
10. `cat {file} | wc -l` confirms line counts within budget.

## Knowledge (load on demand)

- `knowledge/folder-standards.md` - complete folder structure with rationale
- `knowledge/okf-spec.md` - Agent Skills specification rules

## AI-Era Context

Skills are how LLM agents gain domain expertise without fine-tuning. Well-structured skills with progressive disclosure let agents handle specialist tasks while staying within context limits. This is context engineering applied to agent capabilities.

## Related Skills

| When | Load |
|------|------|
| AI agent design | `ai-engineering` |
| Zara internals | `zara-core` |
| Testing the skill | `testing-strategy` |
