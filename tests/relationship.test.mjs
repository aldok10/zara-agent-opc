import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs';

const TEST_DIR = path.join(os.tmpdir(), `zara-rel-test-${Date.now()}`);
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

  describe('milestone tools (empty)', () => {
    it('zara_milestone_list returns "No milestones yet."', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_milestone_list.execute({});
      assert.equal(result.output, 'No milestones yet.');
    });
  });

  describe('stance tools (empty)', () => {
    it('zara_stance_list returns "No stances."', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_stance_list.execute({});
      assert.equal(result.output, 'No stances.');
    });

    it('zara_stance_challenge with no matching stance returns not found', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_stance_challenge.execute({ topic: 'anything' });
      assert.equal(result.output, 'No stance for "anything"');
    });
  });

  describe('reference tools (empty)', () => {
    it('zara_reference_list returns "No shared references yet."', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_reference_list.execute({});
      assert.equal(result.output, 'No shared references yet.');
    });
  });

  describe('surface tool (empty)', () => {
    it('returns "No relevant memories." with no data', async () => {
      const rel = freshRel();
      const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['test'] });
      assert.equal(result.output, 'No relevant memories.');
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

  it('lists recorded stances', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({
      topic: 'Testing strategy',
      position: 'Integration tests > unit tests',
    });
    const list = await rel.tools.zara_stance_list.execute({});
    assert.ok(list.output.includes('Testing strategy'));
  });

  it('filters stances by topic keyword', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'Python typing', position: 'Use mypy strict' });
    await rel.tools.zara_stance_record.execute({ topic: 'Go error handling', position: 'Errors are values' });
    const list = await rel.tools.zara_stance_list.execute({ topic: 'Python' });
    assert.ok(list.output.includes('Python'));
    assert.ok(!list.output.includes('Go error handling'));
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

  it('challenge increments challengeCount', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'Monorepos', position: 'Good for small teams' });
    const c1 = await rel.tools.zara_stance_challenge.execute({ topic: 'Monorepos' });
    assert.ok(c1.output.includes('1x'));
    const c2 = await rel.tools.zara_stance_challenge.execute({ topic: 'Monorepos' });
    assert.ok(c2.output.includes('2x'));
  });

  it('challenge with changed=true revises the stance', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'NoSQL', position: 'Avoid for transactional data' });
    await rel.tools.zara_stance_challenge.execute({
      topic: 'NoSQL',
      newEvidence: 'DynamoDB supports transactions now',
      changed: true,
    });
    const stances = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    assert.ok(stances[0].position.includes('REVISED'));
    assert.ok(stances[0].basis.includes('DynamoDB'));
  });

  it('challenge with changed=false maintains stance', async () => {
    const rel = freshRel();
    await rel.tools.zara_stance_record.execute({ topic: 'Vim vs VSCode', position: 'Vim' });
    await rel.tools.zara_stance_challenge.execute({
      topic: 'Vim vs VSCode',
      changed: false,
    });
    const stances = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'stances.json'), 'utf-8'));
    assert.ok(!stances[0].position.includes('REVISED'));
  });
});

// ─── Milestone Operations ────────────────────────────────────────

describe('milestone operations', () => {
  it('adds a milestone', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_milestone_add.execute({
      event: 'First deployment to production',
      type: 'first',
      significance: 9,
    });
    assert.ok(result.output.includes('First deployment to production'));
  });

  it('lists milestones in reverse chronological order', async () => {
    const rel = freshRel();
    await rel.tools.zara_milestone_add.execute({ event: 'First', type: 'first' });
    await rel.tools.zara_milestone_add.execute({ event: 'Second', type: 'shared_accomplishment' });
    const list = await rel.tools.zara_milestone_list.execute({});
    const lines = list.output.split('\n');
    assert.ok(lines[0].includes('Second'));
    assert.ok(lines[1].includes('First'));
  });

  it('limits milestone list to last 10', async () => {
    const rel = freshRel();
    for (let i = 0; i < 15; i++) {
      await rel.tools.zara_milestone_add.execute({ event: `Milestone ${i}`, type: 'shared_accomplishment' });
    }
    const list = await rel.tools.zara_milestone_list.execute({});
    const lines = list.output.split('\n');
    assert.ok(lines.length <= 10);
  });
});

