// Zara Install — One-command global setup
//
// /zara install  — Install Zara to global OpenCode config
// /zara uninstall — Remove Zara from global config
// /zara status   — Check installation status
//
// Zero dependencies. Pure Node.js. Works on macOS, Linux, Windows.

import fs from 'fs';
import path from 'path';
import os from 'os';

const PLUGIN_NAME = 'zara-install';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function paths() {
  const home = os.homedir();
  const configDir = path.join(home, '.config', 'opencode');
  const zaraLink = path.join(configDir, 'zara');
  const configFile = path.join(configDir, 'opencode.json');
  const zaraHome = path.join(home, '.zara');
  const zaraBin = path.join(home, '.local', 'bin', 'zara');

  // Detect project root (wherever this plugin lives)
  const projectRoot = new URL('..', import.meta.url).pathname;
  const opencodeDir = path.join(projectRoot, '.opencode');

  return { home, configDir, zaraLink, configFile, zaraHome, zaraBin, projectRoot, opencodeDir };
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

function install(log) {
  const p = paths();
  const steps = [];

  // Step 1: Ensure ~/.config/opencode exists
  fs.mkdirSync(p.configDir, { recursive: true });
  steps.push('config directory ready');

  // Step 2: Create symlink ~/.config/opencode/zara → .opencode/
  try {
    if (fs.existsSync(p.zaraLink) || fs.lstatSync(p.zaraLink).isSymbolicLink()) {
      fs.unlinkSync(p.zaraLink);
    }
  } catch {}
  try {
    if (fs.existsSync(p.zaraLink)) {
      fs.rmSync(p.zaraLink, { recursive: true, force: true });
    }
  } catch {}
  fs.symlinkSync(p.opencodeDir, p.zaraLink, 'junction');
  steps.push('symlink created');

  // Step 3: Update or create opencode.json
  let config = {};
  try {
    if (fs.existsSync(p.configFile)) {
      config = JSON.parse(fs.readFileSync(p.configFile, 'utf-8'));
    }
  } catch {}

  config.$schema = config.$schema || 'https://opencode.ai/config.json';
  config.agent = { name: 'zara', prompt: 'zara/agents/zara.md' };
  config.agents = {
    architect: { subagent: true, prompt: 'zara/agents/architect.md' },
    'code-reviewer': { subagent: true, prompt: 'zara/agents/code-reviewer.md' },
    'testing-lead': { subagent: true, prompt: 'zara/agents/testing-lead.md' },
    'practices-lead': { subagent: true, prompt: 'zara/agents/practices-lead.md' },
    'ddd-specialist': { subagent: true, prompt: 'zara/agents/ddd-specialist.md' },
    'security-reviewer': { subagent: true, prompt: 'zara/agents/security-reviewer.md' },
    'delivery-lead': { subagent: true, prompt: 'zara/agents/delivery-lead.md' },
  };
  config.commands = {
    ...(config.commands || {}),
    zara: 'zara/commands/zara.md',
    handoff: 'zara/commands/handoff.md',
    resume: 'zara/commands/resume.md',
    install: 'zara/commands/install.md',
  };
  config.plugin = [
    ...new Set([
      ...(config.plugin || []),
      './zara/plugins/zara-senior-dev.mjs',
      './zara/plugins/zara-auto-resume.mjs',
      './zara/plugins/zara-ctx.mjs',
      './zara/plugins/zara-hitl.mjs',
      './zara/plugins/zara-install.mjs',
    ]),
  ];
  config.mcp = {
    ...(config.mcp || {}),
    context7: {
      type: 'remote',
      url: 'https://mcp.context7.com/mcp',
      enabled: true,
      headers: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' },
    },
  };

  fs.writeFileSync(p.configFile, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  steps.push('opencode.json updated');

  // Step 4: Create ~/.zara runtime directory
  fs.mkdirSync(path.join(p.zaraHome, 'state'), { recursive: true });
  fs.mkdirSync(path.join(p.zaraHome, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(p.zaraHome, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(p.zaraHome, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(p.zaraHome, 'agents'), { recursive: true });
  steps.push('runtime directory ready');

  // Step 5: Install CLI
  const cliSource = path.join(p.projectRoot, 'tools', 'zara.sh');
  if (fs.existsSync(cliSource)) {
    fs.mkdirSync(path.dirname(p.zaraBin), { recursive: true });
    const wrapper = `#!/usr/bin/env bash
export ZARA_HOME="${p.zaraHome}"
export ZARA_KNOWLEDGE_DIR="\${ZARA_KNOWLEDGE_DIR:-\${ZARA_HOME}/knowledge}"
exec bash "${cliSource}" "$@"
`;
    try { fs.unlinkSync(p.zaraBin); } catch {}
    fs.writeFileSync(p.zaraBin, wrapper, 'utf-8');
    fs.chmodSync(p.zaraBin, 0o755);
    steps.push('CLI installed');
  }

  log(`install complete — ${steps.length} steps`, { steps });

  return {
    ok: true,
    message: 'Zara installed globally. Restart OpenCode to activate.',
    details: {
      config: p.configFile,
      symlink: `${p.zaraLink} → ${p.opencodeDir}`,
      runtime: p.zaraHome,
      cli: p.zaraBin,
    },
  };
}

// ---------------------------------------------------------------------------
// Uninstall
// ---------------------------------------------------------------------------

function uninstall(log) {
  const p = paths();
  const removed = [];

  // Remove symlink
  try {
    if (fs.existsSync(p.zaraLink) || fs.lstatSync(p.zaraLink).isSymbolicLink()) {
      fs.unlinkSync(p.zaraLink);
      removed.push('symlink');
    }
  } catch {}

  // Remove Zara config from opencode.json
  try {
    if (fs.existsSync(p.configFile)) {
      const config = JSON.parse(fs.readFileSync(p.configFile, 'utf-8'));
      delete config.agent;
      delete config.agents;
      if (config.commands) {
        delete config.commands.zara;
        delete config.commands.handoff;
        delete config.commands.resume;
        delete config.commands.install;
      }
      if (config.plugin) {
        config.plugin = config.plugin.filter(p => !p.includes('zara-'));
      }
      fs.writeFileSync(p.configFile, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      removed.push('config cleaned');
    }
  } catch {}

  // Remove CLI
  try {
    if (fs.existsSync(p.zaraBin)) {
      fs.unlinkSync(p.zaraBin);
      removed.push('CLI');
    }
  } catch {}

  log(`uninstall complete — removed ${removed.length} items`, { removed });

  return {
    ok: true,
    message: 'Zara removed from global config. Runtime data preserved at ~/.zara.',
    removed,
  };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

function status(log) {
  const p = paths();
  const checks = [];

  // Check symlink
  const linkOk = fs.existsSync(p.zaraLink) || (() => { try { return fs.lstatSync(p.zaraLink).isSymbolicLink(); } catch { return false; } })();
  checks.push({ check: 'symlink', ok: linkOk, detail: linkOk ? `${p.zaraLink} → ${p.opencodeDir}` : 'not found' });

  // Check config
  let configOk = false;
  let hasZara = false;
  try {
    if (fs.existsSync(p.configFile)) {
      configOk = true;
      const config = JSON.parse(fs.readFileSync(p.configFile, 'utf-8'));
      hasZara = config.agent?.name === 'zara';
    }
  } catch {}
  checks.push({ check: 'config', ok: configOk && hasZara, detail: configOk ? (hasZara ? 'Zara configured' : 'config exists, no Zara') : 'no config' });

  // Check runtime
  const runtimeOk = fs.existsSync(p.zaraHome);
  checks.push({ check: 'runtime', ok: runtimeOk, detail: runtimeOk ? p.zaraHome : 'not found' });

  // Check CLI
  const cliOk = fs.existsSync(p.zaraBin);
  checks.push({ check: 'cli', ok: cliOk, detail: cliOk ? p.zaraBin : 'not found' });

  // Check plugins
  const pluginsDir = path.join(p.opencodeDir, 'plugins');
  let pluginCount = 0;
  try {
    if (fs.existsSync(pluginsDir)) {
      pluginCount = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.mjs')).length;
    }
  } catch {}
  checks.push({ check: 'plugins', ok: pluginCount > 0, detail: `${pluginCount} plugins available` });

  const allOk = checks.every(c => c.ok);
  log('status check', { checks, allOk });

  return { ok: true, installed: allOk, checks };
}

// ---------------------------------------------------------------------------
// Plugin Registration
// ---------------------------------------------------------------------------

export default function zaraInstallPlugin(ctx) {
  const log = (msg, data) => ctx.client.app.log(`[${PLUGIN_NAME}] ${msg}`, data ?? '');

  ctx.zaraInstall = { install: () => install(log), uninstall: () => uninstall(log), status: () => status(log) };

  log('ready — /zara install, /zara uninstall, /zara status');

  return () => log('shutdown');
}

export { install, uninstall, status };
