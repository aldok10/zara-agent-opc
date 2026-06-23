# Zara → JARVIS Blueprint: Long-Term AI Companion for SWE & Personal Growth

> Research doc. Staged across 7 phases. Grounded in the EXISTING `zara-agent-opc` codebase, not greenfield.
> Started: 2026-06-23. Owner: mas Aldo. Author: Zara.

## Framing Correction (read this first)

The brief reads as "design Zara from scratch." Reality: Zara already exists and runs. This codebase has:

- SQLite cognitive memory (semantic / episodic / procedural), FTS5 + trigram fallback, decay, consolidation, dreamer
- Reflection-based online learning (87 learned patterns, success-weighted)
- 9-agent crew (Atlas, Lens, Shield, Probe, Pulse, Rhythm, Hive, Forge, Sketch) + Zara primary
- 254-article knowledge base with passage-level chunk retrieval
- 20 slash commands, voice plugin, goal/loop/shutdown tooling

So this blueprint is an **evolution map from current state → JARVIS vision**, with honest gap analysis. Greenfield advice would waste the work already done.

---

# PHASE 1 — Landscape Research

## 1.1 The single most important technical finding

Zara's "embeddings" are **MD5-hashed trigrams into a 128-dim vector** (`memory-db.mjs` `#trigramEmbed`). That is lexical/character-level similarity dressed up as vector search. It cannot do:

- Conceptual matching ("burnout" ≈ "exhausted from overwork")
- Multi-hop reasoning ("who did Aldo mention re: the Tokopedia migration?")
- Cross-lingual matching (Indonesian ↔ English)

Everything else in the memory system (decay, type-boost, reinforcement, trust scoring, dreamer consolidation) is genuinely good architecture sitting on top of a weak retrieval primitive. **This is the #1 leverage point.** Real embeddings under the same `MemoryStore` interface would lift retrieval quality across the entire system with zero changes to callers.

## 1.2 Memory framework landscape (live data, Jun 2026)

| System | Type | Backend | LOCOMO acc. | Token cost/query | Sweet spot | Relevance to Zara |
|--------|------|---------|-------------|------------------|------------|-------------------|
| **Mem0** | Memory layer (bolt-on) | Vector + optional graph | ~92.5% [7] | ~1.7k–6.9k [2][7] | Token efficiency, popularity (~48k stars [6]) | Closest architectural cousin. Extract→consolidate pattern matches Zara's reflect/dreamer |
| **Zep / Graphiti** | Memory service | Bi-temporal knowledge graph | ~94.7% [1][2] | up to 600k in some configs [2] | Temporal reasoning, freshness | Best-in-class accuracy; graph + bi-temporal is what Zara lacks |
| **Letta (MemGPT)** | Agent runtime | OS-inspired tiered memory | — | unbounded sessions [2] | Self-editing memory, infinite context | The "memory as OS" idea; Zara already mimics tiers (baseline/scoped/budget) |
| **Cognee** | Memory layer | Graph-heavy | ~55–56% [8] | higher | Graph-structured retrieval | Graph alone underperforms — caution |
| **Cloudflare Agent Memory** | Managed | Edge KV + vector | — | — | Serverless | Not relevant (local-first Zara) |
| **Plain markdown + semantic index** | DIY | Files + embeddings | — | — | Transparency, git-versionable | This is basically Zara's `knowledge/` dir today |

Key benchmark facts:
- Zep reports 94.7% LoCoMo / 90.2% LongMemEval [1][2]. Mem0 reports 92.5 LoCoMo / 94.4 LongMemEval at ~6.9k tokens [7].
- Independent multi-agent study: mem0/RAG/full-context cluster at 77–81%, while Graphiti/cognee hit only 55–56% — the gap is **retrieval incompleteness, not reasoning failure** [8]. Lesson: graph is not automatically better; retrieval recall is what matters.
- Vector wins on recency/similarity; struggles on multi-hop + precise temporal ordering [1]. That is exactly the episodic/relationship-memory weakness.

**Takeaway for Zara:** The winning pattern is **hybrid** — vector for similarity + lightweight graph/temporal layer for relationships and time. Not pure-graph (underperforms), not pure-vector (no multi-hop). Zara's SQLite is the right substrate; it needs (a) real embeddings, (b) a relation/temporal layer.

## 1.3 Continuous learning landscape (live data, Jun 2026)

The field has converged on one thesis: **agents adapt through reflection + memory, not fine-tuning** [1][2][6][7].

- **Reflexion** (Shinn et al.): verbal self-critique stored in episodic memory; lifted GPT-4 coding from 80%→91% [4]. Zara's `reflect()` is literally this.
- **External verification beats verbal reflection alone** — test execution / tool validation + verbal reflection consistently outperforms either alone [4]. Zara's gap: reflections are self-reported (`outcome: success/partial/failure`) with no grounded signal (did tests actually pass?).
- **Skill abstraction**: ELL [7], MUSE [6], SAGE [10] all converge on "abstract recurring experience trajectories into reusable skills, validate, reapply." Zara has `micro_tools` + `patterns` but they're under-used (0x execution counts in dashboard).
- **Failure mode to fear**: reflection reinforcing flawed reasoning ("degeneration of thought"), infinite loops, storing wrong lessons [4]. Zara's anti-doom-loop rule + contradiction detection partially address this, but storing-wrong-lessons is not guarded.

## 1.4 Coding-assistant landscape (live data, Jun 2026)

