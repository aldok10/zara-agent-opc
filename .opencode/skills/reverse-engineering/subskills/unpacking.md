# Subskill: Unpacking / Deobfuscation (authorized)

Scope: defeat protections to analyze a binary you're authorized to analyze (interop, malware defense,
research). Defensive methodology, not weaponization.

## Generic unpack workflow
1. Detect packer (`anti-re.md`, DIE). 2. Run to OEP (original entry point) — break after the unpack
   stub, dump from memory. 3. Reconstruct imports (IAT). 4. Re-analyze the clean dump.

## Tools
| Need | Tool |
|------|------|
| UPX | `upx -d` (auto); manual if header tampered |
| Dump + fix IAT | Scylla, ImpREC, PE-sieve |
| Hide debugger | ScyllaHide (ring3), TitanHide (ring0) |
| Symbolic exec (CFG flatten, opaque predicates) | angr, Triton, miasm |
| Obfuscated strings | FLOSS |
| API hashing | capa, HashDB |
| VMProtect/Themida | NoVmp, VTIL, themida-unmutate — partial; dynamic tracing often beats full devirt |

## Realistic expectations
Commercial VM protection (VMProtect/Themida) rarely fully devirtualizes. Often the pragmatic path is
**dynamic**: breakpoint at the decryption/dispatch routine, dump the plaintext/real code at runtime,
analyze that. Document what you could and couldn't recover; label confidence.

## Knowledge
`knowledge_read("unpacking-deobfuscation.md")`, `knowledge_read("dynamic-analysis.md")`.

## Routing
Upstream: anti-re. Downstream: native-decompile (on the clean dump), dynamic-analysis.
