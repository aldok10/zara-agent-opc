# Skill Audit Prompt

Use this prompt template to audit an existing skill against project standards.

## Input Variables

- `{SKILL_PATH}`: path to the skill directory
- `{SKILL_NAME}`: the skill's name from frontmatter

## Prompt

```
Audit the skill at {SKILL_PATH} against these standards:

## Structure Check
- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] `name` in frontmatter matches directory name "{SKILL_NAME}"
- [ ] `name` is lowercase, hyphens only, max 64 chars
- [ ] `description` is non-empty, max 1024 chars, format "{what}: {details}. {when}."
- [ ] subskills/ directory exists with 3+ files
- [ ] knowledge/ directory exists with 1+ files
- [ ] examples/ directory exists
- [ ] tools/ directory exists

## Content Check (SKILL.md)
- [ ] Has all required sections: Scope, First Action, Constraints, DO NOT, Route to Subskill, Verification
- [ ] Line count: 80-150 lines
- [ ] Scope has HANDLES and DEFERS
- [ ] Constraints are numbered, specific, testable
- [ ] DO NOT items start with NEVER
- [ ] Route table references all subskill files that exist
- [ ] No orphan subskills (exist on disk but not in route table)

## Content Check (Subskills)
- [ ] Each file is 60-100 lines
- [ ] Each covers ONE topic (not multiple)
- [ ] No YAML frontmatter (subskills don't use it)
- [ ] Has verification section

## Content Check (Knowledge)
- [ ] Each file has YAML frontmatter with `type` and `title`
- [ ] Each file is 100-150 lines
- [ ] Contains reference material, not workflow instructions

## Quality Check
- [ ] No banned words: delve/realm/meticulous/pivotal/robust/seamless/leverage/navigate/comprehensive/facilitate/landscape/foster
- [ ] No em dashes (U+2014) in prose
- [ ] No emojis
- [ ] No files exceed 500 lines
- [ ] Code examples are minimal and correct
- [ ] Imperative voice throughout

## Output Format
For each failed check, report:
- File path
- Rule violated
- Current content (quote the problem)
- Suggested fix

Summary: PASS (all checks) | WARN (minor issues) | FAIL (structural violations)
```

## Quick Audit Commands

Run these to catch common issues fast:

```bash
# Check line counts
wc -l {SKILL_PATH}/**/*.md

# Check for banned words
grep -riE "delve|realm|meticulous|pivotal|robust|seamless|leverage|navigate|comprehensive|facilitate|landscape|foster" {SKILL_PATH}/

# Check for em dashes
grep -rP "\x{2014}" {SKILL_PATH}/

# Check frontmatter exists in SKILL.md
head -1 {SKILL_PATH}/SKILL.md  # should be "---"

# List all subskills referenced in route table
grep -oP 'subskills/[^`]+' {SKILL_PATH}/SKILL.md

# List all subskill files on disk
ls {SKILL_PATH}/subskills/

# Compare (orphans = on disk but not in route table)
```

## Benchmarking Audit

After structure and quality checks pass, run a benchmark comparison:

### Compare Against Public Skills

- [ ] Searched skills.sh for equivalent domain skill
- [ ] Searched ClawHub (OpenClaw marketplace) for overlapping skills
- [ ] Checked Anthropic skills (github.com/anthropics/skills) for reference patterns
- [ ] Checked obra/superpowers for relevant skill structures
- [ ] Documented gaps found (features present in registry but missing here)
- [ ] Documented intentional omissions with rationale

### AI-Friendly Format Compliance

- [ ] Progressive disclosure structure: Level 1 (SKILL.md, <5000 tokens), Level 2 (subskills, 1000-2000 tokens each), Level 3 (knowledge, on-demand)
- [ ] Description follows llms.txt discoverability pattern: concise, keyword-rich, explains when to use
- [ ] Constraints are machine-testable (not subjective judgments)
- [ ] Routing table uses signal words an LLM would naturally generate
- [ ] Content uses imperative voice and structured headers (AGENTS.md pattern)
- [ ] No prose blocks longer than 5 lines without structure (lists, tables, code)

### Progressive Disclosure Verification

- [ ] Level 1 -- SKILL.md alone handles 80% of typical queries for this domain
- [ ] Level 2 -- Each subskill is self-contained (no required cross-references between subskills)
- [ ] Level 3 -- Knowledge files are pure reference (facts/specs), loadable independently
- [ ] Token estimates: SKILL.md ~400-600 tokens, subskills ~400-800 tokens each, knowledge ~800-1200 tokens each
- [ ] No circular loading (subskill A references subskill B which references A)
