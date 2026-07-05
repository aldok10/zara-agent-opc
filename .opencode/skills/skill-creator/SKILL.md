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

```
{skill-name}/
  SKILL.md            # Required: main instructions (80-100 lines target)
  subskills/          # Required: 3-5 focused topic files (60-100 lines each)
  knowledge/          # Required: deep reference material (100-150 lines each)
  examples/           # Required: working code/config/templates
  tools/              # Required: LLM prompts, scripts, checklists
```

Minimum viable skill: SKILL.md + 3 subskills + 1 knowledge file.

## SKILL.md Format

Frontmatter + sections (in order): Title, Scope (HANDLES/DEFERS), First Action, Constraints, DO NOT, Route to Subskill (table), Verification, Knowledge, AI-Era Context, Related Skills. See `subskills/skill-format.md` for details and `examples/skill-template/SKILL.md` for a working template.

## OKF Spec Rules

- `name`: must match directory, lowercase, hyphens only, max 64 chars.
- `description`: max 1024 chars. Format: "{what}: {details}. {when to use}."
- Body under 500 lines (target 80-100 for SKILL.md).
- Subskills: 60-100 lines, ONE topic per file. Knowledge: 100-150 lines, reference only.
- No frontmatter in subskill files (only SKILL.md and knowledge files).

## Constraints

1. Progressive disclosure: SKILL.md loads first; subskills/knowledge load on demand via routing table.
2. Token budget: SKILL.md alone should give enough context for 80% of queries. Subskills handle the other 20%.
3. Each subskill covers ONE focused topic. If it covers two, split it.
4. Knowledge files are reference material (facts, specs, comparisons) -- not workflow instructions.
5. Tools dir contains prompt templates, checklists, scripts -- artifacts the agent uses to generate output.
6. Examples dir contains working templates the agent can copy/adapt.
7. Write for an LLM reader: be direct, use structure, avoid ambiguity.
8. Every claim should be actionable. No filler paragraphs.
9. See `subskills/benchmarking.md` and `subskills/engineering-loops.md` for advanced patterns.
10. Compare against skills.sh leaderboard and agentskills.io catalog during creation to identify gaps and quality bar.
11. Reference obra/superpowers (246K stars) as quality benchmark for skill structure and depth.

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
1. All required directories exist with minimum content.
2. `name` in frontmatter matches directory name.
3. Description format: "{what}: {details}. {when to use}."
4. SKILL.md is 80-100 lines (hard max 150). No banned words. No em dashes.
5. Routing table covers all subskills.
6. Knowledge files have frontmatter with `type` and `title`.
7. At least 3 subskills, 1 knowledge file, 1 example.
8. `cat {file} | wc -l` confirms line counts within budget.

## Knowledge (load on demand)

`knowledge/folder-standards.md` · `knowledge/okf-spec.md`

## AI-Era Context

Skills are how LLM agents gain domain expertise without fine-tuning. Well-structured skills with progressive disclosure let agents handle specialist tasks while staying within context limits. This is context engineering applied to agent capabilities.

## Related Skills

| When | Load |
|------|------|
| AI agent design | `ai-engineering` |
| Zara internals | `zara-core` |
| Testing the skill | `testing-strategy` |
