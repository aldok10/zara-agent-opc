# Clean State Checklist

A session is not complete until all five dimensions pass. Run `make clean-check`.

- [ ] Config loads: `opencode debug config` exits 0 in the repo.
- [ ] Deterministic tests pass: `make test`.
- [ ] Feature state reflects reality: no `in_progress` feature left behind,
      passing features carry evidence.
- [ ] No debug artifacts: no `*.orig`, `*.rej`, `*.bak`, `.DS_Store`, or
      `debug-*.log` outside build directories.
- [ ] Startup path works: a fresh session can run `uv run --project scripts zara-cli init` and continue.
