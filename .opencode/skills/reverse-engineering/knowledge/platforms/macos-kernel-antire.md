# macOS/iOS Kernel/Driver RE and Anti-RE Detection

TL;DR: XNU kernel and kernelcache analysis, IOKit/kext reversing, KPP/KTRR/PAC
protections, zone map forensics, iOS jailbreak/debugger detection and bypass,
anti-tampering, obfuscation techniques and detection checklist.

See also: macos-dtrace-re.md, macos-fairplay-app-analysis.md, macos-lldb-re-workflow.md, macos-objc-runtime.md, macos-swift-runtime-abi.md

---

## 11. iOS Kernel / Driver RE

### 11.1 XNU Kernel

XNU (X is Not Unix) is the macOS/iOS kernel. It's a hybrid of Mach microkernel
(IPC, VM, scheduler) + BSD (processes, sockets, file system) + IOKit (driver
framework) [43].

The kernel is a Mach-O executable at:
```
/System/Library/Kernels/kernel.release.t6000    # macOS (Apple Silicon)
/System/Library/Kernels/kernel                    # macOS (Intel)
```

On iOS, the kernel is inside the `iBEC`/`iBoot` firmware and requires
decryption/demangling from the kernelcache.

### 11.2 Kernelcache Analysis

iOS kernelcache is:
1. LZSS/LZVN compressed
2. IMG4/IMG3 wrapped with Apple security headers
3. Often FairPlay-encrypted on production devices

Extraction:

```bash
# Extract from IPSW
unzip iPhone_*.ipsw
# Find kernelcache.release.* in the firmware folder

# Use img4tool to unwrap IMG4
img4tool -e kernelcache.release.* -o kernelcache.raw

# Decompress (lzssdec / pyasn1 / jtool2)
jtool2 --decrypt kernelcache.raw -o kernelcache.macho
```

### 11.3 IOKit and Kexts

IOKit drivers (kernel extensions) provide I/O Kit services. On macOS, kexts
are `.kext` bundles containing Mach-O binaries at:
```
/System/Library/Extensions/
/Library/Extensions/
```

On iOS, kexts are baked into the kernelcache (no user-loadable kexts on iOS).
Reverse engineering IOKit [43]:

```bash
# List loaded kexts
kextstat

# Load a kext (macOS)
kextload /path/to/MyKext.kext

# Unload
kextunload /path/to/MyKext.kext

# Dump IOKit registry
ioreg -l
```

Each IOKit driver implements `IOService::start()`, `IOService::stop()`, and
external methods via `IOExternalMethod`. The IOKit object model mirrors C++
vtables — watch for `vtable` references in the kext's `__DATA,__const`.

### 11.4 Kernel Patches / KPP / KTRR

**KPP (Kernel Patch Protection)**: Apple's kernel integrity mechanism on A7-A11
devices. A separate EL3 (Secure Monitor) firmware periodically verifies kernel
text and critical data hasn't been modified [44].

**KTRR (Kernel Text Read-Only Region)**: A12+ devices enforce kernel text
read-only via hardware MMU. Pages designated as KTRR are write-protected even
from the kernel itself. Jailed devices cannot patch the kernel at runtime [44].

Signs of KTRR/KPP defeat in jailbreaks:
- Boot-time patches that mark KTRR regions writable
- PAC bypass for kernel function pointers
- Zone manipulation for kernel data structures

### 11.5 Pointer Authentication (PAC) on arm64e

PAC was introduced with the A12 chip [45][46]:

```asm
; Sign a function pointer before storing
paciza  x0             ; sign x0 using A-key, integration pointer
str     x0, [x8]       ; store signed pointer

; Authenticate before using
autiza  x0             ; authenticate and strip PAC from x0
br      x0             ; jump to authenticated pointer

; PAC instructions for return addresses
pacibsp                ; sign LR (x30) with B-key (stack-specific)
...
autibsp                ; verify LR before returning
retab                  ; authenticate and return
```

The PAC is stored in the high 16 bits of a 64-bit pointer (leaving 48 bits
for the address). PAC bypass techniques:
- **Hardware attacks**: glitching, hammering
- **Software attacks**: PAC mangling via known key, PAC preimage lookup tables
- **Reuse**: don't authenticate if you can reuse a signed pointer

For RE: tools must understand PAC stripping. `otool -tV` shows PAC instructions;
Ghidra ARM64e plugins can model them.

