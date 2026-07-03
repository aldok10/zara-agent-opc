# Subskill: Recognize Anti-RE / Protection

Scope: detect packers, anti-debug, anti-VM, obfuscation, virtualization. Detection is defensive — you
need to know what you're up against before you can analyze it.

## Signals (cheap, from triage)
- **High entropy** (>7.0) overall → packed/encrypted. Per-section spike in a **non-standard section**
  (`.vmp0`, `.themida`, `UPX0`, `.cod0`) → protection localized to those bytes. (MT5 `.cod0` = obfuscated
  export stubs.)
- **Tiny import table** + `LoadLibrary`/`GetProcAddress` only → dynamic API resolution / API hashing.
- **Weird/invalid linear disassembly** in real code → encrypted/self-modifying or CFG obfuscation.
- `Detect It Easy` (DIE), PEiD, `capa` identify packers/protectors and capabilities.

## Categories
| Class | Examples | Tell |
|-------|----------|------|
| Packers | UPX, ASPack, MPRESS | section names, high entropy, OEP jump |
| Protectors/VM | Themida, VMProtect, Enigma | vm sections, huge entropy, bytecode handlers |
| Anti-debug | IsDebuggerPresent, PEB.BeingDebugged, NtGlobalFlag, rdtsc timing, int3 scan | API + manual checks |
| Anti-VM | CPUID hypervisor bit, MAC/registry artifacts | environment probes |
| Obfuscation | CFG flattening, opaque predicates, junk, string encryption | dispatcher loops, dead branches |

## After detecting
→ `unpacking.md` to defeat it (authorized). Set realistic expectations for VM-based protection.

## Knowledge
`knowledge_read("anti-re-techniques.md")` — detection-focused, per-technique tells.

## Routing
Upstream: triage. Downstream: unpacking, dynamic-analysis.
