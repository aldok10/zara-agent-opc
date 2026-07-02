import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'zara-rel-test-'));
const REL_DIR = path.join(TEST_DIR, '.zara', 'relationship');

// Create mock @opencode-ai/plugin package in project node_modules
// so ESM bare specifier resolution can find it
const MOCK_PKG_DIR = path.join(
  import.meta.filename, '../../node_modules/@opencode-ai/plugin',
);

// ─── Helpers ─────────────────────────────────────────────────────

function freshRel() {
  fs.rmSync(REL_DIR, { recursive: true, force: true });
  fs.mkdirSync(REL_DIR, { recursive: true });
  return createRelationship();
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(REL_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

function isoTomorrow() {
  return new Date(Date.now() + 86400000).toISOString();
}

function isoYesterday() {
  return new Date(Date.now() - 86400000).toISOString();
}

let createRelationship;

before(async () => {
  // Set up mock @opencode-ai/plugin module
  fs.mkdirSync(MOCK_PKG_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(MOCK_PKG_DIR, 'index.mjs'),
    `
function makeSchema() {
  const s = { describe: () => s, optional: () => s, min: () => s, max: () => s };
  return s;
}
const z = {
  string: () => makeSchema(),
  enum: () => makeSchema(),
  number: () => makeSchema(),
  array: () => makeSchema(),
  boolean: () => makeSchema(),
};
const tool = Object.assign(
  ({ description, args, execute }) => ({ description, args, execute }),
  { schema: z },
);
export { tool };
export default tool;
`,
  );

  // Redirect FileStore to TEST_DIR
  mock.method(os, 'homedir', () => TEST_DIR);

  fs.mkdirSync(REL_DIR, { recursive: true });

  const mod = await import('../.opencode/plugin/zara/relationship/index.mjs');
  createRelationship = mod.default;
});

after(() => {
  // Clean up mock package
  fs.rmSync(MOCK_PKG_DIR, { recursive: true, force: true });
  // Clean up test dir
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  mock.reset();
});

// ─── Empty States ────────────────────────────────────────────────

describe('empty states', () => {
  describe('getDueThreads (via inject)', () => {
    it('produces no "Thread due" line when no threads exist', () => {
      const rel = freshRel();
      const msgs = [{ role: 'system', content: 'You are Zara.' }];
      rel.inject(msgs);
      assert.ok(!msgs[0].content.includes('[Thread due]'));
    });

    it('produces no "Thread due" line when threads file is missing', () => {
      const rel = freshRel();
      if (fs.existsSync(path.join(REL_DIR, 'threads.json'))) {
        fs.unlinkSync(path.join(REL_DIR, 'threads.json'));
      }
      const msgs = [{ role: 'system', content: 'You are Zara.' }];
      rel.inject(msgs);
      assert.ok(!msgs[0].content.includes('[Thread due]'));
    });
  });

  describe('thread tools (empty)', () => {
    it('zara_thread_list returns "No open threads." for status=all', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_thread_list.execute({ status: 'all' });
      assert.equal(result.output, 'No open threads.');
    });

    it('zara_thread_close returns "No matching thread." with no threads', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_thread_close.execute({});
      assert.equal(result.output, 'No matching thread.');
    });
  });
});

// ─── Thread Operations ───────────────────────────────────────────

