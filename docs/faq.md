# Frequently Asked Questions

## General

### What is Zara?
Zara is your senior engineering partner, warm, direct, and committed to your growth. She coordinates 9 specialized sub-agents to solve complex software engineering problems, grounded in the DevIQ body of knowledge (254 articles seeded into semantic memory). She operates on senior dev principles: YAGNI-first, stdlib-first, minimal solutions. She cares enough to challenge you and celebrates your growth.

### Do I need OpenCode AI to use Zara?
Yes, Zara is designed as an OpenCode AI agent. While the prompts, workflows, and documentation are standalone, the runtime requires OpenCode AI or compatible infrastructure.

### Is Zara free?
Yes, Zara is open source under the MIT license. You may need API keys for certain features (Context7, LLM access).

## Setup

### How do I install Zara?
See the [Installation Guide](installation.md). Quick version:
```bash
git clone <repo>
cd zara-agent
./scripts/install.sh
```

### Do I need to download the knowledge base?
The knowledge base (254+ articles) is included in the repo under `knowledge/`. On first session, Zara seeds it into semantic memory automatically via `knowledge_load_init`. No manual setup needed.

### What API keys do I need?
- **Context7 API key** (optional): For live documentation fetching. Get one at https://context7.com
- **LLM API key**: Required by your OpenCode setup for model access.

## Configuration

### How do I change the agent name?
Set `ZARA_AGENT_NAME` in your `.env` file or modify `opencode.json`.

### Can I disable features I don't need?
Yes. All config is in `opencode.json`. Disable agents by removing their entry, disable MCP by setting `"enabled": false`, disable plugins by removing from the `"plugin"` array.

### How do I add custom knowledge sources?
Place markdown files in your knowledge directory and update the INDEX. Currently supports DevIQ format articles.

## Usage

### How do I ask Zara to review code?
Just ask for a code review. Zara will engage Lens (the code review sub-agent) and reference relevant knowledge articles.

### Can Zara write code?
Yes. Zara writes code directly and also delegates to Forge (@forge), the implementation sub-agent, for larger tasks. The workflow is: analyze problem, plan approach, write code (TDD-first), verify. Zara is both a hands-on engineer and an orchestrator.

### How does Zara remember past sessions?
Zara maintains a SQLite memory database (`~/.zara/memory.db`) with FTS5 full-text search. Before each task, it recalls relevant facts, events, and workflows from past sessions.

### Can I use Zara with other AI coding tools (Cursor, Claude Code, etc.)?
Zara is designed for OpenCode AI. Cross-tool session sharing (hivemind) is planned but not yet implemented. Currently, memory is scoped to the OpenCode session where it runs.

## Troubleshooting

### "Knowledge base not found"
The knowledge base seeds automatically on first session. If it fails, verify `knowledge/` directory exists and run: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"knowledge_load_init","arguments":{}}}' | node tools/mcp/index.mjs`

### "Context7 connection failed"
Check your API key and network connection. If you don't have a key, the feature gracefully degrades - docs fetching is optional.

### "Sub-agent not responding"
Check that the sub-agent prompt file exists in `.opencode/agent/`. Verify configuration in `opencode.json`.

### "Memory not persisting"
Ensure `ZARA_MEMORY_DIR` is writable in `config.yaml` or your `.env` file.

## Contributing

### How can I contribute?
See [CONTRIBUTING.md](../CONTRIBUTING.md). We welcome:
- Bug reports and feature requests
- Knowledge base articles
- Skill files
- Documentation improvements
- Code contributions

### Can I create my own sub-agent?
Yes! Add a prompt file in `.opencode/agent/` and register it in `opencode.json` under `agent`.

### How do I report a security issue?
See [SECURITY.md](../SECURITY.md). Do not open public issues for security vulnerabilities.
