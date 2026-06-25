# Android Native Library (.so) Reverse Engineering

TL;DR: JNI function naming, dynamic registration (RegisterNatives), ARM32/ARM64
analysis, .so reversing workflow, and native anti-RE protections.

See also: android-frida-dynamic.md, android-security-model.md, android-root-bypass-resources.md, android-traffic-forensics-workflow.md

---
## 9. Native Library (.so) RE

Android apps ship native ARM/ARM64 libraries in `lib/<abi>/`. JNI (Java Native Interface)
maps Java methods to C/C++ functions [21](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/spec/functions.html).

### 9.1 JNI Function Naming Convention

The standard naming pattern for JNI exports:

```
Java_<package>_<class>_<method>
  where dots → underscores, package separators → /
  e.g. com/example/app/NativeLib → Java_com_example_app_NativeLib_getKey

Special characters are mangled:
  _ → _1
  / → _2
  $ → _00024 (Unicode for $)
```

Example disassembly in Ghidra/IDA:

```c
// JNI function signature
JNIEXPORT jstring JNICALL
Java_com_example_app_NativeLib_getKey(JNIEnv *env, jobject thiz) {
    // native key derivation
}

// JNIEnv is a pointer to a function table (JNINativeInterface)
// env->FindClass, env->GetMethodID, env->CallStringMethod, etc.
```

### 9.2 Dynamic Registration (RegisterNatives)

Many apps use `JNI_OnLoad` + `RegisterNatives` to avoid the verbose naming convention:

```c
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    (*vm)->GetEnv(vm, (void**)&env, JNI_VERSION_1_6);

    JNINativeMethod methods[] = {
        {"nativeInit",    "(Landroid/content/Context;)V", (void*)my_native_init},
        {"nativeProcess", "([B)[B",                       (void*)my_native_process},
    };
    jclass clazz = (*env)->FindClass(env, "com/example/app/NativeLib");
    (*env)->RegisterNatives(env, clazz, methods, 2);

    return JNI_VERSION_1_6;
}
```

This breaks the name-based export convention. Finding methods requires:
1. Locating `JNI_OnLoad` (exported function)
2. Tracing the `RegisterNatives` call
3. Matching `JNINativeMethod.name` + `signature` → function pointer

Frida can enumerate dynamically registered methods:

```javascript
// Find all native methods in a class
Java.perform(function() {
    var clazz = Java.use('com.example.app.NativeLib');
    var methods = clazz.class.getDeclaredMethods();
    methods.forEach(function(m) {
        console.log(m.getName() + ' ' + m.toGenericString());
    });
});
```

### 9.3 ARM32 vs ARM64 Analysis

```
ARM32 (armeabi-v7a):
  - Thumb-2 instruction set (2 or 4 byte instructions)
  - 16 registers (r0-r12, sp, lr, pc)
  - Arguments: r0-r3, rest on stack
  - Return: r0 (32-bit), r0-r1 (64-bit)

ARM64 (arm64-v8a):
  - AArch64 fixed 4-byte instructions
  - 31 general-purpose registers (x0-x30)
  - Arguments: x0-x7, rest on stack
  - Return: x0 (64-bit)
  - SP must be 16-byte aligned
```

```bash
# Check architecture of native lib
readelf -h libnative.so | grep Machine
# or
file libnative.so

# List JNI exports
nm -D libnative.so | grep Java_
objdump -T libnative.so | grep Java_

# Dump dynamic registrations (if symbols available)
objdump -t libnative.so | grep -i native

# Disassemble a specific function
arm-linux-androideabi-objdump -d libnative.so \
  --start-address=0x1234 --stop-address=0x1300
```

### 9.4 Reversing .so Workflow

```bash
# 1. Extract native libraries
unzip -j myapp.apk "lib/arm64-v8a/*" -d native_libs/

# 2. Quick triage
file native_libs/*.so
readelf -h native_libs/libnative.so
readelf -d native_libs/libnative.so | grep NEEDED

# 3. List strings (may be obfuscated)
strings native_libs/libnative.so | head -100

# 4. Find JNI functions
nm -D native_libs/libnative.so 2>/dev/null | grep -E "Java_|JNI_"

# 5. Import into Ghidra
# Language: AARCH64 (or ARM32)
# Add libc.so, libm.so, liblog.so, libandroid.so as dependent libraries

# 6. Frida trace native calls
frida-trace -U com.example.app -i "libnative.so!*"
```

### 9.5 Native Anti-RE in .so

Common protections in packed/obfuscated .so:

```
- String obfuscation (XOR every string at runtime)
- JNI function table encryption (decrypt on JNI_OnLoad)
- ptrace anti-debug (PTRACE_TRACEME to prevent debugger attach)
- CRC integrity checks of loaded segments
- /proc/self/status "TracerPid" check
- Linker symbol hiding (strip all exports except JNI_OnLoad)
```
