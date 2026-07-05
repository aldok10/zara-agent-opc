---
type: fact
title: "Python Common Mistakes - Production Lessons"
---

# Python Common Mistakes: Production Lessons

Learning from others' mistakes so you don't repeat them.

## 1. Async/Asyncio Traps

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Calling blocking I/O (requests, time.sleep) inside async function | Event loop stalls, all concurrent tasks freeze | Use `asyncio.to_thread()` or async libs (httpx, aiofiles) |
| Forgotten `await` on coroutine | Coroutine object created but never executed, no error in some contexts | Enable `PYTHONASYNCIODEBUG=1`, use linters (ruff async rules) |
| Fire-and-forget tasks without reference | Task gets GC'd mid-execution, silently disappears | Keep reference: `task = asyncio.create_task(coro()); tasks.add(task)` |
| Swallowing exceptions in task groups | One task's exception kills the group, others get CancelledError | Use `TaskGroup` with proper exception handling, log each task's result |
| `asyncio.gather(return_exceptions=True)` without checking results | Exceptions buried in return list, treated as successful values | Always iterate results and check `isinstance(r, BaseException)` |
| Creating event loop in thread that already has one | RuntimeError or nested loop conflicts | Use `asyncio.run()` only at top level, `loop.run_in_executor()` for threads |
| Sharing non-threadsafe objects across async tasks | Race conditions with dict/list mutations in yielding code | Use `asyncio.Lock` or design immutable data flow |
| `async for` without proper cleanup on break | Async generator not finalized, resources leak | Use `async with aclosing(gen)` from contextlib |

## 2. Type System Gotchas

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Mutable default argument: `def f(x: list = [])` | All callers share same list instance | Use `None` default + create inside: `x = x or []` or `field(default_factory=list)` |
| `TypeVar` bound vs constraint confusion | `TypeVar("T", int, str)` means ONLY int or str, not subtypes | Use `bound=` for upper bound, positional args for union-like constraint |
| Protocol with `__init__` | Classes must match init signature exactly, fragile | Protocols should define behavior methods, not constructors |
| Covariant container used for mutation | `list[Dog]` is not `list[Animal]` for writes | Use `Sequence[Animal]` (covariant, read-only) for inputs |
| `Optional[X]` in function signatures everywhere | Pushes None-checking burden to every caller | Accept `X` and let caller handle None before calling |
| Using `Any` to silence type errors | Infection spreads, entire call chains become untyped | Use `object` for truly unknown, narrow with isinstance |
| `TypedDict` with optional keys but no `total=False` | All keys required at runtime even if typed Optional | Use `NotRequired[]` (3.11+) or split into Required/Optional dicts |
| Overusing `cast()` instead of narrowing | Runtime bugs hidden from type checker | Prefer isinstance checks, assert, or overloaded functions |

## 3. Memory and Performance

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Circular references with `__del__` | GC cannot collect cycle, permanent memory leak | Avoid `__del__`, use `weakref` or context managers |
| `[x for x in huge_list]` when generator suffices | Doubles memory usage for no reason | Use generator expression `(x for x in ...)` or itertools |
| Pandas `.copy()` everywhere "just in case" | 3x memory usage on large DataFrames | Understand view vs copy rules, copy only when mutating |
| Concatenating DataFrames in a loop | O(n^2) memory allocation, each concat copies all data | Collect in list, single `pd.concat()` at end |
| Assuming GIL means thread-safe for all ops | dict/list ops are atomic but compound operations are not | Use threading.Lock for check-then-act patterns |
| String concatenation in loop (`s += chunk`) | O(n^2) for large strings due to immutable copies | Use `"".join(parts)` or io.StringIO |
| Holding references in exception tracebacks | Locals in frames kept alive by traceback reference | Clear traceback with `e.__traceback__ = None` or limit `sys.tracebacklimit` |
| Large closure captures | Inner function captures entire enclosing scope | Extract only needed values as function parameters |

