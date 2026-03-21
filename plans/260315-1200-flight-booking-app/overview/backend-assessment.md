# Backend Engineer — Take-Home Assessment

*Flight Booking API Wrapper · Python + FastAPI/Django*

---

## Overview

Build a **Backend-for-Frontend (BFF) API wrapper** that sits between a legacy flight data system and multiple frontend clients (web and mobile apps). The upstream system works but is painful to consume: deeply nested responses, inconsistent naming, mixed date formats, and cryptic codes with no labels. Your job is to tame it.

You will be given access to a running instance of the legacy API. Your wrapper should expose a clean, well-documented, frontend-friendly API that completely hides the upstream complexity.

> Time guideline: 6–8 hours.
> The use of AI tools is welcome and expected — document your workflow in detail.

---

## The Legacy API

We will provide you with the base URL of a running legacy flight data service. This is the upstream system your wrapper must consume. It has auto-generated Swagger documentation at `/docs` for you to explore.

### Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `/api/v1/flightsearch` | Search flights |
| `GET` | `/api/v2/offer/{offer_id}` | Get offer details |
| `POST` | `/booking/create` | Create a booking |
| `GET` | `/api/v1/reservations/{ref}` | Retrieve a booking |
| `GET` | `/api/airports` | List all airports |
| `GET` | `/api/airports/{code}` | Get single airport |

Notice anything? The URL patterns are already inconsistent — mixed versioning, missing prefixes. That's just the start.

---

## What You'll Be Dealing With

The legacy API has the following characteristics that your wrapper must normalise:

- **Deeply nested responses** — search results are 3–4 levels deep. A departure airport code lives at: `data → flight_results → outbound → results[] → segments → segment_list[] → leg_data[] → departure_info → airport → code`
- **Redundant fields** — the same data appears multiple times under different names. For example, an offer contains `offer_id`, `offerId`, and each price appears as `total` (number), `total_amount` (string), and `totalAmountDecimal` (number)
- **Inconsistent error formats** — each endpoint returns errors in a different shape. You'll encounter four distinct error structures across the six endpoints
- **Mixed date/time formats** — ISO 8601, Unix epoch timestamps, DD/MM/YYYY, YYYYMMDDHHMMSS, and DD-Mon-YYYY formats all appear — sometimes within the same response
- **Codes without labels** — airlines (MH, AK, SQ), cabins (Y, W, J, F), aircraft (738, 359), booking status (HK), passenger type (ADT), and tax codes appear as raw codes with no human-readable names
- **No pagination** — search returns all results in a single response, regardless of count
- **Inconsistent airport data** — the list endpoint omits city names, but the single-airport endpoint includes them

---

## Simulated Failures

Append `?simulate_issues=true` to any request to enable simulated instability: random latency (200ms–2s), occasional 503 errors, and rate limiting (429). Use this to test and demonstrate your resilience patterns.

---

## Tech Stack

- **Python** with **FastAPI** or **Django** (your choice — justify it)
- **REST or GraphQL** for the wrapper API (your choice — justify it)
- Any additional libraries you find appropriate (caching, validation, documentation, etc.)

---

## What to Build

Your wrapper API should support the full flight booking flow below. The upstream legacy API handles data and booking logic — your wrapper handles transformation, validation, documentation, and resilience.

### 1. Flight Search

Accept a simple search request from a frontend client. Call the legacy API's search endpoint, then transform the deeply nested response into a **flat, lean structure** optimised for UI rendering.

Think about what a frontend developer actually needs: a list of offers with price, airline name (not just a code), departure/arrival times (in one consistent format), number of stops, and duration. Strip out the rest. Add pagination.

### 2. Offer Details

Given an offer ID, call the legacy API and return enriched details: fare rules, baggage allowance, change/refund policies. Transform codes into labels and normalise all date formats.

### 3. Create Booking

Accept passenger details and an offer ID. Validate the input thoroughly on your side before forwarding to the legacy API. Return a clean confirmation with booking reference and summary. Unify the upstream's quirky response into a consistent shape.

### 4. Retrieve Booking

