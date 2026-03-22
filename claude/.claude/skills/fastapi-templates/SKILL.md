---
name: fastapi-templates
description: Use when you need production-ready FastAPI boilerplate, copy-paste code templates, or starter patterns. Load when implementing FastAPI services and you need ready-to-use code for BFF wrappers, upstream HTTP clients, Pydantic v2 schemas for flight/booking domains, unified error middleware, async cache decorators, or pagination helpers. Always load alongside fastapi-python when building a new FastAPI project from scratch.
disable-model-invocation: true
metadata:
  keywords: [fastapi, templates, boilerplate, BFF, pydantic, schemas, caching, retry, flight, booking]
  platforms: [backend]
  agent-affinity: [backend-developer]
  connections:
    enhances: [fastapi-python]
---

# FastAPI Templates

Ready-to-use code templates for FastAPI BFF services. These are starting points — adapt field names and logic to the actual upstream response shapes you discover at `/docs`.

## Template Index

| Template | File | Use When |
|----------|------|----------|
| Full project schemas | `templates/schemas.md` | Starting schema definitions for flight booking domain |
| BFF patterns | `templates/bff-patterns.md` | Upstream client, service layer, router wiring |
| Resilience patterns | `templates/resilience-patterns.md` | Retry, circuit breaker, error middleware setup |

## How to Use

1. Read the template file that matches your current task
2. Copy the relevant code block
3. Adapt field names to match what you see in the actual upstream `/docs`
4. Wire into your project following the structure in `fastapi-python/references/project-structure.md`
