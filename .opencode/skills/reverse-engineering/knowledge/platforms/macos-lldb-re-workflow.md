# macOS/iOS lldb-based Reverse Engineering Workflow

TL;DR: LLDB commands for RE on Apple platforms: attach/launch, breakpoints (symbolic,
address, conditional, hardware), register/memory inspection, disassembly, ObjC runtime
introspection via `po`, expression evaluation, stepping, image/module inspection,
Python script bridging, and remote iOS debugging.

See also: macos-fairplay-app-analysis.md, macos-kernel-antire-dtrace.md, macos-objc-runtime.md, macos-swift-runtime-abi.md

---

## 9. lldb-based RE Workflow

LLDB is the native debugger on Apple platforms. Essential for dynamic RE,
especially for decrypting binaries, inspecting ObjC/Swift runtime state, and
tracing execution [39][40].

### 9.1 Basic Commands

```lldb
# Attach to a running process
(lldb) process attach --name "AppName"
(lldb) process attach --pid 1234

# Launch a process
(lldb) process launch -- /path/to/binary arg1 arg2

# Execute a binary and stop at entry point
(lldb) target create /path/to/binary
(lldb) process launch --stop-at-entry

# Detach without killing
(lldb) process detach
```

### 9.2 Breakpoints

```lldb
# Set breakpoint on a function name
(lldb) breakpoint set --name "-[UIViewController viewDidLoad]"

# Set breakpoint on a C function
(lldb) breakpoint set --name objc_msgSend

# Set breakpoint on all methods of a class
(lldb) breakpoint set --name "-[MyClass *]"

# Set breakpoint at an address
(lldb) breakpoint set --address 0x1000072c0

# Set hardware breakpoint
(lldb) breakpoint set --address 0x1000072c0 --hardware

# Set breakpoint on a library
(lldb) breakpoint set --name viewDidLoad --shlib AppName

# Conditional breakpoint
(lldb) breakpoint set --name "-[LoginViewController login:]" --condition "$arg1 != nil"

# One-shot breakpoint (breaks once, auto-deletes)
(lldb) breakpoint set --name "func" --one-shot

# Break on all objc_msgSend calls for a specific selector
(lldb) breakpoint set --name _objc_msgSend --selector "loginWithUsername:password:"
```

### 9.3 Register and Memory Inspection

```lldb
# Read all registers
(lldb) register read

# Read specific register
(lldb) register read x0 x1 x2

# Read ARM64 general + SIMD registers
(lldb) register read --all

# Read memory at an address
(lldb) memory read 0x100007000

# Read N bytes in a format
(lldb) memory read --count 32 0x100007000

# Read as specific type
(lldb) memory read --type "int *" 0x100007000

# Read string
(lldb) memory read --format string 0x100007000

# Find what address a pointer points to
(lldb) memory read $x0

# Write memory (careful!)
(lldb) memory write 0x100007000 0x9090
```

### 9.4 Disassembly

```lldb
# Disassemble current function
(lldb) disassemble --frame

# Disassemble at a specific address
(lldb) disassemble --start-address 0x100007000 --end-address 0x100007100

# Disassemble a named function
(lldb) disassemble --name "-[ViewController viewDidLoad]"

# Disassemble with raw bytes
(lldb) disassemble --bytes

# Mixed source + assembly
(lldb) disassemble --mixed

# Disassemble ARM64 with breakpoint addresses shown
(lldb) disassemble --frame --show-bp
```

### 9.5 Objective-C Runtime Inspection with `po`

```lldb
# Print object description
(lldb) po $x0

# Print an object's class
(lldb) po [$x0 class]

# Print all properties
(lldb) po [$x0 valueForKey:@"propertyName"]

# Print method return value
(lldb) po [$x0 methodName]

# Call a method with arguments
(lldb) po [$x0 doSomethingWithString:@"test"]

# Print selector
(lldb) po (SEL)$x1
(lldb) po (const char *)$x1

# Print raw pointer as string
(lldb) p (char *)$x2

# Evaluate ObjC expression
(lldb) expr -l objc -O -- [UIApplication sharedApplication]

# Evaluate Swift expression
(lldb) expr -l swift -O -- UIApplication.shared
```

### 9.6 Expression Evaluation

```lldb
# Evaluate C expression
(lldb) expression (int)printf("hello\n")

# Call a function
(lldb) expression -- myFunction(42)

# Modify a register value
(lldb) expression $x0 = 0x0

# Modify memory
(lldb) expression *(int *)0x100007000 = 0x41414141

# Create a local variable
(lldb) expression id $obj = (id)0x12345678

# Evaluate with debug info suppressed (faster)
(lldb) expression --ignore-breakpoints -- myFunc()
```

### 9.7 Stepping and Navigation

```lldb
# Step into (next instruction)
(lldb) thread step-in
(lldb) si

# Step over (next instruction, skip calls)
(lldb) thread step-over
(lldb) ni

# Step out (return from current frame)
(lldb) thread step-out
(lldb) fin

# Continue execution
(lldb) continue
(lldb) c

# Run until line/address
(lldb) thread until 0x100007200
```

### 9.8 Image / Module Inspection

```lldb
# List loaded modules
(lldb) image list

# Find the load address of a specific module
(lldb) image list -o -f AppName

# Look up a symbol
(lldb) image lookup -n objc_msgSend

# Look up an address
(lldb) image lookup -a 0x100007000

# Find all ObjC methods matching a pattern
(lldb) image lookup -rn "viewDidLoad"

# Find ObjC class data
(lldb) image lookup -t "ViewController"
```

### 9.9 Script Bridging (Python/SB API)

LLDB's Python scripting bridge allows automated RE workflows [39]:

```python
# lldb_script.py
import lldb

debugger = lldb.SBDebugger.Create()
target = debugger.CreateTarget("/path/to/binary")
process = target.LaunchSimple(None, None, None)
breakpoint = target.BreakpointCreateByName("objc_msgSend")
```

Run from lldb:
```lldb
(lldb) command script import /path/to/lldb_script.py
```

### 9.10 Remote Debugging (iOS Device)

```bash
# On device (must be jailbroken or debugged via Xcode):
# Start debugserver (ships with Xcode)
debugserver *:12345 -a "AppName"

# On host:
lldb
(lldb) platform select remote-ios
(lldb) process connect connect://<device_ip>:12345
(lldb) po [$x0 class]
```
