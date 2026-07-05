---
type: fact
title: "Elasticsearch Patterns"
---

# Elasticsearch Patterns

## Index Mapping Design

Always define explicit mappings. Key field types:

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english_custom",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": { "type": "text", "analyzer": "autocomplete_analyzer" }
        }
      },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "created_at": { "type": "date" },
      "tags": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "embedding": { "type": "dense_vector", "dims": 1536, "index": true, "similarity": "cosine" }
    }
  }
}
```

## Custom Analyzers

```json
{
  "settings": {
    "analysis": {
      "filter": {
        "english_stop": { "type": "stop", "stopwords": "_english_" },
        "english_stemmer": { "type": "stemmer", "language": "english" },
        "synonym_filter": { "type": "synonym_graph", "synonyms_path": "synonyms.txt" }
      },
      "analyzer": {
        "english_custom": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "english_stop", "english_stemmer"]
        },
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "edge_ngram_filter"]
        }
      }
    }
  }
}
```

Test analyzers before deploying:
```
POST /_analyze
{ "analyzer": "english_custom", "text": "Running quickly through forests" }
```

## Query Patterns

### Multi-match with boosting
```json
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "user search terms",
          "fields": ["title^3", "description^2", "content"],
          "type": "best_fields",
          "fuzziness": "AUTO"
        }
      },
      "filter": [
        { "term": { "status": "published" } },
        { "range": { "created_at": { "gte": "now-30d" } } }
      ],
      "should": [
        { "term": { "featured": { "value": true, "boost": 2.0 } } }
      ]
    }
  }
}
```

### Function score for relevance tuning
```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "search term" } },
      "functions": [
        { "field_value_factor": { "field": "popularity", "modifier": "log1p", "factor": 0.5 } },
        { "gauss": { "created_at": { "origin": "now", "scale": "7d", "decay": 0.5 } } }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}
```

### Search-after pagination
```json
{
  "query": { "match_all": {} },
  "sort": [
    { "created_at": "desc" },
    { "_id": "asc" }
  ],
  "search_after": ["2026-01-15T10:00:00Z", "doc_abc123"],
  "size": 20
}
```

## Aggregations

```json
{
  "aggs": {
    "by_category": {
      "terms": { "field": "category.keyword", "size": 20 },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } },
        "price_ranges": {
          "range": {
            "field": "price",
            "ranges": [
              { "to": 50 },
              { "from": 50, "to": 200 },
              { "from": 200 }
            ]
          }
        }
      }
    },
    "price_histogram": {
      "histogram": { "field": "price", "interval": 25 }
    }
  },
  "size": 0
}
```

## Index Operations

### Zero-downtime reindex via alias
```bash
# Create new index with updated mapping
PUT /products_v2 { "mappings": {...} }

# Reindex
POST /_reindex { "source": { "index": "products_v1" }, "dest": { "index": "products_v2" } }

# Atomic alias swap
POST /_aliases {
  "actions": [
    { "remove": { "index": "products_v1", "alias": "products" } },
    { "add": { "index": "products_v2", "alias": "products" } }
  ]
}
```

### Bulk indexing
```json
POST /_bulk
{ "index": { "_index": "products", "_id": "1" } }
{ "title": "Widget", "price": 29.99, "category": "tools" }
{ "index": { "_index": "products", "_id": "2" } }
{ "title": "Gadget", "price": 49.99, "category": "electronics" }
```

Optimal bulk size: 5-15MB per request, benchmark to find sweet spot.

## Cluster Sizing Rules of Thumb

- Shard size: 10-50GB optimal
- Shards per node: max 20 per GB of heap
- Replicas: 1 minimum for production (2 for critical data)
- Heap: 50% of RAM, max 31GB (compressed oops limit)
- Disk: 85% watermark triggers shard relocation
