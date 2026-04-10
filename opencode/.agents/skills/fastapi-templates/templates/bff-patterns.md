# BFF Layer Patterns

Full-stack templates for the Upstream Client → Service → Router pipeline.

## Upstream Client Template

```python
# app/clients/upstream.py
import httpx
from app.config import settings
from app.middleware.error_handler import UpstreamError, UpstreamUnavailableError, UpstreamNotFoundError


class UpstreamClient:
    """
    Thin wrapper around httpx.AsyncClient.
    Responsibility: make HTTP calls, raise typed errors. No transformation here.
    """

    def __init__(self, client: httpx.AsyncClient):
        self._client = client

    async def _get(self, url: str, **params) -> dict:
        try:
            r = await self._client.get(url, params={k: v for k, v in params.items() if v is not None})
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            raise self._classify(exc) from exc
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailableError("Upstream timed out") from exc

    async def _post(self, url: str, body: dict) -> dict:
        try:
            r = await self._client.post(url, json=body)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            raise self._classify(exc) from exc
        except httpx.TimeoutException as exc:
            raise UpstreamUnavailableError("Upstream timed out") from exc

    @staticmethod
    def _classify(exc: httpx.HTTPStatusError) -> UpstreamError:
        sc = exc.response.status_code
        if sc == 404:
            return UpstreamNotFoundError("Resource not found upstream")
        if sc in {503, 504}:
            return UpstreamUnavailableError("Upstream service unavailable")
        return UpstreamError(f"Upstream returned {sc}", detail=exc.response.text[:200])

    # --- Domain methods ---

    async def search_flights(self, payload: dict) -> dict:
        return await self._post("/api/v1/flightsearch", payload)

    async def get_offer(self, offer_id: str) -> dict:
        return await self._get(f"/api/v2/offer/{offer_id}")

    async def create_booking(self, payload: dict) -> dict:
        return await self._post("/booking/create", payload)

    async def get_booking(self, ref: str) -> dict:
        return await self._get(f"/api/v1/reservations/{ref}")

    async def list_airports(self) -> list:
        return await self._get("/api/airports")

    async def get_airport(self, code: str) -> dict:
        return await self._get(f"/api/airports/{code}")
```

## Flight Service Template

```python
# app/services/flight_service.py
from app.clients.upstream import UpstreamClient
from app.schemas.flights import FlightSearchRequest, FlightSearchResponse, OfferDetailResponse
from app.services.transformers.flights import transform_search_response, transform_offer_detail


class FlightService:
    def __init__(self, client: UpstreamClient, airport_cache: dict[str, str] | None = None):
        self._client = client
        self._airport_cache = airport_cache or {}

    async def search(self, req: FlightSearchRequest) -> FlightSearchResponse:
        payload = {
            "origin": req.origin,
            "destination": req.destination,
            "date": req.departure_date,
            "passengers": req.passengers,
            "cabin": req.cabin_class,
        }
        raw = await self._client.search_flights(payload)
        return transform_search_response(raw, self._airport_cache, req.page, req.page_size)

    async def get_offer(self, offer_id: str) -> OfferDetailResponse:
        raw = await self._client.get_offer(offer_id)
        return transform_offer_detail(raw, self._airport_cache)
```

## Router Template

```python
# app/routers/flights.py
from fastapi import APIRouter, Depends, Query
from app.schemas.flights import FlightSearchRequest, FlightSearchResponse, OfferDetailResponse
from app.services.flight_service import FlightService
from app.dependencies import get_flight_service

router = APIRouter()


@router.get(
    "/flights/search",
    response_model=FlightSearchResponse,
    summary="Search available flights",
    responses={
        422: {"description": "Invalid search parameters"},
        503: {"description": "Upstream flight data unavailable"},
    },
)
async def search_flights(
    origin: str = Query(..., min_length=3, max_length=3, description="IATA origin airport code"),
    destination: str = Query(..., min_length=3, max_length=3, description="IATA destination airport code"),
    departure_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    passengers: int = Query(default=1, ge=1, le=9),
    cabin_class: str = Query(default="Y", description="Y/W/J/F"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    service: FlightService = Depends(get_flight_service),
) -> FlightSearchResponse:
    req = FlightSearchRequest(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        passengers=passengers,
        cabin_class=cabin_class,
        page=page,
        page_size=page_size,
    )
    return await service.search(req)


@router.get(
    "/offers/{offer_id}",
    response_model=OfferDetailResponse,
    summary="Get enriched offer details",
    responses={
        404: {"description": "Offer not found"},
        503: {"description": "Upstream unavailable"},
    },
)
async def get_offer(
    offer_id: str,
    service: FlightService = Depends(get_flight_service),
) -> OfferDetailResponse:
    return await service.get_offer(offer_id)
```

## Booking Router Template

```python
# app/routers/bookings.py
from fastapi import APIRouter, Depends, status
from app.schemas.bookings import CreateBookingRequest, BookingResponse
from app.services.booking_service import BookingService
from app.dependencies import get_booking_service

router = APIRouter()


@router.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a flight booking",
    responses={
        422: {"description": "Invalid passenger data or missing adult passenger"},
        404: {"description": "Offer not found or expired"},
        503: {"description": "Upstream booking service unavailable"},
    },
)
async def create_booking(
    request: CreateBookingRequest,
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    # Pydantic validates before this point — upstream only called with valid data
    return await service.create_booking(request)


@router.get(
    "/bookings/{reference}",
    response_model=BookingResponse,
    summary="Retrieve booking by reference",
    responses={
        404: {"description": "Booking not found"},
        503: {"description": "Upstream unavailable (stale data may be returned)"},
    },
)
async def get_booking(
    reference: str,
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    return await service.get_booking(reference)
```

## Airport Router Template

```python
# app/routers/airports.py
from fastapi import APIRouter, Depends, Response
from app.schemas.airports import AirportResponse
from app.services.airport_service import AirportService
from app.dependencies import get_airport_service

router = APIRouter()


@router.get(
    "/airports",
    response_model=list[AirportResponse],
    summary="List all airports",
)
async def list_airports(
    response: Response,
    service: AirportService = Depends(get_airport_service),
) -> list[AirportResponse]:
    airports = await service.list_airports()
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=60"
    return airports


@router.get(
    "/airports/{code}",
    response_model=AirportResponse,
    summary="Get airport details by IATA code",
)
async def get_airport(
    code: str,
    response: Response,
    service: AirportService = Depends(get_airport_service),
) -> AirportResponse:
    airport = await service.get_airport(code.upper())
    response.headers["Cache-Control"] = "public, max-age=3600"
    return airport
```
