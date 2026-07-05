---
type: subskill
title: "Django"
---

# Django

Batteries-included: ORM, admin, auth, migrations, forms. Best for full-stack web apps.

## Django vs FastAPI

- Django: admin-heavy, content/CMS, built-in auth, server-rendered, rapid CRUD.
- FastAPI: pure APIs, async-first, microservices, minimal footprint.

## Structure

Apps as bounded contexts, not layers: `users/`, `orders/`, `payments/`  --  each with own models, views, serializers.

## Models

- Explicit fields; `db_index=True` on columns you filter/order by.
- Avoid `null=True` on `CharField`/`TextField`  --  use `default=""` (two empty states is a bug).
- `related_name` on FKs for reverse queries; `on_delete` always explicit.

```python
class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, db_index=True, default="pending")
    created = models.DateTimeField(auto_now_add=True)
```

## Migrations

- Never edit auto-generated migrations by hand; make a new one.
- Squash periodically to speed up test setup.
- Keep backward-compatible for zero-downtime deploys (add column nullable, backfill, then enforce).

## DRF

- Serializers for validation/shape, ViewSets for CRUD, routers for URLs.
- Permissions, throttling, pagination configured globally in settings, overridden per-view.

## Async (Django 5.0+)

- Async views and async ORM (`await Model.objects.aget(...)`, `async for`).
- Convert hot I/O paths gradually; don't mix sync ORM calls inside async views (raises `SynchronousOnlyOperation`).

## QuerySet optimization

- `select_related("user")` for FK (SQL join); `prefetch_related("items")` for M2M/reverse FK.
- `only()`/`defer()` to limit columns; `.iterator()` for large scans.
- Watch N+1: one query in a loop = wrong. Use `django-debug-toolbar` / `nplusone`.

## Testing

- `pytest-django`, `factory_boy` for model factories, `@override_settings` for config swaps.
- `--reuse-db` to skip recreating schema each run.

## Admin

- `list_display`, `search_fields`, `list_filter`, custom `actions`, `inlines` for related models.

## Deployment

- `gunicorn` with `uvicorn` workers (ASGI), `whitenoise` for static, Redis cache, Celery for background jobs.

## Anti-patterns

- Fat views (business logic in views)  --  push to services/model methods.
- N+1 queries from missing `select_related`/`prefetch_related`.
- Raw SQL where ORM suffices; missing indexes on filtered fields.
