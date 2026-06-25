# Android Traffic Interception, Memory Forensics, and E2E Workflow

TL;DR: mitmproxy + Frida SSL bypass setup, ProxyDroid, PCAPdroid, tcpdump,
VPNService capture, Fridump memory dumping, LiME full RAM extraction, in-memory
DEX extraction, /proc/mem dumping, classloader inspection, and full app
assessment pipeline with tool decision matrix.

See also: android-native-so-re.md, android-frida-dynamic.md, android-security-model.md, android-root-bypass-resources.md

---
## 14. Intercepting Android Traffic

### 14.1 mitmproxy + Frida SSL Pinning Bypass

The universal setup for intercepting HTTPS traffic [32](https://mitmproxy.org/):

```bash
# 1. Start mitmproxy
mitmproxy -p 8080

# 2. Install CA cert on device
adb push ~/.mitmproxy/mitmproxy-ca-cert.cer /sdcard/
# Settings → Security → Install from storage → Select mitmproxy-ca-cert.cer

# 3. Set proxy
adb shell settings put global http_proxy 192.168.1.100:8080

# 4. Bypass SSL pinning (if needed)
frida -U com.example.app -l ssl-pinning-bypass.js

# 5. For non-HTTP traffic:
# mitmproxy transparent mode with iptables redirect
android sslpinning disable  # inside objection
```

### 14.2 ProxyDroid

An Android app that redirects all app traffic through a proxy (requires root):

```bash
# Install ProxyDroid from Play / F-Droid
# Configure: proxy host/port, select target app
# Works with SOCKS5 and HTTP proxy
# Global proxy mode → all TCP traffic through proxy
```

### 14.3 PCAPdroid

A no-root network capture tool using VPNService API [33](https://github.com/emanuele-f/PCAPdroid):

```bash
# Enable PCAPdroid
# Set target app → start capture
# Export to pcap → open in Wireshark
# For TLS decryption: combine with mitmproxy

# Or capture with tcpdump on rooted device:
adb shell tcpdump -i any -s 0 -w /sdcard/capture.pcap
```

### 14.4 tcpdump (Rooted Device)

```bash
# Capture all traffic on device
adb shell su -c "tcpdump -i any -s 0 -w /data/local/tmp/traffic.pcap"

# Interface-specific
adb shell su -c "tcpdump -i wlan0 -s 0 -w /data/local/tmp/traffic.pcap"

# Apply filter for specific app port
adb shell su -c "tcpdump -i any port 8080 -w /data/local/tmp/api.pcap"

# Pull and analyze
adb pull /data/local/tmp/traffic.pcap .
tshark -r traffic.pcap -Y http
```

### 14.5 VPNService-Based Capture

Apps like **Packet Capture**, **HTTPCanary**, and Frida's own `frida-network-intercept`
use Android's VPNService to redirect traffic through a local VPN interface:

```bash
# Frida network intercept
frida -U com.example.app -l frida-network-intercept.js
# Modifies traffic in-line — no external proxy needed
```

Programmatic capture with VPNService:

```java
// App implements VpnService.Builder()
// Creates a TUN interface
// Reads/writes packets from the interface FD
// Non-root, but requires user consent for VPN permission
```

---

## 15. Android Memory Forensics

### 15.1 Fridump

A Frida-based memory dumping tool [34](https://github.com/Nightbringer21/fridump):

```bash
# Dump all memory
python fridump.py -U com.example.app

# Dump only specific strings
python fridump.py -U com.example.app -s password

# Dump to custom directory
python fridump.py -U com.example.app -o /tmp/memory_dump

# Search dumped memory for specific patterns
strings dump_dir/*.data | grep -i "api_key"
```

Fridump enumerates memory regions via Frida's `Process.enumerateRanges()` and
reads each region. The output is raw binary memory dumps plus a strings summary.

### 15.2 LiME (Linux Memory Extractor)

LiME extracts full RAM images from Android devices [35](https://github.com/504ensicsLabs/LiME):

```bash
# Compile LiME kernel module for target kernel
# (Needs kernel source matching device)
make KERNELDIR=~/android-kernel/

# Load module and dump
adb push lime.ko /data/local/tmp/
adb shell su -c "insmod lime.ko 'path=/sdcard/ram.dump format=lime'"
```

LiME dumps are compatible with Volatility for analysis.

### 15.3 In-Memory DEX Extraction

Many obfuscation packers (360, Legu, Bangcle) load decrypted DEX into memory
at runtime and never write it to disk. To extract:

**Frida DexDump approach:**

```javascript
// Hook DexClassLoader and capture the real DEX bytes
Java.perform(function() {
    var DexFile = Java.use('dalvik.system.DexFile');

    // Or hook BaseDexClassLoader
    var BaseDexClassLoader = Java.use('dalvik.system.BaseDexClassLoader');
    BaseDexClassLoader.$init.implementation = function(dexPath, ...) {
        console.log('[+] Dex loaded from: ' + dexPath);
        // Read the file if it exists; otherwise, it's in-memory
        return this.$init(dexPath, ...);
    };

    // For in-memory DEX, dump via reflection
    var PathClassLoader = Java.use('dalvik.system.PathClassLoader');
    // Use Java.enumerateClassLoaders to find the right one
});
```

**Frida script to dump loaded DEX:**

```javascript
Java.perform(function() {
    var DexFile = Java.use('dalvik.system.DexFile');
    var BaseDexClassLoader = Java.use('dalvik.system.BaseDexClassLoader');
    var Elements = Java.use('dalvik.system.DexPathList$Element');

    // Walk the class loader's path list for DEX files
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            if (loader.toString().includes('com.example.app')) {
                try {
                    var pathList = loader.pathList.value;
                    var dexElements = pathList.dexElements.value;
                    for (var i = 0; i < dexElements.length; i++) {
                        var dexFile = dexElements[i].dexFile.value;
                        var mCookie = dexFile.mCookie.value;
                        console.log('[+] DEX cookie: ' + mCookie);
                    }
                } catch(e) {
                    console.log('[-] Error: ' + e);
                }
            }
        },
        onComplete: function() {}
    });
});
```

**Frida-dump-dex (custom tool):**
```bash
git clone https://github.com/amimo94/frida-dump-dex
cd frida-dump-dex
python dump_dex.py -U com.example.app
# Dumps all loaded DEX files to current directory
```

### 15.4 Process Dumping via /proc/mem

```bash
# Find PID
adb shell ps | grep com.example.app

# Dump memory map
adb shell su -c "cat /proc/PID/maps" > maps.txt

# Dump heap
adb shell su -c "dd if=/proc/PID/mem bs=4096 skip=0 count=1000 of=/sdcard/mem.dump"
# (Be careful: mem ranges are virtual, need map parsing)

# Better: use /proc/PID/mem via dd with range from maps
adb shell su -c "dd if=/proc/PID/mem bs=1 \
  skip=$((0xHEAP_BASE)) count=$((0xHEAP_SIZE)) \
  of=/sdcard/heap.dump"
```

### 15.5 Classloader Inspection

Finding all DEX loaders in a running app:

```javascript
Java.perform(function() {
    // Enumerate all class loaders
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            console.log('[Loader] ' + loader);
            console.log('  toString: ' + loader.toString());
            // Get parent
            try {
                var parent = loader.getParent();
                console.log('  parent: ' + (parent ? parent : 'null'));
            } catch(e) {}
        },
        onComplete: function() {
            console.log('[+] Class loader enumeration complete');
        }
    });
});
```

---

## 16. End-to-End Workflow

### 16.1 Full App Assessment Pipeline

```bash
# === PHASE 1: Static Analysis ===

# 1. Triage APK
aapt dump badging myapp.apk | head -30
aapt dump permissions myapp.apk
unzip -l myapp.apk | head -50

# 2. Extract and decompile with jadx
jadx myapp.apk -d jadx_out

# 3. Resource analysis
apktool d myapp.apk -o apktool_out
grep -r "https\?://" apktool_out/res/values/strings.xml

# 4. Native library analysis
unzip -j myapp.apk "lib/arm64-v8a/*" -d libs/
file libs/*.so
nm -D libs/*.so | grep -E "^[0-9a-f]+ T Java_"

# 5. Manifest inspection
aapt2 dump xmltree myapp.apk AndroidManifest.xml | grep -E "exported|permission|debuggable|backup"

# === PHASE 2: Dynamic Analysis ===

# 6. Install and run
adb install myapp.apk
adb shell monkey -p com.example.app 100    # poking

# 7. Test with Frida
frida -U -f com.example.app -l init.js --no-pause

# 8. Intercept traffic
mitmproxy -p 8080 &
frida -U com.example.app -l ssl-pinning-bypass.js

# 9. Check for certificate transparency / pinning
# Use objection android sslpinning disable

# === PHASE 3: Deep Analysis ===

# 10. Memory dump
python fridump.py -U com.example.app -o dump/
strings dump/*.data | grep -iE "secret|key|token|password|api"

# 11. Extract packed DEX
python dump_dex.py -U com.example.app

# 12. Profile methods
frida-trace -U com.example.app -j 'com.example.app.*!*'

# 13. Bypass root detection + SSL + tampering
frida -U com.example.app -l bypass_all.js
```

### 16.2 Tool Decision Matrix

| Scenario | Primary Tool | Secondary |
|----------|-------------|-----------|
| First look at APK | jadx | jadx-gui |
| Change behavior | APKTool + Smali edit | Frida hook |
| Bypass license check | Frida | Smali patch |
| Decrypt strings | Frida trace + manual | jadx deobf |
| Analyze native lib | Ghidra/IDA | radare2 |
| Bypass SSL pinning | objection | Frida script |
| Intercept all traffic | mitmproxy | PCAPdroid |
| Memory dump | Fridump | /proc/mem dd |
| Unpack obfuscated app | Fridump + DexDump | Custom Frida |
| Permission audit | androguard | MobSF |
| IPC attack surface | Drozer | Manual AIDL |
| Runtime method trace | frida-trace | DDMS method profiling |
| Full automation | MobSF | Python + Frida |

---

## Sources

1. Nelenkov — Android App Security Part 1: https://nelenkov.blogspot.com/2012/07/android-app-security-part-1.html
2. AOSP — APK Signing: https://source.android.com/docs/security/features/apksigning
3. Android Developers — zipalign: https://developer.android.com/studio/command-line/zipalign
4. APKTool: https://apktool.org/
5. AOSP — DEX Format: https://source.android.com/docs/core/runtime/dex-format
6. AOSP — ART: https://source.android.com/docs/core/runtime
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
21. Oracle — JNI Spec: https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/functions.html
22. LSPosed: https://github.com/LSPosed/LSPosed
23. topjohnwu — Magisk: https://github.com/topjohnwu/Magisk
24. r0ysue — r0capture: https://github.com/r0ysue/r0capture
25. AOSP — App Sandbox: https://source.android.com/docs/security/app-sandbox
26. AOSP — Key Attestation: https://source.android.com/docs/security/keystore/attestation
27. AOSP — Verified Boot: https://source.android.com/docs/security/features/verifiedboot
28. AOSP — APEX: https://source.android.com/docs/core/ota/apex
29. Optiv — Bypass Android Root Detection: https://www.optiv.com/insights/source-zero/blog/techniques-bypass-android-root-detection
30. JustanApplication — Android Resources, Part 1: https://justanapplication.wordpress.com/2011/09/16/a-closer-look-at-android-resources-part-1/
31. Android Developers — Nine-patch: https://developer.android.com/develop/ui/views/graphics/drawables#nine-patch
32. mitmproxy: https://mitmproxy.org/
33. emanuele-f — PCAPdroid: https://github.com/emanuele-f/PCAPdroid
34. Nightbringer21 — Fridump: https://github.com/Nightbringer21/fridump
35. 504ensicsLabs — LiME: https://github.com/504ensicsLabs/LiME