// ─── Reference Operations ────────────────────────────────────────

describe('reference operations', () => {
  it('adds a shared reference', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_reference_add.execute({
      content: 'The coffee incident',
      type: 'inside_joke',
    });
    assert.ok(result.output.includes('The coffee incident'));
  });

  it('lists all references', async () => {
    const rel = freshRel();
    await rel.tools.zara_reference_add.execute({ content: 'Duck tape engineer', type: 'nickname' });
    await rel.tools.zara_reference_add.execute({ content: 'Ship early, ship often', type: 'agreed_rule' });
    const list = await rel.tools.zara_reference_list.execute({});
    assert.ok(list.output.includes('Duck tape engineer'));
    assert.ok(list.output.includes('Ship early, ship often'));
  });
});

// ─── Bookmark Operations ─────────────────────────────────────────

describe('bookmark operations', () => {
  it('adds a bookmark', async () => {
    const rel = freshRel();
    const result = await rel.tools.zara_bookmark_add.execute({
      context: 'User excited about launch',
      emotion: 'joy',
      valence: 0.9,
      intensity: 0.8,
      tags: ['launch', 'excitement'],
    });
    assert.ok(result.output.includes('Bookmarked'));
    assert.ok(result.output.includes('joy'));
  });

  it('persists bookmark data correctly', async () => {
    const rel = freshRel();
    await rel.tools.zara_bookmark_add.execute({
      context: 'Frustration with CI',
      emotion: 'frustration',
      valence: -0.7,
      intensity: 0.6,
      tags: ['ci', 'ci-frustration'],
    });
    const bookmarks = JSON.parse(fs.readFileSync(path.join(REL_DIR, 'bookmarks.json'), 'utf-8'));
    assert.equal(bookmarks.length, 1);
    assert.equal(bookmarks[0].context, 'Frustration with CI');
    assert.equal(bookmarks[0].valence, -0.7);
    assert.deepEqual(bookmarks[0].tags, ['ci', 'ci-frustration']);
  });
});

// ─── relevanceScore (via surface tool) ───────────────────────────

