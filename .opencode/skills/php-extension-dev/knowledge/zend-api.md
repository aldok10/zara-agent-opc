# Zend Engine API Reference

> Docs: https://www.phpinternalsbook.com | Source: https://github.com/php/php-src/tree/master/Zend

## zval (Zend Value)

Every PHP value is a `zval`. Types: `IS_NULL`, `IS_FALSE`, `IS_TRUE`, `IS_LONG`, `IS_DOUBLE`, `IS_STRING`, `IS_ARRAY`, `IS_OBJECT`, `IS_RESOURCE`.

```c
// Return values
RETURN_NULL();
RETURN_TRUE;
RETURN_FALSE;
RETURN_LONG(42);
RETURN_DOUBLE(3.14);
RETURN_STRING("hello");          // copies string
RETURN_STR(zend_string *s);      // takes ownership
RETURN_EMPTY_STRING();
RETURN_ARR(zend_array *arr);
```

## Argument Parsing (PHP 8 fast API)

```c
// New fast API (preferred since PHP 7.0+)
ZEND_PARSE_PARAMETERS_START(min_args, max_args)
    Z_PARAM_LONG(my_long)
    Z_PARAM_STR(my_string)
    Z_PARAM_OPTIONAL
    Z_PARAM_BOOL(my_bool)
    Z_PARAM_ARRAY(my_array)
    Z_PARAM_ZVAL(my_zval)
    Z_PARAM_OBJECT_OF_CLASS(my_obj, some_ce)
    Z_PARAM_FUNC(fci, fcc)  // callable
ZEND_PARSE_PARAMETERS_END();
```

## Argument Info (Reflection/Type Declarations)

```c
// Function returns string, 1 required param
ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_fn, 0, 1, IS_STRING, 0)
    ZEND_ARG_TYPE_INFO(0, name, IS_STRING, 0)       // string $name
    ZEND_ARG_TYPE_INFO(0, count, IS_LONG, 0)        // int $count
    ZEND_ARG_TYPE_INFO(0, nullable, IS_STRING, 1)   // ?string $nullable
ZEND_END_ARG_INFO()

// No return type
ZEND_BEGIN_ARG_INFO_EX(arginfo_fn, 0, 0, 1)
    ZEND_ARG_INFO(0, value)  // mixed $value
ZEND_END_ARG_INFO()
```

## Memory Management

```c
// Use Zend allocators (tracked, debugging support)
void *ptr = emalloc(size);      // like malloc
void *ptr = ecalloc(n, size);   // like calloc
ptr = erealloc(ptr, new_size);  // like realloc
efree(ptr);                      // like free

// Persistent (survives request, like C malloc)
void *ptr = pemalloc(size, 1);
pefree(ptr, 1);

// Strings
zend_string *str = zend_string_init("hello", 5, 0);  // 0=request, 1=persistent
zend_string_release(str);  // decrement refcount, free if 0
```

## HashTable / Arrays

```c
// Create array
zval arr;
array_init(&arr);

// Add values
add_index_long(&arr, 0, 42);
add_assoc_string(&arr, "key", "value");
add_next_index_string(&arr, "auto-indexed");

// Iterate
zval *val;
zend_string *key;
ZEND_HASH_FOREACH_STR_KEY_VAL(Z_ARRVAL(arr), key, val) {
    // key may be NULL for numeric keys
    // val is zval*
} ZEND_HASH_FOREACH_END();
```

## Classes & Objects

See `examples/myext_class.c` for complete OOP extension.

Key macros:
```c
// Define method
PHP_METHOD(ClassName, methodName) { /* ZEND_THIS = $this */ }

// Register class in MINIT
INIT_CLASS_ENTRY(ce, "ClassName", method_table);
myclass_ce = zend_register_internal_class(&ce);

// Properties & constants
zend_declare_property_null(ce, "prop", sizeof("prop")-1, ZEND_ACC_PUBLIC);
zend_declare_class_constant_long(ce, "CONST", sizeof("CONST")-1, 42);

// Read/write properties
zend_read_property(ce, Z_OBJ_P(ZEND_THIS), "name", sizeof("name")-1, 1, &rv);
zend_update_property_str(ce, Z_OBJ_P(ZEND_THIS), "name", sizeof("name")-1, str);
```

## Module Lifecycle Hooks

```c
PHP_MINIT_FUNCTION(myext)   // Module init (once on startup)
PHP_MSHUTDOWN_FUNCTION(myext) // Module shutdown
PHP_RINIT_FUNCTION(myext)    // Request init (per request)
PHP_RSHUTDOWN_FUNCTION(myext) // Request shutdown
PHP_MINFO_FUNCTION(myext)    // phpinfo() output
PHP_GINIT_FUNCTION(myext)    // Globals init
```

- **MINIT**: Register classes, constants, ini settings. Runs ONCE.
- **RINIT**: Per-request setup (reset state).
- **RSHUTDOWN**: Per-request cleanup.
- **MSHUTDOWN**: Module teardown.

## INI Settings

```c
// In header
ZEND_BEGIN_MODULE_GLOBALS(myext)
    zend_long max_items;
    zend_bool debug;
ZEND_END_MODULE_GLOBALS(myext)

ZEND_DECLARE_MODULE_GLOBALS(myext)
#define MYEXT_G(v) ZEND_MODULE_GLOBALS_ACCESSOR(myext, v)

// Registration
PHP_INI_BEGIN()
    STD_PHP_INI_ENTRY("myext.max_items", "100", PHP_INI_ALL,
        OnUpdateLong, max_items, zend_myext_globals, myext_globals)
    STD_PHP_INI_ENTRY("myext.debug", "0", PHP_INI_ALL,
        OnUpdateBool, debug, zend_myext_globals, myext_globals)
PHP_INI_END()

// In MINIT
REGISTER_INI_ENTRIES();

// In MSHUTDOWN
UNREGISTER_INI_ENTRIES();

// Usage
if (MYEXT_G(debug)) { /* ... */ }
```

## Thread Safety (ZTS)

For Thread-Safe PHP builds (Windows default, some Linux setups):

```c
// Access globals in ZTS mode
#ifdef ZTS
#include "TSRM.h"
#endif

// Use MYEXT_G() macro which handles both ZTS and NTS
#define MYEXT_G(v) ZEND_MODULE_GLOBALS_ACCESSOR(myext, v)
```
