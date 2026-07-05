---
type: tool
title: "Minimal Reproduction Case Builder Prompt"
---

# Minimal Reproduction Case Builder Prompt

You are helping construct a minimal reproduction case for a bug: isolating variables, reducing input, and building the smallest failing example.

## Input

**Bug description:** {{what's happening vs what's expected}}
**Original context:** {{full system/file where bug occurs}}
**Triggers:** {{known conditions that cause the bug, if any}}
**Frequency:** {{always | intermittent | rare}}

## Reduction Process

### Phase 1: Confirm the Bug

Before reducing, establish:
1. **Exact reproduction steps** (not "sometimes happens")
2. **Observable symptom** (error message, wrong output, crash)
3. **Environment** (OS, runtime version, dependencies)
4. **Is it deterministic?** If not, identify what varies (timing, data, order)

```
Reproduction baseline:
- Input: [exact input]
- Command: [exact command]
- Expected: [expected output]
- Actual: [actual output]
- Environment: [versions]
```

### Phase 2: Isolate Variables

Systematically eliminate variables using binary search:

#### Input Reduction
1. If input is large (file, dataset, request), halve it
2. Does the bug still reproduce? Keep the smaller half
3. Repeat until removing any part makes the bug disappear
4. The remaining input is the minimal trigger

```
Original input: 1000 lines
Remove lines 500-1000: still fails -> keep first half
Remove lines 250-500: still fails -> keep first quarter
Remove lines 125-250: passes! -> bug needs something in 125-250
Binary search within 125-250...
Minimal input: 3 lines
```

#### Code Reduction
1. Comment out / remove half the code
2. Still fails? Remove more
3. Passes? Put it back, try the other half
4. Result: smallest code that exhibits the bug

#### Dependency Reduction
1. Remove dependencies one at a time
2. Replace with stubs/mocks
3. Goal: reproduce with zero or minimum external deps

#### Environment Reduction
1. Does it reproduce in a fresh environment?
2. Does it reproduce with default configuration?
3. Does it reproduce with a different OS/runtime version?

### Phase 3: Binary Search Through History

If the bug was recently introduced:

```bash
# Git bisect
git bisect start
git bisect bad HEAD
git bisect good <last_known_good_commit>
# Test each commit git offers:
git bisect run ./test_reproduction.sh
# Result: first bad commit
```

### Phase 4: Build the Minimal Example

Structure for the reproduction case:

```
minimal-repro/
├── README.md          # steps to reproduce
├── repro.{ext}        # minimal code
├── input.txt          # minimal input (if needed)
└── expected.txt       # expected output (optional)
```

README template:
```markdown
## Bug: [one-line description]

### Environment
- [runtime] version [X]
- OS: [name]
- Relevant dependency: [name@version]

### Steps
1. [setup command, if any]
2. [run command]

### Expected
[expected output]

### Actual
[actual output or error]

### Notes
- Does NOT reproduce when: [condition]
- Smallest input that triggers: [description]
- Introduced in: [commit/version, if known]
```

### Phase 5: Verify Minimality

The reproduction is truly minimal when:
- [ ] Removing any line of code makes the bug disappear
- [ ] Removing any part of the input makes the bug disappear
- [ ] No unnecessary dependencies remain
- [ ] No unnecessary configuration remains
- [ ] It runs in under 10 seconds (ideally under 1 second)
- [ ] Someone else can reproduce it from the README alone

## Strategies for Hard-to-Reproduce Bugs

### Timing-Dependent
- Add `sleep()` or artificial delays to widen race windows
- Use thread sanitizers (TSAN, Go race detector)
- Run in a loop: `for i in $(seq 1000); do ./repro.sh || break; done`

### State-Dependent
- Capture full state at time of failure (dump, snapshot)
- Check if order of operations matters (shuffle test order)
- Look for global/static state pollution

### Data-Dependent
- Log the exact input that triggered the failure
- Use property-based testing to find minimal failing input
- Check for encoding, locale, or timezone sensitivity

### Environment-Dependent
- Docker container for exact reproduction
- Document exact versions of everything
- Check for filesystem case sensitivity, path length, permissions

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|-------------|-----------------|
| "Repro: run the full test suite" | Isolate the single failing test |
| "Repro: deploy to staging" | Local reproduction with minimal setup |
| "Sometimes fails" (no further detail) | Identify the varying condition |
| Including the full project | Extract only relevant files |
| "Works on my machine" | Document exact environment diff |

## Output Format

```
## Minimal Reproduction

### Summary
[one sentence: what the bug is]

### Minimal Code
[smallest code that fails]

### Minimal Input
[smallest input that triggers]

### Reproduction Command
[single command to run]

### Isolation Results
- Trigger: [exact condition]
- Not triggered when: [what prevents it]
- Introduced: [commit/version/change, if identified]
- Root cause hint: [what the minimization suggests]

### Remaining Uncertainty
- [what could not be reduced further and why]
```

## Rules

- A reproduction that requires "run the whole system" is not minimal.
- Binary search is faster than linear removal. Always halve, never remove one thing at a time.
- If you cannot reproduce locally, the environment difference is a clue, not a blocker.
- Intermittent bugs need a loop, not a single attempt. Run 100+ times before declaring "cannot reproduce."
- The minimal repro IS the bug report. No repro = no fix.
