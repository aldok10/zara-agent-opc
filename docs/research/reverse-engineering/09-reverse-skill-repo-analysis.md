# reverse-skill Repo — Structure & Design Pattern Analysis

> Subject: `github.com/zhaoxuya520/reverse-skill` (branch `main`, tree SHA `fe2e2de`)
> Purpose: extract reusable architecture/design patterns for Zara's own reverse-engineering skill.
> Method: GitHub tree API + raw file fetch. No content copied, only structure + patterns documented.
> Date: 2026-06-21

---

## 1. Overall Architecture

The repo is a **file-based router-dispatcher** for security/RE skills. There is no code engine; the
"runtime" is the AI client reading markdown in a fixed order. Three layers:

1. **Rule layer** (`RULES.md`, `RULES_zh.md`, `.kiro/steering/reverse-routing.md`) — keyword triggers +
   the canonical behavior chain + anti-laziness enforcement. This is the entry contract.
2. **Router layer** (`skills/SKILL.md` + `skills/routing.md`) — master index + a 3-axis routing matrix.
3. **Subskill layer** (`skills/<name>/SKILL.md` + `references/` + `scripts/`) — ~21 leaf skills, plus a
   sibling `CTF-Sandbox-Orchestrator/` with 40+ competition sub-skills.

Cross-cutting infra: `skills/scripts/` (bootstrap + tool-discovery + refresh-index), `tool-index.md`
(generated registry), and `skills/field-journal/` (the learning/write-back loop).

Sources: `ARCHITECTURE.md`, `skills/SKILL.md`, `RULES.md`.

### Dispatch flow (from ARCHITECTURE.md mermaid + RULES.md behavior chain)

```
keyword trigger → read RULES.md → read precedent-auth.md → detect package root
→ read SKILL.md + routing.md → 3-axis route match
→ check field-journal/_index.md for prior experience
→ read tool-index.md (NEVER guess paths) → bootstrap if tool missing
→ enter subskill SKILL.md → execute → generate report+diagram
→ write back field-journal → update _index/routing/manifest
```

---

## 2. Routing Matrix Format (`skills/routing.md`)

Three separate lookup tables, all pointing at a subskill `SKILL.md` or a specific `references/*.md`:

- **By Target Type** — `| Target Type | Recommended Entry | Alternative |` (e.g. `APK → apk-reverse/`,
  fallback `→ ida-reverse/` if core is `.so`).
- **By User Intent** — `| User Says | Route To |` — natural-language phrases (bilingual) mapped to a file
  (e.g. `"find frontend signature" → js-reverse/SKILL.md`). This is the largest table (~80 rows).
- **By Toolchain** — `| Tool | Related Module |` — reverse lookup from a tool name to its owning skill.

Plus two prose sections: **Route Not Matched** (propose a new skill, do NOT force-fit) and **Path
Crossing** (named multi-module pipelines like "APK Reverse Path", "Binary Reverse Path"). The matrix is
enforced as a contract: routing MUST complete before any action, and all three axes SHOULD be matched.

Source: `skills/routing.md`.

---

## 3. Tool-Index + On-Demand Bootstrapping

- `tool-index.md` is a **generated single source of truth** for tool availability. The repo ships only
  `tool-index.template.md` / `tool-index.md.template`; the real file is produced by
  `refresh-tool-index.ps1` / `.sh`. Two tables: a per-tool availability table (Tool, Skill, Purpose,
  Available, absolute Path, Version, Source, Script Reference) and an MCP-service capability table
  (Tool Available / MCP Registered / Service Online / Auto-installable / Install Method).
- Hard rule: **never guess paths** — read the index; paths must be absolute. It's a shared registry so
  multiple CLI clients don't reinstall what another already installed.
- **Bootstrap** is declarative via `bootstrap-manifest.json` with a `bootstrapKind` enum
  (`github-release-zip`, `github-release-jar-wrapper`, `pip-package`, `npm-mcp`, `local-http-mcp`,
  `winget-package`, `apt-package` on Kali). On detecting a missing tool, a skill calls
  `bootstrap-reverse.ps1 -Capability @('x')` instead of erroring, then re-runs refresh to persist paths.
  Tool discovery lives in `lib/ToolDiscovery.ps1` (`Get-ReverseToolCatalog` with fallback path chains).
- Dual-platform: `skills/scripts/*.ps1` (Windows, winget/zip) mirrors `kali/scripts/*.sh` (apt/pip/tar).

Sources: `skills/tool-index.template.md`, `skills/CONTRIBUTING.md` (§4, §9), `ARCHITECTURE.md`.

---

## 4. Field-Journal Auto-Evolution / Write-Back

A markdown-only memory loop in `skills/field-journal/`:

- `_template.md` — fixed schema for each entry: scenario class, objective, full execution chain
  (including dead-ends), **pitfalls table** (problem / cause / fix / time-cost), tool-chain findings,
  key code, "improvements to this package" (routing? bootstrap? docs?), reusable snippets, **evolution
  actions checklist** (updated routing / tool-index / manifest / subskill / pitfalls), env info,
  **anonymization requirements**, and a mandatory `_index.md` sync step.
- `_index.md` — hand-maintained inverted index: stats, by-scenario buckets, seed vs real distinction
  (`seed-*` are 17 pre-seeded reference cases; dated files are real). New task → query index first,
  reuse verified flow; if a past solution doesn't apply, the new entry must explain why.
