---
name: codebase-onboarding
description: Use when entering an unfamiliar codebase to build a fast, accurate mental model. Read-only exploration with structured output at three depth levels.
triggers:
  - new repo
  - unfamiliar codebase
  - "what is this project"
  - "how does this work"
  - "where do I start"
  - onboarding
  - explore codebase
  - "walk me through"
---

# Codebase Onboarding

## The Rule

**FACTS ONLY. NO SUGGESTIONS. NO REFACTORING ADVICE. NO OPINIONS ON QUALITY.**

You are reading code and reporting what exists. Not evaluating. Not improving. State what you inspected, what you found, and what you did NOT inspect.

---

## Process

### Step 0: Pre-Generated Context (Fast Path)

Check if `.context/` exists at project root:

```
.context/
  PROJECT.md      - identity, stack, architecture, API surface
  STRUCTURE.md    - annotated directory map
  CONVENTIONS.md  - coding patterns, commit rules, test commands
  ENTRY_POINTS.md - where to start + recent activity
  DEPENDENCIES.md - production and dev deps
```

**If exists and <7 days old:** Read all 5 files. You now have ~1200 tokens of high-signal context. Skip to Step 4 (Boundaries) for anything not covered. Go directly to Output.

**If missing or stale:** Run `node scripts/generate-context.mjs` (if available) or proceed to Step 1.

**If no generator available:** Proceed to Step 1 (manual exploration).

### Step 1: Inventory (Skip if Step 0 succeeded)

Read in parallel:
- Package manifest (package.json, go.mod, composer.json, Cargo.toml, pyproject.toml)
- Top-level directory structure (depth 1 only, save tokens)
- Build/config (Makefile, Dockerfile, CI config)
- Entry points (main.go, index.ts, app.php)

Classify: application, library, monorepo, CLI tool, service, plugin, or mixed.

**Monorepo detection:** If you find multiple package manifests, a `packages/` or `apps/` directory, or a workspace config (pnpm-workspace.yaml, lerna.json, go.work), treat each sub-package as its own onboarding unit. Map the top level first, then dive into the most relevant sub-package.

### Step 2: Entry Points (Skip if .context/ENTRY_POINTS.md exists)

Find the smallest set of files that define how the system starts:
- HTTP server startup, router registration
- CLI command registration
- Worker/queue consumers
- Package exports (if library)
- Plugin entry points (composition roots)

### Step 3: Trace Execution Paths

Follow 1-3 representative paths end-to-end:
- Request/command enters the system
- Routing/dispatch to handler
- Business logic execution
- Side effects (DB writes, external calls, events)
- Response/output

**Cross-references:** Note import/require chains. Which modules depend on which? Where are the hubs (files imported by many others)?

### Step 4: Boundaries

Identify module seams:
- Presentation vs domain vs infrastructure
- Clean interfaces vs tangled coupling
- Generated vs hand-written
- Dead code, migration artifacts, legacy paths

**Hot paths:** Check `git log --format='%H' --since='30 days' -- . | head -20` or recent commits. Files changed frequently = active development areas. Files untouched for months = stable or dead.

### Step 5: Output

Return THREE depth levels. User picks.

---

## Output Format

```markdown
# [Repo Name] Orientation

## 1-Line
[What this codebase is and does in one sentence.]

## 5-Minute Overview
- **What it does**: [primary behavior]
- **Inputs**: [HTTP, CLI, messages, files]
- **Outputs**: [responses, DB writes, events]
- **Stack**: [language, framework, key deps]
- **Entry points**: [2-4 files to read first]
- **Hot paths**: [most actively changed areas]
- **Main flow**: [entry -> routing -> logic -> output]

## Deep Dive

### Type & Runtime
[app/library/monorepo/CLI] on [runtime]

### Directory Map
| Path | Purpose | Activity |
|------|---------|----------|
| src/ | ...     | high     |
| ...  | ...     | low      |

### Key Execution Paths
1. [Path name]: `entry` -> `router` -> `service` -> `repo`
2. ...

### Cross-References (Hub Files)
| File | Imported By | Significance |
|------|------------|--------------|
| ... | N files | ... |

### Boundaries
- **Presentation**: [files]
- **Domain/Logic**: [files]
- **Infrastructure**: [files]
- **Cross-cutting**: [auth, logging, config]

### What I Inspected
[files read]

### What I Did NOT Inspect
[skipped, with reason]
```

---

## Rules

1. Never state behavior unless you can point to the file.
2. Never infer intent, quality, or future plans.
3. If you didn't read it, say so. Don't guess.
4. Quote exact function/class/route names.
5. Translate project-specific abstractions to plain language.
6. Call out misleading names: "Despite the name, `manager.go` is the HTTP handler."
7. DO NOT suggest changes, improvements, or refactoring.
8. DO NOT drift into code review mode.
9. Prefer `.context/` data over live exploration when available (saves tokens).

## Token Budget

This skill should consume minimal context. Guidelines:
- Step 0 (pre-generated): ~1200 tokens input, skip exploration entirely
- Step 1-4 (manual): read manifests + 5-10 key files max. Don't read everything.
- Output: 1-Line (~20 tokens), 5-Min (~200 tokens), Deep (~500 tokens)
- Total budget for this skill: <2000 tokens output

## When Done

Ask: "Want me to trace a specific path deeper, or is this enough?"

Do not offer to fix, improve, or restructure anything.
