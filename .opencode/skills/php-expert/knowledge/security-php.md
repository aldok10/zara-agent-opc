---
type: fact
title: "PHP Security - OWASP, Input Validation, Session, Crypto"
---

# PHP Security

> Security in PHP requires active defense. The language has evolved significantly, but legacy patterns and type coercion still create traps. Treat all external input as hostile.

## OWASP Top 10 - PHP-Specific Mitigations

### A01: Broken Access Control

```php
// Always verify ownership, never trust route params alone
$document = $repository->find($request->get('id'));
if ($document->getUserId() !== $currentUser->getId()) {
    throw new AccessDeniedHttpException();
}

// Use attribute-based access control (Symfony voter pattern)
#[IsGranted('DOCUMENT_EDIT', subject: 'document')]
public function edit(Document $document): Response { /* ... */ }
```

### A02: Cryptographic Failures

- Never use `md5()`, `sha1()` for passwords or tokens
- Use `random_bytes()` / `random_int()` for crypto-safe randomness
- Store secrets in environment variables, never in code

### A03: Injection

Covered in SQL injection and XSS sections below.

### A04: Insecure Design

- Rate limit authentication endpoints (token bucket, sliding window)
- Implement account lockout after N failed attempts
- Use CAPTCHA on public forms after threshold

### A05: Security Misconfiguration

```ini
; php.ini production hardening
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log
allow_url_fopen = Off        ; unless explicitly needed
allow_url_include = Off
disable_functions = exec,passthru,shell_exec,system,proc_open,popen
open_basedir = /srv/app:/tmp
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
```

## Input Validation

### filter_var

```php
// Email validation
$email = filter_var($input, FILTER_VALIDATE_EMAIL);
if ($email === false) {
    throw new ValidationException('Invalid email');
}

// Integer with range
$age = filter_var($input, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => 150]
]);

// URL validation
$url = filter_var($input, FILTER_VALIDATE_URL);
// CAUTION: passes javascript: URLs! Always also check scheme:
if (!in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
    throw new ValidationException('Invalid URL scheme');
}
```

### Type Coercion Traps

```php
// DANGER: loose comparison
'0' == false;   // true
'' == false;    // true
'0e123' == '0e456'; // true (both "zero" in scientific notation)
null == false;  // true

// ALWAYS use strict comparison
'0' === false;  // false (correct)

// in_array needs strict flag
in_array('0', ['admin', 'user'], true); // strict = true

// JSON decode: always validate structure after decode
$data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
if (!isset($data['expected_key']) || !is_string($data['expected_key'])) {
    throw new ValidationException('Malformed payload');
}
```

### Typed Properties as Validation

```php
// PHP 8.4: use the type system as first defense
readonly class CreateUserRequest {
    public function __construct(
        public string $email,
        public string $name,
        public int $age,
    ) {
        // Secondary validation after type safety
        if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email format');
        }
        if ($this->age < 0 || $this->age > 150) {
            throw new ValidationException('Age out of range');
        }
    }
}
```

## Session Security

```php
// Session configuration (set before session_start)
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');  // or 'Strict' for sensitive apps
ini_set('session.use_strict_mode', '1');     // reject uninitialized session IDs
ini_set('session.use_only_cookies', '1');    // no session ID in URL
ini_set('session.gc_maxlifetime', '1800');   // 30 min inactivity timeout
ini_set('session.cookie_lifetime', '0');     // session cookie (dies with browser)

// Regeneration on privilege change
session_regenerate_id(true); // true = delete old session file

// Anti-fixation: regenerate after login
public function login(string $email, string $password): void {
    $user = $this->authenticate($email, $password);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user->getId();
    $_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];       // optional fingerprint
    $_SESSION['ua_hash'] = hash('xxh3', $_SERVER['HTTP_USER_AGENT']);
}
```

## CSRF Protection

```php
// Token generation (store in session)
function generateCsrfToken(): string {
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

// Validation
function validateCsrfToken(string $submitted): void {
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $submitted)) {
        throw new SecurityException('CSRF validation failed');
    }
    // Rotate token after use (one-time tokens)
    unset($_SESSION['csrf_token']);
}
```

For SPA/API: use `SameSite=Strict` cookies + custom header check (`X-Requested-With`) as CSRF is cookie-based.

## SQL Injection Prevention

### PDO Prepared Statements

