# Git Security

Signing, secret prevention, dependency safety, and credential management.

## GPG/SSH Commit Signing

Proves authorship. Required by many teams for protected branches.

### SSH signing (simpler, recommended for GitHub)

```bash
# Configure
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true     # sign all commits
git config --global tag.gpgsign true        # sign all tags

# Upload public key to GitHub: Settings > SSH and GPG keys > "Signing Key"
```

### GPG signing (traditional, works everywhere)

```bash
gpg --full-generate-key               # RSA 4096 or ed25519
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey <KEY-ID>
git config --global commit.gpgsign true
# export public key and add to GitHub
gpg --armor --export <KEY-ID>
```

### Verification

```bash
git log --show-signature              # check signatures
git verify-commit <sha>
git verify-tag v1.0.0
```

**Vigilant mode** (GitHub): all unsigned commits show "Unverified". Enable in Settings > SSH and GPG keys. Forces team to sign everything.

## Secret Scanning

### GitHub push protection

Blocks pushes containing detected secrets (tokens, keys, passwords). Enabled per-repo or org-wide.

If blocked: remove the secret from your commit (`git reset --soft HEAD~1`, remove secret, recommit), then rotate the exposed credential.

### Custom patterns

Settings > Code security > Secret scanning > Custom patterns. Use regex to catch internal token formats: `MYAPP_[A-Z0-9]{32}`.

### git-secrets (local pre-commit)

```bash
# Install
brew install git-secrets

# Configure for AWS patterns
git secrets --register-aws
git secrets --install                  # adds hooks to .git/hooks

# Add custom patterns
git secrets --add 'PRIVATE_KEY'
git secrets --add --allowed 'PRIVATE_KEY_PATH'  # false-positive allowlist

# Scan existing repo
git secrets --scan
```

## Dependency Graph + Dependabot

### Dependency graph

Auto-detected from lockfiles (package-lock.json, go.sum, Cargo.lock, etc). Shows transitive deps. View: Insights > Dependency graph.

### Dependabot alerts

Notifies when a dependency has a known CVE. Settings > Code security > Enable Dependabot alerts.

### Dependabot auto-PRs

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    groups:
      dev-deps:
        dependency-type: development
      prod-deps:
        dependency-type: production
    commit-message:
      prefix: "deps"
    reviewers:
      - "org/platform"
```

Grouping reduces PR noise. Pin to weekly or monthly to avoid constant churn.

## .gitignore for Security

Always ignore:

```gitignore
# Secrets and credentials
.env
.env.*
!.env.example
*.pem
*.key
*.p12
credentials.json
service-account*.json

# IDE and OS (may contain paths/tokens)
.idea/
.vscode/settings.json
.DS_Store

# Build artifacts that may embed secrets
dist/
.next/
```

Create `.env.example` with placeholder values (no real secrets) for team onboarding.

## Credential Management

### Credential helpers

```bash
# macOS -- store in Keychain
git config --global credential.helper osxkeychain

# Linux -- cache in memory (15 min default)
git config --global credential.helper 'cache --timeout=3600'

# Linux -- store in encrypted file (libsecret)
git config --global credential.helper /usr/lib/git-core/git-credential-libsecret
```

### HTTPS vs SSH

| | HTTPS | SSH |
|--|-------|-----|
| Setup | Token-based, simpler for CI | Key pair, agent forwarding |
| Firewall | Port 443, rarely blocked | Port 22, sometimes blocked |
| CI/CD | PAT or GITHUB_TOKEN | Deploy keys (read-only by default) |
| Rotation | Token expiry built-in | Manual key rotation |

Prefer SSH for developer machines. Prefer HTTPS + short-lived tokens for CI.

## CODEOWNERS as Security Control

Use CODEOWNERS to require security team review on sensitive paths:

```
/src/auth/          @org/security
/src/crypto/        @org/security
/.github/workflows/ @org/platform @org/security
Dockerfile*         @org/security
*.tf                @org/security @org/platform
```

Combine with branch protection "Require review from Code Owners" to enforce.

## Signed Tags for Release Integrity

```bash
# Create signed tag
git tag -s v1.0.0 -m "Release 1.0.0"

# Verify
git verify-tag v1.0.0

# Push
git push origin v1.0.0
```

Downstream consumers can verify release authenticity. Pair with checksums and SBOMs for supply chain security.

## Emergency: Secret Committed

1. **Rotate immediately** -- the secret is compromised the moment it hits remote.
2. Purge from history: `git filter-repo --invert-paths --path .env`
3. Force-push all branches (coordinate with team).
4. Tell collaborators to re-clone (their reflog still has the secret).
5. Check GitHub audit log for who may have pulled.
6. If the secret was ever on GitHub (even briefly): treat it as public.