| Tool | Architecture | SWE-bench | Notes |
|------|-------------|-----------|-------|
| **Claude Code** | Terminal/IDE agent | 80.9% [1] | Market leader, ~54% enterprise model share [4], plugin marketplace [7] |
| **Cursor** | AI-native IDE | high | Closest GUI equivalent, multi-file agent [6] |
| **OpenCode** | Open terminal agent | — | **This is Zara's host.** Plugin + MCP + subagent architecture |
| Codex / Devin | Autonomous | varies | Devin = full autonomy, higher cost |
| Aider / Cline / Roo | OSS pair-programmers | varies | Aider = git-native, Cline = MCP-heavy |

**Strategic point:** Zara is NOT competing with these. Zara is built ON OpenCode and uses Claude as its model. The differentiator is **persistence + relationship + personal growth**, not raw SWE-bench. Don't chase coding-agent parity; the moat is the long-term companion layer those tools deliberately lack.

## 1.5 Where Zara already sits in the landscape

| Capability | SOTA approach | Zara today | Verdict |
|-----------|--------------|------------|---------|
| Long-term memory | Hybrid vector+graph+temporal | SQLite + trigram pseudo-embed + type/decay | Right shape, weak primitive |
| Continuous learning | Reflexion + skill abstraction + external verify | reflect() + patterns + dreamer | Strong, missing grounded signal |
| Multi-agent | Orchestrator + specialists | 9-agent crew + servant-leader doctrine | Genuinely ahead of most |
| Personal understanding | User model + episodic | user_profile + relational memory | Present but shallow (no structured psych model) |
| Knowledge awareness | RAG + freshness | 254-article KB, no live news ingest | Static; no news pipeline |
| Personality/relationship | rare in SWE tools | deep system prompt + voice plugin | **This is the moat** |

**Phase 1 conclusion:** Zara is architecturally ahead of most named systems on the *relationship/agent* dimension and behind on the *retrieval primitive* dimension. The blueprint should protect the moat (personality, crew, persistence) and fix the foundation (embeddings, grounded learning, temporal/graph layer).

---

# PHASE 2 — Gap Analysis (Companion + Crew Ecosystem)

## 2.0 The structural truth about the crew (from reading the code)

Before ranking gaps, three facts the brief doesn't mention but the code makes clear:

1. **Memory is ALREADY shared.** Every agent (Zara + 9 specialists) reads/writes the same `~/.zara/memory.db` and the same `~/.zara/reflections/patterns.json`. "Shared memory" and "shared learning" partly exist by accident of a single global store. The Ultimate Vision's "collective intelligence" is closer than the brief assumes.

2. **The subagents are nearly stateless.** Atlas/Lens/Shield/etc. are `edit:deny, bash:deny` prompt files. They have rich *role* definitions but no *per-agent memory namespace*, no record of their own past judgments, and (critically) **they don't call `reflect()` themselves.** Only Zara does. So the crew doesn't actually learn as individuals. Every dispatch starts cold.

3. **The learning loop is shallow.** All 87 learned patterns are `1x` occurrence and all about Zara's own infra/config work. Zero domain patterns (no "Atlas learned monolith-first beats microservices for X"). The reward signal is **self-reported** (`outcome: success/partial/failure`), never grounded in an external check. This is exactly the failure mode the research warns about [Reflexion: external verification > verbal reflection alone].

**Implication:** The biggest crew-level gap is not "make Atlas smarter." It's that **the crew has no individual memory and no grounded feedback loop.** Fix that substrate and every agent improves at once. Fix agents one-by-one and you're polishing prompts.

## 2.1 Per-agent gap snapshot (current → desired)

Rated honestly against the actual prompt files, not the aspiration.

| Agent | Current strength | Real gap | Biggest single lever |
|-------|-----------------|----------|---------------------|
| **@zara** | Deep persona, memory, orchestration doctrine | Fake embeddings; no grounded learning; relationship model shallow | Real embeddings + grounded reflect |
| **@atlas** | Excellent knowledge-routing table, tradeoff doctrine | No memory of its OWN past designs/ADRs; can't say "we decided X in June" | Per-agent decision log (ADR memory) |
| **@lens** | Clear review lane | No project-specific style memory; re-derives conventions every time; no diff-history awareness | Persistent codebase-convention memory |
| **@shield** | Threat-model lane, OWASP knowledge | No CVE freshness (static KB); no record of past findings/dispositions | Live vuln feed + finding ledger |
| **@probe** | Test-strategy lane | Can't see actual coverage data; no flaky-test memory; recommends blind | Wire to real test/coverage output |
| **@pulse** | Delivery lane | No real velocity data; advises without git/metrics; "virtual DM" with no telemetry | Wire to git log + metrics_today |
| **@rhythm** | Loop-design lane | The Kaizen agent that itself has no persistent improvement ledger | Cross-session retro memory |
| **@hive** | Solid decomposition protocol | Max 5 workers; no nested-swarm memory; "hundreds of sub-agents" is fiction at current arch | Worker-result caching + batching |
| **@forge** | Strong pipeline, has edit+bash | THE only agent grounded in real execution. Doesn't persist what it learned per-repo | Per-repo build/test memory |
| **@sketch** | Planning lane (read-only) | Plans aren't tracked to outcomes; no "did this plan work?" loop | Plan→outcome linkage |

**Pattern:** 7 of 10 gaps reduce to the same two root causes — (a) no per-agent persistent memory, (b) no connection to ground-truth signals (tests, coverage, git, CVE feeds). The brief's "V1→V4 per agent" framing hides this. You don't need 50 roadmap cells; you need 2 substrate fixes + thin per-agent wiring.

## 2.2 Multi-agent framework landscape (live, Jun 2026) — what to borrow

