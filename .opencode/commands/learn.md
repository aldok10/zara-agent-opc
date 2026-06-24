---
description: Learn about the current project - extract stack, structure, tests, CI into memory
---

# Learn - Project Knowledge Extraction

You invoked `/learn`. This teaches Zara about the current project by extracting observable facts.

## Execution

1. Run `project_learn` (optionally with a path argument if not cwd)
2. Show the user what was extracted
3. Ask: "Anything to correct? I stored these as 'observed' - tell me if something's wrong and I'll fix it."

## If User Corrects

When the user says something like "no, we use Vitest not Jest" or "that dep list is wrong":

1. Delete the incorrect memory: `memory_delete(pattern: "project:<name>:<category>:<slug>")`
2. Store the correction: `memory_learn(key: "project:<name>:<category>:<slug>", value: "<corrected>", source: "user_explicit", type: "fact", scope: "project:<name>")`
3. Confirm briefly.

## Notes

- Facts are stored with scope `project:<name>` for isolation
- Source is "observed" (auto-detected), upgraded to "user_explicit" on correction
- Safe to run multiple times (upserts, not duplicates)
- Only extracts what's on disk. No network calls, no guessing.
