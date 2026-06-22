# Install Reference - Set Up zara-privacy-mcp on Command

When the user says "install zara privacy mcp", "set up the privacy gateway", or similar, walk through this. Detect their OS and MCP client first, then pick the fastest path. Execute steps yourself where safe; stop for anything that needs their secrets or sudo.

## Step 0 - Detect environment

```bash
go version 2>/dev/null && echo "go: ok" || echo "go: missing"
uname -sm          # OS + arch
echo "$GOPATH"; go env GOPATH 2>/dev/null
```

Identify the MCP client config path:
- OpenCode: `~/.config/opencode/opencode.json` (or project `opencode.json`)
- Claude Code: `~/.claude.json` / `claude_desktop_config.json`
- Kiro: its MCP settings file

## Step 1 - Install the binary

**Option A - go install (preferred when Go ≥ 1.21 present):**
```bash
go install github.com/aldok10/zara-privacy-mcp/cmd/server@latest
mv "$(go env GOPATH)/bin/server" "$(go env GOPATH)/bin/zara-privacy-mcp"
```

**Option B - prebuilt binary (no Go toolchain):**
```bash
# macOS arm64 example - swap the asset for the user's OS/arch
curl -Lo zara-privacy-mcp \
  https://github.com/aldok10/zara-privacy-mcp/releases/latest/download/zara-privacy-mcp-darwin-arm64
chmod +x zara-privacy-mcp
sudo mv zara-privacy-mcp /usr/local/bin/    # ask before sudo
```
Asset names: `zara-privacy-mcp-linux-amd64`, `zara-privacy-mcp-darwin-arm64`, `zara-privacy-mcp-windows-amd64.exe`.

**Option C - build from source:**
```bash
git clone https://github.com/aldok10/zara-privacy-mcp.git
cd zara-privacy-mcp && make build
```

## Step 2 - Wrapper script (holds connection env vars)

Create an executable wrapper. NEVER hardcode real secrets for the user - use placeholders and tell them to fill in, or read from their existing env. The encryption key is mandatory.

```bash
#!/bin/sh
export ZARA_ENCRYPTION_KEY="<min-16-char-passphrase>"
# Add connections as needed:
# export ZARA_DB_MYDB_DSN="postgres://user:pass@localhost:5432/mydb"
# export ZARA_AI_OPENAI_BASE_URL="https://api.openai.com/v1"
# export ZARA_AI_OPENAI_API_KEY_ENV="OPENAI_KEY"
exec /absolute/path/to/zara-privacy-mcp --stdio
```
```bash
chmod +x mcp-wrapper.sh
```

Connection env var shapes (see `references/configuration.md` for the full set):
- DB: `ZARA_DB_<NAME>_DSN` (driver auto-detected)
- Mongo: `ZARA_MONGO_<NAME>_URI` + `_DATABASE`
- Redis: `ZARA_REDIS_<NAME>_ADDR` + `_PASSWORD`
- HTTP: `ZARA_API_<NAME>_URL` + `_AUTH` + `_AUTH_ENV`
- AI: `ZARA_AI_<NAME>_BASE_URL` + `_API_KEY_ENV` (comma = round-robin pool) + `_MODELS`

## Step 3 - Register with the MCP client

OpenCode (`opencode.json`):
```json
{
  "mcp": {
    "zara-privacy-mcp": {
      "type": "local",
      "command": ["/absolute/path/to/mcp-wrapper.sh"],
      "enabled": true
    }
  }
}
```
Merge into existing `mcp` block - don't clobber other servers. Use absolute paths.

## Step 4 - Verify

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | ./mcp-wrapper.sh 2>/dev/null \
  | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin)[\"result\"][\"tools\"])} tools loaded')"
```
Expect **21 tools loaded**. (The repo README says 20 - it's stale; the binary registers 21 including `version`.)

Then tell the user to restart their AI tool so it picks up the new server.

## Safety during install

- Never write a user's real secrets into a committed file. Wrapper scripts go outside the repo or into `.gitignore`.
- Confirm before `sudo`, before overwriting an existing wrapper, and before editing an MCP config that already has entries.
- If Go is missing and they can't sudo, prefer Option B to a user-writable dir (`~/.local/bin`) and add it to PATH.
