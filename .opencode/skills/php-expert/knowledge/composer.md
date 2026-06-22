# Composer Best Practices

## Lock File
- **Applications**: always commit `composer.lock`
- **Libraries**: do NOT commit lock (consumers resolve independently)
- CI: always `composer install` (from lock), never `composer update`

## Version Constraints
- `^1.2.3` - allows minor+patch (recommended default)
- `~1.2.3` - allows patch only (conservative)
- Exact `1.2.3` - avoid (blocks security patches)

## Production Deploy
```bash
composer install --no-dev --optimize-autoloader --classmap-authoritative
```

## Autoloading
```json
{"autoload": {"psr-4": {"App\\": "src/"}}}
```

## Security
```bash
composer audit                  # check vulnerabilities
```
```json
{"require-dev": {"roave/security-advisories": "dev-latest"}}
```

## Config
```json
{
  "config": {
    "sort-packages": true,
    "platform": {"php": "8.3"},
    "optimize-autoloader": true
  },
  "prefer-stable": true
}
```
