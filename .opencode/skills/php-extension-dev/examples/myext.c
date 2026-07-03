/* myext.c - Complete minimal extension for PHP 8.x */
#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "php.h"
#include "ext/standard/info.h"
#include "php_myext.h"

/* Function: myext_hello(string $name): string */
PHP_FUNCTION(myext_hello)
{
    zend_string *name;

    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(name)
    ZEND_PARSE_PARAMETERS_END();

    zend_string *result = strpprintf(0, "Hello, %s!", ZSTR_VAL(name));
    RETURN_STR(result);
}

/* Arginfo (type declarations for reflection) */
ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_myext_hello, 0, 1, IS_STRING, 0)
    ZEND_ARG_TYPE_INFO(0, name, IS_STRING, 0)
ZEND_END_ARG_INFO()

/* Function table */
static const zend_function_entry myext_functions[] = {
    PHP_FE(myext_hello, arginfo_myext_hello)
    PHP_FE_END
};

/* Module info (phpinfo output) */
PHP_MINFO_FUNCTION(myext)
{
    php_info_print_table_start();
    php_info_print_table_row(2, "myext support", "enabled");
    php_info_print_table_row(2, "Version", PHP_MYEXT_VERSION);
    php_info_print_table_end();
}

/* Module entry */
zend_module_entry myext_module_entry = {
    STANDARD_MODULE_HEADER,
    "myext",                    /* Extension name */
    myext_functions,            /* Function entries */
    NULL,                       /* MINIT */
    NULL,                       /* MSHUTDOWN */
    NULL,                       /* RINIT */
    NULL,                       /* RSHUTDOWN */
    PHP_MINFO(myext),           /* MINFO */
    PHP_MYEXT_VERSION,          /* Version */
    STANDARD_MODULE_PROPERTIES
};

#ifdef COMPILE_DL_MYEXT
ZEND_GET_MODULE(myext)
#endif
