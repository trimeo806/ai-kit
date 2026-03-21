# Python BFF Stack — Quick Reference

**Status**: ACTIONABLE | Date: 2026-03-18

## Recommended Stack

```
FastAPI 0.104+          # Async web framework
Pydantic 2.x            # Input/output validation + transformation
httpx 0.25+             # Async HTTP client
Tenacity 8.x            # Retry logic (exponential backoff + jitter)
cachetools 5.x          # In-memory TTL cache (airline codes, airports)
pytest 7.4+             # Testing
pytest-httpx 0.30+      # Mock httpx requests
```

**Defer**: Redis (add when scaling to multi-instance), PyBreaker (add after observing 503 patterns).

---

## 11 Technologies — Decision Summary

| # | Technology | Pick | Why | Trade-off |
|---|-----------|------|-----|-----------|
| 1 | **FastAPI vs Django** | **FastAPI** | Async-first, auto-docs, Pydantic native, lightweight | No ORM/admin (not needed) |
| 2 | **BFF Pattern** | **Apply it** | Legacy API has 4 error formats, nested responses, cryptic codes → BFF normalizes | More complex than simple gateway |
| 3 | **Validation** | **Pydantic v2** | Type hints → OpenAPI schema → Swagger docs; recursive coercion for nested responses | 2-3x slower than dataclasses (negligible for BFF) |
| 4 | **Caching** | **cachetools TTLCache** | Airline codes, airports don't change often; cache 1 hour. Don't cache prices. | Single instance only; Redis for scaling |
| 5 | **Resilience** | **Tenacity (retry) + PyBreaker (circuit)** | Retry on 503/429 with exponential backoff; circuit breaker prevents cascading. Retry INSIDE breaker. | Manual exception handling per retry |
| 6 | **HTTP Client** | **httpx** | Async/sync both; HTTP/2; works seamlessly with FastAPI | aiohttp faster (2x) but minimal difference |
| 7 | **Error Handling** | **Custom exception hierarchy** | 4 upstream formats → 1 adapter layer → unified client response | Requires 2-3 hour design/coding |
| 8 | **Code Enrichment** | **Static JSON files + TTL cache** | Airline/aircraft codes rarely change; keep static data in repo. Load at startup, cache in memory. Fallback to code if missing. | Update cycle 6-12 months; requires manual sync |
| 9 | **Pagination** | **Cursor-based** | Flight results large; cursor scales; infinite scroll natural fit | No total count; less intuitive for page numbers |
| 10 | **API Docs** | **FastAPI OpenAPI auto-generation** | Type hints → Swagger UI/ReDoc/Scalar. No manual docs. | Limited customization vs manual OpenAPI specs |
| 11 | **Testing** | **pytest + pytest-httpx** | Simpler than unittest; parametrization; better async support; fixtures powerful | Smaller ecosystem than unittest |

---

## Code Example: End-to-End Flow

```python
# 1. Request comes in (async, non-blocking)
@app.get("/search", response_model=FlightSearchResponse)
async def search_flights(origin: str, destination: str, cursor: Optional[str] = None):

    # 2. Call upstream API with retry + circuit breaker
    @retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(max=10))
    async def fetch_upstream():
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LEGACY_API_URL}/search?from={origin}&to={destination}")
            resp.raise_for_status()
            return resp.json()

    # 3. Error handling (normalize 4 formats into 1)
    try:
        raw_data = await breaker(fetch_upstream)()  # Circuit breaker wraps retry
    except UpstreamRateLimited:
        raise HTTPException(429, "Rate limited; retry in 2s")
    except UpstreamServiceUnavailable:
        raise HTTPException(503, "Upstream API down")

    # 4. Transform + enrich data
    flights = []
    for flight in raw_data["data"]:
        flights.append(Flight(
            id=flight["flightId"],
            airline_code=flight["airlineCode"],
            airline_name=get_airline_name(flight["airlineCode"]),  # Cached lookup
            cabin_code=flight["cabin"],
            cabin_label=CABIN_LABELS[flight["cabin"]],  # Static mapping
            departure=parse_inconsistent_date(flight["departure"])
        ))

    # 5. Paginate (cursor-based)
    start_idx = decode_cursor(cursor) if cursor else 0
    page = flights[start_idx : start_idx + 20]
    next_cursor = encode_cursor(start_idx + 20) if len(flights) > start_idx + 20 else None

    # 6. Return validated response (Pydantic handles serialization)
    return FlightSearchResponse(flights=page, next_cursor=next_cursor, has_more=bool(next_cursor))

# 7. Swagger docs auto-generated from type hints + docstring
```

---

## Caching Strategy

