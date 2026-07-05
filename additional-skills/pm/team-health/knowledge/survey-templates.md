---
type: fact
title: "Survey Templates"
---

# Survey Templates

## DevEx Quarterly Survey (Core)

Scale: 1=Strongly Disagree, 2=Disagree, 3=Neutral, 4=Agree, 5=Strongly Agree

### Flow State
1. "I regularly get 2+ hour uninterrupted blocks for focused work."
2. "I can complete most tasks without being blocked by others."
3. "Meetings don't fragment my productive time."

### Cognitive Load
4. "I understand the systems I maintain well enough to change them confidently."
5. "Our tools and processes reduce friction rather than adding it."
6. "The scope of my team's responsibilities feels manageable."

### Feedback Loops
7. "I get CI/build results within 15 minutes."
8. "I know within a few hours if my change works correctly in production."
9. "Code review feedback arrives within 4 hours."

### Open Response
10. "What one change would most improve your daily work?"

## Quarterly Comparison Template

| Dimension | Q-1 | Q0 | Delta | Action Needed? |
|-----------|-----|-----|-------|----------------|
| Flow State | avg | avg | +/- | Y/N |
| Cognitive Load | avg | avg | +/- | Y/N |
| Feedback Loops | avg | avg | +/- | Y/N |

## Trend Analysis Format

**Period**: Q[X] [Year]
**Response rate**: X/Y (Z%)
**Top concern**: [theme from open text]

**Dimension scores** (avg, 1-5):
- Flow: X.X (prev: X.X, delta: +/-X.X)
- Load: X.X (prev: X.X, delta: +/-X.X)
- Feedback: X.X (prev: X.X, delta: +/-X.X)

**Actions from last quarter**: [completed/in-progress/dropped]
**New actions**: [top 2 from this quarter's results]

## Response Rate Targets

- >80% = high confidence in results.
- 60-80% = usable but check for non-response bias.
- <60% = results unreliable. Fix survey fatigue before next quarter.

## DX Core 4 Framework

Note: DX Core 4 shares primary authors with the ACM DevEx paper (Noda, Storey, Greiler). Forsgren is a full author on the DevEx paper and a contributor on Core 4. DX Core 4 explicitly encapsulates DORA + SPACE + DevEx into a unified measurement architecture. DX Core 4 dimensions: Speed, Effectiveness, Quality, Business Impact. ACM DevEx dimensions: Flow State, Cognitive Load, Feedback Loops.

Four dimensions (supplement DevEx triad with organizational context):
1. **Speed**  -  How fast can I ship?
2. **Effectiveness**  -  Does the work produce the right outcomes?
3. **Quality**  -  Is the output reliable and maintainable?
4. **Impact**  -  Does my work matter to users/business?

### AI Tooling Questions

11. "AI coding tools (Copilot, etc.) meaningfully speed up my work."
12. "I trust AI-generated code suggestions enough to ship them with minimal review."
13. "Reviewing AI-generated code from teammates adds cognitive load."
14. "I have clarity on when to use vs not use AI tools for my tasks."

## BICEPS Model (Team Belonging)

Assess psychological safety across six dimensions:
- **Belonging**: "I feel like I'm part of this team."
- **Improvement**: "I'm growing and learning here."
- **Choice**: "I have autonomy in how I do my work."
- **Equality**: "Decisions are made fairly."
- **Predictability**: "I know what to expect from processes and leadership."
- **Significance**: "My work is recognized and matters."

Survey: 1 question per dimension, Likert 1-5. Flag any dimension <3.5 avg for follow-up.
