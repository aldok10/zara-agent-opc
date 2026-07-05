# Code Review Metrics

## Time Metrics

**First response time**: time from PR opened to first reviewer comment.
- Target: <4 hours during business hours
- Measure: median, not mean (outliers skew averages)

**Total cycle time**: time from PR opened to merged.
- Target: <24 hours for standard PRs
- Includes: review time + revision time + re-review time
- Exclude: intentional holds (blocked on deploy window, etc.)

## Size Metrics

**PR size (lines changed)**:
- Target: <300 lines (additions + deletions)
- Optimal: 100-250 lines for quality review
- >500 lines: review quality drops significantly
- Track: average, p90, and percentage exceeding threshold

**Files changed per PR**:
- Target: <10 files
- Many files = likely needs decomposition

## Iteration Metrics

**Revision cycles**: number of times PR sent back to author.
- Target: <2 round trips
- High count signals: unclear requirements, missing context, or style disagreements
- Track per-author to identify coaching opportunities

## Quality Metrics

**Defect density**: issues found per 100 lines reviewed.
- Categorize: bugs, design issues, style, documentation
- Higher density in certain areas = more risk, needs targeted testing
- Trend over time: should decrease as team matures

**Inspection rate**: lines of code reviewed per hour.
- Target: <500 LOC/hour for meaningful review
- >1000 LOC/hour: rubber-stamping, not reviewing
- Measure via time-on-PR (approximated from activity timestamps)

## Distribution Metrics

**Reviewer distribution**:
- Bus factor: how many people review each area?
- Knowledge spread: are reviews concentrated on 1-2 people?
- Target: no single reviewer handles >30% of all PRs
- Track: reviews per person, areas covered per reviewer

## Dashboards & Tools

| Tool | Best For |
|------|----------|
| GitHub Insights | Basic PR metrics (time, size) built-in |
| LinearB | Cycle time, reviewer workload, investment mix |
| Haystack | Engineering metrics, review bottlenecks |
| Sleuth | DORA metrics including review time |
| Custom (BigQuery + GitHub API) | Full control, org-specific queries |

## Actionable Thresholds

Set alerts when metrics drift:
- First response >8h: ping reviewer or reassign
- PR open >48h: escalate to team lead
- PR size >500 lines: require decomposition justification
- Single reviewer >40% load: redistribute assignments
