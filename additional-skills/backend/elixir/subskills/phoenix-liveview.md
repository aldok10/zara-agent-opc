# Phoenix LiveView

LiveView: real-time server-rendered UI over WebSockets. Assigns, streams, hooks, components, PubSub, uploads, JS interop.

## Rules

1. Use `assign/2` for small data, `stream/3` for large/paginated collections  -  streams don't hold all items in memory
2. Function components (`attr`/`slot`) for stateless UI  -  LiveComponents only when you need isolated state or `handle_event`
3. `phx-debounce` on text inputs, `phx-throttle` on scroll/resize  -  don't flood the server
4. PubSub for cross-LiveView communication  -  never reach into another LV's process
5. Uploads: validate content type + max size in `allow_upload/3`, process in `consume_uploaded_entries/3`
6. JS hooks (`phx-hook`) only when server can't handle it  -  animations, third-party JS libs, clipboard
7. Use `assign_async/3` for data that loads after mount  -  shows loading states properly
8. `on_mount` hooks for auth/shared assigns  -  don't duplicate in every LiveView
9. Keep `handle_event` thin  -  delegate to context functions, return assigns
10. `push_event` to send data to JS hooks  -  never embed large data in assigns for JS consumption

## Patterns

| Use Case | Pattern | Why |
|----------|---------|-----|
| Large lists | `stream/3` + `stream_insert` | Bounded memory, DOM patching |
| Form validation | `to_form/1` + `phx-change` | Real-time feedback, changeset-backed |
| File uploads | `allow_upload` + `consume_uploaded_entries` | Chunked, validates, progress |
| Cross-LV updates | `Phoenix.PubSub.broadcast` | Decoupled, scalable |
| Loading states | `assign_async/3` | Built-in loading/error states |
| Pagination | `stream` + `phx-viewport-bottom` | Infinite scroll without full list |
| Flash messages | `put_flash/3` | Auto-dismiss, accessible |
| Navigation | `push_navigate` / `push_patch` | SPA-like without full reload |

## Component Design

```elixir
# Function component with attrs and slots
attr :title, :string, required: true
attr :variant, :atom, default: :primary, values: [:primary, :secondary, :danger]
attr :rest, :global, include: ~w(disabled form)
slot :inner_block, required: true
slot :actions

def button(assigns) do
  ~H"""
  <button class={["btn", "btn-#{@variant}"]} {@rest}>
    <%= render_slot(@inner_block) %>
    <span :if={@actions != []} class="actions">
      <%= render_slot(@actions) %>
    </span>
  </button>
  """
end
```

## Streams

```elixir
def mount(_params, _session, socket) do
  {:ok, stream(socket, :messages, Messages.list_recent(limit: 50))}
end

def handle_info({:new_message, message}, socket) do
  {:noreply, stream_insert(socket, :messages, message, at: -1, limit: 100)}
end

def handle_event("delete", %{"id" => id}, socket) do
  message = Messages.get!(id)
  Messages.delete(message)
  {:noreply, stream_delete(socket, :messages, message)}
end
```

## Anti-Patterns

- Storing full collections in assigns (memory per connection)  -  use streams
- LiveComponents for purely presentational UI  -  function components are lighter
- Business logic in `handle_event`  -  belongs in contexts
- Polling with `Process.send_after` when PubSub would work  -  wasteful
- Large `assign` payloads sent on every event  -  use `changed` tracking, assign only what changed
- `phx-hook` for things LiveView can handle natively (forms, navigation, visibility)

## JS Interop

```elixir
# Server pushes event to hook
{:noreply, push_event(socket, "highlight", %{id: message.id})}
```

```javascript
// Hook receives and acts
Hooks.Highlight = {
  mounted() {
    this.handleEvent("highlight", ({id}) => {
      const el = document.getElementById(`message-${id}`)
      el.classList.add("flash")
      setTimeout(() => el.classList.remove("flash"), 1000)
    })
  }
}
```

## Verification

1. `mix test`  -  all LiveView tests pass (use `live/2`, `render_submit/2`, `render_change/2`)
2. Confirm streams render with `phx-update="stream"` and `id` on each item
3. Check no N+1 in mount  -  preload associations in context
4. Verify PubSub subscriptions have matching `handle_info` clauses
5. Test upload flow: valid file accepted, oversized/wrong type rejected
