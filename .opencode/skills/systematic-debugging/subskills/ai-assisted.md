# AI-Assisted Debugging

## When to Load

Using AI tools (LLM, copilot, agent) for debugging assistance.

## Principle

AI accelerates hypothesis generation but cannot observe runtime state. You must verify every diagnosis. AI is a thinking partner, not an oracle.

## Effective Context for LLM Debugging

### What to provide

1. **Error message and full stack trace** -- the primary signal
2. **Recent changes** -- git diff or summary of what changed before the bug appeared
3. **Expected vs actual behavior** -- concrete, not vague ("returns 404" not "doesn't work")
4. **Relevant code** -- the function/module where the error occurs, plus callers
5. **Environment** -- language version, OS, framework version, config
6. **What you already tried** -- prevents AI from suggesting things you ruled out

### What NOT to provide

- Entire codebase (dilutes signal, wastes context)
- Unrelated files or config
- Speculation without evidence ("I think it might be X")

### Prompt structure

```
Bug: [one-sentence description]
Error: [exact error message]
Stack trace: [full trace]
Recent changes: [what changed]
Expected: [correct behavior]
Actual: [wrong behavior]
Already tried: [list]
Code: [relevant snippet]
```

## Limitations

- AI cannot see runtime state (memory, network, file system, live database)
- AI cannot run your code (unless it has tool access to your environment)
- AI training data may be outdated (library APIs change)
- AI may confidently propose fixes for the wrong root cause
- AI lacks your domain context (business rules, team conventions)

## Verification Protocol

Every AI-suggested fix must pass this gate:

1. **Reproduce** -- can you trigger the bug reliably before the fix?
2. **Explain** -- can YOU explain why the fix works? If not, dig deeper.
3. **Test** -- does the fix pass existing tests? Did you add a test for this case?
4. **Side effects** -- does the fix break anything else? Run full test suite.
5. **Root cause** -- does the fix address root cause, or just suppress the symptom?

If any step fails, reject the suggestion and provide more context for a new attempt.

## Anti-Patterns

- **"Just fix it" without understanding** -- blindly applying suggestions leads to symptom suppression, fragile patches, and inability to debug the next occurrence
- **Trusting confidence as correctness** -- AI presents wrong answers with equal confidence; verification protocol is non-negotiable
- **Iterating without new information** -- if AI is wrong, provide what happened, new errors, and context discovered while testing
- **Skipping reproduction** -- without reproducing first, you cannot verify the fix or write a regression test

## Best Practices

- Use AI for hypothesis generation, not as the final word
- Pair AI suggestions with observability data (traces, logs, metrics)
- Ask AI to explain the reasoning, not just the fix
- Use AI to generate test cases for the bug (then verify they actually fail)
- Keep a log of AI suggestions that were wrong -- learn the failure patterns