- `precedent-*.md` — authorization/precedent files read up-front (`precedent-auth.md` always, reverse/
  pentest lazily) to pre-clear safety hesitation.
- Auto-merge: `.github/workflows/auto-merge-journal.yml` automates PR-ing journal entries back.
- Completion checklist in `RULES.md` forces write-back: generate report + diagram + journal entry +
  persist searched knowledge to `references/` + update indexes.

Sources: `skills/field-journal/_template.md`, `_index.md`, `RULES.md`, `.github/workflows/`.

---

## 5. Subskill SKILL.md Conventions

Per `CONTRIBUTING.md`, every subskill `SKILL.md` carries YAML frontmatter (`name`, `description` with
explicit trigger phrasing, bilingual) and required sections: 适用范围/scope, 工具依赖 (tool table with
"auto-installable" column), 工作流 (numbered workflow), **按需自举/On-Demand Bootstrap** (capability
boundary table + trigger points + manual fallback), and **路由上下文** (upstream entry / downstream
exits / sibling modules — making the graph navigable both ways).

Two mandatory "compliance engineering" blocks from the latest version: an **ACTION REQUIRED** header
(3-5 `NOW/NEXT/ACT` steps so the model executes instead of acknowledging) and a **task completion
self-check** footer. RFC-2119 terms (`MUST/MUST NOT/SHOULD/MAY`) are required over suggestive language.
The `ida-reverse/SKILL.md` is the exemplar: it leads with a "pitfalls / 踩坑" section, documents 72 MCP
tools by category, and pushes deterministic script wrappers (`start.ps1`/`open.ps1`) over ad-hoc shell.

Sources: `skills/CONTRIBUTING.md` (§0, §3, §3.1, §3.2), `skills/ida-reverse/SKILL.md`.

---

## 6. What to ADOPT vs SKIP for Zara

Zara already has MCP memory (`memory_recall`/`memory_learn`/`reflect`), `knowledge_read` on-demand
loading, `reflect_suggest`, and a skill-gate. So map their file-mechanisms onto our tool-based ones.

**ADOPT:**

- **3-axis routing matrix** (target type × user intent × toolchain). Bake into our reverse-engineering
  `SKILL.md` as a lookup table; it's the highest-leverage, lowest-cost idea here.
- **Path-Crossing pipelines** — named cross-module chains (APK→.so→IDA→Frida). Encode as procedures via
  `memory_procedure` so they're recallable, not just documented.
- **Field-journal schema → episodic memory.** Their `_template.md` pitfalls/evolution-actions table is
  an excellent structure for `memory_episode` + `reflect`. We get the index "for free" via semantic
  recall instead of a hand-maintained `_index.md`.
- **Seed cases.** Pre-seed a handful of canonical RE episodes (packed ELF, stripped Go, IL2CPP, etc.) so
  cold-start recall has something to match.
- **Tool-availability check before path use** — but via a lightweight runtime probe (`which`/version),
  not a committed registry file. Keep "never guess paths".
- **"Route not matched → propose new skill"** as an explicit branch.
- **Up/down navigation context** in the skill (upstream/downstream/sibling) — cheap, improves chaining.

**SKIP / DON'T PORT:**

- **PowerShell-first bootstrap + `bootstrap-manifest.json` + ToolDiscovery.ps1.** We're macOS/Unix;
  prefer the `kali/*.sh` style or just brew/pip/npx on demand. The whole Windows manifest machinery is
  overhead for us.
- **Committed `tool-index.md` as shared registry.** Stateful generated file = drift risk; replace with
  on-the-fly detection + memory note. (Their template even warns it goes stale.)
- **Global config self-injection** (writing routing rules into `~/.claude/CLAUDE.md` from RULES.md).
  Invasive; Zara's skill-gate + AGENTS.md already handle activation.
- **Anti-laziness "excuse rebuttal" tables + "MUST NOT output safety/legal disclaimers".** Aggressive
  obedience-engineering and disclaimer-suppression conflict with Zara's safety posture. Keep the *spirit*
  (execute, don't just acknowledge) which we already have via action-first execution.
- **`.kiro/steering` duplication and bilingual `_zh` doubling** — we keep a single source, mixed ID/EN
  naturally.
- **Offensive breadth** (EDR bypass, C2, AD attack playbooks). Out of scope; adopt structure, not payload
  content.

---

## Key Source Files Cited

- `ARCHITECTURE.md` — full behavior-chain + module + bootstrap + evolution mermaid diagrams
- `skills/SKILL.md` — master entry, module table, routing execution contract
- `skills/routing.md` — the 3-axis routing matrix + path-crossing
- `RULES.md` — entry contract, completion checklist, error-handling, anti-laziness tables
- `skills/CONTRIBUTING.md` — subskill schema, bootstrap-manifest spec, MCP integration flow
- `skills/ida-reverse/SKILL.md` — exemplar subskill (pitfalls, 72-tool catalog, script wrappers)
- `skills/field-journal/_template.md` + `_index.md` — auto-evolution write-back mechanism
- `skills/tool-index.template.md` — generated tool registry format
- `.kiro/steering/reverse-routing.md` — Kiro auto-trigger keyword steering
