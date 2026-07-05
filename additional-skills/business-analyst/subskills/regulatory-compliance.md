# Regulatory Compliance Subskill

## When to Load

Activate when the task involves:
- Fintech product features (payments, lending, transfers, wallets)
- Banking, neo-banking, or cryptocurrency functionality
- Insurance product design or cross-border financial transactions
- KYC/AML/identity verification flows
- Features touching regulated data (financial, health, PII)

## Workflow Integration

### Phase 1: Regulatory Discovery (before requirements)

1. Identify target jurisdictions
2. List applicable regulators and their authority scope
3. Pull relevant regulations from `knowledge/fintech-regulations.md`
4. Map regulatory constraints to feature boundaries
5. Flag showstoppers early (license requirements, prohibitions)

### Phase 2: Regulatory Impact Analysis Template

```
Feature: [name]
Jurisdictions: [list]
Regulators: [list with specific regulation codes]

Constraints: [Regulation code]: [constraint] -> [impact on feature]
License: existing covers / new needed (timeline) / sandbox required
Data: residency [where], retention [how long], access [who, SLA]
Reporting: [type]: [frequency] to [regulator]
Risk: High/Medium/Low -- [rationale]
```

### Phase 3: Compliance as Acceptance Criteria

Encode regulations directly into testable conditions:

```gherkin
Given a user with KYC level [level]
When they attempt a transaction of [amount]
Then the system [allows/blocks] based on [regulation code] limit of [limit]
And an audit log entry is created with [required fields]
```

Examples:

```gherkin
# POJK transaction limit
Given a P2P lending borrower
When they request a loan exceeding IDR 2 billion
Then the system rejects the request

# PBI e-money balance
Given an unregistered e-money user
When a top-up would exceed IDR 2 million balance
Then the system blocks the top-up and prompts for upgrade

# PPATK reporting threshold
Given any completed transaction >= IDR 500 million
When settlement is confirmed
Then an automated CTR is queued for PPATK submission
```

### Phase 4: NFRs from Regulations

| Regulation | NFR Category | Requirement |
|-----------|-------------|-------------|
| SEOJK incident reporting | Monitoring | Alert within 1 hour for critical |
| Data residency (GR 71/2019) | Infrastructure | Primary DC in Indonesia |
| Audit trail (5 year) | Storage | Immutable logs, 5-year retention |
| KYC liveness | Security | Liveness detection for remote verify |
| BCP testing (SEOJK) | Reliability | DR drill every 6 months |

## Compliance-as-Feature Pattern

Treat compliance as a first-class feature, not just a constraint:

1. User-facing: cooling-off button, consent dashboard, KYC progress tracker
2. Operator-facing: compliance dashboard, report generator, audit log viewer
3. System-level: transaction monitoring, threshold alerts, data residency routing

## Red Flags (stop and escalate)

- Feature crosses jurisdictional boundary without license coverage
- Product design conflicts with consumer protection rules
- Data architecture cannot satisfy residency requirements
- No compliance/legal sign-off before development starts
- Sandbox exit timeline conflicts with launch date

## Verification Checklist

- [ ] Each regulated constraint has a corresponding acceptance criterion
- [ ] Audit trail covers all user and system decisions
- [ ] Transaction limits enforced at application AND infrastructure level
- [ ] Reporting jobs scheduled per regulatory frequency
- [ ] Consumer protection flows have defined SLAs
- [ ] Data residency validated in deployment architecture
- [ ] Compliance team has reviewed and approved feature spec
