# Android Decompilation Tools and RE Toolchains

TL;DR: Java-to-DEX decompilers (jadx, CFR, Procyon, dex2jar, enjarify, JEB,
Bytecode Viewer) with comparison matrix, and full Android RE toolchain coverage
(APKTool, Frida, objection, MobSF, DDMS, Drozer, Androguard, radare2, Ghidra DEX).

See also: android-smali-bytecode.md, android-obfuscation-deobfuscation.md

---
## 6. Java → DEX Decompilation Tools

These tools lift DEX bytecode back to readable Java source with varying quality.

### 6.1 jadx (The Gold Standard)

The most widely used Android decompiler — supports GUI, CLI, and script modes [9](https://github.com/skylot/jadx).

```bash
# Decompile APK to Java source
jadx myapp.apk -d output_dir

# Decompile DEX directly
jadx classes.dex -d output_dir

# Decompile with resources
jadx --show-bad-code myapp.apk -d output_dir

# Export as Gradle project
jadx --export-gradle myapp.apk -d output_dir

# Decompile only specific package
jadx -d output_dir --include 'com.example.*' myapp.apk

# Deobfuscation mode (rename ambiguous classes/methods)
jadx --deobf myapp.apk -d output_dir

# Flatten hierarchy (no package directories)
jadx --no-inline-anonymous --no-restore-inner-class --flatten-hierarchy myapp.apk

# Run in GUI
jadx-gui myapp.apk
# GUI features: search by class/string, goto declaration, find usage,
# export to Gradle, show Smali alongside Java
```

Key features:
- Recovers try/catch, enhanced-for, switch, anonymous classes, lambdas
- Resource decoding (AndroidManifest, layouts, strings)
- Deobfuscation mapping export
- DSL for custom post-processing (jadx plugins)

### 6.2 CFR (ClassyShark's engine alternative)

CFR was designed for JARs but also works on DEX via enjarify bridge [10](https://github.com/leibnitz/cfr):

```bash
# Convert DEX to JAR first
enjarify classes.dex -o classes.jar
# Then decompile
java -jar cfr.jar classes.jar --outputdir ./cfr_output
```

### 6.3 Procyon / Fernflower

Procyon handles complex control flow well. Fernflower was the original IntelliJ engine:

```bash
# Procyon (via jadx or standalone)
java -jar procyon-decompiler.jar -o output classes.jar

# Fernflower (now part of IntelliJ; standalone jar available)
java -jar fernflower.jar classes.jar output/
```

### 6.4 dex2jar + JD-GUI

The classic pipeline — convert to JAR then decompile with JVM tools [11](https://github.com/pxb1988/dex2jar):

```bash
# Convert DEX to JAR
d2j-dex2jar.sh classes.dex -o classes.jar

# Convert entire APK
d2j-dex2jar.sh myapp.apk -o myapp.jar

# Decompile with JD-GUI (GUI)
jd-gui myapp.jar

# Decompile with jad (CLI, outdated)
jad -r -d output -s java classes/**/*.class
```

dex2jar remains useful when you need JAR-level analysis (e.g., with Procyon).

### 6.5 enjarify (Better than dex2jar)

Google's enjarify produces more correct JAR output than dex2jar, especially for
obfuscated DEX [12](https://github.com/Storyyeller/enjarify):

```bash
enjarify myapp.apk -o myapp.jar
enjarify classes.dex -o classes.jar
```

### 6.6 JEB (Commercial)

JEB Pro by PNF Software is the premium Android reverse engineering platform.
It handles DEX, APK, OAT, and native ARM/x86 with cross-references, decompilation,
and debugging all in one interface. Tiered licensing (Decompiler, Pro, Pro + debugger).

### 6.7 Bytecode Viewer

A multi-tool Swiss Army knife that bundles Krakatau, CFR, Procyon, Fernflower,
and JD-GUI in one interface [13](https://github.com/Konloch/Bytecode-Viewer):

```bash
java -jar BytecodeViewer.jar
# Supports APK, DEX, JAR, CLASS
# Built-in search, Smali viewer, hex viewer
```

### 6.8 Tool Comparison

| Tool | DEX input | Output | Quality | Best for |
|------|-----------|--------|---------|----------|
| **jadx** | Direct APK/DEX | Java + resources | Best overall | Default choice |
| **CFR** | JAR only | Java | Very good (complex CFG) | When jadx struggles with control flow |
| **Procyon** | JAR only | Java | Good (enum/switch) | Specialized constructs |
| **JEB** | Direct APK/DEX/OAT | Java + IR | Best commercial | Professional RE |
| **dex2jar + JD** | DEX→JAR | Java | Fair (often wrong) | Quick triage |
| **enjarify + CFR** | DEX→JAR | Java | Good | Correct JAR conversion |
| **Bytecode Viewer** | APK/DEX/JAR | Multi-engine | Aggregate | Engine comparison |
| **Androguard** | DEX programmatic | Python API | Any | Custom analysis scripts |

---

## 7. Android RE Toolchains

### 7.1 APKTool (Resource + Smali)

As covered in Section 1.3 and 4.4. The primary APK unpack/repack tool [4](https://apktool.org/).

```bash
apktool d app.apk -o out/       # decode
apktool b out/ -o patched.apk   # build
```

### 7.2 jadx (Decompilation)

Covered in Section 6.1. Best static analysis entry point.

### 7.3 Frida for Android

Dynamic instrumentation — inject JavaScript to hook Java or native methods at runtime [14](https://frida.re/docs/android/):

```bash
# Install Frida server on device
adb root
adb push frida-server-arm64 /data/local/tmp/
adb shell chmod 755 /data/local/tmp/frida-server-arm64
adb shell /data/local/tmp/frida-server-arm64 &

# Basic hooks
frida -U com.example.app -l script.js

# Trace all methods in a class
frida-trace -U com.example.app -j 'com.example.app.*!*'

# Spawn and attach (before any code runs)
frida -U -f com.example.app -l script.js --no-pause
```

Example Frida script — hook and modify return value:

```javascript
Java.perform(function() {
    var MainActivity = Java.use('com.example.app.MainActivity');

    // Hook a method and replace return
    MainActivity.isLicensed.implementation = function() {
        console.log('[+] isLicensed called — returning true');
        return true;
    };

    // Hook constructor
    MainActivity.$init.implementation = function() {
        console.log('[+] MainActivity constructor');
        this.$init();
    };

    // Hook static method
    MainActivity.getSignature.implementation = function() {
        return 'PATCHED_SIGNATURE';
    };

    // Dump arguments and modify
    var StringBuilder = Java.use('java.lang.StringBuilder');
    StringBuilder.toString.implementation = function() {
        var result = this.toString();
        console.log('StringBuilder.toString: ' + result);
        return result;
    };

    // Trace loaded classes
    Java.enumerateLoadedClasses({
        onMatch: function(className) {
            if (className.includes('com.example')) {
                console.log('Loaded: ' + className);
            }
        },
        onComplete: function() {}
    });
});
```

### 7.4 Objection (Frida-based exploration)

Runtime exploration toolkit built on Frida [15](https://github.com/sensepost/objection):

```bash
# Launch objection on device
objection -g com.example.app explore

# Inside objection console:
android hooking list classes
android hooking list class_methods com.example.app.MainActivity
android hooking generate simple com.example.app.MainActivity
android hooking set return_value "com.example.app.utils.LicenseChecker.isLicensed" boolean false

# Disable SSL pinning
android sslpinning disable

# Dump memory
android heap search instances com.example.app.model.User

# Search for strings in heap
memory search "password"

# Export all file system data for analysis
ls /data/data/com.example.app/
```

### 7.5 Mobile Security Framework — MobSF

Automated static + dynamic analysis pipeline [16](https://github.com/MobSF/Mobile-Security-Framework-MobSF):

```bash
# Run MobSF
docker pull opensecurity/mobile-security-framework-mobsf
docker run -it -p 8000:8000 opensecurity/mobile-security-framework-mobsf

# Upload APK via web UI at http://localhost:8000
# Static analysis: permissions, components, data flow, cert analysis
# Dynamic analysis: requires Android VM/emulator setup
```

### 7.6 Android Studio / DDMS

Dalvik Debug Monitor Server — part of Android Studio:

```
Android Studio → Profile or Debug app
  → Monitor: CPU, memory, network, energy
  → Method tracing (.trace file) — view call tree
  → Heap dump (.hprof) — analyze with MAT (Eclipse Memory Analyzer)
  → Network inspector — see all HTTP/HTTPS traffic
```

```bash
# Generate method trace from command line
adb shell am profile start com.example.app /data/local/tmp/app.trace
# ... use the app ...
adb shell am profile stop com.example.app

# Pull trace file
adb pull /data/local/tmp/app.trace .

# Capture heap dump
adb shell am dumpheap com.example.app /data/local/tmp/app.hprof
adb pull /data/local/tmp/app.hprof .
```

### 7.7 Drozer

Security assessment framework — discover attack surfaces via Android IPC [17](https://github.com/WithSecureLabs/drozer):

```bash
# Install drozer agent on device, connect
adb forward tcp:31415 tcp:31415
drozer console connect

# Enumerate attack surface
dz> run app.package.attacksurface com.example.app
dz> run app.activity.info -a com.example.app
dz> run app.provider.info -a com.example.app
dz> run app.service.info -a com.example.app
dz> run app.broadcast.info -a com.example.app

# Test content provider leakage
dz> run app.provider.query content://com.example.app.provider/users/

# Check for exported activities
dz> run app.activity.start --action android.intent.action.VIEW \
    --data-uri "http://evil.com" com.example.app
```

### 7.8 Androguard

Python framework for APK/DEX analysis with a powerful CLI [18](https://github.com/androguard/androguard):

```bash
# Basic APK info
androguard axplorer myapp.apk

# DEX analysis
androlyze.py -s myapp.apk <<< 'print(list(d.get_classes()))'

# Decompile all methods to Smali
androlyze.py -s myapp.apk <<< '
a, d, dx = AnalyzeAPK("myapp.apk")
for cls in d.get_classes():
    for m in cls.get_methods():
        print(m.get_name(), m.get_descriptor())
'

# Permission analysis
androguard permissions myapp.apk
```

### 7.9 radare2 / rizin for DEX

```bash
radare2 classes.dex
> iI          # show DEX header
> ic          # list classes
> il          # list methods
> afl         # list functions
> s sym.MainActivity.onCreate  # seek to method
> pdf         # disassemble function
> V           # enter visual mode
```

### 7.10 Ghidra DEX Support

Ghidra supports DEX via its Dalvik processor module:

```bash
# Import DEX file into Ghidra
# Language: Dalvik (all versions)
# Analyzer: Dalvik Decompiler (experimental)

# Headless mode
ghidraHeadless /tmp/projects MyProject \
  -import classes.dex \
  -postScript DumpClasses.java
```
