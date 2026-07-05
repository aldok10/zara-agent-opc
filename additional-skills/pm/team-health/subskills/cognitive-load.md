# Cognitive Load

## Scope

Measure, manage, and reduce cognitive load per team. Prevent overload that causes burnout, slow delivery, and quality decline.

## Three Types

Three types from Sweller's Cognitive Load Theory (1988), adopted by Team Topologies as design constraint:

### Intrinsic Load
Domain complexity itself. Business rules, domain models, regulatory requirements.
- Reduce via: bounded contexts, domain-driven design, clear ubiquitous language.
- Cannot eliminate - this IS the work. But can bound it per team.

### Extraneous Load
Tooling, process, and environmental friction. Build systems, deployment, cross-team coordination.
- Reduce via: platform team, better tooling, automation, clear APIs between teams.
- This is waste. Minimize aggressively.

### Germane Load
Learning and skill-building. New technologies, practices, domain understanding.
- Support via: enabling teams, learning time allocation, pairing, documentation.
- Investment. Budget it intentionally (10-15% of capacity).

## Measurement

### Proxy Signals
- Onboarding time for experienced hire (target: <6 weeks productive).
- Services/systems owned per team (target: <5).
- Domains per team (target: 1, max 2 related).
- Context switches per day (target: <3).
- "I understand systems I work on" survey score (target: >3.5/5).

### Direct Assessment
Ask team: "List everything you're responsible for." If list > what fits on one page = overloaded.

## Load Budget

Per team (5-8 people):
- 1 primary domain (bounded context).
- Max 5 services/repos actively maintained.
- Max 2 programming languages in active use.
- Max 1 week/month on-call per person.
- Target: 70% time on intrinsic work (actual product value).

## Overload Signals

| Signal | Severity | Response |
|--------|----------|----------|
| Onboarding >3 months | High | Reduce team scope or split |
| Delivery slowing despite same headcount | High | Assess extraneous load |
| Rising bug rate / incidents | Medium | Check if team spread too thin |
| Team members burning out / leaving | Critical | Immediate scope reduction |
| "Nobody understands how X works" | Medium | Knowledge risk, document or simplify |

## Reduction Strategies

1. **Split team by domain** if owning >2 bounded contexts.
2. **Extract to platform** if >30% time on non-differentiating infra.
3. **Simplify/retire services** if maintaining rarely-used systems.
4. **Automate toil** if repetitive manual ops >5 hrs/week.
5. **Clear ownership** if shared services have no clear owner.

## Verification

- Team can articulate their domain in <2 sentences.
- New hire productive on real work within 6 weeks.
- Survey cognitive load score stable or improving quarterly.
- No team member on-call >1 week/month.
