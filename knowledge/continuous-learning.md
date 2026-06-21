# Continuous Learning — How Zara Improves From Usage

Zara is a self-improving agent. The mechanisms below are not aspirational — they
are wired tools and hooks. This doc maps the doctrine to the actual surface so
the loop is run, not just admired.

## The Loop

```
Observe → Orient → Act → Reflect → Consolidate
```

Each phase maps to concrete tools. Nothing here requires ML, training, or
external services — it is statistical learning over JSON + SQLite already in the
project. That is deliberate: for a single-user agent, a success-weighted
statistical loop delivers most of the value of "learning" at zero infra cost.

## Phase → Tools

### Observe (task start)
- `reflect_suggest(situation)` — recalls the historically best-scoring approach
  for a similar task, ranked by success rate × log(frequency). A proven pattern
  outranks a one-off lucky hit.
- `evolve_check_rules(situation)` — surfaces learned when-X-do-Y rules.
- `memory_recall(query)` — prior facts, decisions, preferences (scoped, decayed,
  reinforced on access).

### Orient
- `blindspot_check(context)` — known traps to avoid (e.g. over-confirming with a
  D4 user, single-perspective thinking).
- `knowledge_passage(query)` — semantic passage retrieval over the DevIQ corpus
  (full article bodies, not just titles).

### Act
Do the work. Use the suggested approach if one scored well; deviate
consciously if context differs.

### Reflect (task done)
- `reflect(task, worked, failed, pattern, outcome)` — **outcome is the signal.**
  success=1.0, partial=0.5, failure=0.0. Each reflection updates the pattern's
  running success rate. Honest failures are more valuable than inflated wins —
  they steer future suggestions away from what does not work.
- `evolve_crystallize(name, trigger, steps)` — a sequence repeated 3+ times
  becomes a named micro-tool, retrievable via `evolve_lookup`.
- `evolve_score_prompt(instruction, score)` — track which prompt instructions
  help vs hurt. Consistently harmful instructions get flagged for suppression.

### Consolidate (session end — automatic)
- Wired into `session_log` end action (deterministic, not prompt-dependent):
  `dreamConsolidate` merges duplicates, archives stale memories, promotes
  recurring episodic topics; `detectContradictions` scans for same-subject
  facts that make different claims and flags them for review (never auto-merges).

## Watching Growth

`zara_evolve_status` is the read-side: top patterns by success rate, active
rules and fire counts, prompt adaptations (amplify/suppress), open
contradictions, blindspots, and a health summary. If success rates are not
rising over sessions, the approach itself needs to change — that is the signal
to step back, not patch.

## Contradiction Detection (memory coherence)

Long-lived memory decays if contradictory facts accumulate ("prefers X" then
later "prefers Y"). `detectContradictions` finds same-type memories that share a
subject (word-level Jaccard overlap on keys/values) but diverge in content, with
both sides contributing distinct tokens. It flags, never auto-resolves — a human
decides which fact is current. Word-level Jaccard is used deliberately over
trigram cosine, which saturates near 0.85 for unrelated text and produces mass
false positives.

## Corrections Are Sacred

When the user corrects Zara:
1. Persist it permanently (`memory_learn`) — never lose a correction.
2. Never be defensive. The correction is data, not criticism.
3. If it maps to a skill, update that skill file, not just memory.
4. The same mistake twice means a systemic fix is required, not another patch.

## What This Is NOT

- Not autonomous self-modification of code/prompts. The loop surfaces
  suggestions; the user decides. (Anti "Ralph-loop" — no infinite self-editing.)
- Not neural / embedding-based learning. Statistical and lexical, on purpose.
- Not a replacement for human judgment. It is scaffolding for it.
