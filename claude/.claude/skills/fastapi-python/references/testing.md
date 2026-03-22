# FastAPI Testing Patterns

## Setup (pyproject.toml / requirements-dev.txt)

```
pytest
pytest-asyncio
httpx          # for async test client
respx          # mock httpx requests (replaces responses/requests-mock for async)
pytest-cov
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"          # all async tests run without @pytest.mark.asyncio
testpaths = ["tests"]
```

## conftest.py

```python
import pytest
import httpx
import respx
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.dependencies import get_upstream_client
from app.clients.upstream import UpstreamClient


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def async_client(app):
    """Async HTTPX client that drives the FastAPI app directly (no network)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_upstream():
    """Intercept all httpx calls to the upstream URL."""
    with respx.mock(base_url="https://mock-travel-api.vercel.app") as mock:
        yield mock
```

## Test: Flight Search

```python
import pytest
from httpx import AsyncClient


async def test_search_flights_returns_flat_offers(async_client: AsyncClient, mock_upstream):
    # Arrange: mock the upstream response (raw nested shape)
    mock_upstream.post("/api/v1/flightsearch").mock(
        return_value=httpx.Response(200, json={
            "data": {
                "flight_results": {
                    "outbound": {
                        "results": [
                            {
                                "offer_id": "OFF-001",
                                "offerId": "OFF-001",   # duplicate field
                                "price": {"total": 399.0, "currency": "MYR"},
                                "totalAmountDecimal": 399.0,
                                "total": 399.0,
                                "total_amount": "399.00",
                                "fare_info": {"cabin_code": "Y"},
                                "flight_data": {
                                    "outbound": {
                                        "total_duration_minutes": 95,
                                        "segments": {
                                            "segment_list": [{
                                                "carrier": {"code": "AK"},
                                                "leg_data": [
                                                    {
                                                        "departure_info": {
                                                            "datetime": "20241215143000",
                                                            "airport": {"code": "KUL"}
                                                        },
                                                        "arrival_info": {
                                                            "datetime": "20241215160000",
                                                            "airport": {"code": "SIN"}
                                                        }
                                                    }
                                                ]
                                            }]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        })
    )

    # Act
    response = await async_client.get("/v1/flights/search", params={
        "origin": "KUL",
        "destination": "SIN",
        "departure_date": "2024-12-15",
        "passengers": 1,
    })

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    offer = body["results"][0]

    # BFF contract: flat, labelled, consistent
    assert offer["offer_id"] == "OFF-001"
    assert offer["airline_name"] == "AirAsia"       # not "AK"
    assert offer["cabin_class"] == "Economy"         # not "Y"
    assert offer["price_total"] == 399.0
    assert offer["duration_minutes"] == 95
    assert offer["stops"] == 0
    assert "departure_at" in offer                   # ISO 8601
    assert "T" in offer["departure_at"]              # confirms ISO format
```

## Test: Resilience (upstream 503)

```python
async def test_search_returns_503_when_upstream_unavailable(async_client, mock_upstream):
    mock_upstream.post("/api/v1/flightsearch").mock(
        return_value=httpx.Response(503, json={"error": "Service Unavailable"})
    )

    response = await async_client.get("/v1/flights/search", params={
        "origin": "KUL", "destination": "SIN", "departure_date": "2024-12-15", "passengers": 1
    })

    assert response.status_code == 503
    error = response.json()
    # Unified error shape — not the upstream's format
    assert error["code"] == "UPSTREAM_UNAVAILABLE"
    assert "message" in error
    assert "request_id" in error


async def test_search_retries_on_503_before_failing(async_client, mock_upstream):
    call_count = 0

    def flaky_response(request):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            return httpx.Response(503)
        return httpx.Response(200, json={"data": {"flight_results": {"outbound": {"results": []}}}})

    mock_upstream.post("/api/v1/flightsearch").mock(side_effect=flaky_response)

    response = await async_client.get("/v1/flights/search", params={
        "origin": "KUL", "destination": "SIN", "departure_date": "2024-12-15", "passengers": 1
    })

    assert response.status_code == 200
    assert call_count == 3  # failed twice, succeeded on third attempt
```

## Test: Caching (airports)

```python
async def test_airport_list_is_cached(async_client, mock_upstream):
    mock_upstream.get("/api/airports").mock(
        return_value=httpx.Response(200, json=[
            {"code": "KUL", "name": "Kuala Lumpur International"},
            {"code": "SIN", "name": "Singapore Changi"},
        ])
    )

    # First call — hits upstream
    r1 = await async_client.get("/v1/airports")
    assert r1.status_code == 200

    # Second call — should use cache (upstream mock would error if called again)
    mock_upstream.get("/api/airports").mock(
        return_value=httpx.Response(500)  # if called again, it would fail
    )
    r2 = await async_client.get("/v1/airports")
    assert r2.status_code == 200
    assert r2.json() == r1.json()  # identical response from cache
```

## Test: Booking Validation

```python
async def test_create_booking_validates_passenger_email(async_client):
    response = await async_client.post("/v1/bookings", json={
        "offer_id": "OFF-001",
        "passengers": [{
            "type": "ADT",
            "first_name": "John",
            "last_name": "Doe",
            "email": "not-an-email",  # invalid
            "date_of_birth": "1990-01-01",
        }]
    })

    assert response.status_code == 422
    # Pydantic validation error — BFF rejects before hitting upstream


async def test_create_booking_calls_upstream_with_clean_payload(async_client, mock_upstream):
    mock_upstream.post("/booking/create").mock(
        return_value=httpx.Response(200, json={
            "reservation_ref": "PNR123",
            "status": "HK",
            # ... other upstream fields
        })
    )

    response = await async_client.post("/v1/bookings", json={
        "offer_id": "OFF-001",
        "passengers": [{
            "type": "ADT",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "date_of_birth": "1990-01-01",
        }]
    })

    assert response.status_code == 201
    body = response.json()
    assert body["booking_reference"] == "PNR123"
    assert body["status"] == "Confirmed"   # "HK" → human label
```

## Test: Dependency Override (for unit tests without HTTP)

```python
from app.dependencies import get_upstream_client


async def test_service_with_mocked_dependency(app, async_client):
    """Override DI to inject a stub — no HTTP at all."""

    class StubUpstreamClient:
        async def search_flights(self, params):
            return {"data": {"flight_results": {"outbound": {"results": []}}}}

    app.dependency_overrides[get_upstream_client] = lambda: StubUpstreamClient()

    response = await async_client.get("/v1/flights/search", params={
        "origin": "KUL", "destination": "SIN", "departure_date": "2024-12-15", "passengers": 1
    })
    assert response.status_code == 200

    app.dependency_overrides.clear()
```
