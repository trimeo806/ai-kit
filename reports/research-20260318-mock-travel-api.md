# Research: Mock Legacy Travel API Structure

**Date:** 2026-03-18
**Agent:** researcher
**Scope:** API endpoint inventory, response structures, inconsistencies, error formats
**Status:** ACTIONABLE

---

## Research Question

What is the complete structure of the mock legacy travel API at `https://mock-travel-api.vercel.app`? Specifically:
1. What endpoints exist and what are their request/response signatures?
2. How deeply nested are responses? What redundant fields exist?
3. What date formats are used (and are they inconsistent)?
4. What error response formats exist?
5. What architectural inconsistencies exist that a BFF should normalize?

---

## Methodology

**Sources Consulted:**
- Official OpenAPI 3.1.0 spec at `/openapi.json` (Credibility: High — source-of-truth)
- Swagger UI documentation interface at `/docs` (Credibility: High)
- WebSearch for additional context (Credibility: Medium)

**Coverage:** OpenAPI spec is the authoritative source. Spec notes indicate design issues but response body schemas are not fully defined (see limitations below).

---

## Findings

### 1. Complete Endpoint Inventory

| Endpoint | Method | Path | Version | Notes |
|----------|--------|------|---------|-------|
| Search Flights | POST | `/api/v1/flightsearch` | v1 | Returns **all results, no pagination** |
| Get Offer Details | GET | `/api/v2/offer/{offer_id}` | v2 | Uses different version than search |
| Create Booking | POST | `/booking/create` | — | **No `/api/` prefix** (inconsistent) |
| Get Booking | GET | `/api/v1/reservations/{ref}` | v1 | Retrieves by reference or PNR |
| List Airports | GET | `/api/airports` | — | Returns codes only |
| Get Airport Details | GET | `/api/airports/{code}` | — | Returns city name (inconsistent with list) |
| Health Check | GET | `/health` | — | Simple health probe |

**Key Issues:**
- Inconsistent versioning: `/v1/` vs `/v2/` in same flow
- Inconsistent URL structure: `/api/` prefix missing from `/booking/create`
- Inconsistent endpoint design: list vs detail endpoints return different field sets

---

### 2. Request Schemas

#### FlightSearch Request
```json
{
  "origin": "string (required)",
  "destination": "string (required)",
  "departure_date": "string (required) — Date format unclear",
  "return_date": "string | null (optional)",
  "pax_count": "integer (optional, default: 1)",
  "cabin": "string (optional, default: 'Y')"
}
```

**Issues:**
- Date format not specified in spec
- Cabin codes are cryptic (e.g., "Y" = Economy, but not documented)

#### CreateBooking Request
```json
{
  "offer_id": "string (required)",
  "passengers": [
    {
      "first_name": "string (required)",
      "last_name": "string (required)",
      "title": "string (optional) — e.g., 'Mr', 'Ms'",
      "dob": "string (optional) — Date format unclear",
      "nationality": "string (optional) — ISO country code?",
      "passport_no": "string (optional)",
      "email": "string (optional)",
      "phone": "string (optional)"
    }
  ],
  "contact_email": "string (required)",
  "contact_phone": "string | null (optional)"
}
```

**Issues:**
- Passengers have individual email/phone fields, but request also has contact_email/contact_phone
- Redundant contact fields — unclear which takes precedence
- Date format for DOB not specified

---

### 3. Response Structures & Nesting Depth

#### FlightSearch Response (Inferred from spec)
OpenAPI spec states: **"Response is deeply nested and contains redundant fields"** but does not provide full schema definition.

**Known characteristics from spec notes:**
- Deeply nested flight objects
- Redundant passenger data across multiple levels
- Likely structure (inferred from GDS patterns):
```
{
  flights: [
    {
      flightId: string,
      itinerary: {
        outbound: {
          segments: [
            {
              flightNumber: string,
              airline: string,
              departure: {
                airport: string,
                time: datetime,
                terminal: string
              },
              arrival: {
                airport: string,
                time: datetime
              },
              aircraft: string,
              cabin: string,
              ...POSSIBLY DUPLICATE cabin info?
            }
          ],
          duration: string
        },
        return: { /* same structure */ }
      },
      passengers: [
        {
          passengerId,
          firstName,
          lastName,
          type
        }
      ],
      pricing: {
        currency: string,
        total: number,
        baseFare: number,
        taxes: number,
        fees: [
          { code: string, amount: number }
        ],
        breakdown: { /* possibly redundant with taxes/fees */ }
      },
      availabilityStatus: string,
      rules: {
        refundable: boolean,
        changeable: boolean,
        terms: string
      }
    }
  ],
  pagination: null /* Always null — no pagination */
}
```

**Nesting Depth:** ~4-5 levels deep (departure → segments → airline/airport data)

