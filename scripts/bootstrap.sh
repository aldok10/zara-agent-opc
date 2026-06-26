#!/usr/bin/env bash
# Zara Agent — Single-command bootstrap for any OS.
# curl -fsSL https://raw.githubusercontent.com/aldok10/zara-agent-opc/v1.x.x/scripts/bootstrap.sh | bash
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[zara]${NC} $1"; }
warn() { echo -e "${YELLOW}[zara]${NC} $1"; }
fail() { echo -e "${RED}[zara]${NC} $1"; exit 1; }

REPO="https://github.com/aldok10/zara-agent-opc.git"
BRANCH="v1.x.x"
INSTALL_DIR="${ZARA_INSTALL_DIR:-$HOME/.local/share/zara-agent-opc}"

# 1. Check prerequisites
info "Checking prerequisites..."

command -v git >/dev/null 2>&1 || fail "git not found. Install git first."
command -v node >/dev/null 2>&1 || fail "Node.js not found. Install Node.js >=22.14.0 first."

NODE_VER=$(node -e "const [ma,mi]=process.versions.node.split('.').map(Number);process.stdout.write(ma+'.'+mi)")
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VER" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 14 ]; }; then
  fail "Node.js >=22.14.0 required (found $(node --version)). Upgrade: https://nodejs.org"
fi
info "Node.js $(node --version) OK"

# 2. Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" fetch origin "$BRANCH" --quiet
  git -C "$INSTALL_DIR" checkout "$BRANCH" --quiet
  git -C "$INSTALL_DIR" pull origin "$BRANCH" --quiet
else
  info "Cloning zara-agent-opc to $INSTALL_DIR..."
  git clone --branch "$BRANCH" --depth 1 "$REPO" "$INSTALL_DIR"
fi

# 3. Install dependencies
info "Installing dependencies..."
cd "$INSTALL_DIR"
npm install --omit=dev --quiet 2>/dev/null

# 4. Run the OpenCode installer
info "Running OpenCode integration installer..."
bash scripts/install-opencode.sh

# 5. Verify
info "Verifying MCP server..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node --experimental-sqlite tools/mcp/index.mjs 2>/dev/null | node -e "
  let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const r=JSON.parse(d);
    const n=r.result?.tools?.length||0;
    if(n>0){console.log('  MCP server OK: '+n+' tools registered');process.exit(0)}
    else{console.error('  MCP server failed');process.exit(1)}
  })
" && info "Installation complete." || warn "MCP verification failed. Check Node.js version."

echo ""
info "Next: restart OpenCode in any project directory. Zara will be your default agent."
info "To update later: cd $INSTALL_DIR && git pull && npm install"
