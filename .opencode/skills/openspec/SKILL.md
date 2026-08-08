---
name: openspec
description: "OpenSpec spec-driven development: propose changes, drive artifacts via CLI, implement tasks, verify against spec, archive. Use when user wants to start a change, implement tracked work, update specs, sync deltas, or finalize work. Routes to openspec-propose/apply/explore/update/sync/archive."
---

# OpenSpec (spec-driven development)

Fission-AI/OpenSpec is an AI-native workflow where **every change has a spec**. Planning lives in `openspec/changes/<name>/` (proposal, delta specs, design, tasks); behavior truth lives in `openspec/specs/<capability>/spec.md`.

## Two halves

- **CLI (`openspec ...`)** runs in the terminal: `init`, `new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `store`, `config`.
- **Slash commands (`/opsx:*`)** run in chat: they drive the CLI. Claude Code: `/opsx:propose`. OpenCode: `/opsx-propose`. Shared `.agents` (skills-only): `/openspec-propose`.

## Canonical workflow (core profile)

```
/opsx:explore  (optional thinking partner)
/opsx:propose  -> creates change + proposal + delta specs + design + tasks
/opsx:apply    -> implement tasks, checkboxes - [ ] -> - [x]
/opsx:update   -> revise artifacts when reality drifts
/opsx:sync     -> merge delta specs into main specs
/opsx:archive  -> finalize, merge specs, move to changes/archive/
```

## Non-negotiables (agent contract)

1. **Every change must have a spec.** Never implement un-specced work.
2. **Update the spec when implementation changes.** Contract consistency over code.
3. **Review against the spec** (requirements + scenarios), not just the diff.
4. **Drive artifact creation via the CLI**, never assume repo-local paths:
   - `openspec status --change "<name>" --json` -> artifact order, status, `planningHome`, `actionContext`
   - `openspec instructions <artifact-id> --change "<name>" --json` -> template, rules, `resolvedOutputPath`
   - `openspec instructions apply --change "<name>" --json` -> tasks, contextFiles, progress
5. **Store selection:** if a named store is in play, `--store <id>` on root-resolving commands; otherwise nearest local `openspec/` root. `--json` = exactly one JSON doc on stdout.

## Spec format essentials

- **Main spec** (`openspec/specs/*/spec.md`): requirements (`SHALL/MUST/SHOULD`) + scenarios (`GIVEN/WHEN/THEN`).
- **Delta spec** (`openspec/changes/<name>/specs/*/spec.md`): `## ADDED`, `## MODIFIED`, `## REMOVED` sections.
- **Schema** drives artifacts (`openspec/config.yaml`, `schema: spec-driven`).

## Route to skills

| Signal | Skill |
|--------|-------|
| Explore an idea before committing | `openspec-explore` |
| New feature/fix/change, generate all artifacts | `openspec-propose` |
| Implement tasks from a change | `openspec-apply-change` |
| Revise artifacts, keep coherent | `openspec-update-change` |
| Merge delta specs to main specs | `openspec-sync-specs` |
| Finalize/archive a completed change | `openspec-archive-change` |

## Checks

After any OpenSpec work, verify: `openspec validate --all --json` passes, `openspec status --change <name> --json` shows expected artifact state, and tasks checkboxes reflect reality.

## AI-Era Context (2026)

**Spec-Driven Development as Standard**: In 2026, AI agents can implement code at high velocity but struggle with ambiguous requirements. Spec-driven workflows (OpenSpec, ADRs, RFCs) are the bridge: human writes precise spec, AI implements, both verify against spec.

**Contract Over Code**: The spec is the contract. When implementation diverges, update the spec — never let them drift. This prevents "vibe coding" where code works but nobody knows why.

**Artifact-Driven vs Chat-Driven**: Traditional AI coding is ephemeral chat → code. OpenSpec is artifact-first: proposal, specs, design, tasks are reviewable, versionable, and survive context compaction. This enables long-running work across multiple sessions.

**Verification Gates**: `openspec validate --all --json` checks spec-code coherence automatically. Combined with test suites, this is the quality gate for AI-generated code. Never merge without both passing.

**Multi-Agent Orchestration**: OpenSpec artifacts coordinate multiple agents: architect writes specs, implementer writes code, reviewer validates against scenarios. Each agent reads from/writes to the same artifact tree.
