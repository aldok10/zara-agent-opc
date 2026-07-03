# Android Root Detection Bypass and Resources/Assets Analysis

TL;DR: Common root detection techniques and their bypass methods (Frida, objection,
Magisk Zygisk), plus Android resource binary formats (resources.arsc, string pools,
ResTable_config, binary XML/AXML, 9-patch, AAPT2).

See also: android-native-so-re.md, android-frida-dynamic.md, android-security-model.md, android-traffic-forensics-workflow.md

---
## 12. Root Detection Bypass

### 12.1 Common Root Checks

Apps detect root using various methods [29](https://www.optiv.com/insights/source-zero/blog/techniques-bypass-android-root-detection):

**Binary existence checks:**

```bash
# Files an app might check:
/sbin/su
/system/bin/su
/system/xbin/su
/system/sd/xbin/su
/data/local/xbin/su
/data/local/bin/su
/system/app/Superuser.apk
/system/app/SuperSU.apk
/data/data/com.topjohnwu.magisk/
```

**Runtime checks:**

```java
// Build tag check
boolean isRooted = "test-keys".equals(Build.TAGS);

// Which su
try {
    String[] commands = {"/system/xbin/which", "su"};
    Process p = Runtime.getRuntime().exec(commands);
    // if inputStream has content → su exists
} catch (Exception e) { }

// Superuser binary execution
try {
    Process p = Runtime.getRuntime().exec("su -c id");
    // if process starts successfully → rooted
} catch (Exception e) { }

// Magisk detection
try {
    Class.forName("com.topjohnwu.magisk.core.Provider");
    // likely rooted
} catch (ClassNotFoundException e) { }

// /proc/1/uid (init process)
// Read /proc/1/uid — normally 0 on rooted
```

### 12.2 Bypass Techniques

**Frida hook for build tag:**

```javascript
Java.perform(function() {
    var Build = Java.use('android.os.Build');
    Build.TAGS.value = 'release-keys';  // original: 'test-keys'

    var File = Java.use('java.io.File');
    File.exists.implementation = function() {
        var path = this.getAbsolutePath();
        var blocked = ['/system/app/Superuser.apk',
                       '/system/xbin/su',
                       '/data/data/com.topjohnwu.magisk',
                       '/data/local/tmp/frida-server'];
        if (blocked.includes(path)) {
            console.log('[+] Blocked root check: ' + path);
            return false;
        }
        return this.exists();
    };
});
```

**Frida hook for su execution:**

```javascript
Java.perform(function() {
    var Runtime = Java.use('java.lang.Runtime');
    Runtime.exec.overload('[Ljava.lang.String;').implementation = function(cmd) {
        var cmdStr = cmd.join(' ');
        console.log('[+] exec called: ' + cmdStr);
        if (cmdStr.includes('su') || cmdStr.includes('which su')) {
            console.log('[+] Blocked su check');
            throw new Error('Permission denied');
        }
        return this.exec(cmd);
    };
});
```

**Objection bypass:**

```bash
objection -g com.example.app explore
android root disable    # generic root check bypass
```

**LSPosed module:**
Modules like "RootCloak" or custom hooks in LSPosed can block root detection for
specific apps.

### 12.3 Detection Evasion (Magisk)

Magisk itself uses Zygisk + DenyList to hide from detection:

```bash
# Magisk settings to maximize stealth:
# 1. Magisk app → Settings → Hide Magisk App (repackaged name)
# 2. Magisk app → Settings → Zygisk: ON
# 3. Magisk app → Configure DenyList → add target app
# 4. Install Shamiko module (hides Zygisk + DenyList traces)
# 5. Use MagiskHide Props Config to spoof fingerprint + props
```

---

## 13. Resources and Assets Analysis

### 13.1 resources.arsc Binary Format

The Android Resource Table (`resources.arsc`) is a binary file that maps resource
IDs (e.g., `0x7f010000`) to configuration-specific values [30](https://justanapplication.wordpress.com/2011/09/16/a-closer-look-at-android-resources-part-1/).

```
ResTable_header (12 bytes):
    uint16_t header.type      = 0x0002 (RES_TABLE_TYPE)
    uint16_t header.headerSize = 0x000C (12 bytes)
    uint32_t header.size      = total file size
    uint32_t packageCount     = number of packages (usually 1)

ResTable_package:
    header (12 bytes, type=0x0200)
    uint32_t id               = 0x7f (or 0x01 for android)
    uint16_t name[128]        = package name (UTF-16)
    uint32_t typeStrings      = offset to type name strings
    uint32_t lastPublicType   = last public type index
    uint32_t keyStrings       = offset to key name strings
    uint32_t lastPublicKey    = last public key index
    uint32_t typeIdOffset     = 0

ResTable_type (one per configuration variant):
    header (12 bytes, type=0x0201)
    uint8_t  id               = type ID (1-based, 1=attr, 2=drawable, 3=layout, etc.)
    uint8_t  flags            = 0
    uint16_t reserved
    uint32_t entryCount       = number of entries in this type
    uint32_t entriesStart     = offset from this struct to entry data
    ResTable_config config    = 40-byte configuration descriptor

ResTable_entry:
    uint16_t size             = sizeof(ResTable_entry)
    uint16_t flags            = FLAG_COMPLEX (0x0001) for complex entries
    uint32_t index in ResTable_type (entry index)

Res_value (simple entries):
    uint16_t size             = 8
    uint8_t  RES_VALUE_TYPE   = 0
    uint8_t  dataType         = TypedValue type (0x03=string, 0x10=boolean, etc.)
    uint32_t data             = value (string index or integer)
```

### 13.2 String Pool Format

The string pool covers both resource table strings and binary XML strings:

```
ResStringPool_header (28 bytes):
    uint16_t header.type         = 0x0001 (RES_STRING_POOL_TYPE)
    uint16_t header.headerSize   = 0x001C
    uint32_t header.size         = total pool size
    uint32_t stringCount         = number of strings
    uint32_t styleCount          = number of style spans (usually 0)
    uint32_t flags               = SORTED (0x01), UTF8 (0x0100)
    uint32_t stringsStart        = offset from header to string data
    uint32_t stylesStart         = offset from header to style data

If UTF8 flag set:
    strings[0..stringCount-1]    = each is {ULEB128 length, ULEB128 length, ...UTF-8 data...}
Else:
    strings[0..stringCount-1]    = each is {uint16_t length, ...UTF-16 data...}

After string data:
    uint32_t offset[stringCount] (actually before the data, 'stringStart' points past them)
```

### 13.3 ResTable_config

A 40-byte structure describing device configuration for resource qualification:

```c
struct ResTable_config {
    uint32_t size;              // sizeof(ResTable_config) = 40
    union {
        uint16_t mcc;           // mobile country code
        uint16_t mnc;           // mobile network code
    };
    char language[2];           // ISO-639-1 language
    char country[2];            // ISO-3166-1 country
    uint8_t orientation;        // 1=portrait, 2=landscape
    uint8_t touchscreen;        // 1=notouch, 2=stylus, 3=finger
    uint16_t density;           // DPI (120, 160, 240, 320, 480, 640, etc.)
    uint8_t keyboard;           // 1=nokeys, 2=qwerty, 3=12key
    // ... (more fields for screen size, SDK version, etc.)
};
```

### 13.4 Binary XML (AXML)

AndroidManifest.xml and layout XMLs are compiled into a binary format (AXML) using
AAPT2. Structure:

```
XML header (8 bytes: type=0x0003, headerSize=8, fileSize=total)
ResStringPool (attribute names, values, URIs, namespace prefixes)
ResXMLTree_node nodes:
    - RES_XML_START_NAMESPACE_TYPE (0x0100)
    - RES_XML_START_ELEMENT_TYPE (0x0102)  # <activity>, <service>, etc.
    - RES_XML_ATTRIBUTE_TYPE (inline inside START_ELEMENT)
    - RES_XML_END_ELEMENT_TYPE (0x0103)
    - RES_XML_END_NAMESPACE_TYPE (0x0101)
    - RES_XML_CDATA_TYPE (0x0104)
    - RES_XML_END_DOCUMENT_TYPE (0x0101)
```

Each element has a namespace URI, name, and attribute count. Each attribute has:
namespace URI, name, value string, type (reference/string/boolean), and data.

### 13.5 9-Patch Images

Nine-patch (`.9.png`) images have a 1px border encoding stretchable regions [31](https://developer.android.com/develop/ui/views/graphics/drawables#nine-patch):

```bash
# Convert 9-patch from compiled APK
# AAPT2 dumps them as PNGs — the 1px border must be preserved for rebuild
apktool d myapp.apk -o out/
# Look in out/res/drawable-*/ for *.9.png

# Parse 9-patch chunks
xxd myimage.9.png | head -20
# Look for 'npTc' chunk (nine-patch chunk) after PNG IEND
```

### 13.6 AAPT2

The modern Android Asset Packaging Tool:

```bash
# Extract resources
aapt2 dump resources myapp.apk

# Dump string pool
aapt2 dump strings myapp.apk

# Dump XML
aapt2 dump xmltree myapp.apk AndroidManifest.xml

# Convert binary XML to text
aapt2 dump xmlstrings myapp.apk res/layout/activity_main.xml
```

### 13.7 AndroidManifest Parser Internals

The manifest in binary form can be parsed manually:

```bash
# Use AAPT2
aapt2 dump xmltree myapp.apk AndroidManifest.xml

# Use androguard
androguard xml myapp.apk AndroidManifest.xml

# Use apktool (always decodes it)
apktool d myapp.apk -o out/
cat out/AndroidManifest.xml
```

Common manifest entries of RE interest:
- `<uses-permission>` — requested permissions
- `<application android:debuggable="true">` — debuggable flag
- `<activity android:exported="true">` — exported activities
- `<provider android:authorities="...">` — content authorities (URI path for Drozer)
- `<meta-data>` — API keys, Firebase URLs, ad IDs
