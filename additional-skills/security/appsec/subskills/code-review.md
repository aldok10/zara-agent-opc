---
type: subskill
title: "Security Code Review"
---

# Security Code Review

## Core Concepts

- Security code review focuses on vulnerability patterns that automated tools miss
- Business logic flaws, authorization bypasses, and race conditions require human judgment
- Review scope: authentication, authorization, input handling, data exposure, cryptography
- Context matters: a pattern safe in one context (internal API) is dangerous in another (public endpoint)
- Reviewers need a checklist aligned to the application's threat model

## Key Practices

- Focus on trust boundaries: where does untrusted input enter? Where does sensitive data leave?
- Check authorization at every access point, not just the UI layer — APIs are the real boundary
- Verify input validation: allowlist over denylist, validate type/length/range/format
- Review error handling: does it leak internal details (stack traces, SQL, file paths)?
- Check secrets management: no hardcoded keys, tokens, or connection strings in source

## Common Mistakes

- Reviewing only for functional correctness while ignoring security implications
- Assuming framework defaults handle security — they often don't cover all cases
- Rubber-stamping reviews under time pressure: security bugs ship when reviews are cursory

## When to Apply

- Any PR that touches authentication, authorization, or data handling logic
- New integrations with external services (new trust boundaries)
- Changes to input parsing, serialization, or API endpoints
- Pre-release review of features handling sensitive data (PII, financial, health)
