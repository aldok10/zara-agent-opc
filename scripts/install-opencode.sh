#!/usr/bin/env bash
# =============================================================================
# Zara — OpenCode Integration Installer
# =============================================================================
# Installs Zara as a global OpenCode agent with full config merge.
# Designed for git-clone-based workflow: symlinks project files so updates
# are just `git pull` (or `git checkout vX.Y.Z`) away.
#
# Usage:
#   bash scripts/install-opencode.sh              # full install
#   bash scripts/install-opencode.sh --uninstall  # remove from OpenCode
#   bash scripts/install-opencode.sh --verify     # check only
#   bash scripts/install-opencode.sh --help       # this message
# =============================================================================
set -euo pipefail

# ---- Colors ----
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}○${NC} $1"; }
fail()  { echo -e "  ${RED}✘${NC} $1"; }
step()  { echo ""; echo -e "${CYAN}━━━ $1 ━━━${NC}"; }

# ---- Paths ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

OPENCODE_CONFIG_DIR="${HOME}/.config/opencode"
OPENCODE_JSON="$OPENCODE_CONFIG_DIR/opencode.json"
ZARA_LINK="$OPENCODE_CONFIG_DIR/zara"
PROMPTS_LINK="$OPENCODE_CONFIG_DIR/prompts"

ZARA_HOME="${HOME}/.zara"
ZARA_BIN_DIR="${HOME}/.local/bin"

AGENTS_SKILLS_DIR="${HOME}/.agents/skills"
PROJECT_SKILLS_DIR="$PROJECT_ROOT/.opencode/skills"

MCP_TOOL_DIR="$PROJECT_ROOT/tools/mcp"
PLUGIN_FILE="$PROJECT_ROOT/.opencode/plugin/zara.mjs"

# ---- Help ----
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "Zara — OpenCode Installer"
  echo ""
  echo "Usage:"
  echo "  bash scripts/install-opencode.sh              Full install"
  echo "  bash scripts/install-opencode.sh --uninstall  Remove Zara from OpenCode"
  echo "  bash scripts/install-opencode.sh --verify     Verify installation only"
  echo "  bash scripts/install-opencode.sh --help       This message"
  echo ""
  echo "What it does:"
  echo "  1. Symlink .opencode/     → ~/.config/opencode/zara"
  echo "  2. Symlink prompts/       → ~/.config/opencode/prompts"
  echo "  3. Merge opencode.json    → global config (agents, commands, MCP, plugins, instructions)"
  echo "  4. Fix absolute MCP paths → point to actual clone location"
  echo "  5. Install CLI            → ~/.local/bin/zara"
  echo "  6. Sync skills            → makes project skills available"
  echo "  7. Verify                 → checks everything works"
  exit 0
fi

# ---- Banner ----
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Zara — OpenCode Installer                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Project: $PROJECT_ROOT"
echo "  OpenCode: $OPENCODE_CONFIG_DIR"
echo "  Runtime:  $ZARA_HOME"
echo ""

# ---- Uninstall ----
if [ "${1:-}" = "--uninstall" ]; then
  step "Uninstalling Zara from OpenCode"

  # Remove symlinks
  for link in "$ZARA_LINK" "$PROMPTS_LINK"; do
    if [ -L "$link" ] || [ -d "$link" ]; then
      rm -rf "$link"
      info "Removed $link"
    fi
  done

  # Remove CLI
  if [ -f "$ZARA_BIN_DIR/zara" ]; then
    rm -f "$ZARA_BIN_DIR/zara"
    info "Removed $ZARA_BIN_DIR/zara"
  fi

  warn "Runtime data preserved at $ZARA_HOME"
  warn "Global opencode.json not modified (manual cleanup if needed)"
  echo ""
  echo -e "${GREEN}Zara removed from OpenCode. Project files remain at:${NC}"
  echo "  $PROJECT_ROOT"
  exit 0
fi

