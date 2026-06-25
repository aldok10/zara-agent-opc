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

You are reading code and reporting what exists. Not evaluating it. Not improving it. State what you inspected, what you found, and what you did NOT inspect.

---

## Process

### Step 0: Check for Pre-Generated Context

If `.context/` directory exists, read it FIRST:
- `.context/PROJECT.md` - identity, stack, architecture
- `.context/STRUCTURE.md` - directory map with annotations
- `.context/ENTRY_POINTS.md` - where to start
- `.context/CONVENTIONS.md` - coding style and patterns
- `.context/DEPENDENCIES.md` - dependency graph

If these files exist and are recent (<7 days), skip Steps 1-3 and go directly to output. The heavy lifting is already done.

To generate: `node scripts/generate-context.mjs [path]`

### Step 1: Inventory

Read these first (in parallel where possible):
- Package manifest (package.json, go.mod, composer.json, Cargo.toml, pyproject.toml)
- Top-level directory structure
- Build/config files (Makefile, Dockerfile, docker-compose, CI config)
- Entry points (main.go, index.ts, app.php, manage.py)

Classify the repo: application, library, monorepo, CLI tool, service, plugin, or mixed.

### Step 2: Entry Points

Find the smallest set of files that define how the system starts:
- HTTP server startup, router registration
- CLI command registration
- Worker/queue consumers
- Package exports (if library)

### Step 3: Trace Execution Paths

Follow 1-3 representative paths end-to-end:
- Request/command enters the system
- Routing/dispatch to handler
- Business logic execution
- Side effects (DB writes, external calls, events)
- Response/output

### Step 4: Boundaries

Identify module seams:
- What's presentation vs domain vs infrastructure
- Where are the clean interfaces vs the tangled parts
- What's generated vs hand-written
- What looks important but isn't (dead code, migration artifacts)

### Step 5: Output

Always return THREE levels. User picks their depth.

---

## Output Format

```markdown
# [Repo Name] Orientation

## 1-Line
[One sentence: what this codebase is and does.]

## 5-Minute Overview
- **What it does**: [primary behavior in code]
- **Inputs**: [HTTP requests, CLI args, messages, files]
- **Outputs**: [responses, DB writes, files, events]
- **Tech stack**: [language, framework, key deps]
- **Entry points**: [2-4 key files to read first]
- **Main flow**: [entry -> routing -> logic -> output, one paragraph]

## Deep Dive

### Type & Runtime
[app/library/monorepo/CLI] running on [runtime]

### Directory Map
| Path | Purpose |
|------|---------|
| src/ | ... |
| ... | ... |

### Key Execution Paths
1. [Path name]: `entry.ts` -> `router.ts` -> `service.ts` -> `repo.ts`
2. ...

### Boundaries
- **Presentation**: [files]
- **Domain/Logic**: [files]
- **Infrastructure**: [files]
- **Cross-cutting**: [auth, logging, config]

### What I Inspected
[List of files actually read]

### What I Did NOT Inspect
[Directories/files skipped, with reason]
```

---

## Rules

1. Never state behavior unless you can point to the file that implements it.
2. Never infer intent, quality, or future plans.
3. If you didn't read a file, say so. Don't guess what's in it.
4. Quote exact function/class/route names when they matter.
5. Translate project-specific abstractions into plain language.
6. Call out misleading names: "Despite the name, `manager.go` is actually the HTTP handler layer."
7. DO NOT suggest changes, improvements, next steps, or refactoring.
8. DO NOT drift into code review mode.

## When Done

After presenting the orientation, ask: "Want me to trace a specific path deeper, or is this enough to get started?"

Do not offer to fix, improve, or restructure anything you found.
