# MCP Patterns

Deep technical reference for Model Context Protocol: architecture, tool design, server implementation, and composition.

---

## MCP Architecture

MCP defines a standard protocol for connecting AI models to external data and tools. Three roles:

- **Host**: The application running the AI model (IDE, chat app, agent framework)
- **Client**: Protocol handler within the host that connects to servers
- **Server**: Exposes tools, resources, and prompts via the protocol

Communication is bidirectional over a transport layer. The client discovers server capabilities, then invokes them as needed during model interactions.

---

## Transport Options

### stdio

Server runs as a subprocess. Communication via stdin/stdout with JSON-RPC messages.

Best for: local tools, CLI integrations, development. Simplest to implement and debug.

### SSE (Server-Sent Events)

HTTP-based. Client sends requests via POST, receives streaming responses via SSE endpoint.

Best for: remote servers, shared infrastructure, web deployments.

### Streamable HTTP

Newer transport supporting bidirectional streaming over a single HTTP connection.

Best for: high-throughput scenarios, long-running operations.

```typescript
// stdio transport -- server side
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, {
  capabilities: { tools: {}, resources: {} }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Tool Design Principles

### Single Responsibility

Each tool does one thing. Prefer `search_docs` + `read_doc` over a monolithic `docs_manager` with a mode parameter.

### Clear Schemas

Use JSON Schema with descriptive field names, descriptions, and constraints. The model reads these descriptions to decide when and how to call tools.

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "query_database",
    description: "Execute a read-only SQL query against the analytics database. Use for data questions about users, orders, and products.",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL SELECT query. Must be read-only (no INSERT/UPDATE/DELETE)."
        },
        limit: {
          type: "number",
          description: "Max rows to return. Default 100, max 1000.",
          default: 100
        }
      },
      required: ["sql"]
    }
  }]
}));
```

### Error Handling

Return structured errors the model can reason about and recover from:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await executeQuery(request.params.arguments.sql);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
```

---

## Resource Exposure

Resources provide read-only contextual data to models. Unlike tools (which are actions), resources are data the model can inspect.

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "schema://database/tables",
      name: "Database Schema",
      description: "All table definitions in the analytics database",
      mimeType: "application/json"
    },
    {
      uri: "file:///config/app.yaml",
      name: "App Configuration",
      description: "Current application configuration",
      mimeType: "text/yaml"
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "schema://database/tables") {
    const schema = await getDbSchema();
    return {
      contents: [{ uri, mimeType: "application/json", text: JSON.stringify(schema) }]
    };
  }
});
```

Use resource templates for parameterized access:

```typescript
resourceTemplates: [{
  uriTemplate: "file:///logs/{service}/{date}",
  name: "Service Logs",
  description: "Logs for a specific service on a given date"
}]
```

---

## Prompt Templates via MCP

Servers can expose reusable prompt templates:

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [{
    name: "code_review",
    description: "Review code for bugs, security issues, and style",
    arguments: [
      { name: "code", description: "The code to review", required: true },
      { name: "language", description: "Programming language", required: true },
      { name: "focus", description: "Review focus area", required: false }
    ]
  }]
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { code, language, focus } = request.params.arguments;
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Review this ${language} code${focus ? ` focusing on ${focus}` : ""}:\n\n${code}`
      }
    }]
  };
});
```

---

## Server Implementation (Node.js)

Complete minimal server:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "weather-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "get_weather",
    description: "Get current weather for a city",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" }
      },
      required: ["city"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_weather") {
    const { city } = request.params.arguments;
    const weather = await fetchWeather(city);
    return {
      content: [{ type: "text", text: `${city}: ${weather.temp}F, ${weather.condition}` }]
    };
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Server Implementation (Python)

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("weather-server")

@app.list_tools()
async def list_tools():
    return [Tool(
        name="get_weather",
        description="Get current weather for a city",
        inputSchema={
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"]
        }
    )]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "get_weather":
        weather = await fetch_weather(arguments["city"])
        return [TextContent(type="text", text=f"{weather}")]

async def main():
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())
```

---

## Security Considerations

- **Input validation**: Never trust tool arguments. Validate types, ranges, and patterns.
- **Rate limiting**: Prevent runaway agent loops from hammering your server.
- **Permission scoping**: Different clients get different tool sets. Use capability negotiation.
- **Path traversal**: If exposing file resources, validate paths stay within allowed directories.
- **SQL injection**: If exposing database tools, use parameterized queries or read-only connections.
- **Secrets**: Never expose API keys or credentials in tool responses. Reference by name only.

```typescript
function validateFilePath(requestedPath: string, allowedRoot: string): string {
  const resolved = path.resolve(allowedRoot, requestedPath);
  if (!resolved.startsWith(allowedRoot)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}
```

---

## Composition: Multiple MCP Servers

A host can connect to multiple MCP servers simultaneously. Each server handles its domain:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["./servers/db-server.js"],
      "env": { "DB_URL": "postgres://..." }
    },
    "github": {
      "command": "node",
      "args": ["./servers/github-server.js"],
      "env": { "GITHUB_TOKEN": "..." }
    },
    "docs": {
      "command": "python",
      "args": ["-m", "docs_server"],
      "env": { "DOCS_PATH": "./docs" }
    }
  }
}
```

The model sees all tools from all connected servers. Tool names should be globally unique or namespaced to avoid collisions.

---

## Debugging with MCP Inspector

Use the inspector for development:

```bash
npx @modelcontextprotocol/inspector node ./my-server.js
```

Opens a web UI showing:
- Available tools, resources, and prompts
- Request/response logs
- Ability to manually invoke tools with test inputs
