# Sentence Structure: Burstiness & Length Variance

Statistical targets for natural-sounding text, based on detection research. The single most impactful factor (40% of detection signal).

## Target Metrics

| Metric | Human Target | AI Typical | Detection Threshold |
|--------|-------------|------------|-------------------|
| Burstiness (CV = SD/mean) | 0.65-0.85 | 0.15-0.30 | < 0.40 = flagged |
| Shortest sentence | 1-3 words | 8-12 words | Never < 8 = AI |
| Longest sentence | 30-45 words | 25-30 words | Never > 28 = suspicious |
| Simple sentences | 35-45% | 20-30% | |
| Fragments | 5-10% | 0% | 0% fragments = AI |
| One-sentence paragraphs | 15-20% | 0-2% | |
| Em dashes per 1000 words | 0-3 | 5-15 | > 4 = AI signal |

## Sentence Length Pattern (Per ~10 Sentences)

- 2-3 sentences: **3-8 words** (short, punchy)
- 4-5 sentences: **12-20 words** (medium, working)
- 2-3 sentences: **22-35 words** (complex, layered)
- 1 sentence: **1-3 words** (fragment for emphasis)

## Opening Variety

Never repeat same starter 3+ times. Distribution:

- Subject-first (SVO): 40-55% — most common but NOT dominant
- Prepositional: 10-15% — "In this case," "At the core"
- Conjunction: 5-10% — "And", "But", "So" (humans do this, AI avoids it)
- Dependent clause: 8-12% — "Although X," "When Y happened,"
- Questions: 2-5% — "Why?" "What if..."
- Fragments: 2-5% — "Not quite." "Exactly." "Nope."

## Paragraph Structure

- 15-20% of paragraphs = 1 sentence (emphasis)
- 30-40% = 2-3 sentences (conversational)
- 30-40% = 4-6 sentences (explanation)
- 5-10% = 7+ (rare, deep dives)

AI tell: All paragraphs approximately same length. Human tell: wild variance.

## What This Looks Like in Practice

BAD (AI — uniform, CV ~0.20):
```
The system handles authentication through JWT tokens. Each request is validated against the token store. Invalid tokens result in a 401 response. The middleware processes this before reaching the handler.
```

GOOD (human — varied, CV ~0.70):
```
Auth goes through JWT. Standard stuff. Each request hits the token store for validation — if it fails, 401, done. The middleware catches this before your handler ever sees the request, which means you don't need to think about auth in your business logic at all unless you're doing something weird with scopes or multi-tenant isolation.
```

Notice: 3 words, 2 words, then a 40+ word sentence. Fragment. Then explanation. Uneven. That's the target.
