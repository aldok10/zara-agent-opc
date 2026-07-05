# Git Security

Signing, secret protection, and credential management for git workflows.

## GPG Signing

### Setup

```bash
gpg --full-generate-key          # RSA 4096, no expiry or 2yr
gpg --list-secret-keys --keyid-format=long
# note the key ID after rsa4096/ (e.g., 3AA5C34371567BD2)

git config --global user.signingkey 3AA5C34371567BD2
git config --global commit.gpgsign true    # sign all commits
git config --global tag.gpgsign true       # sign all tags
```

### Export public key to GitHub

```bash
gpg --armor --export 3AA5C34371567BD2
# paste output to GitHub > Settings > SSH and GPG keys > New GPG key
```

### Verification

```bash
git log --show-signature          # shows Good/Bad signature
git verify-commit HEAD
git verify-tag v1.0.0
```

### Vigilant mode (GitHub)

Settings > SSH and GPG keys > "Flag unsigned commits as unverified". All commits without a valid signature show "Unverified" badge. Useful for high-security repos.

## SSH Signing (Git 2.34+)

Simpler alternative to GPG. Uses existing SSH keys.

### Setup

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

### Allowed signers file (for verification)

```bash
git config --global gpg.ssh.allowedSignersFile ~/.config/git/allowed_signers
```

Format of `allowed_signers`:
```
user@example.com ssh-ed25519 AAAAC3Nza...
```

### Verify

```bash
git verify-commit HEAD
# outputs: Good "git" signature for user@example.com
```

### SSH vs GPG

| Aspect | SSH | GPG |
|--------|-----|-----|
| Setup complexity | Low (reuse SSH key) | High (key management, trust model) |
| Web of trust | No | Yes (key signing parties) |
| Key rotation | Easy | Complex |
| GitHub support | Yes (2022+) | Yes |
| Offline verification | Requires allowed_signers | Key servers or local keyring |

## Secret Scanning: Pre-commit Hooks

### git-secrets (AWS)

```bash
brew install git-secrets
git secrets --install             # add hooks to current repo
git secrets --register-aws        # detect AWS key patterns

# custom patterns
git secrets --add 'PRIVATE.KEY'
git secrets --add --allowed 'PRIVATE_KEY_PLACEHOLDER'
```

### detect-secrets (Yelp)

```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline

# pre-commit hook
detect-secrets-hook --baseline .secrets.baseline
```

### pre-commit framework integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### truffleHog

Scans entire git history for high-entropy strings and known secret patterns:

```bash
trufflehog git file://. --only-verified
trufflehog git https://github.com/org/repo --since-commit abc123
```

## GitHub Secret Scanning

### How it works

GitHub scans pushed commits against known secret patterns from partner programs (AWS, GCP, Stripe, etc.). Alerts appear in Security tab > Secret scanning alerts.

### Push protection

Settings > Code security > Secret scanning > Push protection.

When enabled: pushes containing detected secrets are **blocked** at the server. Developer sees the alert and must either:
1. Remove the secret and push again.
2. Mark as false positive or used in tests (creates an audit trail).

### Custom patterns

Security tab > Secret scanning > Custom patterns. Define regex patterns for internal secrets (internal API keys, proprietary tokens).

## Dependabot

### Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 10
    reviewers:
      - org/security-team
    labels:
      - dependencies
    groups:
      dev-deps:
        dependency-type: development
        update-types: [minor, patch]
      prod-deps:
        dependency-type: production

  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
```

### Grouping (reduce PR noise)

Group related updates into single PRs. Group by: dependency type, update type (major/minor/patch), or pattern matching on package names.

### Security updates vs version updates

- **Security updates**: automatic PRs for known vulnerabilities (always on for public repos).
- **Version updates**: keep dependencies current regardless of CVEs (opt-in via config).

## Credential Helpers

Store credentials so you don't re-enter them.

| Helper | Behavior | Platform |
|--------|----------|----------|
| `cache` | In-memory, expires (default 15min) | All |
| `store` | Plaintext file (`~/.git-credentials`) | All (insecure) |
| `osxkeychain` | macOS Keychain | macOS |
| `manager` | Git Credential Manager (GCM) | All |

```bash
git config --global credential.helper osxkeychain    # macOS
git config --global credential.helper manager        # cross-platform (GCM)
git config --global credential.helper 'cache --timeout=3600'
```

### Git Credential Manager (GCM)

Supports: GitHub, Azure DevOps, GitLab, Bitbucket. Handles OAuth, PATs, and device flow. Stores in platform keychain.

```bash
brew install git-credential-manager   # macOS
# or bundled with Git for Windows
```

## Emergency: Secret Leaked

### Immediate steps

1. **Rotate the secret immediately.** This is the only guaranteed fix. Removing from history does not help if anyone already cloned.
2. **Revoke the old credential** in the service's dashboard.
3. **Audit usage**: check access logs for the compromised credential.

### Remove from history (defense in depth)

```bash
git clone --mirror https://github.com/org/repo.git
cd repo.git
git filter-repo --replace-text expressions.txt --force
# expressions.txt contains: leaked-secret==>REDACTED
git push --mirror
```

### Post-cleanup

- All collaborators must re-clone (history rewritten, SHAs changed).
- Force-push required if not using mirror push.
- GitHub caches: contact GitHub support to purge cached views.
- Check CI/CD caches, Docker layers, artifact stores for the leaked value.

### Prevention checklist

1. `.gitignore` covers `.env`, `*.pem`, `*.key`, credentials files.
2. Pre-commit hook with secret scanning.
3. GitHub push protection enabled.
4. Environment variables or secret managers for runtime secrets.
5. Never hardcode secrets, even "temporarily".
