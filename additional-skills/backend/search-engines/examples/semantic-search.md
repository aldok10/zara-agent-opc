---
type: example
title: "Vector Semantic Search with OpenSearch kNN"
---

# Vector Semantic Search with OpenSearch kNN

## Context
When you need to find semantically similar documents (not just keyword matches). Use embedding models to convert text to vectors, then use kNN (k-nearest neighbors) queries to find the closest matches.

## Code/Template

### Index Mapping

```json
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "standard" },
      "content": { "type": "text", "analyzer": "standard" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 256,
            "m": 16
          }
        }
      },
      "category": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

### Hybrid Search Query (Vector + Keyword)

```json
{
  "size": 10,
  "query": {
    "bool": {
      "must": [
        {
          "knn": {
            "embedding": {
              "vector": [0.023, -0.041, 0.078, "... (1536 dims)"],
              "k": 20
            }
          }
        }
      ],
      "filter": [
        { "term": { "category": "technical-docs" } },
        { "range": { "created_at": { "gte": "2025-01-01" } } }
      ],
      "should": [
        {
          "match": {
            "content": {
              "query": "kubernetes pod autoscaling",
              "boost": 0.3
            }
          }
        }
      ]
    }
  },
  "_source": ["id", "title", "content", "category"],
  "highlight": {
    "fields": { "content": { "fragment_size": 150 } }
  }
}
```

### Indexing Pipeline (Python)

```python
from opensearchpy import OpenSearch
import openai

client = OpenSearch(
    hosts=[{"host": "search-cluster.example.com", "port": 443}],
    use_ssl=True,
)

def index_document(doc_id: str, title: str, content: str, category: str):
    """Generate embedding and index document."""
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=f"{title}\n\n{content}",
    )
    embedding = response.data[0].embedding

    client.index(
        index="documents",
        id=doc_id,
        body={
            "id": doc_id,
            "title": title,
            "content": content,
            "embedding": embedding,
            "category": category,
            "created_at": "2026-07-05T00:00:00Z",
        },
    )


def search(query: str, category: str | None = None, k: int = 10):
    """Semantic search with optional category filter."""
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query,
    )
    query_vector = response.data[0].embedding

    body = {
        "size": k,
        "query": {
            "bool": {
                "must": [{"knn": {"embedding": {"vector": query_vector, "k": k * 2}}}],
                "filter": [],
            }
        },
    }

    if category:
        body["query"]["bool"]["filter"].append({"term": {"category": category}})

    return client.search(index="documents", body=body)
```

## Key Points
- Hybrid search (vector + BM25 keyword) outperforms either alone. Use `should` for keyword boost alongside the `knn` clause.
- HNSW parameters: higher `m` and `ef_construction` improve recall but increase index time and memory. Start with m=16, ef_construction=256.
- Always filter post-kNN retrieval (use `bool.filter`) to avoid scanning the full vector space for each category independently.
