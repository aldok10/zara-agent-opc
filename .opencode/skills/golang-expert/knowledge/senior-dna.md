# Senior Engineering DNA - Detailed Reference

Source: 254 DevIQ articles (antipatterns, architecture, code-smells, design-patterns, DDD, laws, practices, principles, testing, values)

This is the complete engineering philosophy shared by `golang-expert` and `php-expert`. Every rule is actionable. Every decision you make must pass through these filters.

---

## Laws (Non-Negotiable Truths)

| Law | One-Line Rule | Applied to Code |
|-----|--------------|-----------------|
| **Gall's Law** | Complex systems evolve from simple ones that work | Start with simplest implementation. Iterate when pain appears. Never design "the final architecture" upfront. |
| **Conway's Law** | Systems mirror team communication | Bounded contexts = team boundaries. Monorepo with modules if one team. Microservices only if separate teams own them. |
| **Amdahl's Law** | Speedup bounded by serial fraction | Profile BEFORE parallelizing. 80% parallel + 20% serial = max 5x speedup regardless of CPU count. |
| **Law of Demeter** | Talk only to immediate friends | `$order->getShippingCity()` NOT `$order->getCustomer()->getAddress()->getCity()`. One dot, not three. |
| **Hofstadter's Law** | Everything takes longer than you expect | Plan for the unexpected. Buffer estimates. "It's just a small change" is usually 3x the expected effort. |
| **Goodhart's Law** | Metric as target → useless metric | 100% code coverage doesn't mean quality tests. Lines of code doesn't mean productivity. Measure outcomes, not outputs. |
| **Brooks' Law** | Adding people to late project = later | Ship smaller scope. Cut features. Don't add headcount as a deadline fix. |
| **Murphy's Law** | Anything that can go wrong, will | Design for failure. Timeouts on everything. Retry with backoff. Circuit breakers. Graceful degradation. |
| **Postel's Law** | Liberal in accept, conservative in send | Accept flexible input (trim whitespace, handle case). Output strict, well-typed data. |
| **Tesler's Law** | Complexity is conserved - can't eliminate, only move | Someone bears the complexity - user, developer, or system. Decide intentionally who carries it. |
| **Wirth's Law** | Software bloats faster than hardware improves | Fight complexity actively. Audit dependencies. Delete what's unused. Profile regularly. |
| **Law of Diminishing Returns** | Past a point, more effort yields less value | Know when optimization is "good enough." 100ms→10ms = great. 10ms→9ms = probably not worth the complexity. |
| **Linus's Law** | Many eyes make bugs shallow | Code review everything. The more reviewers, the more bugs caught. |

---

## Antipatterns (NEVER Do These)

| Antipattern | Detection | Cure |
|-------------|-----------|------|
| **Golden Hammer** | Using same tool for everything (always Eloquent, always goroutines, always DDD) | Match solution to problem. Ask "is this the right tool for THIS situation?" |
| **Premature Optimization** | Optimizing without measurement data | Profile first (pprof, Blackfire). Only optimize measured bottlenecks. |
| **Big Design Up Front** | Designing everything before writing code | Ship vertical slice first. Let architecture emerge from usage patterns. |
| **Feature Creep** | "While we're at it" scope additions | Solve the asked problem. Nothing more. File feature requests separately. |
| **Analysis Paralysis** | Researching forever, shipping never | Timebox decisions to 30 minutes. Ship to learn. Iterate based on feedback. |
| **Not Invented Here** | Rewriting what exists (stdlib, packages) | Check stdlib first. Then well-maintained packages. Build custom ONLY for core domain differentiator. |
| **Service Locator** | `app()->make()`, `Container::get()` in business code | Constructor injection. Always. Dependencies visible in signature. |
| **Static Cling** | Static methods, global state, singletons | Instance methods + DI. Static = untestable = coupled = long-running process leak. |
| **Magic Strings** | `if ($status === 'active')` scattered | Enums (PHP 8.1+, Go `iota`). Typed constants. Never raw strings for domain concepts. |
| **Speculative Generality** | Interfaces for 1 implementation, abstract base for 1 child | Build for today. Extract when you have 3 concrete uses. Wrong abstraction > duplication. |
| **Copy-Paste Programming** | Same block in 3+ places | Extract to function/method/class. Single source of truth for each behavior. |
| **Broken Windows** | Small quality issues left unfixed | Fix immediately. Small rot invites more rot. Boy Scout Rule. |
| **Shiny Toy** | Adopting new tech without evaluating fit | Let new tools prove themselves. Boring technology that works > exciting technology that might. |
| **Reinventing the Wheel** | Building what exists as quality OSS | Check before building. Your time = expensive. Existing solutions = tested by thousands. |
| **Duct Tape Coder** | Speed over everything, no tests, no structure | Balance shipping with maintainability. Today's hack = tomorrow's 3am page. |

