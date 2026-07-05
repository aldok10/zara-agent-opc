# Deployment

BEAM deployment: releases, hot upgrades, clustering (libcluster), Fly.io, observability.

## Rules

1. Always deploy as OTP release (`mix release`) — not `mix phx.server` in production
2. `runtime.exs` for all production config — compile-time config cannot read env vars at deploy
3. Health check endpoint required — `/health` returning 200 with version and node name
4. Cluster formation with `libcluster` — configure strategy per environment (DNS, Kubernetes, gossip)
5. Distributed features (PubSub, presence) require clustering — verify nodes connect before enabling
6. Use `Phoenix.PubSub` with default pg adapter for multi-node — automatic with clustering
7. Log structured JSON in production — use `Logger` backends like `LoggerJSON`
8. Telemetry metrics attached at application start — export to Prometheus/OTLP
9. Database migrations run as release command, not on startup — `bin/my_app eval "MyApp.Release.migrate"`
10. Graceful shutdown: `SIGTERM` handling with drain period for in-flight requests

## Release Configuration

```elixir
# mix.exs
def project do
  [
    releases: [
      my_app: [
        include_executables_for: [:unix],
        steps: [:assemble, :tar],
        cookie: "#{Node.self()}-cookie"
      ]
    ]
  ]
end

# rel/env.sh.eex
export RELEASE_DISTRIBUTION=name
export RELEASE_NODE=my_app@${HOSTNAME}
export ERL_AFLAGS="-proto_dist inet6_tcp"
```

## Clustering with libcluster

```elixir
# In application.ex supervision tree:
topologies = Application.get_env(:libcluster, :topologies, [])

children = [
  {Cluster.Supervisor, [topologies, [name: MyApp.ClusterSupervisor]]},
  # ... rest of app
]

# config/runtime.exs for Fly.io:
config :libcluster,
  topologies: [
    fly6pn: [
      strategy: Cluster.Strategy.DNSPoll,
      config: [
        polling_interval: 5_000,
        query: "#{app_name}.internal",
        node_basename: app_name
      ]
    ]
  ]
```

## Fly.io Deployment

```toml
# fly.toml
[env]
  PHX_HOST = "my-app.fly.dev"
  RELEASE_DISTRIBUTION = "name"
  RELEASE_NODE = "my_app@${FLY_PRIVATE_IP}"

[http_service]
  internal_port = 4000
  force_https = true

  [[http_service.checks]]
    grace_period = "10s"
    interval = "15s"
    method = "GET"
    path = "/health"
    timeout = "5s"

[deploy]
  release_command = "/app/bin/my_app eval 'MyApp.Release.migrate()'"
```

## Observability

```elixir
# Telemetry metrics definition:
defmodule MyApp.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def metrics do
    [
      counter("phoenix.router.dispatch.stop.duration",
        unit: {:native, :millisecond},
        tags: [:route]
      ),
      distribution("my_app.repo.query.total_time",
        unit: {:native, :millisecond},
        reporter_options: [buckets: [10, 50, 100, 250, 500, 1000]]
      ),
      last_value("vm.memory.total", unit: :byte)
    ]
  end
end

# OpenTelemetry setup:
# In mix.exs deps: {:opentelemetry_phoenix, "~> 1.0"}
# In application start:
OpentelemetryPhoenix.setup()
OpentelemetryEcto.setup([:my_app, :repo])
```

## Release Commands

```elixir
# lib/my_app/release.ex
defmodule MyApp.Release do
  @app :my_app

  def migrate do
    load_app()
    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp load_app do
    Application.load(@app)
    Application.ensure_all_started(:ssl)
  end

  defp repos, do: Application.fetch_env!(@app, :ecto_repos)
end
```

## Anti-Patterns

- Running `mix phx.server` in production — no release benefits, slow startup, dev deps loaded
- Config in `config.exs` that reads `System.get_env` — only works at compile time
- Migrations on app boot — blocks startup, can timeout, retry loops
- No health check — orchestrator can't determine readiness
- Hardcoded node names — breaks multi-instance deployments
- Missing graceful shutdown — drops in-flight WebSocket connections
- Using `:rpc.call` without timeouts — can hang indefinitely in network partition

## Verification

1. `MIX_ENV=prod mix release` — builds successfully
2. `bin/my_app eval "IO.puts(:ok)"` — release boots and can eval
3. `bin/my_app start` + `curl localhost:4000/health` — responds correctly
4. Verify clustering: start 2 nodes, check `Node.list()` is non-empty
5. Rolling deploy: old and new versions both serve traffic during transition
