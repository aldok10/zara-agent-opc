# FastAPI

Async-first, Pydantic v2, automatic OpenAPI, dependency injection. Production-grade Python APIs.

## Project Structure

```
app/main.py         # app factory, lifespan, middleware
app/core/config.py  # BaseSettings
app/routers/        # thin handlers by domain
app/models/         # Pydantic schemas + ORM models
app/services/       # business logic (routers call these)
app/dependencies/   # Depends() providers (db, auth, config)
```

## Schemas: Separate Concerns

Never reuse one model everywhere. Split request/response/DB.

```python
class UserCreate(BaseModel):        # request: what client sends
    email: EmailStr; password: str
class UserResponse(BaseModel):      # response: what client sees
    id: int; email: EmailStr
    model_config = ConfigDict(from_attributes=True)
# DB model (SQLAlchemy) stays internal — never returned directly.
```

## Dependency Injection

```python
async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session

@router.get("/users/{uid}", response_model=UserResponse)
async def read_user(uid: int, db: AsyncSession = Depends(get_db)):
    return await user_service.get(db, uid)
```

Composable and overridable in tests. Use for db sessions, auth, config, pagination.

## Lifespan (startup/shutdown)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()   # startup
    yield
    await app.state.pool.close()           # shutdown
app = FastAPI(lifespan=lifespan)
```## Error Handling & Settings

Raise `HTTPException(status_code=404, detail="User not found")`; register custom handlers for domain exceptions. Never leak stack traces — log them, return generic 500. Config via `BaseSettings` (env_file=".env"), validated at startup — fail fast on missing values.

## Background, Security, Testing

- Background: `BackgroundTasks` for fire-and-forget (emails); Celery/ARQ for reliable, retryable jobs.
- Security: OAuth2 + JWT via `Depends`, `slowapi` rate limiting, explicit CORS origins (never `*` with credentials).
- Testing: `httpx.AsyncClient(transport=ASGITransport(app=app))` + `pytest-asyncio`; override DI via `app.dependency_overrides[get_db] = fake_db`.

## Anti-Patterns

- Sync DB driver (psycopg2) in async endpoints — blocks the loop
- Missing response_model / no validation
- Fat routers with business logic (belongs in services/)
- Bypassing DI (global db, manual config reads)
- Returning ORM models directly (leaks internal fields)
