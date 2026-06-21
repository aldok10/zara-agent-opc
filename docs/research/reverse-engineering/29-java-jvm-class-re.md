# Java/JVM Bytecode & Android DEX Reverse Engineering

> Comprehensive reference for reversing Java class files, JVM bytecode, Android DEX, and native JNI layers. Covers file formats, tooling, obfuscation, deobfuscation, and interop with native code.

---

## Table of Contents

1. [Java .class File Format](#1-java-class-file-format)
2. [Constant Pool](#2-constant-pool)
3. [JVM Opcodes & Instruction Set](#3-jvm-opcodes--instruction-set)
4. [Decompilation Tools](#4-decompilation-tools)
5. [Obfuscation & Deobfuscation](#5-obfuscation--deobfuscation)
6. [Kotlin-Specific Reversing](#6-kotlin-specific-reversing)
7. [JNI Layer Reversing](#7-jni-layer-reversing)
8. [Dynamic Class Loading & Reflection Obfuscation](#8-dynamic-class-loading--reflection-obfuscation)
9. [Android DEX & Dalvik/ART Bytecode](#9-android-dex--dalvikart-bytecode)
10. [Analysis Tooling](#10-analysis-tooling)
11. [References](#11-references)

---

## 1. Java .class File Format

Every `.class` file starts with the magic number `0xCAFEBABE` and follows a rigid structure defined by the JVM specification [1](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html). The file is parsed sequentially from byte 0 using only three primitive types:

| Type | Size | Description |
|------|------|-------------|
| `u1` | 1 byte | Unsigned 8-bit integer |
| `u2` | 2 bytes | Unsigned 16-bit big-endian integer |
| `u4` | 4 bytes | Unsigned 32-bit big-endian integer |

The top-level layout is:

```
ClassFile {
    u4             magic;                // 0xCAFEBABE
    u2             minor_version;
    u2             major_version;        // e.g. 61 = Java 17
    u2             constant_pool_count;
    cp_info        constant_pool[constant_pool_count-1];
    u2             access_flags;
    u2             this_class;
    u2             super_class;
    u2             interfaces_count;
    u2             interfaces[interfaces_count];
    u2             fields_count;
    field_info     fields[fields_count];
    u2             methods_count;
    method_info    methods[methods_count];
    u2             attributes_count;
    attribute_info attributes[attributes_count];
}
```

Major version mapping: 52 = Java 8, 53 = Java 9, 55 = Java 11, 61 = Java 17, 63 = Java 19, 65 = Java 21, 66 = Java 22, 67 = Java 23 [2](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/constantpool/package-summary.html).

Access flags (`u2`) encode class properties: `0x0001` (public), `0x0010` (final), `0x0020` (super), `0x0200` (interface), `0x0400` (abstract), `0x1000` (synthetic), `0x2000` (annotation), `0x4000` (enum) [1](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html).

### Key Attributes

| Attribute | Purpose |
|-----------|---------|
| `Code` | Bytecode instructions, max stack, max locals, exception table |
| `Exceptions` | Checked exceptions a method throws |
| `LineNumberTable` | Line number → bytecode offset mapping (debug) |
| `LocalVariableTable` | Variable name/type → slot mapping (debug) |
| `StackMapTable` | Stack frame verification metadata (Java 6+) |
| `AnnotationDefault` / `RuntimeVisibleAnnotations` | Annotation storage |
| `Signature` | Generic type signatures |
| `BootstrapMethods` | `invokedynamic` call site bootstrap (Java 7+) |
| `NestHost` / `NestMembers` | Nest-based access control (Java 11+) |
| `Record` | Record component metadata (Java 16+) |

---

## 2. Constant Pool

The constant pool is the class file's "central dictionary" [3](https://vectree.io/c/class-file-binary-specification). Every symbolic reference to classes, methods, fields, strings, and numeric constants lives here. Entries are indexed from 1 (index 0 is invalid). Each entry starts with a 1-byte tag.

| Tag | Constant Type | Value Semantics |
|-----|--------------|-----------------|
| 1 | `CONSTANT_Utf8` | UTF-8 encoded string (max 65535 bytes) |
| 3 | `CONSTANT_Integer` | 4-byte signed int |
| 4 | `CONSTANT_Float` | 4-byte IEEE 754 float |
| 5 | `CONSTANT_Long` | 8-byte signed long (takes 2 pool entries) |
| 6 | `CONSTANT_Double` | 8-byte IEEE 754 double (takes 2 pool entries) |
| 7 | `CONSTANT_Class` | Class/interface reference → Utf8 name_index |
| 8 | `CONSTANT_String` | String literal → Utf8 string_index |
| 9 | `CONSTANT_Fieldref` | Field reference → Class + NameAndType |
| 10 | `CONSTANT_Methodref` | Method reference → Class + NameAndType |
| 11 | `CONSTANT_InterfaceMethodref` | Interface method reference |
| 12 | `CONSTANT_NameAndType` | Name + descriptor pair |
| 15 | `CONSTANT_MethodHandle` | Method handle (Java 7+) |
| 16 | `CONSTANT_MethodType` | Method type descriptor (Java 7+) |
| 17 | `CONSTANT_Dynamic` | Dynamic constant (Java 11+) |
| 18 | `CONSTANT_InvokeDynamic` | Bootstrap method + NameAndType |
| 19 | `CONSTANT_Module` | Module reference (Java 9+) |
| 20 | `CONSTANT_Package` | Package reference (Java 9+) |

Reversing strategy: scan all `CONSTANT_Utf8` entries first. These contain every string used in the class: class names (with internal `/` separators), method names, field names, type descriptors, and source file references. They are the single richest source of semantic information in an unobfuscated class [3](https://vectree.io/c/class-file-binary-specification).

### Type Descriptors

| Descriptor | Type |
|-----------|------|
| `B` | byte |
| `C` | char |
| `D` | double |
| `F` | float |
| `I` | int |
| `J` | long |
| `L<classname>;` | object reference |
| `S` | short |
| `Z` | boolean |
| `[` | array (one per dimension) |
| `(argtypes)rettype` | method descriptor |

Example: `(ILjava/lang/String;)V` = method taking `int` and `String`, returning `void`.

---

## 3. JVM Opcodes & Instruction Set

The JVM is a stack-based machine. Each method has a local variable array and an operand stack. Instructions operate on the stack [4](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html).

There are 256 possible opcodes (1 byte each); ~212 are defined, 3 reserved (`0xCA` breakpoint, `0xFE` impdep1, `0xFF` impdep2) [5](https://en.wikipedia.org/wiki/List_of_JVM_bytecode_instructions).

### Category Overview

| Group | Opcodes | Purpose |
|-------|---------|---------|
| Load/Store | `iload`, `lload`, `fload`, `dload`, `aload`, `istore`, `astore`, `ldc` | Move values between locals and stack |
| Arithmetic | `iadd`, `isub`, `imul`, `idiv`, `irem`, `ineg`, `iand`, `ior`, `ixor` | Integer/float/long/double math |
| Stack | `pop`, `pop2`, `dup`, `dup_x1`, `dup2`, `swap` | Manipulate operand stack |
| Conversion | `i2l`, `i2f`, `l2d`, `f2i`, `int2byte` etc. | Type widening/narrowing |
| Comparison | `lcmp`, `fcmpg`, `fcmpl`, `dcmpg`, `dcmpl` | Compare values |
| Control | `ifeq`, `ifne`, `iflt`, `if_icmpeq`, `goto`, `tableswitch`, `lookupswitch` | Branching |
| Reference | `getfield`, `putfield`, `getstatic`, `putstatic`, `new`, `checkcast`, `instanceof` | Object access |
| Invocation | `invokevirtual`, `invokespecial`, `invokestatic`, `invokeinterface`, `invokedynamic` | Method call |
| Return | `ireturn`, `lreturn`, `areturn`, `freturn`, `dreturn`, `return` | Return from method |
| Sync/Exception | `monitorenter`, `monitorexit`, `athrow` | Synchronization, exception throw |

### Invocation Opcodes (Critical for RE)

| Opcode | Dispatch | Target |
|--------|----------|--------|
| `invokevirtual` | Virtual dispatch (vtable) | Instance methods |
| `invokespecial` | Direct dispatch | Constructors, private methods, super |
| `invokestatic` | Static dispatch | Static methods |
| `invokeinterface` | Interface dispatch | Interface methods |
| `invokedynamic` | Bootstrap-dynamic | Lambda bodies, dynamic languages (Java 7+) |

`invokedynamic` is particularly relevant for reversing lambdas and Kotlin inline functions. The bootstrap method table holds `MethodHandle` references that reveal the actual target [4](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html).

### Common Patterns in Bytecode

**String concatenation** (pre-Java 9): `new StringBuilder(); dup; invokespecial StringBuilder.<init>; aload; invokevirtual StringBuilder.append; ...`

**String concatenation** (Java 9+): `invokedynamic makeConcatWithConstants` — harder to trace without reading the bootstrap arguments.

**Try-catch**: A `Code` attribute contains an `exception_table` with `start_pc`, `end_pc`, `handler_pc`, and `catch_type` (null = finally block).

**Switch statements**: `tableswitch` (O(1), dense keys) vs `lookupswitch` (O(log n), sparse). The switch table entries reveal every case constant.

---

## 4. Decompilation Tools

### 4.1 CFR (Class File Reader)

[jar](https://github.com/leibnitz27/cfr) — Most accurate actively-maintained decompiler [6](https://jar.tools/kb/best-java-decompiler). Handles Java 21+ records, sealed classes, switch expressions, text blocks, lambdas.

```
java -jar cfr.jar MyClass.class
java -jar cfr.jar myapp.jar --outputdir decompiled/
```

CFR is the reference decompiler for modern Java. Its output quality for obfuscated code is the benchmark.

### 4.2 Procyon

[jar](https://github.com/mstrobel/procyon) — Good for pre-Java 9 code, handles anonymous classes and generics well. Less actively maintained than CFR. Forms the backend of jadx for Android DEX decompilation [7](https://github.com/mstrobel/procyon).

```
java -jar procyon-decompiler.jar com/example/MyClass.class -o output/
```

### 4.3 jadx

[jar](https://github.com/skylot/jadx) — The standard Android APK/DEX decompiler. Converts DEX → Java source with a GUI (jadx-gui) featuring full-text search, cross-references, and code navigation [8](https://appsecsanta.com/mobile-security-tools/apktool-vs-jadx).

```
jadx -d output_dir app.apk
```

jadx supports ProGuard/R8 mapping files for deobfuscation. Uses a Procyon-derived engine for Java decompilation. Input formats: APK, DEX, JAR, AAR, AAB, class.

### 4.4 JEB Decompiler

[commercial](https://www.pnfsoftware.com/jeb/) — PNF Software's commercial decompiler for both DEX and Java class files. Features a Dalvik deobfuscator that handles control-flow obfuscation that breaks dex2jar [9](https://www.pnfsoftware.com/jeb1/comp). JEB handles anti-decompilation tricks that crash free tools, making it the go-to for heavily protected Android apps.

### 4.5 Recaf

[jar](https://github.com/Col-E/Recaf) — The modern Java bytecode editor with a GUI. Not just a decompiler: it is an interactive bytecode editor with built-in assembler, decompiler integration (CFR, FernFlower), deobfuscation transformers, and process attachment for live instrumentation [10](https://www.coley.software/Recaf).

Key features for reverse engineers:
- Stack/var analysis at any instruction point
- Source snippet → bytecode generation
- Automatic crash-proof class patching
- Deobfuscation transformers for common obfuscators

### 4.6 Bytecode Viewer (BCV)

[jar](https://github.com/Konloch/bytecode-viewer) — Multi-decompiler swiss army knife: CFR, Procyon, FernFlower, JD-GUI, Krakatau, jadx side by side. Includes hex view, plugin system, and obfuscation detection [11](https://www.edopedia.com/blog/best-java-decompilers/).

### 4.7 Tool Comparison

| Tool | Input | Output | Modern Java | Android DEX | GUI | CLI |
|------|-------|--------|-------------|-------------|-----|-----|
| CFR | .class, .jar | Java | Full | No | No | Yes |
| Procyon | .class, .jar | Java | Limited | No | No | Yes |
| jadx | APK, DEX, JAR | Java | Good | Native | Yes | Yes |
| JEB | DEX, .class | Java | Good | Native | Yes | Yes |
| Recaf | .class, .jar | Bytecode/Java | Full | Via DEX | Yes | Yes |
| BCV | .class, .jar, APK | Java | Full | Via jadx | Yes | No |
| IntelliJ/FernFlower | .class | Java | Good | No | Yes | No |

---

## 5. Obfuscation & Deobfuscation

### 5.1 ProGuard / R8

[open source](https://proguard.sourceforge.net/) — Standard Android optimizer+obfuscator. Renames classes/methods/fields to short meaningless identifiers (a, b, c). Strips debug info, inlines short methods, removes dead code [12](https://proguard.sourceforge.net/main.html).

R8 is the Android replacement (faster, Kotlin-aware). Both produce a `mapping.txt` file mapping original → obfuscated names.

**Deobfuscation**: Apply `mapping.txt` via jadx's `--deobf-mapping` flag or Google Play Console's deobfuscation upload [13](https://support.google.com/googleplay/android-developer/answer/9848633). Without the mapping, you rely on behavioral inference (string literals, Android API calls, constant values).

### 5.2 Zelix KlassMaster (ZKM)

[commercial](https://www.zelix.com/klassmaster/) — Heavy-duty Java obfuscator. Offers four major protection layers [14](https://www.zelix.com/klassmaster/featuresZKMScript.html):

1. **Name obfuscation** — meaningless identifiers with configurable exclusion rules
2. **Flow obfuscation** — transforms `if`/`else`/`for`/`while` constructs so they have no direct Java equivalent (control-flow flattening with opaque predicates)
3. **String encryption** — encrypts `ldc` string constants, decrypts at runtime via custom methods
4. **Reference obufscation** — replaces direct references with reflective lookups

**Deobfuscation**: The [java-deobfuscator](https://github.com/java-deobfuscator/deobfuscator) project has ZKM transformers that simplify flow obfuscation patterns and decrypt strings [15](https://javadeobfuscator.com/). Layered ZKM (run obfuscation multiple times) defeats most automated tools.

### 5.3 Stringer

[commercial](https://jfxstore.com/stringer/) — Specializes in string encryption and Java/Android API call hiding. Uses custom class loaders and reflection to disguise API usage. Can encrypt resources and rename with heavy overloading [16](https://jfxstore.com/stringer/docs).

**Deobfuscation**: Usually requires runtime analysis (Frida/Xposed) to dump decrypted strings from in-memory state, followed by static string replacement.

### 5.4 DashO

[commercial](https://www.preemptive.com/products/dasho/) — PreEmptive's multi-layer protector. Patented **Overload Induction** renames as many methods as possible to identical names, making decompiler output impossible to follow. Control-flow obfuscation with opaque predicates and dispatcher-based flattening. String encryption with runtime decryption. Includes tamper detection, debug detection, root/emulator detection, and application watermarking [17](https://en.wikipedia.org/wiki/DashO_(software)).

**Deobfuscation**: Automated tools struggle with Overload Induction (all methods named the same). Approach: focus on behavioral signatures (exception strings, constant patterns, API call sequences) and dynamic tracing rather than static decompilation.

### 5.5 General Obfuscation Techniques

| Technique | How It Works | Deobfuscation Approach |
|-----------|-------------|----------------------|
| Identifier renaming | a, b, c → meaningless | Apply mapping.txt or infer from context |
| String encryption | ldc replaced with decrypt call | Dump decrypted strings at runtime (Frida) |
| Control-flow flattening | Method body → switch dispatcher | Java Deobfuscator transformers, trace-informed synthesis [18](https://dl.acm.org/doi/10.1145/3689789) |
| Opaque predicates | Always-true/false conditionals | Symbolic execution, constant propagation |
| Reflection-based calls | Direct invoke → reflective lookup | Track Method/Field objects, JVMTI hooks |
| Constant hiding | Integer constants XOR/encrypted | Track arithmetic operations on constants |
| Garbage insertion | Dead code, nop sequences | Control-flow graph simplification |
| Class encryption | Entire classes stored encrypted | Dump classes from custom ClassLoader |
| Resource encryption | PNG/XML packed in encrypted blobs | Hook asset manager, dump runtime decryption |

### 5.6 Java Deobfuscator Tool

[open source](https://github.com/java-deobfuscator/deobfuscator) — Supports: ZKM, Stringer, Allatori, DashO, DexGuard, ClassGuard, Smoke, SkidSuite2. Uses a transformer pipeline architecture. Auto-detection via `detect: true` config [15](https://javadeobfuscator.com/).

```
# detect obfuscator
echo "input: input.jar\ndetect: true" > detect.yml
java -jar deobfuscator.jar --config detect.yml

# apply transformers
echo "input: input.jar\noutput: clean.jar\ntransformers:
  - [fully.qualified.Transformer]" > config.yml
java -jar deobfuscator.jar --config config.yml
```

---

## 6. Kotlin-Specific Reversing

Kotlin compiles to JVM bytecode but adds language-specific structures visible in the `.class` file [19](https://kotlinlang.org/docs/metadata-jvm.html).

### 6.1 @Metadata Annotation

Every Kotlin class has a `@Metadata` annotation on the class itself. Inspect with:
```bash
javap -v -p ClassNameKt.class | grep -A 20 "RuntimeVisibleAnnotations"
```

The `@Metadata` annotation stores a `kotlin.Metadata` object with:
- `k` (kind): 1=Class, 2=File, 3=Synthetic, 4=MultiFileClass
- `mv` (metadata version)
- `bv` (bytecode version)
- `d1` / `d2`: Protocol buffer encoded class metadata (functions, properties, type aliases, etc.)

Use the `kotlin-metadata-jvm` library to parse metadata into structured data: class names, function visibilities, property signatures [19](https://kotlinlang.org/docs/metadata-jvm.html).

```kotlin
val metadata = classNode.readMetadataLenient()
if (metadata is KotlinClassMetadata.Class) {
    val kmClass = metadata.kmClass
    println("Class: ${kmClass.name}")
    kmClass.functions.forEach { println("Function: ${it.name}") }
}
```

### 6.2 Null-Safety Implementation

Kotlin null-safety is a **compile-time illusion**. The JVM has no concept of nullable vs non-nullable types [20](https://medium.com/@sivavishnu0705/under-the-hood-how-kotlin-eradicates-nullpointerexceptions-internally).

- Non-nullable parameters: Kotlin inserts `if (param == null) throw NullPointerException()` at the start of methods
- Safe-call operator `?.`: compiled to `dup; ifnonnull` + `invokevirtual` chains
- Elvis operator `?:`: compiled to `dup; ifnonnull` + `pop` over default value
- `!!` operator: explicit null check before every use

When reversing Kotlin bytecode, look for the `$kotlin$` prefix in synthetic methods. The null checks at method entry are a reliable indicator the original code was Kotlin.

### 6.3 Companion Objects

```kotlin
class Foo {
    companion object {
        fun bar() = "baz"
    }
}
```

Compiles to a nested class `Foo$Companion` containing `bar()`. The call `Foo.bar()` becomes `invokestatic Foo$Companion.bar()`. The `@JvmStatic` annotation flattens this into a static method on `Foo` directly.

### 6.4 Inline Functions

Kotlin `inline` functions are copied to every call site at compile-time. This means [21](https://kotlinlang.org/docs/inline-functions.html):

- No separate method exists for the inline function itself
- The function body appears duplicated in each caller's bytecode
- Lambda parameters (`()->Unit`) are inlined as direct code, not as `invokedynamic`/`invokevirtual`
- `reified` type parameters use `instanceof` checks baked into the call site

When reversing: repeated blocks of bytecode across methods are strong evidence of inlined functions. The `CheckNotNullParameter` calls inside these blocks confirm Kotlin origin.

### 6.5 Synthetic Methods

Kotlin generates many synthetic (`ACC_SYNTHETIC`) methods:
- `getXxx()` / `setXxx()` for properties
- `component1()`..`componentN()` for data class destructuring
- `copy()` for data class copy semantics
- `equals()`, `hashCode()`, `toString()` for data classes
- `iterator()` for `for` loop support
- `$serializer()` for `@Serializable` classes

Filter by `ACC_SYNTHETIC` (`0x1000`) in `javap -p` output to identify these.

---

## 7. JNI Layer Reversing

JNI (Java Native Interface) bridges Java bytecode to native code (C/C++ shared libraries: `.so` on Linux/Android, `.dll` on Windows, `.dylib` on macOS). This is where Java RE connects to binary RE [22](https://aprl.pet/writing/reversing-jni-part-1/).

### 7.1 Native Method Declaration

In Java:
```java
public class Crypto {
    public native byte[] encrypt(byte[] data);
}
```

At the bytecode level, the `encrypt` method is marked `ACC_NATIVE` (`0x0100`) and has no `Code` attribute. The method reference in the constant pool points to `Crypto.encrypt:([B)[B`.

### 7.2 Library Loading

Native libraries load via:
```java
System.loadLibrary("crypto");  // -> libcrypto.so / crypto.dll
System.load("/path/to/lib.so");
```

At the JVM level, `System.loadLibrary` calls into `ClassLoader.findLibrary`, which searches `java.library.path`. Each ClassLoader maintains its own library namespace [22](https://aprl.pet/writing/reversing-jni-part-1/).

### 7.3 Method Resolution — Two Paths

**Path 1: Static Resolution (Name Mangling)**

The JVM looks for symbols following the pattern:
```
Java_<mangled package>_<ClassName>_<methodName>
```

Package separators `.` become `_`, and `_` in identifiers become `_1`. For `cat.aprl.meow.native purr()`:
```
Java_cat_aprl_meow_purr(JNIEnv*, jobject)
```

With C++ mangling, the actual symbol may be deformed:
```
_Z15Java_cat_aprl_meow_purrP7_JNIEnvP7_jclass
```

**Path 2: Dynamic Registration (RegisterNatives)**

Used by sophisticated software (transpilers, malware, obfuscation wrappers). The native code explicitly binds Java method names to C function pointers [22](https://aprl.pet/writing/reversing-jni-part-1/):
```c
JNINativeMethod methods[] = {
    {"encrypt", "([B)[B", (void*)&native_encrypt_impl},
    {"decrypt", "([B)[B", (void*)&native_decrypt_impl}
};
(*env)->RegisterNatives(env, clazz, methods, 2);
```

**Reverse engineering approach**: Hook `RegisterNatives` via Frida or JVMTI to dump all JNI bindings at runtime:
```
// Frida: hook RegisterNatives
var RegisterNatives = Module.findExportByName("libart.so", "_ZN3art3JNI17RegisterNativesEP7_JNIEnvP7_jclassPK15JNINativeMethodi");
Interceptor.attach(RegisterNatives, {...});
```

### 7.4 JNIEnv & the Native API

JNI functions are dispatched through the `JNIEnv` pointer (the first parameter). The `JNIEnv` struct holds function pointers [23](https://hacktricks.wiki/en/mobile-pentesting/android-app-pentesting/reversing-native-libraries.html):
- `CallObjectMethod`, `CallVoidMethod` — call back into Java
- `GetStringUTFChars`, `ReleaseStringUTFChars` — string marshaling
- `FindClass` — find Java classes from native code
- `NewStringUTF`, `NewByteArray` — create Java objects
- `GetFieldID`, `GetMethodID` — reflective field/method access
- `GetArrayLength`, `GetByteArrayElements` — array access

When reversing native libraries:
1. Identify JNIEnv access pattern: the function pointer table is at offset 0 from `env`
2. `FindClass` calls reveal which Java classes the native code interacts with
3. `GetMethodID` + `CallVoidMethod` = callbacks into the Java layer
4. String operations (`GetStringUTFChars` + `ReleaseStringUTFChars`) are high-value breakpoint targets

### 7.5 ART Internals (Android Runtime)

On Android ART (replacing Dalvik in Android 5+), the runtime uses `.oat` files (AOT-compiled from DEX). Native libraries sit alongside. The ART runtime stores JNI bindings in `ArtMethod::native_entry_`.

Frida scripts like `hook_RegisterNatives.js` wrap ART's `RegisterNatives` to capture all dynamic JNI registrations, outputting class, method name, signature, and the resolved native function pointer [24](https://deepwiki.com/lasting-yang/frida_hook_libart/7.1-reverse-engineering-native-libraries).

### 7.6 JNI Obfuscation Detection

Signs JNI is used for hiding logic:
- Methods with `ACC_NATIVE` flag and thin Java wrappers
- `System.loadLibrary` calls with non-obvious library names
- `RegisterNatives` called in `JNI_OnLoad` (especially in malware)
- `.so` files in APK with many exported `Java_*` symbols
- `InvokeMethod` / `CallStaticMethod` used in native code for reflection

### 7.7 Reverse Engineering JNI Libraries

Workflow for `.so` reversing [23](https://hacktricks.wiki/en/mobile-pentesting/android-app-pentesting/reversing-native-libraries.html):

```bash
# 1. Extract from device or APK
adb shell "run-as <pkg> cat lib/arm64-v8a/libfoo.so" > libfoo.so

# 2. Identify JNI bindings
readelf -s libfoo.so | grep 'Java_'         # static resolution
strings libfoo.so | grep "RegisterNatives"   # dynamic registration

# 3. Disassemble (Ghidra, IDA, Binary Ninja, or objdump)
arm-linux-androideabi-objdump -d libfoo.so > disasm.txt

# 4. Runtime hooking (Frida)
frida -U com.target.app -l hook_art.js
```

---

## 8. Dynamic Class Loading & Reflection Obfuscation

### 8.1 Dynamic Class Loading

Java can load classes at runtime via `Class.forName()` or `URLClassLoader` [25](https://en.wikibooks.org/wiki/Java_Programming/Reflection/Dynamic_Class_Loading):

```java
Class<?> clazz = Class.forName("com.example.HiddenClass");
Method method = clazz.getMethod("hiddenMethod");
method.invoke(null);
```

In bytecode, this appears as:
```
ldc "com.example.HiddenClass"
invokestatic java/lang/Class.forName(String) -> Class
```

The class name string may be obfuscated (built from concatenated substrings, XOR'd constants, or loaded from encrypted resources).

**Reverse engineering approach**:
- Track all `Class.forName()` calls
- Look for string reconstruction logic nearby
- Use JVMTI `ClassLoad` / `ClassPrepare` events to capture loaded classes
- Frida: hook `ClassLoader.loadClass` to dump all dynamically loaded classes

### 8.2 Reflection Obfuscation

Common patterns:
- Method names as strings: `getMethod("a" + "b")`
- Encrypted method descriptors decrypted at call time
- Reflection wrappers that hide the actual target method
- `MethodHandles` and `VarHandle` (Java 9+) for lower-level access

Example obfuscated reflection:
```java
String m = decrypt(hiddenString);  // method name from encrypted data
Method meth = clazz.getDeclaredMethod(m, new Class[]{String.class});
Object result = meth.invoke(instance, arg);
```

The `hiddenString` decryption function must be analyzed (or dumped at runtime) to recover the method name.

**Deobfuscation strategies**:
- **Static**: Connect string decryption to decrypted usage, propagate constants
- **Dynamic**: Frida/Xposed hook `java.lang.reflect.Method.invoke()` and dump (target, args)
- **Hybrid**: Run the app with JVMTI agent to log all reflective calls

### 8.3 Custom ClassLoaders

Obfuscators sometimes use custom ClassLoaders to load encrypted classes:
```java
class EncryptedClassLoader extends ClassLoader {
    protected Class<?> findClass(String name) {
        byte[] encrypted = readEncryptedClassFile(name);
        byte[] decrypted = decrypt(encrypted);
        return defineClass(name, decrypted, 0, decrypted.length);
    }
}
```

The decrypt/load pipeline is opaque statically. To extract the actual classes, hook `ClassLoader.defineClass()` or attach a debugger at the `defineClass` call and dump the `byte[]` parameter.

---

## 9. Android DEX & Dalvik/ART Bytecode

### 9.1 DEX File Structure

Android apps compile Java bytecode into `.dex` (Dalvik Executable) format. Unlike `.class` files (one class per file), a single `classes.dex` contains all classes in the APK, with shared constant pools across classes — this is the key optimization [26](https://source.android.com/docs/core/runtime/dex-format).

```
DEX Header (0x70 bytes)
  - magic: "dex\n035\0" (version 035 = DEX format)
  - checksum: adler32
  - signature: SHA-1
  - file_size, header_size
  - endian_tag: 0x12345678 (little endian)
  - link, map offsets
  - string_ids, type_ids, proto_ids, field_ids, method_ids, class_defs offsets/sizes
  - data_size, data_offset

String IDs → string_data_item[]
Type IDs → string_id indices (Lcom/foo/Bar;)
Proto IDs → shorty + return_type + params
Field IDs → class_idx + type_idx + name_idx
Method IDs → class_idx + proto_idx + name_idx
Class Defs → class_idx + access_flags + superclass + interfaces + annotations + data

Class Data → static_fields + instance_fields + direct_methods + virtual_methods
  Each method: method_idx + access_flags + code_offset
  Code: registers + ins/outs + try_catch + instructions[]
```

### 9.2 Dalvik vs JVM Bytecode

| Characteristic | JVM | Dalvik/ART |
|---------------|-----|------------|
| Architecture | Stack-based | Register-based |
| Instruction count | ~212 | ~237 |
| Instruction size | 1 byte opcode + operands | 16 bits (variable format) |
| Register naming | Local variable slots | v0..v65535 (typed names in smali) |
| Each class file | Single class | Single class |
| DEX file | N/A | Multiple classes, shared pool |
| Landing format | .class | .dex / .odex / .oat (ART) |

### 9.3 Dalvik Opcode Families

Dalvik opcodes are grouped by format and operation [27](https://source.android.com/docs/core/runtime/dalvik-bytecode):

| Format | Example | Description |
|--------|---------|-------------|
| 1x | `nop` | No operands |
| 2x | `move vA, vB` | Two 4-bit register refs |
| 3x | `add-int vA, vB, vC` | Three 4-bit registers |
| 3r | `add-int/2addr vA, vB` | Two registers, specific op |
| 22x | `move/from16 vAA, vBBBB` | 8-bit + 16-bit registers |
| 21c | `const-string vAA, string@BBBB` | Register + constant pool index |
| 35c | `invoke-virtual {vC..vN}, meth@BBBB` | Method call with registers |
| 3rc | `invoke-virtual/range {vCCCC..vNNNN}, meth@BBBB` | Method call (range) |
| 11x | `return-void` | Void return |
| 10t | `goto +AA` | Unconditional branch |

### 9.4 Key Dalvik Instructions

| Mnemonic | Op (hex) | Operation |
|----------|----------|-----------|
| `move vA, vB` | 0x01 | Copy register B to A |
| `const/4 vA, #+B` | 0x12 | Load 4-bit signed literal |
| `const-string vAA, string@BBBB` | 0x1a | Load string from pool |
| `const-class vAA, type@BBBB` | 0x1c | Load Class object |
| `new-instance vAA, type@BBBB` | 0x22 | Create new object |
| `iput-object vA, vB, field@CCCC` | 0x5c | Set instance field |
| `sget-object vAA, field@BBBB` | 0x62 | Get static field |
| `invoke-virtual {vC..vN}, meth@BBBB` | 0x6e | Virtual method call |
| `invoke-super {vC..vN}, meth@BBBB` | 0x6f | Super method call |
| `invoke-direct {vC..vN}, meth@BBBB` | 0x70 | Direct (constructor/private) |
| `invoke-static {vC..vN}, meth@BBBB` | 0x71 | Static method call |
| `invoke-interface {vC..vN}, meth@BBBB` | 0x72 | Interface method call |
| `if-eq vA, vB, :label` | 0x32 | Branch if equal |
| `if-nez vA, :label` | 0x38 | Branch if not zero |
| `goto +AA` | 0x28 | Unconditional jump |
| `return-object vAA` | 0x11 | Return object reference |
| `throw vAA` | 0x27 | Throw exception |

### 9.5 Smali/Baksmali

[open source](https://github.com/JesusFreke/smali) — Assembler/disassembler for DEX. Smali is the human-readable representation of Dalvik bytecode [28](https://luoxinjie.github.io/android/AwesomeAndroidReverseEngineeringToolsMD/).

```smali
.class public Lcom/example/Hello;
.super Ljava/lang/Object;

.method public static main([Ljava/lang/String;)V
    .registers 3
    .param p0, "args"

    sget-object v0, Ljava/lang/System;->out:Ljava/io/PrintStream;
    const-string v1, "Hello World"
    invoke-virtual {v0, v1}, Ljava/io/PrintStream;->println(Ljava/lang/String;)V
    return-void
.end method
```

**Key smali concepts**:
- `p0..pn`: parameter registers (p0 = `this` for instance methods)
- `v0..vn`: local variable registers
- `invoke-*` instructions: method calls
- `.line` directives: line number mapping
- `.prologue`: start of method code

### 9.6 DEX to JAR Translation

Tools like `dex2jar` and `enjarify` translate DEX bytecode to JVM `.class` format [28](https://luoxinjie.github.io/android/AwesomeAndroidReverseEngineeringToolsMD/). This is lossy — DEX's register-based model maps imperfectly to JVM's stack model, and some metadata is lost. Obfuscated code specifically exploits this to crash converters.

```
dex2jar app.apk -o app.jar
enjarify app.apk -o app.jar
```

The recommended workflow for Android reversing:
1. **jadx-gui** for fast comprehension (DEX → Java, with search/navigation)
2. **apktool** for resource decoding + smali patching (decode → modify → rebuild)
3. **Frida** for dynamic analysis of both Java and native layers
4. **Ghidra/IDA** for `.so` native library reversing

### 9.7 APK Tooling Pipeline

```bash
# Full static analysis with jadx
jadx -d decompiled/ --deobf --show-bad-code app.apk

# Smali disassembly + resource decoding
apktool d app.apk -o decoded/

# Modify smali, then rebuild
apktool b decoded/ -o modified.apk
jarsigner -keystore my.keystore modified.apk alias

# Dynamic analysis with Frida
frida -U com.target.app -l script.js
```

---

## 10. Analysis Tooling

### 10.1 javap (JDK Disassembler)

The built-in JDK class file disassembler. Essential first tool [2](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/constantpool/package-summary.html).

```bash
javap -v -p -c -constants MyClass.class
# -v  : verbose (constant pool, stack frames, line tables)
# -p  : show private members
# -c  : show bytecode
# -constants : show static final values

javap -v -p -c MyClass.class 2>&1 | head -100
```

### 10.2 jdeps (Dependency Analyzer)

JDK tool for class-level dependency analysis [29](https://docs.oracle.com/en/java/javase/11/tools/jdeps.html).

```bash
# Package-level dependencies
jdeps myapp.jar

# Class-level verbose deps
jdeps -verbose:class myapp.jar

# Find JDK internal API usage
jdeps --jdk-internals myapp.jar

# Generate DOT graph
jdeps -dotoutput deps/ myapp.jar

# Reverse dependency search
jdeps --inverse --package com.example.api myapp.jar
```

jdeps is invaluable for understanding an unknown JAR's structure: it shows which classes depend on which, revealing architectural layering and entry points. Use `-recursive` to transitively resolve all dependencies.

### 10.3 ASM Framework

[open source](https://asm.ow2.io/) — Low-level bytecode manipulation and analysis library. Foundation of many RE tools (Recaf, Bytecode Viewer, Gradle, Cobertura, Jacoco) [30](https://asm.ow2.io/).

Key components:
- `ClassReader`: Parse existing class files
- `ClassWriter`: Generate/emit class files
- `ClassVisitor` / `MethodVisitor`: Visitor pattern for reading/writing
- `Tree API` (`ClassNode`, `MethodNode`): Object model for analysis
- `Analyzer` / `Frame`: Stack frame simulation

```java
// Read and analyze a class
ClassReader cr = new ClassReader("com.example.MyClass");
ClassNode cn = new ClassNode();
cr.accept(cn, 0);

// Iterate methods
for (MethodNode mn : cn.methods) {
    System.out.println("Method: " + mn.name + mn.desc);
    // Iterate instructions
    for (AbstractInsnNode insn : mn.instructions) {
        if (insn.getOpcode() == Opcodes.INVOKEVIRTUAL) {
            MethodInsnNode min = (MethodInsnNode) insn;
            System.out.println("  calls: " + min.owner + "." + min.name);
        }
    }
}
```

ASM is the programmatic foundation for building custom deobfuscators, instrumenting code, or extracting call graphs.

### 10.4 JITWatch

[open source](https://github.com/AdoptOpenJDK/jitwatch) — Log analyzer and visualizer for the HotSpot JIT compiler [31](https://github.com/AdoptOpenJDK/jitwatch).

How to use:
```bash
# Run Java with JIT logging
java -XX:+UnlockDiagnosticVMOptions \
     -XX:+LogCompilation \
     -XX:+TraceClassLoading \
     -jar myapp.jar

# Open JITWatch UI, load hotspot.log
# TriView: source | bytecode | assembly side by side
```

JITWatch reveals:
- **Inlining decisions**: which methods got inlined (and why not)
- **Intrinsification**: native C++ implementation substituted for Java methods
- **Escape analysis**: stack vs heap allocation results
- **Hot methods**: JIT compilation frequency and timing
- **Deoptimization points**: where the JIT gave up

For reverse engineering, JITWatch helps understand which code paths are performance-critical and how the JVM optimizes the targeted code.

### 10.5 dexdump (Android SDK)

Built-in DEX dumper in Android SDK [26](https://source.android.com/docs/core/runtime/dex-format):
```bash
dexdump -d classes.dex
# -d : disassemble bytecode
# -f : dump file layout
```

---

## 11. References

1. [JVM Specification: Class File Format](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html)
2. [Java SE Constant Pool API (Java 25)](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/classfile/constantpool/package-summary.html)
3. [Class File Binary Specification — Vectree](https://vectree.io/c/class-file-binary-specification)
4. [JVM Instruction Set (Chapter 6, JVMS SE7)](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html)
5. [List of JVM Bytecode Instructions — Wikipedia](https://en.wikipedia.org/wiki/List_of_JVM_bytecode_instructions)
6. [Best Java Decompiler Tools 2026 — Jar Tools](https://jar.tools/kb/best-java-decompiler)
7. [Procyon Java Decompiler — GitHub](https://github.com/mstrobel/procyon)
8. [Apktool vs jadx — AppSec Santa](https://appsecsanta.com/mobile-security-tools/apktool-vs-jadx)
9. [JEB Decompiler Output Comparison — PNF Software](https://www.pnfsoftware.com/jeb1/comp)
10. [Recaf: The Modern Java Bytecode Editor](https://github.com/Col-E/Recaf)
11. [23 Best Java Decompilers 2026 — Edopedia](https://www.edopedia.com/blog/best-java-decompilers/)
12. [ProGuard — Guardsquare](https://proguard.sourceforge.net/main.html)
13. [Deobfuscate Crash Stack Traces — Google Play Help](https://support.google.com/googleplay/android-developer/answer/9848633)
14. [ZKM Script Language — Zelix KlassMaster](https://www.zelix.com/klassmaster/featuresZKMScript.html)
15. [Java Deobfuscator — GitHub](https://github.com/java-deobfuscator/deobfuscator)
16. [Stringer Java Obfuscator — Licel](https://jfxstore.com/stringer/docs)
17. [DashO — Wikipedia](https://en.wikipedia.org/wiki/DashO_(software))
18. [Control-Flow Deobfuscation using Trace-Informed Synthesis — ACM](https://dl.acm.org/doi/10.1145/3689789)
19. [Kotlin Metadata JVM Library — Kotlin Docs](https://kotlinlang.org/docs/metadata-jvm.html)
20. [How Kotlin Achieves Null Safety Internally — Medium](https://medium.com/@sivavishnu0705/under-the-hood-how-kotlin-eradicates-nullpointerexceptions-internally)
21. [Inline Functions — Kotlin Docs](https://kotlinlang.org/docs/inline-functions.html)
22. [Reversing JNI: Part 1 — aprl.pet](https://aprl.pet/writing/reversing-jni-part-1/)
23. [Reversing Native Libraries — HackTricks](https://hacktricks.wiki/en/mobile-pentesting/android-app-pentesting/reversing-native-libraries.html)
24. [Reverse Engineering Native Libraries — Frida hook_libart](https://deepwiki.com/lasting-yang/frida_hook_libart/7.1-reverse-engineering-native-libraries)
25. [Dynamic Class Loading — Wikibooks](https://en.wikibooks.org/wiki/Java_Programming/Reflection/Dynamic_Class_Loading)
26. [DEX Format — Android Source](https://source.android.com/docs/core/runtime/dex-format)
27. [Dalvik Bytecode — Android Source](https://source.android.com/docs/core/runtime/dalvik-bytecode)
28. [Awesome Android Reverse Engineering Tools — GitHub](https://luoxinjie.github.io/android/AwesomeAndroidReverseEngineeringToolsMD/)
29. [jdeps Tool — Oracle JDK Docs](https://docs.oracle.com/en/java/javase/11/tools/jdeps.html)
30. [ASM Bytecode Framework — OW2](https://asm.ow2.io/)
31. [JITWatch — AdoptOpenJDK](https://github.com/AdoptOpenJDK/jitwatch)
