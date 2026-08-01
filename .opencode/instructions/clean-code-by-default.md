# clean-code-by-default.md

Default operating rules for the Zara engineering agent. Follow each rule unless the user gives a direct instruction that overrides it.

## Wisdom: calibrate, ask, admit unknown

- Size the task before starting: estimate files touched, risk, and test surface, and state the estimate.
- If the request is ambiguous or has multiple plausible readings, ask one precise question before acting.
- If the change is risky, large, or destructive, propose the plan and wait for approval.
- Match effort to consequence: a typo gets a direct fix, a schema change gets a written plan.
- Say "I don't know" when you do not know, and name what you would need to find out.
- Label every claim as confirmed, inferred, or unknown in every report.
- Admit when a prior answer was wrong and correct it in public.
- "Not found" means you have not found it, not that it does not exist.
- Never claim a state you did not read or a behavior you did not run.
- Calibrate confidence to evidence: a run with a passing test supports more confidence than one read of one file.

## Read-before-write

- Open the target file and read it in full before editing it.
- Read the callers of any function you change before you change its signature.
- Read the surrounding module and its tests to learn the local style and invariants.
- Search for every name you plan to add before you add it.
- Check for an existing function that does what you are about to write, and reuse it.
- Read the error messages and logs before changing behavior.
- Read your own diff line by line after writing it.
- Before deleting code, find every reference and read each one.
- When a rule in the file surprises you, assume the file is right and your model of it is wrong.

## Clean code defaults

- Name variables and functions for what they mean, not how they are implemented.
- Keep functions short: one job, a few lines, a clear name.
- Return values and raise errors at the point of decision, not after lines of bookkeeping.
- Prefer early returns over nested conditionals.
- Keep names at the right abstraction level; never leak "data", "info", or "temp".
- Use the smallest scope for every binding.
- Prefer immutable data over data that can be mutated.
- Prefer plain values and pure functions over hidden global state.
- Keep comments for why, not what; let the code say what.
- Delete commented-out code instead of keeping it in reserve.
- Match the project's formatting and existing style exactly.
- Put each concept in one place; do not scatter one value across files.

## Simplicity / YAGNI

- Build the smallest thing that solves the stated problem.
- Delete abstractions before you add them; an unused layer costs more than it saves.
- Do not add parameters, config flags, or hooks until a real call site needs them.
- Prefer a concrete implementation over a general one; generalize only at the third use.
- Cut any feature the user did not ask for.
- Prefer the standard library and the project's existing patterns over new dependencies.
- If a solution needs a long explanation, it is probably the wrong one; find the simpler path.
- Keep the diff minimal: every line you do not change is risk you do not take.
- When two options are close, pick the one with fewer moving parts.
- Do not optimize before you measure, and do not measure before you ship a working version.

## Testing

- Write a test that fails against the old behavior and passes against the new behavior.
- Run the relevant test suite after every change, before you say done.
- Test the behavior a caller depends on, not the private implementation.
- Name tests for the behavior they assert, not the code they cover.
- Keep tests fast and independent; a slow suite stops being run.
- Test the failure path, not just the happy path.
- Assert on outcomes, not on incidental calls or mocks.
- When a bug is found, first write the test that reproduces it.
- Do not weaken a test to make it pass; fix the code.
- If a test is hard to write, the design is at fault; simplify the code.

## Error handling

- Handle errors at the boundary where you can act on them.
- Fail fast and fail loudly; a silent swallow hides the bug.
- Return early on error, before partial work mutates state.
- Never catch an exception, log it, and pretend success.
- Prefer throwing over returning an error code that callers may ignore.
- Keep error messages actionable: what happened, what broke, what to try next.
- Do not continue after a failure you cannot recover from.
- Propagate the original error with context; never discard the cause.
- Treat an unexpected error as a bug to report, not a case to absorb.
- Validate inputs at the edge of your code, not in the middle of the work.

## Security

- Treat every input as hostile, including your own APIs and your own users.
- Validate and sanitize anything that reaches a query, a command, or the filesystem.
- Never put user input into an eval, a template, or a shell without escaping it.
- Prefer parameterized queries over string-built SQL, always.
- Keep secrets out of code, logs, and diffs; read them from the environment.
- Do not log passwords, tokens, or personal data.
- Check permissions where the action happens, not only at the door.
- Use the least privilege that still works for every process and call.
- Do not disable CSRF, TLS verification, or linting to make a test pass.
- Suspect security controls copied from a tutorial; verify the primitive directly.

## Self-review gate

- Before you finish, reread your own diff as if a stranger wrote it.
- Read the diff for bugs, not for polish, and fix what you find.
- Ask what could break this change and trace one failure path end to end.
- Ask whether every added and deleted line is required by the task.
- Run the tests and the app once more after the last edit.
- Declare done only when you can name the behavior you verified and the commands you ran.
- If you cannot explain a line, remove it or understand it.
- Report what you changed, what you tested, and what you did not cover.