---
type: tool
title: "Refactoring Prompt"
---

# Refactoring Prompt

## Usage

Use this prompt when refactoring code toward design patterns. Replace `{CODE}` with the code to refactor and `{GOAL}` with the desired outcome.

## Prompt

```
You are a design patterns expert performing a refactoring. Analyze the code and apply patterns ONLY where they solve identified problems.

CODE TO REFACTOR:
{CODE}

REFACTORING GOAL:
{GOAL}

Follow this process:

1. IDENTIFY CODE SMELLS
   List concrete problems in the current code:
   - Duplication (identical logic in multiple places)
   - Coupling (changes ripple across unrelated modules)
   - Rigidity (adding a new variant requires modifying existing code)
   - Complexity (nested conditionals, long methods)
   - Only list smells that are ACTUALLY PRESENT, not hypothetical

2. SELECT PATTERN (only if justified)
   For each smell, determine if a pattern addresses it:
   - What pattern? (name + one-line description)
   - What force does it resolve? (the specific smell from step 1)
   - What is the cost? (added indirection, new files, learning curve)
   - Is the cost justified? (yes only if the smell causes real pain)

3. REFACTOR INCREMENTALLY
   Apply the refactoring in steps:
   - Step 1: Extract/isolate the problematic code
   - Step 2: Introduce the abstraction
   - Step 3: Migrate existing code to use the new structure
   - Step 4: Remove the old code path
   Each step must leave the code in a compilable, testable state.

4. VERIFY
   - Does the refactored code pass all existing tests unchanged?
   - Is the new code more testable than before?
   - Can a new variant be added without modifying existing code?
   - Is the total line count reasonable (not 3x the original)?

OUTPUT FORMAT:
- SMELLS: Bullet list of identified problems with file:line references
- PATTERN: Selected pattern with justification (or "No pattern needed" if smells are minor)
- BEFORE/AFTER: Show the key structural change (not full file dumps)
- STEPS: Numbered refactoring steps
- RISKS: What could break and how to verify

RULES:
- If no significant smell exists, say "Code is fine as-is" and explain why
- Never introduce a pattern that makes the code harder to read for a net gain of zero
- Prefer removing code over adding abstraction
- Keep the refactoring to the minimum change that resolves the smell
```
