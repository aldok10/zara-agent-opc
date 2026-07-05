---
type: fact
title: "LINDDUN Privacy Threat Modeling - Categories and Mitigations"
---

# LINDDUN Privacy Threat Modeling

LINDDUN is a structured methodology for identifying privacy threats in software systems, developed at KU Leuven. It complements STRIDE (which focuses on security) by addressing privacy-specific risks.

## The 7 LINDDUN Categories

| Category | Threat | Description |
|----------|--------|-------------|
| **L** - Linkability | Two or more items of interest can be linked | Attacker correlates actions/records to the same entity without identifying them |
| **I** - Identifiability | A subject can be identified from data | Data or behavior patterns reveal who the subject is |
| **N** - Non-repudiation | Subject cannot deny an action | Excessive logging or audit trails that expose user actions to unintended parties |
| **D** - Detectability | Existence of an item of interest can be detected | Attacker can determine that a record/communication exists (even without content) |
| **D** - Disclosure of information | Data is exposed to unauthorized party | Confidentiality breach — data leaks, improper access control, side channels |
| **U** - Unawareness | Subject unaware of data collection/processing | Lack of transparency about what data is collected, how it's used, and by whom |
| **N** - Non-compliance | System violates privacy regulations or policies | Failure to meet legal obligations (GDPR, CCPA, HIPAA) |

## Privacy Threat Trees

Each category has associated threat trees that decompose threats into specific attack paths:

- **Linkability tree:** link via identity, link via shared attribute, link via timing correlation, link via access pattern
- **Identifiability tree:** identify via direct identifier, identify via quasi-identifier combination, identify via behavioral fingerprint
- **Detectability tree:** detect via metadata, detect via traffic analysis, detect via system response differences

Use trees to systematically enumerate how each threat manifests in your system's data flows.

## Mapping to GDPR Principles

| LINDDUN Category | Related GDPR Principle |
|------------------|----------------------|
| Linkability | Data minimization (Art. 5(1)(c)) |
| Identifiability | Purpose limitation, Pseudonymization (Art. 5(1)(b), Art. 4(5)) |
| Non-repudiation | Storage limitation (Art. 5(1)(e)) |
| Detectability | Confidentiality (Art. 5(1)(f)) |
| Disclosure | Integrity and confidentiality (Art. 5(1)(f)) |
| Unawareness | Transparency, Information (Art. 12-14) |
| Non-compliance | Accountability, Lawfulness (Art. 5(1)(a), Art. 5(2)) |

## When to Apply LINDDUN

**Required when:**
- System processes PII (personal identifiable information)
- Handling health, financial, or biometric data
- Multi-party data sharing or aggregation
- User profiling or behavioral analytics
- Cross-border data transfers
- New data processing purposes being added

**Less critical when:**
- System handles no personal data
- All data is already public information
- Single-user, local-only applications

## Process (Simplified)

1. Create a DFD (data flow diagram) marking personal data flows
2. Map LINDDUN categories to each DFD element (process, data store, data flow, external entity)
3. Use threat trees to enumerate specific threats per element
4. Assess each threat's likelihood and impact
5. Select mitigations from privacy-enhancing strategies
6. Document residual risk and acceptance rationale

## Privacy-Enhancing Technologies (PETs)

### Preventing Linkability

- **Mix networks / onion routing:** hide communication patterns
- **Group signatures:** authenticate without revealing individual identity
- **Attribute-based credentials:** prove properties without revealing values

### Preventing Identifiability

- **k-Anonymity:** ensure each record is indistinguishable from at least k-1 others on quasi-identifiers
- **l-Diversity:** ensure at least l distinct values for sensitive attributes within each equivalence class
- **t-Closeness:** distribution of sensitive attribute in each class is close to overall distribution
- **Pseudonymization:** replace direct identifiers with tokens (reversible with key)
- **Anonymization:** irreversible removal of identifying information

### Differential Privacy

- Adds calibrated noise to query results or datasets
- Provides mathematical guarantee: presence/absence of any individual's data changes output by at most epsilon
- **Epsilon (privacy budget):** lower = more privacy, less utility
- Use cases: aggregate statistics, ML training (DP-SGD), census data
- Not suitable for: individual record queries, small datasets

### Preventing Detectability

- **Private information retrieval (PIR):** query databases without revealing which record was accessed
- **Dummy traffic:** add noise communications to hide real patterns
- **Uniform response sizes:** prevent inference from response length

### Supporting Awareness

- Privacy dashboards showing collected data
- Granular consent mechanisms
- Data access/portability/deletion self-service (GDPR Art. 15-17)
- Clear, layered privacy notices

## Integration with STRIDE

Run STRIDE first (security threats), then LINDDUN (privacy threats) on the same DFD:
- STRIDE identifies: spoofing, tampering, repudiation, information disclosure, DoS, elevation of privilege
- LINDDUN adds: linkability, identifiability, excessive non-repudiation, detectability, unawareness, non-compliance
- Overlap: "Information Disclosure" in STRIDE ≈ "Disclosure" in LINDDUN — but LINDDUN adds nuance about inference and correlation attacks

## Common Pitfalls

- Treating anonymization as binary (it's a spectrum)
- Ignoring quasi-identifier combinations (ZIP + birthdate + gender = 87% US population unique)
- Assuming encrypted = private (access patterns still leak information)
- Collecting data "just in case" — violates data minimization
- Logging PII in application logs without purpose justification
