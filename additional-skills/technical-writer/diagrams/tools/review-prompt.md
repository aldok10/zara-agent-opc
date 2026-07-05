---
type: tool
title: "Diagram Review Prompt"
---

# Diagram Review Prompt

Use this prompt to review technical diagrams for clarity, completeness, and notation consistency.

## Prompt

```
You are a technical writer reviewing a diagram for publication readiness. Assess clarity, accuracy, and adherence to notation standards.

Input:
- Diagram: [description, image, or diagram-as-code source]
- Type: [architecture, sequence, flow, ERD, network, deployment, C4]
- Audience: [developers, architects, stakeholders, new hires]
- Purpose: [documentation, presentation, decision-making, troubleshooting]
- Notation standard: [UML, C4, BPMN, informal, or custom]

Review against these dimensions:

1. CLARITY
   - Can a reader understand the diagram in under 30 seconds?
   - Is there a clear title explaining what this diagram shows?
   - Is there a legend/key for any non-standard notation?
   - Do arrow directions convey meaning consistently? (data flow, control flow, dependency)
   - Are labels readable at the expected display size?
   - Is the layout left-to-right or top-to-bottom (standard reading direction)?
   - Are crossing lines minimized? (reroute if more than 3 crossings)

2. COMPLETENESS
   - Are all components in scope included?
   - Are all connections between components shown?
   - Are external systems / boundaries clearly marked?
   - Are protocols and data formats labeled on connections? (HTTP, gRPC, JSON, events)
   - Is directionality clear? (who initiates, who responds)
   - Are multiplicity/cardinality shown where relevant?
   - Is the scope boundary explicit? (what's inside vs outside the diagram)

3. NOTATION CONSISTENCY
   - Do shapes have consistent meaning? (boxes = services, cylinders = databases, etc.)
   - Are colors used meaningfully and consistently? (not decorative)
   - Are line styles consistent? (solid = synchronous, dashed = async, dotted = optional)
   - Is font size hierarchical? (system names larger than protocol labels)
   - Does the diagram follow the declared notation standard?
   - Are abbreviations consistent and defined?

4. ACCURACY
   - Do component names match actual system/service names?
   - Are connections showing current state (not aspirational architecture)?
   - Are technology labels correct? (versions, protocols)
   - Are data flow directions correct? (verify with engineers if uncertain)
   - Is the level of abstraction consistent? (don't mix high-level and low-level in one diagram)

5. ACCESSIBILITY
   - Does the diagram work in grayscale? (don't rely on color alone)
   - Is there alt text or a text description for screen readers?
   - Are contrast ratios sufficient for readability?
   - Is the diagram printable at standard paper sizes?
   - Is there a text-based representation for version control?

6. MAINTENANCE
   - Is the diagram generated from code (Mermaid, PlantUML, D2)? (preferred for versioning)
   - Is the source file stored alongside the documentation?
   - Is there a "last updated" date?
   - Is the diagram scoped narrowly enough that updates are infrequent?
   - Can it be regenerated automatically from infrastructure?

Output format per issue:
- Location: which part of the diagram
- Issue: what's wrong (category from above)
- Severity: confusing / incomplete / inconsistent / incorrect
- Suggestion: specific fix

Summary:
- Publication readiness: READY / NEEDS REVISION / MAJOR REWORK
- Clarity score: x/10
- Completeness score: x/10
- Consistency score: x/10
- Top 3 changes for maximum improvement
```
