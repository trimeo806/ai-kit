# FastAPI Caching Patterns

## What to Cache (Decision Matrix)

| Data | Cache? | TTL | Reason |
|------|--------|-----|--------|
| Airport list | Yes | 1 hour+ | Static reference data — changes rarely |
| Single airport details | Yes | 1 hour+ | Same — enriches codes with city/country |
| Airline/aircraft code labels | Yes | 24 hours | Static lookup table |
| Flight search results | No | — | Live pricing; stale data = wrong price |
| Offer details | No | — | Availability changes in real-time |
| Booking retrieval | Yes | 5 min | Immutable after creation; reduce load |
| Booking creation | Never | — | Write operation — must hit upstream |

## In-Memory Cache (no Redis, single-process)

Best for: airport metadata, code lookup tables, single-server deployments.

```python
import asyncio
import time
from typing import Any, Callable, TypeVar
from functools import wraps

T = TypeVar("T")

_cache: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)


def cached(ttl_seconds: int, key_fn: Callable[..., str] | None = None):
    """
    Async function decorator. Caches the return value for `ttl_seconds`.
    key_fn generates the cache key from the function's arguments.
    """
    def decorator(func: Callable[..., Any]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = key_fn(*args, **kwargs) if key_fn else f"{func.__qualname__}:{args}:{kwargs}"
            now = time.monotonic()

            if cache_key in _cache:
                value, expires_at = _cache[cache_key]
                if now < expires_at:
                    return value

            result = await func(*args, **kwargs)
            _cache[cache_key] = (result, now + ttl_seconds)
            return result

        def invalidate(*args, **kwargs):
            cache_key = key_fn(*args, **kwargs) if key_fn else f"{func.__qualname__}:{args}:{kwargs}"
            _cache.pop(cache_key, None)

        wrapper.invalidate = invalidate  # type: ignore[attr-defined]
        return wrapper
    return decorator
```

### Usage in service

```python
class AirportService:
    def __init__(self, client: UpstreamClient):
        self._client = client

    @cached(ttl_seconds=3600, key_fn=lambda self: "airports:all")
    async def list_airports(self) -> list[AirportResponse]:
        raw = await self._client.get_airports()
        return [transform_airport(a) for a in raw]

    @cached(ttl_seconds=3600, key_fn=lambda self, code: f"airports:{code.upper()}")
    async def get_airport(self, code: str) -> AirportResponse:
        raw = await self._client.get_airport(code)
        return transform_airport_detail(raw)
```

## TTL-Aware Cache with Stale Flag

Useful for booking retrieval — return stale data when upstream is unavailable.

```python
from dataclasses import dataclass

@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    created_at: float


class StaleWhileRevalidateCache:
    """
    Returns stale data with a `stale: true` marker rather than raising
    when upstream is unavailable after TTL expiry.
    """
    def __init__(self):
        self._store: dict[str, CacheEntry] = {}

    def get(self, key: str) -> tuple[Any | None, bool]:
        """Returns (value, is_stale). None if not in cache at all."""
        entry = self._store.get(key)
        if entry is None:
            return None, False
        is_stale = time.monotonic() > entry.expires_at
        return entry.value, is_stale

    def set(self, key: str, value: Any, ttl: float) -> None:
        now = time.monotonic()
        self._store[key] = CacheEntry(value=value, expires_at=now + ttl, created_at=now)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)
```

### Booking retrieval with stale-while-revalidate

```python
class BookingService:
    def __init__(self, client: UpstreamClient, cache: StaleWhileRevalidateCache):
        self._client = client
        self._cache = cache

    async def get_booking(self, ref: str) -> BookingResponse:
        cache_key = f"booking:{ref}"
        cached_value, is_stale = self._cache.get(cache_key)

        if cached_value and not is_stale:
            return cached_value  # fresh hit

        try:
            raw = await self._client.get_booking(ref)
            result = transform_booking(raw)
            self._cache.set(cache_key, result, ttl=300)
            return result
        except UpstreamUnavailableError:
            if cached_value:
                # Return stale data with warning header (set via response)
                cached_value.cache_status = "stale"
                return cached_value
            raise
```

## Cache Headers on HTTP Responses

Help downstream clients (browser, mobile) cache static responses:

```python
from fastapi import Response

@router.get("/airports", response_model=list[AirportResponse])
async def list_airports(
    response: Response,
    service: AirportService = Depends(get_airport_service),
):
    airports = await service.list_airports()
    # Tell clients they can cache this for 5 minutes
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=60"
    return airports


@router.get("/flights/search", response_model=FlightSearchResponse)
async def search_flights(..., response: Response):
    results = await service.search(params)
    # Live pricing — never cache
    response.headers["Cache-Control"] = "no-store"
    return results
```

## Cache Invalidation

Keep it simple — invalidate by key, not by tags or patterns:

```python
# Explicit invalidation when data is known to change
await airport_service.list_airports.invalidate()     # bust airports cache
booking_cache.invalidate(f"booking:{ref}")           # bust specific booking
```

Avoid premature cache invalidation complexity. Airport data doesn't change in production; just let TTL expire.
