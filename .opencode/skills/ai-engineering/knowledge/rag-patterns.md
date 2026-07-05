---
type: fact
title: "RAG Patterns"
---
# RAG Patterns

Deep technical reference for Retrieval-Augmented Generation architectures, strategies, and evaluation.

---

## Architecture Tiers

### Naive RAG

Linear pipeline: Query -> Retrieve -> Generate. Simple but suffers from poor retrieval quality on complex queries, chunk boundary issues, and no self-correction.

### Advanced RAG

Adds pre-retrieval optimization (query rewriting, decomposition) and post-retrieval refinement (reranking, compression). Handles multi-hop questions and ambiguous queries.

### Modular RAG

Composable components that can be mixed: routing, adaptive retrieval (decide whether to retrieve at all), iterative retrieval, and self-reflective generation with retrieval correction.

---

## Chunking Strategies

**Fixed-size chunking**: Split by token count (256-512 tokens typical) with overlap (50-100 tokens). Simple but breaks semantic boundaries.

**Semantic chunking**: Use embedding similarity between sentences. When similarity drops below threshold, create a new chunk. Preserves meaning but variable sizes.

**Document-aware chunking**: Respect document structure (headings, paragraphs, code blocks, tables). Best for structured content. Use libraries like Unstructured.io.

**Late chunking**: Embed the full document first with a long-context model, then chunk the embeddings. Preserves cross-chunk context in the embedding space.

```python
# Semantic chunking pseudocode
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def semantic_chunk(sentences, threshold=0.75):
    embeddings = model.encode(sentences)
    chunks, current = [], [sentences[0]]

    for i in range(1, len(sentences)):
        sim = cosine_similarity(embeddings[i-1], embeddings[i])
        if sim < threshold:
            chunks.append(" ".join(current))
            current = [sentences[i]]
        else:
            current.append(sentences[i])

    chunks.append(" ".join(current))
    return chunks
```

---

## Retrieval Methods

### Dense Retrieval (Embedding-based)

Encode queries and documents into vector space. Use cosine similarity or dot product. Models: `text-embedding-3-small`, `all-MiniLM-L6-v2`, `bge-large-en-v1.5`.

Key tradeoff: fast at query time (ANN search) but can miss exact keyword matches.

### Sparse Retrieval (BM25)

Term-frequency based scoring. Excels at exact match, rare terms, proper nouns. Doesn't understand synonyms or paraphrases.

### Hybrid Search with Reciprocal Rank Fusion (RRF)

Combine dense and sparse results. RRF assigns scores based on rank position rather than raw scores, making it resilient to score distribution differences.

```python
def reciprocal_rank_fusion(result_lists, k=60):
    scores = {}
    for result_list in result_lists:
        for rank, doc_id in enumerate(result_list):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (k + rank + 1)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

dense_results = vector_search(query, top_k=20)
sparse_results = bm25_search(query, top_k=20)
final = reciprocal_rank_fusion([dense_results, sparse_results])
```

---

## Reranking

After initial retrieval (top-k=20-100), rerank to top-n (3-10) for the context window.

**Cross-encoder reranking**: Feed (query, document) pairs through a cross-encoder model. Much more accurate than bi-encoder retrieval but O(n) per query instead of O(1).

**ColBERT (late interaction)**: Token-level embeddings with MaxSim operation. Near cross-encoder quality with better latency via pre-computed document token embeddings.

**Cohere Rerank API**: Hosted cross-encoder reranking. Simple integration, good quality. Use when you want accuracy without hosting models.

```python
# Cohere Rerank integration
import cohere

co = cohere.Client(api_key)
results = co.rerank(
    model="rerank-english-v3.0",
    query=query,
    documents=retrieved_docs,
    top_n=5,
    return_documents=True
)
```

---

## Query Optimization Techniques

### Query Decomposition

Break complex questions into sub-queries. Retrieve for each, then synthesize.

Example: "Compare React and Vue performance" becomes:
1. "React rendering performance benchmarks"
2. "Vue rendering performance benchmarks"

### HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer to the query (without retrieval), then use that answer's embedding to retrieve real documents. Works because the hypothetical answer is closer in embedding space to relevant documents than the original question.

```python
def hyde_retrieve(query, llm, retriever):
    hypothetical = llm.generate(
        f"Write a short paragraph answering: {query}"
    )
    embedding = embed(hypothetical)
    return retriever.search(embedding, top_k=10)
```

---

## RAPTOR (Tree-Structured Retrieval)

Build a tree of summaries over your document corpus:
1. Cluster leaf chunks by embedding similarity
2. Summarize each cluster into a parent node
3. Recursively cluster and summarize up the tree
4. At query time, traverse the tree -- use high-level nodes for broad queries, leaf nodes for specific ones

Best for corpora where questions span multiple documents or require synthesizing information across sections.

---

## Evaluation with RAGAS

Four core metrics:

| Metric | Measures | Input |
|--------|----------|-------|
| Context Precision | Are retrieved chunks relevant? | question + contexts + ground truth |
| Context Recall | Were all needed chunks retrieved? | question + contexts + ground truth |
| Faithfulness | Is the answer grounded in context? | answer + contexts |
| Answer Relevance | Does the answer address the question? | question + answer |

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness, answer_relevancy,
    context_precision, context_recall
)

results = evaluate(
    dataset=eval_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)
```

---

## Basic RAG Pipeline

```python
from openai import OpenAI
from qdrant_client import QdrantClient

client = OpenAI()
qdrant = QdrantClient(url="http://localhost:6333")

def rag_pipeline(query: str, collection: str = "docs") -> str:
    query_embedding = client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    ).data[0].embedding

    results = qdrant.search(
        collection_name=collection,
        query_vector=query_embedding,
        limit=5,
        score_threshold=0.7
    )

    context = "\n\n---\n\n".join([r.payload["text"] for r in results])

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
                "Answer based on the provided context. "
                "If the context doesn't contain the answer, say so."
            )},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
        ]
    )
    return response.choices[0].message.content
```

---

## Key Design Decisions

- **Chunk size**: 256-512 tokens for precision, 512-1024 for broader context. Benchmark on your data.
- **Overlap**: 10-20% overlap prevents losing context at boundaries.
- **Top-k vs threshold**: Use score threshold to avoid injecting irrelevant chunks. top-k alone can include garbage.
- **Chunk ordering**: Place most relevant chunks first and last (models attend poorly to middle context -- "Lost in the Middle" finding).
- **Metadata filtering**: Pre-filter by source, date, category before vector search for precision.
- **When to skip retrieval**: Use an LLM to classify whether retrieval is needed. Factual questions need it; creative tasks often don't.
