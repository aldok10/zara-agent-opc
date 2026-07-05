---
type: fact
title: "Immutable Infrastructure Patterns"
---

# Immutable Infrastructure Patterns

Once deployed, infrastructure components are never modified in place — replaced entirely on change.

## Core Principle

Mutable: SSH in, patch, reconfigure, drift accumulates.
Immutable: build new image, deploy it, destroy old instance. No drift possible.

## Golden Image Pattern

Build machine images (AMI, GCE Image, Azure Managed Image) with everything baked in:

### Build Pipeline

1. Start from minimal base OS (Ubuntu Server, Amazon Linux)
2. Apply security hardening (CIS benchmark, SSH lockdown)
3. Install application runtime and dependencies
4. Embed application artifact (binary, JAR, bundle)
5. Run validation tests against the image
6. Publish to image registry with semantic version tag

### Tools

| Tool | Purpose |
|------|---------|
| Packer | Multi-cloud image building with HCL config |
| EC2 Image Builder | AWS-native pipeline with lifecycle management |
| Ansible (provisioner) | Configuration during image build only |

### Versioning Strategy

- Tag images with git SHA + build timestamp: `app-v1.2.3-abc1234-20240115`
- Retain last N images for rollback (minimum 3 production versions)
- Automate cleanup of images older than retention policy

## Container-Based Immutability

Containers enforce immutability at application layer:

### Dockerfile Discipline

- Pin base image digests, not tags (`FROM node:20@sha256:abc...`)
- Multi-stage builds: build stage (has tools) → runtime stage (minimal)
- Read-only root filesystem at runtime (`--read-only` flag)
- No package managers in production image (remove apt/yum after install)

### Runtime Enforcement

```yaml
# Kubernetes security context
securityContext:
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  capabilities:
    drop: ["ALL"]
```

Writable paths limited to explicit `emptyDir` volumes for temp files.

### Registry Hygiene

- Scan images for CVEs before promotion (Trivy, Grype)
- Sign images with cosign/Notary for supply chain integrity
- Separate registries per environment: dev → staging → production promotion

## Blue-Green with Immutable Config

### Deployment Model

1. Build new version (image or container)
2. Deploy alongside current (green live, blue idle)
3. Run smoke tests against blue
4. Switch traffic to blue (load balancer, DNS, service mesh)
5. Monitor for errors; rollback = switch back to green
6. Destroy old green after confirmation period

### Configuration Injection

Since images are immutable, configuration enters at deploy time:

| Method | Use Case |
|--------|----------|
| Environment variables | Simple key-value config, feature flags |
| Mounted secrets | Credentials, TLS certs (Vault, Sealed Secrets) |
| ConfigMaps | Application config files, non-sensitive |
| Parameter Store / SSM | Hierarchical config with versioning |

**Rule**: config changes trigger new deployment (even without code change). Treat config as code.

## Data and State Considerations

Immutable infrastructure requires externalizing all state:

- Application state → database or cache (Redis, PostgreSQL)
- Session state → external session store (never local disk)
- Logs → shipped externally (stdout → collector → storage)
- Uploads → object storage (S3, GCS, Azure Blob)

If a service stores anything locally that matters, it cannot be immutable.

## Rollback Strategy

| Strategy | Speed | Risk |
|----------|-------|------|
| Repoint load balancer to old instances | Seconds | Old instances must still be running |
| Redeploy previous image version | Minutes | Depends on deploy pipeline speed |
| DNS failover to old stack | Minutes | TTL propagation delay |

Best practice: keep previous version running (scaled to zero or minimum) for instant rollback during bake period.

## Migration Path (Mutable → Immutable)

1. **Inventory**: identify all in-place modifications (cron jobs, config changes, patches)
2. **Externalize state**: move logs, sessions, uploads to external services
3. **Codify configuration**: capture all config in version control
4. **Build pipeline**: create automated image/container build process
5. **Test parity**: verify new image matches existing instance behavior
6. **Parallel run**: deploy immutable alongside mutable, compare
7. **Cut over**: route traffic to immutable, decommission mutable instances

## Anti-Patterns

- SSH into production containers/instances to "fix" things (breaks immutability guarantee)
- Mutable config files on persistent volumes (config drift returns)
- Images without version tags (`:latest` is not a version)
- Building images manually on developer laptops (not reproducible)
- Skipping image scanning ("we trust our base image")
- No rollback path (deploying new image without keeping previous available)