| Framework | Mental model | Borrow for Zara | Skip |
|-----------|-------------|-----------------|------|
| **LangGraph** | Explicit state graph, cycles, HITL checkpoints [7][10] | Checkpointed multi-step flows; the production favorite | Full graph runtime (Zara is prompt+MCP, not Python graph) |
| **CrewAI** | Role hierarchy, simpler [1][5] | Role abstraction (Zara already has this) | Hit scaling walls [7] |
| **AutoGen** | Group chat, conversational [1][7] | Multi-turn agent debate (already have `/debate`) | Messy governance split [7]; manual orchestration |
| **MetaGPT** | SOP-encoded assembly line | Encoding workflows as explicit SOPs (Zara's skills ≈ this) | Heavy framework |
| **Letta** | Memory-as-OS, self-editing memory | Self-editing memory blocks per agent | Full runtime adoption |
| **CAMEL / AgentVerse** | Emergent role-play, society sim | Inter-agent debate for hard calls | Research-grade, not production |

**Key borrow:** LangGraph's **checkpoint + HITL** model and Letta's **per-agent self-editing memory block**. Both map cleanly onto Zara's existing SQLite without adopting a foreign runtime. Don't migrate to any of these — Zara's OpenCode-native arch is fine. Steal the two ideas.

## 2.3 Collective intelligence gaps (the Ultimate Vision layer)

| Vision goal | Reality today | Gap |
|------------|--------------|-----|
| Shared memory | Single global DB (accidental sharing) | No agent attribution → can't tell who learned what; memory-pollution risk is REAL (one agent's wrong lesson poisons all) |
| Shared learning | All write to same patterns.json | But only Zara writes. Specialists don't reflect. |
| Collective reflection | `dreamConsolidate` runs solo | No cross-agent retro; @rhythm should own this but has no mechanism |
| No memory pollution | trust_score + contradiction detection exist | Not scoped per-agent; a bad Shield lesson can outrank a good Atlas fact |

**The pollution risk is the sharp edge.** Shared memory without provenance is a liability, not an asset. Before celebrating "collective intelligence," Zara needs **memory provenance** (which agent, which outcome, grounded or self-reported) so good lessons compound and bad ones get quarantined.

## 2.4 ICE-ranked gaps (Impact × Confidence × Ease, 1-5 each, score = product)

| # | Gap | I | C | E | Score | Phase |
|---|-----|---|---|---|-------|-------|
| 1 | Real embeddings behind MemoryStore (replace trigram) | 5 | 5 | 3 | **75** | Foundation |
| 2 | Grounded reflection (tests/lint feed reward signal) | 5 | 4 | 3 | **60** | Foundation |
| 3 | Memory provenance (agent + grounded flag + scope) | 5 | 5 | 4 | **100** | Foundation |
| 4 | Subagents call reflect() (give crew a learning loop) | 4 | 5 | 5 | **100** | Quick win |
| 5 | Wire @pulse/@probe to git+metrics+coverage | 4 | 4 | 4 | **64** | Quick win |
| 6 | Structured user model (psych/goals/values schema) | 4 | 3 | 3 | **36** | V1 |
| 7 | Live news/CVE ingest (freshness for @shield, Zara) | 3 | 4 | 3 | **36** | V1 |
| 8 | Per-agent self-editing memory blocks (Letta-style) | 4 | 3 | 2 | **24** | V2 |
| 9 | Temporal/graph relation layer (multi-hop recall) | 4 | 3 | 2 | **24** | V2 |
| 10 | Hundreds-of-subagents scaling for @hive | 2 | 2 | 1 | **4** | Defer/drop |

