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

## AI-Era Context (2026)

**Shared Language as Context Engineering**: AI agents need shared vocabulary to maintain consistency across sessions. CONTEXT.md is the project-specific glossary that prevents "re-learning" domain terms every session.

**Human-in-the-Loop Validation**: Never invent jargon. Every term comes from user or is confirmed by user. This prevents AI hallucinating project terminology.

**Complement to ADRs**: ADRs explain "why we chose X". CONTEXT.md explains "what we call X". They solve different problems. CONTEXT.md is reference, ADRs are decisions.

**Token Economics**: Keep under ~50 lines. Read once per session (first contact with project). Prune as it grows. This is high-value, low-cost context.

**Matt Pocock Practice**: Originated from @mattpocockuk's CONTEXT.md pattern for AI pair programming. Now standard practice for AI-assisted projects in 2026.
