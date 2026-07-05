# Team Topologies

## Scope

Assess and evolve team structures using Team Topologies framework. Optimize for fast flow and minimal cognitive load.

## Four Team Types

### Stream-Aligned (primary)
Owns end-to-end delivery for a business domain/user journey. Most teams should be this type.
- Owns: build, deploy, run for their domain.
- Size: 5-8. Aligns to value stream, not component.

### Platform
Provides self-service capabilities that reduce cognitive load for stream-aligned teams.
- Owns: internal developer platform, CI/CD, observability, infrastructure.
- Interface: self-service APIs/docs. No ticket-based requests.
- Measure success: adoption rate, time-to-first-deploy for new services.

### Enabling
Temporarily helps stream-aligned teams build new capabilities. Transfers knowledge, then moves on.
- Duration: 2-8 weeks per engagement.
- Success = the helped team no longer needs them.
- Examples: SRE coaching, new framework adoption, security practices.

### Complicated-Subsystem
Owns specialist domain requiring deep expertise most teams shouldn't need.
- Justification: math-heavy, hardware, legacy with tribal knowledge.
- Minimize count. Most orgs need 0-1 of these.

## Interaction Modes

| Mode | Duration | Example |
|------|----------|---------|
| Collaboration | Temporary (weeks) | Two teams co-building new capability |
| X-as-a-Service | Ongoing | Platform team providing CI/CD |
| Facilitating | Temporary (weeks) | Enabling team coaching on observability |

## When to Reorganize

Evidence required (not just intuition):
- Delivery speed declining 2+ quarters despite same headcount.
- Cognitive load surveys show overload (score <3.0).
- Cross-team dependencies blocking >30% of work items.
- Onboarding time >3 months for experienced hires (Tuckman's model suggests teams need 3-6 months to reach high performance; TT recommends avoiding frequent reorganization).
- On-call covering too many unrelated systems.

## Evolution Pattern

1. Start: few stream-aligned teams, shared infra responsibility.
2. Growth signal: teams spending >30% on non-differentiating work.
3. Action: extract platform team from common needs.
4. Growth signal: teams blocked learning new practices.
5. Action: create enabling team (temporary, rotational).

## Assessment Checklist

- [ ] Each team has clear domain ownership (not shared components).
- [ ] Team interactions documented (collab/XaaS/facilitating).
- [ ] No team owns >5 services or >2 unrelated domains.
- [ ] Platform team exists if >4 stream-aligned teams.
- [ ] Cross-team deps tracked and actively reduced.
