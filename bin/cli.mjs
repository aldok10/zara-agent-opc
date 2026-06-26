#!/usr/bin/env node
// Zara Agent CLI - entry point for `npx zara-agent-opc`
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dir, '..');

const args = process.argv.slice(2);
const cmd = args[0] || 'install';

if (cmd === 'install' || cmd === 'setup') {
  const script = path.join(root, 'scripts', 'install.sh');
  const env = args.includes('--ai-mode') ? 'AI_MODE=1 ' : '';
  try {
    execSync(`${env}bash "${script}"`, { stdio: 'inherit', cwd: root });
  } catch (e) {
    process.exit(e.status || 1);
  }
} else if (cmd === 'mcp') {
  execSync(`node --experimental-sqlite "${path.join(root, 'tools/mcp/index.mjs')}"`, { stdio: 'inherit' });
} else if (cmd === 'test') {
  execSync('node --experimental-sqlite --test --test-concurrency=1 tests/*.test.mjs', { stdio: 'inherit', cwd: root });
} else {
  console.log(`zara-agent-opc v1.2.0

Usage:
  npx zara-agent-opc              Install Zara on this machine
  npx zara-agent-opc install      Same as above
  npx zara-agent-opc --ai-mode    Install with machine-readable JSON output
  npx zara-agent-opc mcp          Start MCP server directly
  npx zara-agent-opc test         Run test suite

Docs: https://github.com/aldok10/zara-agent-opc`);
}
