// Self-Harness module — Automated self-improvement + security hardening
// Mines failures from reflections, proposes fixes, validates, applies.
// Runs on session events (end) and via explicit tool call.

import fs from 'fs';
import path from 'path';
import { tool } from '@opencode-ai/plugin';
import { HOME, loadJson, saveJson, ensure } from '../infra/store.mjs';

const z = tool.schema;

const HARNESS_DIR = path.join(HOME, 'harness');
const FINDINGS_FILE = path.join(HARNESS_DIR, 'findings.json');
const APPLIED_FILE = path.join(HARNESS_DIR, 'applied.json');
const SECURITY_FILE = path.join(HARNESS_DIR, 'security-log.json');
const REFLECTIONS_LOG = path.join(HOME, 'reflections', 'log.jsonl');
const RULES_FILE = path.join(HOME, 'evolve', 'workflow-rules.json');

// ─── Core Logic ──────────────────────────────────────────────────────────────

function mineFailures(days = 7) {
  try {
    if (!fs.existsSync(REFLECTIONS_LOG)) return [];
    const cutoff = Date.now() - days * 86400000;
    const lines = fs.readFileSync(REFLECTIONS_LOG, 'utf-8').trim().split('\n');
    const failures = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!entry.ts) continue;
        const ts = new Date(entry.ts).getTime();
        if (ts < cutoff) continue;
        if (entry.outcome === 'failure' || entry.outcome === 'partial') {
          failures.push(entry);
        }
      } catch {}
    }
    return failures;
  } catch { return []; }
}

function groupByPattern(failures) {
  const groups = {};
  for (const f of failures) {
    const key = f.pattern || f.failed || f.task || 'unknown';
    if (!groups[key]) groups[key] = { pattern: key, count: 0, entries: [] };
    groups[key].count++;
    groups[key].entries.push(f);
  }
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

function diagnose(group) {
  const entry = group.entries[0];
  const diagnosis = {
    pattern: group.pattern,
    frequency: group.count,
    rootCause: 'unknown',
    fixType: 'unknown',
  };

  if (entry.failed?.includes('permission') || entry.failed?.includes('bash')) {
    diagnosis.rootCause = 'agent-permission-mismatch';
    diagnosis.fixType = 'rule';
  } else if (entry.failed?.includes('stale') || entry.failed?.includes('outdated')) {
    diagnosis.rootCause = 'stale-knowledge';
    diagnosis.fixType = 'memory';
  } else if (group.count >= 3) {
    diagnosis.rootCause = 'recurring-pattern-not-crystallized';
    diagnosis.fixType = 'micro-tool';
  } else {
    diagnosis.rootCause = 'approach-mismatch';
    diagnosis.fixType = 'rule';
  }

  return diagnosis;
}

function proposeFix(diagnosis) {
  const fix = {
    target: diagnosis.pattern,
    type: diagnosis.fixType,
    proposal: '',
    applied: false,
    proposedAt: new Date().toISOString(),
  };

  switch (diagnosis.fixType) {
    case 'rule':
      fix.proposal = `WHEN "${diagnosis.pattern}" → Avoid previous approach. Root cause: ${diagnosis.rootCause}.`;
      break;
    case 'memory':
      fix.proposal = `Learn: "${diagnosis.pattern}" is a known pitfall. Root cause: ${diagnosis.rootCause}.`;
      break;
    case 'micro-tool':
      fix.proposal = `Crystallize: "${diagnosis.pattern}" repeats ${diagnosis.frequency}x. Create micro-tool with working approach.`;
      break;
  }

  return fix;
}

// ─── Security Self-Check ─────────────────────────────────────────────────────

function securityAudit(projectDir) {
  const findings = [];

  // Check .env exposure
  const envFile = path.join(projectDir, '.env');
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf-8');
      const secrets = content.match(/(?:KEY|SECRET|TOKEN|PASSWORD|PRIVATE).*=.+/gi) || [];
      if (secrets.length > 0) {
        // Check if .gitignore covers it
        const gitignore = path.join(projectDir, '.gitignore');
        const ignored = fs.existsSync(gitignore) && fs.readFileSync(gitignore, 'utf-8').includes('.env');
        if (!ignored) {
          findings.push({ severity: 'critical', issue: '.env with secrets not in .gitignore', fix: 'Add .env to .gitignore' });
        }
      }
    } catch {}
  }

  // Check for hardcoded secrets in config
  const configFile = path.join(projectDir, 'opencode.json');
  if (fs.existsSync(configFile)) {
    try {
      const content = fs.readFileSync(configFile, 'utf-8');
      const secretPatterns = /(?:glpat-|ghp_|gho_|sk-|api[_-]?key|password)\s*[:=]\s*["'][^"']+["']/gi;
      const matches = content.match(secretPatterns) || [];
      if (matches.length > 0) {
        findings.push({ severity: 'critical', issue: `Hardcoded secrets in opencode.json (${matches.length} found)`, fix: 'Move to .env or credential helper' });
      }
    } catch {}
  }

  // Check permission model
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      const agents = config.agent || {};
      for (const [key, agent] of Object.entries(agents)) {
        if (agent.mode === 'subagent' && key !== 'implementation') {
          const perm = agent.permission || {};
          if (perm.bash === 'allow' || perm.edit === 'allow') {
            findings.push({ severity: 'medium', issue: `Advisory agent "${key}" has write/bash permission`, fix: `Set permission: { bash: "deny", edit: "deny" }` });
          }
        }
      }
    } catch {}
  }

  // Check MCP server for exposed paths
  const mcpIndex = path.join(projectDir, 'tools', 'mcp', 'index.mjs');
  if (fs.existsSync(mcpIndex)) {
    try {
      const content = fs.readFileSync(mcpIndex, 'utf-8');
      if (content.includes('0.0.0.0') || content.includes('INADDR_ANY')) {
        findings.push({ severity: 'high', issue: 'MCP server listening on all interfaces', fix: 'Bind to 127.0.0.1 or use stdio only' });
      }
    } catch {}
  }

  // Check memory DB permissions
  const memDb = path.join(HOME, 'memory.db');
  if (fs.existsSync(memDb)) {
    try {
      const stat = fs.statSync(memDb);
      const mode = (stat.mode & 0o777).toString(8);
      if (mode !== '600' && mode !== '700') {
        findings.push({ severity: 'medium', issue: `memory.db has permissive mode (${mode})`, fix: 'chmod 600 ~/.zara/memory.db' });
      }
    } catch {}
  }

  return findings;
}

