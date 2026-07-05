# Team Productivity

## Flow State

### Maker's Schedule
- Engineers need 3-4 hour uninterrupted blocks to do deep work
- Context switching costs 15-25 minutes to recover focus
- One interruption doesn't cost 5 minutes -- it costs the flow state
- Batch meetings together (e.g., all meetings on Tue/Thu)
- Protect mornings or afternoons as no-meeting zones

### Focus Blocks
- Calendar-block 3-4 hours for deep work daily
- Turn off notifications during focus time
- Signal to team: headphones on, status set, do not disturb
- Async communication as default, sync as exception
- Respect others' focus blocks -- don't "quick question" them

### Interrupt Cost
- A 30-second Slack question costs 15+ minutes of recovery
- Batch non-urgent questions (daily sync or async thread)
- Use escalation tiers: async first, then sync, then interrupt
- Track interrupts -- if a role gets too many, something is broken

## DORA Metrics

### The Four Keys
- **Deployment Frequency**: how often you ship to production
- **Lead Time for Changes**: commit to production (lower is better)
- **Mean Time to Recovery (MTTR)**: incident to resolution
- **Change Failure Rate**: % of deployments causing incidents

### Performance Levels
- Elite: multiple deploys/day, <1hr lead time, <1hr MTTR, <5% failure
- High: weekly-monthly deploys, 1 day-1 week lead, <1 day MTTR, 0-15%
- Medium: monthly-biannual, 1-6 months lead, <1 week MTTR, 16-30%
- Low: >6 months between deploys, >6 months lead time

### Using DORA
- Measure trends, not absolutes (improve over time)
- All four metrics together -- optimizing one at the expense of others fails
- Deployment frequency and lead time are leading indicators
- MTTR and change failure rate are lagging indicators
- Don't gamify -- teams will optimize the metric, not the outcome

## SPACE Framework

### Dimensions
- **Satisfaction**: how fulfilled developers feel (survey-based)
- **Performance**: outcomes and impact of work (not just output)
- **Activity**: volume metrics (commits, PRs, deploys) -- use carefully
- **Communication**: collaboration quality, knowledge sharing
- **Efficiency**: flow, minimal friction, ability to complete work

### Key Insight
- No single metric captures developer productivity
- Activity metrics alone are harmful (lines of code, commit count)
- Combine quantitative (DORA, activity) with qualitative (surveys)
- Measure at team level, not individual (avoids toxic competition)
- Ask: "Can developers do their best work?" not "Are they working hard?"

## Technical Debt as Productivity Tax

### How Debt Slows Teams
- Every new feature takes longer because of workarounds
- Onboarding takes weeks instead of days
- Simple changes require touching many files
- Fear of breaking things slows everyone down
- Best engineers leave when the codebase is painful

### Managing Debt
- Track it: label tickets, maintain a debt backlog
- Budget time: 15-20% of each sprint for debt reduction
- Prioritize by pain: which debt slows the team MOST?
- Pay interest vs principal: quick fixes vs proper refactors
- Don't ask permission -- include debt work in feature estimates

### Communication
- Translate debt to business terms: "This will slow feature delivery by X%"
- Show the cost: "We spend Y hours/week on workarounds"
- Propose incremental payoff: "If we invest Z now, we save W per sprint"

## Meeting Hygiene

### Async-First
- Default to async (doc, thread, video message)
- Meetings for: decisions with debate, brainstorming, relationship building
- Not meetings for: status updates, information broadcast, FYI
- Write it up first, meet only to discuss disagreements

### Effective Meetings
- Agenda shared 24h before (no agenda = cancel the meeting)
- Timebox: 25 or 50 minutes (not 30 or 60 -- leave buffer)
- Assign: facilitator, note-taker, timekeeper
- End with: decisions made, action items with owners, next steps

### Reducing Meeting Load
- Audit meetings quarterly: which are still valuable?
- Make attendance optional where possible
- Record for those who can't attend (or share notes)
- "Could this be an email?" is a valid question

## Developer Experience (DX) Measurement

### What to Measure
- Time from code change to seeing it running (local dev loop)
- CI/CD pipeline duration (commit to deploy)
- Onboarding time (new hire to first meaningful PR)
- Tool satisfaction (IDE, build system, test runner)
- Documentation quality (can you find what you need?)

### Signals of Poor DX
- "Works on my machine" (environment inconsistency)
- Flaky tests that everyone ignores
- Build times > 10 minutes
- Onboarding docs are outdated
- Developers build personal scripts to work around tooling

### Improving DX
- Invest in local development setup (containers, scripts, automation)
- Fast CI feedback (parallel tests, caching, incremental builds)
- Living documentation (generated from code when possible)
- Internal developer portal (find services, APIs, owners)
- Treat internal tools like products (with users and feedback loops)
