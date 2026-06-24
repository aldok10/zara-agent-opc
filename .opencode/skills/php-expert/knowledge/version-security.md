# PHP Version Security Status (as of June 2026)

> Docs: https://www.php.net/supported-versions.php | EOL: https://www.php.net/eol.php | Changelog: https://www.php.net/ChangeLog-8.php | CVE: https://www.cvedetails.com/vendor/74/PHP.html

> **CRITICAL**: PHP versions receive 2 years active support + 2 years security-only.
> After EOL, NO patches are issued - even for critical vulnerabilities.

## Supported (receive security patches)

| Version | Release | Active Until | Security Until | Status |
|---------|---------|-------------|----------------|--------|
| **PHP 8.5.x** | Nov 2025 | Nov 2027 | Nov 2029 | ✅ Active (recommended) |
| **PHP 8.4.x** | Nov 2024 | Nov 2026 | Nov 2028 | ✅ Active |
| **PHP 8.3.x** | Nov 2023 | Nov 2025 | Dec 2027 | ⚠️ Security-only |
| **PHP 8.2.x** | Dec 2022 | Dec 2024 | Dec 2026 | ⚠️ Security-only (EOL end of 2026!) |

## End-of-Life (NO security patches - VULNERABLE)

| Version | EOL Since | Risk |
|---------|-----------|------|
| PHP 8.1 | Dec 2025 | 🚨 Recently EOL - unpatched 6+ months |
| PHP 8.0 | Nov 2023 | 🛑 CRITICAL - 2.5+ years without patches |
| PHP 7.4 | Nov 2022 | 🛑 CRITICAL - 3.5+ years, dozens of unpatched CVEs |
| PHP 7.3 and below | - | 🛑 CRITICAL - ancient, actively exploited vulnerabilities |

## Warning Rules for AI Agent

When you detect the project's PHP version:

1. **composer.json requires `php: ^8.2`** and it's late 2026 → WARN:
   > ⚠️ **PHP 8.2 reaches EOL December 2026.** Plan upgrade to PHP 8.4+ before year-end.

2. **composer.json requires `php: ^8.1` or `php: 8.1.*`** → HARD WARNING:
   > 🚨 **PHP 8.1 is EOL (no security patches since Dec 2025).** Known CVEs are unpatched. Upgrade to PHP 8.4+ immediately.

3. **composer.json requires `php: ^8.0` or lower** → CRITICAL:
   > 🛑 **CRITICAL SECURITY RISK: PHP 8.0 has 2.5+ years of unpatched vulnerabilities.** Do not deploy to production. Upgrade to PHP 8.4+.

4. **Any PHP 7.x detected** → CRITICAL EMERGENCY:
   > 🛑 **EMERGENCY: PHP 7.x has been EOL for years with DOZENS of unpatched CVEs including remote code execution vulnerabilities.** This is an active security incident waiting to happen. Upgrade to PHP 8.4+ IMMEDIATELY.

5. **Using a patch version with known CVE** (e.g., `8.4.0` when `8.4.23` exists) → WARN:
   > ⚠️ **PHP 8.4.0 has known security fixes in later patches.** Update to the latest patch: `8.4.23+`

## Framework EOL (also check)

| Framework | EOL Version | Current |
|-----------|-------------|---------|
| Laravel 10 | Feb 2026 (security EOL) | ⚠️ Upgrade to Laravel 11+ |
| Laravel 9 | Feb 2024 | 🛑 EOL - upgrade |
| Symfony 6.4 LTS | Nov 2027 | ✅ Safe |
| Symfony 5.4 LTS | Nov 2025 | 🚨 EOL - upgrade |

## How to Check

```bash
# Check PHP version
php -v

# Check composer.json constraint
grep '"php"' composer.json

# Check for known vulnerabilities
composer audit

# Block vulnerable packages at install time
composer require --dev roave/security-advisories:dev-latest
```

## References
- [PHP Supported Versions](https://www.php.net/supported-versions.php)
- [PHP Changelogs](https://www.php.net/ChangeLog-8.php)
- [endoflife.date/php](https://endoflife.date/php)
- [Composer Audit](https://getcomposer.org/doc/03-cli.md#audit)
