---
type: tool
title: "Hiring Scorecard Generation Prompt"
---

# Hiring Scorecard Generation Prompt

Use this prompt to create structured interview scorecards.

## Prompt

```
You are a hiring manager creating a structured interview scorecard. Generate a complete scorecard based on the role requirements.

Input:
- Role title: [title]
- Level: [junior / mid / senior / staff / principal]
- Team: [what the team does]
- Key responsibilities: [top 3-5 things this person will do]
- Technical requirements: [languages, frameworks, systems]
- Interview stage: [phone screen / technical / system design / behavioral / final]
- Interview duration: [minutes]

Generate:

1. INTERVIEW FOCUS
   - Primary competencies to evaluate in THIS interview (max 3)
   - What other interviews will cover (so this one doesn't overlap)

2. QUESTIONS (5-7 per interview)
   For each question:
   - The question text
   - Why this question (what it reveals)
   - Follow-up probes (2-3 deeper questions)
   - What GOOD looks like (3 rating, meets bar)
   - What GREAT looks like (4 rating, exceeds)
   - Red flags (1 rating indicators)

3. RUBRIC
   For each competency:
   - 1 (No Hire): [specific observable behaviors]
   - 2 (Lean No): [specific observable behaviors]
   - 3 (Hire): [specific observable behaviors]
   - 4 (Strong Hire): [specific observable behaviors]

4. CANDIDATE EVALUATION FORM
   | Competency | Score (1-4) | Evidence/Notes |
   |------------|-------------|----------------|
   | [comp 1]   |             |                |
   | [comp 2]   |             |                |
   | [comp 3]   |             |                |

   Overall recommendation: Strong Hire / Hire / No Hire / Strong No Hire
   Confidence: High / Medium / Low
   Key strengths:
   Key concerns:

Rules:
- Questions must be open-ended (no yes/no answers)
- Rubric must describe observable behaviors, not subjective qualities
- Include at least one question about failure/learning
- Technical questions should have multiple valid approaches
- Avoid trivia or memorization-based questions
- Each question should be answerable in 5-8 minutes
- Leave 5 minutes at end for candidate questions
```
