---
type: tool
title: "Search Index Optimization"
---

# Search Index Optimization

## Purpose

Optimize search engine index configuration for relevance, performance, and resource efficiency. Covers mapping design, analyzer selection, shard sizing, and query tuning.

## When to Use

- Search results have poor relevance (wrong ranking)
- Index size growing beyond cluster capacity
- Query latency exceeding SLA targets
- Designing index mapping for a new data type
- Reindexing planning for mapping changes

## Prompt Template

```
CONTEXT:
- Engine: [Elasticsearch | OpenSearch | Solr | Meilisearch | Typesense]
- Version: [major.minor]
- Index size: [document count, storage size]
- Query types: [full-text | filtered | aggregation | geo | vector]
- Cluster: [node count, RAM per node, disk type]
- Write rate: [documents/second]
- Query rate: [queries/second]
- Latency target: [P50, P95, P99 in ms]

OPTIMIZATION AREAS:
1. Mapping design
   - Field types (keyword vs text, appropriate numeric types)
   - Multi-fields (analyzed + keyword for same field)
   - Nested vs object (when flattening loses meaning)
   - Dynamic mapping (strict vs dynamic templates)
   - doc_values: disable for fields never aggregated/sorted
   - _source: selective includes/excludes

2. Analyzer configuration
   - Standard vs custom analyzer
   - Tokenizer selection (standard, whitespace, ngram, edge_ngram)
   - Token filters (lowercase, stemmer, synonym, stop words)
   - Character filters (HTML strip, pattern replace)
   - Language-specific analysis
   - Search analyzer vs index analyzer (asymmetric)

3. Shard strategy
   - Shard count: target 10-50GB per shard
   - Replica count: query throughput vs resource cost
   - Index lifecycle (ILM/ISM): hot-warm-cold-delete
   - Rollover conditions (size, age, document count)
   - Shard allocation awareness (zone, rack)

4. Query optimization
   - Filter context vs query context (caching)
   - Bool query structure (must vs filter vs should)
   - Script score vs function_score
   - Search profiler results
   - Pagination: search_after vs scroll vs PIT

5. Resource management
   - JVM heap sizing (max 50% of RAM, max 31GB)
   - Field data vs doc values
   - Circuit breaker configuration
   - Index buffer size
   - Merge policy tuning

ANTI-PATTERNS:
- Text fields used for exact matching (should be keyword)
- Nested queries on large arrays (query amplification)
- Wildcard queries on analyzed text fields
- Over-sharding (too many small shards)
- Aggregations on text fields (high cardinality fielddata)
```

## Output Format

```
## Index Optimization: [index name]

### Current Issues
| Issue | Impact | Evidence |
|-------|--------|----------|
| ... | latency/relevance/resource | ... |

### Mapping Changes
[Before/after mapping for key fields]

### Analyzer Design
| Field | Index Analyzer | Search Analyzer | Rationale |
|-------|---------------|-----------------|-----------|
| ... | ... | ... | ... |

### Shard Strategy
- Current: [count x size]
- Recommended: [count x size with reasoning]

### Query Improvements
[Before/after query with explanation]

### Expected Impact
- Relevance: [improvement description]
- Latency: [expected reduction]
- Resources: [storage/memory change]

### Migration Path
1. [Steps to apply changes without downtime]
```
