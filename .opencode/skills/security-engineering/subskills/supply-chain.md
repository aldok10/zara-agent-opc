# Subskill: Supply Chain Security

> Activate when: SBOM, dependency, lockfile, pin, Sigstore, cosign, typosquat, transitive dep, Dependabot, Renovate, Trivy, container image, base image, provenance.

**Core**: You inherit the security of everything you import. OWASP A03 (Supply Chain) and A06 (Vulnerable Components) are now top-tier risks. Know exactly what you ship and verify its provenance.

## SBOM (Software Bill of Materials)

- Generate on every build. Standards: **CycloneDX** (security-focused, rich vuln metadata) or **SPDX** (license-focused, ISO standard).
- Tools: `syft` (generate), `cyclonedx-*` plugins, `trivy sbom`.
- Store SBOM as a build artifact; feed into continuous vuln scanning so new CVEs against shipped deps are caught post-release.

## Dependency Pinning & Lockfiles

- Pin exact versions, never floating ranges (`^`, `~`, `latest`).
- Commit lockfiles: `package-lock.json`/`pnpm-lock.yaml`, `go.sum`, `poetry.lock`/`requirements.txt` with hashes, `composer.lock`, `Cargo.lock`.
- Use hash-pinned installs where supported (`pip install --require-hashes`, `go.sum`, npm integrity hashes).
- Pin CI actions/images by digest (`@sha256:...`), not mutable tags.

## Verification (Sigstore / cosign)

```
cosign sign   $IMAGE            # keyless, OIDC identity, logged to Rekor
cosign verify $IMAGE --certificate-identity ... --certificate-oidc-issuer ...
```
- Sigstore provides keyless signing + transparency log (Rekor). Verify signatures + provenance (SLSA attestations) before deploy.
- Enforce with admission control (Kyverno/Gatekeeper/cosign policy) — reject unsigned images.

## Typosquatting Detection

- Verify package names character-by-character; attackers register `reqeusts`, `lodahs`, `python-sqlite`.
- Check publish date, download counts, maintainer history before adding a new dep.
- Prefer well-known, actively maintained packages. Flag unusual names for human review.
- Use scoped/namespaced packages and internal registries with allowlists.

## Transitive Dependency Auditing

- Most risk hides in transitive deps. Audit the full tree: `npm audit`, `pnpm audit`, `govulncheck`, `pip-audit`, `composer audit`, `cargo audit`.
- `govulncheck` is call-graph aware (only flags reachable vulns) — prefer it for Go.
- Dependency confusion: ensure private scopes cannot be shadowed by public registry packages.

## Automated Updates

- **Dependabot** or **Renovate** for automated PRs. Renovate offers grouping, scheduling, auto-merge for patch-level with passing tests.
- Gate auto-merge on green CI + no new advisories.

## Container Image Scanning

- Scan with **Trivy** (or Grype) in CI and at registry: `trivy image --severity HIGH,CRITICAL --exit-code 1 $IMAGE`.
- **Base image selection**: prefer minimal/distroless or `-slim`; fewer packages = smaller attack surface. Pin base by digest. Rebuild regularly to pull patched layers.
- Run as non-root, read-only root FS, drop capabilities.

## Verification

- SBOM generated + archived.
- Vuln scan (deps + image) green, HIGH/CRITICAL blocking.
- Signatures/attestations verified pre-deploy.

## Delegates To

- **platform-engineering** — CI/CD enforcement, admission control.
- **@shield** — reviewing dependency risk decisions.
