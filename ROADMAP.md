# Zara Agent Roadmap

## Current Release: v1.1.1

### v1.1.1 - Self-Audit & Hardening (shipped 2026-06-26)
- [x] Behavioral eval harness (26 regression tests, CI-gated)
- [x] Per-turn token/cost telemetry (SQLite + metrics_today tool)
- [x] Grounded reflection (test_exit_code rejects ungrounded success)
- [x] Semantic embedder wired (ZARA_EMBED=semantic default, lazy init)
- [x] Token diet: zara.md -53%, per-agent model routing, permission.task
- [x] Cross-platform fixes (fileURLToPath, Windows paths, Node 22.14+ enforced)
- [x] Dependency pinning (@huggingface/transformers exact version)
- [x] Install script: Node version check + npm install + env fallbacks

## Next Up: v1.2.0 - Universal Install (target: July 2026)

### v1.2.0 - Zero-Friction Install (#72, #73, #76)
- [ ] One-command install for all OS (npx or curl pipe)
- [ ] Native Windows PowerShell installer (no bash required)
- [ ] Post-install smoke test (verify MCP server responds)
- [ ] AI-mode flag for machine-readable install status
- [ ] GitHub Actions CI matrix (ubuntu, windows, macos x Node 22/24)
- [ ] Fix all Windows-specific bugs (import paths, process groups, music module)

### v1.3.0 - Security & Performance (target: August 2026)
- [ ] Eliminate shell script generation in music module (direct spawn)
- [ ] Sanitize all user inputs passed to shell commands
- [ ] Fuzz test: random inputs to all MCP tools
- [ ] Memory store scalability: LIMIT queries, pre-filter by section
- [ ] Benchmark recall latency at 1k/5k/10k memories
- [ ] Consider sqlite-vec for native ANN search

## Medium-term (Q4 2026)

### v2.0.0 - Platform Expansion (target: October 2026)
- [ ] IDE-agnostic (VS Code extension, JetBrains plugin)
- [ ] CLI-only mode (no OpenCode dependency)
- [ ] Web UI for knowledge management
- [ ] REST API for external integrations

### v2.1.0 - Advanced Coordination (target: December 2026)
- [ ] Hierarchical swarm coordination (nested swarms)
- [ ] Multi-repository support
- [ ] Cross-team knowledge sharing

## Long-term (2027+)

### v3.0.0 - Enterprise Features
- [ ] Team analytics dashboard
- [ ] Engineering metrics and KPIs
- [ ] Compliance and audit trails
- [ ] SSO and team management

## Legend

- :white_check_mark: Shipped
- :hourglass_flowing_sand: In progress
- :dart: Planned