# ---- Verify only ----
if [ "${1:-}" = "--verify" ]; then
  step "Verification"
  ALL_OK=true

  check() {
    if [ -e "$1" ] || [ -L "$1" ]; then
      info "$2"
    else
      fail "$2"
      ALL_OK=false
    fi
  }

  check "$ZARA_LINK"               "Symlink: ~/.config/opencode/zara → .opencode/"
  check "$PROMPTS_LINK"            "Symlink: ~/.config/opencode/prompts → prompts/"
  check "$OPENCODE_JSON"           "Config:  opencode.json exists"

  # Check agents (filenames = agent names, not config keys)
  check "$ZARA_LINK/agent/zara.md"   "Agent:   zara (Zara)"
  check "$ZARA_LINK/agent/atlas.md"  "Agent:   atlas (architect)"
  check "$ZARA_LINK/agent/lens.md"   "Agent:   lens (code-reviewer)"
  check "$ZARA_LINK/agent/shield.md" "Agent:   shield (security-reviewer)"
  check "$ZARA_LINK/agent/probe.md"  "Agent:   probe (testing-lead)"
  check "$ZARA_LINK/agent/pulse.md"  "Agent:   pulse (delivery-lead)"
  check "$ZARA_LINK/agent/rhythm.md" "Agent:   rhythm (loop-engineer)"
  check "$ZARA_LINK/agent/hive.md"   "Agent:   hive (swarm)"
  check "$ZARA_LINK/agent/sketch.md" "Agent:   sketch (plan)"
  check "$ZARA_LINK/agent/forge.md"  "Agent:   forge (implementation)"

  # Check commands
  for cmd in audit auto code decide focus goal handoff install loop music resume review shutdown standup swarm think zara version update; do
    check "$ZARA_LINK/commands/$cmd.md" "Command: /$cmd"
  done

  check "$PLUGIN_FILE"             "Plugin:  zara.mjs"
  check "$MCP_TOOL_DIR/index.mjs"  "MCP:     Orchestrator server"
  check "$ZARA_BIN_DIR/zara"       "CLI:     ~/.local/bin/zara"
  check "$ZARA_HOME"               "Runtime: ~/.zara/"

  # Check config merge
  if [ -f "$OPENCODE_JSON" ]; then
    MISSING=$(python3 -c "
import json
with open('$OPENCODE_JSON') as f:
    cfg = json.load(f)
agents = cfg.get('agent', {})
for a in ['zara','plan','architect','code-reviewer','testing-lead','security-reviewer','delivery-lead','swarm','loop-engineer','implementation']:
    if a not in agents: print(f'  Missing agent: {a}')
cmds = cfg.get('command', {})
for c in ['audit','auto','code','decide','focus','goal','handoff','install','loop','music','resume','review','shutdown','standup','swarm','think','zara','version','update']:
    if c not in cmds: print(f'  Missing command: {c}')
if 'plugin' not in cfg or not cfg['plugin']: print('  Missing plugin')
if 'mcp' not in cfg or 'Orchestrator' not in cfg.get('mcp',{}): print('  Missing Orchestrator MCP')
print('---done---')
")
    if echo "$MISSING" | grep -v 'done' | head -1; then
      warn "Config has gaps"
      echo "$MISSING" | grep -v 'done'
    else
      info "opencode.json merge complete"
    fi
  fi

  echo ""
  if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}All checks passed. Zara is fully installed.${NC}"
  else
    echo -e "${YELLOW}Some checks failed. Re-run install to fix.${NC}"
  fi
  exit 0
fi

# =============================================================================
# PHASE 1: Create Directories
# =============================================================================
step "Phase 1/7 — Creating directories"

mkdir -p "$OPENCODE_CONFIG_DIR"
mkdir -p "$ZARA_HOME"/{skills,memory,sessions,agents}
mkdir -p "$ZARA_BIN_DIR"
mkdir -p "$AGENTS_SKILLS_DIR"

info "OpenCode config:  $OPENCODE_CONFIG_DIR"
info "Zara runtime:     $ZARA_HOME"
info "Zara CLI:         $ZARA_BIN_DIR"

# =============================================================================
# PHASE 2: Symlink Project Files
# =============================================================================
step "Phase 2/7 — Symlinking project files"

# Remove existing symlinks/dirs
for target in "$ZARA_LINK" "$PROMPTS_LINK"; do
  if [ -e "$target" ] || [ -L "$target" ]; then
    rm -rf "$target"
  fi
