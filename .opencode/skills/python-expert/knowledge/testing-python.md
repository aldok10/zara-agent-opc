---
type: fact
title: "Testing Python"
---
# Testing Python

## pytest Fixtures

### Basic fixture patterns

```python
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def db_session():
    session = create_test_session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def user(db_session):
    user = User(name="test", email="test@example.com")
    db_session.add(user)
    db_session.flush()
    return user
```

### Fixture scopes

```python
@pytest.fixture(scope="session")
def database():
    db = create_database()
    run_migrations(db)
    yield db
    db.drop()

@pytest.fixture(scope="module")
def api_client(database):
    return TestClient(app)

@pytest.fixture  # scope="function" is default
def clean_state(database):
    yield
    database.truncate_all()
```

### Factory fixtures

```python
@pytest.fixture
def make_user(db_session):
    created: list[User] = []

    def _make(name: str = "test", email: str | None = None) -> User:
        user = User(name=name, email=email or f"{name}@test.com")
        db_session.add(user)
        db_session.flush()
        created.append(user)
        return user

    yield _make

    for user in created:
        db_session.delete(user)

def test_multiple_users(make_user):
    alice = make_user("alice")
    bob = make_user("bob")
    assert alice.id != bob.id
```

### Parametrize

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
    ("123", "123"),
])
def test_uppercase(input: str, expected: str):
    assert input.upper() == expected

@pytest.mark.parametrize("status", [400, 401, 403, 404, 500])
def test_error_handling(client, status, httpx_mock):
    httpx_mock.add_response(status_code=status)
    result = client.fetch()
    assert result.is_error
```

## Mocking Patterns

### patch and MagicMock

```python
from unittest.mock import patch, MagicMock

def test_sends_email():
    with patch("myapp.services.email.send") as mock_send:
        register_user("alice@example.com")
        mock_send.assert_called_once_with(
            to="alice@example.com",
            subject="Welcome",
        )

@patch("myapp.clients.http.get")
def test_fetches_data(mock_get):
    mock_get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"id": 1, "name": "test"},
    )
    result = fetch_user(1)
    assert result.name == "test"
```

### monkeypatch (pytest-native)

```python
def test_config_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///test.db")
    monkeypatch.setenv("DEBUG", "true")
    config = load_config()
    assert config.debug is True

def test_broken_clock(monkeypatch):
    import myapp.utils
    monkeypatch.setattr(myapp.utils, "now", lambda: datetime(2024, 1, 1))
    assert is_new_year() is True
```

### Async mocking

```python
from unittest.mock import AsyncMock

@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    repo.get.return_value = User(id=1, name="test")
    repo.list.return_value = [User(id=1, name="test")]
    return repo

async def test_get_user(mock_repo):
    service = UserService(repo=mock_repo)
    user = await service.get_user(1)
    assert user.name == "test"
    mock_repo.get.assert_awaited_once_with(1)
```

## Property-Based Testing (Hypothesis)

```python
from hypothesis import given, strategies as st, assume

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs: list[int]):
    assert sorted(sorted(xs)) == sorted(xs)

@given(st.text(min_size=1), st.text(min_size=1))
def test_concat_length(a: str, b: str):
    assert len(a + b) == len(a) + len(b)

@given(st.dictionaries(st.text(), st.integers()))
def test_serialize_roundtrip(data: dict[str, int]):
    assert json.loads(json.dumps(data)) == data

# Custom strategies
user_strategy = st.builds(
    User,
    name=st.text(min_size=1, max_size=50),
    age=st.integers(min_value=0, max_value=150),
    email=st.emails(),
)

@given(user_strategy)
def test_user_validation(user: User):
    assert validate_user(user) is True
```

## Async Testing

### pytest-asyncio

```python
import pytest

@pytest.mark.asyncio
async def test_async_fetch(client):
    result = await client.get("/users")
    assert result.status_code == 200

@pytest.fixture
async def async_db():
    async with create_async_engine() as engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield engine
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
```

### anyio (backend-agnostic)

```python
import pytest
import anyio

@pytest.fixture(params=["asyncio", "trio"])
def anyio_backend(request):
    return request.param

async def test_concurrent_tasks(anyio_backend):
    results = []
    async with anyio.create_task_group() as tg:
        tg.start_soon(lambda: results.append(1))
        tg.start_soon(lambda: results.append(2))
    assert len(results) == 2
```

## Coverage Strategies

```toml
# pyproject.toml
[tool.coverage.run]
branch = true
source = ["src"]
omit = ["*/tests/*", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "@overload",
]
```

**Branch coverage vs line coverage:**
- Line coverage: "was this line executed?" (necessary but insufficient)
- Branch coverage: "was every branch (if/else) taken?" (catches more bugs)
- Always use branch=true

**What to cover:**
- Business logic: 90%+ coverage
- Data access layer: 80%+ (integration tests)
- API endpoints: 80%+ (request/response validation)
- Utilities: 95%+ (they're reused everywhere)

**What NOT to obsess over:**
- Generated code, migrations, config files
- Third-party library wrappers (test the wrapper behavior, not the library)
- Type-checking-only code blocks

## Integration Testing (testcontainers)

```python
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg.get_connection_url()

@pytest.fixture(scope="session")
def redis():
    with RedisContainer("redis:7") as r:
        yield r.get_connection_url()

def test_user_crud(postgres):
    engine = create_engine(postgres)
    repo = UserRepository(engine)
    user = repo.create(name="test", email="t@t.com")
    assert repo.get(user.id).name == "test"
    repo.delete(user.id)
    assert repo.get(user.id) is None
```

**When to use testcontainers:**
- Database queries (actual SQL, not mocked)
- Cache behavior (TTL, eviction)
- Message queues (pub/sub, ordering)
- Any stateful external dependency

**Tips:**
- Use session-scoped containers (slow to start)
- Truncate tables between tests, don't recreate containers
- Pin container image versions for reproducibility
- Run integration tests separately from unit tests (slower)
