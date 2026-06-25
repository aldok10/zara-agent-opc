/* myext_class.c - Extension with OOP class registration */
#include "php.h"
#include "php_myext.h"

static zend_class_entry *myclass_ce;

/* Method: MyClass::greet(): string */
PHP_METHOD(MyClass, greet)
{
    zval rv;
    zval *name = zend_read_property(myclass_ce, Z_OBJ_P(ZEND_THIS),
        "name", sizeof("name")-1, 1, &rv);
    
    zend_string *result = strpprintf(0, "Hello, %s!", Z_STRVAL_P(name));
    RETURN_STR(result);
}

/* Method: MyClass::__construct(string $name) */
PHP_METHOD(MyClass, __construct)
{
    zend_string *name;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(name)
    ZEND_PARSE_PARAMETERS_END();

    zend_update_property_str(myclass_ce, Z_OBJ_P(ZEND_THIS),
        "name", sizeof("name")-1, name);
}

/* Arginfo */
ZEND_BEGIN_ARG_INFO_EX(arginfo_myclass_construct, 0, 0, 1)
    ZEND_ARG_TYPE_INFO(0, name, IS_STRING, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_myclass_greet, 0, 0, IS_STRING, 0)
ZEND_END_ARG_INFO()

/* Method table */
static const zend_function_entry myclass_methods[] = {
    PHP_ME(MyClass, __construct, arginfo_myclass_construct, ZEND_ACC_PUBLIC)
    PHP_ME(MyClass, greet, arginfo_myclass_greet, ZEND_ACC_PUBLIC)
    PHP_FE_END
};

/* Register class in MINIT */
PHP_MINIT_FUNCTION(myext)
{
    zend_class_entry ce;
    INIT_CLASS_ENTRY(ce, "MyClass", myclass_methods);
    myclass_ce = zend_register_internal_class(&ce);

    /* Declare property: public string $name */
    zend_declare_property_null(myclass_ce, "name", sizeof("name")-1, ZEND_ACC_PUBLIC);

    /* Declare constant: MyClass::VERSION = 1 */
    zend_declare_class_constant_long(myclass_ce, "VERSION", sizeof("VERSION")-1, 1);

    return SUCCESS;
}