done

# Create symlinks
ln -sf "$PROJECT_ROOT/.opencode" "$ZARA_LINK"
ln -sf "$PROJECT_ROOT/prompts"   "$PROMPTS_LINK"

info "~/.config/opencode/zara    → $PROJECT_ROOT/.opencode"
info "~/.config/opencode/prompts → $PROJECT_ROOT/prompts"

# =============================================================================
# PHASE 3: Merge opencode.json
# =============================================================================
step "Phase 3/7 — Merging opencode.json"

PYTHON_MERGE_SCRIPT=$(cat << 'PYEOF'
import json, sys, os

project_json_path = sys.argv[1]
global_json_path  = sys.argv[2]
project_root      = sys.argv[3]

with open(project_json_path) as f:
    project = json.load(f)

# Read or init global config
if os.path.exists(global_json_path):
    with open(global_json_path) as f:
        global_cfg = json.load(f)
else:
    global_cfg = {}

# Merge: deep merge agents, commands; append plugins; merge MCP
# Project config takes priority for agents, commands, MCP, permissions

# 1. Schema
if '$schema' not in global_cfg:
    global_cfg['$schema'] = project.get('$schema')

# 2. default_agent
global_cfg['default_agent'] = project.get('default_agent', 'zara')

# 3. autoupdate
if 'autoupdate' not in global_cfg:
    global_cfg['autoupdate'] = project.get('autoupdate', True)

# 4. Instructions — merge with zara/ prefix (paths relative to symlink)
project_instructions = project.get('instructions', [])
zara_instructions = []
for inst in project_instructions:
    # Rewrite paths: .opencode/xxx → zara/xxx, prompts/xxx → prompts/xxx
    if inst.startswith('.opencode/'):
        zara_instructions.append('zara/' + inst[len('.opencode/'):])
    elif inst.startswith('prompts/'):
        zara_instructions.append(inst)
    else:
        zara_instructions.append(inst)

existing = global_cfg.get('instructions', [])
# Prepend Zara instructions (don't duplicate)
seen = set(existing)
for inst in reversed(zara_instructions):
    if inst not in seen:
        existing.insert(0, inst)
        seen.add(inst)
global_cfg['instructions'] = existing

# 5. Agents — project agents override global with zara/ path rewrite
project_agents = project.get('agent', {})
if 'agent' not in global_cfg:
    global_cfg['agent'] = {}
for name, agent_cfg in project_agents.items():
    cfg = dict(agent_cfg)
    # Rewrite prompt paths
    prompt = cfg.get('prompt', '')
    if prompt.startswith('{file:.opencode/'):
        cfg['prompt'] = '{file:zara/' + prompt[len('{file:.opencode/'):]
    global_cfg['agent'][name] = cfg

# 6. Commands — merge from project, rewrite paths
project_commands = project.get('command', {})
if 'command' not in global_cfg:
    global_cfg['command'] = {}
for name, cmd_cfg in project_commands.items():
    cfg = dict(cmd_cfg)
    template = cfg.get('template', '')
    if template.startswith('{file:.opencode/'):
        cfg['template'] = '{file:zara/' + template[len('{file:.opencode/'):]
    elif template.startswith('{file:.opencode/'):
        cfg['template'] = '{file:zara/' + template[len('{file:.opencode/'):]
    global_cfg['command'][name] = cfg

# 7. Plugin — merge, project plugins first, avoid absolute paths
project_plugins = project.get('plugin', [])
rewritten_plugins = []
for p in project_plugins:
    if p.startswith('.opencode/'):
        rewritten_plugins.append('./zara/' + p[len('.opencode/'):])
    elif p.startswith('/'):
        # Absolute path — rewrite relative to project
        rel = os.path.relpath(p, project_root)
        rewritten_plugins.append('./zara/' + rel)
    else:
        rewritten_plugins.append(p)

existing_plugins = global_cfg.get('plugin', [])
# Keep existing plugins that aren't Zara duplicates
non_zara_plugins = [p for p in existing_plugins if 'zara' not in p.lower()]
global_cfg['plugin'] = rewritten_plugins + non_zara_plugins

# 8. MCP — merge from project, fix Orchestrator path to absolute
project_mcp = project.get('mcp', {})
if 'mcp' not in global_cfg:
    global_cfg['mcp'] = {}

for name, mcp_cfg in project_mcp.items():
    cfg = dict(mcp_cfg)
    if name == 'Orchestrator':
        # Fix command path to absolute
        cmd = cfg.get('command', [])
        if cmd and len(cmd) > 1:
            # Rewrite relative path to absolute
            cmd_path = cmd[1]
            if not cmd_path.startswith('/'):
                cmd[1] = os.path.join(project_root, cmd_path)
                cfg['command'] = cmd
    global_cfg['mcp'][name] = cfg

# 9. Permission
project_permission = project.get('permission', {})
if 'permission' not in global_cfg:
    global_cfg['permission'] = {}
for key, val in project_permission.items():
    if key not in global_cfg['permission']:
        global_cfg['permission'][key] = val

# Write
with open(global_json_path, 'w') as f:
    json.dump(global_cfg, f, indent=2)
    f.write('\n')

print("Merge complete")
PYEOF
)

