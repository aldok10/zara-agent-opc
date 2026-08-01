---
type: subskill
title: "What Belongs in CONTEXT.md"
---

# What Belongs in CONTEXT.md

A `CONTEXT.md` encodes shared language only. Its value is that the agent stops re-learning the project's jargon and the user stops re-explaining it. If a fact is derivable from code, git, or docs, it does not belong.

## Belongs

| Content | Example |
|---------|---------|
| Domain terms with hidden meaning | "**cascade** = the daily re-index job that fans out to workers" |
| Conventions the user cares about | "we say worker, not job" |
| Architectural invariants and why | "the legacy import path is read-only; never migrate it" |
| Team vocabulary | "epic = a feature spanning more than one release" |

## Does not belong

- File paths and code structure (derivable by reading the repo).
- Fixes and debugging recipes (the code and commit history answer these).
- Anything already in CLAUDE.md or ADRs (duplication drifts).
- Personal preferences without a behavioral consequence.

## Format rules

- One line per term, bold term then colon: "**term** = one-line definition".
- Under ~50 lines. It is a reference, read once, consulted when terms appear.
- Prune as it grows; a CONTEXT.md that is not scannable stops being read.

## Sourcing rules

- Every term is user-supplied or user-confirmed. Never invent jargon.
- If the agent coins a term the user adopts, offer to add it.
- Keep the file at the project root unless the project convention says otherwise.
