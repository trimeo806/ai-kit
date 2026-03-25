# Resilience Patterns — Copy-Paste Templates

For implementation details and explanation, see `fastapi-python/references/resilience.md`.
These are the wire-up templates for `main.py` and middleware.

## requirements.txt (core deps)

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
httpx>=0.27.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
tenacity>=8.3.0
```

## pyproject.toml (dev deps)

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "respx>=0.21.0",
    "pytest-cov>=5.0.0",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

## app/middleware/error_handler.py (complete file)

```python
import uuid
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import httpx
from starlette.middleware.base import BaseHTTPMiddleware


# --- Error classes ---

class UpstreamError(Exception):
    status_code: int = status.HTTP_502_BAD_GATEWAY
    code: str = "UPSTREAM_ERROR"

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class UpstreamUnavailableError(UpstreamError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "UPSTREAM_UNAVAILABLE"


class UpstreamRateLimitError(UpstreamError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "UPSTREAM_RATE_LIMITED"


class UpstreamNotFoundError(UpstreamError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"


# --- Request ID middleware ---

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# --- Registration ---

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UpstreamError)
    async def upstream_error_handler(request: Request, exc: UpstreamError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "detail": exc.detail,
                "request_id": getattr(request.state, "request_id", ""),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "detail": str(exc.errors()),
                "request_id": getattr(request.state, "request_id", ""),
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "detail": None,
                "request_id": getattr(request.state, "request_id", ""),
            },
        )
```

## app/clients/retry.py (tenacity wrapper)

```python
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception
from app.middleware.error_handler import UpstreamError, UpstreamUnavailableError, UpstreamRateLimitError


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return False


@retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=0.5, max=4.0, jitter=0.25),
    reraise=True,
)
async def resilient_request(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> httpx.Response:
    """Make an HTTP request with automatic retry on transient failures."""
    response = await client.request(method, url, **kwargs)

    # Handle 429 with Retry-After header before raising
    if response.status_code == 429:
        retry_after = float(response.headers.get("Retry-After", "1.0"))
        await asyncio.sleep(min(retry_after, 3.0))
        response.raise_for_status()

    response.raise_for_status()
    return response
```

## main.py (wire everything together)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.config import settings
from app.routers import flights, bookings, airports
from app.middleware.error_handler import RequestIdMiddleware, register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        base_url=settings.upstream_base_url,
        timeout=httpx.Timeout(connect=3.0, read=8.0, write=5.0, pool=1.0),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    )
    yield
    await app.state.http_client.aclose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Flight Booking API",
        description="BFF wrapper for the legacy flight data system",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    register_exception_handlers(app)

    app.include_router(flights.router, prefix="/v1", tags=["Flights"])
    app.include_router(bookings.router, prefix="/v1", tags=["Bookings"])
    app.include_router(airports.router, prefix="/v1", tags=["Airports"])

    return app


app = create_app()
```

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Docs at http://localhost:8000/docs
```
