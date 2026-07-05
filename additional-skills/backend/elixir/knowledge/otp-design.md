# OTP Design Principles

## Process Lifecycle

1. **Spawn**  -  `start_link/1` creates process, links to parent (supervisor)
2. **Init**  -  `init/1` sets initial state, returns `{:ok, state}` or `{:ok, state, {:continue, :setup}}`
3. **Running**  -  handles messages via `handle_call/cast/info`
4. **Termination**  -  `terminate/2` called on normal/shutdown (NOT on brutal_kill or node crash)
5. **Restart**  -  supervisor restarts with fresh `init/1`, clean slate

## Supervision Strategies

### one_for_one
Children are independent. One crashes, only it restarts. Most common.

### one_for_all
Children are co-dependent. One crashes, all restart. Use when shared state makes individual restart meaningless.

### rest_for_one
Ordered dependencies. One crashes, it and all children started AFTER it restart. Use for Registry -> Workers pattern.

## Restart Intensity

```elixir
# max_restarts within max_seconds, then supervisor itself crashes (escalates)
Supervisor.init(children,
  strategy: :one_for_one,
  max_restarts: 3,
  max_seconds: 5
)
```

If a child crashes 4 times in 5 seconds, the supervisor crashes. Its parent supervisor then decides what to do  -  this is the escalation pattern.

## Message Passing

- **Synchronous** (`call`): caller blocks until reply. Provides backpressure. 5s default timeout.
- **Asynchronous** (`cast`): fire-and-forget. No backpressure. Use sparingly.
- **Info** (`send`): raw messages from timers, monitors, PubSub. Always need catch-all clause.

## Process Design Principles

1. **Single responsibility**  -  one process, one job
2. **Fail fast**  -  validate early, crash on invariant violation
3. **Clean restart**  -  state must be reconstructable from init args + external storage
4. **Bounded mailbox**  -  prefer `call` over `cast`, use demand-based flow for producers
5. **Monitor > Link**  -  when you need to KNOW about death without dying yourself

## Links vs Monitors

| | Link | Monitor |
|---|------|---------|
| Direction | Bidirectional | Unidirectional |
| On death | Both die (unless trapping exits) | Receive `:DOWN` message |
| Use case | Supervisor-child | Observing external processes |

## GenServer vs Other Abstractions

| Need | Use |
|------|-----|
| State + complex logic | GenServer |
| Simple get/update state | Agent |
| One-off async work | Task |
| Supervised async work | Task.Supervisor |
| Pub/sub within node | Registry (dispatch) |
| Shared read-heavy data | ETS / :persistent_term |

## Application Design

```elixir
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Infrastructure (start first)
      MyApp.Repo,
      {Phoenix.PubSub, name: MyApp.PubSub},
      # Domain processes
      MyApp.Cache,
      {Registry, keys: :unique, name: MyApp.Registry},
      {DynamicSupervisor, name: MyApp.DynSup},
      # Web layer (start last, depends on above)
      MyAppWeb.Endpoint
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

Order matters: dependencies start first. Web endpoint last so it only serves traffic when everything is ready.
