package main

import (
	"context"
	"fmt"
	"os"

	"dagger/myapp/internal/dagger"
)

type Myapp struct{}

func (m *Myapp) Lint(source *dagger.Directory) *dagger.Container {
	return dag.Container().
		From("golangci/golangci-lint:v1.61").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithMountedCache("/root/.cache/golangci-lint", dag.CacheVolume("golangci")).
		WithExec([]string{"golangci-lint", "run", "--timeout=5m", "./..."})
}

func (m *Myapp) Test(source *dagger.Directory) *dagger.Container {
	return dag.Container().
		From("golang:1.23-bookworm").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithMountedCache("/go/pkg/mod", dag.CacheVolume("gomod")).
		WithMountedCache("/root/.cache/go-build", dag.CacheVolume("gobuild")).
		WithExec([]string{"go", "test", "-race", "-coverprofile=/tmp/coverage.out", "./..."})
}

func (m *Myapp) Build(
	source *dagger.Directory,
	// +optional
	// +default="linux"
	goos string,
	// +optional
	// +default="amd64"
	goarch string,
) *dagger.File {
	return dag.Container().
		From("golang:1.23-bookworm").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithMountedCache("/go/pkg/mod", dag.CacheVolume("gomod")).
		WithMountedCache("/root/.cache/go-build", dag.CacheVolume("gobuild")).
		WithEnvVariable("CGO_ENABLED", "0").
		WithEnvVariable("GOOS", goos).
		WithEnvVariable("GOARCH", goarch).
		WithExec([]string{
			"go", "build",
			"-ldflags=-s -w -extldflags=-static",
			"-trimpath",
			"-o", "/app",
			"./cmd/server",
		}).
		File("/app")
}

func (m *Myapp) Container(source *dagger.Directory) *dagger.Container {
	binary := m.Build(source, "linux", "amd64")

	return dag.Container().
		From("gcr.io/distroless/static-debian12:nonroot").
		WithFile("/app", binary).
		WithExposedPort(8080).
		WithUser("65532").
		WithEntrypoint([]string{"/app"})
}

func (m *Myapp) Publish(
	ctx context.Context,
	source *dagger.Directory,
	registry string,
	tag string,
	// +optional
	registryUser string,
	// +optional
	registryPass *dagger.Secret,
) (string, error) {
	container := m.Container(source)
	addr := fmt.Sprintf("%s:%s", registry, tag)

	if registryPass != nil {
		return container.
			WithRegistryAuth(registry, registryUser, registryPass).
			Publish(ctx, addr)
	}
	return container.Publish(ctx, addr)
}

func (m *Myapp) CI(ctx context.Context, source *dagger.Directory) error {
	_, err := m.Lint(source).Sync(ctx)
	if err != nil {
		return fmt.Errorf("lint failed: %w", err)
	}

	_, err = m.Test(source).Sync(ctx)
	if err != nil {
		return fmt.Errorf("test failed: %w", err)
	}

	container := m.Container(source)
	_, err = container.Sync(ctx)
	if err != nil {
		return fmt.Errorf("build failed: %w", err)
	}

	fmt.Fprintln(os.Stderr, "CI passed: lint, test, build all green")
	return nil
}

func (m *Myapp) IntegrationTest(ctx context.Context, source *dagger.Directory) *dagger.Container {
	postgres := dag.Container().
		From("postgres:16-alpine").
		WithEnvVariable("POSTGRES_PASSWORD", "test").
		WithEnvVariable("POSTGRES_DB", "testdb").
		WithExposedPort(5432).
		AsService()

	return dag.Container().
		From("golang:1.23-bookworm").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithMountedCache("/go/pkg/mod", dag.CacheVolume("gomod")).
		WithServiceBinding("db", postgres).
		WithEnvVariable("DATABASE_URL", "postgres://postgres:test@db:5432/testdb?sslmode=disable").
		WithExec([]string{"go", "test", "-tags=integration", "-race", "./..."})
}