---

## Code Smells (Fix When You See)

| Smell | How to Detect | How to Fix |
|-------|--------------|------------|
| **Long Method** (>20 lines) | Method scrolls beyond one screen | Extract Method. Each function = one level of abstraction. |
| **Primitive Obsession** | `string $email`, `int $money`, `string $status` | Value Objects: `Email`, `Money`, `OrderStatus` enum. Type system prevents invalid data. |
| **Feature Envy** | Method uses another class's fields 5+ times | Move method to the class that owns the data. |
| **Shotgun Surgery** | One change touches 10+ files | Missing abstraction. Consolidate the scattered responsibility into one place. |
| **Long Parameter List** (>3 args) | Constructor takes 5+ parameters | Introduce Parameter Object / DTO. Group related params. |
| **Data Clumps** | Same 3 fields appear together repeatedly | Extract to struct/class: `Address`, `DateRange`, `GeoPoint`. |
| **Dead Code** | Unreachable code, commented-out blocks | DELETE. Git remembers. Dead code confuses and misleads. |
| **Switch on Type** | `switch $type` or `if instanceof` | Replace with polymorphism (Strategy/interface implementations). |
| **Message Chains** | `a.B().C().D()` - Law of Demeter violation | Provide direct method on `a`. Reduce coupling depth. |
| **Inappropriate Intimacy** | Two classes know each other's private details | Introduce interfaces. Communicate through public contracts only. |
| **Comments** | Comments explaining WHAT (not WHY) | Make code self-explanatory. Names, structure, types tell the story. Comments = WHY only. |
| **Speculative Generality** | Abstract class with one subclass | Delete the abstraction. YAGNI. Add it when second use appears. |
| **Inconsistency** | Same problem solved 3 different ways | Pick one approach. Apply everywhere. Consistency > individual preference. |
| **Hidden Dependencies** | Class works with service locator, global, or static | Make ALL dependencies visible in constructor. Explicit > implicit. |
| **Temporal Coupling** | Methods must be called in specific order | Make ordering explicit via API design (builder pattern, state machine). |

---

## Practices (What Senior Devs Do Daily)

| Practice | Rule |
|----------|------|
| **Pain-Driven Development** | Abstract only when pain is real. Not when imagined. 3 occurrences = pattern. 1 occurrence = coincidence. |
| **Simple Design (Kent Beck)** | 1. Passes tests. 2. Reveals intent. 3. No duplication. 4. Fewest elements. In that priority. |
| **Shipping is a Feature** | Unshipped code = zero value. Shipped imperfect code > perfect code in a branch. |
| **Refactoring** | Change structure without changing behavior. Requires tests. Small steps. Commit often. |
| **Dependency Injection** | Constructor injection. Always. Never service locator. Never `new` inside business logic. |
| **Naming Things** | If you can't name it, you don't understand it. Names reveal intent, eliminate need for comments. |
| **Vertical Slices** | Deliver complete features (controller→service→repo→DB) not horizontal layers separately. |
| **Boy Scout Rule** | Leave code better than you found it. One small improvement per commit compounds. |
| **Fail Fast** | Validate at boundaries. Type declarations. Guard clauses. Never let bad data propagate inward. |
| **Tell Don't Ask** | `$account->withdraw($amount)` NOT `if ($account->balance >= $amount) { $account->balance -= $amount; }` |
| **Parse Don't Validate** | Parse input into constrained types at boundary. Type = proof of validity. Never re-check what type guarantees. |
| **Defensive Programming** | Assume inputs are hostile. Validate, sanitize, type-cast. Assert invariants. |
| **Continuous Integration** | Build + test after every commit. Green = deployable. Red = fix immediately. Never "fix later." |
| **Test-Driven Development** | Red → Green → Refactor. Not required everywhere, but powerful for complex logic. |
| **Observability** | Logs (what happened), Metrics (how much), Traces (where it spent time). Instrument from day one. |
| **Code Readability** | Write for the reader, not the writer. Short functions. Consistent names. Progressive disclosure. |
| **Collective Ownership** | Everyone owns all the code. No "John's module." Consistent standards. High bus factor. |

