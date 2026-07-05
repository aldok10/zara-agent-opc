# Vector Search

## Embedding Fundamentals

Embeddings map text/images to dense vectors in high-dimensional space where semantic similarity correlates with geometric proximity.

Key decisions:
- **Model choice**: determines dimension count and quality
  - OpenAI text-embedding-3-large: 3072 dims (truncatable to 256/1024)
  - Cohere embed-v4: 1024 dims, multilingual
  - Open source (nomic-embed, E5): 768-1024 dims
- **Similarity metric**: cosine (normalized), dot product (magnitude matters), L2 (euclidean distance)
- **Dimensionality**: higher = more expressive but slower; 256-1024 is practical

## HNSW (Hierarchical Navigable Small World)

The standard ANN (Approximate Nearest Neighbor) algorithm used by Elasticsearch, OpenSearch, pgvector, Qdrant, Pinecone.

Parameters:
- `m` (connections per node): 16-64. Higher = better recall, more memory
- `ef_construction` (build-time beam width): 100-500. Higher = better graph quality, slower indexing
- `ef_search` (query-time beam width): 100-500. Higher = better recall, slower queries

```json
{
  "mappings": {
    "properties": {
      "embedding": {
        "type": "dense_vector",
        "dims": 1024,
        "index": true,
        "similarity": "cosine",
        "index_options": {
          "type": "hnsw",
          "m": 32,
          "ef_construction": 200
        }
      }
    }
  }
}
```

## Vector Query (kNN)

```json
{
  "knn": {
    "field": "embedding",
    "query_vector": [0.1, 0.2, ...],
    "k": 10,
    "num_candidates": 100,
    "filter": {
      "term": { "status": "published" }
    }
  }
}
```

- `k`: number of results
- `num_candidates`: per-shard candidate pool (higher = better recall)
- Pre-filtering reduces search space before ANN traversal

## Hybrid Search (BM25 + Vector)

Combine keyword and semantic scores for best results:

### Reciprocal Rank Fusion (RRF)

```json
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "multi_match": {
                "query": "machine learning optimization",
                "fields": ["title^2", "content"]
              }
            }
          }
        },
        {
          "knn": {
            "field": "embedding",
            "query_vector": [0.1, 0.2, ...],
            "k": 50,
            "num_candidates": 200
          }
        }
      ],
      "rank_constant": 60,
      "rank_window_size": 100
    }
  }
}
```

### Linear Combination

```python
final_score = alpha * bm25_score + (1 - alpha) * vector_score

# Typical starting point: alpha=0.3 for semantic-heavy
# Tune based on evaluation metrics (nDCG, MRR)
```

## Chunking Strategies for RAG

Documents longer than the embedding model's context window must be chunked:

| Strategy | Use Case | Typical Size |
|----------|----------|-------------|
| Fixed-size | Uniform docs | 256-512 tokens |
| Sentence-based | Natural boundaries | 3-5 sentences |
| Semantic | Topic shifts | Variable |
| Recursive/hierarchical | Long docs with structure | Parent 1024, child 256 |

Best practices:
- Overlap chunks by 10-20% to preserve context at boundaries
- Store parent document ID for retrieval of full context
- Late chunking (embed full doc, then split) for models that support it

## Evaluation Metrics

- **Recall@k**: fraction of relevant docs in top-k results
- **nDCG** (Normalized Discounted Cumulative Gain): position-aware relevance
- **MRR** (Mean Reciprocal Rank): position of first relevant result
- **Precision@k**: fraction of top-k that are relevant

Always evaluate with labeled query sets. A/B test in production with interleaving.

## Production Considerations

1. **Index refresh**: vector indices are expensive to rebuild; batch updates
2. **Quantization**: reduce memory with scalar/product quantization (int8, binary)
3. **Filtered search**: pre-filter reduces candidate set, improves latency
4. **Reranking**: retrieve top-100 with ANN, rerank with cross-encoder for top-10
5. **Embedding versioning**: model changes require full re-embedding of corpus
6. **Cost**: vector storage is 4 bytes * dims * doc_count (uncompressed)
