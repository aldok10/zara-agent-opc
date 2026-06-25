# DEX and ODEX Format

TL;DR: DEX (Dalvik EXecutable) binary format -- header, ID tables (string/type/proto/field/method),
class definitions, code_item (method body), map_list, debug info, annotations, and ODEX format.

Cross-reference: See also `apk-structure-signing.md`, `art-runtime-compilation.md` in this directory.

---

## 2. DEX / ODEX Format

The DEX (Dalvik EXecutable) format is the compiled bytecode container for Android apps.
Every APK has at least one `classes.dex`. Multi-dex apps use `classes2.dex`, etc. [5](https://source.android.com/docs/core/runtime/dex-format).

### 2.1 DEX Header

The header is 0x70 bytes:

```
Offset  Size  Field               Description
------  ----  ------------------- -------------------------------------------
0x00    8     magic               "dex\n035\0" (or 037, 038, 039)
0x08    4     checksum            Adler-32 of the rest of the file
0x0C    20    signature           SHA-1 of the rest of the file after this
0x20    4     file_size           Total file size
0x24    4     header_size         0x70 (constant)
0x28    4     endian_tag          0x12345678 (little-endian) or 0x78563412
0x2C    4     link_size           Size of the link section
0x30    4     link_off            Offset of the link section
0x34    4     map_off             Offset of the map_list
0x38    4     string_ids_size     Number of string IDs
0x3C    4     string_ids_off      Offset of string_ids table
0x40    4     type_ids_size       Number of type IDs
0x44    4     type_ids_off        Offset of type_ids table
0x48    4     proto_ids_size      Number of proto IDs (method signatures)
0x4C    4     proto_ids_off       Offset of proto_ids table
0x50    4     field_ids_size      Number of field IDs
0x54    4     field_ids_off       Offset of field_ids table
0x58    4     method_ids_size     Number of method IDs
0x5C    4     method_ids_off      Offset of method_ids table
0x60    4     class_defs_size     Number of class definitions
0x64    4     class_defs_off      Offset of class_defs table
0x68    4     data_size           Size of data section
0x6C    4     data_off            Offset of data section
```

Each magic version maps to a runtime: `035` = Dalvik (pre-4.4), `037` = ART (4.4+),
`038` = ART with default methods, `039` = ART with record classes.

### 2.2 ID Tables

These are fixed-size arrays of offsets or indexes:

```
string_ids[]     — each entry is a 4-byte offset into the data section (into the
                   string_pool). Strings are MUTF-8 encoded (modified UTF-8 with
                   multi-byte null as 0xC0 0x80).

type_ids[]       — each entry is a 4-byte index into string_ids (the descriptor,
                   e.g. "Ljava/lang/String;")

proto_ids[]      — each entry is 12 bytes:
                   shorty_idx   (4) — string_idx for the short descriptor (e.g. "(ID)V")
                   return_type_idx (4) — type_idx for the return type
                   params_off   (4) — offset to a type_list or 0 for no params

field_ids[]      — each entry is 8 bytes:
                   class_idx    (2) — type_idx of the defining class
                   type_idx     (2) — type_idx of the field type
                   name_idx     (4) — string_idx of the field name

method_ids[]     — each entry is 8 bytes:
                   class_idx    (2) — type_idx of the defining class
                   proto_idx    (2) — index into proto_ids (signature)
                   name_idx     (4) — string_idx of the method name
```

### 2.3 Class Definitions

Each `class_def` entry is 32 bytes:

```
struct class_def {
    uint32_t class_idx;           // type_idx for this class
    uint32_t access_flags;        // ACC_PUBLIC (0x1), ACC_FINAL (0x10), etc.
    uint32_t superclass_idx;      // type_idx for superclass, or NO_INDEX
    uint32_t interfaces_off;      // offset to type_list for interfaces
    uint32_t source_file_idx;     // string_idx for source file name, or NO_INDEX
    uint32_t annotations_off;     // offset to annotations structure
    uint32_t class_data_off;      // offset to class_data (fields + methods)
    uint32_t static_values_off;   // offset to encoded_array of static initializers
};
```

The `class_data` structure is a ULEB-encoded sequence:

```
ULEB    static_fields_size       // number of static fields
ULEB    instance_fields_size     // number of instance fields
ULEB    direct_methods_size      // number of direct methods (static/private/ctor)
ULEB    virtual_methods_size     // number of virtual methods

For each field (static then instance):
    ULEB   field_idx_diff        // delta-encoded index into field_ids
    ULEB   access_flags

For each method (direct then virtual):
    ULEB   method_idx_diff       // delta-encoded index into method_ids
    ULEB   access_flags
    ULEB   code_off              // offset to code_item, or 0 for abstract/native
```

### 2.4 code_item (Method Body)

```
struct code_item {
    uint16_t registers_size;     // total registers (locals + params)
    uint16_t ins_size;           // parameter register count
    uint16_t outs_size;          // outgoing argument register count
    uint16_t tries_size;         // number of try/catch blocks
    uint32_t debug_info_off;     // offset to debug_info or 0
    uint32_t insns_size;         // size of instruction stream in 16-bit code units
    uint16_t insns[];            // the instruction stream
    // If tries_size > 0: 2-byte padding to 4-byte alignment
    //   followed by try_item[tries_size]
    //   followed by encoded_catch_handler_list
};
```

### 2.5 map_list (TypeMap)

The `map_list` at `map_off` maps out every section in the DEX file. Each entry is 12 bytes:

```
struct map_item {
    uint16_t type;      // TYPE_HEADER (0), TYPE_STRING_ID (1), etc.
    uint16_t unused;
    uint32_t size;      // number of entries
    uint32_t offset;    // offset from start of file
};
```

Over 20 section types exist (TYPE_STRING_ID_ITEM = 0x0001, TYPE_TYPE_ID_ITEM = 0x0002,
TYPE_PROTO_ID_ITEM = 0x0003, TYPE_METHOD_ID_ITEM = 0x0004, TYPE_CLASS_DEF_ITEM = 0x0006,
TYPE_CODE_ITEM = 0x2001, etc.) [5](https://source.android.com/docs/core/runtime/dex-format).

### 2.6 Debug Info

Debug info (offset by `debug_info_off`) encodes line numbers, local variable names,
and source position mappings in a space-efficient state-machine format:

```
ULEB   line_start                // initial line number
ULEB   parameters_size           // number of parameter names
ULEB   parameter_names[]         // string_idx for each parameter, or NO_INDEX
DBG_XXX opcodes follow            // state-machine instructions
```

Key debug opcodes: `DBG_START_LOCAL` (0x03), `DBG_END_LOCAL` (0x05),
`DBG_ADVANCE_LINE` (0x20), `DBG_ADVANCE_PC` (0x01), `DBG_SET_PROLOGUE_END` (0x07),
`DBG_SET_EPILOGUE_BEGIN` (0x08).

### 2.7 Annotations

Annotations are stored as an encoded tree:

```
annotations_directory_item:
    class_annotations_off     // offset to annotation_set_item
    fields_size               // number of field annotations
    methods_size              // number of method annotations
    parameters_size           // number of parameter annotations
    field_annotation[fields_size]  // {field_idx, annotations_off}
    method_annotation[methods_size] // {method_idx, annotations_off}
    parameter_annotation[parameters_size] // {method_idx, annotations_off}
```

Each `annotation_set_item` contains an array of `annotation_off` offsets pointing to
`encoded_annotation` structures: type_idx + ULEB-pairs of name->value.

### 2.8 ODEX Format

ODEX (Optimized DEX) was used on pre-ART Android (Dalvik) -- a DEX file with extra
pre-verified information appended. On ART, the equivalent is OAT files (see Section 3).

The Dalvik ODEX format added a `DEX_OPT_HEADER` after the DEX:

```
struct DexOptHeader {
    uint8_t  magic[8];          // "dey\n035\0"
    uint32_t dex_offset;         // offset to raw DEX inside
    uint32_t dex_length;
    uint32_t deps_offset;        // dependency table
    uint32_t deps_length;
    uint32_t opt_offset;         // optimized data section
    uint32_t opt_length;
    uint32_t flags;
    uint32_t checksum;           // of the original DEX
};
```

You rarely encounter ODEX today -- ART OAT replaced it entirely.

### 2.9 Parsing DEX programmatically

Using the `dexdump` tool (ships with Android SDK / AOSP):

```bash
# Full disassembly
dexdump -d classes.dex > disassembly.txt

# Header dump
dexdump -h classes.dex

# Bad class data verification
dexdump -c classes.dex

# Raw dump with offsets
dexdump -i classes.dex
```

Using Python with `androguard`:

```python
from androguard.core.bytecodes import dvm, apk

a = apk.APK("myapp.apk")
for dex in a.get_all_dex():
    d = dvm.DalvikVMFormat(dex)
    for cls in d.get_classes():
        print(cls.get_name(), cls.get_methods())
```

---

## Sources

5. AOSP -- DEX Format: https://source.android.com/docs/core/runtime/dex-format
