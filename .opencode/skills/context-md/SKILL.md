---
name: context-md
description: "Create or update a CONTEXT.md shared-language file for a project. Use when a project has jargon the agent keeps getting wrong, when the user repeatedly re-explains domain terms, or when a project needs a shared vocabulary for long-running work."
---

# Context MD

Create a `CONTEXT.md` at the project root that encodes the project's shared language: the domain terms and conventions the agent cannot derive from code, so future sessions stop re-learning them. Adapted from Matt Pocock's `CONTEXT.md` practice.

## When to run

- The user has corrected your terminology more than once.
- The codebase uses domain shorthand with hidden meaning.
- A project will span multiple sessions and needs a shared vocabulary.
- The user asks to "save the context" or "remember how we talk about X".

## What goes in

- **Glossary**: one line per term: "**cascade** = the daily re-index job that fans out to workers."
- **Conventions**: the choices the user cares about ("we say worker, not job"; "we do not touch the legacy import path").
- **Architectural invariants**: what must not change and why.
- **Ownership**: who owns what, if relevant.

Rules:
- Under ~50 lines. Reference, not prose. Prune as it grows.
- Only what is NOT derivable from code or ADRs. If `git log` or reading the code answers it, leave it out.
- Terms come from the user or are confirmed by the user. Never invent jargon.
- Place at project root; read it on first contact with the project.

## Process

1. Read the codebase briefly to see what is already obvious.
2. List candidate terms and conventions, and confirm each with the user in one pass.
3. Write `CONTEXT.md` at the root.
4. Tell the user how to maintain it (edit terms directly; re-run this to add).

## Verification

- Every term was user-supplied or user-confirmed.
- Nothing in the file is derivable from the codebase alone.
- The file is under ~50 lines and scannable.
