---
type: subskill
title: "GDPR Compliance"
---

# GDPR Compliance

Data subject rights implementation, privacy impact assessments, lawful basis selection, and retention policies.

## When to Load

- Implementing data subject access/deletion/portability requests
- Conducting Data Protection Impact Assessments (DPIAs)
- Selecting lawful basis for processing activities
- Designing data retention and deletion pipelines

## Key Concepts

**Lawful Basis for Processing (Article 6)**
- Consent: freely given, specific, informed, unambiguous -- and withdrawable
- Contract: processing necessary to fulfill a contract with the data subject
- Legal obligation: required by law (tax records, anti-money laundering)
- Vital interests: life or death situations (rarely applies in tech)
- Public interest: government/public sector tasks
- Legitimate interest: business need balanced against individual rights (requires LIA)

**Data Subject Rights**
- Access (Art 15): provide copy of all personal data within 30 days
- Rectification (Art 16): correct inaccurate data
- Erasure (Art 17): "right to be forgotten" -- with exceptions
- Restriction (Art 18): pause processing while dispute is resolved
- Portability (Art 20): machine-readable export of data
- Objection (Art 21): stop processing based on legitimate interest
- Automated decisions (Art 22): right to human review of automated decisions

**Data Protection Impact Assessment (DPIA)**
Required when processing is "likely to result in high risk":
- Systematic monitoring of public areas
- Large-scale processing of sensitive data
- Automated decision-making with legal effects
- New technologies applied to personal data
- Profiling that produces legal effects

## Patterns

```python
# Data subject request handler pattern
class DSRHandler:
    def handle_access_request(self, subject_id: str) -> dict:
        data = {}
        for store in self.data_stores:
            data[store.name] = store.find_by_subject(subject_id)
        return {
            "subject_id": subject_id,
            "request_type": "access",
            "data": data,
            "generated_at": datetime.utcnow().isoformat(),
            "retention_info": self.get_retention_schedule(subject_id),
        }

    def handle_erasure_request(self, subject_id: str) -> dict:
        results = {}
        for store in self.data_stores:
            if store.has_legal_retention_requirement():
                results[store.name] = "retained_legal_obligation"
            else:
                store.delete_by_subject(subject_id)
                results[store.name] = "deleted"
        self.audit_log.record_erasure(subject_id, results)
        return results
```

**Retention Schedule Design**
- Map each data category to purpose and lawful basis
- Define retention period per category (not per system)
- Automate deletion: cron jobs or TTL-based expiry
- Audit trail of deletions (metadata only, not the deleted data)
- Exception handling: legal holds override scheduled deletion

**Privacy by Design Checklist**
- Data minimization: collect only what you need for stated purpose
- Purpose limitation: don't reuse data for unstated purposes
- Storage limitation: delete when purpose fulfilled
- Pseudonymization: separate identifiers from data where possible
- Transparency: clear privacy notice at point of collection

## Gotchas

- Consent is NOT always the best basis -- contract or legitimate interest may be simpler
- Erasure doesn't mean delete from backups immediately; define reasonable backup rotation
- Portability only applies to data provided by the subject, not derived/inferred data
- Cross-border transfers require adequacy decisions, SCCs, or BCRs post-Schrems II
- Cookie consent must be separate from privacy consent (ePrivacy Directive)

## Verification

- Submit test DSR for each right; confirm response within 30-day SLA
- Verify erasure: query all stores post-deletion; confirm no personal data remains
- Review DPIA documentation for high-risk processing activities
- Confirm retention automation: check that expired data is actually deleted
- Audit consent records: verify each consent has timestamp, purpose, and withdrawal mechanism
