# Java/JVM & Android DEX Reverse Engineering

TL;DR: Java .class files start with 0xCAFEBABE, use a stack-based VM with ~212 opcodes. Android DEX is register-based. Decompilation quality is high (CFR, jadx). Obfuscation ranges from trivial renaming (ProGuard) to hard VM-based protection (Jscrambler). JNI bridges to native code via RegisterNatives or Java_* symbols.

---

## .class File Structure

```
magic: 0xCAFEBABE
major_version: 52=Java8, 55=Java11, 61=Java17, 65=Java21
constant_pool[count-1]
access_flags, this_class, super_class
interfaces[], fields[], methods[], attributes[]
```

### Key Attributes

| Attribute | Purpose |
|-----------|---------|
| `Code` | Bytecode, max stack/locals, exception table |
| `StackMapTable` | Frame verification (Java 6+) |
| `BootstrapMethods` | `invokedynamic` targets (Java 7+) |
| `LineNumberTable` | Debug: line -> offset |
| `LocalVariableTable` | Debug: var name/type -> slot |

---

## Constant Pool

All symbolic references live here. Scan `CONSTANT_Utf8` entries for class/method/field names, descriptors, strings.

### Type Descriptors

| Descriptor | Type |
|-----------|------|
| `I` | int |
| `J` | long |
| `Ljava/lang/String;` | String object |
| `[B` | byte array |
| `(ILjava/lang/String;)V` | method(int, String) -> void |

---

## Invocation Opcodes

| Opcode | Dispatch | Target |
|--------|----------|--------|
| `invokevirtual` | Virtual (vtable) | Instance methods |
| `invokespecial` | Direct | Constructors, private, super |
| `invokestatic` | Static | Static methods |
| `invokeinterface` | Interface dispatch | Interface methods |
| `invokedynamic` | Bootstrap-dynamic | Lambdas, dynamic languages |

---

## Decompilation Tools

| Tool | Best For | Notes |
|------|----------|-------|
| CFR | Modern Java (21+) | Most accurate, CLI |
| jadx | Android APK/DEX | GUI with search/xrefs |
| JEB | Heavily protected Android | Commercial, handles anti-decompilation |
| Recaf | Interactive editing | Bytecode editor + decompiler |
| Procyon | Pre-Java 9 | Good generics/anonymous handling |

```bash
java -jar cfr.jar MyClass.class
jadx -d output_dir app.apk
```

---

## Obfuscation & Deobfuscation

| Obfuscator | Techniques | Reversibility |
|------------|-----------|---------------|
| ProGuard/R8 | Rename (a,b,c), strip debug, dead code | Easy with mapping.txt |
| Zelix KlassMaster | Flow flatten, string encrypt, reference obfusc | Medium (java-deobfuscator) |
| Stringer | String encrypt, reflection hiding | Runtime dump needed |
| DashO | Overload Induction, flow flatten, tamper detect | Hard |

### Deobfuscation Tool

```bash
# Detect obfuscator
echo "input: input.jar\ndetect: true" > detect.yml
java -jar deobfuscator.jar --config detect.yml

# Apply transformers
java -jar deobfuscator.jar --config config.yml
```

### String Decryption Strategy

1. Static: trace decryption function, propagate constants
2. Dynamic: Frida/Xposed hook decrypt methods, dump results
3. Hybrid: JVMTI agent to log all reflective calls

---

## Kotlin-Specific

### Identification

- `@Metadata` annotation on every class (k=1:Class, k=2:File)
- Null checks at method entry: `if (param == null) throw NPE`
- `$Companion` nested classes
- `ACC_SYNTHETIC` methods: getters, setters, componentN(), copy()

### Inline Functions

No separate method exists. Body duplicated at each call site. `CheckNotNullParameter` calls confirm Kotlin origin.

---

## JNI Layer

### Resolution Paths

**Static**: `Java_<package>_<Class>_<method>(JNIEnv*, jobject)`

**Dynamic (RegisterNatives)**:
```c
JNINativeMethod methods[] = {
    {"encrypt", "([B)[B", (void*)&native_impl},
};
(*env)->RegisterNatives(env, clazz, methods, count);
```

### RE Workflow

```bash
readelf -s libfoo.so | grep 'Java_'          # static bindings
strings libfoo.so | grep "RegisterNatives"   # dynamic registration
# Hook RegisterNatives with Frida to dump all bindings
```

### JNIEnv Key Functions

| Function | Purpose |
|----------|---------|
| `FindClass` | Locate Java class from native |
| `GetMethodID` + `CallVoidMethod` | Callback into Java |
| `GetStringUTFChars` | String marshaling |
| `GetByteArrayElements` | Array access |

---

## Android DEX

### DEX vs JVM

| Aspect | JVM | Dalvik/ART |
|--------|-----|------------|
| Architecture | Stack-based | Register-based |
| File | One class per .class | All classes in .dex |
| Constant pool | Per-class | Shared across classes |

### Key Dalvik Instructions

| Mnemonic | Op |
|----------|------|
| `invoke-virtual {regs}, method` | 0x6e |
| `invoke-static {regs}, method` | 0x71 |
| `const-string vAA, string@BBBB` | 0x1a |
| `new-instance vAA, type@BBBB` | 0x22 |
| `if-eqz vA, :label` | 0x38 |

### APK Analysis Pipeline

```bash
jadx -d decompiled/ --deobf --show-bad-code app.apk   # static
apktool d app.apk -o decoded/                          # smali + resources
frida -U com.target.app -l script.js                   # dynamic
```

---

## Dynamic Class Loading Detection

```java
Class.forName("com.example.Hidden")  // look for ldc + invokestatic
```

Hook `ClassLoader.defineClass()` to dump encrypted classes at load time.

---

## Analysis Tooling

| Tool | Purpose |
|------|---------|
| `javap -v -p -c` | Built-in disassembler |
| `jdeps` | Class dependency analysis |
| ASM Framework | Programmatic bytecode analysis |
| JITWatch | JIT compilation visualization |
| `dexdump -d` | DEX bytecode dump |
| smali/baksmali | DEX assembler/disassembler |
