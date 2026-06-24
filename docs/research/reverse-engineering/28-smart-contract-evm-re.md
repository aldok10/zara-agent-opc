# 28 — Smart Contract & EVM Bytecode Reverse Engineering

**EVM bytecode RE is classic low-level RE in disguise.** The Ethereum Virtual Machine is a stack-based machine with ~150 opcodes, deterministic execution, and metered compute (gas). There is no ASLR, no relocations, no syscalls, no threads. But the fundamental RE loop applies: bytecode -> disassembly -> CFG -> semantics -> high-level recovery. The twist is that most of what you reverse was written in Solidity, so compiler idioms dominate. This document maps the EVM RE landscape end-to-end.

---

## 1. EVM Execution Model

### 1.1 Architecture

The EVM is a quasi-Turing-complete stack machine with three memory areas [1](https://ethereum.org/en/developers/docs/evm/):

| Area | Persistence | Addressing | Use |
|------|-------------|------------|-----|
| **Stack** | Volatile (per execution) | Top-of-stack only, max 1024 items | Operands for all opcodes |
| **Memory** | Volatile (per execution) | Byte-addressed, linear | ABI encoding/decoding, temp buffers |
| **Storage** | Persistent (per contract) | 256-bit slot keys, 32-byte values | State variables |

Execution proceeds bytecode-by-bytecode. Each opcode consumes stack items (its arguments) and pushes results. Gas is deducted per step [2](https://www.evm.codes/about).

### 1.2 Key Opcode Categories

| Category | Opcodes | Gas Cost Class |
|----------|---------|----------------|
| Arithmetic | `ADD`, `SUB`, `MUL`, `DIV`, `MOD`, `EXP` | Low (3-10) |
| Stack | `PUSH1..PUSH32`, `DUP1..DUP16`, `SWAP1..SWAP16`, `POP` | Very low (2-3) |
| Memory | `MLOAD`, `MSTORE`, `MSTORE8` | Low (3) |
| Storage | `SLOAD`, `SSTORE` | High (100-2100) |
| Control flow | `JUMP`, `JUMPI`, `JUMPDEST`, `PC`, `STOP`, `RETURN`, `REVERT` | Low |
| Environment | `CALLER`, `CALLVALUE`, `ADDRESS`, `BALANCE`, `GAS`, `TIMESTAMP`, `NUMBER` | Low |
| Call | `CALL`, `STATICCALL`, `DELEGATECALL`, `CALLCODE`, `RETURNDATASIZE`, `RETURNDATACOPY` | High (700+) |
| Logging | `LOG0`-`LOG4` | Medium (375+) |

Full reference at evm.codes [3](https://www.evm.codes/).

### 1.3 Execution Flow

Every contract call starts with the **calldata** (the transaction data). The EVM loads the code, initializes stack/memory to empty, and runs:

```
PC = 0
while opcode != STOP/REVERT/RETURN:
    deduct_gas(opcode)
    execute(opcode)
    PC += opcode_size(opcode)
```

The key insight: **control flow is entirely computed.** `JUMP` and `JUMPI` read their destination from the stack, not from a fixed offset. This is what makes CFG recovery harder than x86: there are no call/ret instructions, no fixed branch offsets in the opcode stream itself [4](https://hackmd.io/@FranckC/r1Rvvg4rp).

---

## 2. ABI Encoding

### 2.1 Function Selectors

Every external call begins with a 4-byte **function selector**: `keccak256("functionName(type1,type2,...)")[0:4]` [5](https://docs.soliditylang.org/en/v0.8.30/abi-spec.html).

```
keccak256("transfer(address,uint256)")  = 0xa9059cbb...  → selector = 0xa9059cbb
keccak256("balanceOf(address)")         = 0x70a08231...  → selector = 0x70a08231
```

The contract dispatches via a sequence of `EQ` + `JUMPI` pairs — a cascading if-else chain (or an O(1) lookup table in optimized code) [6](https://docs.soliditylang.org/en/v0.8.11/abi-spec.html). This dispatch table is usually the first structural landmark in any disassembly.

### 2.2 Argument Encoding

After the 4-byte selector, arguments are packed according to ABI encoding v2 [7](https://docs.soliditylang.org/en/v0.8.30/abi-spec.html):

- **Static types** (uint, bool, address, bytes32): zero-padded to 32 bytes, laid out sequentially.
- **Dynamic types** (string, bytes, T[]): a 32-byte offset pointer to the actual data, then the data.
- **Tuple types** are flattened recursively.

| Type | Encoded Size | Example (hex) |
|------|-------------|---------------|
| `uint256(42)` | 32 bytes | `0x0...002a` |
| `address(0xAbc)` | 32 bytes | `0x0...0abc` |
| `bool(true)` | 32 bytes | `0x0...0001` |
| `bytes("hello")` | 32 (offset) + 32 (len) + 5 (data) + padding | offset, 0x05, `68656c6c6f`, zeros |

### 2.3 Event Signatures

Events use the full 32-byte keccak of the event signature as `topic0`:

```
keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
```

This value appears as a constant in bytecode (loaded via `PUSH32`), making event types reliably recoverable even without source [8](https://www.synacktiv.com/publications/evm-unravelled-recovering-abi-from-bytecode).

---

## 3. Solidity Compilation & Output

### 3.1 Compilation Pipeline

Solidity has two codegen paths [9](https://docs.soliditylang.org/en/v0.8.7/yul.html):

1. **Old codegen (direct to EVM)**: Solidity AST directly to opcodes. Used by default pre-0.8.13.
2. **IR-based codegen (`via-ir`)**: Solidity AST -> **Yul IR** -> optimized Yul -> EVM bytecode. Produces more predictable bytecode, enables better optimization.

Yul is the intermediate language — a low-level, typed, SSA-like IR. Reversing `via-ir` bytecode is harder because the compiler aggressively inlines, removes redundant SLOADs, and reorders operations [10](https://soliditylang.org/blog/2024/07/12/a-closer-look-at-via-ir/).

### 3.2 Deployment vs Runtime Bytecode

Every contract has two bytecode bodies:

| Body | Purpose | Key Difference |
|------|---------|----------------|
| **Init (creation) code** | Runs during `CREATE`/`CREATE2`. Returns runtime code. | Contains constructor logic, immutable vars, then `RETURN` with runtime code offset/size |
| **Runtime code** | What lives on-chain. Executed on every call. | No constructor. Starts with function dispatch. |

When reversing, you almost always care about **runtime bytecode**. Etherscan shows runtime by default; use "Switch to Opcodes View" [11](https://ethereum.org/en/developers/tutorials/reverse-engineering-a-contract).

### 3.3 Compiler Fingerprinting

Compilers leave fingerprints [12](https://www.jbecker.dev/research/evm-compiler-fingerprinting):

| Compiler | Signature |
|----------|-----------|
| Solidity ≤0.4.x | Uses `CALLDATASIZE` + `PUSH1 0x0` + `CALLDATALOAD` for dispatch |
| Solidity 0.5.x-0.7.x | `PUSH1 0x4` + `CALLDATALOAD` + `PUSH1 0xE0` + `SHR` |
| Solidity 0.8.x+ | `PUSH1 0x4` + `CALLDATALOAD` + `PUSH1 0xE0` + `SHR` + `ORIGIN` check sometimes |
| Vyper | Less inlining, simpler dispatch, uses `JUMP` tables consistently |
| Huff | No dispatch boilerplate — programmer writes raw opcodes |

### 3.4 Metadata Hash

Solidity appends an IPFS/Swarm metadata hash to deployed bytecode (last ~50 bytes) [13](https://docs.soliditylang.org/en/v0.8.30/metadata.html). If present, you can recover compiler version, settings, and source paths:

```
$ echo <bytecode> | xxd -r -p | tail -c 53 | xxd -p
a264...736f6c634...  // CBOR-encoded metadata
```

Foundry's `cast` can decode this directly: `cast inspect --metadata <contract>`.

---

## 4. Storage Layout Recovery

### 4.1 Slot Assignment Rules

Solidity assigns storage slots sequentially, tightly packed [14](https://docs.soliditylang.org/en/stable/internals/layout_in_storage.html):

```
uint256 a;      // slot 0
address b;      // slot 1 (uses 20 of 32 bytes)
uint8 c;        // slot 1 (shares with b, uses 1 byte)
uint128 d;      // slot 1 (shares with b and c if room)
uint256 e;      // slot 2 (new slot — previous 1 has no room)
```

Key rules:
- Elementary types under 32 bytes pack into the same slot left-to-right (big-endian).
- Structs and arrays always start a fresh slot.
- `mapping` always occupies its own slot (used as seed for key computation).
- Inherited contract state comes **before** derived contract state.

### 4.2 Mapping Storage

Mapping values are stored at: `keccak256(key . slot)` where `.` is concatenation, and `slot` is the mapping's declared slot [14](https://docs.soliditylang.org/en/stable/internals/layout_in_storage.html).

```
mapping(address => uint256) public balances;  // declared at slot 3
// balances[0xAbc] stored at: keccak256(0x000...0Abc || 0x000...003)
```

This means mapping slot access is **not a simple SLOAD** — the contract computes the hash at runtime, so an SLOAD at a large, seemingly random offset is a strong heuristic for mapping access.

### 4.3 Dynamic Array Storage

Dynamic arrays store length at the declared slot. Elements begin at `keccak256(slot)` [14](https://docs.soliditylang.org/en/stable/internals/layout_in_storage.html).

```
uint256[] public items;  // declared at slot 5
// length stored at slot 5
// items[0] at keccak256(0x000...005)
// items[1] at keccak256(0x000...005) + 1
```

### 4.4 Static Array & String Storage

- **Short strings** (<32 bytes): stored inline in the slot, high-byte encodes `length * 2`.
- **Long strings** (>=32 bytes): slot stores `length * 2 + 1`, data lives at `keccak256(slot)`.
- **Static arrays**: packed sequentially starting at their declared slot.

---

## 5. Decompilation Tools

### 5.1 heimdall-rs

Rust-based toolkit for EVM bytecode analysis [15](https://github.com/Jon-Becker/heimdall-rs).

| Command | Function |
|---------|----------|
| `heimdall decompile --code <bytecode>` | Decompile to Solidity-like output |
| `heimdall disassemble --code <bytecode>` | Full disassembly with CFG |
| `heimdall inspect --code <bytecode>` | Extract selectors, storage, modifiers |
| `heimdall cfg --code <bytecode>` | Generate control flow graph (DOT/PNG) |

Heimdall's decompiler uses pattern matching against known Solidity compiler idioms: it recognizes dispatch patterns, storage read/write patterns, and common utility functions [16](https://jbecker.dev/research/diving-into-decompilation). It does not execute code symbolically; it's purely static.

```
$ heimdall decompile --code 0x608060405260043610... --output ./out
```

Output includes recovered function signatures, state variables, and a best-effort Solidity reconstruction.

### 5.2 Panoramix (Eveem)

Python-based decompiler used by Etherscan [17](https://github.com/eveem-org/panoramix). Produces Python-like pseudocode. Strengths:
- Excellent at recovering function dispatch and basic control flow
- Handles most Solidity 0.4.x-0.8.x idioms
- Integrated into Etherscan's "Decompile" tab

Weaknesses: times out on large contracts, no path exploration, limited Vyper support [18](https://gist.github.com/patrickd-/72df794df05e97d6383fbab75bab8c50).

### 5.3 Mythril

Security analysis tool using **symbolic execution** and SMT solving [19](https://github.com/ConsenSys/mythril). While primarily a vulnerability scanner, its laser.py module provides structured EVM execution semantics:

```
$ mythril analyze --code <bytecode>
```

Mythril explores all feasible execution paths and can recover: reachable functions, possible state transitions, storage impacts per function. It taints user input and tracks it through the bytecode [20](https://mythril-classic.readthedocs.io/en/latest/security-analysis.html).

### 5.4 Octopus

Python framework for analyzing multiple blockchain bytecode formats (EVM, WASM, NEO, EOS) [21](https://github.com/BlockchainSecurityServices/octopus). Designed as a security analysis framework rather than a decompiler. Provides:
- Disassembly + CFG visualization
- Symbolic execution stubs
- Custom analysis plugins

### 5.5 JEB Decompiler

Commercial decompiler with EVM support [22](https://pnfsoftware.com/jeb/evm). Produces the highest-quality Solidity reconstruction of any tool. Handles control flow flattening deobfuscation, identifies internal functions, and recovers variable names.

### 5.6 LLM-Based Decompilation

Recent work (June 2025) shows LLMs can produce semantically faithful Solidity from bytecode, achieving 0.82 semantic similarity with original source [23](https://arxiv.org/abs/2506.19624). The pipeline:
1. Static disassembly + CFG recovery (traditional)
2. Function boundary detection
3. LLM prompt: bytecode fragments + known selectors -> Solidity

Current limitation: hallucinations on complex control flow and large contracts (>500 opcodes).

### 5.7 Tool Comparison

| Tool | Type | Output | CFG | Symbolic | Best For |
|------|------|--------|-----|----------|----------|
| heimdall-rs | Decompiler | Solidity-like | Yes | No | Quick analysis |
| Panoramix | Decompiler | Python-like | Partial | No | Etherscan integration |
| Mythril | Security analyzer | Report + trace | Yes | Yes | Vulnerability detection |
| Octopus | Analysis framework | Disassembly | Yes | Stub | Research / custom analysis |
| JEB | Decompiler | Solidity | Yes | Limited | Professional reversing |
| LLM pipeline | Decompiler | Solidity | No | No | Recovery of readable code |

---

## 6. Disassembly & Low-Level Tools

### 6.1 Foundry `cast`

The Swiss army knife for on-chain data [24](https://book.getfoundry.sh/reference/cli/cast/disassemble):

| Command | Use |
|---------|-----|
| `cast code <address>` | Fetch runtime bytecode from RPC |
| `cast disassemble <bytecode>` | Disassemble to opcodes |
| `cast selectors <bytecode>` | Extract all 4-byte selectors |
| `cast storage <address> <slot>` | Read arbitrary storage slot |
| `cast 4byte <selector>` | Lookup selector against 4byte.directory |
| `cast --calldata-decode <sig> <calldata>` | Decode calldata from ABI signature |

```
$ cast code 0x... --disassemble | head -20
[0x00] PUSH1 0x80
[0x02] PUSH1 0x40
[0x04] MSTORE
[0x05] CALLVALUE
[0x06] DUP1
[0x07] ISZERO
[0x08] PUSH1 0x0f
[0x0a] JUMPI
```

### 6.2 go-ethereum `evm` Tool

The Geth EVM tool provides low-level execution [25](https://github.com/ethereum/go-ethereum):

```
$ evm --code <bytecode> --debug run
$ evm disasm <bytecode>
$ evm run --input <calldata> --code <bytecode>
```

The `--debug` flag dumps stack/memory/storage state at every step — indispensable for manual tracing.

### 6.3 pyevmasm

Python disassembler and assembler from Trail of Bits [26](https://github.com/crytic/pyevmasm):

```python
from pyevmasm import disassemble_all
for insn in disassemble_all(bytes.fromhex(bytecode)):
    print(f"{insn.pc:04x}: {insn.name} {insn.operand}")
```

### 6.4 Radare2 / Rizin Plugin

Community plugins exist for EVM architecture in radare2 [27](https://securityboulevard.com/2017/12/reversing-evm-bytecode-with-radare2/). They provide:
- EVM opcode parsing as an architecture plugin
- CFG visualization
- Cross-references via JUMP target analysis

Usage: `r2 -a evm -b 256 <bytecode_file>`

### 6.5 erever

Minimalist EVM reversing toolkit [28](https://github.com/minaminao/erever). Provides disassembly, CFG generation, and storage slot analysis. Useful as a reference implementation for learning.

---

## 7. Deobfuscation

### 7.1 Control Flow Flattening (CFF)

CFF transforms natural control flow into a state-machine pattern [29](https://arxiv.org/abs/2505.19887):

```
// Before:
if (x) { A } else { B }

// After (flattened):
uint256 state = entry;
while (true) {
    if (state == 0) { x ? state = 1 : state = 2; }
    if (state == 1) { A; state = exit; }
    if (state == 2) { B; state = exit; }
    if (state == exit) { break; }
}
```

In bytecode, this appears as: a `JUMPDEST` dispatcher block containing `SLOAD` (state variable) + repeated `EQ`/`JUMPI` sequences, followed by blocks that update the state variable and jump back.

### 7.2 Opaque Predicates

A branch condition that is always true (or always false) but obfuscated to hide this [30](https://arxiv.org/html/2504.13398):

```
// Always true: x^2 + x is always even
if ((x * x + x) & 1 == 0) { real_path } else { dead_code }
```

In EVM bytecode: look for complex arithmetic (`EXP`, `MUL`, `MOD`, `ADD`) used in `JUMPI` conditions where one target is never reached. SMT solvers (via Mythril) trivially break these.

### 7.3 Deobfuscation Strategy

| Technique | Detection | Countermeasure |
|-----------|-----------|----------------|
| CFF | State dispatcher + repeated state variable pattern | Symbolic execution to enumerate state values |
| Opaque predicates | Dead code blocks reachable only via complex arithmetic | SMT solving or concolic testing |
| Dead code insertion | NOP-like opcodes (`POP PUSH1` with unused result) | Heuristic removal |
| Dynamic jump targets | `JUMP` with stack-computed destination | Concrete/symbolic execution to resolve |

### 7.4 The `skanf` Approach

The `skanf` tool combines CFF deobfuscation + symbolic execution + concolic execution based on historical transactions [30](https://arxiv.org/html/2504.13398). The key insight: historical transactions provide concrete calldata that can guide path exploration through flattened control flow.

---

## 8. Analysis Patterns

### 8.1 ERC20 Recognition

ERC20 contracts are the most common on-chain. Landmarks in bytecode [31](https://selector-lookup.utils.com/):

| Selector | Signature | Purpose |
|----------|-----------|---------|
| `0x70a08231` | `balanceOf(address)` | Read slot at `keccak256(address . mapping_slot)` |
| `0xa9059cbb` | `transfer(address,uint256)` | Write to balance mapping + emit Transfer event |
| `0x18160ddd` | `totalSupply()` | Read slot (usually slot 0) |
| `0xdd62ed3e` | `allowance(address,address)` | Double-key mapping read |
| `0x095ea7b3` | `approve(address,uint256)` | Write allowance mapping + emit Approval event |

In disassembly, ERC20 patterns show:
- Multiple `keccak256` computations (mapping accesses)
- `LOG2` or `LOG3` with topic0 = `ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` (Transfer event)
- `SSTORE` after arithmetic (balance updates)

### 8.2 Access Control Detection

The `onlyOwner` modifier pattern produces bytecode containing `CALLER`, `SLOAD` (owner slot), `EQ`, and `JUMPI` with revert path [32](https://ethereum.org/en/developers/tutorials/reverse-engineering-a-contract). Reversing heuristic:

```
CALLER                   // msg.sender
PUSH20 <owner_address>   // OR SLOAD(owner_slot) -> compare with loaded owner
EQ                       // both on stack
PUSH1 <revert_pc>
JUMPI                    // jump to revert if not equal
```

Look for `ORIGIN` vs `CALLER` to distinguish `tx.origin`-based access control from `msg.sender`.

### 8.3 Reentrancy Detection

Reentrancy exploits callbacks from external contracts. Bytecode patterns [33](https://arxiv.org/abs/2007.01029):

| Safe pattern | Vulnerable pattern |
|-------------|-------------------|
| `SLOAD` (balance) -> arithmetic -> `SSTORE` (update) -> `CALL` (send) | `CALL` (send) -> ... -> `SLOAD` + arithmetic + `SSTORE` after call |
| `SSTORE` always **before** external call | `SSTORE` after external call |

Checks-Effects-Interactions pattern: in safe code, storage writes (`SSTORE`) precede `CALL`/`STATICCALL`. In vulnerable code, a `CALL` to a user-controlled address is followed by `SSTORE`.

### 8.4 Oracle / Price Feed Access

Contracts using Chainlink or similar show:
- `PUSH20 <oracle_address>` + `STATICCALL`
- `MLOAD`/`RETURNDATACOPY` to read returned price
- `DIV` with decimal precision constants

---

## 9. End-to-End Reversing Workflow

### Phase 1: Bytecode Acquisition
```
$ cast code 0x<address> --rpc-url <rpc> > bytecode.hex
$ cast creation-code 0x<address> --rpc-url <rpc>  # if init code needed
```

### Phase 2: Surface Recon
```
$ cast selectors bytecode.hex                    # list all 4-byte selectors
$ cast 4byte 0xa9059cbb                          # lookup against 4byte.directory
$ heimdall inspect --code bytecode.hex            # storage slots, modifiers, events
```

### Phase 3: Structural Analysis
```
$ cast disassemble bytecode.hex | head -200       # manual inspection of dispatch
$ heimdall cfg --code bytecode.hex --output cfg.dot
$ dot -Tpng cfg.dot -o cfg.png                    # visualize CFG
```

### Phase 4: Decompilation
```
$ heimdall decompile --code bytecode.hex --output ./decompiled/
$ panoramix -c bytecode.hex                       # alternative view
```

### Phase 5: Deep Analysis
```
$ evm disasm bytecode.hex                          # raw opcodes
$ evm run --code bytecode.hex --input <calldata> --debug
$ mythril analyze --code bytecode.hex              # symbolic path exploration
```

### Phase 6: Storage State Recovery
```
# Map slots by analyzing SLOAD/SSTORE operands
$ cast storage 0x<address> 0
$ cast storage 0x<address> 1
# For mapping slot 3, key=0xAbc:
$ cast storage 0x<address> $(cast keccak $(cast abi-encode "x(address)" 0xAbc)0000000000000000000000000000000000000000000000000000000000000003)
```

---

## 10. Connecting to General RE Principles

EVM reversing maps to classic RE concepts:

| General RE Concept | EVM Equivalent |
|--------------------|----------------|
| Call convention (stdcall/fastcall) | ABI encoding rules |
| PE/ELF import table | Known event signatures, selector lookup |
| String table | Metadata hash, CBOR blob |
| vtable / dispatch | Function selector dispatch table |
| OEP finding | Entry point = bytecode offset 0 |
| Anti-debug / anti-VM | `GAS` opcode checks, `BALANCE` checks |
| Obfuscation (CFF, opaque predicates) | Same! CFF originated in LLVM obfuscators |
| Symbol recovery | Selector -> 4byte.directory lookup |
| CFG reconstruction | JUMP destination analysis (harder — no fixed offsets) |
| Type recovery | Slot packing patterns, ABI decode stubs |
| Dynamic analysis | `evm run --debug`, symbolic execution |

The structural difference: EVM has **no syscalls**, **no kernel boundary**, and **no memory protection**. Every instruction is deterministic and observable. But the obfuscation techniques are literally the same ones used in x86 malware — control flow flattening, opaque predicates, dead code insertion — because they are compiler-agnostic.

---

## 11. References

1. [Ethereum Virtual Machine Overview](https://ethereum.org/en/developers/docs/evm/)
2. [evm.codes — Interactive EVM Opcode Reference](https://www.evm.codes/about)
3. [EVM Opcode Reference](https://www.evm.codes/)
4. [Decompiling EVM Bytecode — Franck C.](https://hackmd.io/@FranckC/r1Rvvg4rp)
5. [Solidity ABI Specification](https://docs.soliditylang.org/en/v0.8.30/abi-spec.html)
6. [Function Signatures and Selectors — Ethereum Stack Exchange](https://ethereum.stackexchange.com/questions/72363/what-is-a-function-selector)
7. [Understanding ABI Encoding — RareSkills](https://rareskills.io/post/abi-encoding)
8. [EVM Unravelled: Recovering ABI from Bytecode — Synacktiv](https://www.synacktiv.com/publications/evm-unravelled-recovering-abi-from-bytecode)
9. [Yul Intermediate Language](https://docs.soliditylang.org/en/v0.8.7/yul.html)
10. [A Closer Look at via-IR — Solidity Blog](https://soliditylang.org/blog/2024/07/12/a-closer-look-at-via-ir/)
11. [Reverse Engineering a Contract — Ethereum.org](https://ethereum.org/en/developers/tutorials/reverse-engineering-a-contract)
12. [Compiler Fingerprinting in EVM Bytecode — J. Becker](https://www.jbecker.dev/research/evm-compiler-fingerprinting)
13. [Solidity Metadata](https://docs.soliditylang.org/en/v0.8.30/metadata.html)
14. [Layout of State Variables in Storage](https://docs.soliditylang.org/en/stable/internals/layout_in_storage.html)
15. [heimdall-rs — GitHub](https://github.com/Jon-Becker/heimdall-rs)
16. [Diving Into Smart Contract Decompilation — J. Becker](https://jbecker.dev/research/diving-into-decompilation)
17. [Panoramix (Eveem) — GitHub](https://github.com/eveem-org/panoramix)
18. [EVM Decompilers Overview — GitHub Gist](https://gist.github.com/patrickd-/72df794df05e97d6383fbab75bab8c50)
19. [Mythril — GitHub](https://github.com/ConsenSys/mythril)
20. [Mythril Security Analysis](https://mythril-classic.readthedocs.io/en/latest/security-analysis.html)
21. [Octopus Framework — GitHub](https://github.com/BlockchainSecurityServices/octopus)
22. [JEB EVM Decompiler](https://pnfsoftware.com/jeb/evm)
23. [Decompiling Smart Contracts with LLMs — arXiv 2506.19624](https://arxiv.org/abs/2506.19624)
24. [Foundry Cast Reference](https://book.getfoundry.sh/reference/cli/cast/disassemble)
25. [go-ethereum EVM Tool](https://github.com/ethereum/go-ethereum)
26. [pyevmasm — Trail of Bits](https://github.com/crytic/pyevmasm)
27. [Reversing EVM Bytecode with Radare2](https://securityboulevard.com/2017/12/reversing-evm-bytecode-with-radare2/)
28. [erever — GitHub](https://github.com/minaminao/erever)
29. [A Four-Dimensional Framework for LLM Assembly Deobfuscation — arXiv 2505.19887](https://arxiv.org/abs/2505.19887)
30. [Veiled Vulnerabilities in Closed-Source Contracts — arXiv 2504.13398](https://arxiv.org/html/2504.13398)
31. [4-Byte Selector Lookup](https://selector-lookup.utils.com/)
32. [Reversing EVM: Access Control](https://trustchain.medium.com/reversing-and-debugging-evm-the-execution-flow-part-5-2ffc97ef0b77)
33. [Hunting Reentrancy via Static Analysis — arXiv 2007.01029](https://arxiv.org/abs/2007.01029)
