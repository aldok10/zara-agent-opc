# Changelog

All notable changes to Zara Agent will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-19

## [0.4.1] - 2026-06-25

### Maintenance
- chore(ci): bump actions/checkout from 4 to 7 (bdd1a84)

### Other
- Merge pull request #2 from aldok10/dependabot/github_actions/actions/checkout-7 (f227b24)


## [0.4.0] - 2026-06-25

### Added
- feat(ci): re-enable dependency-review-action (Dependency Graph now active) (79265f0)
- feat(ci): add GitHub→GitLab reverse sync workflow (17e84b1)

### Fixed
- fix(ci): remove dependency-review-action (requires Dependency Graph enabled) (50eaece)

### Other
- Merge branch 'fix/ci-remove-dep-review' into 'main' (af37402)


## [0.3.2] - 2026-06-25

### Fixed
- fix(ci): run tests sequentially to avoid SQLite lock contention (4ac47e3)

### Other
- Merge branch 'fix/ci-test-concurrency' into 'main' (702f036)


## [0.3.1] - 2026-06-25

### Fixed
- fix(ci): commit package-lock.json, fix CodeQL language (7470aed)

### Other
- Merge branch 'fix/ci-github-workflow' into 'main' (6d53048)


## [0.3.0] - 2026-06-25

### Added
- feat(ci): add GitHub mirror job, configure cross-platform tokens (40011ec)
- feat(ci): add GitHub release from mirrored tags (1b809a8)
- feat(quality): skill dependency graph, routing validation tests (aeb03fd)
- feat(resilience): graceful degradation, feedback loop, failure recovery (4c6ade7)
- feat(security): memory coherence, completeness check, skill integrity (a279735)
- feat(skills): add php-extension-dev skill (58b2d96)
- feat: skill learning engine (1313040)
- feat: skill learning engine (discovery + gap detection + self-improvement) (1285876)
- feat: user_model tool, skill_routes (132 signals/32 skills), shield CVE awareness, AGENTS.md fix (fd3866c)
- feat(skill-routes): expand seed to 132 signals across 32 skills (49e32b7)
- feat: skill_routes table with migration + 59 default signals (eed0476)
- feat: AGENTS.md count fix, user_model tool, @shield CVE awareness (85bc851)
- feat: response routing + self-audit (prompt-master disciplines) (cb22e3b)
- feat: response template routing, content waste detection, pre-action intent extraction (80f8d57)
- feat: constitution enforcement + plugin e2e test (0c8ceea)
- feat: constitution enforcement (P1 preference gate, P7 bulk confirm, secrets regex) + plugin e2e test (b487448)
- feat: /learn command, @hive coordination, /auto blocking gates (9035267)
- feat: /learn command, @hive coordination rules, /auto blocking gates (658a4ae)
- feat: attention zones, smart dispatch, trust escalation, voice drift, proactive intelligence (0dc9705)
- feat: trust escalation v1, voice drift fixes, proactive intelligence (18aad45)
- feat: model routing, compaction agent, identity test fix, knowledge re-seed script (a2f0ba8)
- feat(agents): add data context requirements to probe/pulse, add reflect evidence gate (df6502c)
- feat(distill): add failure pattern extraction command and documentation (a48bfdb)
- feat(guard): add two-layer guardrail system with prompt injection detection (f72715f)
- feat(observe): add per-agent cost and latency tracking (ee4a7b5)
- feat(memory): add lightweight knowledge graph with entity extraction (23b7df5)
- feat(protocol): add comprehensive dispatch protocol for subagent isolation (49118c4)
- feat(agents): add reflection protocol to all subagent prompts (713e5ff)
- feat(windows): FTS5 fallback, Windows install guide, Node 24 compat (77cd1dc)
- feat(zara): add skill self-improvement DNA to continuous learning (65499c7)
- feat(memory): learning report, external_unverified source, delete audit (f1f15c1)
- feat(memory): semantic contradiction detection (2167 false positives → 0) (4178fd9)
- feat(memory): semantic re-ranker for recall + pattern normalization + agent provenance (b2ea66b)
- feat(memory): add semantic embedder with all-MiniLM-L6-v2 (52deef0)
- feat(memory): add provenance tracking (agent + grounded columns) (d4fefc1)
- feat(agents): add reflect() call before return to all agents (88a73c3)
- feat: trust calibration on reflect, auto-fact extraction, flow detection, remove dead hooks (93ba8f7)
- feat(memory): add dedup-on-learn, trust scoring, and memory_delete tool (fd1fc5a)
- feat(plugin): add workspace memory, debate, and context compression (bd82696)
- feat(install): add comprehensive opencode installer with full config merge (e59d323)
- feat(ci): add release pipeline with auto-tagging and changelog (258696b)
- feat(commands): add version check and self-update system (080b864)
- feat(agents): add voice plugin, collaboration model, SSS-grade agent clarity (e81b4dd)
- feat: add efficient memory storage rules from research (5d2f15c)
- feat: add reflection-to-rule distillation and commit round 2 residuals (499b98d)
- feat: deepen social intel implementation (round 2) (b7be3be)
- feat: implement social intelligence research findings for agent interaction (b7f2426)
- feat: add non-negotiable session persistence rule (27c3912)
- feat: sharpen agent boundaries, add codebase-onboarding skill, upgrade planning workflow (7318af5)
- feat: crew upgrade, knowledge seeding, and docs alignment (5204893)
- feat(config): update opencode.json, skills, and commands for new agent names (f7a14cf)
- feat(knowledge): add security, architecture, and loop-engineering knowledge base (d34c622)
- feat(agents): rename and upgrade all agents with personalities and relationships (8c10a8d)
- feat(docker): add opencode-web service to docker-compose for web interface (03ff52b)
- feat(peinfo): add PE/DLL analysis tool using Go standard library (11556a2)
- feat(config): sync project config to global, register all commands, self-contained Docker (239c855)
- feat(zara.sh): add path validation and improve article listing (3942546)

