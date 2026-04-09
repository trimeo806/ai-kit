---
name: fastapi-python
description: Use when building Python backend APIs with FastAPI. Invoke for FastAPI route handlers, Pydantic v2 schemas, async HTTP clients with httpx, dependency injection, middleware, OpenAPI documentation, or BFF (Backend-for-Frontend) wrapper layers. Load this skill whenever the task involves FastAPI, Python REST APIs, uvicorn, Pydantic, or Python async backend services — even if the user just says "implement the API" in a Python project.
license: MIT
metadata:
  keywords: [fastapi, python, pydantic, uvicorn, httpx, async, BFF, REST, backend, middleware]
  platforms: [backend]
  agent-affinity: [backend-developer, backend-architect]
  connections:
    enhances: [api-designer, error-recovery]
    requires: []
    conflicts: []
---

# FastAPI Python

Senior FastAPI developer with expertise in Python 3.12+, Pydantic v2, async HTTP clients, and production-grade BFF (Backend-for-Frontend) architectures. Specializes in clean API layer design, data transformation, resilience patterns, and auto-generated OpenAPI documentation.

## Core Workflow

1. **Design schemas first** — Define Pydantic v2 request/response models before any route logic; they become your OpenAPI docs automatically
2. **Layer the architecture** — Routers → Services → Clients; never call upstream from a router directly
3. **Implement** — Async handlers, proper status codes, response models on every route
4. **Add resilience** — Timeouts, retry with tenacity, error normalization middleware
5. **Cache strategically** — Airport/static data cached aggressively; pricing/booking never cached
6. **Test** — pytest-asyncio with httpx AsyncClient, mock upstream with respx

## Reference Guide

Load when the task touches these areas:

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Project structure | `references/project-structure.md` | Setting up new FastAPI project, file layout questions |
| Resilience | `references/resilience.md` | Upstream timeouts, retry logic, circuit breaker, 503/429 handling |
| Caching | `references/caching.md` | Deciding what to cache, TTL strategy, async-safe cache |
| Data transformation | `references/data-transform.md` | Flattening nested upstream responses, date normalization, code-to-label mapping |
| Testing | `references/testing.md` | pytest setup, async tests, mocking upstream with respx |

## Key Patterns (Inline)

### Project skeleton
```
app/
├── main.py               # FastAPI app, lifespan, middleware registration
├── config.py             # Settings via pydantic-settings
├── dependencies.py       # Shared DI: get_http_client, get_cache
├── routers/              # One file per domain (flights, bookings, airports)
├── services/             # Business logic + transformation
├── schemas/              # Pydantic v2 request/response models
├── clients/              # Upstream HTTP client wrappers
└── middleware/           # Error normalizer, logging, CORS
```

### Pydantic v2 schema (BFF response — flat and labelled)
```python
from pydantic import BaseModel, Field
from datetime import datetime

class FlightOffer(BaseModel):
    offer_id: str
    price_total: float
    currency: str
    airline_name: str          # "Malaysia Airlines", not "MH"
    cabin_class: str           # "Economy", not "Y"
    departure_at: datetime     # always ISO 8601, never mixed formats
    arrival_at: datetime
    duration_minutes: int
    stops: int

class FlightSearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: list[FlightOffer]
```

### Async router + service separation
```python
# routers/flights.py
@router.get("/flights/search", response_model=FlightSearchResponse)
async def search_flights(
    params: FlightSearchParams = Depends(),
    service: FlightService = Depends(get_flight_service),
) -> FlightSearchResponse:
    return await service.search(params)

# services/flights.py
class FlightService:
    def __init__(self, client: UpstreamClient):
        self._client = client

    async def search(self, params: FlightSearchParams) -> FlightSearchResponse:
        raw = await self._client.search_flights(params)
        return transform_search_response(raw)  # pure function, easy to test
```

### Unified error response (single shape for all errors)
```python
class ErrorResponse(BaseModel):
    code: str           # machine-readable: "UPSTREAM_UNAVAILABLE"
    message: str        # human-readable
    detail: str | None  # optional extra context
    request_id: str     # correlation ID for tracing
```

## Constraints

- Pydantic v2 syntax: use `model_validator`, `field_validator`, not v1 `@validator`
- Every route must declare `response_model` — this generates OpenAPI schemas automatically
- Use `async def` for all I/O-bound handlers; use `def` only for CPU-bound pure functions
- Pass `httpx.AsyncClient` via dependency injection, not as a module-level global, so it can be mocked in tests
- Never leak upstream response shapes to API consumers — always transform through schemas
- Log with structured JSON (correlation IDs); never print to stdout in production code
- Use `pydantic-settings` for config; never hardcode URLs or secrets

## Output Format

When implementing FastAPI features, provide:
1. Schema definitions (`schemas/`) first
2. Service layer with transformation logic (`services/`)
3. Router with DI wiring (`routers/`)
4. At least one pytest test using httpx AsyncClient

## Knowledge Reference

FastAPI 0.111+, Python 3.12+, Pydantic v2, uvicorn, httpx AsyncClient, tenacity retry, pydantic-settings, pytest-asyncio, respx (mock), CORS middleware, Starlette exception handlers, OpenAPI tags/metadata, background tasks, lifespan context manager, dependency_overrides for testing
