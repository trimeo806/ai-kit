# FastAPI Project Structure

## Recommended Layout (BFF / API Wrapper)

```
project-root/
├── app/
│   ├── __init__.py
│   ├── main.py               # app factory, lifespan, middleware, router mounting
│   ├── config.py             # pydantic-settings configuration
│   ├── dependencies.py       # shared DI providers
│   │
│   ├── routers/              # HTTP layer only — no business logic
│   │   ├── __init__.py
│   │   ├── flights.py
│   │   ├── bookings.py
│   │   └── airports.py
│   │
│   ├── services/             # Business logic, orchestration, transformation
│   │   ├── __init__.py
│   │   ├── flight_service.py
│   │   ├── booking_service.py
│   │   └── airport_service.py
│   │
│   ├── schemas/              # Pydantic v2 models — public API contracts
│   │   ├── __init__.py
│   │   ├── flights.py        # FlightSearchRequest, FlightOffer, etc.
│   │   ├── bookings.py
│   │   └── common.py         # PaginatedResponse, ErrorResponse, etc.
│   │
│   ├── clients/              # Upstream API clients (raw HTTP, no transformation)
│   │   ├── __init__.py
│   │   └── upstream.py       # UpstreamClient wrapping legacy API
│   │
│   └── middleware/
│       ├── __init__.py
│       ├── error_handler.py  # Unify all error shapes into ErrorResponse
│       └── logging.py        # Structured request/response logging
│
├── tests/
│   ├── conftest.py           # fixtures: app, async_client, mock_upstream
│   ├── test_flights.py
│   ├── test_bookings.py
│   └── test_airports.py
│
├── pyproject.toml
├── requirements.txt (or poetry.lock)
└── README.md
```

## Layer Responsibilities

| Layer | Responsibility | What it must NOT do |
|-------|----------------|---------------------|
| Router | Parse HTTP request, call service, return response | Business logic, upstream calls |
| Service | Orchestrate client calls, transform data, apply business rules | Direct HTTP calls, know about HTTP |
| Client | Call upstream API, return raw response | Transform data, raise business errors |
| Schema | Define data shapes, validate input, serialize output | Contain logic |
| Middleware | Cross-cutting concerns (errors, logging, auth) | Domain logic |

## main.py Pattern

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.config import settings
from app.routers import flights, bookings, airports
from app.middleware.error_handler import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create shared resources
    app.state.http_client = httpx.AsyncClient(
        base_url=settings.upstream_base_url,
        timeout=httpx.Timeout(10.0),
    )
    yield
    # Shutdown: clean up
    await app.state.http_client.aclose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Flight Booking API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(flights.router, prefix="/v1", tags=["Flights"])
    app.include_router(bookings.router, prefix="/v1", tags=["Bookings"])
    app.include_router(airports.router, prefix="/v1", tags=["Airports"])

    return app


app = create_app()
```

## config.py with pydantic-settings

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    upstream_base_url: str = "https://mock-travel-api.vercel.app"
    upstream_timeout_seconds: float = 10.0
    upstream_max_retries: int = 3

    cache_ttl_airports_seconds: int = 3600   # 1 hour — static data
    cache_ttl_booking_seconds: int = 300     # 5 min — semi-fresh
    cache_ttl_search_seconds: int = 0        # never cache — live pricing

    cors_origins: list[str] = ["*"]
    log_level: str = "INFO"


settings = Settings()
```

## dependencies.py

```python
from fastapi import Request
import httpx

from app.clients.upstream import UpstreamClient
from app.services.flight_service import FlightService
from app.services.booking_service import BookingService
from app.services.airport_service import AirportService


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


def get_upstream_client(client: httpx.AsyncClient = Depends(get_http_client)) -> UpstreamClient:
    return UpstreamClient(client)


def get_flight_service(upstream: UpstreamClient = Depends(get_upstream_client)) -> FlightService:
    return FlightService(upstream)


def get_booking_service(upstream: UpstreamClient = Depends(get_upstream_client)) -> BookingService:
    return BookingService(upstream)


def get_airport_service(upstream: UpstreamClient = Depends(get_upstream_client)) -> AirportService:
    return AirportService(upstream)
```
