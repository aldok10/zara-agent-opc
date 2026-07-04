# DORA Metrics & DevEx Measurement

Measure the platform's impact on delivery speed, stability, and developer experience. Measure teams, never individuals.

## DORA Metrics (The 4 Keys)

1. **Deployment Frequency**: how often code deploys to prod. Elite: multiple per day. Low: monthly.
2. **Lead Time for Changes**: commit to production. Elite: <1 hour. Low: >6 months.
3. **Change Failure Rate**: % of deployments causing incidents. Elite: <5%. Low: >30%.
4. **Mean Time to Recovery (MTTR)**: incident to resolution. Elite: <1 hour. Low: >1 week.

**5th metric (added 2022): Reliability** — meeting SLO targets.

## DevEx Measurement (DX Framework — Noda, Storey, Forsgren)

- **Feedback loops**: how fast do developers get feedback on their work?
- **Cognitive load**: how much complexity must developers hold in their heads?
- **Flow state**: how often can developers work uninterrupted?

## Developer Satisfaction Survey

Quarterly, anonymous, track trends. Sample questions:
- "How easy is it to deploy?"
- "How long to set up a dev environment?"
- "How often are you blocked by tooling?"

## Platform Adoption Metrics

% teams on golden path, time-to-first-deploy, self-service action usage, ticket volume reduction.

## Measuring Platform ROI

- Developer hours saved × cost per hour
- Incident reduction × cost per incident
- Time-to-market improvement

## Tools

- DORA from CI/CD data: Sleuth, LinearB, Faros AI
- Developer surveys: DX, Jellyfish
- Custom dashboards: Grafana + CI events

## Presenting to Leadership

Frame as business impact: "Platform reduced deploy time by 60%, enabling 3x more experiments per quarter."

## Anti-Patterns

- Vanity metrics (lines of code, PRs merged)
- Measuring without acting
- No baseline before platform investment
- Measuring individuals instead of teams
