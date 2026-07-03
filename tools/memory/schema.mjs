// tools/memory/schema.mjs — DDL, migrations, and skill-route seeding
// (extracted from memory-db.mjs). Pure functions over a raw `db` handle.

import fs from 'fs';
import path from 'path';

// Create base tables, FTS5 virtual tables, and sync triggers. FTS5 failure is
// non-fatal — recall falls back to LIKE scans.
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS semantic (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, confidence REAL DEFAULT 0.8,
      source TEXT DEFAULT 'observed', type TEXT DEFAULT 'fact', scope TEXT DEFAULT '',
      created TEXT NOT NULL, updated TEXT NOT NULL, accessed TEXT,
      access_count INTEGER DEFAULT 0, reinforced INTEGER DEFAULT 1, decay_score REAL DEFAULT 1.0,
      agent TEXT DEFAULT '', grounded INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS episodic (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, outcome TEXT DEFAULT '',
      tags TEXT DEFAULT '[]', ts TEXT NOT NULL, accessed TEXT, access_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS procedural (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, context TEXT DEFAULT '',
      steps TEXT NOT NULL, uses INTEGER DEFAULT 0, created TEXT NOT NULL, updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge (
      key TEXT PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL,
      summary TEXT NOT NULL, file TEXT NOT NULL, mem_type TEXT NOT NULL,
      seeded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_section ON knowledge(section);
    CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, section TEXT NOT NULL,
      chunk_index INTEGER NOT NULL, text TEXT NOT NULL, embedding BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_key ON knowledge_chunks(key);
    CREATE INDEX IF NOT EXISTS idx_chunks_section ON knowledge_chunks(section);
    CREATE TABLE IF NOT EXISTS skill_routes (
      id INTEGER PRIMARY KEY, skill TEXT NOT NULL, signal TEXT NOT NULL,
      weight REAL DEFAULT 1.0, source TEXT DEFAULT 'default',
      hits INTEGER DEFAULT 0, created TEXT NOT NULL,
      UNIQUE(skill, signal)
    );
  `);
  try {
    db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS semantic_fts USING fts5(key, value, content=semantic, content_rowid=rowid)");
    db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS episodic_fts USING fts5(event, outcome, tags, content=episodic, content_rowid=id)");
    db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS procedural_fts USING fts5(name, context, steps, content=procedural, content_rowid=id)");
    db.exec("CREATE TRIGGER IF NOT EXISTS semantic_ai AFTER INSERT ON semantic BEGIN INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS semantic_ad AFTER DELETE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS semantic_au AFTER UPDATE ON semantic BEGIN INSERT INTO semantic_fts(semantic_fts, rowid, key, value) VALUES('delete', old.rowid, old.key, old.value); INSERT INTO semantic_fts(rowid, key, value) VALUES (new.rowid, new.key, new.value); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS episodic_ai AFTER INSERT ON episodic BEGIN INSERT INTO episodic_fts(rowid, event, outcome, tags) VALUES (new.id, new.event, new.outcome, new.tags); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS episodic_ad AFTER DELETE ON episodic BEGIN INSERT INTO episodic_fts(episodic_fts, rowid, event, outcome, tags) VALUES('delete', old.id, old.event, old.outcome, old.tags); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS procedural_ai AFTER INSERT ON procedural BEGIN INSERT INTO procedural_fts(rowid, name, context, steps) VALUES (new.id, new.name, new.context, new.steps); END");
    db.exec("CREATE TRIGGER IF NOT EXISTS procedural_au AFTER UPDATE ON procedural BEGIN INSERT INTO procedural_fts(procedural_fts, rowid, name, context, steps) VALUES('delete', old.id, old.name, old.context, old.steps); INSERT INTO procedural_fts(rowid, name, context, steps) VALUES (new.id, new.name, new.context, new.steps); END");
    db.exec("CREATE INDEX IF NOT EXISTS idx_semantic_key ON semantic(key)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_episodic_event ON episodic(event)");
  } catch (e) {
    process.stderr.write("[zara-memory] FTS5 unavailable, using LIKE fallback: " + e.message + "\n");
  }
}

// Idempotent column/table additions for older DBs, then one-time JSON import
// and skill-route seeding.
export function migrate(db, home) {
  try { db.exec("ALTER TABLE semantic ADD COLUMN type TEXT DEFAULT 'fact'"); } catch {}
  try { db.exec("ALTER TABLE semantic ADD COLUMN scope TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE semantic ADD COLUMN trust_score REAL DEFAULT 0.5"); } catch {}
  try { db.exec("ALTER TABLE semantic ADD COLUMN agent TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE semantic ADD COLUMN grounded INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE semantic ADD COLUMN embedding BLOB"); } catch {}
  try { db.exec("ALTER TABLE episodic ADD COLUMN embedding BLOB"); } catch {}
  try { db.exec("ALTER TABLE procedural ADD COLUMN embedding BLOB"); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge (
        key TEXT PRIMARY KEY, section TEXT NOT NULL, title TEXT NOT NULL,
        summary TEXT NOT NULL, file TEXT NOT NULL, mem_type TEXT NOT NULL,
        seeded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_section ON knowledge(section);
      CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge(title);
    `);
  } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, section TEXT NOT NULL,
        chunk_index INTEGER NOT NULL, text TEXT NOT NULL, embedding BLOB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_key ON knowledge_chunks(key);
      CREATE INDEX IF NOT EXISTS idx_chunks_section ON knowledge_chunks(section);
    `);
  } catch {}
  migrateFromJson(db, home);
  seedSkillRoutes(db);
}

const SKILL_ROUTES = [
  ['golang-expert', 'go'], ['golang-expert', '.go'], ['golang-expert', 'goroutine'], ['golang-expert', 'func'], ['golang-expert', 'defer'], ['golang-expert', 'channel'],
  ['php-expert', 'php'], ['php-expert', 'laravel'], ['php-expert', 'composer'], ['php-expert', 'artisan'],
  ['typescript-expert', '.ts'], ['typescript-expert', 'typescript'], ['typescript-expert', 'interface'], ['typescript-expert', 'type'],
  ['systematic-debugging', 'error'], ['systematic-debugging', 'fail'], ['systematic-debugging', 'bug'], ['systematic-debugging', 'broken'], ['systematic-debugging', 'crash'], ['systematic-debugging', 'unexpected'],
  ['tdd', 'test'], ['tdd', 'spec'], ['tdd', 'coverage'], ['tdd', 'assert'], ['tdd', 'expect'],
  ['docker', 'docker'], ['docker', 'container'], ['docker', 'dockerfile'], ['docker', 'compose'],
  ['kubernetes', 'kubectl'], ['kubernetes', 'pod'], ['kubernetes', 'deployment'], ['kubernetes', 'k8s'],
  ['react-expert', 'react'], ['react-expert', 'jsx'], ['react-expert', 'useState'], ['react-expert', 'useEffect'], ['react-expert', 'component'],
  ['python-expert', 'python'], ['python-expert', '.py'], ['python-expert', 'pip'], ['python-expert', 'django'], ['python-expert', 'flask'],
  ['redis-expert', 'redis'], ['redis-expert', 'cache'], ['redis-expert', 'HGET'], ['redis-expert', 'LPUSH'],
  ['postgres-expert', 'postgres'], ['postgres-expert', 'postgresql'], ['postgres-expert', 'pg_'], ['postgres-expert', 'psql'],
  ['nginx', 'nginx'], ['nginx', 'reverse proxy'], ['nginx', 'upstream'],
  ['security-audit', 'vulnerability'], ['security-audit', 'CVE'], ['security-audit', 'OWASP'], ['security-audit', 'injection'], ['security-audit', 'XSS'],
  ['javascript-expert', 'node'], ['javascript-expert', 'npm'], ['javascript-expert', 'esm'], ['javascript-expert', 'import'], ['javascript-expert', 'async'], ['javascript-expert', 'promise'],
  ['sqlite-expert', 'sqlite'], ['sqlite-expert', 'pragma'], ['sqlite-expert', 'WAL'], ['sqlite-expert', '.db'],
  ['git-expert', 'rebase'], ['git-expert', 'cherry-pick'], ['git-expert', 'reflog'], ['git-expert', 'merge conflict'],
  ['code-review', 'review'], ['code-review', 'PR'], ['code-review', 'pull request'], ['code-review', 'diff'],
  ['api-tester', 'curl'], ['api-tester', 'REST'], ['api-tester', 'endpoint'], ['api-tester', 'HTTP'],
  ['shell-scripting', 'bash'], ['shell-scripting', 'script'], ['shell-scripting', 'sh'], ['shell-scripting', 'zsh'],
  ['mongodb', 'mongo'], ['mongodb', 'collection'], ['mongodb', 'aggregate'],
  ['elasticsearch', 'elastic'], ['elasticsearch', 'index'], ['elasticsearch', 'kibana'],
  ['aws', 'aws'], ['aws', 's3'], ['aws', 'lambda'], ['aws', 'ec2'], ['aws', 'IAM'],
  ['terraform', 'terraform'], ['terraform', '.tf'], ['terraform', 'provider'], ['terraform', 'resource'],
  ['ci-cd', 'github actions'], ['ci-cd', 'pipeline'], ['ci-cd', 'workflow'], ['ci-cd', '.yml'],
  ['prompt-engineer', 'prompt'], ['prompt-engineer', 'few-shot'], ['prompt-engineer', 'chain of thought'],
  ['technical-writer', 'documentation'], ['technical-writer', 'README'], ['technical-writer', 'ADR'],
  ['rust-expert', 'rust'], ['rust-expert', 'cargo'], ['rust-expert', '.rs'], ['rust-expert', 'ownership'],
  ['graphql-expert', 'graphql'], ['graphql-expert', 'mutation'], ['graphql-expert', 'resolver'], ['graphql-expert', 'schema'],
  ['nextjs-expert', 'nextjs'], ['nextjs-expert', 'next.js'], ['nextjs-expert', 'app router'], ['nextjs-expert', 'getServerSideProps'],
  ['leadership-expert', 'leadership'], ['leadership-expert', 'coaching'], ['leadership-expert', 'delegation'], ['leadership-expert', 'team'],
  ['brainstorming', 'brainstorm'], ['brainstorming', 'ideas'], ['brainstorming', 'explore options'],
  ['writing-plans', 'plan'], ['writing-plans', 'implementation plan'], ['writing-plans', 'roadmap'],
];

function seedSkillRoutes(db) {
  const now = new Date().toISOString().split('T')[0];
  const stmt = db.prepare('INSERT OR IGNORE INTO skill_routes (skill, signal, weight, source, hits, created) VALUES (?, ?, 1.0, ?, 0, ?)');
  for (const [skill, signal] of SKILL_ROUTES) stmt.run(skill, signal, 'default', now);
}

// One-time import from legacy JSON files under <home>/memory/. No-op if the
// semantic table already has rows.
function migrateFromJson(db, home) {
  const count = db.prepare('SELECT COUNT(*) as n FROM semantic').get();
  if (count.n > 0) return;
  const memDir = path.join(home, 'memory');
  // Semantic
  const semFile = path.join(memDir, 'semantic.json');
  if (fs.existsSync(semFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(semFile, 'utf-8'));
      const stmt = db.prepare('INSERT OR REPLACE INTO semantic (key, value, confidence, source, type, scope, created, updated, reinforced, decay_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0)');
      for (const [key, entry] of Object.entries(data)) {
        const date = entry.updated || new Date().toISOString().split('T')[0];
        stmt.run(key, entry.value, entry.confidence || 0.8, entry.source || 'observed', entry.type || 'fact', '', date, date, entry.reinforced || 1);
      }
    } catch {}
  }
  // Episodic
  const epiFile = path.join(memDir, 'episodic.jsonl');
  if (fs.existsSync(epiFile)) {
    try {
      const stmt = db.prepare('INSERT INTO episodic (event, outcome, tags, ts) VALUES (?, ?, ?, ?)');
      for (const line of fs.readFileSync(epiFile, 'utf-8').trim().split('\n').filter(Boolean)) {
        const e = JSON.parse(line);
        stmt.run(e.event, e.outcome || '', JSON.stringify(e.tags || []), e.ts);
      }
    } catch {}
  }
  // Procedural
  const procFile = path.join(memDir, 'procedural.json');
  if (fs.existsSync(procFile)) {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO procedural (name, context, steps, uses, created, updated) VALUES (?, ?, ?, ?, ?, ?)');
      for (const p of JSON.parse(fs.readFileSync(procFile, 'utf-8'))) {
        const date = p.updated || new Date().toISOString().split('T')[0];
        stmt.run(p.name, p.context || '', JSON.stringify(p.steps), p.uses || 0, date, date);
      }
    } catch {}
  }
}
