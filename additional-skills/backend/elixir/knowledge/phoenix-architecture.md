---
type: fact
title: "Phoenix Architecture"
---

# Phoenix Architecture

## Request Flow

```
Client -> Endpoint -> Router -> Pipeline (plugs) -> Controller -> Context -> Repo
                                                  -> LiveView -> Context -> Repo
```

## Endpoint

Entry point. Handles transport-level concerns:
- Static file serving (`Plug.Static`)
- Code reloading (dev only)
- Request logging
- Session configuration
- Socket upgrades (WebSocket for LiveView/Channels)

## Router

Maps URLs to handlers. Defines pipelines (plug stacks).

```elixir
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {MyAppWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug MyAppWeb.Plugs.Authenticate
  end

  scope "/", MyAppWeb do
    pipe_through :browser
    live "/dashboard", DashboardLive
    get "/", PageController, :home
  end

  scope "/api", MyAppWeb.API do
    pipe_through :api
    resources "/posts", PostController, except: [:new, :edit]
  end
end
```

## Controllers (JSON APIs)

Thin  -  parse params, call context, render response.

```elixir
defmodule MyAppWeb.API.PostController do
  use MyAppWeb, :controller
  alias MyApp.Blog

  action_fallback MyAppWeb.FallbackController

  def index(conn, params) do
    posts = Blog.list_posts(params)
    render(conn, :index, posts: posts)
  end

  def create(conn, %{"post" => post_params}) do
    with {:ok, post} <- Blog.create_post(post_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/posts/#{post}")
      |> render(:show, post: post)
    end
  end
end
```

## Contexts (Domain Boundaries)

Contexts encapsulate a business domain. They are the public API for a feature area.

Rules:
- One context per bounded domain (Accounts, Blog, Billing)
- Contexts call Repo  -  controllers/LiveViews never touch Repo directly
- Cross-context communication via public functions, never schema sharing
- Contexts define their own types (not just schema wrappers)

```elixir
defmodule MyApp.Blog do
  alias MyApp.Blog.{Post, Comment}
  alias MyApp.Repo
  import Ecto.Query

  def list_posts(opts \\ []) do
    Post
    |> filter_by_status(opts[:status])
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end

  def create_post(attrs) do
    %Post{}
    |> Post.changeset(attrs)
    |> Repo.insert()
  end

  defp filter_by_status(query, nil), do: query
  defp filter_by_status(query, status), do: where(query, [p], p.status == ^status)
end
```

## Channels & Presence

Real-time communication over WebSockets (separate from LiveView).

- **Channels**: topic-based pub/sub (chat rooms, notifications)
- **Presence**: distributed online-user tracking with CRDT (conflict-free)
- Use when: multiple clients collaborate, need client-to-client communication
- LiveView preferred when: server drives UI, no client-to-client needed

## Verified Routes

Phoenix 1.7+ (standard in 1.8)  -  compile-time checked routes:

```elixir
# Compile error if route doesn't exist:
~p"/users/#{user}"
~p"/posts/#{post}/comments"

# In templates:
<.link navigate={~p"/users/#{@user}"}>Profile</.link>
```

## PubSub

Built-in distributed pub/sub. Works across clustered nodes automatically.

```elixir
# Subscribe (typically in LiveView mount or GenServer init):
Phoenix.PubSub.subscribe(MyApp.PubSub, "posts:#{post_id}")

# Broadcast (from context after mutation):
Phoenix.PubSub.broadcast(MyApp.PubSub, "posts:#{post.id}", {:post_updated, post})

# Handle in subscriber:
def handle_info({:post_updated, post}, socket) do
  {:noreply, assign(socket, :post, post)}
end
```
