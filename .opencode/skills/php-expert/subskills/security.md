# PHP Security Subskill

## Activation Triggers
- SQL injection, XSS, CSRF, authentication, encryption, file upload, headers
- "Is this secure", "harden", "vulnerability", password hashing, secrets

## Senior DNA
- Security is not a feature. It's a constraint on every feature.
- Prepared statements are non-negotiable. No exceptions. Ever.
- Use sodium for crypto. If you're using openssl directly, you're probably doing it wrong.
- NEVER: unserialize user input, eval, extract, shell_exec with user data.

---

## SQL Injection Prevention

```php
// ALWAYS prepared statements
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email AND status = :status');
$stmt->execute(['email' => $email, 'status' => $status]);

// NEVER string interpolation
$pdo->query("SELECT * FROM users WHERE email = '$email'"); // VULNERABLE

// Dynamic column/table names - whitelist only
$allowed = ['name', 'email', 'created_at'];
$column = in_array($sort, $allowed, true) ? $sort : 'created_at';
$stmt = $pdo->prepare("SELECT * FROM users ORDER BY {$column} LIMIT ?");
```

---

## XSS Prevention

```php
// Output encoding - context-dependent
echo htmlspecialchars($userInput, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// In Blade/Twig - auto-escaped by default
{{ $variable }}  // Escaped
{!! $variable !!}  // Raw - ONLY for trusted HTML

// Content Security Policy header
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{$nonce}'");
```

---

## CSRF Protection

```php
// Token generation
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Validation
if (!hash_equals($_SESSION['csrf_token'], $_POST['_token'] ?? '')) {
    throw new CsrfMismatch();
}

// SameSite cookie (defense in depth)
session_set_cookie_params([
    'samesite' => 'Lax',  // or 'Strict' for sensitive actions
    'httponly' => true,
    'secure' => true,
]);
```

---

## Authentication

```php
// Password hashing - Argon2id preferred
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,  // 64MB
    'time_cost' => 4,
    'threads' => 3,
]);

// Verification - timing-safe internally
if (!password_verify($inputPassword, $storedHash)) {
    throw new InvalidCredentials();
}

// Rehash check (algorithm/cost upgrade)
if (password_needs_rehash($storedHash, PASSWORD_ARGON2ID)) {
    $newHash = password_hash($inputPassword, PASSWORD_ARGON2ID);
    $user->updatePassword($newHash);
}

// Timing-safe comparison for tokens
if (!hash_equals($expectedToken, $providedToken)) {
    throw new InvalidToken();
}
```

---

## Cryptography

```php
// Symmetric encryption - sodium secretbox (XSalsa20-Poly1305)
$key = sodium_crypto_secretbox_keygen();
$nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
$ciphertext = sodium_crypto_secretbox($plaintext, $nonce, $key);
$decrypted = sodium_crypto_secretbox_open($ciphertext, $nonce, $key);

// Asymmetric - sodium box (X25519 + XSalsa20-Poly1305)
$aliceKeypair = sodium_crypto_box_keypair();
$bobKeypair = sodium_crypto_box_keypair();

// Random values
$token = bin2hex(random_bytes(32));   // 64-char hex token
$code = random_int(100000, 999999);   // 6-digit OTP

// HKDF for key derivation
$derived = hash_hkdf('sha256', $masterKey, 32, 'encryption-key', $salt);
```

Never use: `rand()`, `mt_rand()`, `md5()`, `sha1()` for security purposes.

---

## File Upload Security

```php
// MIME validation via finfo (not file extension!)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES['upload']['tmp_name']);
$allowed = ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mime, $allowed, true)) {
    throw new InvalidFileType();
}

// Random filename - never use user-provided name
$filename = bin2hex(random_bytes(16)) . '.' . $extension;

// Store outside webroot
$destination = '/var/app/storage/uploads/' . $filename;
move_uploaded_file($_FILES['upload']['tmp_name'], $destination);

// Size limits
if ($_FILES['upload']['size'] > 5 * 1024 * 1024) {
    throw new FileTooLarge();
}
```

---

## Security Headers

```php
header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'");
```

---

## php.ini Hardening

```ini
expose_php = Off
display_errors = Off
log_errors = On
open_basedir = /var/www/app:/tmp
disable_functions = exec,passthru,shell_exec,system,proc_open,popen
allow_url_fopen = Off
allow_url_include = Off
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
session.cookie_samesite = Lax
```

---

## Dependency Security

```bash
# Check for known vulnerabilities
composer audit

# Prevent installing packages with known vulnerabilities
composer require --dev roave/security-advisories:dev-latest
```

---

## NEVER Do This

| Dangerous | Why | Alternative |
|-----------|-----|-------------|
| `unserialize($userInput)` | RCE via object injection | `json_decode()` |
| `eval($code)` | Arbitrary code execution | Restructure logic |
| `extract($_POST)` | Variable injection | Explicit assignment |
| `shell_exec($userInput)` | Command injection | `escapeshellarg()` or avoid |
| `include $userInput` | Local file inclusion | Whitelist allowed files |
| `preg_replace('/.*/e', ...)` | Code execution (removed in 7.0) | `preg_replace_callback()` |
