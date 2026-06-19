# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email the project maintainers directly
3. Include as much detail as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

You should receive a response within 48 hours. If you don't, please follow up.

## Security Best Practices

### For Users

1. **API Keys**: Never commit API keys to version control. Use `.env` files.
2. **Environment Isolation**: Use separate environments for development and production.
3. **Command Restrictions**: Configure `ZARA_ALLOWED_COMMANDS` and `ZARA_BLOCKED_COMMANDS` appropriately.
4. **Memory Data**: Journal files contain session data. Review before sharing.
5. **Network Access**: Context7 MCP server requires network access. Configure firewall rules accordingly.

### For Contributors

1. **No Secrets in Code**: Never include API keys, tokens, or credentials in code.
2. **Environment Variables**: Use `process.env` or `${VAR:-default}` patterns.
3. **Review Diffs**: Check all diffs for accidentally committed secrets.
4. **Dependencies**: Keep dependencies updated. Use `npm audit` regularly.

## Security Checklist

- [ ] No API keys in source code
- [ ] No hardcoded credentials
- [ ] No internal URLs exposed
- [ ] Environment variables for sensitive config
- [ ] .gitignore excludes .env, secrets, memory files
- [ ] Command execution is restricted
- [ ] Dependencies are up to date
- [ ] No personal/company references in public code