```python
from cachetools import TTLCache

# Initialize at startup (lived process lifetime)
airline_cache = TTLCache(maxsize=5000, ttl=3600)  # 1 hour
airport_cache = TTLCache(maxsize=2000, ttl=3600)

# Load static data once
AIRLINES = json.load(open("data/airlines.json"))  # {"MH": {"name": "Malaysia Airlines"}, ...}

# In route handler
def get_airline_name(code: str) -> str:
    if code in airline_cache:
        return airline_cache[code]
    name = AIRLINES.get(code, {}).get("name", code)
    airline_cache[code] = name
    return name
```

**What to cache**: Airline codes, aircraft types, cabin classes, airports
**What NOT to cache**: Flight prices, availability, inventory (volatile)

---

## Error Handling Pattern

```python
class UpstreamAPIError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message

class UpstreamRateLimited(UpstreamAPIError):
    def __init__(self):
        super().__init__(429, "Rate limited by upstream API")

# Normalize 4 upstream error formats
def handle_upstream_error(resp):
    if "error" in resp.json():  # Format 1
        error = resp.json()["error"]
        if error["code"] == "INVALID_DATE":
            raise UpstreamValidationError(resp.status_code, error["message"])
    elif "errors" in resp.json():  # Format 2
        errors = resp.json()["errors"]
        # ... handle format 2
    # ... handle formats 3, 4
    raise UpstreamAPIError(resp.status_code, "Unknown error")

# Client response (FastAPI exception handler)
@app.exception_handler(UpstreamAPIError)
async def upstream_error_handler(request, exc):
    return JSONResponse(status_code=exc.status, content={
        "error": {"type": exc.__class__.__name__, "message": exc.message}
    })
```

---

## Resilience: Retry + Circuit Breaker

```python
from tenacity import retry, stop_after_attempt, wait_exponential_jitter
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(fail_max=5, reset_timeout=60)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(multiplier=1, max=10),
    reraise=True
)
async def call_legacy_api(endpoint: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.get(f"{LEGACY_API_URL}/{endpoint}")

# Usage: retry INSIDE circuit breaker
try:
    response = await breaker(call_legacy_api)("flights/search")
except Exception as e:
    # Handle after retries exhausted + circuit open
    pass
```

**Behavior**:
- 503 → retry 3x with 1s, 2s, 4s delays
- 429 → retry after Retry-After header
- Circuit opens after 5 failures → fail fast for 60s

---

## Testing Pattern

```python
@pytest.mark.asyncio
class TestFlightSearch:
    @pytest.fixture
    async def client(self):
        async with AsyncClient(app=app, base_url="http://test") as c:
            yield c

    @pytest.mark.asyncio
    async def test_search_with_enrichment(self, client, httpx_mock):
        """Test upstream API called + data enriched + cached"""
        httpx_mock.add_response(
            method="GET",
            url="https://legacy-api.com/search",
            json={"data": [{"flightId": "MH123", "airlineCode": "MH"}]}
        )

        response = await client.get("/search?origin=KUL&destination=SYD")

        assert response.status_code == 200
        assert response.json()["flights"][0]["airline_name"] == "Malaysia Airlines"

    @pytest.mark.asyncio
    async def test_retry_on_503(self, client, httpx_mock):
        """Test retry logic after 503 error"""
        httpx_mock.add_response(status_code=503)
        httpx_mock.add_response(status_code=503)
        httpx_mock.add_response(status_code=200, json={"data": []})

        response = await client.get("/search?origin=KUL")
        assert response.status_code == 200
        assert len(httpx_mock.get_requests()) == 3  # 2 retries + final success
```

---

## Implementation Roadmap

| Phase | Work | Days |
|-------|------|------|
| **1** | FastAPI scaffold, Pydantic models, httpx client, error adapter, OpenAPI | 2 |
| **2** | Code enrichment (airline/aircraft/cabin labels), flatten nested responses | 2 |
| **3** | Tenacity retries, circuit breaker, timeout handling | 2 |
| **4** | In-memory caching, cursor-based pagination | 2 |
| **5** | pytest tests for all scenarios (retry, error handling, pagination) | 2 |

**Total**: ~2 weeks for MVP.

---

## Open Questions Before Starting

1. How does legacy API authenticate? (Basic auth, OAuth, API key?)
2. Does legacy API support any pagination? Should BFF wrap or override?
3. Legacy API rate limits? (Affects retry backoff + cache TTL)
4. Multi-client or single client? (Affects response shape)
5. Upstream SLA tolerance? (Sub-100ms or OK with 500ms+?)

---

## Key Principles

- **BFF ≠ Generic Gateway**: This is client-specific composition. Be opinionated about what to enrich, cache, and normalize.
- **Cache wisely**: Airline codes yes, prices no.
- **Retry outside circuit breaker**: Breaker prevents cascading; retries handle transient failures.
- **Test upstream failures**: Mock 503, 429, timeouts. Verify retry+circuit breaker behavior.
- **Documentation auto-generated**: Use Pydantic + FastAPI type hints; no manual OpenAPI editing.
