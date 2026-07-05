# Testing

pytest always. Never `unittest.TestCase`  --  no fixtures, verbose asserts, class boilerplate.

## Structure

- `tests/` mirrors `src/` layout (`src/app/service.py` -> `tests/app/test_service.py`).
- `conftest.py` holds shared fixtures; nest per-package for scoped fixtures.
- Name tests `test_<unit>_<condition>_<expected>` so failures read as sentences.

## Fixtures

- `scope="session"` for expensive setup (DB engine, containers); `function` (default) for isolation.
- `autouse=True` sparingly  --  only for env/log setup that every test truly needs.
- Yield fixtures for setup/teardown; factory fixtures (return a function) for parametric data.

```python
@pytest.fixture(scope="session")
def engine():
    eng = create_engine(DB_URL)
    yield eng
    eng.dispose()
```

## Async

- `pytest-asyncio` with `asyncio_mode = "auto"` in config  --  no `@pytest.mark.asyncio` per test.
- Async fixtures work the same; keep the event loop policy default unless you have a reason.

## Mocking

- Mock at boundaries: external APIs, DB, filesystem, clock. Never mock internal functions.
- `pytest-mock` (`mocker` fixture) over raw `unittest.mock`  --  auto-teardown, cleaner.
- Patch where the name is *used*, not where defined: `mocker.patch("app.service.httpx_get")`.

## Table-driven & property-based

```python
@pytest.mark.parametrize("value,expected", [(0, "zero"), (1, "one"), (-1, "neg")])
def test_classify(value, expected):
    assert classify(value) == expected
```

- Hypothesis for invariants: generates random inputs, shrinks failures to minimal case.

```python
@given(st.lists(st.integers()))
def test_sort_idempotent(xs):
    assert sorted(sorted(xs)) == sorted(xs)
```

## Coverage & quality

- `pytest-cov`, target >80%, enable branch coverage (`--cov-branch`).
- `syrupy` for snapshot testing complex outputs (JSON, rendered templates).
- `testcontainers` for integration against real Postgres/Redis via Docker  --  no in-memory fakes.
- `mutmut` mutation testing verifies tests actually catch bugs, not just execute lines.

## CI

```bash
pytest --cov --cov-branch --cov-fail-under=80 -x --tb=short
```

## Anti-patterns

- Mocking everything  --  tests pass but code is broken.
- No async support / manual event loop juggling.
- Testing implementation details instead of behavior.
- Slow suite (no session scope, real network calls)  --  devs stop running it.