python3 -c "$PYTHON_MERGE_SCRIPT" \
  "$PROJECT_ROOT/opencode.json" \
  "$OPENCODE_JSON" \
  "$PROJECT_ROOT"

info "Merged project opencode.json → global config"

# Validate merged JSON
python3 -m json.tool "$OPENCODE_JSON" > /dev/null 2>&1 && \
  info "Validated: opencode.json is valid JSON" || \
  warn "opencode.json validation failed"

# =============================================================================
# PHASE 4: Install CLI
# =============================================================================
step "Phase 4/7 — Installing Zara CLI"

if [ -f "$PROJECT_ROOT/tools/zara.sh" ]; then
  cat > "$ZARA_BIN_DIR/zara" << 'WRAPPER'
#!/usr/bin/env bash
# Zara CLI wrapper — auto-discovers zara.sh in the OpenCode config
set -euo pipefail
ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"

# Find zara.sh via the symlink
for loc in \
  "${HOME}/.config/opencode/zara/tools/zara.sh" \
  "${HOME}/.zara/tools/zara.sh" \
  "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/tools/zara.sh"; do
  if [ -f "$loc" ]; then
    exec bash "$loc" "$@"
  fi
done

echo "Zara CLI not found. Run install-opencode.sh to fix." >&2
exit 1
WRAPPER
  chmod +x "$ZARA_BIN_DIR/zara"
  info "CLI installed: $ZARA_BIN_DIR/zara"
else
  warn "tools/zara.sh not found — CLI skipped"
fi

# =============================================================================
# PHASE 5: Sync Skills
# =============================================================================
step "Phase 5/7 — Syncing skills"

SYNCED=0
if [ -d "$PROJECT_SKILLS_DIR" ]; then
  for skill_dir in "$PROJECT_SKILLS_DIR"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name=$(basename "$skill_dir")
    target="$AGENTS_SKILLS_DIR/$skill_name"
    if [ ! -e "$target" ]; then
      ln -sf "$skill_dir" "$target"
      SYNCED=$((SYNCED + 1))
    fi
  done
fi
info "Synced $SYNCED skills to $AGENTS_SKILLS_DIR (existing skipped)"

# =============================================================================
# PHASE 6: Create Runtime Directory
# =============================================================================
step "Phase 6/7 — Setting up runtime directory"

# Create version note
echo "$(date '+%Y-%m-%d %H:%M') — Installed from $PROJECT_ROOT" > "$ZARA_HOME/install-info.txt"

# Copy agent files for zara CLI's use
if [ -d "$PROJECT_ROOT/.opencode/agent" ]; then
  for agent_file in "$PROJECT_ROOT/.opencode/agent/"*.md; do
    [ -f "$agent_file" ] || continue
    name=$(basename "$agent_file")
    cp "$agent_file" "$ZARA_HOME/agents/$name" 2>/dev/null || true
  done
  info "Agent files copied to $ZARA_HOME/agents/"
fi

info "Runtime directory ready at $ZARA_HOME"

# =============================================================================
# PHASE 7: Verify
# =============================================================================
step "Phase 7/7 — Verification"

