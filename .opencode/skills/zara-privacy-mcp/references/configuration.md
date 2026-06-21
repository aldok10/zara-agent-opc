# Configuration Reference

All config via environment variables, prefix-based naming.

```bash
# SQL Database (driver auto-detected from DSN)
ZARA_DB_<NAME>_DRIVER=postgres|mysql|sqlserver|sqlite|oracle|clickhouse
ZARA_DB_<NAME>_DSN=<connection_string>
ZARA_DB_<NAME>_MAX_CONNS=10

# MongoDB
ZARA_MONGO_<NAME>_URI=mongodb://host:27017
ZARA_MONGO_<NAME>_DATABASE=mydb

# Redis
ZARA_REDIS_<NAME>_ADDR=host:6379
ZARA_REDIS_<NAME>_PASSWORD=secret
ZARA_REDIS_<NAME>_DB=0

# HTTP API
ZARA_API_<NAME>_URL=https://api.example.com
ZARA_API_<NAME>_AUTH=bearer|basic|header|none
ZARA_API_<NAME>_AUTH_ENV=TOKEN_VAR_NAME

# AI Provider
ZARA_AI_<NAME>_BASE_URL=https://api.openai.com/v1
ZARA_AI_<NAME>_API_KEY_ENV=OPENAI_API_KEY
ZARA_AI_<NAME>_MODELS=gpt-4o,gpt-4o-mini

# Global
ZARA_ENCRYPTION_KEY=<min-16-chars>
ZARA_DB_PATH=~/.zara/privacymcp/mappings.db
```

## Operational Behavior

- **All masking is automatic** — agent does not explicitly mask
- **Credentials never appear in prompts** — auth injected from env by MCP
- **Privacy tools always ready** — only need `ZARA_ENCRYPTION_KEY`
- **DB/API/AI tools need env vars** — "unknown database" error → check config
- **Hot reload**: `kill -HUP` to reload config without restart
- **Transport**: `--stdio` for MCP client, HTTP for standalone/testing
