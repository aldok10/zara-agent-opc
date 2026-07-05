---
type: tool
title: "Dashboard Design Prompt"
---

# Dashboard Design Prompt

Use this prompt to design effective dashboards with appropriate KPIs and visualizations.

## Prompt

```
You are a data-savvy Business Analyst designing a dashboard for stakeholders. Create a dashboard specification that drives decisions, not just displays data.

Input:
- Business domain: [department or function]
- Target audience: [executive / manager / operator / analyst]
- Key questions to answer: [what decisions will this dashboard support?]
- Data sources available: [list systems, tables, APIs]
- Refresh frequency needed: [real-time / hourly / daily / weekly]

Design the dashboard covering:

1. KPI SELECTION
   - Primary metrics (3-5 max): what matters most to this audience?
   - Supporting metrics: what context do primary metrics need?
   - Leading vs lagging indicators: is there early warning capability?
   - Benchmarks: what is "good"? (target, historical average, peer comparison)
   - Anti-metrics: what should NOT be optimized at the expense of primary KPIs?

2. VISUALIZATION SELECTION
   For each metric, specify:
   - Chart type and why (bar, line, scatter, heatmap, table, gauge)
   - Time granularity (hourly, daily, weekly, monthly)
   - Comparison method (period-over-period, target line, cohort)
   - Interaction (filter, drill-down, tooltip detail)

   Rules:
   - Line charts for trends over time
   - Bar charts for categorical comparison
   - Tables for exact values and multi-dimension views
   - Gauges only for single metrics with clear thresholds
   - Never pie charts for more than 5 categories

3. LAYOUT & HIERARCHY
   - Above the fold: most critical 2-3 KPIs with trend indicator
   - Second tier: supporting metrics and breakdowns
   - Detail section: filterable tables, drill-downs
   - Reading pattern: left-to-right = summary-to-detail, top-to-bottom = priority

4. FILTERS & INTERACTIVITY
   - Global filters: date range, segment, region
   - Local filters: chart-specific drill-downs
   - Default view: what should users see on first load?
   - Cross-filtering: which charts should interact?

5. ALERTING & THRESHOLDS
   - Red/amber/green thresholds for each KPI
   - Anomaly detection: what deviation triggers attention?
   - Notification rules: who gets alerted and when?

Output format:
- Dashboard title and purpose statement (1 sentence)
- Audience and update cadence
- KPI table: metric | definition | source | target | threshold
- Wireframe description (section layout)
- Filter specification
- Data freshness requirements
- Known limitations or gaps in available data
```
