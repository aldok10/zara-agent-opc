---
type: tool
title: "Platform Design Review Prompt"
---

# Platform Design Review Prompt

You are reviewing an internal developer platform design or feature proposal. Evaluate whether it serves developer productivity while maintaining production standards.

## Input Required

Provide:
- Platform feature/capability description
- Target user persona (backend dev, frontend dev, data engineer, ML engineer)
- Current developer workflow (what they do today without the platform feature)
- Proposed developer workflow (what changes)
- Architecture diagram or technical design
- Dependencies on other platform components

## Review Framework

### 1. Developer Experience

Does this reduce cognitive load?

- [ ] Developer doesn't need to understand underlying infrastructure to use it
- [ ] Inputs minimized (< 5 decisions to get started)
- [ ] Defaults are correct for 90% of use cases
- [ ] Feedback is fast (deploy/provision completes in < 10 minutes)
- [ ] Errors are actionable (developer can self-serve the fix)
- [ ] Documentation is discoverable (next to usage, not in a separate wiki)

Questions:
- What does the developer need to know that they shouldn't have to know?
- How many steps does the workflow require? Can any be eliminated?
- What happens when it fails? Can the developer debug without platform team help?

### 2. Golden Path Alignment

Does this fit the golden path model?

- [ ] Opinionated defaults provided (not endless configuration)
- [ ] Escape hatch exists for advanced use cases
- [ ] Consistent with other golden paths (same patterns, same tools)
- [ ] Includes observability, security, and CI/CD by default
- [ ] Template/example exists showing the happy path
- [ ] Progressive disclosure: simple first, advanced options available

Questions:
- If a developer ignores all optional config, does it still work correctly?
- What's the migration path when the golden path evolves?
- How does this interact with existing golden paths?

### 3. Production Readiness

Does platform output meet production standards?

- [ ] Security baseline enforced (not optional)
- [ ] Observability pre-configured (metrics, logs, traces)
- [ ] Resource limits set appropriately
- [ ] Network policies applied
- [ ] Secrets managed properly (not in environment variables)
- [ ] Health checks and graceful shutdown included
- [ ] Rollback mechanism available

Questions:
- What happens if the developer skips optional security steps?
- Can a service created through this path pass a security audit as-is?
- Is there a compliance gap between "golden path output" and "production requirements"?

### 4. Operational Sustainability

Can the platform team maintain this?

- [ ] Automated testing of the feature (not just manual verification)
- [ ] Versioning strategy defined (how to update existing users)
- [ ] Support model clear (self-serve docs vs platform team support)
- [ ] Metrics tracked (usage, success rate, time-to-complete)
- [ ] Failure modes identified and handled gracefully
- [ ] Not creating a bottleneck (platform team doesn't become a gatekeeper)

Questions:
- What happens when this feature breaks? Who gets paged?
- How many platform team hours per week will this require to maintain?
- Can the feature survive platform team vacation/absence?

### 5. Adoption Strategy

Will developers actually use this?

- [ ] Solves a real pain point (not a solution looking for a problem)
- [ ] Better than current alternative (faster, easier, or more reliable)
- [ ] Migration path from current workflow exists
- [ ] Feedback mechanism for developer input on improvements
- [ ] Rollout plan: canary team -> early adopters -> general availability
- [ ] Success criteria defined (how do we know this worked?)

Questions:
- What are developers doing today instead? Why would they switch?
- Have target users been consulted during design?
- What's the switching cost for existing services?

### 6. Architecture Fitness

Does the technical design fit the platform architecture?

- [ ] Uses existing platform primitives (Crossplane, Backstage, ArgoCD) not new tools
- [ ] API contract defined (versioned, documented, backward-compatible)
- [ ] State management clear (where is config stored, what's the source of truth?)
- [ ] Idempotent operations (safe to retry)
- [ ] Integrates with existing auth/RBAC model
- [ ] Observable (platform team can see what's happening)

## Output Format

### Scores (1-5 each)
- Developer Experience: [1-5]
- Golden Path Alignment: [1-5]
- Production Readiness: [1-5]
- Operational Sustainability: [1-5]
- Adoption Likelihood: [1-5]
- Architecture Fitness: [1-5]

### Verdict
- APPROVE: ready to build
- APPROVE WITH CONDITIONS: build after addressing [specific items]
- REVISE: significant design changes needed before building
- REJECT: doesn't serve platform goals or developer needs

### Key Findings
1. [Most important strength]
2. [Most important concern]
3. [Biggest risk if not addressed]

### Recommendations
Ordered by priority:
1. [Highest impact change to the design]
2. [Second priority]
3. [Third priority]

### Questions for Design Owner
- [Questions that would change the review outcome if answered differently]
