// Knowledge Freshness Scanner
// Scans knowledge/ for stale files based on content date & git history.
// Usage: node scripts/knowledge-freshness.mjs [--json|--terminal]
// Default output: terminal (grouped, ranked, actionable)

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const KNOWLEDGE_DIR = path.resolve('knowledge');
const NOW = new Date();
const DAY_MS = 86400000;

const STATUS = {
  FRESH: { label: 'FRESH', threshold: 180, color: 'GREEN' },
  STALE: { label: 'STALE', threshold: 365, color: 'YELLOW' },
  ARCHAIC: { label: 'ARCHAIC', threshold: Infinity, color: 'RED' },
};

function getStatus(daysOld) {
  if (daysOld <= STATUS.FRESH.threshold) return STATUS.FRESH;
  if (daysOld <= STATUS.STALE.threshold) return STATUS.STALE;
  return STATUS.ARCHAIC;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^\s*(\w[\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return meta;
}

function gitLastModified(filePath) {
  try {
    const out = execSync(
      `git log -1 --format="%ai" -- "${path.relative('.', filePath)}"`,
      { encoding: 'utf-8', stdio: 'pipe', timeout: 3000 }
    ).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}

function scan() {
  const files = [];

  function walk(dir, category) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, e.name);
      } else if (e.isFile() && e.name.endsWith('.md') && !['_index.md', 'INDEX.md', 'SUMMARY.md'].includes(e.name)) {
        const content = fs.readFileSync(full, 'utf-8');
        const meta = extractFrontmatter(content);
        const relPath = path.relative(KNOWLEDGE_DIR, full);
        const cat = category || path.dirname(relPath).split('/')[0];

        let contentDate = meta.date ? new Date(meta.date) : null;
        let reviewedDate = meta['reviewed'] || meta['last-reviewed'] || meta['last_review'] || null;
        if (reviewedDate) reviewedDate = new Date(reviewedDate);
        const gitDate = gitLastModified(full);

        const refDate = contentDate || gitDate || fs.statSync(full).birthtime;
        const daysOld = Math.floor((NOW - refDate) / DAY_MS);
        const status = getStatus(daysOld);

        files.push({
          path: relPath,
          category: cat || 'uncategorized',
          title: meta.title || path.basename(e.name, '.md'),
          contentDate: contentDate?.toISOString().split('T')[0] || null,
          reviewedDate: reviewedDate?.toISOString().split('T')[0] || null,
          gitDate: gitDate?.toISOString().split('T')[0] || null,
          daysOld,
          status: status.label,
          needsReview: !reviewedDate && daysOld > 180,
        });
      }
    }
  }

  walk(KNOWLEDGE_DIR, null);
  return files;
}

function terminalReport(files) {
  const lines = [];
  const byCategory = {};
  for (const f of files) {
    (byCategory[f.category] ||= []).push(f);
  }

  const total = files.length;
  const fresh = files.filter(f => f.status === 'FRESH').length;
  const stale = files.filter(f => f.status === 'STALE').length;
  const archaic = files.filter(f => f.status === 'ARCHAIC').length;
  const needsReview = files.filter(f => f.needsReview).length;

  lines.push('═══════════════════════════════════════════');
  lines.push('  KNOWLEDGE FRESHNESS REPORT');
  lines.push(`  ${new Date().toISOString().split('T')[0]}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`  Total files: ${total}`);
  lines.push(`  FRESH (<6mo):  ${fresh}`);
  lines.push(`  STALE (6-12mo): ${stale}`);
  lines.push(`  ARCHAIC (>1yr): ${archaic}`);
  lines.push(`  Needs review:  ${needsReview}`);
  lines.push('');

  // Archaic files first (most urgent)
  for (const cat of Object.keys(byCategory).sort()) {
    const entries = byCategory[cat].filter(f => f.status === 'ARCHAIC');
    if (!entries.length) continue;
    lines.push(`  ── ${cat.toUpperCase()} (${entries.length} ARCHAIC) ──`);
    for (const f of entries.sort((a, b) => b.daysOld - a.daysOld)) {
      const tag = f.reviewedDate ? `reviewed:${f.reviewedDate}` : 'never-reviewed';
      lines.push(`    🔴 ${f.daysOld}d  ${f.path}  (${tag})`);
    }
    lines.push('');
  }

  // Files without dates (no freshness baseline)
  const noDate = files.filter(f => !f.contentDate);
  if (noDate.length) {
    lines.push(`  ── NO DATE (${noDate.length} files) ──`);
    for (const f of noDate) {
      const src = f.gitDate ? `git:${f.gitDate}` : 'unknown';
      lines.push(`    ⚪ ${f.path}  (${src})`);
    }
    lines.push('');
  }

  // Recently reviewed files (positive signal)
  const reviewed = files.filter(f => f.reviewedDate);
  if (reviewed.length) {
    lines.push(`  ── REVIEWED (${reviewed.length} files) ──`);
    for (const f of reviewed) {
      lines.push(`    ✅ ${f.path}  last reviewed: ${f.reviewedDate}`);
    }
    lines.push('');
  }

  // Quick wins — add reviewed date to oldest files
  const topStale = files.filter(f => f.status === 'ARCHAIC' && !f.reviewedDate).slice(0, 10);
  if (topStale.length) {
    lines.push('  ── TOP CANDIDATES FOR REVIEW ──');
    for (const f of topStale) {
      lines.push(`    ${f.daysOld}d  ${f.path}`);
    }
    lines.push('');
    lines.push('  Fix: add `reviewed: YYYY-MM-DD` to frontmatter after verifying content is still accurate.');
  }

  return lines.join('\n');
}

function jsonReport(files) {
  const summary = {
    generated: new Date().toISOString(),
    total: files.length,
    byStatus: {
      FRESH: files.filter(f => f.status === 'FRESH').length,
      STALE: files.filter(f => f.status === 'STALE').length,
      ARCHAIC: files.filter(f => f.status === 'ARCHAIC').length,
    },
    needsReview: files.filter(f => f.needsReview).length,
    byCategory: {},
  };

  for (const f of files) {
    (summary.byCategory[f.category] ||= []).push({
      path: f.path,
      daysOld: f.daysOld,
      status: f.status,
      contentDate: f.contentDate,
      reviewedDate: f.reviewedDate,
      needsReview: f.needsReview,
    });
  }

  return JSON.stringify(summary, null, 2);
}

// ── CLI ─────────────────────────────────────────────

const args = process.argv.slice(2);
const format = args.includes('--json') ? 'json' : 'terminal';

const results = scan();
if (format === 'json') {
  console.log(jsonReport(results));
} else {
  console.log(terminalReport(results));
}
