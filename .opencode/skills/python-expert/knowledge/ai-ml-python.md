# AI/ML Python Patterns

## LangChain Architecture

Core abstractions:
- **Chains**: composable sequences of calls (LLMChain, SequentialChain, RouterChain)
- **Agents**: LLM decides which tools to call and in what order
- **Tools**: functions agents can invoke (search, calculator, custom)
- **Memory**: conversation state (ConversationBufferMemory, ConversationSummaryMemory)

LangChain Expression Language (LCEL):
- Pipe operator `|` for composing runnables
- `.invoke()`, `.stream()`, `.batch()` as unified interface
- `RunnablePassthrough`, `RunnableLambda`, `RunnableParallel`

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

chain = ChatPromptTemplate.from_template("{input}") | ChatOpenAI() | StrOutputParser()
result = await chain.ainvoke({"input": "hello"})
```

LangGraph for stateful multi-step agents:
- Graph-based control flow (nodes + edges)
- Checkpointing for long-running workflows
- Human-in-the-loop with interrupt_before/interrupt_after

## Structured Output

Pydantic AI:
- Agent framework with type-safe dependency injection
- `@agent.tool` decorator for tool definitions
- Result validators for structured responses
- Streaming with typed partial results

Instructor (structured extraction):
```python
import instructor
from openai import OpenAI

client = instructor.from_openai(OpenAI())
response = client.chat.completions.create(
    model="gpt-4o",
    response_model=MyPydanticModel,
    messages=[{"role": "user", "content": text}],
)
```

- Automatic retries on validation failure
- Streaming partial objects
- Works with OpenAI, Anthropic, Gemini, local models

## Hugging Face Transformers

```python
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM

pipe = pipeline("text-generation", model="meta-llama/...", device_map="auto")
```

Key patterns:
- `device_map="auto"` for multi-GPU distribution
- `torch_dtype=torch.bfloat16` for memory efficiency
- `model.generate()` with `GenerationConfig` for fine control
- PEFT/LoRA for parameter-efficient fine-tuning
- `datasets` library for loading and preprocessing

## OpenAI/Anthropic SDK Best Practices

OpenAI:
- Use `openai.AsyncOpenAI()` for async code
- Structured outputs via `response_format={"type": "json_schema", ...}`
- Token counting with `tiktoken` before sending
- Retry with exponential backoff (tenacity or built-in)

Anthropic:
- `anthropic.AsyncAnthropic()` for async
- Tool use with `tools` parameter and `tool_choice`
- Extended thinking with `thinking` block type
- Streaming via `async with client.messages.stream()`

Common patterns:
- Rate limiting with semaphores or token buckets
- Cost tracking per request (input/output tokens)
- Fallback chains (primary model -> cheaper model)
- Caching with content hashing for identical prompts

## Vector Stores

ChromaDB (local/embedded):
```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("docs")
collection.add(documents=texts, ids=ids, metadatas=metas)
results = collection.query(query_texts=["search"], n_results=5)
```

Qdrant (production-grade):
- gRPC + REST API, filtering with payload conditions
- Sparse vectors for hybrid search
- Named vectors for multi-modal

pgvector (PostgreSQL extension):
- `CREATE EXTENSION vector;`
- Use with SQLAlchemy or asyncpg
- IVFFlat or HNSW indexing
- Good for existing Postgres deployments

## Data Processing for ML

Polars (fast DataFrame):
```python
import polars as pl
df = pl.scan_parquet("data/*.parquet")
    .filter(pl.col("score") > 0.8)
    .group_by("category")
    .agg(pl.col("value").mean())
    .collect()
```

DuckDB (analytical queries):
- SQL on Parquet/CSV without loading into memory
- `duckdb.sql("SELECT * FROM 'data.parquet' WHERE ...")`
- Integrates with Polars and PyArrow zero-copy

PyArrow:
- Zero-copy interchange format
- Parquet read/write with predicate pushdown
- Integration layer between Polars, DuckDB, Pandas

## Model Evaluation Patterns

- Use `datasets` + custom metrics for batch eval
- LLM-as-judge with structured rubrics
- A/B comparison with Elo rating
- Automated regression suites (golden datasets)
- Track metrics over time (accuracy, latency, cost)
- Confidence calibration (are 80% confident answers correct 80% of the time?)
- Human eval sampling for ground truth calibration
