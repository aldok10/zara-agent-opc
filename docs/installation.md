# Installation Guide

## Prerequisites

- **OpenCode AI** (v1.0+) — The runtime environment for Zara
- **Git** — For version control and knowledge base management
- **Node.js** (v18+) — Required for plugin system
- **Internet connection** — For Context7 docs and initial setup

## Quick Install

### Option 1: Automatic Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/zara-agent.git
cd zara-agent

# Run the install script
chmod +x scripts/install.sh
./scripts/install.sh

# Follow the prompts to configure
```

### Option 2: Manual Install

```bash
# 1. Clone the repository
git clone https://github.com/your-org/zara-agent.git
cd zara-agent

# 2. Copy configuration
cp .env.example .env

# 3. Edit .env with your settings
#    At minimum, set:
#    - ZARA_HOME (where runtime data lives)
#    - CONTEXT7_API_KEY (optional, for docs)

# 4. Install dependencies (if using plugins)
npm install

# 5. Set up knowledge base
./scripts/setup-knowledge.sh

# 6. Validate installation
./scripts/validate-config.sh
```

### Option 3: OpenCode Integration

```bash
# 1. Symlink Zara into your OpenCode config
ln -sf $(pwd) ~/.config/opencode/zara

# 2. Add to opencode.json:
# {
#   "agent": "zara",
#   "zara": {
#     "config": "path/to/config.yaml"
#   }
# }

# 3. Restart OpenCode to activate
```

## Configuration After Install

See the [Configuration Guide](configuration.md) for detailed setup options.

### Minimum Configuration

```bash
# Set your Zara home directory
export ZARA_HOME=~/.zara

# (Optional) Set Context7 API key for live docs
export CONTEXT7_API_KEY=your_key_here
```

### Verify Installation

```bash
# Check Zara is accessible
zara status

# Expected output:
# ZARA - v1.0.0
# System Status:
#   ✓ Knowledge Base: 240 articles across 12 sections
#   ✓ Sub-Agents: 8 registered
#   ...
```

## Troubleshooting

### "Command not found: zara"

Make sure the Zara CLI is in your PATH:

```bash
export PATH=$PATH:~/.zara/bin
# Or add to ~/.zshrc / ~/.bashrc
```

### "Knowledge base empty"

You need to download the DevIQ articles:

```bash
./scripts/setup-knowledge.sh
```

### "Context7 not working"

Check your API key is set correctly in `.env`:

```bash
echo $CONTEXT7_API_KEY
# Should show your key
```

## Next Steps

- Read the [Architecture Guide](architecture.md) to understand how Zara works
- Check [Configuration](configuration.md) for advanced options
- Browse [Examples](../examples/) to see Zara in action
