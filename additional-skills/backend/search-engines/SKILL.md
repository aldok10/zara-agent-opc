---
name: search-engines
description: "Elasticsearch, OpenSearch, vector search. Full-text and semantic search architecture."
---

# Search Engines

## Scope

Elasticsearch 8.15+, OpenSearch 2.x, Meilisearch 1.x, Typesense 27+ cluster design, index mappings, analyzers, query DSL, aggregations, vector/hybrid search, relevance tuning, and search infrastructure operations.

## First Action

Identify the search use case (full-text, autocomplete, faceted, semantic, hybrid). Check existing index mappings and query patterns before proposing changes. Understand data volume, update frequency, and latency requirements.

## Constraints

1. Define explicit mappings -- never rely on dynamic mapping in production
2. Choose analyzers deliberately based on language and use case
3. Separate indexing and search concerns (write-heavy vs read-heavy)
4. Use aliases for zero-downtime reindexing
5. Size shards between 10-50GB for optimal performance
6. Replicas for read throughput and fault tolerance (min 1 in production)
7. Bulk index operations -- never index one document at a time
8. Circuit breaker settings prevent OOM -- respect them
9. Vector dimensions and similarity metric must match embedding model
10. Hybrid search combines keyword and vector scores with explicit weights
11. Filter before score -- use filter context for non-scoring clauses
12. Pagination via search_after for deep pagination (not from/size beyond 10k)
13. Monitor cluster health, indexing rate, and query latency
14. Refresh interval tuned to use case (1s default may be too frequent for bulk)
15. Security: field-level security and document-level access control for multi-tenant
16. ILM (Index Lifecycle Management) policies for hot/warm/cold/frozen tiers -- automate rollover and retention
17. Snapshot/restore strategy: daily snapshots to object storage, tested restore runbook, cross-cluster restore for DR
18. Shard sizing rules: max 50GB/shard, max 20 shards per GB of heap, fewer shards = better cluster stability

## DO NOT

1. Use dynamic mapping in production indices
2. Create one shard per document type (use single index with discriminator)
3. Use nested/parent-child without understanding the performance cost
4. Index large binary blobs directly
5. Rely on relevance defaults without measuring precision/recall
6. Use wildcard queries on non-keyword fields at scale
7. Skip mapping migrations -- always reindex with new mapping via alias swap
8. Expose cluster directly to public internet
9. Use scroll API for real-time pagination (deprecated pattern)

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Mapping/analyzer design | knowledge/elasticsearch-patterns.md |
| Vector/semantic/hybrid search | knowledge/vector-search.md |
| Production mapping example | examples/elasticsearch-mapping.json |
| Architecture review | tools/search-design-prompt.md |

## Verification

- [ ] Explicit mapping covers all indexed fields
- [ ] Analyzer chain tested with _analyze API
- [ ] Queries use filter context for non-scoring clauses
- [ ] Bulk indexing with appropriate batch size
- [ ] Index aliases configured for zero-downtime operations
- [ ] Shard count and size appropriate for data volume
- [ ] Relevance tested with representative queries
- [ ] Monitoring covers cluster health, latency percentiles, indexing throughput

## Knowledge

- knowledge/elasticsearch-patterns.md -- mapping, analyzers, queries, aggregations
- knowledge/vector-search.md -- embeddings, HNSW, hybrid search

## Alternatives

- **Meilisearch 1.x**: instant search, typo-tolerant, simple setup. Best for: product catalogs, site search, developer-friendly use cases. Tradeoff: single-node, limited aggregation support.
- **Typesense 27+**: typo-tolerant, fast, geo-search built-in. Best for: low-latency autocomplete, faceted search. Tradeoff: less ecosystem tooling than Elasticsearch.
- **Zinc**: lightweight Go-based search engine, ES-compatible API subset. Best for: log search at small scale, replacing ES when full features unnecessary.
- **Serverless**: Elastic Cloud Serverless (pay-per-query), Algolia (managed instant search). Best for: teams without ops capacity or bursty workloads.

## ES|QL (Elasticsearch Query Language)

New in Elasticsearch 8.11+. SQL-like pipe syntax for data exploration and transformation. Use for ad-hoc analysis, log exploration, and reporting queries. Not a replacement for Query DSL in application code, but valuable for operations and dashboards.

## AI-Era Context (2026)

Hybrid search (BM25 + vector) is the production standard for most search applications. Pure keyword search is insufficient for semantic queries; pure vector search misses exact matches. Embedding models (e.g., Cohere embed v4, OpenAI text-embedding-3) produce vectors indexed via HNSW in Elasticsearch/OpenSearch. Reciprocal Rank Fusion (RRF) is the standard score combination method. Retrieval-Augmented Generation (RAG) pipelines depend on search quality -- invest in retrieval precision.

RAG retrieval layer: search is the foundation of RAG quality. Invest in chunking strategy (semantic chunking > fixed-size), embedding model selection (domain-specific > general-purpose), and reranking (Cohere Rerank, cross-encoder models) to boost precision before LLM context window. Hybrid search with explicit BM25 + kNN weight tuning outperforms either method alone. Evaluate retrieval with NDCG@k and recall@k metrics, not just end-to-end LLM output quality.

## Related Skills

- system-design (search infrastructure architecture)
- ai-engineering (RAG pipelines, embeddings)
- backend/design-patterns (repository pattern for search)
