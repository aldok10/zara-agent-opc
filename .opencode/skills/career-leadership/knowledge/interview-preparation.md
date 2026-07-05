# Interview Preparation

## System Design Interview Framework

### Phase 1: Requirements (5 min)
- Clarify functional requirements (what the system does)
- Identify non-functional requirements (scale, latency, availability)
- Ask about constraints (budget, timeline, existing infra)
- Define scope explicitly -- what's in, what's out
- Write down numbers: users, requests/sec, data size

### Phase 2: High-Level Design (10 min)
- Draw the major components and data flow
- Identify the core entities and their relationships
- Choose storage type (SQL, NoSQL, blob, cache)
- Sketch the API (REST/gRPC, key endpoints)
- Show how data moves from client to storage and back

### Phase 3: Deep Dive (15 min)
- Pick 1-2 components to detail (interviewer may direct)
- Discuss data model, indexing, partitioning
- Address concurrency and consistency
- Show how the system handles failure modes
- Discuss caching strategy and invalidation

### Phase 4: Tradeoffs (5 min)
- Name what you sacrificed and why
- Discuss alternative approaches you considered
- Identify bottlenecks and how to monitor them
- Propose scaling strategies for 10x/100x growth

## Behavioral Interviews (STAR Method)

### Structure
- **Situation**: Brief context (1-2 sentences)
- **Task**: Your specific responsibility
- **Action**: What YOU did (not the team), with detail
- **Result**: Quantifiable outcome, lesson learned

### Strong Answer Traits
- Ownership: "I decided" not "we decided"
- Specificity: dates, metrics, names of systems
- Conflict resolution: show how you navigated disagreement
- Growth: what you learned, what you'd do differently

### Common Categories
- Leadership/influence without authority
- Technical decision under uncertainty
- Handling failure or production incident
- Cross-team collaboration
- Mentoring or growing others

## Coding Interview Strategy

### Before Coding
- Restate the problem in your own words
- Clarify edge cases and input constraints
- Discuss 1-2 examples manually
- State brute force approach and its complexity

### During Coding
- Narrate your thinking as you write
- Start with the simplest correct solution
- Name variables clearly (interviewers read your code)
- Handle edge cases explicitly

### After Coding
- Trace through with an example
- State time and space complexity
- Propose optimizations only if time allows
- Ask if the interviewer wants you to implement the optimization

## Take-Home Project Best Practices

- Timebox yourself (respect the stated limit)
- README: setup instructions, architecture decisions, tradeoffs
- Tests for critical paths (not 100% coverage)
- Clean git history (atomic commits with messages)
- Don't over-engineer -- show judgment about scope
- Deploy it if possible (Vercel, Railway, fly.io)

## Red Flags from Companies

- No clear role definition or success criteria
- Interviewer is hostile or adversarial (not challenging)
- "We're like a family" (boundary issues)
- No questions about your goals or preferences
- Excessive rounds (7+ for IC roles)
- Unwillingness to share team size, turnover, or tech stack
- Pressure to accept quickly without time to think

## Negotiating Multiple Offers

- Never lie about competing offers
- Share timelines honestly -- ask for extensions if needed
- Compare total compensation (base + equity + bonus + benefits)
- Consider growth: scope, mentorship, learning trajectory
- Use competing offers as data points, not threats
- Get final offers in writing before deciding
- Factor in team, manager, and work-life balance
- It's OK to ask: "Is there flexibility on X?"
