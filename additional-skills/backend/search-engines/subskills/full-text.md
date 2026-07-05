---
type: subskill
title: "Full-Text Search"
---

# Full-Text Search

Core concepts for building text search systems -- analyzers, tokenizers, filters, and relevance tuning.

## When to Load

- Implementing search functionality over text content
- Tuning search relevance and ranking
- Configuring language-specific analysis
- Debugging why searches miss expected results

## Key Concepts

**Analyzers** -- Pipeline that transforms text into searchable tokens. Composed of: character filters, tokenizer, token filters. Run at index time AND query time.

**Tokenizers** -- Split text into individual tokens. Standard (word boundaries), whitespace, keyword (no split), pattern (regex), n-gram, edge n-gram.

**Token Filters** -- Transform tokens after tokenization. Lowercase, stemming, stop words, synonyms, phonetic, ASCII folding. Order matters -- stemming after lowercase.

**Relevance Scoring** -- BM25 (default in modern engines). Term frequency, inverse document frequency, field length normalization. Boost fields, decay functions for recency.

**Field Mapping** -- Text (analyzed, searchable), keyword (exact match, aggregatable), multi-field (both). Choose based on query patterns.

## Patterns

```json
// Custom analyzer for English content
{
  "analysis": {
    "analyzer": {
      "english_custom": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "english_stop", "english_stemmer"]
      }
    },
    "filter": {
      "english_stop": { "type": "stop", "stopwords": "_english_" },
      "english_stemmer": { "type": "stemmer", "language": "english" }
    }
  }
}

// Multi-field mapping
{
  "title": {
    "type": "text",
    "analyzer": "english_custom",
    "fields": {
      "raw": { "type": "keyword" },
      "autocomplete": { "type": "text", "analyzer": "edge_ngram_analyzer" }
    }
  }
}

// Relevance tuning with function_score
{
  "function_score": {
    "query": { "multi_match": { "query": "search term", "fields": ["title^3", "body"] } },
    "functions": [
      { "gauss": { "published_at": { "origin": "now", "scale": "30d" } } }
    ]
  }
}
```

## Gotchas

- Analyzer mismatch between index and query time produces zero results silently
- Over-stemming conflates unrelated words (e.g., "universal" and "university")
- Stop word removal breaks phrase queries -- use a second field without stop words
- Synonym expansion at index time locks you in; prefer query-time synonyms for flexibility
- Field boosting is relative -- boosting everything equally changes nothing

## Verification

- Test analyzer output with `_analyze` API before indexing data
- Compare search results with and without custom scoring to measure improvement
- Use `_explain` API to understand why a document ranked where it did
- Verify that phrase queries, exact matches, and fuzzy queries all behave as expected
- Monitor zero-result rate as the primary signal of search quality issues
