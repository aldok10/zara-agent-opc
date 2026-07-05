# RAG Pipeline Engineering

## Architecture (two pipelines)
- **Ingestion**: chunk -> embed -> store (metadata + vectors)
- **Query**: embed query -> retrieve (top-K) -> rerank (top-N) -> generate

## Chunking strategies
- **Fixed-size**: 512 tokens, ~20% overlap. Simple baseline.
- **Semantic**: split on sentence boundaries. Preserves meaning.
- **Recursive**: split by hierarchy (doc > section > paragraph > sentence). Best general default.
- **Parent-document**: small chunks for retrieval precision, return full parent doc for generation context.
- Chunk size is the single biggest lever: too small = no context, too large = noise dilutes signal. Sweet spot **256-1024 tokens** by use case (QA=256-512, summarization/legal=1024).

## Embedding models (2026)
- Proprietary: OpenAI `text-embedding-3-large`, Cohere `embed-v4`, `Voyage-3`
- Open-source: `nomic-embed`, `BGE-M3` (strong multilingual)
- Match embedding model dimensionality to your vector DB config; never mix models in one index.

## Vector databases
- **Qdrant**: native hybrid search  --  recommended default
- **Pinecone**: fully managed, low ops
- **Weaviate**: multimodal
- **pgvector**: use if already on Postgres (avoid new infra)
- **Chroma**: prototyping only

## Hybrid search (always default)
Combine **dense** (semantic) + **sparse** (BM25/keyword). Merge with **Reciprocal Rank Fusion (RRF)**.
- Semantic alone misses exact matches (IDs, codes, names)
- Keyword alone misses paraphrase/semantic similarity

## Reranking (2-stage retrieval = standard)
Retrieve **top-50** cheaply, rerank to **top-5** with a cross-encoder.
- Options: Cohere Rerank, BGE-reranker, ColBERT (late interaction)
- Skipping rerank = noisy context = worse generation.

## Incremental re-indexing
- Process only **changed documents** via CDC or webhook triggers  --  never full re-index per update.
- Full re-index only when embedding model or chunking schema changes.

## Metadata filtering
Pre-filter by metadata (date, source, category, tenant) **before** vector search. Shrinks search space, boosts relevance, enforces access control.

## Evaluation metrics
- **Precision@K**: fraction of top-K that are relevant
- **Recall@K**: fraction of all relevant docs retrieved
- **MRR**: rank of first relevant result
- **NDCG**: rank-weighted relevance
- Use **RAGAS** for automated end-to-end RAG eval (faithfulness, answer relevance, context precision/recall).

## Production concerns
- **Embedding drift**: monitor cosine similarity over time; re-index if it drops below ~0.85
- Chunk boundary bugs (mid-sentence splits), duplicate detection, freshness SLAs

## Anti-patterns
- No reranking (retrieval-only = noisy)
- Single retrieval strategy (dense-only or keyword-only)
- Splitting mid-sentence / ignoring boundaries
- No eval metrics
- Treating RAG as plug-and-play
