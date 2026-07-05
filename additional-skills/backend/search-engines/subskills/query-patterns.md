# Query Patterns

Advanced query construction -- boolean logic, aggregations, suggesters, and highlighting for search engines.

## When to Load

- Building complex search queries beyond simple match
- Implementing faceted search or analytics
- Adding autocomplete or did-you-mean functionality
- Configuring result highlighting

## Key Concepts

**Bool Queries** -- Combine clauses: must (AND, scored), should (OR, scored), filter (AND, unscored/cached), must_not (NOT, unscored). Use filter for exact matches to enable caching.

**Aggregations** -- Analytics over search results. Terms (facets), date_histogram (time series), range (buckets), nested (sub-aggregations), cardinality (distinct count). Run alongside queries.

**Suggesters** -- Completion (prefix autocomplete using FST), phrase (did-you-mean), term (single word corrections). Completion suggester requires a dedicated field type.

**Highlighting** -- Return fragments showing where matches occurred. Types: unified (best default), plain (simple), fvh (fast vector highlighter for large fields). Configure pre/post tags.

**Pagination** -- from/size (simple, limited to 10k), search_after (cursor-based, scalable), scroll (deprecated for search, use for export), PIT (point in time for consistent pagination).

## Patterns

```json
// Complex bool query with facets
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "wireless headphones", "fields": ["title^3", "description"] } }
      ],
      "filter": [
        { "term": { "status": "active" } },
        { "range": { "price": { "gte": 50, "lte": 200 } } },
        { "terms": { "brand": ["sony", "bose"] } }
      ]
    }
  },
  "aggs": {
    "brands": { "terms": { "field": "brand", "size": 20 } },
    "price_ranges": {
      "range": { "field": "price", "ranges": [
        { "to": 50 }, { "from": 50, "to": 100 }, { "from": 100, "to": 200 }, { "from": 200 }
      ] }
    },
    "avg_rating": { "avg": { "field": "rating" } }
  },
  "highlight": {
    "fields": { "title": {}, "description": { "fragment_size": 150 } },
    "pre_tags": ["<mark>"], "post_tags": ["</mark>"]
  }
}

// Cursor-based pagination with search_after
{
  "size": 20,
  "query": { "match_all": {} },
  "sort": [
    { "created_at": "desc" },
    { "_id": "asc" }
  ],
  "search_after": ["2024-01-15T10:30:00Z", "doc_abc123"]
}

// Completion suggester
{
  "suggest": {
    "product_suggest": {
      "prefix": "wire",
      "completion": {
        "field": "suggest",
        "size": 5,
        "fuzzy": { "fuzziness": 1 }
      }
    }
  }
}
```

## Gotchas

- from/size beyond 10,000 results throws an error -- use search_after for deep pagination
- Aggregations on text fields fail -- need a keyword sub-field or fielddata (expensive)
- should clauses in bool with must present become optional (boost only, not required)
- Highlighting large fields without stored source is slow -- consider fvh with term_vector
- Completion suggester does not support filtering at suggest time in older versions -- use context suggesters

## Verification

- Bool logic: test that filter clauses do not affect scoring (score same with/without)
- Aggregations: verify doc_count matches expected when cross-referenced with filters
- Pagination: confirm no duplicates or gaps when using search_after with a unique tiebreaker
- Suggesters: test with typos, partial inputs, and empty inputs
- Highlighting: verify fragments contain the matched terms and respect fragment_size
