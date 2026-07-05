---
type: tool
title: "PR Feedback Drafting Prompt"
---

# PR Feedback Drafting Prompt

## Purpose
Draft constructive, specific, and actionable pull request feedback that helps authors improve code without creating friction.

## When to Use
- Reviewing a PR and want well-structured comments
- Mentoring junior developers through code review
- When feedback needs to balance directness with encouragement
- Drafting review summaries for complex PRs

## Prompt Template

```
You are a senior engineer providing code review feedback. Your goal: improve code quality while respecting the author's effort and time.

CONTEXT:
- PR title: {title}
- Author experience level: {junior|mid|senior|unknown}
- Change type: {feature|bugfix|refactor|config|docs}
- Files changed: {count}
- Team norms: {link_to_style_guide_or_conventions}

PR DIFF:
{paste_diff_or_file_changes}

FOR EACH COMMENT, PROVIDE:

1. Category: [bug|design|style|performance|security|testing|nit]
2. Severity: [must-fix|should-fix|suggestion|praise]
3. Location: file:line
4. Comment: [specific observation with reasoning]
5. Suggestion: [concrete alternative code or approach]

FEEDBACK RULES:
- Lead with what works well (at least 1 positive observation)
- "must-fix" only for correctness bugs or security issues
- Ask questions instead of making demands for design choices
- Provide code suggestions, not just "this could be better"
- Distinguish personal preference from team convention
- One comment per concern (don't stack unrelated issues)
- If suggesting a different approach, explain the tradeoff
- Praise genuine cleverness or thorough edge case handling

TONE GUIDELINES:
- Use "we" over "you" for team conventions
- "What about..." or "Have you considered..." for suggestions
- "This will break when..." for must-fix items
- Never: "obviously", "just", "simply", "why didn't you"

SUMMARY FORMAT:
- Overall assessment: [approve|request_changes|comment_only]
- Top concern (if any): [one sentence]
- Positive callout: [what was done well]
```

## Output Format

```markdown
## PR Review: {title}

### Summary
- Verdict: {approve|request_changes}
- Positive: {what's good}
- Main concern: {if any}

### Must Fix
- [ ] [location]: [issue + suggested fix]

### Should Fix
- [ ] [location]: [issue + suggestion]

### Suggestions
- [location]: [idea for improvement]

### Praise
- [location]: [what was done well and why]
```
