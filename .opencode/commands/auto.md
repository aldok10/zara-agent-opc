---
description: Autonomous work mode - keeps going until goal met, no hand-holding needed
---

# Auto - Autonomous Work Mode

I'm stepping away. Execute this autonomously:

**Task**: $ARGUMENTS

## Pre-flight

1. **Load skills** - `skill("skill-gate")` then `skill("executing-plans")`
2. **Recall** - `reflect_suggest(situation: "$ARGUMENTS")` + `blindspot_check(context: "$ARGUMENTS")`
3. **Assess complexity** - Scan the task for these dimensions. Dispatch ONLY what's clearly triggered:
   - 🔒 Security-sensitive (auth/crypto/secrets/input validation) → `task(subagent_type: "security-reviewer", prompt: "Threat assessment for: $ARGUMENTS")` in parallel with...
   - 🔄 Verification strategy needed (multi-step, complex gates) → `task(subagent_type: "loop-engineer", prompt: "Design verification strategy for: $ARGUMENTS")` in parallel
   - 🏗️ Architecture decision needed → `task(subagent_type: "architect", prompt: "Guide architecture for: $ARGUMENTS")` in parallel
   - 🧪 Feature implementation → `task(subagent_type: "testing-lead", prompt: "Test strategy for: $ARGUMENTS")` in parallel
   - 3+ independent workstreams → `task(subagent_type: "swarm", prompt: "Decompose: $ARGUMENTS")`
   Don't dispatch speculatively. If unsure, skip and handle directly with `knowledge_passage`.
4. **Apply findings** - Incorporate agent recommendations before starting execution.
5. **Set goal** - `goal(action: "set", condition: "$ARGUMENTS")`
6. **Track session** - `session_log(action: "start", context: "$ARGUMENTS")`
7. **Log task** - `todowrite` with broken-down steps (one `in_progress`, rest `pending`)

## Execution Loop

For each step:

1. **Execute** - Do the work. Keep `todowrite` updated.
2. **Checkpoint** - After each meaningful action, `memory_learn(key: "auto_checkpoint_<step>", value: "...")`
3. **Verify** - Before marking a step done, verify it actually works (tests/lint/compile)
4. **Update** - Brief status update per step: "Step X done, starting step Y"
5. **Re-check goal** - `goal(action: "check")` after each step

## Anti-Doom-Loop

If the same error or blocker hits **3 times** on the same step:
- STOP the current approach
- `memory_learn(type: "pitfall")` - record what didn't work
- **Dispatch based on error type** (parallel if multiple apply):
  - General loop failure / wrong pattern → `task(subagent_type: "loop-engineer", prompt: "Diagnose loop failure: same error 3x on [$ARGUMENTS] step [current step]. Error: [error]. What's the right pattern?")`
  - Security/auth/crypto error → `task(subagent_type: "security-reviewer", prompt: "Security diagnosis: [error] in [$ARGUMENTS]")`
  - Architecture/design issue → `task(subagent_type: "architect", prompt: "Architecture diagnosis: stuck on [error] in [$ARGUMENTS]. Recommend different approach.")`
  - Test/coverage gap → `task(subagent_type: "testing-lead", prompt: "Test strategy diagnosis: [error] in [$ARGUMENTS]")`
- Apply recommendations
- If 3 fundamentally different approaches also fail → **Escalate**

## Escalation

If stuck after 3 fundamentally different attempts:
1. `memory_episode` - record the blocker
2. `goal(action: "done")` - mark goal as failed
3. Write a summary: what was attempted, where it failed, what might work next
4. STOP. Don't keep looping.

## Completion

When task is done (or escalated):

1. **Verify** - `skill("verification-before-completion")` before claiming done
2. **Reflect** - `reflect(task: "$ARGUMENTS", outcome: "success"|"failure")`
3. **Session end** - `session_log(action: "check")`, suggest break if >90min
4. **Report** - Final summary: what was done, key decisions, verification results, any open issues

## Constraints

- Never ask for confirmation on safe operations
- Safe = read, write, lint, test, build. Confirm = config changes, installs. Stop = destructive ops.
- If you need user input to proceed → checkpoint state, write summary, STOP.