### 11.6 Zone Map Forensics

XNU uses a zone allocator (`zalloc`). The **zone map** is a virtual memory
region covering all zone-allocated structures. On iOS, the zone map's location
is randomized but discoverable via kernel symbol `_zone_map` [43].

For forensic analysis (on a jailbroken device):
```bash
# Dump zone info
sudo zprint

# Walk zone map for specific structures (via lldb kernel debug)
(lldb) expr (void)zalloc("my_zone", 128)
```

Common zone structures of interest: `ipc_port`, `ipc_space`, `task`,
`proc`, `fileproc`, `socket`. Understanding zone layout helps when exploiting
use-after-free vulnerabilities in the kernel.

---

## 12. Anti-RE on iOS

### 12.1 Jailbreak Detection

Apps detect jailbroken environments through multiple techniques [6][47]:

**File-based checks:**
```objc
BOOL isJailbroken() {
    NSArray *paths = @[@"/Applications/Cydia.app",
                       @"/Library/MobileSubstrate/MobileSubstrate.dylib",
                       @"/bin/bash",
                       @"/usr/sbin/sshd",
                       @"/etc/apt",
                       @"/private/var/lib/apt/",
                       @"/private/var/stash"];
    for (NSString *path in paths) {
        if ([[NSFileManager defaultManager] fileExistsAtPath:path]) return YES;
    }
    return NO;
}
```

**Symbol-based checks:**
```objc
BOOL hasJailbreakSymbols() {
    // Check for MobileSubstrate
    if (dlsym(RTLD_DEFAULT, "MSHookFunction")) return YES;
    if (dlsym(RTLD_DEFAULT, "MSGetImage")) return YES;
    return NO;
}
```

**Bypass techniques:**
- **Frida**: `frida -U --codeshare pdodd/jailbreak-detection-bypass AppName`
- **Shadow** (jailbreak detection bypass tweak): https://github.com/jjolano/shadow
- **Liberty Lite**: Classic Cydia tweak for blocking JB checks
- **Manual**: Patch all `stat()` calls, `dlsym()` lookups, and file-existence
  checks in the disassembly via lldb/memory patches

### 12.2 Debugger Detection

**ptrace(PT_DENY_ATTACH)** — the classic anti-debugging on iOS [48][49]:

```objc
#include <sys/ptrace.h>

- (void)applicationDidFinishLaunching:(UIApplication*)app {
    // Deny debugger attachment — if a debugger is attached, this kills the process
    ptrace(PT_DENY_ATTACH, 0, 0, 0);
}
```

Called in `main()` or early in app start. Bypass:

```lldb
# Option 1: Break before ptrace
(lldb) breakpoint set --name ptrace
(lldb) continue
# At breakpoint:
(lldb) thread return 0   # skip the ptrace call, return 0

# Option 2: Patch the binary
# Search for the syscall number (0x1A = ptrace on ARM64)
# Replace with a NOP sled
```

**sysctl debugger detection:**

```objc
#include <sys/sysctl.h>

BOOL isDebuggerAttached() {
    int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()};
    struct kinfo_proc info;
    info.kp_proc.p_flag = 0;
    size_t size = sizeof(info);
    sysctl(mib, sizeof(mib)/sizeof(*mib), &info, &size, NULL, 0);
    return (info.kp_proc.p_flag & P_TRACED) != 0;
}
```

Bypass: Patch the `sysctl` call to always zero the `p_flag` check, or NOP the
conditional branch after it.

### 12.3 Anti-Tampering — Code Signing Validation

Apps verify their own code signature at runtime [6]:

```objc
// Check LC_CODE_SIGNATURE hash
BOOL isCodeValid() {
    // Calculate a hash of __TEXT and compare against embedded signature
    // Or use `SecStaticCodeCheckValidity`
    SecStaticCodeRef staticCode;
    SecStaticCodeCreateWithPath(NSBundle.mainBundle.bundleURL,
                                kSecCSDefaultFlags, &staticCode);
    OSStatus result = SecStaticCodeCheckValidity(staticCode,
                                                  kSecCSCheckAllArchitectures,
                                                  NULL);
    return (result == errSecSuccess);
}
```

Bypass: Patch `SecStaticCodeCheckValidity` to always return `errSecSuccess`,
or modify the control flow after the check.

### 12.4 Application Encryption

