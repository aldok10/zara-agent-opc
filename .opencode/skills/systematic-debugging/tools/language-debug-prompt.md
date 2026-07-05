# Language-Specific Debugger Workflow Prompt

You are helping set up and use language-specific debugging tools effectively for a given problem.

## Input

**Language/Runtime:** {{python | node | go | rust | c_cpp | java | browser_js}}
**Problem type:** {{crash | hang | memory_leak | logic_error | performance | race_condition}}
**Environment:** {{local | container | remote | production}}
**IDE:** {{vscode | intellij | terminal | vim | none}}

## Debugger Reference by Language

### Python (pdb / debugpy)

```python
# Inline breakpoint
breakpoint()  # or: import pdb; pdb.set_trace()

# Launch with debugger
python -m pdb script.py

# Remote debugging (debugpy)
import debugpy
debugpy.listen(("0.0.0.0", 5678))
debugpy.wait_for_client()
```

**Key commands:**
| Command | Action |
|---------|--------|
| `n` | Next line (step over) |
| `s` | Step into function |
| `c` | Continue to next breakpoint |
| `r` | Return from current function |
| `p expr` | Print expression |
| `pp obj` | Pretty-print object |
| `l` | List source around current line |
| `w` | Print stack trace |
| `u` / `d` | Move up/down stack frame |
| `b file:line` | Set breakpoint |
| `condition N expr` | Conditional breakpoint |

**Advanced:**
```python
# Post-mortem (after crash)
python -m pdb -c continue script.py  # breaks at crash

# Conditional breakpoint
import pdb; pdb.set_trace() if condition else None

# Watch variables (custom)
class Watcher:
    def __init__(self, obj, attr):
        self._obj = obj
        self._attr = attr
    def __repr__(self):
        return f"{self._attr} = {getattr(self._obj, self._attr)}"
```

### Node.js (Inspector / Chrome DevTools)

```bash
# Built-in inspector
node --inspect script.js          # attach later
node --inspect-brk script.js      # break on first line

# Chrome DevTools: open chrome://inspect

# VS Code: launch.json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/src/index.js",
  "skipFiles": ["<node_internals>/**"]
}
```

**Key features:**
- Conditional breakpoints: right-click in Chrome DevTools gutter
- Logpoints: `console.log` without modifying code
- Heap snapshots: Memory tab in DevTools
- CPU profiling: Performance tab or `--prof` flag
- Async stack traces: enabled by default in modern Node

```javascript
// Programmatic breakpoint
debugger;

// Debug specific module
NODE_DEBUG=http,net node script.js
```

### Go (Delve)

```bash
# Start debugging
dlv debug ./cmd/server

# Attach to running process
dlv attach <pid>

# Debug test
dlv test ./pkg/handler -- -test.run TestSpecific
```

**Key commands:**
| Command | Action |
|---------|--------|
| `break main.go:42` | Set breakpoint |
| `continue` | Run to breakpoint |
| `next` | Step over |
| `step` | Step into |
| `stepout` | Step out of function |
| `print var` | Print variable |
| `locals` | Show local variables |
| `goroutines` | List all goroutines |
| `goroutine N` | Switch to goroutine N |
| `stack` | Print stack trace |
| `condition N expr` | Conditional breakpoint |

**Race condition detection:**
```bash
go run -race ./cmd/server
go test -race ./...
```

### C/C++ (GDB / LLDB)

```bash
# GDB
gcc -g -O0 program.c -o program
gdb ./program

# LLDB (macOS default)
clang -g -O0 program.c -o program
lldb ./program
```

**GDB commands:**
| Command | Action |
|---------|--------|
| `run` | Start program |
| `break file.c:42` | Set breakpoint |
| `next` / `step` | Step over / into |
| `print var` | Print variable |
| `bt` | Backtrace |
| `frame N` | Select stack frame |
| `watch var` | Hardware watchpoint (break on write) |
| `info threads` | List threads |
| `thread N` | Switch thread |
| `x/10xw addr` | Examine memory |

**LLDB equivalents:**
| GDB | LLDB |
|-----|------|
| `break` | `breakpoint set` or `b` |
| `print` | `expression` or `p` |
| `bt` | `thread backtrace` or `bt` |
| `info locals` | `frame variable` |
| `watch` | `watchpoint set variable` |

### Browser JavaScript (Chrome DevTools)

```
Sources panel:
- Set breakpoints by clicking line numbers
- Conditional breakpoints: right-click line number
- XHR breakpoints: pause on specific URL patterns
- DOM breakpoints: break on subtree/attribute/removal
- Event listener breakpoints: break on specific events

Console utilities:
- $0: currently selected element
- monitor(fn): log every call to fn
- monitorEvents(el, 'click'): log events
- getEventListeners(el): show all listeners
- debug(fn): break when fn is called
```

**Performance debugging:**
```javascript
// Measure specific operation
console.time('operation');
// ... code ...
console.timeEnd('operation');

// CPU profile in code
console.profile('name');
// ... code ...
console.profileEnd('name');
```

## Debugging Workflows by Problem Type

### Crash / Exception
1. Get stack trace (post-mortem if needed)
2. Set breakpoint at crash site
3. Inspect variables at crash point
4. Walk up the stack to find bad input source
5. Add conditional breakpoint to catch the failing condition

### Hang / Deadlock
1. Attach to running process
2. Get all thread/goroutine stacks
3. Identify which threads are blocked and on what
4. Look for lock ordering issues or resource starvation
5. Check for infinite loops (break and inspect PC)

### Memory Leak
1. Take heap snapshot at baseline
2. Perform suspected leaking operation N times
3. Take second snapshot, compare
4. Identify retained objects that should be freed
5. Trace back to the retaining reference

### Logic Error
1. Identify the first point where output diverges from expected
2. Set breakpoint before divergence
3. Step through, comparing actual vs expected at each step
4. Narrow to the exact statement that produces wrong result
5. Examine all inputs to that statement

## Output Format

```
## Debugger Setup
- Tool: [debugger name]
- Launch command: [command]
- Configuration: [any config needed]

## Debugging Plan
1. [step]: [what to observe]
2. ...

## Breakpoints to Set
- [file:line]: [reason / condition]

## Expected Investigation Path
- If [observation] -> investigate [direction]
- If [other observation] -> investigate [other direction]
```

## Rules

- Always compile with debug symbols and without optimization for debugging (-g -O0).
- Remote debugging in production: read-only operations only (breakpoints halt the process).
- For intermittent bugs: use conditional breakpoints or logging, not manual stepping.
- Heap profiling tools differ by language. Use the native one, not generic system tools.
- If the debugger changes timing (heisenbugs), use logging or tracing instead.
