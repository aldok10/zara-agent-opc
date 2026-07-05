# References

## Official Docker Documentation (8 refs)
- **Docker Docs** -- https://docs.docker.com/ -- Complete reference for Docker Engine, CLI, and ecosystem
- **Dockerfile Reference** -- https://docs.docker.com/reference/dockerfile/ -- All instructions for building container images
- **Docker Compose** -- https://docs.docker.com/compose/ -- Multi-container application definition and orchestration
- **Docker CLI Reference** -- https://docs.docker.com/reference/cli/docker/ -- Command reference for docker client
- **Docker Hub** -- https://docs.docker.com/docker-hub/ -- Registry operations, automated builds, access tokens
- **Docker Security** -- https://docs.docker.com/engine/security/ -- Namespaces, cgroups, capabilities, seccomp profiles
- **Docker Networking** -- https://docs.docker.com/engine/network/ -- Bridge, host, overlay, macvlan drivers
- **Docker Storage** -- https://docs.docker.com/engine/storage/ -- Volumes, bind mounts, tmpfs, storage drivers

## BuildKit (6 refs)
- **BuildKit GitHub** -- https://github.com/moby/buildkit -- Next-gen build engine with concurrent builds
- **BuildKit Dockerfile Frontend** -- https://docs.docker.com/build/buildkit/ -- Syntax extensions, cache mounts, secrets
- **Docker Build Cache** -- https://docs.docker.com/build/cache/ -- Layer caching strategies and cache backends
- **Multi-stage Builds** -- https://docs.docker.com/build/building/multi-stage/ -- Reducing image size with staged builds
- **Build Secrets** -- https://docs.docker.com/build/building/secrets/ -- Passing secrets during build without leaking
- **Docker Bake** -- https://docs.docker.com/build/bake/ -- High-level build orchestration with HCL/JSON

## Multi-Architecture (5 refs)
- **Multi-platform Builds** -- https://docs.docker.com/build/building/multi-platform/ -- Building images for multiple CPU architectures
- **docker buildx** -- https://docs.docker.com/build/builders/ -- Extended build capabilities with BuildKit
- **QEMU Emulation** -- https://docs.docker.com/build/building/multi-platform/#qemu -- Cross-architecture emulation for builds
- **Manifest Lists** -- https://docs.docker.com/reference/cli/docker/manifest/ -- Multi-arch image index management
- **tonistiigi/binfmt** -- https://github.com/tonistiigi/binfmt -- QEMU binary format registration for multi-arch

## Supply Chain Security (8 refs)
- **Chainguard Images** -- https://www.chainguard.dev/chainguard-images -- Minimal, zero-CVE base images
- **cosign** -- https://docs.sigstore.dev/cosign/overview/ -- Container image signing and verification
- **Docker Scout** -- https://docs.docker.com/scout/ -- Image vulnerability analysis and policy evaluation
- **Trivy** -- https://aquasecurity.github.io/trivy/ -- Vulnerability scanner for containers and filesystems
- **Grype** -- https://github.com/anchore/grype -- Container vulnerability scanner by Anchore
- **SLSA for Containers** -- https://slsa.dev/spec/v1.0/ -- Supply chain integrity framework
- **Notation** -- https://notaryproject.dev/ -- OCI artifact signing (CNCF Notary Project)
- **Docker Content Trust** -- https://docs.docker.com/engine/security/trust/ -- Image signing with Notary v1

## Container Runtimes (5 refs)
- **containerd** -- https://containerd.io/docs/ -- Industry-standard container runtime
- **runc** -- https://github.com/opencontainers/runc -- OCI-compliant container runtime
- **OCI Image Spec** -- https://github.com/opencontainers/image-spec -- Open Container Initiative image format
- **OCI Runtime Spec** -- https://github.com/opencontainers/runtime-spec -- Container runtime specification
- **crun** -- https://github.com/containers/crun -- Fast, low-memory OCI runtime written in C

## Image Optimization (5 refs)
- **Distroless Images** -- https://github.com/GoogleContainerTools/distroless -- Language-focused minimal images without shells
- **Alpine Linux** -- https://www.alpinelinux.org/about/ -- Minimal Linux distribution for containers
- **dive** -- https://github.com/wagoodman/dive -- Tool for exploring image layers and reducing size
- **Docker Slim** -- https://github.com/slimtoolkit/slim -- Automatic image minification
- **Wolfi OS** -- https://github.com/wolfi-dev -- Undistro designed for container/supply chain security

## Registry & Distribution (5 refs)
- **Distribution (Registry v2)** -- https://distribution.github.io/distribution/ -- Open-source registry implementation
- **Harbor** -- https://goharbor.io/docs/ -- Enterprise container registry with scanning and replication
- **ORAS** -- https://oras.land/docs/ -- OCI Registry As Storage for arbitrary artifacts
- **Zot** -- https://zotregistry.dev/docs/ -- OCI-native, vendor-neutral registry
- **ECR Best Practices** -- https://docs.aws.amazon.com/AmazonECR/latest/userguide/best-practices.html -- AWS container registry patterns

## Best Practices & Guides (3 refs)
- **Docker Development Best Practices** -- https://docs.docker.com/develop/dev-best-practices/ -- Official development workflow guidance
- **Hadolint** -- https://github.com/hadolint/hadolint -- Dockerfile linter with best practice rules
- **Dockle** -- https://github.com/goodwithtech/dockle -- Container image security linter
