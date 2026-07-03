---
name: zara-ctx
description: Run code in sandboxed subprocesses, fetch URLs as markdown
---

# Zara Context Sandbox

Program the analysis, don't read it. One `ctx_execute` replaces ten `Read` calls; data stays in sandboxes, not your context window.

## Scope

- HANDLES: sandboxed code execution, file processing without loading content, batch commands, URL-to-markdown fetch.
- DEFERS: file editing to Read/Edit; tests/builds to Shell; interactive/long-running commands (they hang).

## First Action

Decide: does this need raw content in context, or just a computed result? If just a result, program it in a sandbox.

## Constraints

1. Use for analyzing/counting/filtering/transforming data without loading raw content.
2. Only stdout enters context.
3. Commands must be non-interactive and finish under 30s.
4. Fetch web content as markdown, never raw HTML.

## DO NOT

- Edit files with these tools (use Read/Edit).
- Run tests or builds here (use Shell).
- Run interactive commands (they hang).
- Run long-running commands (>30s timeout).

## Tools

- `ctx_execute(language, code)` - run code in sandbox, only stdout returns.
- `ctx_execute_file(path, language, code)` - process a file; path injected as `__FILE__` / `__DIR__`.
- `ctx_batch_execute(commands)` - multiple commands in one call, each `{label, command, language?}`.
- `ctx_fetch(url)` - fetch URL as markdown. Cache 24h; `ttl: 0` forces refresh.

## Verification

- Only computed results (not raw dumps) enter context.
- Sandbox command exited cleanly with expected stdout.
