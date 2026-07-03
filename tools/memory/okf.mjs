// tools/memory/okf.mjs — OKF (Open Knowledge Format v0.1) parser for Zara's knowledge system.
//
// OKF is Google Cloud's open spec (June 2026) for AI agent knowledge: markdown
// files with YAML frontmatter in a directory hierarchy. The only REQUIRED
// frontmatter field is `type`. Files named `index.md` and `log.md` are reserved.
//
// This module is pure ESM, stdlib-only (fs, path). It ships a minimal YAML
// frontmatter parser (no js-yaml dependency) covering the subset OKF uses:
// strings, quoted strings, numbers, booleans, inline arrays, and folded
// multiline block scalars.
//
// Exports:
//   parseBundle(bundleDir)     -> Concept[]
//   parseIndex(content)        -> IndexEntry[]
//   parseLog(content)          -> LogEntry[]
//   parseFrontmatter(content)  -> { meta, body }
//   extractLinks(body)         -> string[]  (concept IDs)
//   isOkfBundle(dir)           -> boolean
//   validateBundle(concepts)   -> { valid, errors }
//   DEFAULT_TYPE_MAP           -> Record<string, ZaraMemoryType>

import fs from 'node:fs';
import path from 'node:path';

// Reserved filenames that are not concepts.
const RESERVED_FILES = new Set(['index.md', 'log.md']);

// Directories skipped during bundle traversal.
const SKIP_DIRS = new Set(['images', 'assets', 'node_modules', '.git']);

// Recognized frontmatter fields that get promoted to top-level concept props.
// Everything else lands in `meta` (OKF extension fields).
const KNOWN_FIELDS = new Set(['type', 'title', 'description', 'resource', 'tags', 'timestamp']);

// Maps common OKF `type` values to Zara's internal memory types. Callers can
// override by passing their own map. Unknown types should fall back to 'fact'.
export const DEFAULT_TYPE_MAP = {
  policy: 'policy',
  rule: 'policy',
  guideline: 'policy',
  workflow: 'workflow',
  procedure: 'workflow',
  process: 'workflow',
  pitfall: 'pitfall',
  gotcha: 'pitfall',
  antipattern: 'pitfall',
  architecture: 'architecture',
  system: 'architecture',
  component: 'architecture',
  service: 'architecture',
  decision: 'decision',
  adr: 'decision',
  preference: 'preference',
  fact: 'fact',
  concept: 'fact',
  reference: 'fact',
};

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

// Parse YAML frontmatter delimited by leading `---` fences. Returns the parsed
// metadata object and the remaining body text. If no frontmatter is present,
// meta is {} and body is the full content.
export function parseFrontmatter(content) {
  if (typeof content !== 'string' || content.length === 0) {
    return { meta: {}, body: content || '' };
  }

  // Normalize BOM and leading blank lines only for fence detection.
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  // Frontmatter must start at the very top: optional whitespace then `---`.
  const fenceMatch = text.match(/^\s*---\r?\n/);
  if (!fenceMatch) return { meta: {}, body: text };

  const afterOpen = text.slice(fenceMatch[0].length);
  const closeMatch = afterOpen.match(/\r?\n---[ \t]*(\r?\n|$)/);
  if (!closeMatch) {
    // Unterminated frontmatter: treat whole thing as body (malformed).
    return { meta: {}, body: text };
  }

  const yamlBlock = afterOpen.slice(0, closeMatch.index);
  const body = afterOpen.slice(closeMatch.index + closeMatch[0].length);

  return { meta: parseYamlBlock(yamlBlock), body };
}

// Minimal YAML parser for the flat frontmatter subset OKF uses.
// Supports: `key: value`, quoted strings, numbers, booleans, null,
// inline arrays [a, b], block arrays (- item), and folded/literal block
// scalars (key: | or key: >).
function parseYamlBlock(block) {
  const meta = {};
  const lines = block.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, '');

    // Skip blank lines and comments.
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_][\w.\-]*)\s*:(.*)$/);
    if (!kv) {
      i++;
      continue;
    }

    const key = kv[1];
    let rest = kv[2].trim();

    // Block scalar: `|` (literal) or `>` (folded), optional chomp indicator.
    if (rest === '|' || rest === '>' || /^[|>][+-]?$/.test(rest)) {
      const folded = rest[0] === '>';
      const collected = [];
      i++;
      // Determine indentation from first non-empty continuation line.
      let indent = null;
      while (i < lines.length) {
        const cont = lines[i];
        if (cont.trim() === '') {
          collected.push('');
          i++;
          continue;
        }
        const leading = cont.match(/^(\s+)/);
        const width = leading ? leading[1].length : 0;
        if (width === 0) break; // dedent to key level ends the block
        if (indent === null) indent = width;
        if (width < indent) break;
        collected.push(cont.slice(indent));
        i++;
      }
      // Trim trailing blank lines.
      while (collected.length && collected[collected.length - 1] === '') collected.pop();
      meta[key] = folded ? collected.join(' ').trim() : collected.join('\n');
      continue;
    }

    // Block array: subsequent `- item` lines.
    if (rest === '') {
      const peek = lines[i + 1];
      if (peek && /^\s*-\s+/.test(peek)) {
        const arr = [];
        i++;
        while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
          const item = lines[i].replace(/^\s*-\s+/, '').trim();
          arr.push(coerceScalar(stripInlineComment(item)));
          i++;
        }
        meta[key] = arr;
        continue;
      }
      // Empty value with no list: store empty string.
      meta[key] = '';
      i++;
      continue;
    }

    // Inline value (may include an inline comment for unquoted scalars).
    rest = stripInlineComment(rest);
    meta[key] = parseInlineValue(rest);
    i++;
  }

  return meta;
}