PASS=0
FAIL=0

verify() {
  if [ -e "$1" ] || [ -L "$1" ]; then
    info "$2"
    PASS=$((PASS + 1))
  else
    fail "$2"
    FAIL=$((FAIL + 1))
  fi
}

# Core symlinks
verify "$ZARA_LINK"           "Symlink: zara/ → .opencode/"
verify "$PROMPTS_LINK"        "Symlink: prompts/ → prompts/"

# Config
verify "$OPENCODE_JSON"       "Global config exists"

# Agents (via symlink — filename = agent name, key = config key)
verify "$ZARA_LINK/agent/zara.md"              "Agent: zara (Zara)"
verify "$ZARA_LINK/agent/atlas.md"             "Agent: atlas → architect (Atlas)"
verify "$ZARA_LINK/agent/lens.md"              "Agent: lens → code-reviewer (Lens)"
verify "$ZARA_LINK/agent/shield.md"            "Agent: shield → security-reviewer (Shield)"
verify "$ZARA_LINK/agent/probe.md"             "Agent: probe → testing-lead (Probe)"
verify "$ZARA_LINK/agent/pulse.md"             "Agent: pulse → delivery-lead (Pulse)"
verify "$ZARA_LINK/agent/rhythm.md"            "Agent: rhythm → loop-engineer (Rhythm)"
verify "$ZARA_LINK/agent/hive.md"              "Agent: hive → swarm (Hive)"
verify "$ZARA_LINK/agent/sketch.md"            "Agent: sketch → plan (Sketch)"
verify "$ZARA_LINK/agent/forge.md"             "Agent: forge → implementation (Forge)"

# Commands
verify "$ZARA_LINK/commands/audit.md"          "Command: /audit"
verify "$ZARA_LINK/commands/auto.md"           "Command: /auto"
verify "$ZARA_LINK/commands/code.md"           "Command: /code"
verify "$ZARA_LINK/commands/decide.md"         "Command: /decide"
verify "$ZARA_LINK/commands/focus.md"          "Command: /focus"
verify "$ZARA_LINK/commands/goal.md"           "Command: /goal"
verify "$ZARA_LINK/commands/handoff.md"        "Command: /handoff"
verify "$ZARA_LINK/commands/install.md"        "Command: /install"
verify "$ZARA_LINK/commands/loop.md"           "Command: /loop"
verify "$ZARA_LINK/commands/music.md"          "Command: /music"
verify "$ZARA_LINK/commands/resume.md"         "Command: /resume"
verify "$ZARA_LINK/commands/review.md"         "Command: /review"
verify "$ZARA_LINK/commands/shutdown.md"       "Command: /shutdown"
verify "$ZARA_LINK/commands/standup.md"        "Command: /standup"
verify "$ZARA_LINK/commands/swarm.md"          "Command: /swarm"
verify "$ZARA_LINK/commands/think.md"          "Command: /think"
verify "$ZARA_LINK/commands/zara.md"           "Command: /zara"
verify "$ZARA_LINK/commands/version.md"        "Command: /version"
verify "$ZARA_LINK/commands/update.md"         "Command: /update"

# Plugin
verify "$PLUGIN_FILE"          "Plugin: zara.mjs"

# MCP
verify "$MCP_TOOL_DIR/index.mjs" "MCP: Orchestrator server"

# CLI
verify "$ZARA_BIN_DIR/zara"    "CLI: ~/.local/bin/zara"

# Runtime
verify "$ZARA_HOME"            "Runtime: ~/.zara/"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Installation Complete${NC}"
echo -e "${GREEN}  $PASS passed, $FAIL failed${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${YELLOW}Some items failed. Check paths above.${NC}"
  exit 1
fi

# ---- Next Steps ----
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Next Steps                                                ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  1. Restart OpenCode to activate Zara                      ║"
echo "║  2. OpenCode will load Zara with all agents and commands   ║"
echo "║  3. Run /version to check installed version                ║"
echo "║  4. To update later: git pull (in the project directory)   ║"
echo "║     then re-run this script                                ║"
echo "║  5. Set CONTEXT7_API_KEY env var for live docs             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
