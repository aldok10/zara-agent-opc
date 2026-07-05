# Threat Model: [System Name]

## 1. System Overview

**Description:** [Brief description of the system and its purpose]

**Data Classification:**
- Public: [data types]
- Internal: [data types]
- Confidential: [data types]
- Restricted: [data types]

## 2. Architecture

```
[ASCII diagram of system components and data flows]

  User --> [Load Balancer] --> [API Gateway] --> [Service A]
                                            --> [Service B]
                                            --> [Database]
                                            --> [External API]
```

**Components:**
| Component | Technology | Trust Level | Data Handled |
|-----------|-----------|-------------|--------------|
| ... | ... | ... | ... |

## 3. Trust Boundaries

| Boundary | Between | Authentication | Authorization |
|----------|---------|---------------|---------------|
| TB-1 | Internet / API Gateway | OAuth 2.0 | RBAC |
| TB-2 | API Gateway / Internal | mTLS | Service accounts |
| TB-3 | Service / Database | IAM | Row-level security |

## 4. Threat Enumeration (STRIDE)

### Spoofing
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| S-1 | Token theft via XSS | User sessions | Medium | High | High |
| S-2 | ... | ... | ... | ... | ... |

### Tampering
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| T-1 | Request body manipulation | API inputs | Medium | Medium | Medium |

### Repudiation
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| R-1 | Insufficient audit logging | Admin actions | Low | High | Medium |

### Information Disclosure
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| I-1 | Error messages leak internals | API responses | High | Medium | High |

### Denial of Service
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| D-1 | Unthrottled endpoints | API availability | Medium | High | High |

### Elevation of Privilege
| ID | Threat | Target | Likelihood | Impact | Risk |
|----|--------|--------|-----------|--------|------|
| E-1 | IDOR on user resources | Data access | Medium | High | High |

## 5. Mitigations

| Threat ID | Mitigation | Status | Owner |
|-----------|-----------|--------|-------|
| S-1 | CSP headers + HttpOnly cookies | Planned | Frontend |
| D-1 | Rate limiting per IP and user | Implemented | Platform |
| E-1 | Authorization checks at service layer | In Progress | Backend |

## 6. Residual Risks

| Risk | Accepted By | Rationale | Review Date |
|------|------------|-----------|-------------|
| ... | ... | ... | ... |

## 7. Action Items

- [ ] [Priority: High] Implement [mitigation] by [date]
- [ ] [Priority: Medium] Review [component] for [threat]
- [ ] [Priority: Low] Add monitoring for [scenario]

## Metadata

- **Author:** [name]
- **Last Updated:** [date]
- **Next Review:** [date]
- **Approved By:** [name]
