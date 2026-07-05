---
type: tool
title: "Skill Creation Prompt"
---

# Skill Creation Prompt

Use this prompt template to generate a complete new skill from a topic description.

## Input Variables

- `{TOPIC}`: the domain/subject for the skill
- `{AUDIENCE}`: expertise level (junior/mid/senior)
- `{EXISTING_SKILLS}`: list of skills already in the system (to avoid overlap)

## Prompt

```
You are creating an agent skill for the topic: {TOPIC}
Target audience: {AUDIENCE} level practitioners.
Existing skills that must not be duplicated: {EXISTING_SKILLS}

Create a complete skill following this exact structure:

1. SKILL.md (80-100 lines)
   Frontmatter:
   - name: {topic as lowercase-hyphenated}
   - description: "{domain}: {specifics}. Use when {trigger condition}."
   
   Required sections: Scope, First Action, Constraints (8-18 rules), DO NOT (5-12 items),
   Route to Subskill (table), Verification, Knowledge, AI-Era Context, Related Skills.

2. subskills/ (minimum 3 files, 60-100 lines each)
   Each covers ONE focused topic within the domain.
   Format: H1 title, When to Load, Key Concepts, Patterns (with code), Gotchas, Verification.
   No frontmatter.

3. knowledge/ (minimum 1 file, 100-150 lines)
   Deep reference material with frontmatter (type: fact, title: "...").
   Includes: mental model, specifics, comparison tables, code examples, gotchas.

4. examples/ (minimum 1 working template)
   Correct, runnable code or config the agent can copy.

5. tools/ (minimum 1 prompt template or checklist)
   Meta-tools the agent uses to generate output.

Rules:
- Every line must earn its place. No filler.
- Code examples must be minimal but correct.
- Use imperative voice ("Do X", "Use Y", "Avoid Z").
- No banned words: delve/realm/meticulous/pivotal/robust/seamless/leverage/navigate/comprehensive/facilitate/landscape/foster.
- No em dashes (use -- instead).
- No emojis.
- Target senior-level content. Assume the reader knows basics.
- Each constraint must be specific and testable.
- Route table must reference all subskills.
- Related Skills table must reference existing skills where handoff makes sense.

Output each file with its path as a header, followed by complete content.
```

## Post-Generation Checklist

After generating, verify:
- [ ] `name` matches directory name
- [ ] Description under 1024 chars
- [ ] SKILL.md under 150 lines
- [ ] All subskills under 100 lines
- [ ] All knowledge files under 150 lines
- [ ] No banned words (grep for them)
- [ ] No em dashes (grep for unicode U+2014)
- [ ] Route table covers all subskills
- [ ] Knowledge files have frontmatter
- [ ] Examples are syntactically correct
- [ ] No overlap with existing skills
