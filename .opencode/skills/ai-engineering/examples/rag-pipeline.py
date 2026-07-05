"""Basic RAG pipeline: chunk, embed, retrieve, generate."""

import hashlib
from dataclasses import dataclass

import openai


@dataclass
class Chunk:
    id: str
    text: str
    embedding: list[float] | None = None


def chunk_text(text: str, size: int = 512, overlap: int = 64) -> list[Chunk]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        segment = text[start:end]
        chunk_id = hashlib.md5(segment.encode()).hexdigest()[:12]
        chunks.append(Chunk(id=chunk_id, text=segment))
        start += size - overlap
    return chunks


def embed_chunks(chunks: list[Chunk], model: str = "text-embedding-3-small") -> list[Chunk]:
    client = openai.OpenAI()
    texts = [c.text for c in chunks]
    response = client.embeddings.create(input=texts, model=model)
    for i, item in enumerate(response.data):
        chunks[i].embedding = item.embedding
    return chunks


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def retrieve(query_embedding: list[float], chunks: list[Chunk], top_k: int = 3) -> list[Chunk]:
    scored = []
    for chunk in chunks:
        if chunk.embedding is None:
            continue
        score = cosine_similarity(query_embedding, chunk.embedding)
        scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k]]


def generate(query: str, context_chunks: list[Chunk], model: str = "gpt-4o-mini") -> str:
    client = openai.OpenAI()
    context = "\n---\n".join(c.text for c in context_chunks)
    messages = [
        {"role": "system", "content": f"Answer using this context:\n\n{context}"},
        {"role": "user", "content": query},
    ]
    response = client.chat.completions.create(model=model, messages=messages)
    return response.choices[0].message.content or ""


def rag_query(documents: list[str], query: str) -> str:
    all_chunks = []
    for doc in documents:
        all_chunks.extend(chunk_text(doc))
    all_chunks = embed_chunks(all_chunks)
    client = openai.OpenAI()
    q_resp = client.embeddings.create(input=[query], model="text-embedding-3-small")
    query_emb = q_resp.data[0].embedding
    relevant = retrieve(query_emb, all_chunks)
    return generate(query, relevant)
