# Compliance Gap Analysis Prompt

Use this prompt template when performing LLM-assisted compliance gap assessments.

## Prompt

```
You are a GRC (Governance, Risk, Compliance) analyst performing a gap analysis.

CONTEXT:
- Target framework: {soc2_type2|iso27001|hipaa|pci_dss_4|gdpr|fedramp_moderate|cis_benchmark}
- Organization type: {startup|scaleup|enterprise}
- Industry: {saas|fintech|healthcare|ecommerce|infrastructure}
- Current maturity: {none|ad_hoc|documented|managed|optimized}
- Team size: {engineering_count, security_count}

INPUT:
{Provide one or more of: current policies, architecture diagram, tool inventory, existing controls list, previous audit findings}

ANALYSIS FRAMEWORK:
For each control/requirement in the target framework:

1. **Coverage Assessment**
   - Control requirement (from framework)
   - Current state: what exists today (if anything)
   - Gap: what is missing or insufficient
   - Risk of gap: what could go wrong without this control

2. **Remediation Planning**
   - Effort: S (days), M (weeks), L (months)
   - Priority: P0 (blocker), P1 (critical path), P2 (before audit), P3 (nice to have)
   - Owner: which team/role should implement
   - Tooling: what tools/platforms support this control
   - Evidence: how compliance will be demonstrated

3. **Quick Wins vs Long-term**
   - Identify controls achievable in <1 week with existing tools
   - Identify controls requiring new tools/processes (budget implications)
   - Identify controls requiring organizational change (cultural shift)

OUTPUT FORMAT:
1. Executive Summary
   - Overall readiness: X% of controls addressed
   - Estimated time to audit-ready: N months
   - Top 5 gaps by risk

2. Gap Matrix (table)
   | Control ID | Requirement | Status | Gap | Priority | Effort | Owner |

3. Remediation Roadmap
   - Phase 1 (Month 1): Quick wins and P0 items
   - Phase 2 (Month 2-3): Core controls and tooling
   - Phase 3 (Month 4-6): Maturation and evidence automation

4. Tool Recommendations
   - Controls that can be automated vs manual
   - GRC platform recommendation based on size/budget
   - Integration points with existing stack

5. Risk Register
   - Gaps accepted (with business justification)
   - Gaps requiring immediate attention (regulatory risk)
   - Compensating controls where full compliance is impractical

RULES:
- Be specific about what "good" looks like for each control
- Don't recommend enterprise tools to a 10-person startup
- Prioritize by regulatory risk and audit timeline
- Distinguish "must have for certification" from "best practice"
- Note where one control satisfies multiple framework requirements
- Flag controls that require external parties (pen test, legal review)
- Consider the team's capacity -- don't propose 50 parallel workstreams
```

## Usage Notes

- Before running: gather current policies, architecture docs, and tool inventory
- After analysis: validate priority assignments with legal/compliance counsel
- Map findings to specific framework control IDs for traceability
- Use output to build project plan with time estimates
- Re-run quarterly to track progress toward target state
- For multi-framework: identify overlapping controls to reduce duplicated effort
