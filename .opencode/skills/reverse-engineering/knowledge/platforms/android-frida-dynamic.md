# Android Dynamic Analysis: Frida, Xposed, Magisk

TL;DR: Advanced Frida scripting (class tracing, DEX dumping, native hooks),
Xposed/LSPosed framework hooking, Magisk systemless root, runtime method
tracing, and SSL pinning bypass techniques.

See also: android-native-so-re.md, android-security-model.md, android-root-bypass-resources.md, android-traffic-forensics-workflow.md

---
## 10. Dynamic Analysis

### 10.1 Frida Scripting (Advanced)

```javascript
// Class tracing — intercept all methods in a class
Java.perform(function() {
    var target = Java.use('com.example.app.utils.CryptoUtils');
    var methods = target.class.getDeclaredMethods();
    methods.forEach(function(method) {
        var name = method.getName();
        var overloads = target[name].overloads;
        overloads.forEach(function(overload) {
            overload.implementation = function() {
                console.log('[+] ' + name + ' called | args: ' +
                    JSON.stringify(Array.prototype.slice.call(arguments)));
                var ret = this[name].apply(this, arguments);
                console.log('[+] ' + name + ' returned: ' + ret);
                return ret;
            };
        });
    });
});

// Runtime DEX dumping (extract loaded DEX classes)
Java.perform(function() {
    Java.enumerateClassLoaders({
        onMatch: function(loader) {
            try {
                var clazz = loader.loadClass('com.example.app.MainActivity');
                console.log('Found class on loader: ' + loader);
                // Use Frida's DexDump gadget or Fridump for full extraction
            } catch(e) {}
        },
        onComplete: function() {}
    });
});

// Hook native functions (via NativeFunction)
var getKey = new NativeFunction(
    Module.findExportByName('libnative.so', 'Java_com_example_app_NativeLib_getKey'),
    'pointer', ['pointer', 'pointer']
);
Interceptor.attach(getKey, {
    onEnter: function(args) {
        console.log('getKey called');
    },
    onLeave: function(retval) {
        console.log('getKey returned: ' + retval.readCString());
    }
});
```

### 10.2 Xposed / LSPosed Framework

Xposed hooks into the Zygote process to modify app behavior before any app code runs.
LSPosed is the modern implementation for ART (Android 8-14) [22](https://github.com/LSPosed/LSPosed):

```java
// Xposed module example
public class HookModule implements IXposedHookLoadPackage {
    public void handleLoadPackage(XC_LoadPackage.LoadPackageParam lpparam) {
        if (!lpparam.packageName.equals("com.example.app")) return;

        XposedHelpers.findAndHookMethod(
            "com.example.app.MainActivity",
            lpparam.classLoader,
            "isLicensed",
            new XC_MethodReplacement() {
                @Override
                protected Object replaceHookedMethod(MethodHookParam param) {
                    return true;
                }
            }
        );
    }
}
```

Xposed vs Frida trade-offs:

| Aspect | Xposed/LSPosed | Frida |
|--------|---------------|-------|
| Persistence | Module installed permanently | Per-session script injection |
| Root required | Yes | Yes |
| API level | Java-only hooks | Java + native + in-memory |
| Zygote hook | Yes (catch all apps) | Per-process |
| Stealth | Lower (known signature) | Higher (if using Frida-gadget) |
| Setup | Magisk module | Push server / Gadget injection |

### 10.3 Magisk

Systemless root — essential for running Frida, LSPosed, objection [23](https://github.com/topjohnwu/Magisk):

```bash
# Install Magisk via custom recovery (TWRP) or patched boot.img
# Magisk modules for RE:
#   - Frida Server
#   - LSPosed
#   - Busybox
#   - Systemless ADB

# Hide root from target app
# MagiskHide → select app
# Or: Zygisk + Enforce DenyList
```

### 10.4 Runtime Method Tracing

```bash
# Method trace with simple timing
adb shell echo "stop" > /proc/`pgrep com.example.app`/method-trace

# ART tracing
adb shell setprop dalvik.vm.method-trace true
# Restart app, use it, then:
adb pull /data/misc/trace/dmtrace.trace .

# Simple log-based tracing (Frida one-liner)
frida -U com.example.app -e "Java.perform(function() {
    Java.use('com.example.app.MainActivity').onClick.implementation =
        function(v) { console.log('onClick'); this.onClick(v); };
})"
```

### 10.5 SSL Pinning Bypass

Most apps implement certificate pinning. Bypass methods:

**Frida universal script (objection's behind the scenes):**

```javascript
// Override TrustManager
Java.perform(function() {
    var TrustManager = Java.use('javax.net.ssl.TrustManager');
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');

    var TrustManagerClass = Java.registerClass({
        name: 'com.example.MyTrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function(chain, authType) {},
            checkServerTrusted: function(chain, authType) {},
            getAcceptedIssuers: function() { return []; }
        }
    });

    var trustManager = TrustManagerClass.$new();
    var sslContext = SSLContext.getInstance('TLS');
    sslContext.init(null, [trustManager], null);

    // Also patch OkHttp/HttpURLConnection
});
```

Using objection:

```bash
objection -g com.example.app explore
android sslpinning disable
```

Using Frida directly:

```bash
# Using the well-known universal SSL bypass script
frida -U com.example.app -l frida-android-repinning.js

# Native SSL library hook (for apps using native TLS)
frida -U com.example.app -e "Interceptor.attach(
    Module.findExportByName('libssl.so', 'SSL_CTX_set_verify'),
    { onEnter: function(args) { args[2] = ptr(0); } }
)"
```

### 10.6 r0capture

Dedicated Android traffic capture tool using Frida to dump SSL traffic [24](https://github.com/r0ysue/r0capture):

```bash
# Capture all SSL traffic from an app
python r0capture.py -U com.example.app -p capture.pcap

# The output is a pcap file — open in Wireshark
```
