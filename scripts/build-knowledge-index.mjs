#!/usr/bin/env node
// Build searchable JSON index from knowledge/ markdown articles
// Usage: node scripts/build-knowledge-index.mjs

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join, relative, basename, dirname } from 'path'

const SKIP = new Set(['INDEX.md', 'SUMMARY.md', 'ANTIPATTERNS_QUICKREF.md'])
const STOPS = new Set(['the','and','for','that','this','with','from','are','was','been','have','has','will','can','its','but','not','all','also','more','when','what','how','use','using','used','about','into','than','most','such','each','which','their','other','some','only','over','these','just','being','between','does','own','same','very','after','before','through','where','much','should','could','would'])

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..', 'knowledge')

function walk(dir) {
  let files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (entry.endsWith('.md') && !SKIP.has(entry)) files.push(full)
  }
  return files
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const fm = {}
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':')
    if (k && v.length) fm[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '')
  }
  return fm
}

function extractTitle(content, slug) {
  const heading = content.match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : slug.replace(/-/g, ' ')
}

function keywords(text) {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !STOPS.has(w)))]
}

const entries = []
for (const file of walk(ROOT)) {
  try {
    const content = readFileSync(file, 'utf8')
    const rel = relative(ROOT, file)
    const section = rel.split('/')[0]
    const slug = basename(file, '.md')
    const fm = parseFrontmatter(content)
    const title = fm.title || extractTitle(content, slug)
    const description = fm.description || ''
    entries.push({ title, description, section, slug, path: `knowledge/${rel}`, keywords: keywords(`${title} ${description}`) })
  } catch (e) { process.stderr.write(`SKIP ${file}: ${e.message}\n`) }
}

const index = { version: 1, generated: new Date().toISOString(), count: entries.length, entries }
writeFileSync(join(ROOT, 'search-index.json'), JSON.stringify(index, null, 2))
console.log(`✓ Built search-index.json with ${entries.length} entries`)
