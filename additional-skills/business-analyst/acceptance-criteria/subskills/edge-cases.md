---
type: subskill
title: "Edge Cases"
---

# Edge Cases

## Core Concepts

- Edge cases live at boundaries: empty inputs, max values, concurrent access, time zones
- Every business rule has a "what if" shadow  -  the path nobody discussed in the meeting
- Edge cases are not optional extras; they prevent production incidents
- Categories: boundary values, null/empty states, timing issues, permission conflicts, data format variations
- Discovery happens through systematic questioning, not hope

## Key Practices

- Apply boundary analysis: zero, one, many, max, max+1 for every numeric field
- Ask "what happens if this is empty/missing/null?" for every input
- Consider temporal edges: midnight, DST transitions, leap years, timezone boundaries
- Map permission edges: what if user loses access mid-operation?
- Document discovered edges as explicit acceptance criteria, not footnotes

## Common Mistakes

- Assuming "the user will never do that"  -  they will, on day one
- Only testing the golden path during story refinement
- Discovering edge cases in production instead of during analysis

## When to Apply

- Refining any user story before it enters a sprint
- Reviewing acceptance criteria for completeness
- After a production bug reveals a missed boundary condition
- When integrating with external systems (their edge cases become yours)