## 4. FastAPI/Django Production Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Sync ORM call in async FastAPI endpoint | Blocks the async worker, throughput collapses | Use `run_in_executor`, async ORM (encode/databases, SQLAlchemy async), or `sync_to_async` |
| N+1 queries in DRF serializers | 100 items = 101 DB queries, page load takes seconds | Use `select_related`/`prefetch_related`, add query count assertions in tests |
| Middleware ordering in Django | Auth middleware after permission middleware = bypass | Security middleware first, then auth, then app-specific |
| Missing lifespan handler in FastAPI | DB pools, HTTP clients created per-request or never closed | Use `@asynccontextmanager` lifespan for startup/shutdown |
| `Depends()` with mutable state | Shared state across requests without synchronization | Use request-scoped deps or proper locking for shared resources |
| Background tasks holding request objects | Request already sent, response body gone, connection closed | Copy needed data from request before passing to background task |
| Django signals for critical business logic | Signals fail silently, ordering unpredictable, hard to test | Explicit service layer calls instead of signals for important flows |
| Large file upload without streaming | Entire file loaded in memory, OOM on large uploads | Use `UploadFile` with chunked reading, or streaming multipart |
| Not setting `conn_max_age` in Django | New TCP + TLS handshake per request to database | Set `CONN_MAX_AGE` or use pgbouncer |

## 5. Dependency Management

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| No lockfile committed (only pyproject.toml) | Different installs get different versions, works-on-my-machine | Commit `uv.lock`, `poetry.lock`, or `requirements.txt` with pinned versions |
| Dev dependencies installed in production image | Larger image, potential security surface, slower startup | Separate dependency groups: `uv sync --no-dev` or `pip install --only-main` |
| Import side effects in library code | Importing module triggers DB connections, file writes, network calls | Defer heavy init to explicit `setup()` or lazy loading |
| Transitive dependency conflict | Two packages need incompatible versions of same dep | Use `uv` resolution, pin compatible ranges, or isolate in subprocess |
| `pip install` without version pin in CI | Build breaks months later when new version drops | Pin everything: `package==1.2.3` in requirements, use lockfiles |
| Confusing extras with optional deps | `pip install pkg[extra]` installs more than expected | Audit extras in pyproject.toml, document what each extra adds |
| Using deprecated `setup.py` for new projects | Missing metadata, build isolation issues, slower installs | Use `pyproject.toml` with modern build backends (hatchling, setuptools>=68) |

## 6. Testing Pitfalls

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Mocking too deep (internal implementation) | Tests break on refactor even when behavior unchanged | Mock at boundaries (HTTP, DB, filesystem), not internal functions |
| `@pytest.fixture(scope="session")` with mutable state | State leaks between tests, order-dependent failures | Use `scope="function"` for mutable fixtures, or reset state in finalizer |
| `parametrize` with mutable default | All parametrized cases share same mutable object | Use `pytest.param(list(...))` or factory function |
| Async tests without proper event loop fixture | `RuntimeError: no running event loop` or tests hang | Use `pytest-asyncio` with `mode="auto"` or explicit `@pytest.mark.asyncio` |
| Not isolating database state between tests | Test A writes data that makes Test B pass/fail unexpectedly | Use transactions with rollback, or truncate tables in fixtures |
| Testing against real time (`time.sleep` in tests) | Slow, flaky tests that timeout in CI | Use `freezegun`, `time-machine`, or mock the clock |
| Asserting on exact error messages | Tests break on typo fixes or i18n changes | Assert on exception type and key attributes, not message strings |
| Missing `conftest.py` at correct level | Fixtures not discovered, duplicate fixture definitions | One conftest per directory level, use `conftest.py` closest to tests |

## 7. Data Processing

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Pandas chained indexing: `df[cond]["col"] = val` | SettingWithCopyWarning, assignment on copy does nothing | Use `df.loc[cond, "col"] = val` always |
| Ignoring pandas `inplace=True` deprecation path | False sense of mutation, will break in future pandas | Never use `inplace=True`, assign result: `df = df.dropna()` |
| Polars: calling `.collect()` too early in lazy chain | Loses optimization benefits, materializes intermediate frames | Keep lazy as long as possible, single `.collect()` at end |
| Polars: using Python loops over DataFrame rows | 100x slower than native expressions | Use `.map_elements()` only as last resort, prefer expression API |
| NumPy broadcasting with wrong shape | Silent expansion produces wrong results, no error | Verify shapes explicitly: `assert a.shape == (n, 1)` before ops |
| `pd.read_csv` on 10GB file without chunking | OOM kill, swap thrashing | Use `chunksize=` parameter, or switch to Polars/DuckDB for large files |
| Mixing timezone-naive and aware datetimes in pandas | Comparison errors or silent offset bugs | Standardize to UTC at ingestion: `pd.to_datetime(col, utc=True)` |
| Using `.apply()` with Python lambda on large DataFrame | Falls back to row-by-row Python, GIL-bound | Use vectorized ops, `np.where`, or `.map()` for simple transforms |

