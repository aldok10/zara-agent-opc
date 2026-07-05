---
type: example
title: "Well-Structured Code Review Comments"
---

# Well-Structured Code Review Comments

## Context
When reviewing pull requests, the quality of comments directly impacts whether feedback gets acted on. This template shows the difference between vague/unhelpful comments and actionable ones that teach and improve code.

## Code/Template

### Bad Comments (Avoid These)

```markdown
# ❌ Vague
"This doesn't look right."

# ❌ No context or alternative
"Don't do this."

# ❌ Stylistic nitpick disguised as important
"I would have done this differently."

# ❌ Too long, buries the point
"So I was thinking about this and I remember back when we had a similar issue
in the payments service where we did something like this and it caused problems
because of the way the database handles connections and I think we should
probably consider using a different approach here because..."

# ❌ Demanding without explaining why
"Use a Map instead of an object."
```

### Good Comments (Follow This Pattern)

```markdown
# ✅ Bug: Clear problem + evidence + fix

**Bug**: This query is vulnerable to race conditions under concurrent writes.

If two requests hit `/transfer` simultaneously:
1. Both read balance = $100
2. Both pass the `balance >= amount` check
3. Both deduct, resulting in negative balance

Suggestion: Use `SELECT ... FOR UPDATE` or an atomic decrement:
​```sql
UPDATE accounts SET balance = balance - $1
WHERE id = $2 AND balance >= $1
RETURNING balance;
​```

---

# ✅ Performance: Measurable impact + alternative

**Perf** (non-blocking): `Array.find()` inside a loop gives O(n²) here.
With 10k users this runs ~50ms; fine now but will degrade.

Consider building a lookup Map before the loop:
​```typescript
const userMap = new Map(users.map(u => [u.id, u]));
for (const order of orders) {
  const user = userMap.get(order.userId);
}
​```

---

# ✅ Security: Specific risk + severity + mitigation

**Security** (blocking): User-controlled `redirect_url` is passed directly to
`res.redirect()` without validation. This enables open redirect attacks
(OWASP A10).

Fix: Validate against an allowlist of known hosts:
​```typescript
const allowed = new Set(['app.example.com', 'docs.example.com']);
const target = new URL(redirectUrl);
if (!allowed.has(target.host)) {
  return res.redirect('/dashboard');
}
​```

---

# ✅ Suggestion: Optional improvement with rationale

**Nit** (optional): This error message leaks internal table names to the client.
Users see: "Failed to query payment_transactions_v2 table"

Suggest a generic message for clients, keep details in logs:
​```typescript
logger.error('Query failed', { table: 'payment_transactions_v2', err });
throw new AppError('Payment lookup failed. Please try again.', 500);
​```

---

# ✅ Question: Genuine curiosity, not passive aggression

**Question**: Is there a reason we're retrying 5 times with no backoff?
The downstream service has a 2s timeout, so 5 sequential retries could
block the request for 10s. Would exponential backoff with a max of 3
attempts work here?

---

# ✅ Praise: Specific, reinforces good patterns

**Nice**: Good call extracting the rate-limit logic into middleware.
This keeps the route handlers clean and makes it easy to adjust
limits per-endpoint later.
```

### Comment Prefixes (Team Convention)

| Prefix | Meaning | Must Address? |
|--------|---------|---------------|
| **Bug** | Correctness issue | Yes |
| **Security** | Vulnerability | Yes |
| **Perf** | Performance concern | Discuss |
| **Nit** | Style/preference | Optional |
| **Question** | Clarification needed | Respond |
| **Nice** | Positive reinforcement | — |

## Key Points
- Every blocking comment needs: what's wrong, why it matters, and a suggested fix
- Prefix comments with severity so authors can triage effectively
- Praise specific good decisions—it reinforces patterns and builds trust
