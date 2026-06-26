# Four Nested Loops (Production Architecture)

The dominant 2026 pattern for production-grade agents: four nested control loops, each with a single responsibility and distinct failure mode.

## Architecture

```
Loop 4: Hill Climbing (self-improvement over time)
  Loop 3: Event Queue / Orchestration (error isolation, throughput)
    Loop 2: Verification + Retry (deterministic judge, targeted feedback)
      Loop 1: ReAct Agent (think > act > observe > think)
```

## Loop 1: ReAct Agent

Defends against: hallucinated decisions without grounding.

- Think > Act (tool call) > Observe (result) > Think > repeat
- Step cap (e.g. 8) prevents infinite tool-call loops
- Terminal action tool (e.g. `draft_decision`) forces structured commitment
- Feedback signal: whether the agent consulted all relevant tools before deciding

## Loop 2: Verification + Retry

Defends against: single wrong decision from bad reasoning path.

- Deterministic judge (NEVER LLM self-grade). Use tests, linters, ground-truth.
- Targeted feedback on retry: "you said X, correct is Y because Z"
- Message history carries over (prevents repeating same mistake)
- Max retries (e.g. 3). Escalation path (e.g. human queue) is valid terminal state.
- "Refer to human" is success, not failure.

## Loop 3: Event Queue / Orchestration

Defends against: one bad task blocking the pipeline.

- File/queue-based decoupling between producer and consumer
- Per-task error isolation: one error = skip + log, not crash
- Budget exhaustion is the ONLY fatal error (propagates up, stops everything)
- Tamper detection: checksum on ground-truth/scoring data (prevents gaming metrics)
- Triggers Loop 4 after N decisions (e.g. every 8)

## Loop 4: Hill Climbing (Self-Improvement)

Defends against: fixed prompt that cannot improve from experience.

Cycle: reflect > mutate > evaluate > gate

1. **Reflect**: LLM analyzes failure PATTERNS (not specific cases). "Do NOT memorize IDs."
2. **Mutate**: Generate improved system prompt from patterns
3. **Evaluate**: Run candidate against full training set
4. **Gate**: Accept ONLY if score > best AND passes anti-cheating audit

Anti-cheating audit: separate LLM checks for hardcoded answers/memorized IDs.
Without the gate, hill-climbing reliably produces prompts with 100% training / random test accuracy.

## Critical Principles

1. **Judge must be deterministic.** Never use LLM to judge LLM output for correctness.
2. **Budget-check-before-cost.** Check THEN add spend. Prevents overshoot.
3. **One concern per loop.** Never mix verification with orchestration.
4. **Targeted feedback > "try again".** Guide the retry, don't just repeat.
5. **Anti-overfitting gate is mandatory.** Self-improving systems WILL game metrics.
6. **Lessons persist across runs.** Distilled rules, not raw failure logs.
7. **Cognitive surrender is a real risk.** The more reliable the loop, the less humans read output. External monitoring required.

## When NOT to Use

- Single prompt does the job: don't add loops
- No deterministic "done" check exists: loop has no termination signal
- Task runs once, not repeatedly: setup cost not justified
- Human available for immediate review: direct prompting is faster
- Cost per eval run unacceptable: each hill-climbing round is expensive