```php
// CORRECT: parameterized
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email AND status = :status');
$stmt->execute(['email' => $email, 'status' => $status]);

// CORRECT: positional
$stmt = $pdo->prepare('SELECT * FROM products WHERE price > ? AND category_id = ?');
$stmt->execute([$minPrice, $categoryId]);

// WRONG: string interpolation (SQL injection)
$pdo->query("SELECT * FROM users WHERE email = '$email'"); // NEVER

// Dynamic column/table names (can't parameterize identifiers):
$allowed = ['name', 'email', 'created_at'];
$column = in_array($input, $allowed, true) ? $input : 'created_at';
$stmt = $pdo->prepare("SELECT * FROM users ORDER BY {$column} ASC");
```

### Doctrine DBAL

```php
$qb = $connection->createQueryBuilder();
$qb->select('u.*')
    ->from('users', 'u')
    ->where('u.email = :email')
    ->andWhere('u.role IN (:roles)')
    ->setParameter('email', $email)
    ->setParameter('roles', $roles, ArrayParameterType::STRING);
```

## XSS Prevention

### Output Encoding

```php
// HTML context
echo htmlspecialchars($userInput, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// Twig auto-escapes by default (disable only with |raw, and audit every use)
{{ user.name }}          {# auto-escaped #}
{{ user.bio|raw }}       {# DANGEROUS: audit this #}

// JavaScript context: JSON encode into script blocks
<script>
    const userData = <?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
</script>

// URL context
echo 'href="' . htmlspecialchars(filter_var($url, FILTER_SANITIZE_URL)) . '"';
```

### Content-Security-Policy

```php
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.example.com");
```

Generate nonce per request: `$nonce = bin2hex(random_bytes(16));`

## Password Hashing

```php
// Hash with Argon2id (preferred) or bcrypt (fallback)
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,  // 64MB
    'time_cost' => 4,        // iterations
    'threads' => 3,
]);

// Verification
if (!password_verify($submittedPassword, $storedHash)) {
    throw new AuthenticationException('Invalid credentials');
}

// Rehash if algorithm/cost changed (upgrade path)
if (password_needs_rehash($storedHash, PASSWORD_ARGON2ID)) {
    $newHash = password_hash($submittedPassword, PASSWORD_ARGON2ID);
    $this->userRepository->updateHash($userId, $newHash);
}
```

Never truncate passwords before hashing. bcrypt silently truncates at 72 bytes—Argon2id does not.

## File Upload Security

```php
function handleUpload(array $file): string {
    // 1. Verify it's an actual upload
    if (!is_uploaded_file($file['tmp_name'])) {
        throw new SecurityException('Not a valid upload');
    }

    // 2. Check MIME type (don't trust $_FILES['type'])
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!in_array($mime, $allowed, true)) {
        throw new ValidationException('File type not allowed');
    }

    // 3. Generate random filename (prevent path traversal + enumeration)
    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    };
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;

    // 4. Store outside web root
    $destination = '/srv/uploads/' . $filename;
    move_uploaded_file($file['tmp_name'], $destination);

    // 5. Strip metadata from images (prevents EXIF-based attacks)
    if (str_starts_with($mime, 'image/')) {
        stripImageMetadata($destination);
    }

    return $filename;
}
```

Serve uploaded files through a controller that sets `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

## Sodium (libsodium) Cryptography

```php
// Symmetric encryption (XChaCha20-Poly1305)
$key = sodium_crypto_aead_xchacha20poly1305_ietf_keygen();
$nonce = random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);

$ciphertext = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
    $plaintext, $additionalData, $nonce, $key
);

$decrypted = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
    $ciphertext, $additionalData, $nonce, $key
);

// Key exchange (X25519)
$serverKeypair = sodium_crypto_box_keypair();
$serverPublic = sodium_crypto_box_publickey($serverKeypair);

// Digital signatures (Ed25519)
$sigKeypair = sodium_crypto_sign_keypair();
$signature = sodium_crypto_sign_detached($message, sodium_crypto_sign_secretkey($sigKeypair));
$valid = sodium_crypto_sign_verify_detached($signature, $message, $publicKey);

// ALWAYS zero sensitive memory when done
sodium_memzero($key);
sodium_memzero($plaintext);
```

## Snuffleupagus Hardening

PHP runtime protection module (successor to Suhosin):

```ini
; snuffleupagus.ini
sp.disable_function.function("system").drop();
sp.disable_function.function("exec").drop();
sp.disable_function.function("eval").drop();

; Prevent type-juggling attacks
sp.auto_cookie_secure();
sp.sloppy_comparison.enable();    ; warn on ==

; Encrypt session cookie
sp.session.encryption();

; Virtual-patch a known vuln without code change
sp.disable_function.function("mail").param("to").value_r(".*@evil\.com").drop();

; Prevent file upload to sensitive directories
sp.readonly_exec.enable();
```

Snuffleupagus operates at the opcode level—zero performance overhead for most rules. Deploy in simulation mode first (`log` instead of `drop`) to catch false positives.
