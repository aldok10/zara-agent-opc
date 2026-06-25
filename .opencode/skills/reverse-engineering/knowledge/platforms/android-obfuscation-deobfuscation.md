# Android Obfuscation and Deobfuscation

TL;DR: ProGuard/R8 shrinking and name obfuscation (with mapping file recovery),
string encryption patterns, control-flow obfuscation (opaque predicates, flattening),
commercial obfuscators (DexGuard, DashO, 360 Jiagu, Tencent Legu), and OLLVM for
native .so libraries.

See also: android-smali-bytecode.md, android-decompilers-toolchains.md

---
## 8. Obfuscation and Deobfuscation

### 8.1 ProGuard / R8

ProGuard (now R8 is default in Android Gradle Plugin) is the standard Android code
shrinker/obfuscator [19](https://developer.android.com/build/shrink-code):

**What it does:**
- Renames classes, methods, fields to short meaningless names (`a`, `b`, `c`)
- Inlines short methods
- Removes dead code
- String encryption (ProGuard only with `-optimizationpasses`)

**Detection:**

A heavily ProGuard'd app shows classes named `a.a.a`, `b.c.d`, etc. In jadx:
```java
package a.a;

public class a {
    private String a;
    public void a(String a) { this.a = a; }
    public String a() { return this.a; }
}
```

**R8 mapping file recovery:**

ProGuard/R8 outputs a `mapping.txt` with deobfuscation data:

```
com.example.app.MainActivity -> a.a:
    com.example.app.utils.Logger log -> a
    void onCreate(android.os.Bundle) -> a
    boolean isLicensed() -> b
    int getVersionCode() -> c
```

This mapping can be re-applied by jadx:

```bash
# Apply mapping while decompiling
jadx --deobf --deobf-mapping mapping.txt myapp.apk -d output

# Or reverse the mapping with proguard tools
java -jar proguard.jar @retrace.conf mapping.txt obfuscated.txt
```

### 8.2 String Encryption

Common patterns in jadx output:

```java
// Direct string decryption in code
String key = "aB3dEf...";
String encrypted = "xYz...";
String decrypted = new String(Base64.decode(encrypted, 0));
// Now `decrypted` is used — the real string is runtime-derived

// Reflection-based decryption
private static String decrypt(int key, int seed) {
    char[] chars = new char[] { /* long char array */ };
    // XOR loop
    return new String(chars);
}
```

To recover strings interactively with Frida:

```javascript
Java.perform(function() {
    var Cls = Java.use('com.example.app.StringDecryptor');
    Cls.decrypt.implementation = function(key, seed) {
        var result = this.decrypt(key, seed);
        console.log('decrypt(' + key + ', ' + seed + ') = ' + result);
        return result;
    };
});
```

### 8.3 Control-Flow Obfuscation

Opaque predicates and bogus branches confuse decompilers:

```java
// Opaque predicate — always-true/always-false condition
if (System.currentTimeMillis() > 0) {
    // real path
} else {
    // dead code (bogus)
}

// Control-flow flattening (DexGuard specialty)
// Instead of:
if (a) { A(); } else { B(); }
// You get:
int state = a ? 1 : 2;
while (true) {
    switch(state) {
        case 1: A(); state = 3; break;
        case 2: B(); state = 3; break;
        case 3: return;
    }
}
```

DexGuard/DashO use this extensively. jadx handles simple opaque predicates well,
but may fail on deep-nested flattened dispatch loops.

### 8.4 DexGuard / DashO

Commercial Android obfuscators with advanced features:

| Feature | DexGuard | DashO | 360 Jiagu | Tencent Legu |
|---------|----------|-------|-----------|-------------|
| Name obfuscation | Yes | Yes | Yes | Yes |
| String encryption | Yes | Yes | Yes | Yes |
| Class encryption | Load-time | Load-time | Full dex | Full dex |
| CFG flattening | Yes | Yes | No | Limited |
| Reflection calls | Yes | Yes | Yes | Yes |
| Native protection | .so packer | Optional | ELF packer | ELF packer |
| Anti-tamper | Yes | Yes | Yes | Yes |
| Anti-debug | Yes | Yes | Yes | Yes |

**360 Jiagu (Qihoo 360)** unpacks the real DEX from encrypted native code at runtime.
The unpacking technique is: the app's real classes.dex is small (a stub). The
actual DEX is loaded into memory by native code (`libjiagu.so`) after decryption
and anti-tamper checks. Extracting the real DEX requires Frida memory dumping
(see Section 15).

**Tencent Legu** similarly packs the DEX and hooks `DexClassLoader` to serve
decrypted bytes at load time.

### 8.5 OLLVM for Native .so

OLLVM (Obfuscator-LLVM) applies to C/C++ native libraries — control-flow
flattening, bogus control flow, instruction substitution [20](https://github.com/obfuscator-llvm/obfuscator):

```bash
# Externally observable
strings libnative.so | head -20   # all strings are encrypted or XOR'd
# Disassembly shows:
# - Constant arrays instead of direct values
# - Redundant arithmetic (substitution)
# - Flattened switch dispatch
# - Bogus conditional branches
```

Detection: search for unique OLLVM patterns in Ghidra or IDA — flattened dispatch
with `switch` to a state variable, blocks ending in `mov` + `b` to a dispatch block.

---

---

## Sources

7. JesusFreke — smali/baksmali: https://github.com/JesusFreke/smali
8. AOSP — Dalvik Bytecode: https://source.android.com/docs/core/runtime/dalvik-bytecode
9. skylot — jadx: https://github.com/skylot/jadx
10. leibnitz — CFR: https://github.com/leibnitz/cfr
11. pxb1988 — dex2jar: https://github.com/pxb1988/dex2jar
12. Storyyeller — enjarify: https://github.com/Storyyeller/enjarify
13. Konloch — Bytecode Viewer: https://github.com/Konloch/Bytecode-Viewer
14. Frida — Android setup: https://frida.re/docs/android/
15. sensepost — objection: https://github.com/sensepost/objection
16. MobSF: https://github.com/MobSF/Mobile-Security-Framework-MobSF
17. WithSecureLabs — Drozer: https://github.com/WithSecureLabs/drozer
18. Androguard: https://github.com/androguard/androguard
19. Android Developers — Shrink, obfuscate, optimize: https://developer.android.com/build/shrink-code
20. obfuscator-llvm — OLLVM: https://github.com/obfuscator-llvm/obfuscator
