# radare2 Visual Mode, r2pipe Scripting & Decompilers

TL;DR: Visual/graph mode navigation, r2pipe scripting in Python/Go/JS, and decompiler commands (pdc, r2dec, r2ghidra).
See also: `radare2-ecosystem-commands.md`, `radare2-pe-esil-session.md`

---

## 4. Visual mode and graph mode

Enter visual mode with `V`; it is the interactive, key-driven alternative to the
prompt, with movement, a cursor mode for byte selection, and many keybindings
[18](https://book.rada.re/visual/intro.html).

Inside `V`:

- `p` / `P` rotate through panes (hex, disassembly, debug, words)
  [11](https://book.rada.re/refcard/intro.html).
- `hjkl` or arrows move; `Enter` follows the jump/call under the cursor.
- `c` toggles cursor mode; `:` drops to a one-shot r2 command line.
- `;` adds a comment, `d` defines data/function, `x` shows xrefs.

Press `p` after `V` to get the structured visual disassembler
[19](https://book.rada.re/visual/visual_disassembly.html). `VV` opens the
**graph mode** — the control-flow / call graph view. In graph mode `;` adds a
comment to the current basic block, `/` highlights text, and you navigate blocks
with the movement keys
[20](https://monosource.gitbooks.io/radare2-explorations/content/intro/visual_graphs.html).
Renaming the current function in graph/visual is bound through the visual menus
(`vdr` to rename, `vvs` to change a function signature)
[21](https://book.rada.re/visual/visual_menus.html). On the command line the
equivalents are `afn newname` for rename and `CC` for comments, which is what
you script.

---

## 5. r2pipe — scripting r2 from any language

r2pipe drives an r2 instance over a pipe, HTTP, or TCP socket, and exists for
Python, NodeJS, Go, Rust, Ruby, and more
[22](https://book.rada.re/scripting/r2pipe.html). The contract is dead simple:
you send r2 commands as strings and get text back; the `cmdj` variant parses
JSON command output into native objects.

### Python

```console
$ pip install r2pipe
```

```python
import r2pipe

r2 = r2pipe.open("sample.dll")   # open the binary
r2.cmd("aaa")                    # analyze
print(r2.cmd("afl"))             # function list as text
funcs = r2.cmdj("aflj")          # same, parsed into a list of dicts
for f in funcs:
    print(hex(f["offset"]), f["name"], f["size"])

# disassemble one export as text
print(r2.cmd("pdf @ sym.DllMain"))

# decompile via r2ghidra (if installed), JSON form
dec = r2.cmdj("pdgj @ sym.DllMain")
print(dec.get("code", ""))
r2.quit()
```

### Go

```console
$ r2pm -i r2pipe-go
```

```go
package main

import (
    "fmt"
    "github.com/radare/r2pipe-go"
)

func main() {
    r2p, err := r2pipe.NewPipe("sample.dll")
    if err != nil {
        panic(err)
    }
    defer r2p.Close()

    if _, err := r2p.Cmd("aaa"); err != nil {
        panic(err)
    }
    out, err := r2p.Cmd("pdf @ entry0")
    if err != nil {
        panic(err)
    }
    fmt.Println(out)
}
```

### NodeJS / JS

```console
$ npm install r2pipe
```

```js
const r2pipe = require("r2pipe");
r2pipe.open("sample.dll", (err, r2) => {
  if (err) throw err;
  r2.cmd("aaa", () => {
    r2.cmd("pdf @ entry0", (out) => {
      console.log(out);
      r2.quit();
    });
  });
});
```

Three transports are available: spawned pipe (`r2 -0`), HTTP (cloud-friendly),
and TCP socket (`r2 -c`) [22](https://book.rada.re/scripting/r2pipe.html). For
automation, always prefer `cmdj`/JSON output over scraping text.

---

## 6. Decompilers: pdc, r2dec, r2ghidra

For historical reasons r2's decompilers live under `pd` subcommands
[13](https://book.rada.re/arch/decompile.html):

| Command | Decompiler | Notes |
|---|---|---|
| `pdc` | Built-in pseudo-decompiler | Ships by default, works on **every** arch |
| `pdd` | r2dec | Install via `r2pm -i r2dec`; control-flow + cleanup |
| `pdg` | r2ghidra | Install via `r2pm -i r2ghidra`; Ghidra engine, no JVM |

Common output modifiers apply across all three: `pdgo`/`pddo`/`pdco` show the
offset of the instruction per line; `pdga`/`pdda`/`pdca` show a two-column
asm-vs-decompiled view; `pdgj`/`pddj`/`pdcj` emit JSON
[13](https://book.rada.re/arch/decompile.html).

**pdc** combines ESIL emulation, pseudo-disassembly, and signature/comment
metadata into a quick higher-level reading of a function. It does **no** real
control-flow recovery (no reconstructed if/else/for/while) and no dead-code
elimination, so it is verbose and noisy, but it is instant and universal, which
also makes it good input for feeding an LLM
[13](https://book.rada.re/arch/decompile.html).

**r2ghidra** ports the Ghidra decompiler (the C++ SLEIGH engine) into a native
r2 plugin so you get Ghidra-quality output without a Java runtime
[1g](https://github.com/radareorg/r2ghidra). Quality is not identical to full
Ghidra: r2ghidra does not feed the engine the same analysis/metadata that the
Ghidra GUI does, so complex structures and some details may be missed
[13](https://book.rada.re/arch/decompile.html). Tune it with `e r2ghidra.*`
variables (cast display, indent, line length, timeout). In rizin/Cutter the same
plugin is packaged as **rz-ghidra**
[2g](https://github.com/radareorg/r2ghidra-dec/blob/master/README.md).

Install and use:

```console
$ r2pm -U                 # refresh package db
$ r2pm -i r2ghidra        # build/install the plugin
$ r2 -A sample.dll
[0x...]> s sym.DllMain
[0x...]> pdg              # ghidra decompilation
[0x...]> pdgo             # with per-line offsets
```
