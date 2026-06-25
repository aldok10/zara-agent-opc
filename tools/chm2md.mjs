// chm2md.mjs — Convert CHM to AI skill with subskills (OOP)
// Output: SKILL.md (router) + subskills/<domain>/SKILL.md + knowledge/
//
// Architecture:
//   ChmConverter (singleton) — orchestrates extraction, classification, output
//   Pipeline: CHM → Extract → Classify Domain → Group into Subskills → Build Index
//
// Usage:
//   import { convertChm } from './chm2md.mjs';
//   convertChm(input, output, { mode: 'skill', skillName: 'my-sdk' });

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'fs';
import { join, basename, extname } from 'path';
import { tmpdir } from 'os';

// ─── Markdown formatting ───

function formatMd(text) {
  let t = text;
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Double space → single space
  t = t.replace(/  +/g, ' ');
  // Max 1 blank line between blocks
  t = t.replace(/\n{3,}/g, '\n\n');
  // Remove blank lines between list items
  while (/^(- .+)\n\n(- )/m.test(t)) {
    t = t.replace(/(^- .+)\n\n(- )/gm, '$1\n$2');
  }
  // No trailing whitespace
  t = t.replace(/[ \t]+$/gm, '');
  return t.trim() + '\n';
}

// Try prettier, fallback to manual formatting
let hasPrettier = null;
function prettifyMd(filePath) {
  if (hasPrettier === null) {
    try { execFileSync('npx', ['prettier', '--version'], { stdio: 'pipe', timeout: 5000 }); hasPrettier = true; } catch { hasPrettier = false; }
  }
  if (hasPrettier) {
    try {
      execFileSync('npx', ['prettier', '--write', '--prose-wrap', 'preserve', '--parser', 'markdown', filePath], { stdio: 'pipe', timeout: 10000 });
      return true;
    } catch { /* fallback to manual */ }
  }
  // Manual fallback
  const content = readFileSync(filePath, 'utf-8');
  writeFileSync(filePath, formatMd(content));
  return false;
}

// ─── HTML to Markdown ───