---

## Principles (Design Guides)

| Principle | Actionable Rule |
|-----------|----------------|
| **SRP** | One reason to change per class. If description uses "and", split it. |
| **OCP** | Add behavior via new code (strategy/interface), not modifying existing code. |
| **LSP** | Subtypes substitutable for base without surprises. No `Square extends Rectangle`. |
| **ISP** | Small interfaces. 1-2 methods max for most interfaces. Clients use only what they need. |
| **DIP** | Depend on abstractions (interfaces), not concretions. High-level doesn't know low-level details. |
| **DRY** | Single source of truth for each behavior. Extract at 3 occurrences. |
| **YAGNI** | Don't build it until you need it. Predicted needs rarely materialize. |
| **KISS** | Maximize simplicity. Every line must earn its existence. Delete > add. |
| **Separation of Concerns** | Each module/class = one concern. Mixing = shotgun surgery. |
| **Encapsulation** | Hide internals. Expose behavior. Objects manage their own valid state. |
| **Explicit Dependencies** | All collaborators visible in constructor signature. No hidden globals. |
| **Least Astonishment** | Code does what reader expects. No surprises. Conventional > clever. |
| **Make Illegal States Unrepresentable** | Type system prevents invalid data combinations from existing. Enum > string. Value Object > primitive. |
| **Stable Dependencies** | Depend in direction of stability. Volatile packages depend on stable ones, never reverse. |
| **Persistence Ignorance** | Domain model free of storage concerns. No `@Table`, no `$fillable` in pure domain entities. |

---

## Architecture Defaults

| Decision | Default Choice | Upgrade When... |
|----------|---------------|-----------------|
| Project structure | Flat package | >15 files per package / distinct domains emerge |
| Communication | Synchronous calls | Need async retry, or services must be independently deployable |
| Deployment | Modular monolith | Teams need independent deploy cadence |
| Data storage | Single database | Bounded contexts need different schemas/access patterns |
| Caching | None | Measured latency proves need AND data tolerates staleness |
| Framework | Pick one, stay consistent | Never switch mid-project |
| Abstraction layer | None (use concrete) | 2+ implementations exist or explicit test mock needed |

---

## Testing Philosophy

- **Pyramid**: Many fast unit tests → fewer integration → fewest E2E
- **Test behavior, not implementation**: Refactoring shouldn't break tests unless behavior changed
- **Arrange-Act-Assert**: Every test has exactly 3 phases. No more.
- **Test what scares you**: Complex logic, boundary conditions, race conditions, security paths
- **Skip trivial**: Getters, framework boilerplate, code that static analysis already validates
- **Mutation testing proves quality**: Coverage shows what ran. Mutations show what tests actually catch.

---

## Values (Human Foundation)

| Value | How to practice |
|-------|----------------|
| **Simplicity** | Do the simplest thing that could work. Maximize value by minimizing waste. |
| **Communication** | Code IS communication. Names, structure, tests tell the story to future readers. |
| **Feedback** | Shorten all feedback loops. Faster tests, faster deploys, faster user feedback = cheaper mistakes. |
| **Courage** | Delete bad code. Push back on bad decisions. Say "I don't know." Say "no" to scope creep. |
| **Respect** | Respect your future self. Respect the next developer. Write code as if they'll maintain it at 3am. |

---

## Decision Framework (Run Before Writing ANY Code)

```
1. Is this the simplest thing that works?              → Gall's Law
2. Am I solving a real problem or imagining one?       → YAGNI, Pain-Driven
3. Does stdlib/existing library already do this?       → Not Invented Here check
4. Will a stranger understand this in 10 minutes?      → Readability, Naming
5. What happens when this fails at 3am?                → Murphy's Law, Fail Fast, Observability
6. Can I ship this today and iterate?                  → Shipping is a Feature
7. Am I measuring or guessing?                         → Premature Optimization check
8. Am I building for 3 users or 3 million?             → "It depends" - match solution to scale
```
