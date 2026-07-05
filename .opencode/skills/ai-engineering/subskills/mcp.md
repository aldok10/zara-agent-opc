# Model Context Protocol (MCP)

## What it is
MCP = **"USB-C for AI."** A universal open standard for connecting AI models to external tools and data. Created by Anthropic; adopted by OpenAI, Google, Microsoft.

## Adoption (mid-2026)
- 1,300+ production servers
- ~41% of surveyed orgs in limited/broad production
- ~28% of Fortune 500 have MCP servers

## Three primitives
- **Resources**: data the model can read (files, DB records, API responses). Like GET endpoints.
- **Tools**: actions the model can take (create, update, delete, execute). Like POST/PUT/DELETE.
- **Prompts**: reusable prompt templates with parameters. Like stored procedures for LLMs.

## Architecture
`Host (IDE/app)` <-> `Client (MCP client library)` <-> `Server (your MCP server)` <-> `Data/Services`

## Transport
- **stdio**: local, process-to-process. Use for local tools.
- **SSE/HTTP**: remote, network. Use for cloud services.

## Building an MCP server
- Define tools with clear names, descriptions, and JSON-schema parameters
- **Tool descriptions ARE the documentation**  --  the model reads them to decide when/how to call
- Return structured data (JSON preferred); return errors as structured responses too
- Make operations **idempotent** where possible (models retry)

## Security
- Validate all inputs, sanitize tool parameters
- Principle of least privilege
- No secrets in tool descriptions
- Audit logging on every tool call

## Best practices
- Small, focused servers (one concern per server)
- Versioned tool schemas
- Graceful, model-readable error messages
- Timeouts on long operations

## Language SDKs
- TypeScript: `@modelcontextprotocol/sdk`
- Python: `mcp`
- Go: `mark3labs/mcp-go`, `github.com/anthropics/anthropic-sdk-go`

## Anti-patterns
- God server (too many tools)
- No input validation
- Exposing destructive operations without confirmation
- Unclear tool descriptions
- No error handling