function htm2md(html) {
  let t = html;
  // Remove scripts, styles, head section
  t = t.replace(/<head[\s\S]*?<\/head>/gi, '');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');

  // ─── Extract code blocks into safe storage ───
  const codeBlocks = [];
  // CHM pattern: <p class="p_CodeExample"> with <span class="f_CodeExample">
  t = t.replace(/<p\s+class="p_CodeExample"[^>]*>([\s\S]*?)<\/p>/gi, (_, code) => {
    const clean = code
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/  +/g, ' ');
    codeBlocks.push(clean.trim());
    return `\n%%CODEBLOCK_${codeBlocks.length - 1}%%\n`;
  });
  // <pre> blocks
  t = t.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => {
    const clean = c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    codeBlocks.push(clean.trim());
    return `\n%%CODEBLOCK_${codeBlocks.length - 1}%%\n`;
  });

  // Remove navigation bars
  t = t.replace(/<table[^>]*>[\s\S]*?(previous\.png|next\.png|class="nav")[\s\S]*?<\/table>/gi, '');
  t = t.replace(/<a[^>]*href="[^"]*"[^>]*>\s*<img[^>]*(previous|next|prev)[^>]*>\s*<\/a>/gi, '');

  // Extract title
  t = t.replace(/<title>(.*?)<\/title>/gi, '# $1\n\n');

  // Headers
  t = t.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  t = t.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  t = t.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  t = t.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');

  // Inline code: <code> tags
  t = t.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => {
    const clean = c.replace(/<[^>]+>/g, '').trim();
    if (clean.includes('\n') || clean.length > 80) {
      codeBlocks.push(clean);
      return `\n%%CODEBLOCK_${codeBlocks.length - 1}%%\n`;
    }
    return '`' + clean + '`';
  });

  // Remove styling div+table wrappers (now empty after code extraction)
  t = t.replace(/<div[^>]*style="[^"]*border[^"]*"[^>]*>[\s\S]*?<\/div>/gi, (match) => {
    // Preserve code block placeholders
    const placeholders = match.match(/%%CODEBLOCK_\d+%%/g) || [];
    return placeholders.length ? '\n' + placeholders.join('\n') + '\n' : '';
  });

  // Tables — process innermost first
  let tableLimit = 20;
  while (t.includes('<table') && tableLimit-- > 0) {
    t = t.replace(/<table[^>]*>((?:(?!<table)[\s\S])*?)<\/table>/gi, (_, table) => {
      // If contains code placeholders, just strip tags
      if (table.includes('%%CODEBLOCK_')) {
        const placeholders = table.match(/%%CODEBLOCK_\d+%%/g) || [];
        return '\n' + placeholders.join('\n') + '\n';
      }
      const rows = [];
      for (const rm of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells = [];
        for (const cm of rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
          cells.push(cm[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
        }
        if (cells.some(c => c.length > 0)) rows.push(cells);
      }
      if (!rows.length) return '';
      if (rows.length === 1 && rows[0].length === 1) return '\n' + rows[0][0] + '\n';
      const maxCols = Math.max(...rows.map(r => r.length));
      if (maxCols < 2) return rows.map(r => r[0] || '').join('\n');
      let md = '';
      rows.forEach((row, i) => {
        const padded = Array.from({ length: maxCols }, (_, j) => row[j] || '');
        md += '| ' + padded.join(' | ') + ' |\n';
        if (i === 0) md += '| ' + padded.map(() => '---').join(' | ') + ' |\n';
      });
      return '\n' + md + '\n';
    });
  }

  // Lists
  t = t.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  t = t.replace(/<[uo]l[^>]*>/gi, '\n');
  t = t.replace(/<\/[uo]l>/gi, '\n');

  // Bold/Italic
  t = t.replace(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/gi, '**$2**');
  t = t.replace(/<(i|em)[^>]*>(.*?)<\/(i|em)>/gi, '*$2*');

  // CHM class patterns
  t = t.replace(/<p\s+class="p_H1"[^>]*><span[^>]*>(.*?)<\/span><\/p>/gi, '## $1\n');
  t = t.replace(/<p\s+class="p_Function"[^>]*><span[^>]*font-weight:\s*bold[^>]*>(.*?)<\/span><\/p>/gi, '**$1**\n');
  t = t.replace(/<span\s+class="f_(?:Text|Function|H1|Heading)"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Links — strip .htm links, keep text only
  t = t.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return cleanText || '';
  });

  // Images — remove
  t = t.replace(/<img[^>]*>/gi, '');

  // Block elements
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<p[^>]*>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n');
  t = t.replace(/<div[^>]*>/gi, '\n');
  t = t.replace(/<\/div>/gi, '\n');

  // Strip remaining tags
  t = t.replace(/<[^>]+>/g, '');

  // Decode entities
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

  // ─── Post-processing ───

  // Restore code blocks as fenced markdown
  t = t.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) => {
    let code = codeBlocks[parseInt(i)];
    if (!code) return '';
    // Remove blank lines inside code (from <br> between spans)
    code = code.replace(/\n{2,}/g, '\n');
    return '\n```\n' + code + '\n```\n';
  });

  // Merge adjacent code blocks
  t = t.replace(/```\n\n```\n/g, '\n');
  t = t.replace(/```\n```\n/g, '\n');

  // Remove garbage unicode
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD\uFFFE\uFFFF]/g, '');
  t = t.replace(/[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/g, '');

  // Remove nav breadcrumbs
  t = t.replace(/^\s*[\w\s]+\s*\/\s*[\w\s]+\s*\/\s*[\w\s]*\/?\s*[\w\s]*$/gm, '');

  // Remove empty remnants
  t = t.replace(/\|\s*\|\s*\|\s*\|/g, '');
  t = t.replace(/^\|[\s|]*\|$/gm, '');
  t = t.replace(/^\s*[\u25b6\u25c0\u2190\u2192\u2194←→▶◀►◄]\s*$/gm, '');
  t = t.replace(/^\s*(Previous|Next|Prev|Back|Forward)\s*$/gmi, '');

  // Double space → single, compact lists, collapse excess whitespace
  t = t.replace(/  +/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  // Compact lists
  while (/^(- .+)\n\n(- )/m.test(t)) {
    t = t.replace(/(^- .+)\n\n(- )/gm, '$1\n$2');
  }

  t = t.trim();
  return t.length < 20 ? '' : t;
}

// ─── Domain classification ───
// User can provide custom domain rules, or we auto-detect from filename patterns

const DEFAULT_DOMAIN_RULES = [
  // Order matters — first match wins. More specific rules first.
  { domain: 'webapi', name: 'Web API', description: 'REST/JSON Web API endpoints, authentication, data structures', match: f => /^webapi/i.test(f) },
  { domain: 'admin-api', name: 'Admin API', description: 'Administrator API for server management', match: f => /^imtadminapi/i.test(f) },
  { domain: 'server-plugin', name: 'Server Plugin API', description: 'C++ server plugin development, hooks, events, sinks', match: f => /^(serverapi|imtserver(api|plugin|sink)|imttradesink|imtticksink|imtcustomsink|imtendofday|imtserversink)/i.test(f) },
  { domain: 'manager-api', name: 'Manager API', description: '.NET/Python Manager API for external integrations', match: f => /^(managerapi|net_|net\b|imtmanagerapi|cmtmanager)/i.test(f) },
  { domain: 'php-api', name: 'PHP API', description: 'PHP Web API extension and examples', match: f => /^php/i.test(f) },
  { domain: 'report-api', name: 'Report API', description: 'Report plugin development, dashboards, charts, datasets', match: f => /^(reportapi|imtreport|mtreport|imtdataset)/i.test(f) },
  { domain: 'gateway-api', name: 'Gateway API', description: 'Gateway and data feed plugin development', match: f => /^(gatewayapi|imtgateway|imtfeeder|mtgateway|cmtgateway)/i.test(f) },
  { domain: 'trading', name: 'Trading', description: 'Order processing, deals, positions, trade hooks, execution', match: f => /^(trading|order_|imtorder|imtdeal|imtposition|imtrequest|imtconfirm|imtexecution|imtaccount|imtecn|deals|positions|orders)/i.test(f) },
  { domain: 'configuration', name: 'Configuration', description: 'Server config: groups, symbols, routes, managers, plugins', match: f => /^(imtcon|config|symbols|groups|routing|spreads|network|managers|plugins)/i.test(f) },
  { domain: 'interfaces', name: 'Core Interfaces', description: 'User, online, daily, summary, book, mail, news, certificate, chart interfaces', match: f => /^(imtuser|imtonline|imtdaily|imtsummary|imtbook|imtmail|imtnews|imtbytestream|imtcertificate|imtchart|imtgeo|imtvps|imtlog)/i.test(f) },
  { domain: 'utilities', name: 'Utilities', description: 'SMT helpers, math, time, search, formatting, structures, threads', match: f => /^(smt|mt[a-z]|cmtstr|cmtfile|cmtarray|cmtsync|cmtthread|cmtarraybase)/i.test(f) },
  { domain: 'crm', name: 'CRM', description: 'Client management, documents, subscriptions, KYC, messenger', match: f => /^(imtclient|imtdocument|imtcomment|imtattach|imtsubscription|imtkyc|imtmessenger)/i.test(f) },
  // Catch-all: guides, docs, installation, reports by content
  { domain: 'guides', name: 'Guides & Documentation', description: 'Installation, setup, user guides, built-in reports, operational docs', match: () => true },
];

function classifyDomain(filename, customRules) {
  const rules = customRules || DEFAULT_DOMAIN_RULES;
  for (const rule of rules) {
    if (rule.match(filename)) return rule.domain;
  }
  return 'guides';
}

function classifyContent(filename, md) {
  const signals = {
    api_reference: /\b(method|function|parameter|return|interface|class|virtual|void)\b/i.test(md) && md.includes('('),
    code_example: (md.match(/```/g) || []).length >= 2,
    configuration: /\b(config|setting|parameter|option|enable|disable|default)\b/i.test(md),
    concept: /\b(overview|introduction|purpose|description|architecture)\b/i.test(md) && !(md.includes('(')),
    error_codes: /\b(error|retcode|ret_|return code|status code)\b/i.test(md),
    tutorial: /\b(step|how to|guide|install|setup|getting started)\b/i.test(md),
    enum_constants: /\b(enum|const|flag|type|mode)\b/i.test(md) && /\d+/.test(md),
  };
  const scores = Object.entries(signals).filter(([, v]) => v).map(([k]) => k);
  return scores.length ? scores[0] : 'reference';
}

function extractTitle(md) {
  const match = md.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

function countCodeBlocks(md) {
  return (md.match(/```/g) || []).length / 2;
}

// ─── Build a subskill SKILL.md ───

function buildSubskillMd(domain, info, entries, knowledgeFiles) {
  const totalLines = knowledgeFiles.reduce((s, k) => s + k.lines, 0);
  const types = [...new Set(entries.map(e => e.type))];

  let md = `# ${info.name}\n\n`;
  md += `## Description\n\n${info.description}\n\n`;

  // When to Use — actionable triggers
  md += `## When to Use\n\n`;
  md += `Load this subskill when the user:\n`;
  md += `- Asks about ${info.description.toLowerCase()}\n`;
  if (types.includes('api_reference')) md += `- Needs method signatures, parameters, or return types\n`;
  if (types.includes('code_example')) md += `- Wants code examples or implementation patterns\n`;
  if (types.includes('configuration')) md += `- Needs configuration or setup information\n`;
  if (types.includes('enum_constants')) md += `- Looks up enum values, constants, or flags\n`;
  if (types.includes('error_codes')) md += `- Troubleshoots errors or return codes\n`;

  // Key concepts — extract top-frequency terms
  md += `\n## Key Concepts\n\n`;
  const termFreq = new Map();
  for (const e of entries) {
    const words = e.filename.split(/[_-]/).filter(w => w.length > 3);
    for (const w of words) {
      termFreq.set(w, (termFreq.get(w) || 0) + 1);
    }
  }
  const topTerms = [...termFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  md += topTerms.map(([t, n]) => `\`${t}\``).join(', ') + '\n';

  // Knowledge map — "I need to..." lookup
  md += `\n## Quick Lookup\n\n`;
  md += `| I need to... | Load file |\n|---|---|\n`;
  for (const k of knowledgeFiles.sort((a, b) => b.lines - a.lines).slice(0, 15)) {
    const purpose = k.description.split(',')[0].trim();
    md += `| ${purpose} | ${k.file} |\n`;
  }

  // Knowledge files table
  md += `\n## Knowledge Files\n\n`;
  md += `| File | Content | Lines |\n|------|---------|-------|\n`;
  for (const k of knowledgeFiles.sort((a, b) => b.lines - a.lines)) {
    md += `| ${k.file} | ${k.description} | ${k.lines} |\n`;
  }

  // Code patterns if any
  const withCode = entries.filter(e => e.codeBlocks >= 2).sort((a, b) => b.codeBlocks - a.codeBlocks);
  if (withCode.length) {
    md += `\n## Code Patterns\n\n`;
    md += `Files with implementation examples:\n`;
    for (const e of withCode.slice(0, 5)) {
      md += `- **${e.title}** (${e.codeBlocks} code blocks)\n`;
    }
  }

  md += `\n## Stats\n\n`;
  md += `- Entries: ${entries.length} | Files: ${knowledgeFiles.length} | Lines: ${totalLines}\n`;
  md += `- Content types: ${types.join(', ')}\n`;
  return md;
}

// ─── ChmConverter Class ───

class ChmConverter {
  static DOMAIN_RULES = DEFAULT_DOMAIN_RULES;

  convert(inputPath, outputDir, options = {}) {
    return convertChm(inputPath, outputDir, options);
  }

  get domainRules() { return DEFAULT_DOMAIN_RULES; }
}

const converter = new ChmConverter();

// ─── Main export ───

export function convertChm(inputPath, outputDir, options = {}) {
  const { mode = 'skill', skillName, domainRules, maxPerFile = 80 } = options;

  if (mode === 'flat' || mode === 'single' || mode === 'group') {
    return convertChmLegacy(inputPath, outputDir, { mode, maxPerFile });
  }

  if (!existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);

  const name = skillName || basename(inputPath, extname(inputPath)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const skillDir = outputDir;
  mkdirSync(skillDir, { recursive: true });

  // Step 1: Extract
  const tmpDir = join(tmpdir(), `chm2skill-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  try {
    execFileSync('7z', ['x', inputPath, `-o${tmpDir}`, '-y'], { stdio: 'pipe' });
  } catch {
    rmSync(tmpDir, { recursive: true, force: true });
    throw new Error('7z extraction failed. Ensure p7zip is installed.');
  }

  const allFiles = readdirSync(tmpDir, { recursive: true })
    .filter(f => /\.(htm|html)$/i.test(f)).sort();

  // Step 2: Convert + classify domain
  const entries = [];
  for (const file of allFiles) {
    const md = htm2md(readFileSync(join(tmpDir, file), 'utf-8'));
    if (md.length < 30) continue;
    const fname = basename(file, extname(file));
    entries.push({
      filename: fname,
      md,
      title: extractTitle(md) || fname,
      type: classifyContent(fname, md),
      domain: classifyDomain(fname, domainRules),
      codeBlocks: countCodeBlocks(md),
      lines: md.split('\n').length,
    });
  }

  // Step 3: Group by domain → subskills
  const domains = {};
  for (const entry of entries) {
    if (!domains[entry.domain]) domains[entry.domain] = [];
    domains[entry.domain].push(entry);
  }

  // Step 4: For each domain, write knowledge files + subskill SKILL.md
  const rules = domainRules || DEFAULT_DOMAIN_RULES;
  const subskillIndex = [];

  for (const [domain, domEntries] of Object.entries(domains)) {
    const info = rules.find(r => r.domain === domain) || { domain, name: domain, description: domain };
    const subDir = join(skillDir, 'subskills', domain);
    const subKnowledgeDir = join(subDir, 'knowledge');
    mkdirSync(subKnowledgeDir, { recursive: true });

    // Group entries by first filename segment (all methods of same interface together)
    const groups = {};
    for (const entry of domEntries) {
      const prefix = entry.filename.split(/[_-]/)[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(entry);
    }

    // Write knowledge files (chunk at 2000 lines)
    const knowledgeFiles = [];
    for (const [prefix, items] of Object.entries(groups)) {
      const chunks = [];
      let current = [], currentLines = 0;
      for (const item of items) {
        if (currentLines + item.lines > 2000 && current.length > 0) {
          chunks.push(current); current = []; currentLines = 0;
        }
        current.push(item); currentLines += item.lines;
      }
      if (current.length) chunks.push(current);

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const suffix = chunks.length > 1 ? `-${ci + 1}` : '';
        const fileName = `${prefix}${suffix}.md`;

        let content = `# ${prefix.replace(/[_-]/g, ' ')}${suffix}\n\n`;
        content += `> Domain: ${info.name} | Entries: ${chunk.length}\n\n`;
        for (const entry of chunk) {
          content += `## ${entry.title}\n\n${entry.md}\n\n---\n\n`;
        }

        content = formatMd(content);
        writeFileSync(join(subKnowledgeDir, fileName), content);
        const lines = content.split('\n').length;
        const titles = chunk.slice(0, 3).map(e => e.title);
        knowledgeFiles.push({
          file: `knowledge/${fileName}`,
          description: titles.join(', ') + (chunk.length > 3 ? '...' : ''),
          lines,
        });
      }
    }

    // Write subskill SKILL.md
    const subSkillMd = buildSubskillMd(domain, info, domEntries, knowledgeFiles);
    writeFileSync(join(subDir, 'SKILL.md'), formatMd(subSkillMd));

    const totalLines = knowledgeFiles.reduce((s, k) => s + k.lines, 0);
    subskillIndex.push({
      domain,
      name: info.name,
      description: info.description,
      entries: domEntries.length,
      files: knowledgeFiles.length,
      lines: totalLines,
      path: `subskills/${domain}/SKILL.md`,
    });
  }

  // Step 5: Build root SKILL.md (router)
  const totalLines = subskillIndex.reduce((s, sk) => s + sk.lines, 0);
  let rootSkill = `# ${name}\n\n`;
  rootSkill += `## Description\n\n`;
  rootSkill += `AI knowledge base with ${subskillIndex.length} specialized subskills.\n`;
  rootSkill += `Source: ${basename(inputPath)} (${allFiles.length} pages → ${entries.length} entries → ${totalLines} lines)\n\n`;

  rootSkill += `## Subskills\n\n`;
  rootSkill += `Route to the appropriate subskill based on the user's question:\n\n`;
  rootSkill += `| Subskill | Description | Entries | Files |\n`;
  rootSkill += `|----------|-------------|---------|-------|\n`;
  for (const sk of subskillIndex.sort((a, b) => b.entries - a.entries)) {
    rootSkill += `| [${sk.name}](${sk.path}) | ${sk.description} | ${sk.entries} | ${sk.files} |\n`;
  }

  rootSkill += `\n## Routing Guide\n\n`;
  rootSkill += `| User asks about... | Load subskill |\n`;
  rootSkill += `|--------------------|---------------|\n`;
  for (const sk of subskillIndex) {
    const keywords = sk.description.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3).slice(0, 4);
    rootSkill += `| ${keywords.join(', ')} | ${sk.name} (${sk.path}) |\n`;
  }

  rootSkill += `\n## Quick Reference\n\n`;
  rootSkill += `Total: ${entries.length} entries across ${subskillIndex.length} domains.\n\n`;
  for (const sk of subskillIndex) {
    rootSkill += `### ${sk.name}\n`;
    rootSkill += `${sk.description}. ${sk.entries} entries, ${sk.files} knowledge files.\n`;
    rootSkill += `→ \`${sk.path}\`\n\n`;
  }

  rootSkill += `## Stats\n\n`;
  rootSkill += `- Source: ${basename(inputPath)} (${allFiles.length} pages)\n`;
  rootSkill += `- Subskills: ${subskillIndex.length}\n`;
  rootSkill += `- Total knowledge files: ${subskillIndex.reduce((s, sk) => s + sk.files, 0)}\n`;
  rootSkill += `- Total lines: ${totalLines}\n`;
  rootSkill += `- Generated: ${new Date().toISOString().split('T')[0]}\n`;

  writeFileSync(join(skillDir, 'SKILL.md'), formatMd(rootSkill));

  // Step 6: Run prettier on all generated markdown (batch)
  try {
    const mdFiles = [join(skillDir, 'SKILL.md')];
    const subsDir = join(skillDir, 'subskills');
    if (existsSync(subsDir)) {
      for (const d of readdirSync(subsDir)) {
        const p = join(subsDir, d, 'SKILL.md');
        if (existsSync(p)) mdFiles.push(p);
      }
    }
    execFileSync('npx', ['prettier', '--write', '--prose-wrap', 'preserve', '--parser', 'markdown', ...mdFiles], { stdio: 'pipe', timeout: 30000 });
  } catch { /* prettier optional */ }

  rmSync(tmpDir, { recursive: true, force: true });

  return {
    skillName: name,
    inputFiles: allFiles.length,
    subskills: subskillIndex.map(s => ({ name: s.name, entries: s.entries, files: s.files })),
    totalLines,
    skillPath: join(skillDir, 'SKILL.md'),
  };
}

// ─── Legacy mode ───

function convertChmLegacy(inputPath, outputDir, options) {
  const { mode, maxPerFile = 50 } = options;
  if (!existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);

  const tmpDir = join(tmpdir(), `chm2md-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  try {
    execFileSync('7z', ['x', inputPath, `-o${tmpDir}`, '-y'], { stdio: 'pipe' });
  } catch {
    rmSync(tmpDir, { recursive: true, force: true });
    throw new Error('7z extraction failed. Ensure p7zip is installed.');
  }

  const allFiles = readdirSync(tmpDir, { recursive: true })
    .filter(f => /\.(htm|html)$/i.test(f)).sort();

  mkdirSync(outputDir, { recursive: true });
  let outputFiles = 0, totalLines = 0;

  if (mode === 'single') {
    let output = `# ${basename(inputPath, extname(inputPath))}\n\n`;
    for (const file of allFiles) {
      const md = htm2md(readFileSync(join(tmpDir, file), 'utf-8'));
      if (md.length > 20) output += `\n---\n\n## ${basename(file, extname(file))}\n\n${md}\n`;
    }
    writeFileSync(join(outputDir, basename(inputPath, extname(inputPath)) + '.md'), output);
    outputFiles = 1; totalLines = output.split('\n').length;
  } else if (mode === 'group') {
    const groups = {};
    for (const file of allFiles) {
      const n = basename(file, extname(file));
      const prefix = n.replace(/_[^_]*$/, '').replace(/\d+$/, '') || 'misc';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(file);
    }
    for (const [prefix, files] of Object.entries(groups)) {
      const chunks = [];
      for (let i = 0; i < files.length; i += maxPerFile) chunks.push(files.slice(i, i + maxPerFile));
      for (let ci = 0; ci < chunks.length; ci++) {
        const suffix = chunks.length > 1 ? `-${ci + 1}` : '';
        let output = `# ${prefix}${suffix}\n\n`;
        for (const file of chunks[ci]) {
          const md = htm2md(readFileSync(join(tmpDir, file), 'utf-8'));
          if (md.length > 20) output += `## ${basename(file, extname(file))}\n\n${md}\n\n---\n\n`;
        }
        writeFileSync(join(outputDir, `${prefix}${suffix}.md`), output);
        totalLines += output.split('\n').length; outputFiles++;
      }
    }
  } else {
    for (const file of allFiles) {
      const md = htm2md(readFileSync(join(tmpDir, file), 'utf-8'));
      if (md.length > 20) {
        writeFileSync(join(outputDir, basename(file, extname(file)) + '.md'), md);
        totalLines += md.split('\n').length; outputFiles++;
      }
    }
  }

  rmSync(tmpDir, { recursive: true, force: true });
  return { inputFiles: allFiles.length, outputFiles, totalLines, outputDir };
}

export { ChmConverter, converter, DEFAULT_DOMAIN_RULES };