// ─── Module Export ────────────────────────────────────────────────────────────

export default function createHarness({ client, directory } = {}) {
  ensure(HARNESS_DIR);

  return {
    onEvent(event) {
      // Run lightweight security check on session start
      if (event?.type === 'session.created') {
        try {
          const secFindings = securityAudit(directory || process.cwd());
          if (secFindings.length > 0) {
            const log = loadJson(SECURITY_FILE, []);
            log.push({ ts: new Date().toISOString(), findings: secFindings });
            if (log.length > 50) log.splice(0, log.length - 50);
            saveJson(SECURITY_FILE, log);
          }
        } catch (e) {
          process.stderr.write(`[zara-harness] security audit error: ${e.message}\n`);
        }
      }

      // Run self-harness loop on session end (lightweight, auto-apply safe fixes)
      if (event?.type === 'session.ended') {
        try {
          const failures = mineFailures(7);
          if (failures.length >= 2) {
            const groups = groupByPattern(failures);
            const rules = loadJson(RULES_FILE, []);
            let applied = 0;

            for (const group of groups.slice(0, 3)) {
              if (group.count < 2) continue;
              const diag = diagnose(group);
              if (diag.fixType === 'rule') {
                const exists = rules.some(r => r.when.includes(diag.pattern.slice(0, 30)));
                if (!exists) {
                  rules.push({
                    when: diag.pattern,
                    then: `Avoid failed approach. Root: ${diag.rootCause}. Try different strategy.`,
                    priority: group.count >= 3 ? 'high' : 'medium',
                    createdAt: new Date().toISOString(),
                    fired: 0,
                    source: 'self-harness-auto',
                  });
                  applied++;
                }
              }
            }

            if (applied > 0) {
              saveJson(RULES_FILE, rules);
              const appLog = loadJson(APPLIED_FILE, []);
              appLog.push({ ts: new Date().toISOString(), applied, trigger: 'session.ended' });
              if (appLog.length > 30) appLog.splice(0, appLog.length - 30);
              saveJson(APPLIED_FILE, appLog);
            }
          }
        } catch (e) {
          process.stderr.write(`[zara-harness] session-end self-improvement error: ${e.message}\n`);
        }
      }
    },

    inject(messages) {
      // Inject security warnings if critical findings exist
      try {
        const secLog = loadJson(SECURITY_FILE, []);
        if (secLog.length > 0) {
          const latest = secLog[secLog.length - 1];
          const critical = latest.findings?.filter(f => f.severity === 'critical') || [];
          if (critical.length > 0) {
            const warn = `## Security Alert\n${critical.map(f => `- [${f.severity}] ${f.issue} → ${f.fix}`).join('\n')}`;
            const last = messages[messages.length - 1];
            if (last?.role === 'system') last.content += '\n\n' + warn;
            else messages.push({ role: 'system', content: warn });
          }
        }
      } catch {}
      return messages;
    },

    tools: {
      harness_run: tool({
        description: 'Run the full self-harness loop: mine failures, diagnose, propose fixes, and optionally apply. This is automated self-improvement.',
        args: {
          days: z.number().optional().describe('Look back N days for failures (default 7)'),
          apply: z.boolean().optional().describe('Auto-apply safe fixes (default false, dry-run)'),
        },
        async execute(args) {
          const days = args.days || 7;
          const autoApply = args.apply || false;

          // 1. Mine
          const failures = mineFailures(days);
          if (!failures.length) return { output: 'No failures found in the last ' + days + ' days. System healthy.' };

          // 2. Group and rank
          const groups = groupByPattern(failures);
          const topGroups = groups.slice(0, 5);

          // 3. Diagnose and propose
          const results = [];
          for (const group of topGroups) {
            const diag = diagnose(group);
            const fix = proposeFix(diag);
            results.push({ ...diag, fix });

            if (autoApply && fix.type === 'rule') {
              // Auto-apply rules
              const rules = loadJson(RULES_FILE, []);
              const exists = rules.some(r => r.when.includes(diag.pattern));
              if (!exists) {
                rules.push({
                  when: diag.pattern,
                  then: `Avoid previous failed approach. Root cause: ${diag.rootCause}. Try different strategy.`,
                  priority: group.count >= 3 ? 'high' : 'medium',
                  createdAt: new Date().toISOString(),
                  fired: 0,
                  source: 'self-harness',
                });
                saveJson(RULES_FILE, rules);
                fix.applied = true;
              }
            }
          }

          // 4. Save findings
          const findings = loadJson(FINDINGS_FILE, []);
          findings.push({ ts: new Date().toISOString(), results, failureCount: failures.length });
          if (findings.length > 20) findings.splice(0, findings.length - 20);
          saveJson(FINDINGS_FILE, findings);

          // 5. Report
          const lines = results.map(r =>
            `- **${r.pattern}** (${r.frequency}x): ${r.rootCause} → ${r.fix.proposal}${r.fix.applied ? ' [APPLIED]' : ''}`
          );

          return {
            output: `## Self-Harness Report\n\nMined ${failures.length} failures (${days}d). Top ${results.length} patterns:\n\n${lines.join('\n')}\n\n${autoApply ? 'Auto-applied safe fixes.' : 'Dry-run mode. Call with apply:true to auto-fix.'}`,
          };
        },
      }),

      harness_security: tool({
        description: 'Run security self-audit on the current project. Checks secrets exposure, permission model, MCP config, and memory DB security.',
        args: {
          fix: z.boolean().optional().describe('Attempt auto-fix for safe issues (default false)'),
        },
        async execute(args) {
          const projectDir = directory || process.cwd();
          const findings = securityAudit(projectDir);

          if (!findings.length) return { output: 'Security audit clean. No issues found.' };

          // Auto-fix safe issues
          if (args.fix) {
            for (const f of findings) {
              if (f.severity === 'medium' && f.issue.includes('memory.db')) {
                try {
                  const memDb = path.join(HOME, 'memory.db');
                  fs.chmodSync(memDb, 0o600);
                  f.fixed = true;
                } catch {}
              }
            }
          }

          // Log
          const log = loadJson(SECURITY_FILE, []);
          log.push({ ts: new Date().toISOString(), findings, autoFix: args.fix || false });
          if (log.length > 50) log.splice(0, log.length - 50);
          saveJson(SECURITY_FILE, log);

          const lines = findings.map(f =>
            `- [${f.severity}] ${f.issue}${f.fixed ? ' [FIXED]' : ''}\n  Fix: ${f.fix}`
          );

          return {
            output: `## Security Audit\n\n${findings.length} finding(s):\n\n${lines.join('\n\n')}`,
          };
        },
      }),

      harness_history: tool({
        description: 'View self-harness run history and applied fixes.',
        args: {
          type: z.enum(['findings', 'security', 'applied']).optional().describe('What to show (default: findings)'),
        },
        async execute(args) {
          const type = args.type || 'findings';
          let data;

          switch (type) {
            case 'findings':
              data = loadJson(FINDINGS_FILE, []);
              break;
            case 'security':
              data = loadJson(SECURITY_FILE, []);
              break;
            case 'applied':
              data = loadJson(APPLIED_FILE, []);
              break;
          }

          if (!data?.length) return { output: `No ${type} history found.` };
          const recent = data.slice(-5);
          return { output: `## ${type} History (last ${recent.length})\n\n${JSON.stringify(recent, null, 2)}` };
        },
      }),
    },
  };
}
