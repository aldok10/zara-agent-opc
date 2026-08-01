---
type: subskill
title: "Mocking, Stubs, Fakes"
---

# Mocking, Stubs, Fakes

Mocking is a seam for isolating the code under test from collaborators. Use it sparingly, at boundaries you own, and only where the real collaborator is slow, nondeterministic, external, or not available in the test environment.

## Which to use when

| Technique | Use when |
|-----------|----------|
| Real implementation | Collaborator is fast, deterministic, and in-process. Prefer this. |
| Fake | In-memory replacement (in-memory repo, fake clock). Fast, deterministic, keeps behavior. |
| Stub | Need canned responses to force a branch (error path, empty result). No behavior asserted. |
| Mock | Must verify interaction (call count, args, order). Highest cost; last resort. |

## Rules

1. Mock at the interface you own, never the implementation. Define the seam as a small interface or function type at the consumer.
2. Mock only direct collaborators. Never mock what you do not call yourself.
3. A test that mocks its collaborator must still have a real-behavior test elsewhere (integration or unit with a real or fake collaborator) so the wiring is covered.
4. Do not mock the system under test. Do not mock itself or its own helpers; test them directly.
5. Keep canned values small and readable. A giant fixture hides the behavior under test.

## Signals you are over-mocking

- The test would pass even if the collaborator were deleted.
- The mock setup is longer than the assertion.
- You mock three layers deep to reach the seam.
- Refactors to the collaborator force mock updates in unrelated tests.

## Verification

1. Each mock has a counterpart test that exercises the real or fake path.
2. Remove one mock argument; the test still compiles and fails for a meaningful reason.
