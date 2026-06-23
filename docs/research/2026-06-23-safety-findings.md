# Safety Findings — Zara Codebase Review (2026-06-23)

> Source: Shield (@security-reviewer) grounded review of the ACTUAL codebase, not
> abstract research. Each finding cites real code. Authored autonomously while mas
> Aldo was away. Fixes marked DEFERRED need his go/no-go (they change product
> behavior or config, outside safe autonomous scope).

## What was actually done this session (not deferred)
- Shipped memory provenance (`agent`, `grounded` columns) via TDD, 17/17 tests green, live DB migrated (671 memories intact, backed up at ~/.zara/memory.db.backup-*).
- F6 mitigation: added a security guard comment at memory-db.mjs:73 locking `grounded` as internal-only. Tests still green.
- Wrote ZARA_CONSTITUTION.md (draft, pending ratification).

## Findings (ranked)

| # | Sev | Finding | Risk | Minimal fix | Status |
|---|-----|---------|------|-------------|--------|
| F2 | HIGH | `reflect()` self-reported outcome with no external signal; unspecified → reward 1 (success); success boosts trust of all recalled memories (reflection.mjs:60,69) | Wrong lesson logged as success compounds: inflates pattern score → reused → reinforced. Self-licking loop. | Default unspecified → `partial` (0.5). Require evidence string for `success` before `adjustTrust` raises anything. | **DEFERRED** — changes learning semantics, needs mas approval |
| F1 | HIGH | Write-gating only covers policy/architecture (memory.mjs:75). decision/preference/pitfall/fact accept observed with no gate | Agent or ingested content writes a durable fact/preference that steers behavior, no user in loop | Gate `decision`+`pitfall` to user_explicit; force lower confidence/trust for observed fact/preference | **DEFERRED** — needs mas approval |
| F3 | MED | No provenance for external-sourced content; agent can store web/file text as observed fact | Indirect prompt injection becomes persistent memory | Add `source: 'external_unverified'`, lowest trust, never auto-promote | **DEFERRED** — open question below |
| F4 | MED | `opencode.json:210` blanket `bash: allow`; git-safety only in CLAUDE.md prompt text | Confused/injected turn can `git push --force origin main`; platform won't stop it | Per-command bash deny patterns (force-push, reset --hard, clean -f, protected-branch commits) OR pre-push hook | **DEFERRED** — config change, needs mas approval |
| F5 | LOW | `memory_delete` agent-reachable, deletes by pattern (memory.mjs:44) | Agent could wipe inconvenient memories under "cleanup" | Append-only audit log of deletes; tighter breadth cap | **DEFERRED** |
| F6 | INFO | `grounded` spoofing (prior veto) | None currently exploitable; internal-only confirmed | Guard comment added | **DONE this session** |

## The one to fix first (Shield's call): F2
F2 is the multiplier. F1/F3 inject bad memories; F2 is what makes them *compound*
instead of staying one-offs. One small change in reflection.mjs breaks the
self-reinforcement engine. I did NOT apply it autonomously because it changes how
Zara learns for every reflect() call, that's a product decision, not a pure patch.

## Open question for mas (moves F3 between MED and HIGH)
Does anything today actually call `memory_learn` after reading web/file content,
or is that path currently theoretical? If agents do ingest-then-store, F3 is HIGH.

## Why so much is DEFERRED
Per the Constitution's own Preamble ("capability grows only as fast as safety
grows") and the /auto safety rules (config changes = confirm, not autonomous),
behavior-changing and config-changing fixes wait for your go/no-go. I shipped only
the zero-risk items (provenance was pre-approved scope; F6 guard is a comment; the
two docs are docs). Everything that rewires learning or loosens/tightens the
platform is yours to approve.