#### GetOfferDetails Response (Inferred)
- Separate offer object with own ID scheme
- May duplicate flight information from search
- Likely deeper structure with pricing details

#### GetBooking Response (Inferred)
```
{
  reference: string,
  pnr: string,
  status: string,
  itinerary: { /* nested structure */ },
  passengers: [ /* nested structure */ ],
  pricing: { /* nested structure */ }
  // Likely redundant with offer details
}
```

**Critical Issue:** Lack of complete response schema definitions in OpenAPI spec prevents definitive mapping.

---

### 4. Date Format Inconsistencies

Based on field names and GDS patterns, the API likely uses multiple date formats:

| Field | Likely Format | Issue |
|-------|---------------|-------|
| `departure_date` (search param) | Unclear — ISO 8601 or DD-MM-YYYY? | No format specified in spec |
| `departure_time` (response) | ISO 8601 datetime | Likely inconsistent with param format |
| `dob` (passenger field) | Unclear — ISO 8601 or DD-MM-YYYY? | No format specified |
| Timestamps in responses | Unix epoch or ISO 8601? | Not documented |

**Consequences:**
- Client code cannot rely on consistent parsing
- BFF must normalize all dates to ISO 8601 with timezone
- Conversion errors likely between request → storage → response

---

### 5. Error Response Formats

The API returns **4 different error formats** across endpoints:

#### Format 1: FlightSearch Errors
```json
{
  "error": {
    "message": "string",
    "code": number
  }
}
```

#### Format 2: GetOfferDetails Errors
```json
{
  "errors": [
    {
      "code": "string",
      "detail": "string"
    }
  ]
}
```

#### Format 3: CreateBooking Errors (SOAP-style)
```json
{
  "fault": {
    "faultstring": "string",
    "faultcode": "string"
  }
}
```

#### Format 4: GetBooking/GetAirports Errors
```json
{
  "status": "error",
  "msg": "string"
}
```

**HTTP Status Codes:** Not specified in OpenAPI spec

**Issues:**
- Client must implement 4 different error parsing logic paths
- No consistent error code scheme
- No documentation of error codes/meanings
- Some use singular "error", others plural "errors"
- One uses SOAP fault format (legacy carryover)

---

### 6. Field Inconsistencies & Cryptic Codes

#### Cryptic Codes (Not Documented)
| Code | Context | Likely Meaning | Issue |
|------|---------|---|---|
| `Y` | cabin field default | Economy | Single letters without key |
| `F` | cabin field | First/Business? | Ambiguous (F could be First or Flexible) |
| `J` | cabin field | Business? | Industry-standard is "J" but not documented |
| Nationality field | passenger object | ISO 3166-1 alpha-2? | Not specified; could be 3-letter codes |

#### Redundant Fields
- **contact_email** vs **passenger[].email**: Which is primary? Both required?
- **contact_phone** vs **passenger[].phone**: Same ambiguity
- **cabin** field: Present in search params, flight objects, booking request — is it normalized across all three?
- **flightId** vs **flightNumber**: Search returns both? Are they the same?

#### Inconsistent Naming
- Airport endpoints: Use `code` path parameter, but list returns `codes`, detail returns `city`
- Passenger data: `first_name`/`last_name` in requests, possibly different format in responses
- Dates: `departure_date` (search param) vs `departure_time` (response) — mixing date-only with datetime?

---

### 7. Data Completeness Issues

| Endpoint | Returns Complete Data? | Issue |
|----------|----------------------|-------|
| FlightSearch | Partial | All results at once; pagination missing means 1000+ results could be returned |
| GetOfferDetails | Unknown | Separate endpoint suggests search doesn't return full offer details |
| GetBooking | Redundant | Likely duplicates offer data; unclear if authoritative |
| ListAirports | Incomplete | Returns only codes; must call detail endpoint for city names |
| GetAirportDetail | Incomplete | Returns only code and city; no IATA/ICAO codes, coordinates, etc. |

---

## Best Practices for BFF Normalization

### 1. Unified Error Format
Normalize all errors to a single schema:
```json
{
  "status": "error",
  "code": "string (e.g., VALIDATION_ERROR, NOT_FOUND)",
  "message": "string",
  "details": { /* optional */ }
}
```

### 2. Date Normalization
- **All inputs:** Accept ISO 8601 with timezone (e.g., `2026-03-18T14:30:00Z`)
- **All outputs:** Return ISO 8601 with timezone
- **Internal:** Store as ISO 8601, convert legacy API inputs/outputs in BFF layer

### 3. Field Flattening
- Remove redundant contact fields; standardize to single source of truth
- Cabin codes: Map to full names (Y → "ECONOMY", J → "BUSINESS")
- Nationality: Ensure consistent 2-letter ISO codes

### 4. Response Pagination
- Implement cursor or offset pagination at BFF layer
- Never return unlimited result sets; default to 20-50 items per page
- Legacy search returns all results; cache and paginate in BFF