**Top 4 by score (#3, #4, then #1, #2) are the spine.** Note #10 ("hundreds of sub-agents") scores lowest — it's aspiration without a real use case. Flagging it as drop-unless-justified.

**Phase 2 conclusion:** The ecosystem doesn't need 10 agents each climbing 5 maturity levels. It needs **3 substrate fixes (provenance, real embeddings, grounded learning) + 1 quick win (subagents reflect)**. Do those four and all 10 agents level up simultaneously, because they share the substrate. That's the leverage the brief's per-agent matrix obscures.

# PHASE 3 — Memory & Knowledge System Design (Simple First)

## 3.0 CONFLICT I have to flag (you told me to)

This brief says: *"Don't use vector DB by default. Prove necessity first. Is SQLite + JSON + Knowledge Folder already enough?"*

My own Phase 1 said: *"Fake trigram embeddings are the #1 gap. Real embeddings = top lever."*

**These appear to contradict. They don't, once you separate two questions:**

- Phase 1's claim: the *retrieval quality* of the current 128-dim MD5-trigram hack is poor.
- This brief's claim: don't reach for a *vector database* (Pinecone, Qdrant, pgvector, a graph DB) to fix it.

**Both are right.** The resolution: you don't need a vector *database* to get real semantic search. You need a real *embedding function* writing into the SQLite you already have. The knowledge folder agrees with the brief, not with my over-eager Phase 1 framing:

- `knowledge/laws/galls-law.md`: "start with the simplest version that achieves the primary goal."
- `knowledge/code-smells/speculative-generality.md`: "do not add capability until there is a concrete, immediate need."
- `knowledge/values/simplicity.md`: "do what is needed and asked for, but no more."

**Corrected position:** Real embeddings are worth it (Phase 1 stands), but the *delivery mechanism* must stay inside SQLite (this brief wins). A vector DB is speculative generality. Verdict below in 3.4.

I'm recording this as a decision so I don't drift back to "just add a vector DB."

## 3.1 First-principles: what does "remember the owner for years" actually require?

Strip the buzzwords. Remembering a person over years needs exactly four things:

1. **Durable store** that survives crashes, is backup-able, inspectable. → SQLite. Done. Already there.
2. **A way to find the right memory** when it's relevant. → search (exact / FTS / semantic).
3. **A way to forget noise** so signal doesn't drown. → lifecycle rules (decay/archive). Mostly there.
4. **A model of who the person is** that updates. → structured user profile. Partially there, shallow.

Everything else (graph, event sourcing, distributed) is solving problems Zara does not have at one-user scale. At 1 owner × years × maybe 100k memories, SQLite handles it on a laptop without breaking a sweat. **Answer to the mandatory question: yes, SQLite + JSON + knowledge folder is enough for the storage and most of the retrieval. The one proven gap is semantic matching, fixable in-place.**

## 3.2 Clean Architecture: the layer separation (the brief's core ask)

The current code already has decent separation but blurs two things. Target layering:

```
┌─────────────────────────────────────────────┐
│ Orchestration (Zara + crew prompts)          │  ← personality, routing
├─────────────────────────────────────────────┤
│ Tools (MCP domain handlers)                  │  ← thin, stateless adapters
├─────────────────────────────────────────────┤
│ Cognitive Services                           │
│  ├─ MemoryStore   (facts/events/procedures)  │  ← memory-db.mjs (exists)
│  ├─ KnowledgeStore(articles + chunks)        │  ← exists, in same DB
│  ├─ UserModel     (who-am-I profile)         │  ← NEW, thin (3.5)
│  └─ Embedder      (text → vector)            │  ← NEW interface (3.4)
├─────────────────────────────────────────────┤
│ Storage                                       │
│  ├─ SQLite (source of truth)                 │  ← all memory + knowledge
│  └─ JSON   (config/preferences, git-friendly)│  ← settings, personality
└─────────────────────────────────────────────┘
```

**SOLID applied, minimally:**
- **SRP**: `Embedder` is one interface with one job (`embed(text) → vector`). Today `#trigramEmbed` is welded into `MemoryStore`. Extract it. That single extraction is the whole "open for extension" win, swap the impl, nothing else changes.
- **DIP**: `MemoryStore` depends on an `Embedder` *interface*, not a concrete embedder. Trigram becomes the default impl; a real model becomes an alternate impl. This is the clean seam that makes 3.4 a one-file swap.
- **OCP**: per `knowledge/practices/pain-driven-development.md`, don't abstract the embedder until you have the second implementation in hand. You now do (trigram + real). So the abstraction is earned, not speculative.

This is the ONLY structural refactor I'd recommend. Everything else is additive.

## 3.3 SQLite vs JSON: the boundary rule

The brief asks where each lives. Clean rule, one sentence each:

| Lives in SQLite | Lives in JSON |
|-----------------|---------------|
| Anything queried/searched/ranked/decayed | Anything read whole, edited by hand, or git-versioned |
| Episodic, semantic, procedural, knowledge chunks, reflections | preferences, personality config, communication style, hard settings |
| High write volume, needs indexes | Low write volume, human-authored, reviewable in a PR |

**Why split at all?** Because config you want to *see in a diff* and *edit in an editor* (personality.json, communication.json). Memory you want to *query and decay*. Putting hand-edited preferences in SQLite makes them invisible and unversionable; putting searchable memory in JSON makes search O(n) file parsing. The current code already gets this mostly right (config in `~/.zara/*.json`, memory in `memory.db`). Just formalize it.

Proposed JSON set (keep it small, resist sprawl):
```
~/.zara/
  identity.json        # canonical user name (exists)
  preferences.json     # hard prefs: language, tone, no-emoji, etc.
  personality.json     # Zara's own config: warmth, directness dials
  profile.json         # the UserModel snapshot (3.5) — denormalized read-cache
```
Resist `career.json`, `learning.json`, `goals.json` as separate files. Those are *memory*, not *config*. They change often, benefit from search and decay. Put them in SQLite as typed memories. **One JSON file per stable concern, not per topic.** (YAGNI: you listed 6 example JSON files; I'd ship 4, and 2 of those already exist.)

## 3.4 Search strategy + the embedding decision (with tradeoffs)

The brief's own roadmap (Phase 0→4, semantic last "only if needed") is correct. Where are we on it? **Already at "Phase 3" (FTS5 + knowledge + reflection all exist).** The only open question is the Phase 4 semantic layer. Decision table:

| Option | What | Complexity | Cost | Quality | Verdict |
|--------|------|-----------|------|---------|---------|
| **A. Keep trigram** | status quo | none | $0 | poor (no concepts, no cross-lingual) | Insufficient — proven gap |
| **B. FTS5 only, drop trigram** | lexical only | low | $0 | decent for exact terms, fails on paraphrase | Better than A for English keywords, still no concepts |
| **C. Local embedding model** | e.g. small ONNX/gguf model, run on-device, write vectors to SQLite BLOB (column already exists!) | medium | $0 ongoing, one-time setup | good, private, offline | **Recommended** |
| **D. API embeddings** | OpenAI/Voyage etc., cache vectors in SQLite | low code | $ per embed, network, privacy | best quality | Fallback if C too heavy |
| **E. Vector database** | Qdrant/pgvector/Pinecone | high | infra $ | marginal over C at this scale | **Reject — speculative generality** |

**Recommendation: C, behind the `Embedder` interface from 3.2.**

Reasoning:
- The `knowledge_chunks` table *already stores embeddings as BLOB* (`memory-db.mjs:296`). The plumbing exists; only the embed function is fake. This is a smaller change than it looks.
- Local model keeps the "zero external dependency / private / cheap / runs for years" property the brief demands. No API bill, no network, no vendor lock.
- At 1 user, cosine over a few thousand vectors in JS is microseconds. No ANN index needed. No vector DB needed.

**Tradeoffs of C:** adds one dependency (the model runtime), ~50-100MB model file, slightly slower writes (embedding latency). **Risk:** model file management across machines. **Alternative if that's unacceptable:** D (API) with aggressive caching, or stay B (FTS5-only) and accept no semantic matching. **Implementation complexity:** medium, ~1 day, isolated to one module because of the interface seam.

**Mandatory-question answer, restated:** SQLite + JSON + knowledge folder IS enough for storage, config, and lexical search. It is NOT enough for *semantic* recall, and that gap is real (not speculative). Fix it with an embedding *function* inside SQLite (C), never a vector *database* (E).

## 3.5 Personal Understanding: the UserModel (thin, not a psych profiler)

The brief wants a "who am I / what do I want / how do I think" model. The trap is building a fake personality-test engine (Big Five scoring, MBTI inference). That's speculative and ethically shaky, inferring someone's psychology from chat is low-confidence and high-creepiness.

**Simplest thing that works:** the six questions are just six *typed memory queries* over data Zara already captures. The "UserModel" is a **view**, not a new store.

| Question | Backed by | Source |
|----------|-----------|--------|
| Who am I? | `preference` + `fact` memories tagged identity/values | mostly user_explicit |
| What do I want? | `decision`/`fact` tagged goal | explicit + observed |
| How do I think? | `pattern` (reflections) + observed decision history | observed |
| What do I care about? | `preference` tagged interest/priority | explicit + observed |
| What am I working on? | `fact` tagged project + user_profile.active_projects | explicit |
| How am I evolving? | episodic timeline + contradiction history (preference changed) | observed |

`profile.json` (3.3) is a denormalized **cache** of this view, regenerated on consolidation, never the source of truth. **No new tables.** A `user_model_summary` MCP tool runs the six queries and assembles the picture. Explainable by construction: every claim traces to a memory with a source tag (explicit > observed > inferred). That directly satisfies the brief's "explainability" priority — Zara can always answer "why do you think I prefer X?" with the actual memory.

**Guardrail (ties to relationship-building brief):** never store *inferred* psychology as if explicit. The `source` field already enforces this. "Aldo seems stressed" is `inferred`, decays fast, never injected as fact. "Aldo said he's burned out" is `user_explicit`, durable.

## 3.6 Memory lifecycle rules (Signal > Noise)

The brief wants explicit create/update/merge/compress/archive/delete rules. Current code has decay+dreamer but the *capture* decision ("is this worth storing?") is ad-hoc. Proposed rules, dead simple:

**CREATE when** (any one):
- User says it explicitly about themselves/their work → store (`user_explicit`).
- A correction ("no, actually X") → store high-priority, overrides prior.
- An outcome worth learning from → episode.
- A reflection produced a reusable pattern → pattern.

**DON'T create when:**
- Transient task chatter ("read this file"), small talk, anything re-derivable.
- Inferred mood/psychology beyond a fast-decaying `inferred` note.

**UPDATE** when same key, new value → overwrite + bump reinforced (exists).
**MERGE** when two memories normalize to same text → dreamer merges (exists).
**COMPRESS** (distillation, the "100→10→1" ask): see 3.7.
**ARCHIVE** when decay_score < 0.1 and not policy/arch/preference → move to jsonl (exists).
**DELETE** only on explicit user request or contradiction resolution. Never silent hard-delete of user facts.

**Scoring (the brief's importance/frequency/recency/etc.):** Zara already computes `relevance = ftsScore × typeBoost × decayFactor × reinforceFactor × scopeBoost × trustFactor` (`memory-db.mjs:126`). That IS the multi-factor score the brief asks for, just named differently. Don't build a second scoring system. Map the brief's terms to existing factors, document it, move on. (Avoiding a duplicate scorer = YAGNI in action.)

## 3.7 Distillation: 100 conversations → 10 insights → 1 wisdom

The poetic ask, made concrete and cheap:

- **100 → 10**: This is `dreamConsolidate`'s "promote recurring episodic topics" (exists, `memory-db.mjs:423`), but currently keyword-frequency based and crude. Upgrade: cluster episodes by embedding similarity (once 3.4 lands), summarize each cluster into one `fact`/`pattern`. Runs on a schedule (the loop tool exists).
- **10 → 1**: Periodic reflection (the brief's "reflection framework") groups related insights into a durable `policy` or principle. This is already the doctrine: "Reflections that repeat = distill into rule via memory_learn(type: policy)." It's written in system.md; it's just under-executed.

**Key honesty:** distillation that *deletes* the source loses the audit trail. Rule: distillation *creates* a higher-level memory and *archives* (not deletes) the sources. "Memory that matters" stays queryable; raw noise gets archived, not destroyed. Reversible. Explainable.

## 3.8 Knowledge folder structure

Current `knowledge/` is DevIQ engineering articles (architecture, patterns, etc.) + Zara-authored (natural-voice, leadership). The brief proposes adding owner/career/psychology/projects folders.

**Recommendation: split by *source authority*, not just topic.**
```
knowledge/
  engineering/     # curated external canon (current DevIQ set) — STABLE, rarely changes
  zara/            # Zara's own authored knowledge (voice, leadership) — evolves
  owner/           # owner-specific: their projects, their decisions, their notes — grows
```
Why this cut: the three have different *lifecycles and trust levels*. Engineering canon is vetted, stable, read-only. Owner knowledge is personal, private, frequently updated. Mixing them invites the memory-pollution problem at the knowledge layer. **Don't create empty folders speculatively** (golf/psychology/etc.) — `knowledge/code-smells/speculative-generality.md` warns exactly against this. Create a folder when there's content to put in it. Markdown + the existing chunk-index is enough; no CMS, no DB-per-folder.

## 3.9 Framework comparison verdict (the brief asked, briefly)

Already covered in Phase 2.2. The simplicity-lens verdict: **adopt none of them.** Mem0/Zep/Letta/Cognee all add a runtime or service Zara doesn't need at 1-user scale. What to *steal* (ideas, not code): Mem0's extract-then-consolidate discipline (Zara has it), Letta's per-agent memory block (Phase 2, V2), Zep's bi-temporal idea (defer until multi-hop temporal queries are a proven need — not yet). Everything they offer that Zara lacks is either (a) the embedding quality, solved by 3.4 in-place, or (b) scale Zara won't hit.

## 3.10 The corrected evolution roadmap (matches brief's Phase 0-4)

| Phase | Brief's intent | Reality | Action |
|-------|---------------|---------|--------|
| 0: SQLite+JSON | foundation | DONE | formalize JSON boundary (3.3) |
| 1: FTS5 | full-text | DONE | nothing |
| 2: Knowledge layer | repo + retrieval | DONE | restructure folders by authority (3.8) |
| 3: Reflection layer | conversation→insight | DONE but shallow | ground the reward signal (Phase 2 gap #2) |
| 4: Semantic layer | "only if needed" | NEEDED, proven | embed *function* in SQLite, not vector DB (3.4 option C) |

**Phase 3 conclusion:** Zara is further along the brief's own roadmap than the brief assumes, already at Phase 3. The only genuinely missing piece is a real embedding function (Phase 4), and it belongs *inside* SQLite behind a clean `Embedder` interface, not in a new database. The UserModel is a view over existing memory, not a new store. Total net-new structure: one interface extraction + one embedder impl + one profile view + folder reorg. That's it. The rest is documentation and discipline.

# PHASE 4 — Runtime Platform Strategy (OpenCode-First)

## 4.0 Headline finding (changes the build plan)

The local-embedding fix I recommended in Phase 3 (option C) is **already a shipped, proven pattern in the OpenCode ecosystem.** `opencode-agent-memory` (291★, Letta-inspired) uses `all-MiniLM-L6-v2` via transformers.js for fully-local semantic search, "no data leaves your machine." [joshuadavidthomas/opencode-agent-memory]

This is decisive for three reasons:
1. It validates the approach (local model + SQLite, no vector DB) against a real community implementation, not just my reasoning.
2. `all-MiniLM-L6-v2` is the concrete model to use: 22M params, ~90MB, 384-dim, runs on CPU in JS. Drop-in for the `Embedder` interface.
3. It even ships the V2 "per-agent memory block" idea from Phase 2 (Letta shared blocks) AND a semantic journal. **Before building those, evaluate adopting/forking this plugin.** Don't reinvent what the community already maintains.

## 4.1 OpenCode native capabilities (verified from docs, Jun 2026)

| Native feature | What it does | Zara's current use | Gap / opportunity |
|----------------|-------------|---------------------|-------------------|
| Primary/subagent system | agent defs JSON/markdown, `@`-mention, Task tool | 10 agents defined | Using it well |
| Built-in `compaction` agent | auto-summarizes long context | not customized | **Exploit**: tune prompt to preserve memory-critical state |
| Built-in `summary` agent | session summaries | not used | **Exploit**: feed into episode capture |
| `explore`/`scout` subagents | read-only code + dep research | maybe duplicated | Audit for redundancy |
| `permission.task` | gate which subagents an agent invokes (glob) | not configured | **Exploit**: enforce crew routing at config level |
| `steps` (max iterations) | cap agentic loops | not set | **Exploit**: anti-doom-loop at platform level |
| `external_directory` perm | gate file access outside worktree | default | Security hardening available |
| Per-bash-command perms | glob bash gating (`git push: ask`) | global `bash: allow` | **Exploit**: replace blanket allow with git-safety globs |
| Skills (native `skill` tool) | on-demand instruction loading | 70+ skills, heavy use | Core strength |
| MCP integration | local + remote tool servers | Orchestrator + context7 | Core strength |
| Plugins + hooks | `chat.message`, `system.transform` | zara.mjs | Core strength |
| Model routing per agent | different model per agent | all default | **Opportunity**: cheap for plan/explore, strong for forge |

**Verdict on "exploit OpenCode before adding anything":** the 5 unexploited features (tuned compaction, `permission.task`, `steps`, per-command bash, per-agent model) are **all config changes, zero new code.** Cheapest win in the blueprint.

## 4.2 Native Capability Audit (brief's 4 questions)

| Zara need | Native-only answer | Verdict |
|-----------|-------------------|---------|
| Memory | SQLite (MCP) + local embedder. No framework. | ✅ Native sufficient (90MB model behind interface; ecosystem already does this) |
| Agent orchestration | Native agents + subagents + Task + `permission.task` | ✅ Native. No CrewAI/LangGraph/AutoGen |
| Knowledge mgmt | Skills + `knowledge/` + SQLite chunk index | ✅ Native. No vector DB |
| Reflection | `loop` tool + reflection.mjs + local storage | ✅ Native. No service |

All four needs answerable with OpenCode + SQLite + skills + knowledge. The forbidden-complexity list (k8s, graph DB, vector DB, microservices) is satisfiable. Zero cases require forbidden additions.

## 4.3 Features Utilization Matrix

| Zara Requirement | OpenCode Feature | Native | Extension Needed | Notes |
|------------------|------------------|--------|------------------|-------|
| Persona/voice | prompt + system.transform | Full | none | working |
| Long-term memory | MCP + SQLite | Partial | local embedder | only real gap |
| Crew specialists | subagents + markdown | Full | none | working |
| Crew routing | `permission.task` | Full | config only | not configured |
| Anti-doom-loop (crew) | `steps` cap | Full | config only | not set |
| Context compaction | built-in `compaction` | Full | tune prompt | unexploited |
| Session continuity | built-in `summary` + sessions | Full | wire to episode | partial |
| Knowledge retrieval | skills + SQLite chunks | Full | embedder helps | works |
| Reflection schedule | `loop` MCP tool | Full | none | working |
| Git safety | per-command bash perm | Full | config only | blanket-allow now (risk) |
| Cost control | per-agent model routing | Full | config only | unexploited |

Almost every "Extension Needed" = "config only" or "none." Single genuine code extension: the local embedder.

## 4.4 Skill-First Architecture (correction to the brief)

Not everything should be a skill. Skills = on-demand *stateless instructions*. Memory/reflection need *state* → MCP tools. Personality/relationship need *always-on* → system prompt.

| Brief's proposed skill | Exists? | Action |
|------------------------|---------|--------|
| Memory/Reflection/Knowledge/Learning | as MCP tools | Keep as MCP. Don't convert (they need state) |
| Golang/Arch/Security/Testing/Incident | golang-expert ✅, rest = agents | Correct split, leave it |
| Leadership/Communication/Career/Psychology | leadership-expert ✅, rest missing | Add `communication-coach`, `career-advisor` (markdown). Psychology = ethics caution |
| Owner Understanding/Relationship/Planning/Growth | in prompt + memory | These are behaviors, not skills. Don't skill-ify |

Current split (skills=knowledge, MCP=state, prompt=personality) is architecturally correct. Add 2-3 human-skills as markdown; convert nothing.

## 4.5 Cross-platform (Claude/Antigravity/Copilot/Codex)

| Asset | Portable? | Why |
|-------|-----------|-----|
| `knowledge/` markdown | ✅ Full | plain files |
| Skills (SKILL.md) | ✅ Mostly | Claude Code shares format |
| Agent prompts | ⚠️ Partial | Claude Code similar; Copilot/Codex no equivalent |
| MCP server | ✅ Full | MCP is the cross-platform standard |
| Plugin (hooks) | ❌ No | OpenCode-specific hooks |
| opencode.json | ❌ No | per-platform config |

**Strategy that holds:** durable value lives in the **MCP brain (server + SQLite + knowledge)** which is cross-platform. The OpenCode-specific layer (plugin, config, agents) is a **disposable skin**. Other MCP-speaking platforms get the brain immediately; personality/orchestration is a thin per-platform shim. Single source of truth = MCP+DB, NOT prompts. Don't try to make plugin hooks portable.

## 4.6 Context efficiency

Cheapest first: built-in compaction (tune to preserve memory state), memory token budget (exists, working), system.transform discipline (<500 tok/turn, working), on-demand skill loading (native, = community best practice). Skip the `caveman` token-squeeze skill (lossy, gimmicky, wrong for a companion). Zara's efficiency is already good; one upgrade = tune compaction to never drop open goals/user facts. Config + prompt, no code.

## 4.7 The 10 Success-Criteria Answers

1. **Optimal on OpenCode?** MCP brain (SQLite + knowledge) wrapped in OpenCode skin (plugin + crew + skills). Already does. Optimal = exploit the 5 unconfigured native features.
2. **Mandatory features?** Subagents+Task, MCP, skills, plugin hooks, permissions. Should-add: `permission.task`, `steps`, tuned compaction, per-command bash, per-agent model.
3. **Skills to build?** Almost none. Add `communication-coach`, `career-advisor`. Don't skill-ify memory/reflection/personality.
4. **Agents to build?** Zero. Fix substrate (provenance + subagent-reflect), don't add headcount.
5. **Knowledge structure?** Three-way by authority: `engineering/` (stable canon), `zara/` (self-authored), `owner/` (personal). Markdown + chunk index. No speculative empty folders.
6. **Memory structure?** Current 3-layer SQLite + chunks. One change: real embedder behind interface. UserModel = view, not tables.
7. **NOT building now?** Vector DB, graph DB, event sourcing, microservices, CrewAI/LangGraph/AutoGen, hundreds-of-subagents, psych profiler, JSON sprawl, plugin portability.
8. **MVP?** (a) memory provenance, (b) subagents call reflect(), + config-only native wins. Mostly config + one schema column + prompt edits.
9. **Defer?** Local embedder (V1), per-agent memory blocks (V2, eval adopting opencode-agent-memory first), temporal/graph (V3, only if proven need), cross-platform shims (when you use another platform).
10. **Stay simple 3-5 yrs?** (a) SQLite+JSON+markdown is permanent substrate, never "upgrade" without proof; (b) every capability asks "can native/existing MCP do this?" first; (c) Embedder seam = swap models without touching callers; (d) portable MCP brain + disposable OpenCode skin = platform churn never forces a rewrite.

## 4.8 Phase 4 conclusion

OpenCode-first isn't a constraint, it's already how Zara is built. Nothing in the JARVIS vision requires leaving OpenCode + SQLite + skills + knowledge. Cheapest highest-value moves are config-only (4.1). The one real code investment (local embedder) is validated by a 291★ community plugin you could adopt instead of build. Across all four briefs the thread resolves to one sentence: **Zara doesn't need to be built. It needs provenance, a real embedder, subagent reflection, and five config flags. Everything else is discipline.**

# PHASE 5 — Implementation Roadmap

Grounded in what was shipped + what remains. Ordered by ICE score from Phase 2.

## Shipped (this session, verified)
- Memory provenance: `agent` + `grounded` columns, TDD, 17/17 green, live DB migrated
- Subagent reflection: all 8 crew agents now call `reflect()` before returning
- Safety constitution: `ZARA_CONSTITUTION.md` (draft, pending ratification)
- Safety findings doc with prioritized gaps

## MVP (config-only, needs mas approval, zero new code)
- `permission.task` routing in `opencode.json` (enforce crew boundaries)
- `steps` cap on subagents (anti-doom-loop at platform level)
- Per-command bash deny patterns (git force-push, reset --hard, clean -f)
- Per-agent model routing (cheap for plan/explore, strong for forge)
- Tune built-in compaction agent to preserve open goals/user facts

Estimated effort: 30 min config editing. Risk: zero (config changes are instantly revertible).

## V1 (small code changes, needs approval)
| Item | Effort | What changes |
|------|--------|-------------|
| F2: reflect() default partial, evidence required for success | 1h | reflection.mjs (2 lines logic) |
| F1: widen memory write-gating (decision/pitfall require user_explicit) | 30m | memory.mjs handleLearn (1 line condition) |
| Embedder interface extraction (DIP) | 2h | memory-db.mjs (extract #trigramEmbed to module, inject) |
| Local embedder (all-MiniLM-L6-v2) | 4h | new tools/embedder.mjs, transformers.js dep, re-embed knowledge chunks |
| F3: `external_unverified` source tag | 1h | memory-db.mjs + memory.mjs |

## V2 (larger, evaluate before building)
- Evaluate adopting `opencode-agent-memory` (291-star Letta-style plugin) before building per-agent memory blocks from scratch
- Temporal/relation layer (only if multi-hop recall proves insufficient *with* real embeddings)
- Structured UserModel view tool (`user_model_summary` MCP)
- Knowledge folder reorganization (engineering/zara/owner split)

## V3 / Defer indefinitely
- "Hundreds of sub-agents" scaling for Hive (no use case)
- Graph database, vector database, event sourcing (YAGNI proven)
- Cross-platform plugin portability (accept disposable skin)
- Fake psychology profiler (ethics + speculative generality)

# PHASE 6 — Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Real embedder adds ~90MB model dep + startup time | High (certain) | Low (one-time load, cached) | Lazy-init on first semantic query; skip for FTS-sufficient cases |
| reflect() evidence requirement blocks legitimate no-test flows | Med | Med | Allow `partial` without evidence (the default); only `success` needs proof |
| Memory pollution before F1/F3 land (agents store wrong facts as observed) | Med | High (compounds via F2 loop) | Ship F2 first (breaks the compounding), then F1+F3 reduce injection surface |
| Embedder quality insufficient (MiniLM-L6 only 384-dim) | Low | Med | Proven in opencode-agent-memory ecosystem at similar scale. Upgrade path: swap impl behind interface |
| Dependency on transformers.js | Low | Low | MIT, widely used, drop-in replaceable. Single import behind the Embedder interface |
| Subagent reflect() is advisory (agents can skip) | Med | Low | It's prompt-instruction, not enforced. Improvement is probabilistic. Acceptable at this maturity. |
| Constitution rejected / over-ridden by user constantly | Low | Med | Then relax it. It's a draft. The user IS the override authority. |
| Context window pressure from 8 new reflect calls per crew turn | Low | Low | reflect() is one tool call, ~50 tokens. Negligible vs the analysis it returns. |

**Meta-risk to name honestly:** the single largest risk to this project is not technical. It's scope inflation. Five escalating mega-briefs in one session. The system works TODAY. The danger is continuously redesigning it instead of letting it accumulate real usage data. The roadmap above is deliberately short and exit-able at every phase boundary.

# PHASE 7 — Execution Plan

## Prioritization principle
"Biggest value at lowest complexity, and we stop when we stop feeling pain." (Pain-Driven Development, from `knowledge/practices/pain-driven-development.md`)

## Immediate (mas approves, I execute same day)
1. Five config-only items from MVP section (30 min)
2. F2 fix (reflection.mjs, the compounding-loop breaker)
3. F1 widen gating (1-line conditional)

## Next sprint (after 2+ weeks of real usage with provenance + config wins)
4. Embedder interface extraction (the DIP seam)
5. Drop in local embedder (MiniLM via transformers.js)
6. Re-embed knowledge chunks with real vectors
7. Measure: does semantic recall quality improve measurably? If not, revert.

## On-demand (triggered by actual pain, not roadmap)
8. F3/F5 (only if we observe external-content-to-memory or silent-delete as real problems)
9. opencode-agent-memory eval (only if per-agent memory is a proven need, not speculative)
10. UserModel view tool (only when mas asks "why does Zara think X about me?")

## Never (unless proven wrong by data)
- Graph/vector DB, k8s, distributed, event sourcing, full multi-agent framework adoption

## The STOP condition for this blueprint
This document is DONE. Phases 1-7 complete. The work it calls for is concrete, bounded, and mostly shipped or approved-queue. If more mega-briefs arrive asking for further research, the honest answer is: "the research converged. We're in execution mode now. What specific thing do you want built?"

---

## Sources
- [1] digitalapplied.com — Agent Memory Architectures: Vector vs Graph vs Episodic
- [2] wowhow.hashnode — Agent Memory Race 2026
- [4] mem0.ai / stackviv.ai — Reflexion & benchmarks
- [6][7] arxiv — ELL (2508.19005), MUSE (2510.08002)
- [8] arxiv 2601.07978 — Cost & Accuracy of LT Memory in Multi-Agent Systems
- [10] Salesforce SAGE-SWE
- SWE-bench / coding landscape: fungies.io, gradually.ai, codersera.com (2026)
