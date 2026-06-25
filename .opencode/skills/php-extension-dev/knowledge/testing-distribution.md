# PHP Extension Testing & Distribution

> Docs: https://qa.php.net/phpt_details.php | PIE: https://github.com/php/pie | PECL: https://pecl.php.net

## PHPT Testing

```
--TEST--
myext_hello() basic test
--EXTENSIONS--
myext
--FILE--
<?php
var_dump(myext_hello("World"));
var_dump(myext_hello(""));
?>
--EXPECT--
string(13) "Hello, World!"
string(7) "Hello, !"
```

Run tests:
```bash
make test TESTS=tests/
# Or specific:
php run-tests.php tests/001.phpt
```

## PECL Distribution

**package.xml** (minimal):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://pear.php.net/dtd/package-2.0" version="2.0">
 <name>myext</name>
 <channel>pecl.php.net</channel>
 <summary>My PHP extension</summary>
 <description>Description here</description>
 <lead><name>Your Name</name><user>you</user><email>you@example.com</email><active>yes</active></lead>
 <date>2026-06-25</date>
 <version><release>1.0.0</release><api>1.0.0</api></version>
 <stability><release>stable</release><api>stable</api></stability>
 <license uri="https://opensource.org/licenses/MIT">MIT</license>
 <notes>Initial release</notes>
 <contents>
  <dir name="/"><file role="src" name="config.m4"/>
   <file role="src" name="config.w32"/>
   <file role="src" name="php_myext.h"/>
   <file role="src" name="myext.c"/>
   <dir name="tests"><file role="test" name="001.phpt"/></dir>
  </dir>
 </contents>
 <dependencies><required><php><min>8.1.0</min></php><pearinstaller><min>1.10.0</min></pearinstaller></required></dependencies>
 <providesextension>myext</providesextension>
 <extsrcrelease/>
</package>
```

Install via PECL:
```bash
pecl install myext-1.0.0.tgz
# or from channel:
pecl install myext
```

## PIE Distribution (Modern, replaces PECL)

PECL is deprecated since 2024. Use PIE (PHP Installer for Extensions).

```json
// composer.json for PIE-distributed extension
{
    "name": "vendor/myext",
    "type": "php-ext",
    "description": "My PHP extension",
    "license": "MIT",
    "require": {
        "php": ">=8.1"
    },
    "php-ext": {
        "extension-name": "myext",
        "configure-options": [
            {
                "name": "enable-myext",
                "description": "Enable myext support"
            }
        ]
    }
}
```

Install: `pie install vendor/myext`

## Rust Extensions (ext-php-rs)

```rust
use ext_php_rs::prelude::*;

#[php_function]
pub fn hello(name: String) -> String {
    format!("Hello, {}!", name)
}

#[php_module]
pub fn get_module(module: ModuleBuilder) -> ModuleBuilder {
    module
}
```

Build: `cargo build --release` produces `.so`/`.dll` loadable by PHP.
