# Story Writing

## User Story Format

```
As a [role/persona],
I want [action/capability],
So that [benefit/value].
```

Each part matters:
- **Role**: Who benefits? Specific > generic. "Premium subscriber" > "user"
- **Action**: What do they want to do? Observable behavior.
- **Benefit**: Why? Business value or user outcome. The "so that" prevents features without purpose.

## INVEST Criteria

| Letter | Criterion | Test |
|--------|-----------|------|
| I | Independent | Can be built and delivered without other stories |
| N | Negotiable | Details can be discussed, not locked in stone |
| V | Valuable | Delivers value to user or business on its own |
| E | Estimable | Team can roughly size it (not too vague) |
| S | Small | Fits in one sprint (1-5 days of work) |
| T | Testable | Clear way to verify done/not-done |

### Applying INVEST

If a story fails a criterion:
- Not Independent? Look for a way to split differently
- Not Valuable? Is it actually a task, not a story? Or a technical enabler that needs a user-facing story wrapper?
- Not Estimable? Spike first, then write the story
- Not Small? Split it (see splitting patterns)
- Not Testable? Add acceptance criteria until it is

## Story vs. Task vs. Epic

| Level | Scope | Example |
|-------|-------|---------|
| Epic | Large capability, spans sprints | "Users can manage their subscriptions" |
| Story | User-valuable increment | "User can cancel subscription" |
| Task | Implementation step (no user value alone) | "Add cancellation endpoint" |

Tasks belong UNDER stories. Never plan tasks without a parent story.

## Story Mapping

### Building the Map

```
Backbone (activities):  Browse > Select > Purchase > Receive > Return
                          |        |         |          |        |
Walking skeleton:       Search   Add to    Checkout   Track    Request
                        View     cart      Pay        Receive  Refund
                          |        |         |          |        |
Details:               Filter   Save for   Apply      Rate     Exchange
                       Compare  later      coupon     Review
                       Wishlist Quantity   Gift wrap
```

### How to Use

1. **Backbone**: The user's journey from left to right
2. **First row below**: Minimum viable experience (walking skeleton)
3. **Lower rows**: Increasingly nice-to-have details
4. **Horizontal slices** = releases (top slice = MVP)

## Writing Tips

### Good Story Names

Use verb-noun format for quick scanning:
- "Cancel subscription"
- "Filter search results by date"
- "Export report to PDF"
- "Receive low-stock alert"

### Avoid These Patterns

**Too technical:**
"As a system, I want to cache API responses so that latency is reduced"
(This is an implementation detail, not a user story)

**No clear value:**
"As a user, I want a settings page so that I have settings"
(Why? What settings? What problem does it solve?)

**Too large:**
"As a user, I want to manage my account"
(This is an epic, not a story)

**Solution-prescriptive:**
"As a user, I want a dropdown menu with all countries so I can select mine"
(Prescribes UI. Better: "I want to specify my country for shipping accuracy")

## Conversation and Confirmation

The story card is a placeholder for a conversation. The real specification emerges from:

1. **Card**: Written story (brief)
2. **Conversation**: Discussion between dev team and PO about details
3. **Confirmation**: Acceptance criteria that define "done"

Stories are NOT detailed specs. They're promises to have a conversation.

## Story Lifecycle

```
Identified -> Refined -> Ready -> In Progress -> Done -> Released
```

**Ready** means:
- Acceptance criteria written
- Dependencies identified
- Team has estimated
- No open questions blocking start
- Small enough for one sprint

## Persona-Driven Stories

Derive stories from persona goals:

```
Persona: Sarah, Operations Manager
  Goal: Reduce manual reporting time from 4 hours to 30 minutes
    Story: Generate weekly ops report automatically
    Story: Customize report columns and date range
    Story: Schedule report delivery to email
    Story: Flag anomalies in report data
```

Connect every story to a persona goal. If you can't, question whether it's needed.
