# ReAct Pattern (Reasoning + Acting)

ReAct interleaves explicit reasoning traces with tool actions. The agent thinks before it acts, observes the result, then thinks again. It beats pure chain-of-thought on tasks requiring tools, and beats pure tool-use on tasks requiring reasoning.

## Structure

```
Thought: [reasoning about what to do and why]
Action: [tool call or command]
Observation: [result from the action]
Thought: [interpret result, decide next step]
Action: [next tool call]
Observation: [result]
... repeat until done
```

## Why It Works

Pure CoT: reasons well but can't interact with the world. Gets stuck on questions that require looking things up or testing.

Pure tool-use: acts without thinking. Makes unnecessary calls, misinterprets results, takes wrong paths without noticing.

ReAct combines both: the reasoning trace keeps the agent grounded in its objective, while actions provide real-world feedback that reasoning alone cannot produce.

## When to Use

- Tasks needing both reasoning and external information
- Multi-step tool interaction where each step depends on prior results
- Debugging (hypothesize → test → interpret → next hypothesis)
- Research (question → search → evaluate → refine question)
- Code generation (plan → write → test → fix)

## Example

```
Thought: The test is failing with "undefined is not a function" on line 42.
         I need to check what's being imported there.
Action: read file src/utils.ts lines 38-45
Observation: Line 42 calls `parseConfig()` imported from './config'
Thought: The import exists but maybe the function isn't exported.
         Let me check the config module.
Action: read file src/config.ts
Observation: The function is named `parseConfiguration`, not `parseConfig`
Thought: Name mismatch. I'll fix the import.
Action: edit src/utils.ts, change `parseConfig` to `parseConfiguration`
Observation: File saved successfully.
Thought: Now I should verify the test passes.
Action: run tests
Observation: All tests pass.
```

## Key Principles

- Always reason before acting. Never fire tools blindly.
- Let observations override prior assumptions.
- Each thought should reference what was just observed.
- Stop reasoning loops that don't lead to actions. If you can't act on it, move on.
- The reasoning trace is for the agent's benefit. Keep it concise and decision-oriented.

## Failure Modes

- Reasoning without acting (analysis paralysis)
- Acting without reasoning (thrashing)
- Ignoring observations that contradict the plan
- Over-verbose thoughts that waste context window
