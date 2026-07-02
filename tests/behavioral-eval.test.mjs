// Behavioral Eval Harness (Issue #11)
// Tests what Zara DOES, not just plumbing. Regression gate for prompt changes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const PROJECT = path.resolve('.');

// --- Helper: load all prompt files content ---
function loadPromptFiles() {
  const files = [
    '.opencode/agent/zara.md',
    '.opencode/instructions/system.md',
    'AGENTS.md',
    'ZARA_CONSTITUTION.md',
  ];
  return files.map(f => {
    try { return fs.readFileSync(path.join(PROJECT, f), 'utf-8'); } catch { return ''; }
  }).join('\n');
}

// --- Banned words list (from system.md Anti-AI Writing) ---
const BANNED_WORDS = ['delve', 'realm', 'meticulous', 'pivotal', 'robust', 'seamless', 'leverage', 'navigate', 'comprehensive', 'facilitate', 'landscape', 'foster', 'ensuring', 'furthermore', 'additionally'];
const EM_DASH = '\u2014';

describe('behavioral eval: voice compliance', () => {
  const prompts = loadPromptFiles();

  it('no em-dashes in agent prompt files', () => {
    const agentDir = path.join(PROJECT, '.opencode/agent');
    const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(agentDir, f), 'utf-8');
      const lines = content.split('\n');
      const violations = lines.filter(l => l.includes(EM_DASH));
      assert.equal(violations.length, 0, `${f} contains em-dash on ${violations.length} lines`);
    }
  });

  it('no banned words in agent prompt files', () => {
    const agentDir = path.join(PROJECT, '.opencode/agent');
    const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(agentDir, f), 'utf-8').toLowerCase();
      for (const word of BANNED_WORDS) {
        // Allow the word inside the banned-words definition line itself
        const lines = content.split('\n');
        const violations = lines.filter(l => l.includes(word) && !l.includes('banned'));
        assert.equal(violations.length, 0, `${f} uses banned word "${word}"`);
      }
    }
  });

  it('system.md defines banned words list', () => {
    const sys = fs.readFileSync(path.join(PROJECT, '.opencode/instructions/system.md'), 'utf-8');
    assert.ok(sys.includes('BANNED'), 'system.md must define BANNED words');
    for (const word of BANNED_WORDS.slice(0, 5)) {
      assert.ok(sys.toLowerCase().includes(word), `system.md must list "${word}" as banned`);
    }
  });
});

describe('behavioral eval: anti-sycophancy', () => {
  it('system.md defines push-back triggers', () => {
    const sys = fs.readFileSync(path.join(PROJECT, '.opencode/instructions/system.md'), 'utf-8');
    assert.ok(sys.includes('Anti-Sycophancy') || sys.includes('anti-sycophancy') || sys.includes('Push back'), 'Must define anti-sycophancy rules');
    assert.ok(sys.includes('stdlib') || sys.includes('dependency'), 'Must push back on unnecessary deps');
  });

  it('zara.md enforces anti-sycophancy', () => {
    const zara = fs.readFileSync(path.join(PROJECT, '.opencode/agent/zara.md'), 'utf-8');
    assert.ok(zara.includes('Anti-sycophancy') || zara.includes('push back') || zara.includes('Push back'), 'zara.md must reference anti-sycophancy');
  });
});

describe('behavioral eval: verification before completion', () => {
  it('constitution P3 enforced in reflection code', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    // success requires evidence (worked field non-empty)
    assert.ok(reflection.includes("outcome === 'success'") && reflection.includes('worked'), 'P3: success must require evidence');
    assert.ok(reflection.includes('downgraded') || reflection.includes('partial'), 'P3: empty evidence should downgrade');
  });

  it('constitution P4 enforced: missing outcome defaults to partial', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    assert.ok(reflection.includes("args.outcome = 'partial'"), 'P4: missing outcome must default to partial');
  });
});

