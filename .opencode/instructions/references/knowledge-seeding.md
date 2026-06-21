# Knowledge Seeding (Fresh Install Only)

Referenced from `.opencode/instructions/system.md`. Runs ONCE on a fresh install when `memory_recall` returns < 5 results on the first session. Skip entirely otherwise.

## Trigger

If `memory_recall` returns < 5 results on first session (fresh install), seed ALL project knowledge to memory.

## Quick Method (preferred)

Call `knowledge_load_init()` — one MCP call that scans ALL knowledge folders (project + skills), reads every .md file, groups by section, and stores to semantic memory automatically.

## Manual Method (if knowledge_load_init unavailable)

Use sub-agents with `knowledge_read` per article.

### Phase 1: Natural Voice (Critical — Load First, Inline)
```
knowledge_read(path: "natural-voice/_index.md")
knowledge_read(path: "natural-voice/self-learning-protocol.md")
knowledge_read(path: "natural-voice/banned-vocabulary.md")
knowledge_read(path: "natural-voice/mentor-patterns.md")
knowledge_read(path: "natural-voice/sentence-structure.md")
knowledge_read(path: "natural-voice/discourse-patterns.md")
knowledge_read(path: "natural-voice/emotional-authenticity.md")
knowledge_read(path: "natural-voice/cognitive-simulation.md")
knowledge_read(path: "natural-voice/indonesian-naturalness.md")
knowledge_read(path: "natural-voice/conversational-pragmatics.md")
```

### Phase 2: All Engineering Sections (Via Sub-Agents, Parallel)

Dispatch sub-agents to read and memorize ALL articles in each section:
```
knowledge_load(section: "principles")      → knowledge_read each listed article → memory_learn as policy
knowledge_load(section: "practices")       → knowledge_read each listed article → memory_learn as workflow
knowledge_load(section: "antipatterns")    → knowledge_read each listed article → memory_learn as pitfall
knowledge_load(section: "architecture")    → knowledge_read each listed article → memory_learn as architecture
knowledge_load(section: "design-patterns") → knowledge_read each listed article → memory_learn as architecture
knowledge_load(section: "code-smells")     → knowledge_read each listed article → memory_learn as pitfall
knowledge_load(section: "testing")         → knowledge_read each listed article → memory_learn as workflow
knowledge_load(section: "ddd")             → knowledge_read each listed article → memory_learn as architecture
knowledge_load(section: "laws")            → knowledge_read each listed article → memory_learn as fact
knowledge_load(section: "values")          → knowledge_read each listed article → memory_learn as policy
knowledge_load(section: "terms")           → knowledge_read each listed article → memory_learn as fact
knowledge_load(section: "tools")           → knowledge_read each listed article → memory_learn as fact
```

### Phase 3: Standalone Docs
```
knowledge_load(doc: "leadership")
knowledge_load(doc: "leadership-frameworks")
knowledge_load(doc: "owasp")
```

### Phase 4: Project Files
Read `prompts/philosophy.md` and `AGENTS.md` — store as architecture/workflow memories.

## Storage Rules

For each article read: extract core actionable content (1-3 sentences) → `memory_learn` with `user_explicit` source.

After ALL phases complete: `memory_learn(key: "knowledge_seeded", value: "true, seeded on [date], 268 articles loaded", type: "fact")`
