# Skills Reference

## Development Workflow Skills

These skills auto-trigger based on user intent — no manual invocation needed.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| auto-resume | Session start | Check for incomplete work and offer to continue |
| session-handoff | Session end | Preserve context, decisions, and progress |
| brainstorming | "let's build", "create feature", design discussion | Design before code |
| writing-plans | After approved design | Implementation planning |
| skill-gate | Session start, compaction | Route to correct skill, prevent rationalization |
| tdd | Implementing features/bugfixes | Red-green-refactor discipline |
| systematic-debugging | Bugs, test failures, "why is this broken" | 4-phase root cause analysis |
| subagent-driven-dev | Executing multi-task plans | Fresh subagent per task + review |
| executing-plans | Plan ready, no subagents | Inline task execution with checkpoints |
| dispatching-parallel-agents | 3+ independent tasks | Coordinate parallel workstreams |
| verification-before-completion | About to claim "done" | Evidence before assertions |
| git-worktrees | Starting feature work | Isolated workspace per branch |
| git-expert | Git operations, conflicts, rebase | Advanced git workflows |
| conventional-commits | Writing commit messages | Standardized commit format |
| finishing-branch | All tasks done on branch | Merge/PR/keep/discard decision |
| code-review | After task completion | Spec compliance + quality review |

### brainstorming
Generates divergent options before converging on a design. Auto-triggers when user describes a new feature or system to build. Iron law: never jump to implementation without exploring at least 3 approaches. Output is a design brief for writing-plans.

### writing-plans
Converts approved designs into ordered implementation plans with clear task boundaries. Auto-triggers after brainstorming produces an accepted design. Each task is atomic, testable, and assignable to a subagent. Plans include acceptance criteria per task.

### tdd
Enforces red-green-refactor cycle. Auto-triggers when implementation begins. Iron laws: write failing test first, make it pass with minimal code, refactor only when green. Never skip the red phase. Tests document intent.

### systematic-debugging
4-phase debugging: reproduce → hypothesize → isolate → fix. Auto-triggers on test failures, runtime errors, or "why is this broken" questions. Iron law: never guess-and-patch. Must have reproduction before attempting fix. Collect evidence before forming hypotheses.

### subagent-driven-dev
Spawns fresh subagents for each task in a plan. Auto-triggers when executing multi-step implementation plans. Each subagent gets isolated context, clear acceptance criteria, and produces reviewable output. Prevents context pollution across tasks.

### verification-before-completion
Blocks "done" claims without evidence. Auto-triggers before presenting results to user. Requires: tests pass, lint clean, types check, acceptance criteria met. Iron law: assertions without evidence are lies.

### git-worktrees
Creates isolated git worktrees for feature work. Auto-triggers when starting work that needs branch isolation. Keeps main clean, enables parallel work streams.

### finishing-branch
Decision framework for completed branches. Auto-triggers when all tasks on a branch are done. Options: merge to main, create PR, keep for later, discard. Ensures clean git history.

### code-review
Reviews completed work against spec and quality standards. Auto-triggers after task completion. Checks: correctness, edge cases, security, performance, style consistency. Flags issues before user sees output.

## Engineering Skills

| Skill | Focus |
|-------|-------|
| golang-expert | Go with Uber style guide + 100 Go Mistakes, stdlib-first |
| php-expert | PHP 8.4, PSR standards, Swoole/FrankenPHP/RoadRunner, DDD |
| typescript-expert | Type system, generics, strict mode patterns |
| rust-expert | Ownership, lifetimes, async/await, traits, unsafe |
| python-expert | Stdlib, packaging, type hints, async, performance |
| react-expert | Hooks, Server Components, state management, performance |
| nextjs-expert | App Router, SSR/SSG, API routes, middleware |
| css-expert | Flexbox, grid, animations, responsive design |
| graphql-expert | Schema design, resolvers, subscriptions, optimization |
| wasm-expert | WASI, component model, Rust/C compilation |
| swig-expert | C/C++ wrapping for Go/Python/Java/C# |

## Utility Skills

| Skill | Purpose |
|-------|---------|
| ponytail | Forces laziest working solution — YAGNI, stdlib-first, minimal |
| ponytail-review | Code review hunting only over-engineering |
| ponytail-audit | Whole-repo scan for bloat and unnecessary complexity |
| ponytail-debt | Harvests `ponytail:` comments into a debt ledger |
| ponytail-help | Quick-reference card for all ponytail modes |
| find-docs | Retrieves up-to-date library/framework documentation |
| find-skills | Discovers and installs agent skills |
| context7-mcp | Library docs and code examples via Context7 |
| humanizer | Removes AI-generated writing patterns |
| writing-coach | Grammar, style, clarity, structure improvement |
| prompt-engineer | Chain-of-thought, few-shot, evaluation, LLM optimization |
| regex-expert | Crafting, debugging, explaining patterns |
| pdf-reader | PDF content extraction and analysis |
| web-search | Web research and information synthesis |

## Domain Skills

| Skill | Domain |
|-------|--------|
| leadership-expert | Coaching, decision frameworks, team dynamics, EQ |
| trader-hand-skill | Market intelligence, technical analysis, Alpaca API |
| docker | Containers, Compose, Dockerfiles, debugging |
| kubernetes | kubectl, pods, deployments, cluster debugging |
| helm | Chart templating, dependencies, package management |
| terraform | IaC providers, modules, state, planning |
| aws | EC2, S3, Lambda, IAM, CLI |
| gcp | gcloud, GKE, Cloud Run, managed services |
| azure | az CLI, AKS, App Service, infrastructure |
| ansible | Playbooks, roles, inventories, automation |
| ci-cd | GitHub Actions, GitLab CI, Jenkins, deployment |
| nginx | Reverse proxy, load balancing, TLS, tuning |
| postgres-expert | Query optimization, indexing, extensions, admin |
| redis-expert | Data structures, caching, Lua scripting, clusters |
| mongodb | Queries, aggregation, indexes, schema design |
| sqlite-expert | WAL mode, embedded patterns, optimization |
| elasticsearch | Queries, mappings, aggregations, cluster ops |
| security-audit | OWASP Top 10, CVE analysis, penetration testing |
| crypto-expert | TLS, encryption, hashing, key management |
| oauth-expert | OAuth 2.0, OIDC, PKCE, token management |
| data-pipeline | ETL, Spark, Airflow, dbt, data quality |
| ml-engineer | PyTorch, scikit-learn, model evaluation, MLOps |
| llm-finetuning | LoRA, QLoRA, dataset prep, training optimization |
| vector-db | Embeddings, similarity search, RAG, indexing |

## How Skills Work

- Auto-discovered from `~/.agents/skills/` and `.opencode/skills/`
- Loaded via the `skill` tool when task matches skill description
- `SKILL.md` is the entry point for each skill
- Skills can reference `knowledge/` subdirectories for domain data
- Multiple skills can be loaded in one session (e.g., golang-expert + tdd)
- Skills provide instructions and constraints, not just information
- Decision table in `AGENTS.md` maps situations to skill triggers
