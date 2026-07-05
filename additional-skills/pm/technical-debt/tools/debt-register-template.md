# Debt Register Template

## Prompt

Create/update the tech debt register for [team/project]. For each item, capture:

| Field | Description |
|-------|-------------|
| ID | Sequential identifier |
| Item | Short description of the debt |
| Type | code / architecture / test / documentation / dependency / infrastructure |
| Quadrant | reckless-deliberate / prudent-deliberate / reckless-inadvertent / prudent-inadvertent |
| Impact (1-5) | Effect on team throughput |
| Frequency (1-5) | How often this causes pain |
| Cost (1-5) | Effort to fix |
| Score | (Impact × Frequency) / Cost |
| Owner | Person or team responsible |
| Status | identified / planned / in-progress / resolved |
| Repayment plan | When and how this gets fixed |
| ADR link | Link to ADR if deliberate debt |

## Register Table

| ID | Item | Type | Quadrant | Impact | Freq | Cost | Score | Owner | Status | Repayment | ADR |
|----|------|------|----------|:---:|:---:|:---:|:---:|-------|--------|-----------|-----|
| | | | | | | | | | | | |

## Usage

1. Add new items as discovered (any team member can submit)
2. Score during sprint planning or debt standup
3. Re-score quarterly (costs and impacts shift)
4. Archive resolved items (don't delete—track for retrospective)
