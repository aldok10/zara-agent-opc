# References

## Injection Prevention (10 refs)
- **OWASP Injection Prevention** -- https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html -- Canonical injection mitigation guide
- **OWASP SQL Injection Prevention** -- https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html -- Parameterized queries and ORM safety
- **OWASP XSS Prevention** -- https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html -- Context-aware output encoding
- **CWE-89 SQL Injection** -- https://cwe.mitre.org/data/definitions/89.html -- Weakness enumeration for SQL injection
- **CWE-79 XSS** -- https://cwe.mitre.org/data/definitions/79.html -- Weakness enumeration for cross-site scripting
- **CWE-78 OS Command Injection** -- https://cwe.mitre.org/data/definitions/78.html -- OS command injection patterns
- **DOMPurify** -- https://github.com/cure53/DOMPurify -- XSS sanitizer for HTML and MathML
- **Trusted Types** -- https://web.dev/trusted-types/ -- Browser API to prevent DOM XSS
- **Content Security Policy** -- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -- HTTP header to mitigate XSS and injection
- **Prepared Statements** -- https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html -- Language-specific parameterized query examples

## Cryptography in Code (10 refs)
- **OWASP Cryptographic Storage** -- https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html -- Secure data-at-rest guidance
- **OWASP Password Storage** -- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html -- Hashing algorithms and work factors
- **Libsodium** -- https://doc.libsodium.org/ -- Modern, misuse-resistant cryptography library
- **Web Crypto API** -- https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API -- Browser-native cryptographic operations
- **Tink** -- https://developers.google.com/tink -- Google's multi-language cryptographic library
- **CWE-327 Broken Crypto** -- https://cwe.mitre.org/data/definitions/327.html -- Use of broken or risky cryptographic algorithm
- **CWE-328 Weak Hash** -- https://cwe.mitre.org/data/definitions/328.html -- Reversible one-way hash weakness
- **Argon2** -- https://github.com/P-H-C/phc-winner-argon2 -- Password Hashing Competition winner
- **Age Encryption** -- https://age-encryption.org/ -- Simple, modern file encryption tool and library
- **NIST SP 800-132** -- https://csrc.nist.gov/publications/detail/sp/800-132/final -- Recommendation for password-based key derivation

## Input Validation (10 refs)
- **OWASP Input Validation** -- https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html -- Server-side validation strategies
- **Zod** -- https://zod.dev/ -- TypeScript-first schema validation library
- **Joi** -- https://joi.dev/ -- JavaScript object schema validation
- **Pydantic** -- https://docs.pydantic.dev/ -- Python data validation using type annotations
- **CWE-20 Improper Input Validation** -- https://cwe.mitre.org/data/definitions/20.html -- Root weakness for many vulnerability classes
- **OWASP Mass Assignment** -- https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html -- Preventing over-binding attacks
- **OWASP File Upload** -- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html -- Secure file upload validation
- **JSON Schema** -- https://json-schema.org/ -- Declarative validation for JSON structures
- **OWASP Deserialization** -- https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html -- Safe deserialization patterns
- **class-validator** -- https://github.com/typestack/class-validator -- Decorator-based validation for TypeScript classes

## Memory Safety (10 refs)
- **Rust Book: Ownership** -- https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html -- Memory safety without garbage collection
- **CWE-119 Buffer Overflow** -- https://cwe.mitre.org/data/definitions/119.html -- Memory corruption vulnerability class
- **CWE-416 Use After Free** -- https://cwe.mitre.org/data/definitions/416.html -- Dangling pointer exploitation
- **AddressSanitizer** -- https://clang.llvm.org/docs/AddressSanitizer.html -- Memory error detector for C/C++
- **Valgrind** -- https://valgrind.org/ -- Memory debugging and profiling instrumentation
- **LLVM SafeStack** -- https://clang.llvm.org/docs/SafeStack.html -- Stack buffer overflow protection mechanism
- **SEI CERT C** -- https://wiki.sei.cmu.edu/confluence/display/c -- Secure coding standard for C language
- **SEI CERT C++** -- https://wiki.sei.cmu.edu/confluence/display/cplusplus -- Secure coding standard for C++ language
- **Microsoft SDL Banned Functions** -- https://learn.microsoft.com/en-us/previous-versions/bb288454(v=msdn.10) -- Unsafe C runtime functions to avoid
- **OSS-Fuzz** -- https://github.com/google/oss-fuzz -- Continuous fuzzing for open-source software