## 8. AI/ML Production Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Accumulating loss tensors without `.item()` | Entire computation graph kept in memory, OOM after N batches | Use `loss.item()` for logging, `loss.detach()` if storing |
| Not calling `model.eval()` before inference | Dropout and batch norm stay active, non-deterministic outputs | Always `model.eval()` + `torch.no_grad()` for inference |
| Tokenizer max_length mismatch with model | Silent truncation or padding mismatch, degraded accuracy | Set `max_length` equal to model's `max_position_embeddings` |
| Loading full model for each request in serving | Cold start per request, memory bloat from multiple copies | Load once at startup (lifespan), share across requests |
| Batch size too large without gradient accumulation | OOM on single large batch, wasted time restarting | Start small, increase with monitoring, use gradient accumulation for effective large batch |
| Not pinning model/tokenizer versions | Model updates silently change behavior in production | Pin exact revision hash: `from_pretrained("model", revision="abc123")` |
| Preprocessing train/inference mismatch | Model trained on normalized data, served raw data (or vice versa) | Package preprocessing with model artifact, test with real input samples |
| Ignoring CUDA memory fragmentation | OOM despite sufficient total free memory | Use `torch.cuda.empty_cache()`, smaller allocations, or memory pools |
| Streaming LLM responses without timeout | Hung connection holds resources indefinitely | Set per-token timeout, total generation timeout, use async with cancellation |

## 9. Security

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `pickle.load()` on untrusted data | Arbitrary code execution during deserialization | Never unpickle untrusted data. Use JSON, MessagePack, or protobuf |
| `yaml.load()` without `Loader=SafeLoader` | RCE via `!!python/object` tag in YAML | Always: `yaml.safe_load()` or `yaml.load(data, Loader=SafeLoader)` |
| SSRF via user-controlled URL in httpx/requests | Internal network scanning, metadata endpoint access | Validate URL against allowlist, block private IP ranges, use egress proxy |
| Path traversal: `open(base_dir + user_input)` | Read/write arbitrary files: `../../etc/passwd` | Use `pathlib.Path.resolve()` and verify it starts with base_dir |
| Raw SQL with f-string interpolation | SQL injection: `f"SELECT * FROM users WHERE id = {user_id}"` | Use parameterized queries: `cursor.execute("SELECT * WHERE id = %s", (user_id,))` |
| Hardcoded secrets in source code | Credentials exposed in version control | Use environment variables, secret managers (AWS SM, Vault) |
| `eval()`/`exec()` on user input | Full RCE, sandbox escape | Never eval user input. Use AST parsing or restricted expression evaluators |
| JWT without algorithm verification | Algorithm confusion attack (none/HS256 vs RS256) | Specify `algorithms=["RS256"]` explicitly in decode |
| Logging sensitive data (tokens, passwords) | Secrets in log aggregation systems, compliance violation | Scrub sensitive fields in log formatters, use structured logging with field filtering |

## 10. Python 3.12-3.14 New Gotchas

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Free-threaded mode (3.13+): assuming GIL still protects | True parallel threads mean real data races | Use `threading.Lock` for shared mutable state, test with `PYTHON_GIL=0` |
| Free-threaded: C extension not thread-safe | Segfaults or corruption in C code assuming GIL | Check extension compatibility, many C extensions need updates for no-GIL |
| ExceptionGroup not caught by `except Exception` | Unhandled exception group crashes app | Use `except*` syntax or `exceptiongroup` backport for proper handling |
| `except*` catching too broadly | Catches unrelated exceptions bundled in group | Be specific: `except* ValueError as eg:` and re-raise others |
| New type parameter syntax `def f[T](x: T)` mixed with old `TypeVar` | Confusing dual syntax in same codebase, tools may not support both | Pick one style per project, prefer new syntax if 3.12+ only |
| `type` statement creates lazy alias | Alias not evaluated until accessed, hiding errors until runtime | Run type checker in CI, test that aliases resolve correctly |
| `@override` decorator (3.12+) not actually enforced at runtime | Only checked by type checkers, runtime still allows mismatches | Run mypy/pyright in CI with strict mode to catch override errors |
| Deprecation warnings becoming errors in 3.14 | Code that worked with warnings now raises exceptions | Fix all DeprecationWarnings before upgrading, run with `-W error::DeprecationWarning` |
| `asyncio.TaskGroup` replacing `gather` but different semantics | First exception cancels all tasks (unlike gather with return_exceptions) | Design tasks to handle CancelledError gracefully, use structured concurrency patterns |
| Soft keywords (`match`, `case`, `type`) as identifiers | Ambiguous parsing in edge cases, confusing to readers | Avoid using soft keywords as variable/function names even though technically allowed |