### Fixed
- fix(ci): use RELEASE_TOKEN (project access token) for push to main (3ea4f37)
- fix(ci): strip existing auth from remote URL before injecting token (3d4496a)
- fix(test): skip global-only skills in CI, only verify project skills (86ae47d)
- fix(voice): remove em dashes from all agent prompt files (089cd98)
- fix(ci): add @opencode-ai/plugin devDep, use node:22-slim for glibc (6a0e60a)
- fix(ci): escape YAML special chars in skill-integrity script (ffa4f6f)
- fix(ci): add workflow:rules to prevent empty pipeline failures (c3d68f9)
- fix(ci): GitHub is mirror only, remove release workflows (9c97d03)
- fix(ci): rewrite GitHub Actions CI with lint+test matching GitLab (6dd42e2)
- fix(ci): rewrite pipeline with lint+test stages, fix detached HEAD push (fd5b20b)
- fix(ci): push HEAD refspec on detached HEAD, fail on push error (8457921)
- fix(ci): fetch tags before verify-tag check (a65a780)
- fix(security): skill routing gate, context receipt, agent MCP scoping (3ccfa3f)
- fix(security): shell injection, memory source attestation, verification gate (6a01938)
- fix(security): expand secrets regex, delete dead PrivacyBridge, remove unused export (05b7d9c)
- fix: compaction agent description, add @forge to README sub-agents list (7650328)
- fix(review): add OVERRIDE as table row, cap distill at 3 proposals per run (b096758)
- fix(mcp): replace silent catch blocks with stderr logging in critical paths (64c1878)
- fix(tests): align all tests with current exports, fix dedup false positives (cf677bf)
- fix(permission): remove unused zara-privacy configuration (177ba6c)
- fix(graph): consistent JSON array storage format (9da8a57)
- fix(guard): wire matchInjection into GuardService.check (24f76e2)
- fix(session): disable broken contradiction auto-run at session end (d7996ff)
- fix(session): add 12h TTL fallback for stale sessions (3266748)
- fix(reflection): tighten trust calibration and reward defaults (1a52166)
- fix(memory): expand source guard to decision/pitfall types (7b765cb)
- fix(mcp): restore patterns, zara_evolve_status, blindspot_log, blindspot_check tools (eb91d7e)
- fix(memory): guard deleteByPattern against broad patterns, add countByPattern, cap recalledKeys (f52a745)
- fix: THINKING_RE lastIndex bug, remove duplicate resume tools, clean .gitignore (d093781)
- fix(mcp): music stale-pid guard, pipe error handler, loop type-check, unhandled promise catch (f2b3d05)
- fix(session): deep sanitize user_profile update to prevent prototype pollution (1a51e27)
- fix(social): persist countInteraction to disk (60123b7)
- fix: resolve tech debt from audit findings (e91327b)
- fix(docs): purge last 6 em dashes in install.md and natural-voice (9ea22ea)
- fix(docs): resolve 10 remaining issues from re-grade audit (b4515ca)
- fix(docs): update stale counts and purge em dashes across all markdown (11e8dc0)
- fix(voice): remove all em dashes from system.md and knowledge-seeding.md (cbaaf4e)
- fix(voice): add Anti-AI directive with em dash ban to all sub-agent prompts (5fe9d87)
- fix(Dockerfile): add ffmpeg to dependencies for enhanced media processing (dffee2c)
- fix(docker): use yt-dlp_linux_aarch64 standalone binary instead of python script (0b5ed67)
- fix(system.md): enhance music playback instructions to include tool checks (d8179fd)
- fix(system.md): clarify knowledge seeding process and update terminology (0f90bb7)