Given a booking reference, fetch the order from the legacy API and return a clean summary. This endpoint should demonstrate your caching strategy.

---

## Key Areas of Focus

Beyond getting the endpoints working, we want to see how you think about these areas:

### API Design & Documentation

- Design clean, consistent request/response contracts that a frontend developer would enjoy working with
- Provide auto-generated API documentation (Swagger/OpenAPI for REST, or a schema explorer for GraphQL)
- Think carefully about naming conventions, pagination, and how you communicate errors to consumers

### Data Transformation

- Flatten, rename, and restructure the upstream data into something lean and purpose-built for UI rendering
- Show clear separation between the upstream data model and your downstream API contract
- Enrich code-only fields with human-readable labels (airline names, city names, cabin class descriptions)

### Error Handling & Resilience

- Unify the four different upstream error formats into one consistent error shape for your consumers
- Handle upstream failures gracefully: timeouts, rate limits, unexpected response shapes
- Implement retry logic and/or circuit breaker patterns (use the `?simulate_issues=true` flag to test this)

### Caching & Performance

- Identify what's cacheable (airport metadata doesn't change) versus what must be live (pricing, availability)
- Implement at least one caching layer and explain your invalidation strategy
- Consider response time from the frontend's perspective

### AI-Assisted Development

- This role requires driving AI initiatives within the team. Show us your workflow.
- Document which AI tools you used (Copilot, Claude, Cursor, etc.), what you used them for, and how you validated their output
- Highlight at least one area where AI significantly accelerated your work and one where you had to course-correct

---

## Documentation

Include a written document (Markdown or PDF) in the repository covering:

1. **API design decisions** — why REST vs GraphQL, your URL/schema design philosophy, error response structure, and your approach to upstream-to-downstream data transformation
2. **Architecture overview** — a diagram or description of layer boundaries (frontend → your wrapper → legacy API), where caching sits, and codebase structure
3. **Resilience patterns** — what happens when the upstream is slow, errors, or rate-limits? How does your wrapper behave?
4. **Caching strategy** — what you cache, where, for how long, and how you handle invalidation
5. **AI workflow** — which tools, which tasks, prompts that worked, and where you had to intervene or rewrite
6. **Setup instructions** — clear steps to run the project locally

---

## Deliverables

1. Source code in a Git repository (GitHub, GitLab, or Bitbucket) with a clean commit history
2. Working API documentation (auto-generated Swagger/OpenAPI or GraphQL playground)
3. The documentation described above, included in the repository
4. A deployed instance of your wrapper API is a bonus but not required — local setup instructions are sufficient

---

## What We're Looking For

| Area | What Good Looks Like |
|------|---------------------|
| **API Design** | Clean contracts a frontend dev would love; consistent naming; unified error shape |
| **Data Transformation** | Upstream complexity fully hidden; flat, lean, labelled responses |
| **Error Handling** | Graceful degradation; structured errors; retry/circuit breaker logic demonstrated |
| **Caching** | Thoughtful strategy with clear invalidation reasoning; measurable improvement |
| **Code Architecture** | Clean layer separation (routing, services, clients); easy to extend |
| **Documentation** | Clear reasoning behind decisions; useful architecture diagrams |
| **AI Workflow** | Fluent AI tool usage; honest about what worked and didn't; strong validation habits |

---

## Tips

- Prioritise a working end-to-end flow over covering every edge case. A complete search-to-booking pipeline with clean transformation beats a half-finished API with perfect retry logic.
- Explore the legacy API's Swagger docs at `/docs` to understand the full response shapes before you start coding.
- Use `?simulate_issues=true` to test your resilience patterns — but develop against the normal (stable) mode first.
- Commit early and often — we value seeing how you work, not just the final result.
- If you run over the time guideline, scope down and note what you would improve given more time.
- Treat the AI workflow documentation seriously — it's not an afterthought. This is a core part of the role.

---

> **Legacy API base URL:** `https://mock-travel-api.vercel.app`
> **Swagger docs:** `[BASE_URL]/docs`

Good luck — we're looking forward to seeing what you build.