// Remove trailing `# comment` from unquoted scalars. Leaves quoted content and
// bracketed arrays untouched.
function stripInlineComment(value) {
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('[')) return value;
  const hashIdx = value.indexOf(' #');
  if (hashIdx >= 0) return value.slice(0, hashIdx).trim();
  return value;
}

// Parse an inline value: quoted string, inline array, or scalar.
function parseInlineValue(value) {
  if (value === '') return '';

  // Inline array: [a, b, "c, d"]
  if (value.startsWith('[') && value.endsWith(']')) {
    return parseInlineArray(value.slice(1, -1));
  }

  return coerceScalar(value);
}

// Split an inline array body on commas, respecting quotes.
function parseInlineArray(inner) {
  const items = [];
  let buf = '';
  let quote = null;
  for (let j = 0; j < inner.length; j++) {
    const ch = inner[j];
    if (quote) {
      if (ch === quote) quote = null;
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ',') {
      const trimmed = buf.trim();
      if (trimmed !== '') items.push(coerceScalar(trimmed));
      buf = '';
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail !== '') items.push(coerceScalar(tail));
  return items;
}

// Coerce a raw scalar token into string/number/boolean/null.
function coerceScalar(token) {
  if (token === '') return '';

  // Quoted string: strip surrounding quotes, no escape processing beyond that.
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }

  const lower = token.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null' || lower === '~') return null;

  // Number: integer or float (no leading-zero octal surprises).
  if (/^-?\d+$/.test(token)) return parseInt(token, 10);
  if (/^-?\d*\.\d+$/.test(token)) return parseFloat(token);

  return token;
}

// ---------------------------------------------------------------------------
// Link extraction
// ---------------------------------------------------------------------------

// Extract concept IDs referenced by markdown links in the body. Only links that
// look like intra-bundle concept references are returned:
//   [text](/tables/orders)      -> tables/orders
//   [text](./customers.md)      -> customers
//   [text](../tables/orders.md) -> tables/orders
// External URLs (http, mailto, etc.) and pure anchors (#foo) are ignored.
export function extractLinks(body) {
  if (!body) return [];
  const links = new Set();
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const id = normalizeLinkTarget(m[1]);
    if (id) links.add(id);
  }
  return [...links];
}

function normalizeLinkTarget(target) {
  if (!target) return null;

  // Strip anchor fragment.
  const hashIdx = target.indexOf('#');
  const clean = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
  if (clean === '') return null;

  // Reject external schemes and protocol-relative URLs.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(clean)) return null;
  if (clean.startsWith('//')) return null;

  // Only intra-bundle references: absolute-from-root or explicitly relative.
  const isAbsolute = clean.startsWith('/');
  const isRelative = clean.startsWith('./') || clean.startsWith('../');
  if (!isAbsolute && !isRelative) return null;

  // Collapse `.` / `..` segments and strip leading markers.
  const segments = [];
  for (const seg of clean.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      segments.pop();
      continue;
    }
    segments.push(seg);
  }

  let id = segments.join('/');
  id = id.replace(/\.md$/i, '');
  return id || null;
}

// ---------------------------------------------------------------------------
// Bundle traversal and concept parsing
// ---------------------------------------------------------------------------

// Walk a bundle directory tree and parse every concept `.md` file into a
// structured concept object. Reserved files (index.md, log.md) and skip
// directories are excluded. Unreadable or binary files are skipped silently.
export function parseBundle(bundleDir) {
  const root = path.resolve(bundleDir);
  const concepts = [];

  for (const abs of walkMarkdown(root)) {
    const relPath = path.relative(root, abs).split(path.sep).join('/');
    const base = path.basename(abs).toLowerCase();
    if (RESERVED_FILES.has(base)) continue;

    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (looksBinary(content)) continue;

    const concept = parseConcept(relPath, content);
    if (concept) concepts.push(concept);
  }

  concepts.sort((a, b) => a.conceptId.localeCompare(b.conceptId));
  return concepts;
}

