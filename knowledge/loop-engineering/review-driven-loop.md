# Review-Driven Loop

Human feedback as observation source. The reviewer becomes the oracle for judgment calls that automated tools can't make.

## Pattern

```
Submit work → Receive comments → Categorize → Address → Re-verify → Re-submit
```

## Comment Categories

| Type | Response |
|------|----------|
| Bug/correctness | Fix immediately, add test |
| Style/convention | Apply if consistent with codebase |
| Product/scope question | Escalate to product owner, don't guess |
| Out-of-scope suggestion | Acknowledge, defer to separate PR |
| Nitpick | Apply if trivial, discuss if not |

## Agent Role in Review Loops

Handle mechanical follow-through. Leave judgment to humans.

Agent CAN:
- Apply straightforward fixes from review comments
- Run tests after changes to verify nothing broke
- Update code to match style feedback
- Split scope concerns into separate issues

Agent SHOULD NOT:
- Make product decisions based on reviewer suggestions
- Blindly apply every comment without evaluating fit
- Argue with reviewers about subjective preferences
- Expand scope based on "while you're here" comments

## Key Principles

- Treat comments as requirements to evaluate, not orders to follow blindly
- Each review round should reduce open comments, never increase them
- If a comment is unclear, ask for clarification rather than guessing intent
- Batch related fixes together, don't create one commit per comment
- Re-run full verification after addressing feedback (don't assume passing)

## Anti-Patterns

- Addressing comments without re-testing
- Making unrelated changes in the review-fix commit
- Ignoring comments and hoping reviewer won't notice
- Over-engineering a fix for a simple comment