### Changed
- refactor(skills): merge duplicates, add agent contracts and conflict protocol (d4b2ebd)
- refactor(knowledge): reorganize reverse-engineering into 83 domain-grouped files (eaaba97)
- refactor(config): migrate tool permissions to permission format (c08c5f5)
- refactor(plugin): remove duplicate tools from memory plugin (MCP is source of truth), extract FlowDetector (80a72d9)
- refactor(mcp): consolidate reflection tools (patterns, evolve_status, blindspots) (938ee0b)
- refactor(mcp): consolidate metrics_today, micro_tools, workflow_rules into dashboard (28e135c)
- refactor(mcp): remove memory_stats (available via dashboard tool) (c65af8e)
- refactor(mcp): remove chm2md tools (CLI-only, not MCP-appropriate) (1a38355)
- refactor(mcp): merge user_identity into user_profile(action: discover) (b321290)
- refactor(social): remove duplicate MusicService, keep MCP as canonical player (fc956df)
- refactor(plugin): migrate workspace+debate tools to @opencode-ai/plugin tool() API (2030c98)
- refactor: remove dead state fields and unused flow.onMessage (c274d40)
- refactor(security): consolidate SECRET_PATTERN to single source of truth (162b951)
- refactor(plugin): delete yagni from dev, social, evolve, flow modules (c426d3c)
- refactor: deeper compaction from roast v2 findings (381ab40)
- refactor: compact prompt files based on self-roast findings (79828bb)

### Documentation
- docs(php-expert): add documentation reference links to all knowledge files (5c509a4)
- docs(research): add safety findings and Jarvis blueprint analysis (34c7479)
- docs: add Zara Constitution (safety and governance principles) (f914ffe)
- docs: update tool counts to reflect MCP reduction (32 -> 22 tools) (caeb240)
- docs: fix tool counts (31→32), add memory_delete to reference, fix Quick Start syntax, add missing codebase-onboarding skill (8d11882)
- docs: sync all docs with current reality (d7b998c)
- docs: update README and plugins.md to reflect current state (229122c)
- docs: update all documentation with new agent names and correct counts (c37b663)

### Maintenance
- chore(deps): add Dependabot (GitHub) and Renovate (GitLab) config (79acff1)
- test(embedder): add contract tests for embedder interface (b714708)
- chore: remove package-lock.json from repository (already in .gitignore) (d2ba536)
- test(memory): add provenance migration and ranking tests (705f12e)
- test: add tests for flow detector, memory dedup, memory delete safety, trust calibration (5930f98)
- chore: remove config.yaml (opencode.json is source of truth) (83a7a79)
- chore: delete dead scripts (ps1, bat, validate-config, setup-knowledge) (ee76076)
- chore: add .tasks/, .opencode/mcp/, OS files to gitignore (a6a3be5)

### Other
- Merge branch 'fix/ci-bump-push-url' into 'main' (e45bde5)
- Merge branch 'fix/ci-pipeline-rewrite' into 'main' (037aae2)
- Merge remote-tracking branch 'origin/fix/ci-detached-head-push' into fix/ci-pipeline-rewrite (900fc0a)
- Merge branch 'fix/ci-verify-tag' into 'main' (729e4ce)
- Merge branch 'fix/sprint1-security-verification' into 'main' (a98d9c8)
- merge: integrate feature/reverse-engineering, fix personal-paths test (6add742)
- Merge branch 'feat/observability' (4a575c6)
- Merge branch 'feat/guardrails' (e2601b6)
- Merge branch 'feat/knowledge-graph' (d49518d)
- Merge branch 'feat/dispatch-protocol' (f865541)
- Merge remote-tracking branch 'origin/feature/windows-compatibility' (4f36765)
- Merge branch 'feat/agent-boundaries-and-skills' (201ef7c)
- Merge branch 'feat/agent-boundaries-and-skills' (937865b)
- Merge branch 'feat/crew-upgrade-and-knowledge' (ddbcd85)
- Add repository structure tests, implement zara CLI tool, and add TUI configuration (483830a)


### Added

- Initial open-source release
- 9 specialized sub-agents: Atlas (Architect), Lens (Code Reviewer), Probe (Testing Lead), Shield (Security Reviewer), Pulse (Delivery Lead), Rhythm (Loop Engineer), Hive (Swarm), Sketch (Plan), Forge (Implementation)
- DevIQ knowledge base integration (254+ articles, 13 sections)
- Hermes-inspired skill system with auto-creation and refinement
- Cross-session memory with journal and skills index
- Swarm coordination for complex multi-agent tasks
- Context7 integration for live documentation fetching
- Hivemind unified memory across AI agents
- Senior dev principles (8-point engineering DNA)
- Layered prompt system (system, tool, workflow, user)
- YAML-based configuration with environment variable override
- CLI tool for knowledge navigation and management
- Comprehensive documentation and examples
- GitHub Actions CI/CD pipeline
- Community contribution templates

### Known Limitations

- Knowledge base articles must be downloaded separately (DevIQ)
- Context7 API key required for live documentation fetching
- Swarm coordination requires OpenCode AI runtime
- Memory persistence limited to local file system