// Parse a single concept given its bundle-relative path and file content.
export function parseConcept(relPath, content) {
  const { meta, body } = parseFrontmatter(content);
  const conceptId = relPath.replace(/\.md$/i, '');

  const rest = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!KNOWN_FIELDS.has(k)) rest[k] = v;
  }

  return {
    conceptId,
    file: relPath,
    type: meta.type !== undefined ? String(meta.type) : null,
    title: meta.title !== undefined ? String(meta.title) : deriveTitle(conceptId),
    description: meta.description !== undefined ? String(meta.description) : '',
    resource: meta.resource !== undefined ? String(meta.resource) : null,
    tags: normalizeTags(meta.tags),
    timestamp: meta.timestamp !== undefined ? String(meta.timestamp) : null,
    meta: rest,
    body: body.trim(),
    links: extractLinks(body),
  };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string' && tags.trim() !== '') {
    return tags.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Derive a human title from the last path segment: "tables/orders" -> "Orders",
// "customer_ltv" -> "Customer Ltv".
function deriveTitle(conceptId) {
  const leaf = conceptId.split('/').pop() || conceptId;
  return leaf
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Recursively yield absolute paths of all `.md` files, skipping SKIP_DIRS.
function* walkMarkdown(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkMarkdown(abs);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield abs;
    }
  }
}

// Heuristic binary detection: a NUL byte in the first 8KB.
function looksBinary(content) {
  const limit = Math.min(content.length, 8192);
  for (let j = 0; j < limit; j++) {
    if (content.charCodeAt(j) === 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// index.md parsing
// ---------------------------------------------------------------------------

// Parse an index.md file into structured entries. Recognizes markdown list
// items with links, with an optional description after a dash or colon:
//   - [Orders](./orders.md) - One row per order
//   - [Orders](./orders.md): One row per order
//   * [Orders](./orders.md)
// Frontmatter, if present, is stripped first.
export function parseIndex(indexContent) {
  const { body } = parseFrontmatter(indexContent || '');
  const entries = [];
  const re = /^\s*[-*+]\s+\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*(.*)$/;

  for (const line of body.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    const title = m[1].trim();
    const linkPath = m[2].trim();
    let description = m[3].trim();
    description = description.replace(/^[-:\u2013\u2014]\s*/, '').trim();
    entries.push({ title, path: linkPath, description });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// log.md parsing
// ---------------------------------------------------------------------------

// Parse a log.md changelog into date-grouped entries. Recognizes date headings
// in several common forms:
//   ## 2026-05-22
//   ### 2026-05-22 - notes
//   ## [2026-05-22]
// Bullet lines beneath a heading become that date's entries. Non-bullet prose
// lines under a heading are also captured as entries.
export function parseLog(logContent) {
  const { body } = parseFrontmatter(logContent || '');
  const groups = [];
  let current = null;

  const headingRe = /^#{1,6}\s+\[?(\d{4}-\d{2}-\d{2})\]?\b.*$/;
  const bulletRe = /^\s*[-*+]\s+(.*)$/;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const hm = line.match(headingRe);
    if (hm) {
      current = { date: hm[1], entries: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    if (line.trim() === '') continue;

    const bm = line.match(bulletRe);
    if (bm) {
      current.entries.push(bm[1].trim());
    } else if (!line.startsWith('#')) {
      current.entries.push(line.trim());
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Bundle detection and validation
// ---------------------------------------------------------------------------

// Quick heuristic: does this directory look like an OKF bundle? Scans up to a
// few concept files and checks for a `type` field in frontmatter.
export function isOkfBundle(dir, sampleSize = 5) {
  const root = path.resolve(dir);
  let scanned = 0;
  let withType = 0;

  for (const abs of walkMarkdown(root)) {
    const base = path.basename(abs).toLowerCase();
    if (RESERVED_FILES.has(base)) continue;

    let content;
    try {
      content = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (looksBinary(content)) continue;

    scanned++;
    const { meta } = parseFrontmatter(content);
    if (meta.type !== undefined && String(meta.type).trim() !== '') withType++;
    if (scanned >= sampleSize) break;
  }

  if (scanned === 0) return false;
  // Conformant if the majority of sampled files carry a type.
  return withType / scanned >= 0.5;
}

// Validate a parsed concept array for OKF conformance. The only hard rule in
// v0.1 is that every concept declares a `type`.
export function validateBundle(concepts) {
  const errors = [];
  if (!Array.isArray(concepts)) {
    return { valid: false, errors: ['concepts must be an array'] };
  }
  for (const c of concepts) {
    if (!c || typeof c !== 'object') {
      errors.push('encountered a non-object concept entry');
      continue;
    }
    if (c.type === null || c.type === undefined || String(c.type).trim() === '') {
      errors.push(`${c.file || c.conceptId || 'unknown'}: missing required field 'type'`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// Map an OKF `type` to a Zara memory type using the supplied map (defaults to
// DEFAULT_TYPE_MAP). Unknown types fall back to 'fact'.
export function mapType(okfType, typeMap = DEFAULT_TYPE_MAP) {
  if (!okfType) return 'fact';
  const key = String(okfType).trim().toLowerCase();
  return typeMap[key] || 'fact';
}