describe('thread operations', () => {
  it('creates a thread and lists it', async () => {
    const rel = freshRel();
    const add = await rel.tools.zara_thread_add.execute({
      context: 'User mentioned wanting to learn Go',
      action: 'Ask how Go learning is going',
      followUpAfter: 'tomorrow',
      type: 'plan_followup',
      priority: 'high',
    });
    assert.ok(add.output.includes('Thread tracked'));
    assert.ok(add.output.includes('User mentioned wanting to learn Go'));

    const list = await rel.tools.zara_thread_list.execute({ status: 'pending' });
    assert.ok(list.output.includes('User mentioned wanting to learn Go'));
  });

  it('marks a thread as done via id', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Review PR',
      action: 'Check if PR was merged',
      followUpAfter: 'tomorrow',
    });

    const threads = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'threads.json'), 'utf-8'));
    const id = threads[0].id;
    assert.ok(id.startsWith('t_'));

    const close = await rel.tools.zara_thread_close.execute({ id });
    assert.ok(close.output.includes('Closed:'));

    const listDone = await rel.tools.zara_thread_list.execute({ status: 'done' });
    assert.ok(listDone.output.includes('Review PR'));
  });

  it('marks a thread as done via context keyword', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Fix the login bug',
      action: 'Follow up on login fix',
      followUpAfter: 'tomorrow',
    });
    const close = await rel.tools.zara_thread_close.execute({ context: 'login' });
    assert.ok(close.output.includes('Closed:'));
  });

  it('closes most recent pending thread when no id or context given', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Thread A',
      action: 'Do A',
      followUpAfter: 'tomorrow',
    });
    await rel.tools.zara_thread_add.execute({
      context: 'Thread B',
      action: 'Do B',
      followUpAfter: 'tomorrow',
    });
    const close = await rel.tools.zara_thread_close.execute({});
    assert.ok(close.output.includes('Thread B'));
  });

  it('zara_thread_add resolves "tomorrow" to ISO date (no time)', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Test',
      action: 'Test',
      followUpAfter: 'tomorrow',
    });
    const threads = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'threads.json'), 'utf-8'));
    assert.equal(threads.length, 1);
    assert.match(threads[0].followUpAfter, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('zara_thread_add resolves "next_session" to ISO with time', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Test',
      action: 'Test',
      followUpAfter: 'next_session',
    });
    const threads = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'threads.json'), 'utf-8'));
    assert.ok(threads[0].followUpAfter.includes('T'));
  });

  it('zara_thread_add resolves "3d" pattern to ISO date', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Test',
      action: 'Test',
      followUpAfter: '3d',
    });
    const threads = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'threads.json'), 'utf-8'));
    assert.match(threads[0].followUpAfter, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDueThreads returns threads with past followUpAfter', async () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_due', context: 'Due thread', action: 'Do it', status: 'pending', followUpAfter: isoYesterday(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Thread due]'));
    assert.ok(msgs[0].content.includes('Due thread'));
  });

  it('getDueThreads does not return threads with future followUpAfter', async () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_not_due', context: 'Future thread', action: 'Wait', status: 'pending', followUpAfter: isoTomorrow(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(!msgs[0].content.includes('[Thread due]'));
  });

  it('getDueThreads only returns pending (not done) threads', async () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_done', context: 'Done thread', action: 'Done', status: 'done', followUpAfter: isoYesterday(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(!msgs[0].content.includes('[Thread due]'));
  });

  it('zara_thread_list limits to last 15 threads', async () => {
    const rel = freshRel();
    for (let i = 0; i < 20; i++) {
      await rel.tools.zara_thread_add.execute({
        context: `Thread ${i}`,
        action: `Action ${i}`,
        followUpAfter: 'tomorrow',
      });
    }
    const list = await rel.tools.zara_thread_list.execute({ status: 'all' });
    const lines = list.output.split('\n');
    assert.ok(lines.length <= 16);
  });
});

// ─── Stance Operations ───────────────────────────────────────────

describe('stance operations', () => {
  it('records a new stance', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_stance_record.execute({
      topic: 'Go vs Rust',
      position: 'Go for CLIs, Rust for systems',
      confidence: 0.8,
      basis: 'Experience with both',
    });
    assert.ok(result.output.includes('recorded'));
    assert.ok(result.output.includes('80%'));
  });

  it('updates an existing stance on same topic (case insensitive)', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'Code review', position: 'Review within 24h' });
    const update = await rel.tools.zara_stance_record.execute({ topic: 'CODE REVIEW', position: 'Review within 12h' });
    assert.ok(update.output.includes('updated'));

    const stances = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    assert.equal(stances.length, 1);
    assert.equal(stances[0].position, 'Review within 12h');
  });

  it('preserves formed date and challengeCount on update', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'AI safety', position: 'Important but pragmatic' });
    const stancesBefore = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    const formed = stancesBefore[0].formed;

    await rel.tools.zara_stance_record.execute({ topic: 'AI safety', position: 'Critical priority' });
    const stancesAfter = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    assert.equal(stancesAfter[0].formed, formed);
    assert.equal(stancesAfter[0].challengeCount, 0);
  });

  it('defaults confidence to 0.7 when not provided', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_stance_record.execute({ topic: 'Testing strategy', position: 'Integration tests > unit tests' });
    assert.ok(result.output.includes('70%'));
    const stances = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    assert.equal(stances[0].confidence, 0.7);
    assert.equal(stances[0].flexible, true);
  });
});

