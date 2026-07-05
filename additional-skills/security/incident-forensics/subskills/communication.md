# Incident Communication

Stakeholder updates, regulatory notification, public relations, and internal communication during incidents.

## When to Load

- Managing communication during an active security incident
- Preparing regulatory breach notifications (GDPR, state laws)
- Coordinating between technical team, legal, and executives
- Writing post-incident reports and customer notifications

## Key Concepts

**Communication Audiences**
- Internal technical: IR team, SOC, engineering (detailed, frequent)
- Internal leadership: CISO, CTO, CEO, board (summary, impact-focused)
- Legal counsel: breach assessment, notification obligations, privilege
- Regulators: formal notification within required timeframes
- Customers/affected parties: clear, honest, actionable information
- Public/media: coordinated via PR, minimal until facts confirmed

**Notification Timelines**
- GDPR: 72 hours to supervisory authority (from awareness of breach)
- US state laws: varies (30-90 days to individuals, some require AG notification)
- PCI DSS: immediately to card brands and acquirer
- SEC (public companies): 4 business days for material incidents
- HIPAA: 60 days to HHS; "without unreasonable delay" to individuals
- NIS2 (EU): 24 hours initial, 72 hours full notification

**Status Update Structure**
```
INCIDENT STATUS UPDATE - [ID] - [Severity]
Timestamp: YYYY-MM-DD HH:MM UTC
Status: Active / Contained / Remediated / Closed

SUMMARY (1-2 sentences, what happened)

IMPACT
- Systems affected:
- Users affected:
- Data at risk:

CURRENT ACTIONS
- [action] - [owner] - [ETA]

NEXT UPDATE: [time]
INCIDENT COMMANDER: [name]
```

## Patterns

**Regulatory Notification Template**
```
To: [Supervisory Authority / Attorney General]
Re: Data Breach Notification - [Organization Name]

Date of discovery: [date]
Nature of breach: [unauthorized access / exfiltration / ransomware]
Categories of data affected: [names, emails, SSNs, payment info]
Approximate number of individuals affected: [count]
Likely consequences: [identity theft risk, financial exposure]
Measures taken: [containment, investigation, notification]
Contact: [DPO name, email, phone]
```

**Customer Notification Best Practices**
- Lead with what happened (plain language, no jargon)
- State what data was affected
- Explain what you're doing about it
- Tell them what they should do (change passwords, monitor accounts)
- Provide contact for questions
- Don't speculate on attribution or minimize impact

**Communication Anti-Patterns**
- "We take security seriously" (empty, overused)
- "Sophisticated attack" without evidence (deflects responsibility)
- Delayed notification without justification
- Technical jargon in customer-facing communications
- Blaming users or third parties without investigation complete

## Gotchas

- Attorney-client privilege: route through legal counsel to protect work product
- "Breach" has legal meaning -- use "incident" until legal confirms classification
- Social media monitoring: news may break before your notification is ready
- Investor relations: material incidents have SEC disclosure requirements
- Insurance: notify cyber insurance carrier early -- they may provide resources
- Over-communicating during active investigation can reveal TTPs to attacker

## Verification

- Notification sent within regulatory timeframe (document timestamp)
- Legal reviewed all external communications before release
- Customer notification includes all required elements per applicable law
- Internal stakeholders received updates per agreed cadence
- Post-incident report completed within 30 days of closure
- Lessons learned session scheduled and conducted
