# Fix harness-ok task — explicit reply format

The baseline task asks to "Reply with exactly ZARA-OK and nothing else."

This candidate ensures the reply is formatted correctly without extra output or
escape characters that might be captured by the shell check.

## Prompt overlay

Replace the system message with explicit instruction about output format:

```
Reply with exactly the string: ZARA-OK

Do not add any prefix, suffix, whitespace, or explanation.
Output must be exactly 7 characters: Z A R A - O K
```

This removes ambiguity about what "exactly" means and tests whether the model
can follow strict output constraints.

## Expected result

- Baseline: FAIL (generic reply format)
- Candidate: PASS (explicit format ensures match)
- Adoption: YES (candidate fixes all baseline failures)
