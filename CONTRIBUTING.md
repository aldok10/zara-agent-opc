# Contributing to Zara Agent

First off, thank you for considering contributing to Zara! We welcome contributions from everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue tracker to avoid duplicates. When you create a bug report, include as many details as possible:

- **Environment**: OS, OpenCode version, LLM model being used
- **Reproduction steps**: Clear, numbered steps
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Configuration**: Your opencode.json (with secrets redacted)
- **Logs**: Any relevant error messages or logs

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating one:

- **Use a clear, descriptive title**
- **Describe the problem** you're trying to solve
- **Explain the proposed solution**
- **Describe alternatives** you've considered
- **Explain why this benefits the community**

### Adding Knowledge Articles

Zara's knowledge base is based on DevIQ articles. To contribute:

1. Fork the repository
2. Add your article in the appropriate `knowledge/<section>/` directory
3. Update the section's `_index.md` with the new article
4. Submit a pull request

### Creating Skills

Skills are reusable workflow patterns. See [Skills Documentation](docs/skills.md) for the format.

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make your changes**: Follow our coding conventions
4. **Test your changes**: Run the test suite
5. **Commit your changes**: Use clear commit messages
6. **Push to your fork**: `git push origin feature/my-feature`
7. **Open a pull request**

## Development Workflow

```bash
# Clone the repository
git clone <repo-url> zara-agent-opc
cd zara-agent-opc

# Verify MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp/index.mjs

# Validate config
cat opencode.json | jq .

# Check agent files
ls .opencode/agent/*.md
```

## Style Guide

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests liberally after the first line

### Prompt Files

- Use markdown formatting
- Front-load context (most important information first)
- Use consistent section headers
- Reference knowledge sources explicitly

### Configuration

- Prefer environment variables over hardcoded values
- Document every configuration option
- Provide sensible defaults
- Never commit secrets

## Pull Request Checklist

- [ ] Documentation updated
- [ ] Tests pass
- [ ] No hardcoded secrets
- [ ] Configuration changes documented
- [ ] Examples updated (if applicable)
- [ ] CHANGELOG.md updated

## Questions?

Open a Discussion or ask in the community chat.

Thank you for contributing!