FairPlay (§7) itself is an anti-tamper mechanism — encrypted binaries cannot be
statically analyzed without decryption. Decrypting still requires a jailbroken
device (or a vulnerability like checkm8 on A5-A11).

### 12.5 Obfuscation

Apps may apply additional layers:
- **Control flow obfuscation**: opaque predicates, junk code insertion
- **String encryption**: obfuscated strings decrypted at runtime
- **Method name obfuscation**: rename ObjC selectors via post-processing
- **LLVM obfuscation passes**: Hikari, obfuscator-llvm

Detection:
- High entropy in `__cstring` (would indicate encrypted strings)
- `objc_msgSend` calls with selectors loaded from computed addresses
- C++-style vtables with opaque dispatch

### 12.6 Anti-RE Detection Checklist

When analyzing an iOS binary, scan for:

| Technique | API / Pattern | Bypass |
|-----------|--------------|--------|
| ptrace | `ptrace(PT_DENY_ATTACH)` | `thread return 0` in lldb |
| sysctl debug | `sysctl` + `p_flag & P_TRACED` | Patch branch post-check |
| File existence | `fileExistsAtPath:` for Cydia paths | Patch return values, use Frida |
| Symbol check | `dlsym(RTLD_DEFAULT, ...)` | Patch `dlsym` or preload libs |
| Code sign check | `SecStaticCodeCheckValidity` | Hook to return success |
| Fork protection | `fork()` or `sysctl([CTL_KERN...])` | NOP out |
| Entitlement validation | `SecTaskCopyValueForEntitlement` | Patch return |
| Encrypted binary | `cryptid=1` in LC_ENCRYPTION_INFO | Decrypt first |
| Anti-Frida | Check for `frida-server` port (27042) | Use a custom port |
| CPU register check | `sysctlbyname("hw.cputype")` | Patch or hook |

---

## Sources

