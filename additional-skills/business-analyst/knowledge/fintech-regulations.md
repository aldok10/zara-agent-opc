# Fintech Regulations Knowledge Base

Reference for regulatory requirements when designing fintech features. Not legal advice -- always confirm with compliance/legal teams.

## Indonesia (OJK & Bank Indonesia)

### POJK -- Digital Lending (P2P)

- POJK 10/POJK.05/2022: P2P lending operator requirements
- Minimum paid-up capital: IDR 2.5 billion (registration), IDR 25 billion (license)
- Maximum loan: IDR 2 billion per borrower
- Maximum lending rate caps set periodically by OJK
- Mandatory reporting: monthly financial, quarterly risk, annual audit
- Operator must maintain escrow and virtual accounts (separate from operational funds)
- Mandatory credit scoring disclosure to borrowers
- Fit and proper test for directors and commissioners

### PBI -- Payment Systems (QRIS, BI-FAST)

- PBI 23/6/PBI/2021: Payment Service Provider (PJP) licensing
- QRIS: mandatory for merchants > IDR 100M annual turnover
- BI-FAST: real-time gross settlement for retail (max IDR 250M/transaction)
- E-money limits: unregistered (IDR 2M balance), registered (IDR 20M balance)
- Payment gateway must obtain BI license (PJP Category 1 or 2)
- Settlement finality rules: T+0 for e-money, T+1 for transfers
- Cross-border payment: requires BI approval and correspondent banking arrangement

### SEOJK -- Data Protection & IT Risk

- SEOJK 29/SEOJK.05/2021: IT risk management for fintech
- Data classification: public, internal, confidential, highly confidential
- Mandatory penetration testing (annual minimum)
- Incident reporting: 1 hour for critical, 24 hours for non-critical
- Data center: primary in Indonesia, DRC within national territory
- Business continuity plan tested semi-annually
- Third-party IT vendor assessment required before engagement
- Data retention: minimum 5 years for transaction records

### Regulatory Sandbox

- OJK sandbox: 1 year duration, extendable once (6 months)
- Must demonstrate innovation, consumer benefit, risk mitigation
- Limited users during sandbox (max varies by category)
- Exit: full license, registration, or termination
- BI sandbox (for payment innovations): separate application process
- Sandbox participants must report monthly progress to regulator

### Consumer Protection

- Cooling-off period: 14 days for insurance, variable for lending products
- Complaint resolution: max 20 business days (extendable to 40)
- Mandatory product disclosure in Bahasa Indonesia
- Prohibition on harassment in debt collection (POJK 6/POJK.07/2022)
- Financial literacy obligation: operator must educate users
- Dispute resolution: internal first, then LAPS SJK (alternative resolution body)

## International Regulations (Reference)

### EU

- **PSD2/PSD3**: Strong Customer Authentication (SCA), open banking APIs, third-party provider access. PSD3 tightens fraud liability and expands scope to non-bank PSPs.
- **MiCA**: Crypto-asset classification (utility token, ART, EMT). License categories for CASPs. Reserve requirements for stablecoin issuers.
- **DORA**: ICT risk framework for financial entities. Third-party concentration risk management. Incident reporting within 4 hours (initial), 72 hours (intermediate).

### Singapore (MAS)

- Payment Services Act 2019: 7 payment service categories, each with distinct license
- Digital banking licenses: digital full bank (DFB), digital wholesale bank (DWB)
- Technology Risk Management (TRM) guidelines: access controls, crypto, cloud
- AML/CFT Notice 626: CDD requirements, ongoing monitoring, suspicious transaction reporting

### UK (FCA)

- Open Banking (CMA Order): PSD2-equivalent, Open Banking Implementation Entity
- Consumer Duty (2023): outcomes-based regulation, fair value, clear comms
- E-money: FCA authorization, safeguarding requirements
- Crypto: registration regime for AML compliance (expanding to full authorization)

### US

- State-by-state money transmitter licensing (no single federal license)
- BSA/AML: FinCEN registration, SAR filing, CTR for transactions > $10K
- CFPB: unfair/deceptive/abusive acts oversight, small-dollar lending rules
- State usury laws: interest rate caps vary by state
- Reg E: electronic fund transfer consumer protections

### Global (FATF)

- 40 Recommendations: AML/CFT framework adopted by 200+ jurisdictions
- Travel Rule: originator/beneficiary info for transfers > $1,000 (VASP threshold varies)
- Risk-based approach: CDD proportional to risk level
- Beneficial ownership transparency requirements
- Mutual evaluations: country compliance scores affect cross-border ops

## BA Considerations for Fintech Features

### Regulatory Impact Assessment Checklist

1. Which jurisdictions does this feature operate in?
2. Which regulators have authority? (OJK, BI, central bank, etc.)
3. Does this feature require a new license or expand existing scope?
4. What transaction limits apply?
5. What reporting obligations are triggered?
6. Are there data residency requirements?
7. Does this create new AML/CFT obligations?
8. What consumer protection rules apply?
9. Is sandbox testing required before full launch?
10. What audit trail requirements exist?

### Compliance-to-Acceptance-Criteria Mapping

| Regulatory Requirement | Maps To |
|------------------------|---------|
| Transaction limits | Validation rules, error handling |
| KYC levels | User onboarding flows, feature gating |
| Data residency | Infrastructure requirements, NFR |
| Reporting obligations | Batch jobs, data pipeline requirements |
| Cooling-off periods | State machine, cancellation flows |
| Audit trails | Logging requirements, data retention |

### Data Residency (Indonesia)

- GR 71/2019 (PP 71 Tahun 2019): electronic system operators must provide data access to government
- Strategic electronic systems: data center AND DRC in Indonesia
- Non-strategic: data center may be abroad but must provide domestic access
- Personal data: must comply with UU PDP (Law 27/2022) -- consent, purpose limitation, minimization
- Cross-border transfer: requires equivalent protection in destination country or explicit consent

### KYC/eKYC Requirements

| Level | Verification | Limits | Use Case |
|-------|-------------|--------|----------|
| Unregistered | None | Low balance, low transaction | Casual e-money |
| Registered | ID + selfie match | Medium limits | Standard wallet |
| Full KYC | Video call or in-person, source of funds | High/unlimited | Lending, investment |

- eKYC acceptable: facial recognition against government ID database (liveness detection required)
- Re-verification triggers: PEP status change, threshold breach, suspicious activity

### Transaction Limits & Reporting

- CTR equivalent (PPATK): IDR 500 million or equivalent
- Suspicious transaction: report within 3 business days to PPATK
- E-money monthly cumulative: IDR 20M (registered)
- Wire transfer threshold for enhanced due diligence: varies by risk rating

### Audit Trail Requirements

- Immutable logs (transactions, user actions, system decisions). Retention: 5 years post-closure.
- Must be producible for regulator within 5 business days of request