describe('behavioral eval: dispatch routing', () => {
  it('AGENTS.md defines dispatch map for all 8 specialists', () => {
    const agents = fs.readFileSync(path.join(PROJECT, 'AGENTS.md'), 'utf-8');
    const specialists = ['atlas', 'lens', 'shield', 'probe', 'pulse', 'hive', 'rhythm', 'forge'];
    for (const s of specialists) {
      assert.ok(agents.toLowerCase().includes(s), `AGENTS.md must reference ${s}`);
    }
  });

  it('opencode.json declares all subagents', () => {
    const config = JSON.parse(fs.readFileSync(path.join(PROJECT, 'opencode.json'), 'utf-8'));
    const expected = ['architect', 'code-reviewer', 'testing-lead', 'security-reviewer', 'delivery-lead', 'swarm', 'loop-engineer', 'implementation'];
    for (const key of expected) {
      assert.ok(config.agent[key], `opencode.json must declare agent "${key}"`);
      assert.equal(config.agent[key].mode, 'subagent', `${key} must be mode=subagent`);
    }
  });

  it('subagents have step limits (anti-doom-loop)', () => {
    const config = JSON.parse(fs.readFileSync(path.join(PROJECT, 'opencode.json'), 'utf-8'));
    const subagents = Object.entries(config.agent).filter(([, v]) => v.mode === 'subagent');
    for (const [key, val] of subagents) {
      assert.ok(val.steps && val.steps > 0, `${key} must have steps limit`);
      assert.ok(val.steps <= 30, `${key} steps should be <= 30 (got ${val.steps})`);
    }
  });
});

describe('behavioral eval: security gates', () => {
  it('destructive git commands are denied', () => {
    const config = JSON.parse(fs.readFileSync(path.join(PROJECT, 'opencode.json'), 'utf-8'));
    const bash = config.permission?.bash || {};
    assert.equal(bash['git push --force*'], 'deny');
    assert.equal(bash['git push -f*'], 'deny');
    assert.equal(bash['git reset --hard*'], 'deny');
    assert.equal(bash['git clean -f*'], 'deny');
  });

  it('memory_learn blocks secrets', () => {
    const memCode = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/memory.mjs'), 'utf-8');
    assert.ok(memCode.includes('SECRETS_RE'), 'Must have secrets regex filter');
    assert.ok(memCode.includes('Refused'), 'Must refuse secret storage');
  });

  it('constitution P1: policy types require user_explicit source', () => {
    const memCode = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/memory.mjs'), 'utf-8');
    assert.ok(memCode.includes('user_explicit'), 'P1: must enforce user_explicit for policy types');
    assert.ok(memCode.includes('POLICY_TYPES'), 'P1: must define POLICY_TYPES');
  });

  it('constitution P7: bulk delete requires confirmation', () => {
    const memCode = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/memory.mjs'), 'utf-8');
    assert.ok(memCode.includes('confirm'), 'P7: must check confirm flag');
    assert.ok(memCode.includes('> 10'), 'P7: must gate at >10 entries');
  });
});

describe('behavioral eval: grounded reflection (issue #8)', () => {
  it('reflection enforces evidence-gated trust boost', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    // P3: trust can only rise with evidence
    assert.ok(reflection.includes('canRaise'), 'Must compute canRaise based on evidence');
    assert.ok(reflection.includes('trim().length >= 20') || reflection.includes('trim().length>=20'), 'Evidence must meet minimum length');
  });

  it('trust budget has sliding window', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    assert.ok(reflection.includes('_trustTimestamps'), 'Must have sliding window timestamps');
    assert.ok(reflection.includes('< 5'), 'Max 5 adjustments per window');
  });

  it('reflect accepts test_exit_code for grounding (issue #19)', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    assert.ok(reflection.includes('test_exit_code'), 'Must accept test_exit_code parameter');
    assert.ok(reflection.includes('grounded'), 'Must track grounded state');
  });

  it('rejects success when test_exit_code != 0 (issue #20)', () => {
    const reflection = fs.readFileSync(path.join(PROJECT, 'tools/mcp/domain/reflection.mjs'), 'utf-8');
    assert.ok(reflection.includes("test_exit_code !== 0") || reflection.includes("test_exit_code !== 0"), 'Must reject success on failing tests');
  });
});

describe('behavioral eval: crew agents call reflect (issue #21)', () => {
  const agentDir = path.join(PROJECT, '.opencode/agent');
  const crewAgents = ['atlas', 'forge', 'hive', 'lens', 'probe', 'pulse', 'rhythm', 'shield'];

  for (const agent of crewAgents) {
    it(`${agent}.md instructs reflection`, () => {
      const content = fs.readFileSync(path.join(agentDir, `${agent}.md`), 'utf-8');
      assert.ok(content.includes('reflect'), `${agent}.md must reference reflect()`);
    });
  }
});