1. Apple, "OS X ABI Mach-O File Format Reference" (archived) — https://web.archive.org/web/20140904004108/https://developer.apple.com/library/mac/documentation/developertools/conceptual/MachORuntime/Reference/reference.html
2. Apple Open Source, "dyld" — https://opensource.apple.com/source/dyld/
3. Apple Open Source, "objc4" (Objective-C Runtime) — https://opensource.apple.com/source/objc4/
4. Swift.org, "Swift ABI Documentation" — https://github.com/swiftlang/swift/blob/main/docs/ABI/
5. LLVM Project, "LLVM Language Reference Manual" — https://llvm.org/docs/LangRef.html
6. OWASP, "iOS Mobile Security Testing Guide" (MASTG) — https://mas.owasp.org/MASTG/
7. iOSRE Wiki, "Mach-O" — https://github.com/kpwn/iOSRE/blob/master/wiki/Mach-O.md
8. Francesco Tamagni (NowSecure), "Reversing iOS System Libraries Using Radare2: A Deep Dive into Dyld Cache (Part 1)" — https://www.nowsecure.com/blog/2024/09/11/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-1/
9. Francesco Tamagni (NowSecure), "Part 2: Cross-References" — https://www.nowsecure.com/blog/2024/09/12/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-2/
10. Francesco Tamagni (NowSecure), "Part 3: Fixups" — https://www.nowsecure.com/blog/2024/09/13/reversing-ios-system-libraries-using-radare2-a-deep-dive-into-dyld-cache-part-3/
11. Derek Selander, "dsdump" — https://github.com/DerekSelander/dsdump
12. Nygard, "class-dump" — https://github.com/nygard/class-dump
13. Karol Mazurek, "Snake&Apple I: Mach-O files on ARM64" — https://karol-mazurek.medium.com/snake-apple-i-mach-o-a8eda4b87263
14. Wikipedia, "Mach-O" — https://en.wikipedia.org/wiki/Mach-O
15. Hexios, "So Macho — A look at Apple executable files" — https://hexiosec.com/blog/macho-files/
16. Apple, "Code Signing Guide" (archived) — https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/
17. Emerge Tools, "How iOS 15 makes your app launch faster" — https://www.emergetools.com/blog/posts/iOS15LaunchTime
18. Apple, "otool-classic(1) man page" — https://keith.github.io/xcode-man-pages/otool-classic.1.html
19. LLVM, "llvm-otool documentation" — https://www.llvm.org/docs/CommandGuide/llvm-otool.html
20. Jonathan Levin, "jtool/jtool2" — http://newosxbook.com/tools/jtool.html
21. Steve Nygard, "class-dump" — http://stevenygard.com/projects/class-dump/
22. David Chisnall, "A Modern Objective-C Runtime" — https://www.jot.fm/issues/issue_2009_01/article4/
23. Apple WWDC 2020, "Advancements in the Objective-C runtime" (Session 10163) — https://developer.apple.com/videos/play/wwdc2020/10163
24. Kodeco, "Advanced Apple Debugging & Reverse Engineering, Ch. 17: Exploring & Method Swizzling" — https://www.kodeco.com/books/advanced-apple-debugging-reverse-engineering/v3.0/chapters/17-exploring-method-swizzling-objective-c-frameworks
25. Swift.org, "Swift Type Metadata" — https://github.com/swiftlang/swift/blob/main/docs/ABI/TypeMetadata.rst
26. Swift.org, "Swift Calling Convention" — https://github.com/swiftlang/swift/blob/main/docs/ABI/CallConvSummary.rst
27. Belkadan, "Swift Runtime Type Metadata" — https://belkadan.com/blog/2020/09/Swift-Runtime-Type-Metadata/
28. Jignesh Kalantri, "Swift Protocol Dispatch — Static vs Dynamic Dispatch, Witness Table, VTable" — https://medium.com/@jigneshkalantri01/swift-protocol-dispatch-explained-static-vs-dynamic-dispatch-witness-table-vtable-protocol-ffdd134b3179
29. Swift.org, "Swift Name Mangling" — https://github.com/swiftlang/swift/blob/main/docs/ABI/Mangling.rst
30. kindatechnical, "Stack Frame Layout on x86-64" — https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64
31. ARM, "Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64)" — https://developer.arm.com/documentation/ihi0055/latest/
32. Nicolo Grilli, "Analysis of Obfuscation Found in Apple FairPlay" — https://nicolo.dev/en/blog/fairplay-apple-obfuscation/
33. fadeevab, "Decrypt iOS Applications (3 methods)" — https://fadeevab.com/decrypt-ios-applications-3-methods/
34. Stefano Zanero, "Removing Apple iOS DRM via CLI" — https://medium.com/@mobsecguys/removing-apple-drm-via-cli-f5c0d75ba6eb
35. Frida, "frida-ios-dump" — https://github.com/Azule/cr4shed/tree/master?tab=readme-ov-file
36. Derek Selander, "yacd — Yet Another Crackme Decrypter" — https://github.com/DerekSelander/yacd
37. bitrise-io, "ipa_analyzer" — https://github.com/bitrise-io/ipa_analyzer
38. OWASP MASTG, "Extracting Entitlements from MachO Binaries" — https://mas.owasp.org/MASTG/techniques/ios/MASTG-TECH-0111/
39. Apple, "LLDB Tutorial" — https://lldb.llvm.org/use/tutorial.html
40. Apple WWDC 2024, "Run, Break, Inspect: Explore effective debugging in LLDB" (Session 10198) — https://developer.apple.com/videos/play/wwdc2024/10198/
41. Karol Mazurek, "Snake&Apple V: Dyld" — https://karol-mazurek.medium.com/snake-apple-v-dyld-8b36b674cc44
42. antons, "dyld-shared-cache-big-sur" — https://github.com/antons/dyld-shared-cache-big-sur
43. Apple Open Source, "xnu" — https://github.com/apple-oss-distributions/xnu
44. Google Project Zero, "Examining Pointer Authentication on the iPhone XS" — https://googleprojectzero.blogspot.com/2019/02/examining-pointer-authentication-on.html
45. kernel.org, "Pointer authentication in AArch64 Linux" — https://docs.kernel.org/arch/arm64/pointer-authentication.html
46. Connor McGarr, "Exploit Development: Unveiling Windows ARM64 Pointer Authentication (PAC)" — https://connormcgarr.github.io/windows-pac-arm64/
47. NotSoSecure, "Bypassing Jailbreak Detection in iOS" — https://www.notsosecure.com/bypassing-jailbreak-detection-ios
48. Bryce Bostwick, "Debugging An Undebuggable App" — https://bryce.co/undebuggable/
49. TwelveSec, "Bypassing anti-reversing defences in iOS applications" — https://twelvesec.com/2023/10/10/bypassing-anti-reversing-defences-in-ios-applications/
