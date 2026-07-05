# Application Supervision Tree Design
# Demonstrates: layered supervision, DynamicSupervisor, Registry, Task.Supervisor,
# restart strategies, process ordering

defmodule MyApp.Application do
  @moduledoc """
  Top-level application supervisor.
  Order: infrastructure -> domain -> web (dependencies start first).
  """
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # --- Infrastructure Layer ---
      # Database (must start before anything that queries)
      MyApp.Repo,
      # PubSub (required by LiveView, Channels, domain events)
      {Phoenix.PubSub, name: MyApp.PubSub},
      # Telemetry (attach handlers early)
      MyApp.Telemetry,

      # --- Domain Layer ---
      # Registry for named process lookup (must exist before DynamicSupervisor spawns children)
      {Registry, keys: :unique, name: MyApp.GameRegistry},
      # Task supervisor for fire-and-forget background work
      {Task.Supervisor, name: MyApp.TaskSupervisor},
      # Domain supervisor (groups related domain processes)
      MyApp.Domain.Supervisor,

      # --- Web Layer (start last) ---
      MyAppWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.init(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    MyAppWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end

# --- Domain Supervisor ---
# Groups domain processes with their own restart strategy

defmodule MyApp.Domain.Supervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      # Cache process — independent, restart alone
      MyApp.Cache,
      # Rate limiter — independent
      MyApp.RateLimiter,
      # Game room supervisor — dynamically spawns game processes
      {DynamicSupervisor,
        name: MyApp.GameSupervisor,
        strategy: :one_for_one,
        max_children: 1000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

# --- Game Room (Dynamic Process) ---
# Spawned on demand via DynamicSupervisor, registered via Registry

defmodule MyApp.Game.Room do
  use GenServer
  require Logger

  @idle_timeout :timer.minutes(30)

  # --- Public API ---

  def start_link(opts) do
    room_id = Keyword.fetch!(opts, :room_id)
    GenServer.start_link(__MODULE__, opts, name: via(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via(room_id), {:join, player_id})
  end

  def move(room_id, player_id, action) do
    GenServer.call(via(room_id), {:move, player_id, action})
  end

  def get_state(room_id) do
    GenServer.call(via(room_id), :get_state)
  end

  @doc "Start a new game room if one doesn't exist"
  def find_or_start(room_id) do
    case Registry.lookup(MyApp.GameRegistry, room_id) do
      [{_pid, _}] ->
        {:ok, :existing}

      [] ->
        spec = {__MODULE__, room_id: room_id}
        case DynamicSupervisor.start_child(MyApp.GameSupervisor, spec) do
          {:ok, _pid} -> {:ok, :created}
          {:error, {:already_started, _pid}} -> {:ok, :existing}
          error -> error
        end
    end
  end

  # --- Server Callbacks ---

  @impl true
  def init(opts) do
    room_id = Keyword.fetch!(opts, :room_id)
    Logger.info("Game room #{room_id} started")

    state = %{
      room_id: room_id,
      players: [],
      status: :waiting,
      started_at: DateTime.utc_now()
    }

    # Use handle_continue for any expensive init (DB load, etc.)
    {:ok, state, {:continue, :load_persisted_state}}
  end

  @impl true
  def handle_continue(:load_persisted_state, state) do
    # Could load from DB here if game state is persisted
    schedule_idle_check()
    {:noreply, state}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    if length(state.players) >= 4 do
      {:reply, {:error, :room_full}, state}
    else
      new_state = %{state | players: [player_id | state.players]}
      broadcast(state.room_id, {:player_joined, player_id})
      {:reply, :ok, new_state}
    end
  end

  def handle_call({:move, player_id, action}, _from, state) do
    case process_move(state, player_id, action) do
      {:ok, new_state} ->
        broadcast(state.room_id, {:move_made, player_id, action})
        {:reply, :ok, new_state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call(:get_state, _from, state) do
    {:reply, Map.take(state, [:players, :status, :started_at]), state}
  end

  @impl true
  def handle_info(:idle_check, state) do
    if state.players == [] do
      Logger.info("Game room #{state.room_id} idle, shutting down")
      {:stop, :normal, state}
    else
      schedule_idle_check()
      {:noreply, state}
    end
  end

  def handle_info(msg, state) do
    Logger.warning("Game.Room unexpected message: #{inspect(msg)}")
    {:noreply, state}
  end

  # --- Private ---

  defp via(room_id) do
    {:via, Registry, {MyApp.GameRegistry, room_id}}
  end

  defp broadcast(room_id, message) do
    Phoenix.PubSub.broadcast(MyApp.PubSub, "game:#{room_id}", message)
  end

  defp schedule_idle_check do
    Process.send_after(self(), :idle_check, @idle_timeout)
  end

  defp process_move(state, player_id, _action) do
    if player_id in state.players do
      {:ok, state}
    else
      {:error, :not_in_room}
    end
  end
end
