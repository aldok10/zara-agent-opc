---
type: subskill
title: "OTP Patterns"
---

# OTP Patterns

OTP design: supervision trees, GenServer, Registry, DynamicSupervisor, Task.Supervisor, Agent.

## Rules

1. Design supervision tree BEFORE writing process code  -  draw the hierarchy, identify failure domains
2. GenServer state must be minimal  -  derive what you can, store only source of truth
3. `handle_continue` for expensive init work  -  don't block supervisor startup
4. `child_spec/1` defines restart strategy per child  -  `:permanent` (always), `:transient` (crash only), `:temporary` (never)
5. DynamicSupervisor for runtime-spawned processes  -  static children go in regular Supervisor
6. Registry for process discovery  -  never store PIDs in state (they change on restart)
7. `Task.Supervisor.async_nolink` for work that shouldn't crash the caller on failure
8. GenServer `call` for request/response with backpressure  -  `cast` for fire-and-forget (rare in practice)
9. `:via` tuples with Registry for named process lookup  -  supports swarm/Horde for distribution
10. Timeouts in `GenServer.call` default to 5000ms  -  set explicit timeouts for slow operations
11. `terminate/2` is NOT guaranteed to run (brutal_kill, node crash)  -  don't rely on it for critical cleanup
12. Use `:persistent_term` for rarely-changing global config  -  faster reads than ETS, expensive writes

## Supervision Strategies

| Strategy | When | Example |
|----------|------|---------|
| `:one_for_one` | Children are independent | Pool of worker processes |
| `:one_for_all` | Children co-dependent | DB connection + cache (cache invalid without DB) |
| `:rest_for_one` | Ordered dependencies | Registry must restart before workers using it |

## GenServer Design Rules

```elixir
defmodule MyApp.Counter do
  use GenServer

  # --- Client API (public interface) ---
  def start_link(opts) do
    name = Keyword.fetch!(opts, :name)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def increment(server), do: GenServer.call(server, :increment)
  def get(server), do: GenServer.call(server, :get)

  # --- Server Callbacks ---
  @impl true
  def init(opts) do
    initial = Keyword.get(opts, :initial, 0)
    {:ok, %{count: initial}}
  end

  @impl true
  def handle_call(:increment, _from, %{count: n} = state) do
    {:reply, n + 1, %{state | count: n + 1}}
  end

  def handle_call(:get, _from, %{count: n} = state) do
    {:reply, n, state}
  end

  @impl true
  def handle_info(msg, state) do
    require Logger
    Logger.warning("Unexpected message: #{inspect(msg)}")
    {:noreply, state}
  end
end
```

## DynamicSupervisor + Registry

```elixir
# In application.ex children:
{Registry, keys: :unique, name: MyApp.SessionRegistry},
{DynamicSupervisor, name: MyApp.SessionSupervisor, strategy: :one_for_one}

# Starting a dynamic child:
def start_session(session_id, opts) do
  spec = {MyApp.Session, Keyword.put(opts, :id, session_id)}
  DynamicSupervisor.start_child(MyApp.SessionSupervisor, spec)
end

# In Session GenServer:
def start_link(opts) do
  id = Keyword.fetch!(opts, :id)
  GenServer.start_link(__MODULE__, opts, name: via(id))
end

defp via(id), do: {:via, Registry, {MyApp.SessionRegistry, id}}
```

## Process Lifecycle

1. `start_link`  -  spawns, links to supervisor
2. `init/1`  -  synchronous init (keep fast), return `{:ok, state, {:continue, :load}}`
3. `handle_continue/2`  -  async expensive init (load from DB, connect to external)
4. `handle_call/cast/info`  -  process messages
5. `terminate/2`  -  cleanup (not guaranteed)

## Anti-Patterns

- Storing PIDs in state (break on restart)  -  use Registry or named processes
- God GenServer (>200 LOC in callbacks)  -  split into multiple processes
- Blocking `init/1` with slow I/O  -  use `{:continue, :setup}` pattern
- Using Agent when you need conditional logic  -  Agent is just get/update, GenServer for behavior
- `Process.whereis` for process lookup  -  fragile, use Registry
- Missing catch-all `handle_info`  -  crashes process on unexpected messages
- Synchronous calls in `init` to other GenServers  -  potential deadlock during startup

## Verification

1. Supervision tree starts cleanly: `mix test` + `iex -S mix` without crashes
2. Process restarts recover state correctly (test by killing process in tests)
3. Registry lookups work after process restart
4. No orphaned processes after parent termination
5. `Observer.start()` in dev shows expected tree structure
