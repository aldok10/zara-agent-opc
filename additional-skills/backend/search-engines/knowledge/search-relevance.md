---
type: fact
title: "Search Relevance Tuning"
---

# Search Relevance Tuning

## BM25 Scoring

Default algorithm in Elasticsearch/OpenSearch. Key parameters:
- **k1** (default 1.2): term frequency saturation. Lower (0.5-0.8) for exact-match emphasis.
- **b** (default 0.75): length normalization. Lower (0.3-0.5) for short fields (titles, product names).

## Boosting Strategies

### Field Boosting
```json
{ "multi_match": {
    "query": "wireless headphones",
    "fields": ["title^3", "brand^2.5", "category^2", "description^1.5"],
    "type": "best_fields"
}}
```

### Function Score (business signals)
```json
{ "function_score": {
    "query": { "match": { "title": "laptop" } },
    "functions": [
      { "field_value_factor": { "field": "sales_count", "modifier": "log1p", "factor": 0.5 } },
      { "gauss": { "created_at": { "origin": "now", "scale": "30d", "decay": 0.5 } } }
    ],
    "boost_mode": "multiply"
}}
```

| Boost Type | Use Case |
|-----------|----------|
| Field boost | Title matches > body matches |
| Document boost (field_value_factor) | Popular items ranked higher |
| Decay function | Newer content scores higher |
| Script score | Custom business logic (margin × relevance) |

## Analyzers

Pipeline: `Character Filters → Tokenizer → Token Filters`

```json
{ "analysis": { "analyzer": { "product_analyzer": {
    "type": "custom", "tokenizer": "standard",
    "filter": ["lowercase", "english_stemmer", "product_synonyms"]
}}}}
```

| Use Case | Analyzer | Key Filters |
|----------|----------|-------------|
| Full-text | Custom + stemmer | lowercase, stop words, stemmer |
| Exact match | Keyword | none or lowercase only |
| Autocomplete | Edge n-gram | edge_ngram (index), standard (search) |
| Multilingual | ICU | icu_tokenizer, icu_folding |

## Synonyms

```
# Explicit (one-directional)
"ipod, i-pod, i pod => ipod"
# Equivalent (bidirectional)
"tv, television"
```

Apply at **search time** (not index time)  -  allows updates without reindexing.

## Learning to Rank (LTR)

1. Collect judgment data (query → document → relevance grade 0-3)
2. Extract features: BM25 scores, popularity, freshness, CTR, category match
3. Train model (LambdaMART or gradient-boosted trees)
4. Deploy as rescore phase in search pipeline

Evaluation: NDCG@k (primary), MRR (position of first relevant result).

## Common Problems and Fixes

| Symptom | Fix |
|---------|-----|
| Exact matches ranked low | Add phrase boost or exact-match subfield |
| Recent content buried | Gaussian decay on date field |
| Popular items not surfaced | function_score with popularity signal |
| Typos return nothing | `fuzziness: "AUTO"` on match query |
| Short queries poor results | multi_match with `cross_fields` type |
| Synonyms not working | Move to search-time synonym filter |