describe('relevanceScore (indirect via zara_relationship_surface)', () => {
  it('exact keyword match surfaces a thread', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Docker compose networking',
      action: 'Explain docker networking',
      followUpAfter: 'tomorrow',
    });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['docker'], limit: 5 });
    assert.ok(result.output.includes('Docker compose networking'));
  });

  it('partial keyword match works (keyword within longer text)', async () => {
    const rel = freshRel();
    writeJSON('threads.json', [
      { id: 't1', context: 'Advanced kubernetes networking patterns', action: 'Discuss k8s networking', status: 'pending', followUpAfter: isoTomorrow(), created: new Date().toISOString(), type: 'general', priority: 'medium' },
    ]);
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['networking'] });
    assert.ok(result.output.includes('kubernetes networking'));
  });

  it('empty keywords returns no results', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Something important',
      action: 'Follow up',
      followUpAfter: 'tomorrow',
    });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: [] });
    assert.equal(result.output, 'No relevant memories.');
  });

  it('no matching keyword returns no results', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'Ruby on Rails',
      action: 'Discuss Rails',
      followUpAfter: 'tomorrow',
    });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['golang'] });
    assert.equal(result.output, 'No relevant memories.');
  });

  it('time decay: recent items score higher than old ones', async () => {
    const rel = freshRel();
    const now = new Date();
    const oldDate = new Date(now.getTime() - 30 * 86400000).toISOString();
    writeJSON('milestones.json', [
      { id: 'm_old', ts: oldDate, event: 'old milestone about testing', type: 'shared_accomplishment', significance: 7 },
      { id: 'm_new', ts: now.toISOString(), event: 'new milestone about testing', type: 'shared_accomplishment', significance: 7 },
    ]);
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['testing'], limit: 5 });
    const lines = result.output.split('\n');
    assert.ok(lines[0].includes('new milestone'));
  });

  it('intensity boost: higher intensity = higher score', async () => {
    const rel = freshRel();
    const now = new Date().toISOString();
    writeJSON('bookmarks.json', [
      { id: 'bm_low', ts: now, context: 'low intensity bookmark about coffee', emotion: 'neutral', valence: 0, intensity: 0.2, tags: ['coffee'] },
      { id: 'bm_high', ts: now, context: 'high intensity bookmark about coffee', emotion: 'excited', valence: 0.9, intensity: 0.9, tags: ['coffee'] },
    ]);
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['coffee'], limit: 5 });
    const lines = result.output.split('\n');
    assert.ok(lines[0].includes('high intensity'));
  });

  it('confidence modifier on stances affects score', async () => {
    const rel = freshRel();
    const now = new Date().toISOString();
    writeJSON('stances.json', [
      { id: 'st_low', topic: 'typescript', position: 'typescript is ok', confidence: 0.3, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
      { id: 'st_high', topic: 'typescript', position: 'typescript is great', confidence: 0.9, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
    ]);
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['typescript'], limit: 5 });
    const lines = result.output.split('\n');
    assert.ok(lines[0].includes('great'));
  });

  it('multiple matching keywords stack score', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({
      context: 'React state management',
      action: 'Discuss React state',
      followUpAfter: 'tomorrow',
    });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['react', 'state', 'management'] });
    assert.ok(result.output.includes('React state management'));
  });

  it('scores across all item types (threads, milestones, bookmarks, stances)', async () => {
    const rel = freshRel();
    const now = new Date().toISOString();
    writeJSON('threads.json', [
      { id: 't1', context: 'deployment pipeline', action: 'Review deploy', status: 'pending', followUpAfter: isoTomorrow(), created: now, type: 'general', priority: 'medium' },
    ]);
    writeJSON('milestones.json', [
      { id: 'm1', ts: now, event: 'first deployment to prod', type: 'first', significance: 9 },
    ]);
    writeJSON('bookmarks.json', [
      { id: 'bm1', ts: now, context: 'deployment anxiety', emotion: 'nervous', valence: -0.3, intensity: 0.7, tags: ['deploy'] },
    ]);
    writeJSON('stances.json', [
      { id: 'st1', topic: 'deployment frequency', position: 'deploy daily', confidence: 0.8, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
    ]);
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['deploy', 'deployment'], limit: 10 });
    assert.ok(result.output.includes('[thread]'));
    assert.ok(result.output.includes('[milestone]'));
    assert.ok(result.output.includes('[bookmark]'));
    assert.ok(result.output.includes('[stance]'));
  });
});

// ─── inject() Behavior ───────────────────────────────────────────

