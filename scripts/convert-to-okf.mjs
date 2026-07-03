// scripts/convert-to-okf.mjs — Convert knowledge/ markdown files to OKF conformance.
//
// OKF v0.1 requires YAML frontmatter with at minimum a `type` field on every
// concept file. This script:
//   1. Walks all .md files under knowledge/ (skipping images dirs).
//   2. For files WITH frontmatter but no `type`: inserts `type: {mapped}` right
//      after the opening `---`.
//   3. For files WITHOUT frontmatter: prepends a minimal frontmatter block
//      (type + title extracted from the first H1).
//   4. Reports every change.
//
// Reserved files (index.md, log.md — case-insensitive) are skipped: the OKF
// parser ignores them, so they need no type.
//
// Only frontmatter is added/modified. File bodies are never touched.
//
// Usage: node scripts/convert-to-okf.mjs [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, '..', 'knowledge');

// Section (first path segment under knowledge/) -> OKF type.
// Mirrors SECTION_TYPE_MAP in tools/mcp/domain/memory.mjs, extended with the
// sections that lack a mapping there.
const SECTION_TYPE_MAP = {
  antipatterns: 'pitfall',
  architecture: 'architecture',
  'code-smells': 'pitfall',
  'design-patterns': 'architecture',
  'domain-driven-design': 'architecture',
  practices: 'workflow',
  principles: 'policy',
  testing: 'workflow',
  laws: 'fact',
  values: 'policy',
  terms: 'fact',
  tools: 'fact',
  'natural-voice': 'policy',
  'loop-engineering': 'fact',
  security: 'policy',
};

// Files that live directly under knowledge/ (no section dir) are "standalone".
const STANDALONE_TYPE = 'fact';

// Reserved filenames the OKF parser skips (case-insensitive).
const RESERVED_FILES = new Set(['index.md', 'log.md']);
const SKIP_DIRS = new Set(['images', 'assets', 'node_modules', '.git']);

const dryRun = process.argv.includes('--dry-run');

function* walkMarkdown(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkMarkdown(abs);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield abs;
    }
  }
}

// Determine section from the bundle-relative path: knowledge/{section}/file.md.
// Files directly under knowledge/ have no section -> standalone.
function sectionType(relPath) {
  const parts = relPath.split(path.sep);
  if (parts.length < 2) return STANDALONE_TYPE; // root-level file
  const section = parts[0];
  return SECTION_TYPE_MAP[section] || STANDALONE_TYPE;
}

// Does content begin with a YAML frontmatter fence?
function hasFrontmatter(content) {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return /^\s*---\r?\n/.test(text);
}

// Extract title from the first H1 (`# Heading`). Falls back to filename-derived.
function extractTitle(content, relPath) {
  const m = content.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  const leaf = path.basename(relPath, '.md');
  return leaf
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Does frontmatter already declare a top-level `type`? Checks only the lines
// between the opening and closing fences, and only unindented keys.
function frontmatterHasType(content) {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const open = text.match(/^\s*---\r?\n/);
  if (!open) return false;
  const after = text.slice(open[0].length);
  const close = after.match(/\r?\n---[ \t]*(\r?\n|$)/);
  const block = close ? after.slice(0, close.index) : after;
  return block.split(/\r?\n/).some((line) => /^type\s*:/.test(line));
}

const results = { added_type: [], added_frontmatter: [], skipped_reserved: [], already_ok: [] };

for (const abs of walkMarkdown(KNOWLEDGE_DIR)) {
  const relPath = path.relative(KNOWLEDGE_DIR, abs);
  const base = path.basename(abs).toLowerCase();

  if (RESERVED_FILES.has(base)) {
    results.skipped_reserved.push(relPath);
    continue;
  }

  const content = fs.readFileSync(abs, 'utf8');
  const type = sectionType(relPath);

  if (hasFrontmatter(content)) {
    if (frontmatterHasType(content)) {
      results.already_ok.push(relPath);
      continue;
    }
    // Insert `type: {type}` immediately after the opening fence.
    const bom = content.charCodeAt(0) === 0xfeff ? '\uFEFF' : '';
    const text = bom ? content.slice(1) : content;
    const open = text.match(/^\s*---\r?\n/);
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const updated = bom + text.slice(0, open[0].length) + `type: ${type}${eol}` + text.slice(open[0].length);
    if (!dryRun) fs.writeFileSync(abs, updated);
    results.added_type.push(`${relPath} (type: ${type})`);
  } else {
    // No frontmatter: prepend a minimal block with type + title.
    const title = extractTitle(content, relPath);
    // Escape a colon-bearing title by quoting when needed.
    const titleValue = /[:#]/.test(title) ? JSON.stringify(title) : title;
    const block = `---\ntype: ${type}\ntitle: ${titleValue}\n---\n\n`;
    if (!dryRun) fs.writeFileSync(abs, block + content);
    results.added_frontmatter.push(`${relPath} (type: ${type}, title: ${title})`);
  }
}

const line = (s) => process.stdout.write(s + '\n');
line(`OKF conversion${dryRun ? ' (DRY RUN)' : ''} — knowledge/`);
line('');
line(`Added type to existing frontmatter: ${results.added_type.length}`);
for (const r of results.added_type) line(`  + ${r}`);
line('');
line(`Added new frontmatter: ${results.added_frontmatter.length}`);
for (const r of results.added_frontmatter) line(`  + ${r}`);
line('');
line(`Already conformant (had type): ${results.already_ok.length}`);
line(`Skipped reserved files: ${results.skipped_reserved.length}`);
for (const r of results.skipped_reserved) line(`  - ${r}`);
line('');
const changed = results.added_type.length + results.added_frontmatter.length;
line(`TOTAL changed: ${changed}`);
