# Frequently Asked Questions

## General

### What is Zara?
Zara is your senior engineering partner — warm, direct, and committed to your growth. She coordinates 7 specialized sub-agents to solve complex software engineering problems, grounded in the DevIQ body of knowledge (240+ articles). She operates on senior dev principles: YAGNI-first, stdlib-first, minimal solutions. She cares enough to challenge you and celebrates your growth.

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
If you want the full DevIQ knowledge base, run `./scripts/setup-knowledge.sh`. Zara works without it using general knowledge, but the knowledge base provides grounded engineering references.

### What API keys do I need?
- **Context7 API key** (optional): For live documentation fetching. Get one at https://context7.com
- **LLM API key**: Required by your OpenCode setup for model access.

## Configuration

### How do I change the agent name?
Set `ZARA_AGENT_NAME` in your `.env` file or modify `config.yaml`.

### Can I disable features I don't need?
Yes. Set any `ZARA_ENABLE_*` variable to `false`:
```bash
export ZARA_ENABLE_HIVEMIND=false
export ZARA_ENABLE_SWARM=false
```

### How do I add custom knowledge sources?
Place markdown files in your knowledge directory and update the INDEX. Currently supports DevIQ format articles.

## Usage

### How do I ask Zara to review code?
Just ask for a code review. Zara will engage the code-reviewer sub-agent and reference relevant knowledge articles.

### Can Zara write code?
Zara orchestrates coding tasks through its sub-agents. It analyzes problems, delegates to the appropriate specialist, and reviews the output. It's designed as a reviewer and coordinator, not a code generator.

### How does Zara remember past sessions?
Zara maintains a journal (`journal.jsonl`) and skill index. Before each task, it checks past learnings for relevant context.

### Can I use Zara with other AI coding tools (Cursor, Claude Code, etc.)?
The Hivemind system indexes sessions from multiple AI tools (Claude, Cursor, Gemini, etc.), making learnings available across agents. However, the Zara orchestrator itself runs in OpenCode AI.

## Troubleshooting

### "Knowledge base not found"
Run `./scripts/setup-knowledge.sh` or set `DEVIQ_KNOWLEDGE_PATH` to your knowledge directory.

### "Context7 connection failed"
Check your API key and network connection. If you don't have a key, set `ZARA_ENABLE_CONTEXT7=false`.

### "Sub-agent not responding"
Check that the sub-agent prompt file exists in `prompts/sub-agents/`. Verify configuration in `config.yaml`.

### "Memory not persisting"
Ensure `ZARA_MEMORY_DIR` is writable. Check that `ZARA_ENABLE_MEMORY=true`.

## Contributing

### How can I contribute?
See [CONTRIBUTING.md](../CONTRIBUTING.md). We welcome:
- Bug reports and feature requests
- Knowledge base articles
- Skill files
- Documentation improvements
- Code contributions

### Can I create my own sub-agent?
Yes! Add a prompt file in `prompts/sub-agents/` and register it in `config.yaml` under `sub_agents`.

### How do I report a security issue?
See [SECURITY.md](../SECURITY.md). Do not open public issues for security vulnerabilities.
