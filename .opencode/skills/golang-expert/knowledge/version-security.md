# Go Version Security Status (as of June 2026)

> **CRITICAL**: Only the latest 2 major releases receive security patches.
> Go releases every 6 months. Older versions are UNSUPPORTED and vulnerable.

## Supported (receive security patches)

| Version | Release | Status |
|---------|---------|--------|
| **Go 1.26.x** | Feb 2026 | ✅ Active (current) |
| **Go 1.25.x** | Aug 2025 | ✅ Security fixes only |

## End-of-Life (NO security patches — VULNERABLE)

| Version | EOL Since | Risk |
|---------|-----------|------|
| Go 1.24.x | Feb 2026 | ⚠️ Recently EOL — upgrade immediately |
| Go 1.23.x | Aug 2025 | 🚨 No patches for 10+ months |
| Go 1.22.x | Feb 2025 | 🚨 No patches for 16+ months |
| Go 1.21.x | Aug 2024 | 🛑 CRITICAL — 22+ months without patches |
| Go 1.20 and below | — | 🛑 CRITICAL — years without patches |

## Warning Rules for AI Agent

When you detect the project's Go version:

1. **go.mod says `go 1.24` or lower** → WARN:
   > ⚠️ **Go 1.24 is EOL (no security patches since Feb 2026).** Upgrade to Go 1.25+ for security fixes. Run: `go mod edit -go=1.26`

2. **go.mod says `go 1.22` or lower** → HARD WARNING:
   > 🚨 **Go 1.22 has been EOL for 16+ months. Known CVEs are unpatched.** This is a security risk. Upgrade immediately to Go 1.26.

3. **go.mod says `go 1.20` or lower** → CRITICAL:
   > 🛑 **CRITICAL SECURITY RISK: Go 1.20 and below have YEARS of unpatched vulnerabilities.** Do not deploy to production. Upgrade to Go 1.26 immediately.

4. **Using a patch version with known CVE** (e.g., `go 1.26.0` when `1.26.4` exists) → WARN:
   > ⚠️ **Go 1.26.0 has known security fixes in 1.26.4.** Update: `go install golang.org/dl/go1.26.4@latest` or update your Docker base image.

## How to Check

```bash
# Check current Go version
go version

# Check go.mod target
grep "^go " go.mod

# Check for known vulnerabilities in dependencies
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

## References
- [Go Release Policy](https://go.dev/doc/devel/release)
- [Go Security](https://go.dev/security)
- [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
