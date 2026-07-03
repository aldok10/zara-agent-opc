# Triage: YARA Rules, MITRE ATT&CK Mapping, IOC Extraction & DLL-Specific Analysis

TL;DR: Writing YARA detection rules, behavioral indicator patterns (injection/persistence/C2), ATT&CK mapping, IOC extraction, DLL loading mechanisms, and the repeatable triage checklist.
See also: `triage-pyramid-static-capa.md`

---

## 5. YARA Rule Writing (triage -> detection)

A YARA rule has two core sections -- **strings** and **condition** -- plus optional **meta** [1](https://yara.readthedocs.io/en/stable/writingrules.html).

```yara
rule SUSP_Loader_Generic_DLL {
    meta:
        author      = "analyst"
        description = "Generic loader DLL: dynamic import + RWX alloc"
        date        = "2026-06-21"
    strings:
        $s1 = "VirtualAllocEx"   ascii
        $s2 = "WriteProcessMemory" ascii
        $s3 = "LoadLibraryA"     ascii
        $mz = { 4D 5A }
        $shell = { 6A 40 68 00 30 00 00 6A ?? }
    condition:
        uint16(0) == 0x5A4D and
        filesize < 2MB and
        ( 2 of ($s*) or $shell )
}
```

**Authoring discipline:**
- Anchor on *durable* traits (code byte patterns, unique strings, structural facts via the `pe` module) over volatile ones (a single C2 IP that rotates).
- Prefer hex/byte patterns with wildcards for code that survives recompilation.
- Test against goodware before deploying.

---

## 6. Behavioral Indicators & API Patterns

### 6.1 Process injection / hollowing (ATT&CK T1055)
| Technique | API sequence | ATT&CK |
|-----------|--------------|--------|
| Classic remote injection | `OpenProcess` -> `VirtualAllocEx` -> `WriteProcessMemory` -> `CreateRemoteThread` | T1055.001 |
| Process hollowing | `CreateProcess(CREATE_SUSPENDED)` -> `ZwUnmapViewOfSection` -> `VirtualAllocEx` -> `WriteProcessMemory` -> `SetThreadContext` -> `ResumeThread` | T1055.012 |
| Reflective DLL loading | Manual PE map in-memory (no `LoadLibrary`): parse headers, alloc RWX, relocate, resolve imports, call entry | T1620 |

### 6.2 Persistence
| Mechanism | Artifact | ATT&CK |
|-----------|----------|--------|
| Run keys / Startup | `HKLM\...\Run`, `HKCU\...\Run`, Startup folder | T1547.001 |
| Scheduled task | `schtasks`, Task Scheduler XML | T1053.005 |
| Service | `CreateService`, `HKLM\SYSTEM\...\Services` | T1543.003 |
| DLL sideloading | Malicious DLL beside a signed EXE | T1574.001 |

### 6.3 C2 / network
- DNS resolution, HTTP(S) beacons, hardcoded IPs/domains, user-agents, JA3/TLS fingerprints, beacon interval/jitter.
- Use INetSim/FakeNet to capture intended traffic even when real C2 is dead.

---

## 7. MITRE ATT&CK Mapping

Map every observed behavior to a Tactic -> Technique -> Sub-technique.

| Observation | Tactic | Technique |
|-------------|--------|-----------|
| Writes `HKCU\...\Run` value | Persistence | T1547.001 |
| `CreateProcess(SUSPENDED)` + unmap + `SetThreadContext` | Defense Evasion / Privilege Esc | T1055.012 |
| Malicious DLL beside signed EXE | Persistence / Priv Esc / Defense Evasion | T1574.001 |
| HTTPS beacon to external host | Command & Control | T1071.001 |
| Obfuscated strings (FLOSS-recovered) | Defense Evasion | T1027 |

---

## 8. IOC Extraction & Report Writing

### 8.1 IOC categories to harvest
| Category | Examples | Source |
|----------|----------|--------|
| File hashes | SHA-256, imphash, ssdeep/TLSH | Static |
| Network | IPs, domains, URLs, user-agents, JA3 | Strings, behavioral |
| Host | Mutex names, registry keys/values, file paths, named pipes, service names | Strings, behavioral |
| Code | YARA strings/byte patterns, PDB paths | Static |

### 8.3 Report structure
1. **Summary** -- verdict, family, confidence, one-paragraph "what it does."
2. **Sample identity** -- filenames, SHA-256, imphash, ssdeep/TLSH, file type, size.
3. **Static findings** -- packing/entropy, notable strings, imports/exports, signatures.
4. **Behavioral findings** -- persistence, injection, C2, files dropped, registry.
5. **Capabilities** -- capa output summary.
6. **ATT&CK mapping** -- tactic/technique table.
7. **IOCs** -- defanged, grouped by type, each with confidence + context.
8. **Detection** -- YARA/Sigma rules produced.
9. **Recommendations** -- block/hunt/remediate actions.

---

## 9. DLL-Specific Analysis

### 9.1 How malicious DLLs get loaded
| Mechanism | How it works | ATT&CK |
|-----------|--------------|--------|
| **DLL search-order hijacking** | App loads a DLL by name from a writable dir earlier in the search order | T1574.001 |
| **DLL sideloading** | Malicious DLL placed next to a *legitimate, signed* EXE; the trusted EXE loads it | T1574.001 |
| **Phantom DLL** | App tries to load a DLL that does not exist; attacker supplies it | T1574.001 |
| **AppInit_DLLs** | Registry value forces DLL into every process loading `user32.dll` | T1546.010 |
| **COM hijacking** | Replace/insert a CLSID's `InprocServer32` pointing to malicious DLL | T1546.015 |
| **Explicit loaders** | `rundll32 evil.dll,Export`, `regsvr32 evil.dll` | T1218.011 |

### 9.2 Analyzing export-based payloads
- **Enumerate exports** (`dumpbin /exports`, `pe-tree`, PE viewers).
- **Identify the trigger.** `DllMain` (runs on load), `DllRegisterServer` (`regsvr32`), or a named/ordinal export invoked via `rundll32`.
- **Spot impersonation.** Does the DLL export the same function names as the legitimate DLL it replaces?
- **Detonate the right export** inside the isolated VM.

---

## 10. Repeatable Triage Checklist

```
[ ] 0. SAFE HANDLING
      [ ] Sample in isolated VM, snapshot taken
      [ ] Network simulated, no real internet
      [ ] Stored zipped+password, extension defanged

[ ] 1. IDENTIFY
      [ ] file / TrID / DIE -> real type
      [ ] SHA-256, MD5, imphash, ssdeep, TLSH recorded
      [ ] If DLL: enumerate exports, note trigger

[ ] 2. REPUTATION
      [ ] VT/intel by HASH first (mind upload OPSEC)
      [ ] imphash + fuzzy-hash correlation

[ ] 3. STATIC PROPERTIES
      [ ] strings + FLOSS -> URLs, IPs, mutexes, regkeys
      [ ] PE header: entropy/packing, imports, exports, sections
      [ ] YARA scan (community + internal)

[ ] 4. CAPABILITY
      [ ] capa -> capabilities + ATT&CK/MBC table

[ ] 5. DECIDE: enough for verdict? -> STOP & report.

[ ] 6. BEHAVIORAL (layer 3)
      [ ] Detonate (right loader/export for DLLs)
      [ ] Capture: registry, filesystem, process tree, network

[ ] 7. DEEP RE (layer 4 -- only if needed)

[ ] 8. PRODUCE
      [ ] IOC list (defanged, typed, confidence-rated)
      [ ] ATT&CK mapping table
      [ ] YARA / Sigma detection rules
      [ ] Report + block/hunt recommendations
```

---

## Sources
- Zeltser, *Mastering 4 Stages of Malware Analysis* [3](https://zeltser.com/mastering-4-stages-of-malware-analysis)
- capa [3](https://mandiant.github.io/capa/); FLOSS [6](https://github.com/mandiant/flare-floss)
- YARA docs [1](https://yara.readthedocs.io/en/stable/writingrules.html)
- DLL loading: ATT&CK T1574.001 [2](https://attack.mitre.org/techniques/T1574/001/)
- Full source list in sibling file `triage-pyramid-static-capa.md`
