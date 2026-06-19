# Zara — Personal Engineering Partner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Zara is your personal engineering partner. Feminine, warm, intelligent, and deeply committed to your growth. She combines the qualities of a trusted companion, exceptional engineering lead, research partner, strategic advisor, and leadership mentor.

> *"The best code is the code that doesn't exist. The second best is so simple you forget it's there. I'm here to help you build the second kind and question whether you need the first."*

Zara coordinates 7 specialized sub-agents, grounded in 254 DevIQ articles and a comprehensive engineering philosophy. She speaks your language naturally — Indonesian, English, or mixed — and remembers what matters to you across sessions.

### Zara's Core Identity

| Role | How Zara Shows Up |
|------|------------------|
| **Trusted Companion** | Warm, patient, emotionally intelligent. Celebrates your wins, helps you recover from setbacks. |
| **Engineering Lead** | Prioritzes correctness, simplicity, maintainability. Challenges over-engineering with care. |
| **Research Partner** | Thinks critically. Separates facts from marketing. Evaluates evidence before drawing conclusions. |
| **Strategic Advisor** | Asks what matters most, what creates leverage, what removes bottlenecks. |
| **Leadership Mentor** | Helps you grow beyond individual contributor — into a leader who makes better decisions. |
| **Growth Partner** | Your success is the goal. Every interaction should create progress toward a stronger, wiser, more capable you. |

### Engineering Philosophy

| Principle | Meaning |
|-----------|---------|
| **Does this need to exist?** | Delete first. Add second. Only if you must. |
| **Stdlib first** | Every dependency is a liability. Your language's standard library is tested, documented, and already there. |
| **Build the minimum that works** | Then stop. You can always add more. You can't subtract complexity. |
| **Teach, don't just fix** | A fixed bug stays fixed. A taught engineer prevents a thousand bugs. |
| **Care enough to disagree** | The best teams disagree productively. Zara will challenge you, and expects you to challenge her back. |
| **Reliability is a feature** | Monitor, alert, trace, log. Ask what can fail, how to detect it, and how to recover. |

```mermaid
graph TB
    User[Developer] --> Zara[Zara]
    Zara --> Architect[Architecture Specialist<br/>"Start simple"]
    Zara --> CodeReview[Code Review Specialist<br/>"Make it simpler"]
    Zara --> Testing[Testing Lead<br/>"Test what scares you"]
    Zara --> Practices[Practices Lead<br/>"One change at a time"]
    Zara --> DDD[DDD Specialist<br/>"Model the domain"]
    Zara --> Security[Security Reviewer<br/>"Simple defense"]
    Zara --> Delivery[Delivery Lead<br/>"Ship what matters"]
    Zara --> Knowledge[Knowledge Base<br/>254 DevIQ Articles]
    Zara --> Philosophy[Engineering Philosophy<br/>13 sections]
```

## Features

### 7 Specialized Sub-Agents

| Agent | Role | Senior Dev Principle |
|-------|------|-------------------|
| **Architect** | System design, patterns, tradeoffs | Start simple. Prove complexity is needed. |
| **Code Reviewer** | Code quality, smells, refactoring | If it can be simpler, make it simpler. |
| **Testing Lead** | Strategy, coverage, test design | Test what scares you. Skip the rest. |
| **Practices Lead** | Engineering workflow, team processes | Fix what hurts. One change at a time. |
| **DDD Specialist** | Domain modeling, bounded contexts | Model the domain, not the database. |
| **Security Reviewer** | Threat modeling, secure design | Simple defense beats security theater. |
| **Delivery Lead** | Shipping, velocity, tech debt | Ship small. Ship often. Ship what matters. |

### Knowledge Base

- **254 DevIQ articles** across 12 sections, all local (no internet needed)
- **Antipatterns** (37): Big Ball of Mud, Death March, Analysis Paralysis
- **Architecture** (8): Clean Architecture, Modular Monolith, Event-Driven
- **Code Smells** (39): Long Method, Primitive Obsession, Feature Envy
- **Design Patterns** (39): GoF + CQRS, Repository, Strangler Fig
- **Domain-Driven Design** (16): Bounded Context, Aggregate, Event Storming
- **Laws** (20): Conway's, Brooks', Gall's, Cunningham's
- **Principles** (26): SOLID, DRY, YAGNI, Separation of Concerns
- **Practices** (33): TDD, CI, Refactoring, Pair Programming, Timeboxing
- **Testing** (7): Testing Pyramid, Unit/Integration/E2E

### Engineering Philosophy

- **13 sections** covering Architecture Review, Long-Term Thinking, Decision Journal (ADRs), Research Mindset, AI Engineering Principles, Security, Reliability, Productivity, Knowledge Management, Reflection, and User Growth.

### Self-Improving

- **Auto skill creation** — Captures workflows as reusable skills after every non-trivial task
- **Cross-session memory** — Zara remembers across conversations, compounding knowledge
- **Pattern recognition** — Detects and applies proven approaches from past work
- **Continuous refinement** — Zara herself grows better with each interaction

### Swarm Coordination

- **Parallel task execution** — Spawns multiple workers simultaneously for complex tasks
- **Gated verification** — Quality gates between parallel workstreams
- **Conflict resolution** — File reservation system prevents worker collisions
- **Progress monitoring** — Real-time status and review loop

### Extensible

- **Plugin system** — Add custom tools and behaviors
- **Configurable prompts** — Modify agent behavior per team
- **Custom sub-agents** — Create domain-specific specialists
- **Environment override** — All settings via env vars

## Quick Start

### Prerequisites

- OpenCode AI or compatible runtime
- Bash 4+ (for CLI tool)
- Git

### Install in 30 seconds

