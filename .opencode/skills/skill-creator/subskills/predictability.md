---
type: subskill
title: "Predictability (writing-great-skills)"
---

# Predictability

The root virtue of a great skill (from Matt Pocock's `writing-great-skills`): how consistently the agent behaves across runs. Predictability of process, not of output. A skill is good when the agent can be trusted to apply it the same way every time.

Four axes govern predictability. Every skill decision maps to one of them.

## 1. Invocation: how the skill gets triggered

| Term | Meaning |
|------|---------|
| Model-invoked | Agent may trigger it. Keep the `description` rich so the agent recognizes the match. |
| User-invoked | Only a human triggers it (usually via a slash command). Remove/weaken the description. |
| Context load | Tokens the skill costs the agent in the current run. Higher load = fewer skills run together. |
| Cognitive load | Mental effort for the human. User-invoked skills spend the human's attention. |
| Router skill | One skill that maps tasks to other skills (like `skill-gate` / `ask-matt`). Fix a stale router immediately. A stale router that still routes to a dead skill is a router that lies. |

**Rule:** user-invoked may call model-invoked, never the reverse. Choosing between them is a context-load vs cognitive-load tradeoff.

## 2. Information hierarchy: how content is laid out

| Term | Meaning |
|------|---------|
| Steps | Sequential instructions in the skill body. Loaded immediately. |
| Reference | Supporting detail for a step. Read on demand. |
| External reference | Glossary or doc the agent fetches only when needed. |
| Progressive disclosure | Put the frequent 80% in the body; isolate the infrequent 20% behind a reference/glossary. |
| Co-location | Keep related reference next to its step, so you don't force a jump. |
| Failure: sprawl | Too much inline detail bloats every run. Move to reference; never let the body exceed ~150 lines. |

## 3. Steering: how you keep the agent on track

| Term | Meaning |
|------|---------|
| Leading word | A compact concept already in the model's pretraining (e.g. "red-green-refactor"). Anchors execution with one word. |
| Branch | Conditional step: "if X, do Y; else Z." |
| Completion criterion | The concrete condition that means "done". Write it as a verb + observable result. |
| Legwork | The search/verification work required of the agent; declare it explicitly so it isn't skipped. |
| Failure: premature completion | Agent declares done before the completion criterion. Fix: name the criterion. |
| Failure: negation | "Do NOT do X" is weak steering; the model must hold X in mind. Prefer positive instructions plus a short explicit blocklist only for real hazards. |

## 4. Pruning: keeping the skill lean

| Term | Meaning |
|------|---------|
| Single source of truth | One place for a fact; references link to it, they don't copy it. |
| Relevance | If a detail doesn't change an action, cut it. |
| Failure: duplication | Same info in two places drifts. Keep one canonical copy. |
| Failure: sediment | Rules accumulate past usefulness. Every maintenance pass, ask "is this still load-bearing?" |
| Failure: no-op | A step that changes nothing, or a skill nobody triggers. Remove or archive. |

## When to apply this

- Designing a new skill: pick invocation first, then hierarchy, then steering, then pruning.
- Editing an existing skill: check it against the four axes; fix the biggest drift first.
- Auditing: run the checklist in `tools/skill-audit-prompt.md` and look for each failure mode above.

## Verification

1. Every failure mode above is named and accounted for in the skill.
2. The body is under ~150 lines; the rest lives in subskills/reference.
3. Each step ends in a verb + observable result (no dangling instructions).
4. No duplicated facts between SKILL.md, subskills, and knowledge files.
