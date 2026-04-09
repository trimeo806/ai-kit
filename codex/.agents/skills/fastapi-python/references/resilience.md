# FastAPI Resilience Patterns

Patterns for handling upstream instability: timeouts, retries, rate limits (429), and 503s.
Relevant when upstream uses `?simulate_issues=true` or in any production-grade BFF.

## httpx Client Setup with Timeouts

```python
import httpx

# Granular timeout: connect, read, write, pool
timeout = httpx.Timeout(
    connect=3.0,   # time to establish connection
    read=8.0,      # time waiting for response body
    write=5.0,     # time to send request body
    pool=1.0,      # time waiting for connection from pool
)

client = httpx.AsyncClient(
    base_url=settings.upstream_base_url,
    timeout=timeout,
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)
```

## Retry with Tenacity

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception,
    RetryError,
)
import httpx


def is_retryable(exc: BaseException) -> bool:
    """Retry on transient network errors and 5xx/429 upstream responses."""
    if isinstance(exc, httpx.TimeoutException):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    if isinstance(exc, httpx.ConnectError):
        return True
    return False


@retry(
    retry=retry_if_exception(is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=0.5, max=5.0, jitter=0.3),
    reraise=True,
)
async def call_with_retry(client: httpx.AsyncClient, method: str, url: str, **kwargs):
    response = await client.request(method, url, **kwargs)
    response.raise_for_status()
    return response
```

## Rate Limit Handling (429 with Retry-After)

```python
async def handle_rate_limit(response: httpx.Response) -> None:
    """Respect upstream Retry-After header before raising."""
    if response.status_code == 429:
        retry_after = float(response.headers.get("Retry-After", "1.0"))
        await asyncio.sleep(min(retry_after, 5.0))  # cap at 5s
        raise httpx.HTTPStatusError(
            message="Rate limited", request=response.request, response=response
        )
```

## Simple Circuit Breaker (in-memory, single-instance)

```python
import time
from dataclasses import dataclass, field
from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    _failures: int = field(default=0, init=False, repr=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False, repr=False)
    _opened_at: float = field(default=0.0, init=False, repr=False)

    def is_open(self) -> bool:
        if self._state == CircuitState.OPEN:
            if time.monotonic() - self._opened_at >= self.recovery_timeout:
                self._state = CircuitState.HALF_OPEN
                return False
            return True
        return False

    def record_success(self) -> None:
        self._failures = 0
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()


# Singleton per upstream endpoint — wire via app.state or DI
upstream_circuit = CircuitBreaker(failure_threshold=5, recovery_timeout=30.0)
```

## Upstream Client with Full Resilience

```python
class UpstreamClient:
    def __init__(self, client: httpx.AsyncClient, circuit: CircuitBreaker):
        self._client = client
        self._circuit = circuit

    async def _request(self, method: str, url: str, **kwargs) -> dict:
        if self._circuit.is_open():
            raise UpstreamUnavailableError("Upstream circuit is open — service degraded")
        try:
            response = await call_with_retry(self._client, method, url, **kwargs)
            self._circuit.record_success()
            return response.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as exc:
            self._circuit.record_failure()
            raise UpstreamError.from_httpx(exc) from exc
```

## Unified Upstream Error Classes

```python
from fastapi import status


class UpstreamError(Exception):
    """Base class for all upstream failures."""
    status_code: int = status.HTTP_502_BAD_GATEWAY
    code: str = "UPSTREAM_ERROR"

    def __init__(self, message: str, detail: str | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)

    @classmethod
    def from_httpx(cls, exc: httpx.HTTPStatusError) -> "UpstreamError":
        sc = exc.response.status_code
        if sc == 429:
            return UpstreamRateLimitError("Upstream rate limit exceeded")
        if sc in {503, 504}:
            return UpstreamUnavailableError("Upstream service unavailable")
        if sc == 404:
            return UpstreamNotFoundError("Resource not found upstream")
        return cls(f"Upstream returned {sc}", detail=exc.response.text[:200])


class UpstreamUnavailableError(UpstreamError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "UPSTREAM_UNAVAILABLE"


class UpstreamRateLimitError(UpstreamError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "UPSTREAM_RATE_LIMITED"


class UpstreamNotFoundError(UpstreamError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
```

## Error Handler Middleware (normalize all errors to one shape)

```python
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UpstreamError)
    async def upstream_error_handler(request: Request, exc: UpstreamError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "detail": exc.detail,
                "request_id": request.state.request_id,
            },
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        # Log the full traceback here (structured logging)
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "detail": None,
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )
```

## Request ID Middleware (for correlation/tracing)

```python
import uuid
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```
