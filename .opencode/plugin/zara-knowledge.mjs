// Zara Knowledge — Search 254 DevIQ articles
// Plugin for OpenCode: provides knowledgeSearch(query, limit)

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = join(__dirname, '..', '..', 'knowledge', 'search-index.json')

let entries = []
try {
  const data = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
  entries = data.entries || []
} catch { /* index not built yet */ }

export function knowledgeSearch(query, limit = 5) {
  if (!query || query.length < 2 || !entries.length) return []
  const terms = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2)
  
  const scored = entries.map(e => {
    let score = 0
    const titleLow = e.title.toLowerCase()
    const descLow = (e.description || '').toLowerCase()
    for (const t of terms) {
      if (titleLow.includes(t)) score += 3
      if (e.section === t || e.section.includes(t)) score += 2
      if (e.keywords.some(k => k === t || k.startsWith(t))) score += 2
      if (descLow.includes(t)) score += 1
    }
    return { ...e, score }
  }).filter(e => e.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ title, section, path, score, description }) => ({
    title, section, path, score, snippet: (description || '').slice(0, 100)
  }))
}

export const ZaraKnowledge = async ({ app, client, $ }) => {
  if (entries.length) console.log(`[zara-knowledge] Loaded ${entries.length} articles`)
  else console.log(`[zara-knowledge] No index found. Run: node scripts/build-knowledge-index.mjs`)
  return {}
}