describe('inject() behavior', () => {
  it('appends [Relationship] line to system message', () => {
    const rel = freshRel();
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Relationship]'));
    assert.ok(msgs[0].content.includes('interactions='));
  });

  it('returns the same messages array', () => {
    const rel = freshRel();
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    const result = rel.inject(msgs);
    assert.equal(result, msgs);
  });

  it('appends [Identity] line', () => {
    const rel = freshRel();
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Identity]'));
  });

  it('includes [Temporal] absence warning if lastSeen > 2 days ago', () => {
    const rel = freshRel();
    writeJSON('state.json', {
      stage: 'close',
      stageStarted: new Date().toISOString().split('T')[0],
      interactionCount: 5,
      lastSeen: new Date(Date.now() - 3 * 86400000).toISOString(),
      negotiatedRules: [],
      emotionBaseline: 'focused',
    });
    const msgs = [{ role: 'system', content: 'You are Zara.' }];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Temporal]'));
    assert.ok(msgs[0].content.includes('days since'));
  });

  it('surfaces matching stances when user message is long enough', () => {
    const rel = freshRel();
    writeJSON('stances.json', [
      { id: 'st1', topic: 'testing patterns', position: 'Prefer table-driven tests', confidence: 0.8, basis: 'Experience', flexible: true, formed: new Date().toISOString(), updated: new Date().toISOString(), challengeCount: 0 },
    ]);
    const msgs = [
      { role: 'system', content: 'You are Zara.' },
      { role: 'user', content: 'What do you think about testing patterns for Go services?' },
    ];
    rel.inject(msgs);
    assert.ok(msgs[0].content.includes('[Stances]'));
    assert.ok(msgs[0].content.includes('testing patterns'));
  });

  it('does NOT surface stances for short user messages (<=20 chars)', () => {
    const rel = freshRel();
    writeJSON('stances.json', [
      { id: 'st1', topic: 'testing patterns', position: 'Prefer table-driven tests', confidence: 0.8, basis: '', flexible: true, formed: new Date().toISOString(), updated: new Date().toISOString(), challengeCount: 0 },
    ]);
    const msgs = [
      { role: 'system', content: 'You are Zara.' },
      { role: 'user', content: 'ok' },
    ];
    rel.inject(msgs);
    assert.ok(!msgs[0].content.includes('[Stances]'));
  });

  it('limits surfaced stances to max 2', () => {
    const rel = freshRel();
    const now = new Date().toISOString();
    writeJSON('stances.json', [
      { id: 'st1', topic: 'topic alpha', position: 'Position alpha', confidence: 0.8, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
      { id: 'st2', topic: 'topic beta', position: 'Position beta', confidence: 0.8, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
      { id: 'st3', topic: 'topic gamma', position: 'Position gamma', confidence: 0.8, basis: '', flexible: true, formed: now, updated: now, challengeCount: 0 },
    ]);
    const msgs = [
      { role: 'system', content: 'You are Zara.' },
      { role: 'user', content: 'Let me tell you about all three topics topic alpha beta gamma' },
    ];
    rel.inject(msgs);
    // The [Stances] line should have at most 2 stances (separated by |)
    const stancesMatch = msgs[0].content.match(/\[Stances\](.+)/);
    if (stancesMatch) {
      const count = stancesMatch[1].split('|').length;
      assert.ok(count <= 2);
    }
  });

  it('does nothing when there is no system message', () => {
    const rel = freshRel();
    const msgs = [{ role: 'user', content: 'Hello' }];
    const result = rel.inject(msgs);
    assert.equal(result, msgs);
    assert.equal(msgs[0].content, 'Hello');
  });

  it('handles non-string user content gracefully', () => {
    const rel = freshRel();
    writeJSON('stances.json', [
      { id: 'st1', topic: 'testing', position: 'Important', confidence: 0.8, basis: '', flexible: true, formed: new Date().toISOString(), updated: new Date().toISOString(), challengeCount: 0 },
    ]);
    const msgs = [
      { role: 'system', content: 'You are Zara.' },
      { role: 'user', content: { parts: ['hello'] } },
    ];
    assert.doesNotThrow(() => rel.inject(msgs));
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
    await rel.tools.zara_milestone_add.execute({ event: 'Test milestone', type: 'first' });
    await rel.tools.zara_stance_record.execute({ topic: 'Test stance', position: 'Test' });
    const result = await rel.tools.zara_relationship_status.execute({});
    assert.ok(result.output.includes('Open threads'));
    assert.ok(result.output.includes('Milestones'));
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

  it('zara_relationship_surface with limit=0 falls back to default 3 due to falsy guard', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({ context: 'test item', action: 'test', followUpAfter: 'tomorrow' });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['test'], limit: 0 });
    // Module uses `|| 3` so 0 → 3; thread is returned
    assert.ok(result.output.includes('test item'));
  });

  it('zara_relationship_surface with single-element keywords works', async () => {
    const rel = freshRel();
    await rel.tools.zara_thread_add.execute({ context: 'single keyword match', action: 'test', followUpAfter: 'tomorrow' });
    const result = await rel.tools.zara_relationship_surface.execute({ keywords: ['match'] });
    assert.ok(result.output.includes('single keyword'));
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
