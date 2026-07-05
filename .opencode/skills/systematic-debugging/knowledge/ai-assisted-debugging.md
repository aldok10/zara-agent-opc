---
type: fact
title: "AI-Assisted Debugging"
---
# AI-Assisted Debugging

## Using LLMs for Root Cause Analysis

### Providing Context (Not Just the Error)
- Include: error message + stack trace + relevant code + what you expected
- Share: recent changes (git diff), environment details, reproduction steps
- Add: what you've already tried and ruled out
- Specify: language version, framework version, OS
- The more context you give, the less the AI hallucinates

### Effective Prompting for Debugging
- "Here's the error, the code, and what I expected. What could cause this?"
- "I've ruled out X and Y. What else could explain this behavior?"
- "This works in test but fails in production. What environment differences matter?"
- "This code worked before commit ABC. What changes could cause this regression?"

### What AI is Good At
- Pattern matching against known error signatures
- Suggesting common causes for specific error messages
- Identifying logic errors in small code snippets
- Explaining unfamiliar error messages or stack traces
- Suggesting things to check that you haven't considered

## Automated Log Analysis

### Patterns
- Feed structured logs to AI for anomaly summary
- Ask: "What's different about the failing requests vs successful ones?"
- Correlate timestamps across services
- AI can identify patterns in high-volume logs humans would miss
- Use AI to write the log query (Grafana, CloudWatch, Datadog syntax)

### Structured Approach
- Extract relevant time window
- Filter to the affected service/endpoint
- Compare failing vs passing request patterns
- Look for: spikes, gaps, new error types, latency changes

## Anomaly Detection for Debugging

### Baseline Comparison
- "Here are normal metrics. Here are current metrics. What changed?"
- Compare: response times, error rates, resource usage, traffic patterns
- AI can spot subtle correlations across multiple metrics
- Useful for: "something is wrong but I don't know what"

### Applying It
- Capture baseline during known-good period
- Compare against current state on same dimensions
- Ask AI to rank anomalies by severity and correlation
- Follow up on the top 2-3 anomalies manually

## AI-Generated Hypotheses

### Verify Before Acting
- AI hypotheses are starting points, not conclusions
- Each suggestion needs a test that could disprove it
- Don't apply AI-suggested fixes without understanding them
- If the AI gives 5 suggestions, test the most likely first
- Track which AI suggestions were correct over time (build intuition)

### Red Flags in AI Output
- Very confident about runtime state it can't observe
- Suggesting fixes for symptoms rather than causes
- Proposing changes to code it hasn't seen
- Generic advice that doesn't address your specific situation
- Suggesting deprecated APIs or outdated patterns

## Limitations

### What AI Cannot See
- Runtime state: variable values at the moment of failure
- Network conditions: latency, packet loss, DNS resolution
- Environment: actual config values, file permissions, disk space
- Concurrency: exact thread interleaving that causes the race
- History: what actually happened vs what the code says should happen

### When AI Debugging Falls Short
- Intermittent issues (requires observing the failure in context)
- Performance issues (needs actual profiling data, not guesses)
- Configuration bugs (AI doesn't know your actual config)
- Integration issues (behavior depends on external system state)
- Security issues (AI may miss subtle vulnerabilities)

### Compensating for Limitations
- Pair AI analysis with actual instrumentation
- Use AI to generate hypotheses, use tools to verify
- Don't trust AI's "this is definitely the cause" -- test it
- Provide actual runtime data (logs, metrics) not just code

## Effective Prompt Patterns

### The Debugging Prompt Template
```
Context: [language, framework, versions]
Expected: [what should happen]
Actual: [what happens instead]
Error: [exact error message/stack trace]
Code: [relevant snippet]
Tried: [what you've already attempted]
Question: [specific question]
```

### Progressive Deepening
1. Start broad: "What could cause this error?"
2. Narrow with evidence: "I confirmed X. Now what?"
3. Get specific: "Given X and Y, should I check A or B?"
4. Verify fix: "Will this change fix the issue without side effects?"

### Asking for Alternatives
- "What are 3 other possible causes besides [your theory]?"
- "If this ISN'T a [your theory], what else should I check?"
- "What's the most unusual cause you've seen for this symptom?"
- Forces AI beyond the obvious first answer