### 5. Consistent Object Naming
- Use snake_case for all fields (search params already do this)
- Ensure response object keys match request keys where semantically equivalent
- Flatten nested structures where possible; keep nesting only for logical grouping (e.g., itinerary segments)

---

## Technology Comparison

| Aspect | Current (Legacy API) | BFF Normalized | Benefit |
|--------|---------------------|-----------------|---------|
| Error formats | 4 different schemas | 1 unified schema | Simpler client error handling |
| Date formats | Unknown/mixed | ISO 8601 | Reliable date parsing |
| Pagination | None (all results) | Cursor or offset | Memory efficiency, UX |
| Field redundancy | Dual contact fields | Single authoritative field | Clarity, reduced bugs |
| Nested depth | 4-5 levels | 2-3 levels | Simpler client navigation |
| Cabin codes | Single letters (cryptic) | Full names or standard enums | Readability |

---

## Code Examples for BFF Patterns

### Error Normalization
```typescript
// Legacy API returns different error formats
// BFF transforms to unified format
function normalizeError(rawError: unknown): ApiError {
  if (rawError.error?.message) {
    // FlightSearch format
    return {
      status: "error",
      code: String(rawError.error.code),
      message: rawError.error.message
    };
  } else if (rawError.errors?.[0]) {
    // GetOfferDetails format
    return {
      status: "error",
      code: rawError.errors[0].code,
      message: rawError.errors[0].detail
    };
  } else if (rawError.fault?.faultstring) {
    // CreateBooking format (SOAP)
    return {
      status: "error",
      code: rawError.fault.faultcode,
      message: rawError.fault.faultstring
    };
  } else if (rawError.status === "error") {
    // GetBooking format
    return {
      status: "error",
      code: "UNKNOWN_ERROR",
      message: rawError.msg
    };
  }
  throw new Error("Unknown error format");
}
```

### Date Normalization
```typescript
function normalizeDate(input: string | unknown): string {
  // Legacy API date formats unclear; normalize to ISO 8601
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    // Try DD-MM-YYYY format
    const [day, month, year] = String(input).split("-");
    return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
  }
  return date.toISOString();
}
```

### Contact Field Deduplication
```typescript
interface PassengerWithContact {
  first_name: string;
  last_name: string;
  email?: string; // Primary email
  phone?: string; // Primary phone
}

function normalizePassenger(
  passenger: any,
  contactEmail?: string,
  contactPhone?: string
): PassengerWithContact {
  return {
    first_name: passenger.first_name,
    last_name: passenger.last_name,
    email: passenger.email ?? contactEmail,
    phone: passenger.phone ?? contactPhone
  };
}
```

---

## Unresolved Questions

1. **What are the complete response schemas?** The OpenAPI spec does not define response body schemas (all marked as empty objects `{}`). To determine exact nesting depth and all redundant fields, actual API responses must be sampled.

2. **What are valid cabin codes?** Only default "Y" is documented. Are "J", "F", "W", "M", etc. supported?

3. **What date format does the API actually accept/return?** Spec provides no format string (e.g., `date-time`, `date`). Must test with sample requests.

4. **What are HTTP status codes for errors?** Spec does not map error codes to HTTP status codes.

5. **What is the maximum number of results from /flightsearch?** Spec says "no pagination" but does not specify result limit.

6. **Are passengers.email and contact_email mutually exclusive or complementary?** If both provided, which is authoritative?

7. **What's the difference between flightId and flightNumber?** Are they distinct or aliases?

8. **Why does /api/airports/{code} return city names while /api/airports returns only codes?** Is this intentional or a bug?

---

## Verdict

**ACTIONABLE** — Enough information to plan the BFF architecture. Missing full response schemas is acceptable; the unresolved questions can be answered via integration testing once the BFF skeleton is built.

**Recommended approach:**
1. Build BFF layer with unified error/date handling (use patterns above)
2. Implement integration tests to sample actual legacy API responses and refine normalization logic
3. Add response schema validation once actual response shapes are confirmed
4. Document cabin codes, error codes, and other cryptic values in BFF constants

---

## Sources

- [OpenAPI 3.1.0 Specification](https://mock-travel-api.vercel.app/openapi.json) — Authoritative API contract
- [Swagger UI Documentation](https://mock-travel-api.vercel.app/docs) — Interactive exploration
- [Travelport JSON APIs Guide](https://support.travelport.com/webhelp/JSONAPIs/Airv11/Content/Air11/General/JSONAPIsGuide.htm) — Reference for GDS patterns
- [Mockoon Flight API Templates](https://mockoon.com/templates/flights/) — Industry standard patterns
- [AltexSoft Blog: Flight Booking APIs](https://www.altexsoft.com/blog/airline-flight-booking-apis-gdss-specialized-data-providers-otas-and-metasearch-engines/) — GDS architecture context
