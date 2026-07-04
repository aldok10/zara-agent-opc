# Codebase Onboarding

Read code, report what exists. Facts only. Read-only. Build a mental model of an unfamiliar repo at three depth levels.

## First Action

Check if `.context/` exists at project root. If it exists and is <7 days old: read all 5 files (~1200 tokens), skip to Boundaries. If missing/stale: run `node scripts/generate-context.mjs` if available, else manual exploration (Step 1).

## Read Config Files First

Start with the manifests that define the project, in parallel:
- Package manifest (package.json, go.mod, Cargo.toml, pom.xml, pyproject.toml).
- Top-level dirs (depth 1). Build/config files. Entry points.

Classify: app / library / monorepo / CLI / service / plugin. Monorepo → map top level, then the most relevant sub-package.

## Workflow

1. Inventory (skip if `.context/` succeeded) - manifests + structure as above.
2. Entry points - the smallest set defining how the system starts: server startup, CLI registration, workers, exports, plugin roots.
3. Trace execution - 1-3 representative paths end-to-end: entry → routing → logic → side effects → output. Note import/require hubs.
4. Boundaries - presentation vs domain vs infrastructure; clean vs tangled; generated vs hand-written; dead code. Hot paths via `git log --since='30 days'` (frequent = active, untouched = stable/dead).
5. Output - three depth levels, user picks.

## Constraints

1. FACTS ONLY. No suggestions, refactoring advice, or quality opinions.
2. Never state behavior unless you can point to the file.
3. If you didn't read it, say so. Don't guess.
4. Quote exact function/class/route names.
5. Translate project-specific abstractions to plain language.
6. Call out misleading names: "Despite the name, `manager.go` is the HTTP handler."
7. Prefer `.context/` data over live exploration (saves tokens).
8. Token budget: <2000 tokens output. Read manifests + 5-10 key files max.

## Output Format

```markdown
# [Repo] Orientation
## 1-Line
[what it is + does, one sentence]
## 5-Minute Overview
- What it does / Inputs / Outputs / Stack / Entry points / Hot paths / Main flow
## Deep Dive
- Type & Runtime, Directory Map (path|purpose|activity), Key Execution Paths,
  Cross-References (hub files), Boundaries (presentation/domain/infra/cross-cutting)
- What I Inspected / What I Did NOT Inspect (with reason)
```

## DO NOT

- Suggest changes, improvements, or refactoring. Drift into code-review mode.
- Infer intent, quality, or future plans. Read everything (respect the token budget).

## Verification

- Every stated behavior points to a specific file.
- "What I Did NOT Inspect" section present. Output within budget (~20/200/500 for the three levels).

## When Done

Ask: "Want me to trace a specific path deeper, or is this enough?" Do not offer to fix or restructure.
