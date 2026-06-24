# Binary Triage & Malware Analysis Methodology (Defensive)

> Scope: defensive reverse engineering. Understanding suspicious binaries (esp. DLLs),
> extracting IOCs, mapping behavior to ATT&CK, producing threat intel. This is a
> repeatable triage methodology, not an offensive how-to. The goal is to answer
> "is this malicious, what does it do, what do I block/hunt for" with the least
> effort that produces a confident answer.

---

## 1. The Analysis Pyramid (and when to stop)

Malware analysis is a pyramid of increasing cost and rarer skill. Each layer up
costs more analyst time and yields diminishing returns, so you stop the moment a
layer answers your investigative question. Stages are iterative, not linear:
insight from one feeds back into another ("wash, rinse, repeat") [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

| Layer | Stage | What it answers | Typical time | Stop here if... |
|-------|-------|-----------------|--------------|-----------------|
| 1 (base) | Fully-automated analysis | Known-bad? Family? Sandbox verdict | seconds–min | VT/sandbox gives high-confidence family + IOCs |
| 2 | Static properties | Hashes, strings, imports, packing, capabilities | minutes | Triage verdict + enough IOCs for detection |
| 3 | Interactive behavioral | Runtime registry/file/network/process activity | 30 min–hours | Need live C2, persistence, dropped artifacts |
| 4 (apex) | Manual code reversing | Crypto/DGA logic, hidden capability, config format | hours–days | Only for config extractors, attribution, novel threats |

**Stopping rule.** Climb only as high as the question demands. Most IR/SOC triage
never leaves layers 1–2. L1 analysts triage, L2 dig deeper, L3 write detections
and threat-hunt [5](https://inventivehq.com/blog/malware-analysis-workflow-guide).
Manual reversing (layer 4) is reserved for decrypting stored/transmitted data,
recovering DGA logic, or capabilities that never fired during behavioral analysis
[3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

### The 5-minute first-responder questions
A triage pass should answer four questions fast; if you cannot, the answer to #4
is "escalate" [2](https://blog.it-learn.io/posts/2026-06-05-malware-triage-5-minutes-first-responder-checklist/):
1. What is this file (type, real format vs. claimed extension)?
2. Is it known-bad (hash/imphash/fuzzy hash reputation)?
3. What does it likely do (strings, imports, capa)?
4. Do I need to go deeper / escalate?

---

## 2. Safe Handling (do this BEFORE touching the sample)

Never run unknown binaries on a host you care about. Treat every sample as live
ordnance.

- **Isolated VM only.** Dedicated analysis VM, host-only or fully isolated network.
  Common kits: REMnux (Linux) and FLARE-VM (Windows) [10](https://rootguard.gitbook.io/cyberops/defensive-security/malware-analysis-workflow-and-cheatsheet).
- **No real internet.** Simulate services with INetSim or FakeNet-NG so the sample
  resolves DNS and "connects" to a fake C2, revealing behavior without reaching the
  real attacker infrastructure [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
- **Snapshots.** Clean snapshot before detonation, revert after every run. One
  sample per snapshot to avoid cross-contamination.
- **Disable shared folders / clipboard / drag-drop** during detonation. Many
  samples are VM-aware and check for guest additions.
- **Defang at rest.** Store samples zipped + password-protected (`infected`),
  rename `.exe`/`.dll` to `.exe_`/`.dll_` so nobody double-clicks by accident.
- **Handle DLLs deliberately.** A DLL does not self-execute; it runs via a host
  process (`rundll32`, `regsvr32`, an LOLBIN, or sideloading). Detonating means
  choosing the right loader and export, which is itself an analysis decision (see §9).
- **Defang IOCs in reports.** Write `1.2.3[.]4`, `hxxp://evil[.]com` so links are
  not clickable.

---

## 3. Static Triage: First Steps

Static analysis examines the file without running it. Fast, safe, and often enough
for a triage verdict [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).

### 3.1 File type identification (never trust the extension)
| Tool | Purpose |
|------|---------|
| `file` | libmagic signature → real type |
| TrID | Statistical file-type ID from byte signatures |
| Detect It Easy (DIE) | Packer/compiler/linker detection, entropy view |
| `exiftool` | Container/metadata, embedded resources |

A `.jpg` that `file` calls a PE32 DLL is your first red flag. Attackers also bundle
benign + malicious files inside ISO/ZIP to evade detection [8](https://unit42.paloaltonetworks.com/slow-tempest-malware-obfuscation/).

### 3.2 Hashing (identity + similarity)
| Hash | Type | Use |
|------|------|-----|
| MD5 / SHA-1 | Cryptographic, exact | Sample identity, VT lookup. MD5/SHA-1 collide; keep SHA-256 as canonical |
| SHA-256 | Cryptographic, exact | Canonical identity for reports/IOCs |
| **imphash** | Import-table hash | Groups samples built from the same import table / builder; survives recompilation when imports are stable [10](https://www.cybertriage.com/blog/intro-to-imphash-for-dfir-fuzzy-malware-matching/) |
| **ssdeep** | Fuzzy (CTPH) | Broad similarity / near-duplicate clustering; efficient but coarse [1](https://arxiv.org/html/2512.09539) |
| **TLSH** | Fuzzy (locality-sensitive) | More distinct, semantically meaningful clusters than ssdeep; robust to small edits [1](https://arxiv.org/html/2512.09539) |
| imphash + section hash | Structural | Correlate without uploading file content to a third party [7](https://library.mosse-institute.com/articles/2022/05/fuzzy-hashing-import-hashing-and-section-hashing/fuzzy-hashing-import-hashing-and-section-hashing.html) |

Cryptographic hashes answer "is this the *exact* file?"; fuzzy/import hashes answer
"is this *like* a file I have seen?" — the key to catching renamed, repacked, or
lightly modified variants [8](https://www.ituonline.com/tech-definitions/using-fuzzy-hashing-to-detect-similar-files-in-cybersecurity-3/).
Empirically TLSH and imphash cluster families more cleanly; ssdeep is faster for
coarse classification [1](https://arxiv.org/html/2512.09539).

### 3.3 Reputation lookup
- **VirusTotal**: multi-engine verdict, static properties, behavior, relations,
  community comments. Treat AV names as hints, not ground truth [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
- **OPSEC warning**: uploading a sample is public. For targeted/sensitive incidents,
  search by hash first; uploading the file tips off the adversary. imphash-based
  correlation lets you gauge "interesting?" without uploading content [10](https://www.cybertriage.com/blog/intro-to-imphash-for-dfir-fuzzy-malware-matching/).

### 3.4 Strings
- `strings` extracts printable ASCII/Unicode: URLs, paths, registry keys, error
  messages, C2 addresses [5](https://web.cecs.pdx.edu/~dmcgrath/courses/malware/static_analysis.html).
- **FLOSS** (Mandiant) goes further: static heuristics + CPU emulation to recover
  *obfuscated/stack/encoded* strings that only deobfuscate at runtime — the strings
  malware authors hide from plain `strings` [6](https://github.com/mandiant/flare-floss).
- Look for: URLs/IPs/domains, mutex names, registry paths, file paths, user-agents,
  PDB paths, crypto constants, base64 blobs, command lines.

### 3.5 PE header & structure anomalies
Red flags during PE inspection:
- **High entropy** sections (≈7.0–8.0) → packed/encrypted payload. DIE shows per-section
  entropy [1](https://inventivehq.com/blog/malware-analysis-reverse-engineering-toolkit).
- **Tiny import table** + `LoadLibrary`/`GetProcAddress` → dynamic import resolution
  (hiding intent from static analysis).
- **Raw size ≫ virtual size**, or virtual ≫ raw → unpacking stub / overlay.
- **Suspicious section names** (`.UPX0`, non-standard) or RWX sections.
- **Mismatched / fake timestamps**, missing/invalid Authenticode signature.
- **Export anomalies (DLL)**: a single odd export, `DllRegisterServer`,
  ordinal-only exports, or exports named to match a legit DLL it impersonates (§9).
- **TLS callbacks** (anti-debug / pre-`main` execution).

### 3.6 Signatures (YARA)
Run YARA rulesets (e.g. community + your own) to tag family, packer, or capability.
YARA is the bridge from triage to detection engineering (§5).

---

## 4. Capability Identification with capa

`capa` (Mandiant/FLARE) automatically identifies what a program *can do* by matching
a rule set against disassembly/features, and reports capabilities + the
**MITRE ATT&CK** and **Malware Behavior Catalog (MBC)** techniques they map to
[3](https://mandiant.github.io/capa/). It fills the gap between low-level tools
(strings/PE viewers) and human interpretation — it tells you "this can install a
service," "this can inject into a process," not just "here is an API name"
[1](https://cloud.google.com/blog/topics/threat-intelligence/capa-automatically-identify-malware-capabilities).

- Supports both rapid triage and deep-dive RE; can hunt across a corpus for novel
  malware [7](https://cloud.google.com/blog/topics/threat-intelligence/capa-2-better-stronger-faster).
- Rules are YAML: each rule describes a capability via combinations of **API calls,
  string matches, byte patterns, and logical conditions**, tagged to ATT&CK/MBC
  [2](https://1337skills.com/fr/cheatsheets/capa/).
- Output `-vv` shows *which addresses* triggered each capability — feeds your
  manual RE focus.

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

---

## 5. YARA Rule Writing (triage → detection)

A YARA rule has two core sections — **strings** and **condition** — plus optional
**meta** [1](https://yara.readthedocs.io/en/stable/writingrules.html). Strings can be
text, hex byte patterns, or regex; the condition is the boolean logic that decides a
match [10](https://www.geeksforgeeks.org/threat-hunting-using-yara/).

```yara
rule SUSP_Loader_Generic_DLL {
    meta:
        author      = "analyst"
        description = "Generic loader DLL: dynamic import + RWX alloc"
        date        = "2026-06-21"
        hash        = "<sha256>"
        reference   = "internal-case-1234"
    strings:
        $s1 = "VirtualAllocEx"   ascii
        $s2 = "WriteProcessMemory" ascii
        $s3 = "LoadLibraryA"     ascii
        $mz = { 4D 5A }                       // PE magic
        $shell = { 6A 40 68 00 30 00 00 6A ?? }  // wildcard byte pattern
    condition:
        uint16(0) == 0x5A4D and               // PE file
        filesize < 2MB and
        ( 2 of ($s*) or $shell )
}
```

**Authoring discipline:**
- Anchor on *durable* traits (code byte patterns, unique strings, structural facts
  via the `pe` module) over volatile ones (a single C2 IP that rotates).
- Prefer hex/byte patterns with wildcards (`??`, jumps `[4-6]`) for code that
  survives recompilation; pure-string rules are brittle [4](https://www.scribd.com/document/296118157/YARA-User-s-Manual-1-6-1).
- Tune the condition to minimize false positives: combine `filesize`, magic bytes,
  and `N of ($x*)` thresholds rather than a single string.
- Test against goodware before deploying. A noisy rule is worse than no rule.
- Use the `pe` module for imports/exports/imphash conditions on PE-specific hunts.

---

## 6. Behavioral Indicators & API Patterns

Behavioral analysis = detonate in the lab and watch registry, filesystem, process,
and network activity, ideally *interacting* with the sample (mimicking C2) to draw
out more behavior [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
No single API call is proof — the **sequence and combination** is the signal
[8](https://answers.securityscientist.net/q/24247/what-windows-api-calls-should-you-monitor-to-detect-process-hollowing).

### 6.1 Process injection / hollowing (ATT&CK T1055)
| Technique | API sequence (signal pattern) | ATT&CK |
|-----------|-------------------------------|--------|
| Classic remote injection | `OpenProcess` → `VirtualAllocEx` → `WriteProcessMemory` → `CreateRemoteThread` [2](https://www.elastic.co/blog/hunting-memory) | T1055.001 |
| Process hollowing | `CreateProcess(CREATE_SUSPENDED)` → `ZwUnmapViewOfSection` → `VirtualAllocEx` → `WriteProcessMemory` → `SetThreadContext` → `ResumeThread` [8](https://answers.securityscientist.net/q/24247/what-windows-api-calls-should-you-monitor-to-detect-process-hollowing) | T1055.012 |
| Module stomping / DLL hollowing | Load legit DLL into remote process, overwrite `AddressOfEntryPoint`, start thread [6](https://attack.mitre.org/techniques/T1055/001/) | T1055.001 |
| Reflective DLL loading | Manual PE map in-memory (no `LoadLibrary`): parse headers, alloc RWX, relocate, resolve imports, call entry. Look for absence of a disk-backed module + RWX private memory | T1620 |
| Userland-hook bypass | Direct syscalls / `Nt*` calls instead of `kernel32` wrappers to evade EDR hooks [3](https://securitytimes.medium.com/path-to-process-injection-bypass-userland-api-hooking-a8a49ae5def6) | T1055 |

Most code-execution-in-another-process falls into two classes: process injection
and process hollowing — both run attacker code without creating it from an exe or
making the target load a DLL [4](https://www.microsoft.com/security/blog/2022/06/30/using-process-creation-properties-to-catch-evasion-techniques/).

### 6.2 Persistence
| Mechanism | Artifact | ATT&CK |
|-----------|----------|--------|
| Run keys / Startup | `HKLM\...\Run`, `HKCU\...\Run`, Startup folder [4](https://www.nextron-systems.com/2025/07/29/detecting-the-most-popular-mitre-persistence-method-registry-run-keys-startup-folder/) | T1547.001 |
| Scheduled task | `schtasks`, Task Scheduler XML | T1053.005 |
| Service | `CreateService`, `HKLM\SYSTEM\...\Services` | T1543.003 |
| AppInit DLLs | `AppInit_DLLs` value → DLL loaded into many processes [7](http://attack.mitre.org/techniques/T1103) | T1546.010 |
| COM hijack | Hijacked `CLSID\...\InprocServer32` (see §9) | T1546.015 |
| DLL sideloading | Malicious DLL beside a signed EXE (see §9) | T1574.001 |

### 6.3 C2 / network
- DNS resolution, HTTP(S) beacons, hardcoded IPs/domains, user-agents, JA3/TLS
  fingerprints, beacon interval/jitter.
- Abuse of legit infra (Cloudflare Workers, cloud VMs) as C2 to blend in
  [9](https://www.picussecurity.com/resource/blog/sloppylemming-attack-techniques-burrowshell-backdoor-explained).
- Use INetSim/FakeNet to capture intended traffic even when real C2 is dead.

### 6.4 Defense evasion / anti-analysis
- VM/sandbox detection, anti-debug (`IsDebuggerPresent`, TLS callbacks, timing),
  string/payload obfuscation, multi-DLL splitting to fragment functionality
  [2](https://attack.mitre.org/techniques/T1574/001/).

---

## 7. MITRE ATT&CK Mapping

Map every observed behavior to a Tactic → Technique → Sub-technique. This turns raw
observations into a shared language for detection, hunting, and reporting.

| Observation | Tactic | Technique |
|-------------|--------|-----------|
| Writes `HKCU\...\Run` value | Persistence | T1547.001 |
| `CreateProcess(SUSPENDED)` + unmap + `SetThreadContext` | Defense Evasion / Privilege Esc | T1055.012 |
| Malicious DLL beside signed EXE | Persistence / Priv Esc / Defense Evasion | T1574.001 |
| HTTPS beacon to external host | Command & Control | T1071.001 |
| Obfuscated strings (FLOSS-recovered) | Defense Evasion | T1027 |

Workflow tip: capa already emits ATT&CK/MBC IDs per capability — use them as the
seed, then confirm/expand with behavioral evidence [2](https://1337skills.com/fr/cheatsheets/capa/).

---

## 8. IOC Extraction & Report Writing

### 8.1 IOC categories to harvest
| Category | Examples | Source |
|----------|----------|--------|
| File hashes | SHA-256, imphash, ssdeep/TLSH | Static |
| Network | IPs, domains, URLs, user-agents, JA3 | Strings, behavioral |
| Host | Mutex names, registry keys/values, file paths, named pipes, service names | Strings, behavioral |
| Code | YARA strings/byte patterns, PDB paths | Static |

Mutexes are high-value: malware often creates a named mutex to avoid re-infection,
giving a precise host IOC [3](https://zeltser.com/mastering-4-stages-of-malware-analysis).
Beware false positives — automated extraction inflates FP rates when benign
artifacts get tagged; validate each IOC's *maliciousness*, not just its presence
[8](https://arxiv.org/html/2506.11325v2).

### 8.2 IOC quality & pyramid-of-pain
Prioritize durable indicators. Hashes are trivial for attackers to change; TTPs and
behavioral signatures (YARA on code, capa capabilities) cost them the most to evade.
Ship hashes/domains for immediate blocking *and* behavioral rules for lasting
detection.

### 8.3 Report structure
A triage/analysis report should contain:
1. **Summary** — verdict, family, confidence, one-paragraph "what it does."
2. **Sample identity** — filenames, SHA-256, imphash, ssdeep/TLSH, file type, size.
3. **Static findings** — packing/entropy, notable strings, imports/exports, signatures.
4. **Behavioral findings** — persistence, injection, C2, files dropped, registry.
5. **Capabilities** — capa output summary.
6. **ATT&CK mapping** — tactic/technique table.
7. **IOCs** — defanged, grouped by type, each with confidence + context.
8. **Detection** — YARA/Sigma rules produced.
9. **Recommendations** — block/hunt/remediate actions.

Use a consistent template so reports are comparable and machine-parseable
[3](https://zeltser.com/malware-analysis-report). Convert findings into detection
rules — the L3 deliverable [5](https://inventivehq.com/blog/malware-analysis-workflow-guide).

---

## 9. DLL-Specific Analysis

A DLL is not standalone — something must *load* it. How it gets loaded is half the
analysis.

### 9.1 How malicious DLLs get loaded
| Mechanism | How it works | ATT&CK |
|-----------|--------------|--------|
| **DLL search-order hijacking** | App loads a DLL by name from a writable dir earlier in the search order; attacker plants a malicious one there [4](https://origin-unit42.paloaltonetworks.com/dll-hijacking-techniques/) | T1574.001 |
| **DLL sideloading** | Malicious DLL placed next to a *legitimate, signed* EXE; the trusted EXE loads it, inheriting trust and bypassing signature checks [5](https://techzone.bitdefender.com/en/tech-explainers/what-is-dll-sideloading.html). APT-favored, used since ~2013 [9](https://www.sophos.com/de-de/blog/family-tree-dll-sideloading-cases-may-be-related) | T1574.001 |
| **Phantom DLL** | App tries to load a DLL that does not exist; attacker supplies it [10](https://keepnetlabs.com/blog/dll-hijacking) | T1574.001 |
| **AppInit_DLLs** | Registry value forces DLL into every process loading `user32.dll` → persistence + privilege [7](http://attack.mitre.org/techniques/T1103) | T1546.010 |
| **COM hijacking** | Replace/insert a CLSID's `InprocServer32` pointing to malicious DLL; loaded when the COM object is instantiated | T1546.015 |
| **Explicit loaders** | `rundll32 evil.dll,Export`, `regsvr32 evil.dll` (calls `DllRegisterServer`) | T1218.011 |

Adversaries chain sideloading and split loader logic across multiple DLLs (one main
DLL loading separated export functions) specifically to fragment functionality and
hinder analysis [2](https://attack.mitre.org/techniques/T1574/001/). Side-loading is
used for persistence, privilege escalation, and defense evasion
[1](https://www.cybereason.com/blog/threat-analysis-report-dll-side-loading-widely-abused).

### 9.2 Analyzing export-based payloads
- **Enumerate exports** (`dumpbin /exports`, `pe-tree`, PE viewers). The payload
  usually lives behind a specific export, not `DllMain`.
- **Identify the trigger.** `DllMain` (runs on load), `DllRegisterServer`
  (`regsvr32`), or a named/ordinal export invoked via `rundll32`.
- **Spot impersonation.** Does the DLL export the same function names as the
  legitimate DLL it replaces (a proxy/forwarder)? Sideloaded DLLs often forward
  real calls to the genuine DLL to stay functional while running their payload.
- **Detonate the right export.** `rundll32 sample.dll,ExportName` or `regsvr32`,
  inside the isolated VM, after identifying the intended entry.
- **Check forwarded exports** in the header — a clue to proxying behavior.
- **Find the legit host binary.** For sideloading, identify which signed EXE this
  DLL is meant to ride; that names the abused application and the detection context.

---

## 10. Repeatable Triage Checklist

Copy-paste per sample. Stop as soon as you have a confident verdict + enough IOCs.

```
[ ] 0. SAFE HANDLING
      [ ] Sample in isolated VM (REMnux/FLARE-VM), snapshot taken
      [ ] Network simulated (INetSim/FakeNet), no real internet
      [ ] Stored zipped+password, extension defanged

[ ] 1. IDENTIFY
      [ ] file / TrID / DIE  → real type (not extension)
      [ ] SHA-256, MD5, imphash, ssdeep, TLSH recorded
      [ ] If DLL: enumerate exports, note trigger (DllMain/Register/ordinal)

[ ] 2. REPUTATION
      [ ] VT/intel by HASH first (mind upload OPSEC)
      [ ] imphash + fuzzy-hash correlation to known families

[ ] 3. STATIC PROPERTIES
      [ ] strings + FLOSS  → URLs, IPs, mutexes, regkeys, paths, UAs
      [ ] PE header: entropy/packing, imports (dynamic-resolution?),
          exports, sections (RWX?), signature, timestamp, TLS callbacks
      [ ] YARA scan (community + internal)

[ ] 4. CAPABILITY
      [ ] capa  → capabilities + ATT&CK/MBC table
      [ ] Flag injection / persistence / C2 / evasion capabilities

[ ] 5. DECIDE: enough for verdict? -> STOP & report.
      If not, escalate to behavioral.

[ ] 6. BEHAVIORAL (layer 3)
      [ ] Detonate (right loader/export for DLLs)
      [ ] Capture: registry, filesystem, process tree, network
      [ ] Identify injection sequence, persistence, C2 (use fake C2 to draw out)

[ ] 7. DEEP RE (layer 4 — only if needed)
      [ ] Disassembler/debugger: decrypt config, DGA, hidden capability
      [ ] Write config extractor if family warrants

[ ] 8. PRODUCE
      [ ] IOC list (defanged, typed, confidence-rated)
      [ ] ATT&CK mapping table
      [ ] YARA / Sigma detection rules
      [ ] Report (template §8.3) + block/hunt recommendations
```

---

## Sources
- Zeltser, *Mastering 4 Stages of Malware Analysis* [3](https://zeltser.com/mastering-4-stages-of-malware-analysis); *Methodology for Reverse-Engineering Malware* [9](https://zeltser.com/reverse-engineering-malware-methodology/); *Report Template* [3](https://zeltser.com/malware-analysis-report)
- *Malware Triage in 5 Minutes* [2](https://blog.it-learn.io/posts/2026-06-05-malware-triage-5-minutes-first-responder-checklist/)
- InventiveHQ workflow + toolkit [5](https://inventivehq.com/blog/malware-analysis-workflow-guide) [1](https://inventivehq.com/blog/malware-analysis-reverse-engineering-toolkit)
- Hashing: imphash for DFIR [10](https://www.cybertriage.com/blog/intro-to-imphash-for-dfir-fuzzy-malware-matching/); TLSH/ssdeep/imphash clustering [1](https://arxiv.org/html/2512.09539); fuzzy/import/section hashing [7](https://library.mosse-institute.com/articles/2022/05/fuzzy-hashing-import-hashing-and-section-hashing/fuzzy-hashing-import-hashing-and-section-hashing.html); fuzzy hashing in triage [8](https://www.ituonline.com/tech-definitions/using-fuzzy-hashing-to-detect-similar-files-in-cybersecurity-3/)
- capa [3](https://mandiant.github.io/capa/) [1](https://cloud.google.com/blog/topics/threat-intelligence/capa-automatically-identify-malware-capabilities) [7](https://cloud.google.com/blog/topics/threat-intelligence/capa-2-better-stronger-faster) [2](https://1337skills.com/fr/cheatsheets/capa/); FLOSS [6](https://github.com/mandiant/flare-floss)
- YARA docs [1](https://yara.readthedocs.io/en/stable/writingrules.html); threat hunting with YARA [10](https://www.geeksforgeeks.org/threat-hunting-using-yara/); YARA manual [4](https://www.scribd.com/document/296118157/YARA-User-s-Manual-1-6-1)
- Injection/hollowing: ATT&CK T1055.012 [1](https://attack.mitre.org/techniques/T1055/012/), T1055.001 [6](https://attack.mitre.org/techniques/T1055/001/); Elastic hunting in memory [2](https://www.elastic.co/blog/hunting-memory); Microsoft process-creation evasion [4](https://www.microsoft.com/security/blog/2022/06/30/using-process-creation-properties-to-catch-evasion-techniques/); API sequence [8](https://answers.securityscientist.net/q/24247/what-windows-api-calls-should-you-monitor-to-detect-process-hollowing); syscall/hook bypass [3](https://securitytimes.medium.com/path-to-process-injection-bypass-userland-api-hooking-a8a49ae5def6)
- DLL loading: ATT&CK T1574.001 [2](https://attack.mitre.org/techniques/T1574/001/); Unit42 [4](https://origin-unit42.paloaltonetworks.com/dll-hijacking-techniques/); Bitdefender [5](https://techzone.bitdefender.com/en/tech-explainers/what-is-dll-sideloading.html); Cybereason [1](https://www.cybereason.com/blog/threat-analysis-report-dll-side-loading-widely-abused); Sophos [9](https://www.sophos.com/de-de/blog/family-tree-dll-sideloading-cases-may-be-related); Keepnet [10](https://keepnetlabs.com/blog/dll-hijacking); AppInit T1546.010 [7](http://attack.mitre.org/techniques/T1103)
- Persistence run keys [4](https://www.nextron-systems.com/2025/07/29/detecting-the-most-popular-mitre-persistence-method-registry-run-keys-startup-folder/); IOC extraction ground truth [8](https://arxiv.org/html/2506.11325v2); C2 infra abuse [9](https://www.picussecurity.com/resource/blog/sloppylemming-attack-techniques-burrowshell-backdoor-explained)
- Workflow cheatsheet (REMnux/FLARE-VM) [10](https://rootguard.gitbook.io/cyberops/defensive-security/malware-analysis-workflow-and-cheatsheet); static strings [5](https://web.cecs.pdx.edu/~dmcgrath/courses/malware/static_analysis.html); obfuscation/ISO bundling [8](https://unit42.paloaltonetworks.com/slow-tempest-malware-obfuscation/)
