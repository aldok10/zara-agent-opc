---
type: fact
title: "Python Web Frameworks"
---
# Python Web Frameworks

## FastAPI

Dependency Injection:
```python
from fastapi import Depends, FastAPI

async def get_db():
    db = AsyncSession()
    try:
        yield db
    finally:
        await db.close()

@app.get("/items")
async def list_items(db: AsyncSession = Depends(get_db)):
    return await db.execute(select(Item))
```

- Dependencies can depend on other dependencies (tree resolution)
- `Depends()` supports classes, functions, generators
- Scoped dependencies via `request.state`

Middleware:
```python
from starlette.middleware.base import BaseHTTPMiddleware

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.perf_counter() - start)
    return response
```

Background Tasks:
```python
from fastapi import BackgroundTasks

@app.post("/send")
async def send(bg: BackgroundTasks):
    bg.add_task(send_email, to="user@example.com")
    return {"status": "queued"}
```

Lifespan (startup/shutdown):
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await create_pool()
    app.state.pool = pool
    yield
    await pool.close()

app = FastAPI(lifespan=lifespan)
```

## Django 5.x

Async views:
```python
from django.http import JsonResponse
from asgiref.sync import sync_to_async

async def my_view(request):
    data = await sync_to_async(MyModel.objects.filter)(active=True)
    return JsonResponse({"items": list(data.values())})
```

- Native async ORM methods: `Model.objects.aget()`, `.afilter()`, `.acreate()`
- Async middleware with `async def __call__`
- ASGI deployment with uvicorn/daphne

Generated Fields (5.0+):
```python
from django.db.models import GeneratedField, F, Value
from django.db.models.functions import Concat

class Profile(models.Model):
    first = models.CharField(max_length=50)
    last = models.CharField(max_length=50)
    full_name = GeneratedField(
        expression=Concat(F("first"), Value(" "), F("last")),
        output_field=models.CharField(max_length=101),
        db_persist=True,
    )
```

Faceted Filters (5.1+):
- `QuerySet.facet()` for aggregated filter counts
- Works with django-filter for declarative filtering

## Starlette / ASGI

Middleware patterns:
```python
class CustomMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # pre-processing
            await self.app(scope, receive, send)
```

Streaming responses:
```python
from starlette.responses import StreamingResponse

async def generate():
    for chunk in data_source:
        yield f"data: {chunk}\n\n"

return StreamingResponse(generate(), media_type="text/event-stream")
```

- WebSocket support with `WebSocket` class
- `TestClient` for sync testing, `httpx.AsyncClient` for async

## SQLAlchemy 2.0

Modern session patterns:
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine("postgresql+asyncpg://...")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async with SessionLocal() as session:
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
```

Key changes in 2.0:
- `select()` replaces `session.query()`
- Type-annotated models with `Mapped[T]` and `mapped_column()`
- `relationship()` uses `Mapped[list[Child]]`
- `Session.get()` for primary key lookups
- Async engine requires async driver (asyncpg, aiosqlite)

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    posts: Mapped[list["Post"]] = relationship(back_populates="author")
```

## Alembic Migrations

Auto-generation:
```bash
alembic revision --autogenerate -m "add users table"
alembic upgrade head
```

Multi-database:
- Configure multiple `engine` instances in `env.py`
- Use `--name` flag for targeting specific databases
- Branch management for parallel migrations

Patterns:
- Data migrations: use `op.execute()` for SQL, avoid ORM models
- Batch operations for SQLite: `with op.batch_alter_table("users")`
- Stamp without running: `alembic stamp head`
- Downgrade testing in CI: upgrade then downgrade to verify reversibility
- `run_migrations_online()` customization for async engines
