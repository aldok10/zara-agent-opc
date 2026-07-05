---
name: data-analysis
description: "Business data analysis: ERDs, data dictionaries, DFDs, data lineage, metrics/KPIs, quality assessment"
---

# Data Analysis Skill

## Scope

Model, document, and measure business data. Covers entity-relationship modeling (Crow's foot), data dictionaries, data flow diagrams, data lineage, quality assessment, and KPI/metrics definition. Bridge between raw data structures and actionable business understanding.

## First Action

Identify whether the task is structural (model/document data) or measurement (define metrics/KPIs). For structural: start with a context-level DFD or ERD to establish boundaries. For measurement: define the business question and success criteria with baseline and target.

## Constraints

1. ERDs use Crow's foot notation -- entities as rectangles, attributes listed, relationships as lines with cardinality symbols
2. Every relationship documents cardinality (1:1, 1:M, M:N) and optionality (mandatory/optional) explicitly
3. Data dictionaries include: field name, data type, constraints, source system, business meaning, example values
4. DFD levels follow progression: context diagram (boundary) -> level 0 (major processes) -> level 1 (sub-processes)
5. Data lineage traced from source system through transformations to consumption point
6. Every data element has a source system and a business owner
7. Data quality assessed on six dimensions: accuracy, completeness, timeliness, consistency, validity, uniqueness
8. Quality thresholds are measurable per dimension -- no subjective assessments
9. Every metric needs: definition, formula, data source, measurement frequency, owner
10. KPIs must be SMART: specific, measurable, achievable, relevant, time-bound
11. Distinguish leading indicators (predictive) from lagging indicators (outcome)
12. Reporting requirements specify: audience, frequency, KPIs, drill-down paths, data freshness needs
13. Start with 3-5 KPIs per domain, not 30 -- minimum viable measurement
14. Document assumptions and limitations of every model or analysis

## DO NOT

1. Create ERDs without validating cardinality with domain experts
2. Define data dictionaries without example values and business context
3. Skip DFD context diagram -- jumping to detail loses system boundary clarity
4. Specify reports without defining underlying data source and refresh cadence
5. Assess data quality without measurable thresholds per dimension
6. Present metrics without context (baseline, trend, benchmark)
7. Use vanity metrics without actionable complement
8. Report averages without distribution context (median, percentiles, outliers)
9. Claim causation from observational data alone

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Entity relationships, data model, normalization | ERD | subskills/erd.md |
| Field specs, business glossary, data catalog | Dictionary | subskills/dictionary.md |
| Data profiling, dimension scoring, remediation | Quality | subskills/quality.md |
| KPI trees, dashboards, drill-down specs | Reporting | subskills/reporting.md |
| Data flows, process-data mapping, system boundaries | DFD | subskills/dfd.md |

## Verification

- ERD reviewed by domain expert and developer; cardinality confirmed for every relationship
- Data dictionary covers 100% of in-scope fields with no blank business meanings
- DFD context diagram validated against system boundary and external entities
- Data lineage traces every element from source to consumption with transformations noted
- Data quality scores baselined with measurable thresholds defined
- Every metric has definition, formula, source, frequency, and owner
- Segmentation applied -- no aggregate-only conclusions in measurement tasks

## Knowledge

- knowledge/erd-patterns.md -- Crow's foot notation, normalization levels
- knowledge/dfd-levels.md -- Context through level 2, notation rules
- knowledge/data-quality.md -- Six dimensions, scoring frameworks
- knowledge/metrics-frameworks.md -- HEART, AARRR, North Star, KPI trees
- tools/data-dictionary-template.md -- Standard field specification format

## AI-Era Context (2026)

- LLMs generate ERDs and data dictionaries from schema DDL or natural language descriptions
- AI-powered data catalogs (Alation, Atlan) auto-document lineage and suggest business glossary terms
- Data quality platforms (Great Expectations, Monte Carlo) provide continuous automated profiling
- Product analytics (Amplitude, PostHog) use AI for anomaly detection on KPI dashboards
- Schema inference tools reduce manual data dictionary creation but still require BA validation of business meaning

## Related Skills

- requirements (data requirements feed NFRs and acceptance criteria)
- process-modeling (DFDs complement BPMN process maps)
- stakeholder-analysis (metrics aligned to stakeholder goals, ERDs validated by domain experts)
