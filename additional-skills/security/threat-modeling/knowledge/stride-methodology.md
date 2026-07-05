# STRIDE Methodology

Per-element threat analysis using data flow diagrams with trust boundaries.

## What is STRIDE

STRIDE is a threat categorization model applied per element in a data flow diagram (DFD). Each letter represents a category of threat:

| Category | Threat | Property Violated | Question |
|----------|--------|-------------------|----------|
| **S**poofing | Impersonating something or someone | Authentication | Can an attacker pretend to be this entity? |
| **T**ampering | Modifying data or code | Integrity | Can an attacker modify data in transit or at rest? |
| **R**epudiation | Denying having performed an action | Non-repudiation | Can an actor deny they did something? |
| **I**nformation Disclosure | Exposing information | Confidentiality | Can data leak to unauthorized parties? |
| **D**enial of Service | Disrupting service availability | Availability | Can an attacker make this unavailable? |
| **E**levation of Privilege | Gaining unauthorized capabilities | Authorization | Can an attacker gain higher access? |

## STRIDE Per Element

Not all threat categories apply to all DFD element types:

| DFD Element | S | T | R | I | D | E |
|-------------|---|---|---|---|---|---|
| External Entity | X | | | | | |
| Process | X | X | X | X | X | X |
| Data Store | | X | X* | X | X | |
| Data Flow | | X | | X | X | |

*Repudiation for data stores relates to log integrity.

## Building the Data Flow Diagram

### Step 1: Identify Components

- **External Entities**: Users, browsers, third-party APIs, partner systems
- **Processes**: Web server, API gateway, authentication service, payment processor
- **Data Stores**: Databases, caches, file systems, message queues, cloud storage
- **Data Flows**: HTTP requests, database queries, API calls, message queue publications

### Step 2: Draw Trust Boundaries

Trust boundaries separate zones with different privilege levels:
```
┌─────────────────────────────────────────────────────┐
│ INTERNET (untrusted)                                 │
│  ┌──────────┐                                       │
│  │  Browser │                                       │
│  └────┬─────┘                                       │
│───────┼─────────────────────────────────────────────│
│ DMZ   │ HTTPS                                       │
│  ┌────▼─────┐                                       │
│  │ API GW   │                                       │
│  └────┬─────┘                                       │
│───────┼─────────────────────────────────────────────│
│ APP   │ gRPC/mTLS                                   │
│  ┌────▼─────┐     ┌───────────┐                    │
│  │ Service  │────►│ Database  │                     │
│  └────┬─────┘     └───────────┘                    │
│       │                                             │
│  ┌────▼─────┐                                       │
│  │ Auth Svc │                                       │
│  └──────────┘                                       │
│───────────────────────────────────────────────────── │
│ MANAGEMENT (highest trust)                           │
│  ┌──────────┐                                       │
│  │ Admin    │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

### Step 3: Enumerate Threats Per Element

For each element, ask the STRIDE questions:

**Example: API Gateway (Process)**
| Category | Threat | Mitigation |
|----------|--------|-----------|
| Spoofing | Attacker forges requests bypassing origin validation | Mutual TLS, JWT validation |
| Tampering | Request body modified in transit | TLS 1.3, request signing |
| Repudiation | Client denies sending request | Structured access logs with correlation IDs |
| Info Disclosure | Error responses leak internal architecture | Generic error messages, debug info in logs only |
| DoS | Flood of requests overwhelms gateway | Rate limiting, WAF, auto-scaling |
| Elevation | Attacker exploits gateway vulnerability to access internal services | Minimal privileges, security patches, admission control |

## Risk Scoring

Use a 5x5 matrix: Likelihood (1-5) x Impact (1-5) = Risk Score (1-25)

### Likelihood Factors
| Score | Description | Criteria |
|-------|-------------|----------|
| 1 | Rare | Requires insider + zero-day + specific conditions |
| 2 | Unlikely | Requires significant skill, no known exploit |
| 3 | Possible | Known attack vector, tools available publicly |
| 4 | Likely | Low skill needed, automated tools exist |
| 5 | Almost Certain | Trivial to exploit, widely known technique |

### Impact Factors
| Score | Description | Criteria |
|-------|-------------|----------|
| 1 | Negligible | Cosmetic issue, no data exposure, no downtime |
| 2 | Minor | Limited data exposure, brief service degradation |
| 3 | Moderate | PII of few users, hours of downtime, financial loss <$10K |
| 4 | Major | Bulk PII, extended downtime, significant revenue loss |
| 5 | Catastrophic | Full breach, regulatory action, existential business risk |

### Risk Matrix
```
              IMPACT
           1   2   3   4   5
    5  │  5  10  15  20  25  │
    4  │  4   8  12  16  20  │
L   3  │  3   6   9  12  15  │
    2  │  2   4   6   8  10  │
    1  │  1   2   3   4   5  │

Risk levels: 1-4 LOW, 5-9 MEDIUM, 10-15 HIGH, 16-25 CRITICAL
```

## Process for New Features

### Pre-Design (5 minutes)
1. What data does this feature handle?
2. Who are the actors (authenticated, anonymous, admin)?
3. What external systems are involved?

### During Design (30-60 minutes)
1. Draw DFD with trust boundaries
2. Apply STRIDE per element
3. Score each threat
4. Assign mitigations to high/critical threats
5. Document accepted risks (with business justification)

### Implementation Validation
1. Verify mitigations implemented in code
2. Test assumptions (e.g., "API requires auth" -- verify with curl)
3. Update model when architecture changes

## Threat Model Maintenance

**Triggers for update:**
- New feature or endpoint added
- Architecture change (new service, new data store)
- Security incident (assumptions proven wrong)
- Dependency change (new third-party integration)
- Environment change (new cloud region, new compliance requirement)

**Review cadence:**
- Major systems: quarterly review
- Active development: update with each epic/milestone
- Stable systems: annual review or on change

## 2026 Context

- AI/ML systems: add threat categories for training data poisoning, model extraction, prompt injection
- LLM agents with tool access: trust boundary between LLM and each tool (confused deputy threat)
- Automated model generation: IriusRisk, Threagile generate from architecture-as-code
- Cloud-native DFDs: include service mesh, sidecar proxies, eBPF agents as elements
- Supply chain: treat dependencies and build pipeline as DFD elements with trust boundaries
- Privacy: combine STRIDE with LINDDUN for systems processing personal data
