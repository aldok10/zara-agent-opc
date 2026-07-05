# structlog Patterns

Processor chain, contextvars binding, stdlib integration, JSON output, FastAPI integration.

## Basic Setup

```python
import logging
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
```

## Context Binding with contextvars

```python
import structlog

# Bind context for entire request lifecycle
structlog.contextvars.bind_contextvars(
    request_id="req_abc123",
    user_id=42,
    service="order-service",
)

# All log calls automatically include bound vars
logger.info("order_created", order_id=1)
# {"event": "order_created", "order_id": 1, "request_id": "req_abc123", ...}

# Clean up at end of request
structlog.contextvars.clear_contextvars()
```

## FastAPI Middleware Integration

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog
import uuid
import time

class StructlogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        structlog.contextvars.clear_contextvars()
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))

        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000)

        structlog.get_logger().info(
            "request_completed",
            status=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["x-request-id"] = request_id
        return response
```

## stdlib Integration

```python
import logging
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.format_exc_info,
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)

formatter = structlog.stdlib.ProcessorFormatter(
    processor=structlog.processors.JSONRenderer(),
)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
root_logger = logging.getLogger()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)
```

Captures logs from SQLAlchemy, uvicorn, httpx through the same pipeline.

## Custom Processors

```python
def add_service_info(logger, method_name, event_dict):
    event_dict["service"] = "order-service"
    event_dict["environment"] = settings.environment
    return event_dict

def mask_sensitive_fields(logger, method_name, event_dict):
    sensitive = {"password", "token", "secret", "card_number"}
    for key in sensitive:
        if key in event_dict:
            event_dict[key] = "***"
    return event_dict
```

## Rules

1. `structlog.get_logger()` at module level -- one per module
2. `contextvars` for request-scoped context (request_id, user_id)
3. Clear contextvars at request start to prevent leaks
4. JSON in production, console (colored) in development
5. stdlib integration to capture third-party logs
6. Custom processors for masking, enrichment, filtering
7. Event names as snake_case: `order_created`, `payment_failed`
8. `exc_info=True` on errors for structured tracebacks
