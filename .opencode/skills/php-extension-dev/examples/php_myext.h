/* php_myext.h - Minimal extension header */
#ifndef PHP_MYEXT_H
#define PHP_MYEXT_H

extern zend_module_entry myext_module_entry;
#define phpext_myext_ptr &myext_module_entry
#define PHP_MYEXT_VERSION "1.0.0"

#endif
