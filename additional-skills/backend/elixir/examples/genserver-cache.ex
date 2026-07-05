# GenServer Cache with TTL and Supervision
# Demonstrates: GenServer state management, Process.send_after for TTL,
# supervisor integration, clean public API

defmodule MyApp.Cache do
  @moduledoc """
  Simple in-process cache with per-key TTL and periodic cleanup.
  For production high-throughput: use ETS-backed cache instead.
  """
  use GenServer

  @default_ttl :timer.minutes(5)
  @cleanup_interval :timer.minutes(1)

  # --- Public API ---

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)
    GenServer.start_link(__MODULE__, opts, name: name)
  end

  def get(server \\ __MODULE__, key) do
    GenServer.call(server, {:get, key})
  end

  def put(server \\ __MODULE__, key, value, ttl \\ @default_ttl) do
    GenServer.call(server, {:put, key, value, ttl})
  end

  def delete(server \\ __MODULE__, key) do
    GenServer.cast(server, {:delete, key})
  end

  def clear(server \\ __MODULE__) do
    GenServer.cast(server, :clear)
  end

  # --- child_spec for Supervisor ---

  def child_spec(opts) do
    %{
      id: Keyword.get(opts, :name, __MODULE__),
      start: {__MODULE__, :start_link, [opts]},
      restart: :permanent,
      type: :worker
    }
  end

  # --- Server Callbacks ---

  @impl true
  def init(_opts) do
    schedule_cleanup()
    {:ok, %{entries: %{}}}
  end

  @impl true
  def handle_call({:get, key}, _from, state) do
    result =
      case Map.get(state.entries, key) do
        nil -> nil
        {value, expires_at} ->
          if System.monotonic_time(:millisecond) < expires_at,
            do: value,
            else: nil
      end

    {:reply, result, state}
  end

  def handle_call({:put, key, value, ttl}, _from, state) do
    expires_at = System.monotonic_time(:millisecond) + ttl
    entries = Map.put(state.entries, key, {value, expires_at})
    {:reply, :ok, %{state | entries: entries}}
  end

  @impl true
  def handle_cast({:delete, key}, state) do
    {:noreply, %{state | entries: Map.delete(state.entries, key)}}
  end

  def handle_cast(:clear, state) do
    {:noreply, %{state | entries: %{}}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.monotonic_time(:millisecond)

    entries =
      state.entries
      |> Enum.reject(fn {_key, {_value, expires_at}} -> now >= expires_at end)
      |> Map.new()

    schedule_cleanup()
    {:noreply, %{state | entries: entries}}
  end

  def handle_info(_msg, state) do
    {:noreply, state}
  end

  # --- Private ---

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end

# --- Supervision Tree Integration ---

defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Cache starts with app, restarts on crash with clean state
      {MyApp.Cache, name: MyApp.Cache},
      # Or multiple named caches:
      # {MyApp.Cache, name: MyApp.UserCache},
      # {MyApp.Cache, name: MyApp.SessionCache},
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
