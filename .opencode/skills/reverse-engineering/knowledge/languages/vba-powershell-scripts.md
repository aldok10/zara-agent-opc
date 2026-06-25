# VBA Macro & PowerShell Script Reverse Engineering

TL;DR: VBA macros live in OLE2 streams (compressed source + compiled p-code). Use olevba for extraction, pcodedmp for stomped docs. PowerShell obfuscation: tick marks, base64, compression layers. Key tools: oletools, ViperMonkey, Invoke-Obfuscation patterns.

---

## VBA Macro Extraction

OLE2 streams: `VBA/dir` (module index), `VBA/Module1` (compressed source + p-code), `__SRP_*` (performance cache).

OOXML (.docm/.xlsm): ZIP containing `vbaProject.bin` which is itself OLE2.

```bash
olevba -a malicious.doc           # Extract + analyze
olevba -a --decode malicious.doc  # Auto-deobfuscate
pcodedmp malicious.doc            # Disassemble p-code
```

## VBA Stomping

Source code destroyed/replaced, p-code intact. Office executes p-code if version matches.

Detection: mismatch between pcodedmp output and olevba source. Missing CompressedSourceCode.

## P-Code Instructions

Stack-based IL. Key categories: LitStr (push string), Ld/St (variable access), Branch/BranchF (flow), ArgsCall (function call), Set (object assign).

## Macro Obfuscation

| Technique | Example |
|-----------|---------|
| Chr() encoding | `Chr(80) & Chr(111)` |
| StrReverse | `StrReverse("llehsrewop")` |
| Split variables | `a="pow": b="ershell": c=a&b` |
| Dynamic invoke | `CallByName`, `Application.Run` |
| Sandbox detect | Screen resolution, uptime, VM artifacts |

## XLM (Excel 4.0) Macros

Stored in BIFF records. Key functions: EXEC(), CALL() (Win32 API), REGISTER() (DLL), URLDOWNLOAD().

```bash
python -m xlmmacrodeobfuscator -f malicious.xlsm -x
```

## PowerShell Obfuscation Layers

| Level | Technique |
|-------|-----------|
| Token | Tick marks: `` I`nv`oke-E`xpression `` |
| String | Concatenation: `"Inv"+"oke"+"-Expression"` |
| Encoding | Base64 + UTF8.GetString |
| Compression | GZip/Deflate streams |
| Encryption | XOR, AES before base64 |
| Reflection | `[Reflection.Assembly]::Load()` |

## PowerShell Deobfuscation

```python
import re, base64
script = open('obfuscated.ps1').read()
script = re.sub(r'`', '', script)  # Remove tick marks
# Decode base64 payloads
for match in re.finditer(r'"[A-Za-z0-9+/=]{50,}"', script):
    decoded = base64.b64decode(match.group(0).strip('"'))
```

Multi-layer pipeline: Extract base64 -> Decode -> Gzip decompress -> Repeat until plaintext.

AST analysis without execution:
```powershell
$ast = [System.Management.Automation.Language.Parser]::ParseInput($script, [ref]$null, [ref]$null)
$ast.FindAll({ $args[0] -is [CommandAst] }, $true)
```

## Empire/Cobalt Strike Payloads

**Empire stager**: Download base64 -> Deflate decompress -> IEX. Agent uses AES-256 C2.

**Cobalt Strike**: XOR-decoded shellcode -> VirtualAlloc -> CreateThread. Extract config with `1768.py`.

Extraction workflow:
```python
import base64, zlib
payload_raw = base64.b64decode(b64_blob)
decoded = zlib.decompress(payload_raw, -zlib.MAX_WBITS)
```

## AMSI Bypass Techniques

| Technique | Mechanism |
|-----------|-----------|
| amsiInitFailed | Set static field to true |
| D/Invoke patching | VirtualProtect + patch AmsiScanBuffer |
| HWBP bypass | Hardware breakpoints skip check |
| ScriptBlock Smuggling | Dual AST (different parse for scan vs execute) |
| ETW patching | Disable EtwEventWrite |

## Embedded PE Extraction

PE in base64: starts with `TVq` (base64 of MZ header).

```python
import re, base64
PE_PATTERN = r'(?:TVq[0-9A-Za-z+/]{60,})'
for seq in re.findall(PE_PATTERN, script):
    raw = base64.b64decode(seq)
    if raw[:2] == b'MZ':
        open('extracted.exe', 'wb').write(raw)
```

.NET assembly load pattern: `[System.Reflection.Assembly]::Load($bytes)` -> extract $bytes as DLL.

## Detection & Logging

ScriptBlock logging (Event ID 4104): captures deobfuscated command post-parsing.

Evasion: ETW patching, GUID spoofing, ScriptBlock Smuggling, EncodedCommand child process.

Reconstruction from split logs: group by ScriptBlockId, concatenate text fields.

## Key Tools

| Tool | Purpose |
|------|---------|
| olevba | VBA extraction + analysis |
| pcodedmp | P-code disassembly |
| ViperMonkey | VBA emulation |
| XLMMacroDeobfuscator | XLM formula deobfuscation |
| CyberChef | Manual deobfuscation recipes |
| PowerPeeler | Dynamic PS deobfuscation |
| 1768.py / CobaltStrikeParser | Beacon config extraction |
