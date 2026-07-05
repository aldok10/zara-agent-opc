# syntax=docker/dockerfile:1

# Production Python distroless build
# Target: <80MB final image, venv as portable artifact

FROM python:3.13-slim AS builder

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-compile --no-deps -r requirements.txt

COPY pyproject.toml ./
COPY src/ src/
RUN pip install --no-compile --no-deps .

FROM cgr.dev/chainguard/python:latest

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY --from=builder /app/src ./src

USER 65532:65532

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"]

ENTRYPOINT ["python", "-m", "app.main"]
