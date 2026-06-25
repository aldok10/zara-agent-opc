# Triage: Analysis Pyramid, Safe Handling, Static Triage & capa

TL;DR: The 4-layer analysis pyramid with stopping rules, safe handling procedures, static triage (file ID, hashing, strings, PE anomalies), and capa capability identification.
See also: `triage-yara-mitre-ioc-dll.md`

---

## 1. The Analysis Pyramid (and when to stop)

Malware analysis is a pyramid of increasing cost and rarer skill. Each layer up costs more analyst time and yields diminishing returns, so you stop the moment a layer answers your investigative question. Stages are iterative, not linear: insight from one feeds back into another ("wash, rinse, repeat") [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

| Layer | Stage | What it answers | Typical time | Stop here if... |
|-------|-------|-----------------|--------------|-----------------|
| 1 (base) | Fully-automated analysis | Known-bad? Family? Sandbox verdict | seconds-min | VT/sandbox gives high-confidence family + IOCs |
| 2 | Static properties | Hashes, strings, imports, packing, capabilities | minutes | Triage verdict + enough IOCs for detection |
| 3 | Interactive behavioral | Runtime registry/file/network/process activity | 30 min-hours | Need live C2, persistence, dropped artifacts |
| 4 (apex) | Manual code reversing | Crypto/DGA logic, hidden capability, config format | hours-days | Only for config extractors, attribution, novel threats |

**Stopping rule.** Climb only as high as the question demands. Most IR/SOC triage never leaves layers 1-2. L1 analysts triage, L2 dig deeper, L3 write detections and threat-hunt [5](https://inventivehq.com/blog/malware-analysis-workflow-guide). Manual reversing (layer 4) is reserved for decrypting stored/transmitted data, recovering DGA logic, or capabilities that never fired during behavioral analysis [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

### The 5-minute first-responder questions
A triage pass should answer four questions fast; if you cannot, the answer to #4 is "escalate" [2](https://blog.it-learn.io/posts/2026-06-05-malware-triage-5-minutes-first-responder-checklist/):
1. What is this file (type, real format vs. claimed extension)?
2. Is it known-bad (hash/imphash/fuzzy hash reputation)?
3. What does it likely do (strings, imports, capa)?
4. Do I need to go deeper / escalate?

---

## 2. Safe Handling (do this BEFORE touching the sample)

Never run unknown binaries on a host you care about. Treat every sample as live ordnance.

- **Isolated VM only.** Dedicated analysis VM, host-only or fully isolated network. Common kits: REMnux (Linux) and FLARE-VM (Windows) [10](https://rootguard.gitbook.io/cyberops/defensive-security/malware-analysis-workflow-and-cheatsheet).
- **No real internet.** Simulate services with INetSim or FakeNet-NG so the sample resolves DNS and "connects" to a fake C2, revealing behavior without reaching the real attacker infrastructure [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
- **Snapshots.** Clean snapshot before detonation, revert after every run. One sample per snapshot to avoid cross-contamination.
- **Disable shared folders / clipboard / drag-drop** during detonation. Many samples are VM-aware and check for guest additions.
- **Defang at rest.** Store samples zipped + password-protected (`infected`), rename `.exe`/`.dll` to `.exe_`/`.dll_` so nobody double-clicks by accident.
- **Handle DLLs deliberately.** A DLL does not self-execute; it runs via a host process (`rundll32`, `regsvr32`, an LOLBIN, or sideloading). Detonating means choosing the right loader and export, which is itself an analysis decision (see section 9).
- **Defang IOCs in reports.** Write `1.2.3[.]4`, `hxxp://evil[.]com` so links are not clickable.

---

## 3. Static Triage: First Steps

Static analysis examines the file without running it. Fast, safe, and often enough for a triage verdict [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

### 3.1 File type identification (never trust the extension)
| Tool | Purpose |
|------|---------|
| `file` | libmagic signature -> real type |
| TrID | Statistical file-type ID from byte signatures |
| Detect It Easy (DIE) | Packer/compiler/linker detection, entropy view |
| `exiftool` | Container/metadata, embedded resources |

A `.jpg` that `file` calls a PE32 DLL is your first red flag. Attackers also bundle benign + malicious files inside ISO/ZIP to evade detection [8](https://unit42.paloaltonetworks.com/slow-tempest-malware-obfuscation/).

### 3.2 Hashing (identity + similarity)
| Hash | Type | Use |
|------|------|-----|
| MD5 / SHA-1 | Cryptographic, exact | Sample identity, VT lookup. MD5/SHA-1 collide; keep SHA-256 as canonical |
| SHA-256 | Cryptographic, exact | Canonical identity for reports/IOCs |
| **imphash** | Import-table hash | Groups samples built from the same import table / builder; survives recompilation when imports are stable [10](https://www.cybertriage.com/blog/intro-to-imphash-for-dfir-fuzzy-malware-matching/) |
| **ssdeep** | Fuzzy (CTPH) | Broad similarity / near-duplicate clustering; efficient but coarse [1](https://arxiv.org/html/2512.09539) |
| **TLSH** | Fuzzy (locality-sensitive) | More distinct, semantically meaningful clusters than ssdeep; robust to small edits [1](https://arxiv.org/html/2512.09539) |
| imphash + section hash | Structural | Correlate without uploading file content to a third party [7](https://library.mosse-institute.com/articles/2022/05/fuzzy-hashing-import-hashing-and-section-hashing/fuzzy-hashing-import-hashing-and-section-hashing.html) |

### 3.3 Reputation lookup
- **VirusTotal**: multi-engine verdict, static properties, behavior, relations, community comments. Treat AV names as hints, not ground truth [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
- **OPSEC warning**: uploading a sample is public. For targeted/sensitive incidents, search by hash first; uploading the file tips off the adversary.

### 3.4 Strings
- `strings` extracts printable ASCII/Unicode: URLs, paths, registry keys, error messages, C2 addresses [5](https://web.cecs.pdx.edu/~dmcgrath/courses/malware/static_analysis.html).
- **FLOSS** (Mandiant) goes further: static heuristics + CPU emulation to recover *obfuscated/stack/encoded* strings that only deobfuscate at runtime [6](https://github.com/mandiant/flare-floss).

### 3.5 PE header & structure anomalies
Red flags during PE inspection:
- **High entropy** sections (7.0-8.0) -> packed/encrypted payload.
- **Tiny import table** + `LoadLibrary`/`GetProcAddress` -> dynamic import resolution.
- **Raw size >> virtual size**, or virtual >> raw -> unpacking stub / overlay.
- **Suspicious section names** (`.UPX0`, non-standard) or RWX sections.
- **TLS callbacks** (anti-debug / pre-`main` execution).

---

## 4. Capability Identification with capa

`capa` (Mandiant/FLARE) automatically identifies what a program *can do* by matching a rule set against disassembly/features, and reports capabilities + the **MITRE ATT&CK** and **Malware Behavior Catalog (MBC)** techniques they map to [3](https://mandiant.github.io/capa/).

```
capa suspicious.dll              # capability summary + ATT&CK/MBC table
capa -vv suspicious.dll          # show matched features and addresses
capa --json suspicious.dll       # machine-readable for pipelines
```

capa rule structure (conceptual):
```yaml
rule:
  meta:
    name: create reverse shell
    namespace: c2/shell
    att&ck: [Command and Control::Application Layer Protocol [T1071]]
    mbc:    [Command and Control::C2 Communication]
  features:
    - and:
      - match: create TCP socket
      - match: create process
      - or:
        - api: WSADuplicateSocket
        - api: dup2
```
