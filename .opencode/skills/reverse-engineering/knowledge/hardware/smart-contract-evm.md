# Smart Contract & EVM Bytecode Reverse Engineering

TL;DR: The EVM is a stack-based machine with ~150 opcodes. Contracts dispatch via 4-byte function selectors (keccak256 of signature). Storage uses slot-based layout with keccak256 for mappings. Use heimdall-rs for decompilation, cast for on-chain inspection.

---

## EVM Architecture

3 memory areas: Stack (volatile, max 1024), Memory (volatile, byte-addressed), Storage (persistent, 256-bit slots).

No ASLR, no relocations, no syscalls, no threads. Deterministic execution, gas-metered.

## Key Opcodes

| Category | Examples | Gas |
|----------|---------|-----|
| Stack | PUSH1-32, DUP1-16, SWAP1-16, POP | 2-3 |
| Memory | MLOAD, MSTORE | 3 |
| Storage | SLOAD (100-2100), SSTORE (2100-20000) | High |
| Control | JUMP, JUMPI, JUMPDEST, RETURN, REVERT | Low |
| Call | CALL, STATICCALL, DELEGATECALL | 700+ |
| Env | CALLER, CALLVALUE, TIMESTAMP | Low |

## Function Dispatch

Selector = `keccak256("functionName(type1,type2,...)")[0:4]`

```
keccak256("transfer(address,uint256)") -> 0xa9059cbb
keccak256("balanceOf(address)")        -> 0x70a08231
```

Dispatch pattern: CALLDATALOAD -> SHR 0xE0 -> compare selectors via EQ+JUMPI chain.

## ABI Encoding

Static types: zero-padded to 32 bytes. Dynamic types: 32-byte offset pointer + data.

Events: topic0 = full 32-byte keccak of event signature (identifiable via PUSH32 + LOG).

## Storage Layout

Sequential slot assignment, tight-packed:
- Elementary types < 32 bytes pack same slot (left-to-right)
- Mappings: `keccak256(key . slot)` for value location
- Dynamic arrays: length at slot, elements at `keccak256(slot) + index`
- Short strings (<32 bytes): inline. Long strings: `keccak256(slot)` for data.

## Deployment vs Runtime

| Body | Purpose |
|------|---------|
| Init code | Runs during CREATE, contains constructor, returns runtime code |
| Runtime code | On-chain, starts with function dispatch |

## Decompilation Tools

| Tool | Type | Best For |
|------|------|----------|
| heimdall-rs | Decompiler | Quick Solidity-like output |
| Panoramix | Decompiler | Etherscan integration |
| Mythril | Symbolic exec | Vulnerability detection |
| JEB | Commercial | Highest quality |
| cast (Foundry) | CLI | On-chain inspection |

## End-to-End Workflow

```bash
# Phase 1: Acquire
cast code 0x<address> --rpc-url <rpc> > bytecode.hex

# Phase 2: Recon
cast selectors bytecode.hex
cast 4byte 0xa9059cbb

# Phase 3: Structure
heimdall cfg --code bytecode.hex --output cfg.dot

# Phase 4: Decompile
heimdall decompile --code bytecode.hex --output ./decompiled/

# Phase 5: Deep analysis
evm run --code bytecode.hex --input <calldata> --debug

# Phase 6: Storage
cast storage 0x<address> 0
```

## Compiler Fingerprinting

| Compiler | Pattern |
|----------|---------|
| Solidity 0.8.x+ | PUSH1 0x4 + CALLDATALOAD + PUSH1 0xE0 + SHR |
| Vyper | Simpler dispatch, consistent JUMP tables |
| Huff | No dispatch boilerplate (raw opcodes) |

Metadata hash: last ~50 bytes of deployed bytecode (CBOR-encoded IPFS hash).

## Analysis Patterns

**ERC20**: Multiple keccak256 (mapping accesses), LOG with Transfer topic, SSTORE after arithmetic.

**Access control (onlyOwner)**: CALLER + SLOAD(owner_slot) + EQ + JUMPI to revert.

**Reentrancy**: Vulnerable = CALL before SSTORE. Safe = SSTORE before CALL.

## Deobfuscation

| Technique | Detection |
|-----------|-----------|
| Control flow flattening | State dispatcher + repeated SLOAD/JUMPI |
| Opaque predicates | Complex arithmetic in JUMPI, one target unreachable |
| Dynamic jump targets | Stack-computed JUMP destinations |

SMT solvers (Mythril) break opaque predicates. Historical transactions guide path exploration through CFF.

## Mapping to Classic RE

| General RE | EVM Equivalent |
|-----------|---------------|
| Call convention | ABI encoding |
| Import table | Selector lookup (4byte.directory) |
| vtable/dispatch | Function selector dispatch table |
| CFG reconstruction | JUMP destination analysis |
| Symbol recovery | Selector -> signature database |
| Dynamic analysis | `evm run --debug` |
