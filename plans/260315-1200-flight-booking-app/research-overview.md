# Flight Booking App — Research Overview

*Two separate assessments, two independent projects — each evaluated on its own.*

---

## Summary

| Assessment | Stack | API | Time | Deploy |
|-----------|-------|-----|------|--------|
| **Frontend** | Next.js 16 · React · TypeScript · Zustand · TanStack Query · shadcn/ui | Duffel Flights API (REST) | 6–8 hrs | Vercel |
| **Backend** | FastAPI · Strawberry GraphQL · Python 3.12 · Pydantic v2 · httpx | Legacy mock-travel API (REST → GraphQL BFF) | 6–8 hrs | Google Cloud Run |

These are **independent deliverables**. The frontend does NOT consume the backend. Each has its own API, its own deployment, and its own documentation.

---

## Project Files

| File | Contents |
|------|---------|
| [`frontend/research-overview-frontend.md`](frontend/research-overview-frontend.md) | Tech stack, architecture, Duffel API → feature mapping (all 4 screens), requirements, implementation phases, deployment |
| [`frontend/research-ui-ux.md`](frontend/research-ui-ux.md) | UI/UX research — screen-by-screen design decisions, component specs, design system, patterns to adopt/avoid |
| [`frontend/research-ui-ux-competitor-analysis.md`](frontend/research-ui-ux-competitor-analysis.md) | Full competitor analysis — 7 OTAs (Google Flights, Skyscanner, Kayak, Expedia, Trip.com, AirAsia, Booking.com) |
| [`backend/research-overview-backend.md`](backend/research-overview-backend.md) | Tech stack, architecture, GraphQL schema, legacy API → resolver mapping, transformations, resilience, caching, implementation phases, deployment |

---

## Exploration Documents

| File | Contents |
|------|---------|
| [`frontend/duffel-api-exploration.md`](frontend/duffel-api-exploration.md) | Duffel API live-tested results — token verified, all 6 endpoints documented with actual payloads and responses |
| [`backend/legacy-api-exploration.md`](backend/legacy-api-exploration.md) | Legacy mock-travel API live-tested results — all 6 endpoints, 4 error formats, 5 date formats, code enrichment tables |
| [`overview/frontend-assessment.md`](overview/frontend-assessment.md) | Original frontend assessment PDF (converted to Markdown) |
| [`overview/backend-assessment.md`](overview/backend-assessment.md) | Original backend assessment PDF (converted to Markdown) |

---

## Quick Reference

```
FRONTEND REPO:  flight-booking-frontend
  API:          https://api.duffel.com  (via Next.js API routes — token server-side only)
  Token:        DUFFEL_API_TOKEN  (never NEXT_PUBLIC_)
  Deploy:       Vercel + GitHub Actions

BACKEND REPO:   flight-booking-backend
  Upstream:     https://mock-travel-api.vercel.app  (Swagger: /docs)
  GraphQL:      POST /graphql  (schema explorer at GET /graphql)
  Deploy:       Google Cloud Run + GitHub Actions

Versions (verified 2026-03-18):
  Next.js v16.1.6 · Zustand v5.0.12 · TanStack Query v5.90.3 · Playwright v1.58.2
  FastAPI 0.128.0 · Strawberry 0.282.0
```
