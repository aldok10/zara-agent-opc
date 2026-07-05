# Cognitive Debugging

## Hypothesis-Driven Debugging

### The Scientific Method Applied
1. Observe: gather symptoms (error messages, logs, behavior)
2. Hypothesize: form a specific, testable explanation
3. Predict: if hypothesis is true, what else should be true?
4. Test: design an experiment that could disprove the hypothesis
5. Conclude: update understanding based on results

### Key Principles
- One variable at a time -- change one thing, observe
- Prefer experiments that DISPROVE your theory
- Write down your hypothesis before testing (prevents confirmation bias)
- If the test passes but the bug remains, the hypothesis was wrong -- move on
- Keep a log of hypotheses tested and results

## Bisection Technique

### Narrowing the Search Space
- Binary search for the problem: halve the possibilities each step
- `git bisect`: find the commit that introduced the bug
- Comment out half the code -- does the bug persist?
- Half the inputs: which subset triggers the issue?

### When to Use Bisection
- Bug appeared at some point but you don't know when
- Large codepath with many possible failure points
- Intermittent issues (bisect conditions/inputs, not just code)
- Performance regression (bisect commits, compare metrics)

### Git Bisect Workflow
- `git bisect start` > `git bisect bad` > `git bisect good <hash>`
- Automate: `git bisect run ./test-script.sh`
- Each step eliminates half the remaining commits
- Log results: `git bisect log`

## Rubber Duck Debugging

### Explain to Find the Gap
- Describe the problem aloud (or in writing) step by step
- Force yourself to explain WHY each step should work
- The moment you say "and then it obviously..." -- stop there
- The gap between what you assume and what's true is the bug

### Effective Self-Explanation
- Start from the beginning, not where you think the bug is
- Explain the data flow through the system
- State your assumptions explicitly ("I assume X is always Y")
- Question every assumption -- especially "obvious" ones

## Pair Debugging

### Fresh Eyes Advantage
- A second person doesn't share your mental model's blind spots
- They ask "why?" at the moments you take for granted
- Role: one drives, one observes and questions
- Swap after 15-20 minutes if stuck

### Effective Pairing
- Explain the problem fresh -- don't dump your entire history
- Let the observer ask naive questions (they often hit gold)
- Don't defend your previous approaches -- stay open
- Timebox: if 30 min of pairing doesn't help, step back further

## When to Stop and Ask for Help

### Time Budget
- Set a timebox before starting (30 min, 1 hour, 2 hours)
- When the timer hits: assess progress honestly
- No progress in the last 30 min? Change approach or escalate
- Diminishing returns: each hour gives less insight than the last

### Signals You're Stuck
- Trying the same thing with minor variations
- Emotional frustration overriding logical thinking
- Expanding scope instead of narrowing it
- Reading the same code over and over without new insight

### How to Ask Well
- State what you've tried (saves others from repeating)
- Share your current best hypothesis
- Provide reproduction steps
- Show what you've already ruled out

## Confirmation Bias in Debugging

### The Trap
- You form a theory and only look for evidence supporting it
- You interpret ambiguous results as confirmation
- You skip tests that could disprove your theory
- You dismiss contradicting evidence as "noise"

### Countermeasures
- Explicitly try to DISPROVE your hypothesis
- Ask: "What else could cause this symptom?"
- Generate at least 2-3 alternative hypotheses
- Have someone else review your reasoning

### Common Biases
- Recency: "It must be the last thing I changed"
- Familiarity: "It's probably in the component I know best"
- Anchoring: "The error message says X so X must be the cause"
- Availability: "This happened last time so it's the same issue"

### Breaking Free
- Look at the evidence without a theory first
- List ALL possible causes before investigating any
- Prioritize by likelihood AND testability
- Accept when evidence contradicts your favorite theory