// ─── inject() Behavior ───────────────────────────────────────────

describe('inject() behavior', () => {
  it('returns the same messages array', () => {
    const rel = freshRel();
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    const result = rel.inject(msgs);
    assert.equal(result, msgs);
  });

  it('does not append [Thread due] when no thread is due', () => {
    const rel = freshRel();
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(!msgs[0].content.includes('[Thread due]'));
    assert.equal(msgs[0].content, 'You are Zara.');
  });

  it('appends [Thread due] line with context and action when a thread is due', () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_due', context: 'Ship the release', action: 'Confirm release went out', status: 'pending', followUpAfter: isoYesterday(), created: new Date().toISOString(), type: 'general', priority: 'high' },
    ]);
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Thread due]'));
    assert.ok(msgs[0].content.includes('Ship the release'));
    assert.ok(msgs[0].content.includes('Confirm release went out'));
  });

  it('does nothing when there is no system message even with due thread', () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_due', context: 'Due thread', action: 'Do it', status: 'pending', followUpAfter: isoYesterday(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const msgs = [{ role: 'user', content: 'Hello' }];
    const result = rel.inject(msgs);
    assert.equal(result, msgs);
    assert.equal(msgs[0].content, 'Hello');
  });
});

// ─── onEvent() Behavior ──────────────────────────────────────────

describe('onEvent behavior', () => {
  it('touch() increments interactionCount on session.created', () => {
    const rel = freshRel();
    rel.onEvent({ type: 'session.created' });
    const state = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'state.json'), 'utf-8'));
    assert.equal(state.interactionCount, 1);
    assert.ok(state.lastSeen);
  });

  it('does nothing for non-session events', () => {
    const rel = freshRel();
    rel.onEvent({ type: 'message.sent' });
    rel.onEvent({ type: 'tool.executed' });
    // touch() not called, so state.json should not have been created
    assert.ok(!fs.existsSync(path.join(REL_DIR, 'state.json')));
  });
});

// ─── Relationship Status ─────────────────────────────────────────

describe('zara_relationship_status', () => {
  it('returns interaction count', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_relationship_status.execute({});
    assert.ok(result.output.includes('Interactions'));
  });

  it('reflects created data', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({ context: 'Test thread', action: 'Do it', followUpAfter: 'tomorrow' });
    await rel.tools.zara_stance_record.execute({ topic: 'Test stance', position: 'Test' });
    const result = await rel.tools.zara_relationship_status.execute({});
    assert.ok(result.output.includes('Open threads'));
    assert.ok(result.output.includes('Stances'));
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────

describe('edge cases', () => {
  it('inject with messages array that has no system role — no crash', () => {
    const rel = freshRel();
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    assert.doesNotThrow(() => rel.inject(msgs));
  });

  it('inject with empty messages array — no crash', () => {
    const rel = freshRel();
    assert.doesNotThrow(() => rel.inject([]));
  });

  it('dispose does not throw', () => {
    const rel = freshRel();
    assert.doesNotThrow(() => rel.dispose());
  });

  it('zara_thread_add handles unknown followUpAfter pattern literally', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Custom date',
      action: 'Do thing',
      followUpAfter: '2026-01-15',
    });
    const threads = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'threads.json'), 'utf-8'));
    assert.equal(threads[0].followUpAfter, '2026-01-15');
  });

  it('zara_thread_close by context only matches pending threads', async () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't_done', context: 'Done item', action: 'Done', status: 'done', followUpAfter: isoTomorrow(), created: new Date().toISOString(), type: 'general', priority: 'medium', closedAt: new Date().toISOString() },
      { id: 't_pending', context: 'Pending item', action: 'Do it', status: 'pending', followUpAfter: isoTomorrow(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const result = await rel.tools.zara_thread_close.execute({ context: 'item' });
    assert.ok(result.output.includes('Pending item'));
  });
});