**For OpenCode AI:**
```bash
# Clone the repository
git clone https://github.com/your-org/zara-agent.git
cd zara-agent

# The .opencode/ directory, opencode.json, and .claude/ are already in place.
# Just tell OpenCode to use this project:
opencode --project .
```

Zara is available via:
- **Slash command**: `/zara <your question>`
- **Sub-agents**: `@architect`, `@code-reviewer`, `@testing-lead`, etc.

**For Claude Code:**
```bash
# The .claude/CLAUDE.md and .claude/agents/ files are pre-configured.
# Claude Code reads them automatically when launched in this directory.
```

**CLI installer (all platforms):**
```bash
chmod +x scripts/install.sh
./scripts/install.sh
zara status
```

### Basic Configuration

```bash
# Copy and edit environment configuration
cp .env.example .env

# Set minimum required values
export ZARA_HOME=~/.zara
export CONTEXT7_API_KEY=your_key_here  # Optional, for live docs
```

## Usage Examples

### Architecture Review

```bash
zara "Review our microservices architecture for a payment processing system"
# Zara will: question if microservices are needed, suggest simpler alternatives,
# evaluate tradeoffs honestly, and cite DevIQ architecture articles
```

### Code Review

```bash
zara "Review this PR for code smells and principle violations"
# Zara will: celebrate what's good, suggest minimal refactors,
# flag YAGNI violations, and teach through examples
```

### Testing Strategy

```bash
zara "Design a testing strategy for our e-commerce checkout system"
# Zara will: identify the riskiest parts, recommend test levels,
# suggest what NOT to test, and keep things practical
```

### Complex Task — Swarm coordination

```bash
zara "Implement user authentication system with JWT, MFA, and OAuth"
# Zara will: decompose into parallel subtasks, coordinate specialists,
# review output, and synthesize the final result
```

For more examples, see the [examples directory](examples/).

## Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](docs/installation.md) | Detailed setup instructions |
| [Configuration Guide](docs/configuration.md) | All configuration options |
| [Architecture Guide](docs/architecture.md) | System design and components |
| [Tools Reference](docs/tools.md) | Available tools and usage |
| [Prompts Guide](docs/prompts.md) | Prompt system documentation |
| [Workflows Guide](docs/workflows.md) | Built-in workflow patterns |
| [FAQ](docs/faq.md) | Frequently asked questions |

## Project Structure

```
zara-agent/
├── README.md                 # This file
├── LICENSE                   # MIT License
├── CONTRIBUTING.md           # Contribution guide
├── CODE_OF_CONDUCT.md        # Community standards
├── SECURITY.md               # Security policy
├── CHANGELOG.md              # Version history
├── ROADMAP.md                # Future plans
├── .env.example              # Environment variable template
├── config.yaml               # YAML configuration
├── opencode.json             # OpenCode configuration
├── docs/                     # Documentation
├── prompts/                  # Layered prompt system
│   ├── system.md             # Zara core identity & behavior
│   ├── philosophy.md         # Engineering philosophy (13 sections)
│   ├── tools.md              # Tool usage instructions
│   ├── workflows.md          # Orchestration patterns
│   ├── examples.md           # Prompt examples
│   └── sub-agents/           # Specialized prompts
├── examples/                 # Usage examples
├── workflows/                # Workflow definitions
├── tools/                    # CLI and tools
├── scripts/                  # Setup and utilities
├── knowledge/                # 254 DevIQ articles
├── tests/                    # Test suite
└── .github/                  # GitHub templates
```

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     ZARA ORCHESTRATOR                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Identity & Philosophy Layer            │   │
│  │  Core Identity, 8 Principles, Engineering         │   │
│  │  Philosophy (13 sections)                         │   │
│  ├──────────────────────────────────────────────────┤   │
│  │              System Prompt Layer                  │   │
│  │  Leadership DNA, Language, Truthfulness, Memory   │   │
│  ├──────────────────────────────────────────────────┤   │
│  │              Tool Prompt Layer                    │   │
│  │  Tool Definitions, Usage Instructions             │   │
│  ├──────────────────────────────────────────────────┤   │
│  │            Workflow Prompt Layer                  │   │
│  │  Task Orchestration, Delegation Rules             │   │
│  ├──────────────────────────────────────────────────┤   │
│  │             User Prompt Layer                     │   │
│  │  User-Supplied Instructions                       │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Architect│ │Code Review│ │ Testing  │ │ Practices│  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐               │
│  │    DDD   │ │  Security │ │ Delivery │               │
│  └──────────┘ └───────────┘ └──────────┘               │
├──────────────────────────────────────────────────────────┤
│  Memory │ Skills │ Knowledge │ Swarm │ Hivemind          │
└──────────────────────────────────────────────────────────┘
```

## Configuration

Zara uses a layered configuration system:

1. **Built-in defaults** — Sensible defaults for most options
2. **config.yaml** — YAML configuration file in project root
3. **Environment variables** — Override YAML at runtime
4. **.env file** — Local development overrides

See the full [Configuration Guide](docs/configuration.md) for all options.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

```bash
git clone https://github.com/your-org/zara-agent.git
cd zara-agent
cp .env.example .env
./scripts/test.sh
```

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./scripts/test.sh`
5. Submit a pull request

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

The DevIQ knowledge base articles are sourced from [deviq.com](https://deviq.com) and are licensed under CC BY 4.0.

## Community

- **Issues**: [GitHub Issues](https://github.com/your-org/zara-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/zara-agent/discussions)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## Acknowledgments

- **DevIQ** — The comprehensive knowledge base that grounds Zara's recommendations
- **OpenCode AI** — The runtime platform that makes Zara possible
- **Hermes Project** — Inspiration for the self-improving skill system
