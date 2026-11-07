# ADR 0002 — Pin the MCP server by git submodule

- Status: accepted
- Date: 2026-11-07
- Supersedes: none
- Related: `DECISIONS.md` index, entry 0002, `docs/memory-contract.md`

## Context

The memory server is `zmem-mcp`, a Rust binary built from
`https://github.com/aldok10/zarust-memory`. It is the `Orchestrator` MCP host in
`opencode.json`:

```
./mcp/zarust-memory/target/release/zmem-mcp.exe
```

The dependency has three properties that rule out the usual pins:

| Property | Consequence |
|---|---|
| Source-built Rust, not a registry package | No `Cargo.lock` entry in the superproject can pin it; there is no published crate |
| No published binary release | No release URL and no checksum to pin |
| The binary is gitignored build output | The tree must be reproducible from source, so the source commit is the artifact |

The repo already carries `Cargo.lock` inside the submodule, which pins the
transitive crates. What remains unpinned is the submodule's own commit.

A floating `master` checkout would mean two machines run different memory
servers against the same database. Schema drift would then be a silent
possibility, not a version mismatch anyone can see.

## Decision

Pin the source with a git submodule. The gitlink is the lock.

| Field | Value |
|---|---|
| Path | `mcp/zarust-memory` |
| URL | `https://github.com/aldok10/zarust-memory.git` |
| Pin | commit `e640886c7ba749aaee92eb526066f0f8526eb818` (gitlink in the superproject tree) |
| Transitive pin | `mcp/zarust-memory/Cargo.lock` |
| Enforced by | ARCH-010 — `git submodule status -- mcp/zarust-memory` must not start with `-` |

The pin moves only by an explicit commit that updates the gitlink. A submodule
bump is a reviewable diff: one line, one hash.

The build output is not committed. It is rebuilt from the pinned tree with:

```bash
cd mcp/zarust-memory
cargo +stable-x86_64-pc-windows-gnu build --release -p zmem-mcp
```

## Consequences

Positive:

- Reproducible source on every clone. Same commit, same tree, same binary.
- The pin is visible in `git diff` and in `git submodule status`. No hidden
  state, no local cache to trust.
- No registry, no vendor account, no token needed to fetch the source.
- Updating the server is one reviewable line.

Negative:

- A fresh clone is incomplete until `git submodule update --init --recursive`
  runs. Without it, `mcp/zarust-memory` is empty and the MCP tool list is empty.
- `uv run --project scripts zara-cli init` and `make setup` must check the submodule before anything else, or
  the first failure looks like a missing binary rather than a missing checkout.
- A Rust toolchain is required to produce the binary. There is no prebuilt
  fallback.
- The build is local and unverified by the superproject. Two machines can build
  the same commit with different toolchains; only the commit is pinned, not the
  compiler.
- Deleting and re-adding the path requires care: a plain directory in place of
  the gitlink silently removes the pin.

Recovery for the common failure:

```bash
git submodule status -- mcp/zarust-memory    # leading '-' means uninitialized
git submodule update --init --recursive
```

## Reversal condition

Reverse when `zmem-mcp` ships a published binary release for Windows with a
stable hash:

1. Pin the release URL and its SHA-256 in the repo.
2. Replace the submodule with a download step in `uv run --project scripts zara-cli setup`.
3. Keep ARCH-010, retargeted at the hash check, so an unpinned binary still fails
   the build.

Do not reverse to a floating download. The hash is the lock; without it the
decision is not reversed, it is abandoned.
