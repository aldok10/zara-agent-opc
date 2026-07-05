# Dagger Patterns

Dagger provides portable, containerized CI pipelines defined as code. Same pipeline runs locally (`dagger call`) and in any CI system. Version 0.13+ uses Dagger Functions (typed, composable) and the Daggerverse for module sharing.

## Key Concepts

### Dagger Functions

Typed functions exposed from a Dagger module:

```go
package main

import (
    "dagger/myapp/internal/dagger"
)

type Myapp struct{}

func (m *Myapp) Build(source *dagger.Directory) *dagger.Container {
    return dag.Container().
        From("golang:1.23").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithMountedCache("/go/pkg/mod", dag.CacheVolume("gomod")).
        WithMountedCache("/root/.cache/go-build", dag.CacheVolume("gobuild")).
        WithExec([]string{"go", "build", "-o", "/app", "./cmd/server"})
}

func (m *Myapp) Test(source *dagger.Directory) *dagger.Container {
    return dag.Container().
        From("golang:1.23").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithMountedCache("/go/pkg/mod", dag.CacheVolume("gomod")).
        WithExec([]string{"go", "test", "./..."})
}
```

### Module Structure

```
dagger/
  dagger.json       # module config
  main.go           # function definitions
  internal/
    dagger/         # generated SDK types
```

Initialize: `dagger init --sdk=go --name=myapp`

### CacheVolume

Persistent caches across pipeline runs (equivalent to BuildKit cache mounts):

```go
dag.CacheVolume("npm-cache")
dag.CacheVolume("pip-cache")
dag.CacheVolume("go-mod-cache")
```

Cache volumes are local to the Dagger Engine instance. In CI, use Dagger Cloud or runner-local cache for persistence.

## Configuration Examples

### dagger.json

```json
{
  "name": "myapp",
  "sdk": "go",
  "dependencies": [
    {
      "name": "golang",
      "source": "github.com/kpenfound/dagger-modules/golang@v0.2.0"
    }
  ],
  "source": "dagger"
}
```

### Multi-Language Pipeline

```go
func (m *Myapp) CI(source *dagger.Directory) error {
    // Parallel: lint + test + build
    _, err := dag.Container().
        From("golangci/golangci-lint:latest").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithExec([]string{"golangci-lint", "run"}).
        Sync(ctx)
    if err != nil {
        return err
    }

    _, err = m.Test(source).Sync(ctx)
    if err != nil {
        return err
    }

    _, err = m.Build(source).Sync(ctx)
    return err
}
```

### Service Dependencies

```go
func (m *Myapp) IntegrationTest(source *dagger.Directory) *dagger.Container {
    postgres := dag.Container().
        From("postgres:16").
        WithEnvVariable("POSTGRES_PASSWORD", "test").
        WithExposedPort(5432).
        AsService()

    return dag.Container().
        From("golang:1.23").
        WithMountedDirectory("/src", source).
        WithWorkdir("/src").
        WithServiceBinding("db", postgres).
        WithEnvVariable("DATABASE_URL", "postgres://postgres:test@db:5432/postgres?sslmode=disable").
        WithExec([]string{"go", "test", "-tags=integration", "./..."})
}
```

### Publishing Container Images

```go
func (m *Myapp) Publish(
    source *dagger.Directory,
    registry string,
    tag string,
    // +optional
    registryUser string,
    // +optional
    registryPass *dagger.Secret,
) (string, error) {
    built := m.Build(source)

    addr := registry + ":" + tag
    if registryPass != nil {
        return built.
            WithRegistryAuth(registry, registryUser, registryPass).
            Publish(ctx, addr)
    }
    return built.Publish(ctx, addr)
}
```

## Common Patterns

### GitHub Actions Integration

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: dagger/dagger-for-github@v6
        with:
          version: "latest"
          verb: call
          args: ci --source=.
```

### Local Development

```bash
# Run full CI locally
dagger call ci --source=.

# Run just tests
dagger call test --source=.

# Interactive shell in build container
dagger call build --source=. terminal
```

### Daggerverse Modules

Reuse community modules:

```go
func (m *Myapp) Lint(source *dagger.Directory) *dagger.Container {
    return dag.Golangci().
        Run(source, dagger.GolangciRunOpts{
            Version: "v1.61",
        })
}
```

Install: `dagger install github.com/sagikazarmark/daggerverse/golangci@v0.3.0`

### Secrets Handling

```go
func (m *Myapp) Deploy(token *dagger.Secret) *dagger.Container {
    return dag.Container().
        From("alpine:latest").
        WithSecretVariable("DEPLOY_TOKEN", token).
        WithExec([]string{"sh", "-c", "deploy --token=$DEPLOY_TOKEN"})
}
```

CLI: `dagger call deploy --token=env:DEPLOY_TOKEN`

## Gotchas

1. Dagger Engine runs as a container -- first invocation pulls the engine image (~200MB), subsequent runs are fast
2. `Sync(ctx)` forces execution -- without it, Dagger builds a lazy DAG that may never execute
3. Cache volumes are engine-local; ephemeral CI runners lose caches unless using Dagger Cloud
4. File ownership in mounted directories can cause permission issues -- use `WithUser()` carefully
5. Large source directories slow pipeline start -- use `.daggerignore` (same syntax as .dockerignore)
6. Dagger functions must be exported (capitalized) and use specific SDK types for parameters
7. `WithExec` creates a new layer -- batch commands in a shell if layer count matters for debugging

## Quick Reference

| Command | Purpose |
|---------|---------|
| `dagger init --sdk=go` | Initialize new module |
| `dagger call <function>` | Execute a function |
| `dagger develop` | Regenerate SDK types after schema change |
| `dagger install <module>` | Add Daggerverse dependency |
| `dagger call <fn> terminal` | Drop into interactive shell |
| `dagger login` | Authenticate with Dagger Cloud |

| Concept | Dagger Equivalent |
|---------|-------------------|
| Dockerfile FROM | `dag.Container().From(...)` |
| COPY | `.WithMountedDirectory(...)` or `.WithFile(...)` |
| RUN | `.WithExec([]string{...})` |
| --mount=type=cache | `.WithMountedCache(path, dag.CacheVolume(...))` |
| --mount=type=secret | `.WithSecretVariable(...)` or `.WithMountedSecret(...)` |
| docker-compose services | `.AsService()` + `.WithServiceBinding(...)` |
| Multi-stage | Multiple `dag.Container()` with cross-references |
