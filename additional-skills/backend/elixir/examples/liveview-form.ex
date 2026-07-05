# LiveView Form with Validation, Uploads, and Real-Time Updates
# Demonstrates: changesets, phx-change/submit, allow_upload, PubSub, streams

defmodule MyAppWeb.PostLive.Form do
  use MyAppWeb, :live_view

  alias MyApp.Blog
  alias MyApp.Blog.Post

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "New Post")
     |> assign_form(Blog.change_post(%Post{}))
     |> allow_upload(:cover_image,
       accept: ~w(.jpg .jpeg .png .webp),
       max_entries: 1,
       max_file_size: 5_000_000
     )}
  end

  @impl true
  def handle_params(%{"id" => id}, _uri, socket) do
    post = Blog.get_post!(id)

    {:noreply,
     socket
     |> assign(:page_title, "Edit Post")
     |> assign(:post, post)
     |> assign_form(Blog.change_post(post))}
  end

  def handle_params(_params, _uri, socket) do
    {:noreply, assign(socket, :post, %Post{})}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6"><%= @page_title %></h1>

      <.form
        for={@form}
        id="post-form"
        phx-change="validate"
        phx-submit="save"
        phx-drop-target={@uploads.cover_image.ref}
      >
        <.input field={@form[:title]} type="text" label="Title" phx-debounce="300" />
        <.input field={@form[:body]} type="textarea" label="Body" rows="10" phx-debounce="500" />
        <.input field={@form[:status]} type="select" label="Status"
          options={[{"Draft", "draft"}, {"Published", "published"}]} />

        <%-- File Upload --%>
        <div class="mt-4">
          <label class="block text-sm font-medium">Cover Image</label>
          <.live_file_input upload={@uploads.cover_image} class="mt-1" />

          <%-- Preview uploaded files --%>
          <div :for={entry <- @uploads.cover_image.entries} class="mt-2 flex items-center gap-4">
            <.live_img_preview entry={entry} width="100" />
            <span><%= entry.client_name %></span>
            <button type="button" phx-click="cancel-upload" phx-value-ref={entry.ref}
              class="text-red-500 text-sm">Remove</button>
            <p :for={err <- upload_errors(@uploads.cover_image, entry)} class="text-red-500 text-sm">
              <%= upload_error_to_string(err) %>
            </p>
          </div>
        </div>

        <div class="mt-6">
          <.button phx-disable-with="Saving...">Save Post</.button>
        </div>
      </.form>
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"post" => post_params}, socket) do
    changeset =
      socket.assigns.post
      |> Blog.change_post(post_params)
      |> Map.put(:action, :validate)

    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("save", %{"post" => post_params}, socket) do
    cover_path = consume_upload(socket)
    post_params = maybe_put_cover(post_params, cover_path)

    save_post(socket, socket.assigns.post, post_params)
  end

  def handle_event("cancel-upload", %{"ref" => ref}, socket) do
    {:noreply, cancel_upload(socket, :cover_image, ref)}
  end

  # --- Private ---

  defp save_post(socket, %Post{id: nil}, params) do
    case Blog.create_post(params) do
      {:ok, post} ->
        # Notify other LiveViews via PubSub
        Phoenix.PubSub.broadcast(MyApp.PubSub, "posts", {:post_created, post})

        {:noreply,
         socket
         |> put_flash(:info, "Post created")
         |> push_navigate(to: ~p"/posts/#{post}")}

      {:error, changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp save_post(socket, post, params) do
    case Blog.update_post(post, params) do
      {:ok, post} ->
        Phoenix.PubSub.broadcast(MyApp.PubSub, "posts:#{post.id}", {:post_updated, post})

        {:noreply,
         socket
         |> put_flash(:info, "Post updated")
         |> push_navigate(to: ~p"/posts/#{post}")}

      {:error, changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp consume_upload(socket) do
    uploaded_files =
      consume_uploaded_entries(socket, :cover_image, fn %{path: path}, entry ->
        dest = Path.join(["priv/static/uploads", "#{entry.uuid}-#{entry.client_name}"])
        File.cp!(path, dest)
        {:ok, "/uploads/#{Path.basename(dest)}"}
      end)

    List.first(uploaded_files)
  end

  defp maybe_put_cover(params, nil), do: params
  defp maybe_put_cover(params, path), do: Map.put(params, "cover_image_url", path)

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :form, to_form(changeset))
  end

  defp upload_error_to_string(:too_large), do: "File too large (max 5MB)"
  defp upload_error_to_string(:not_accepted), do: "Invalid file type"
  defp upload_error_to_string(:too_many_files), do: "Too many files"
end
