# Research: GraphQL for FastAPI BFF Wrapping Legacy REST API

**Date**: 2026-03-18
**Agent**: researcher
**Status**: ACTIONABLE
**Scope**: Python GraphQL libraries, FastAPI integration, frontend client comparison, BFF trade-offs

---

## Executive Summary

**Verdict**: GraphQL + Strawberry + FastAPI is **viable and recommended** for your BFF use case, especially given the deeply nested legacy data and varied frontend shapes. Ariadne is a strong alternative if you prefer schema-first approach. For frontend, **TanStack Query + graphql-request** offers best balance of flexibility, bundle size, and local state integration with Zustand; Apollo Client is overkill unless you need complex normalized caching; urql is lightweight alternative.

**Key insight**: GraphQL shines when wrapping messy legacy APIs because it's a data transformation layer—flattens nested responses, adapts to frontend needs, and is *self-documenting*. REST BFF also works but requires manual documentation and more custom adapter code.

---

## 1. Python GraphQL Libraries: 2025/2026 Comparison

### **Strawberry GraphQL** (Recommended for FastAPI)

| Aspect | Detail |
|--------|--------|
| **Type Safety** | Excellent — code-first via Python type hints. Auto-generates schema from `@strawberry.type` decorators. Full Pyright/mypy support. |
| **FastAPI Integration** | Native via `GraphQLRouter`. Mount as sub-router, works alongside normal FastAPI endpoints. Straightforward. |
| **Async Support** | **Excellent** — recommended pattern is `async def` for all fields to avoid blocking worker threads. Auto-handles event loop scheduling. |
| **Docs Generation** | Auto-generates GraphQL schema from code. Built-in GraphQL Explorer (GraphiQL). Zero extra work. |
| **Code-First vs Schema-First** | Code-first (decorators). Schema follows code. Cleaner for Python developers. |
| **Adoption** | Benchmark: 92.6/100. 668 code snippets. High source reputation. **Actively maintained, recommended by Apollo docs.** |
| **Learning Curve** | Shallow — very similar to FastAPI's decorator style. Intuitive for FastAPI users. |
| **Bundle Size** | N/A (backend only) |

**FastAPI Mount Example**:
```python
import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello World"

schema = strawberry.Schema(Query)
graphql_app = GraphQLRouter(schema)
app = FastAPI()
app.include_router(graphql_app, prefix="/graphql")
```

**Recommendation**: Use `async def` for all resolvers to prevent blocking. Strawberry's event loop integration handles mixed async/sync fields gracefully.

---

### **Ariadne** (Schema-First Alternative)

| Aspect | Detail |
|--------|--------|
| **Type Safety** | Good — typed resolvers optional but recommended. More flexible than Strawberry. |
| **FastAPI Integration** | Mount as ASGI sub-app or via route handlers. Slightly more ceremony than Strawberry but fully supported. |
| **Async Support** | Excellent — async resolvers, async generators for subscriptions. No blocking issues. |
| **Docs Generation** | GraphQL Explorer included. Introspection available. |
| **Code-First vs Schema-First** | **Schema-first**. Write GraphQL SDL, bind Python resolvers. Closer to traditional GraphQL approach. |
| **Adoption** | Benchmark: 92/100. 1025 code snippets. High source reputation. WebSocket improvements in 2025. |
| **Learning Curve** | Moderate — SDL upfront, then Python binding. Good if team knows GraphQL SDL. |

**FastAPI Mount Example**:
```python
from ariadne import QueryType, make_executable_schema
from ariadne.asgi import GraphQL
from fastapi import FastAPI

type_defs = """
    type Query {
        hello: String!
    }
"""

query = QueryType()

@query.field("hello")
def resolve_hello(*_):
    return "Hello world!"

schema = make_executable_schema(type_defs, query)
app = FastAPI()
app.mount("/graphql/", GraphQL(schema, debug=True))
```

**Recommendation**: Prefer Ariadne if your team prefers explicit schema separation or needs federated schemas across services.

---

### **Graphene** (Older, Declining Adoption)

| Aspect | Detail |
|--------|--------|
| **Type Safety** | Moderate — ORM-focused, less native Python type hint support. |
| **FastAPI Integration** | Works but requires more glue code. Not a first-class integration. |
| **Async Support** | Supported but not the design focus. |
| **Adoption** | Benchmark: None listed. 145 code snippets. Lower community momentum vs Strawberry/Ariadne. |
| **Status** | **Older library**. Graphene-Django still maintained but not recommended for new FastAPI projects. |

**Recommendation**: **Skip Graphene for new BFF work.** Strawberry or Ariadne are strictly better for 2025+.

---

## 2. GraphQL + FastAPI Integration Mechanics

### **Straightforward Setup**

✓ **Strawberry**: Include router in FastAPI app (one line).
✓ **Ariadne**: Mount ASGI app under FastAPI (one line).
✓ Both play well alongside normal FastAPI endpoints (REST + GraphQL on same server).

### **Key Best Practices**

| Pattern | Why |
|---------|-----|
| `async def` for all resolver fields | Prevents blocking on single worker. FastAPI can handle concurrent requests. |
| Use Strawberry's `info: strawberry.Info` or Ariadne's context for database connections | Dependency injection. Cleaner than globals. |
| DataLoader pattern for N+1 prevention | Batch database queries per request. Both libraries support it. |
| Pagination on large lists | GraphQL can fetch entire result sets; paginate to control payload size. |
| GraphQL validation errors + HTTP 200 | GraphQL returns errors in response body, not HTTP status codes. Clients must check `errors` field. |

### **Authentication/Authorization**

Both Strawberry and Ariadne support FastAPI's `Depends()` for injecting auth context:

```python
# Strawberry example
from fastapi import Depends

def get_user(request: Request) -> User:
    # Extract from JWT, session, etc.
    return current_user

@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: strawberry.Info) -> User:
        return info.context.user  # Injected via Depends()
```

---

## 3. Frontend Client Comparison for Next.js

### **TanStack Query (React Query) + graphql-request** ✓ RECOMMENDED

| Aspect | Detail |
|--------|--------|
| **Bundle Size** | Combined: ~15KB (TQ: 8KB + graphql-request: 4KB). Smallest option. |
| **Learning Curve** | Low — TanStack Query is proven, graphql-request is minimal wrapper. |
| **State Management** | Pairs naturally with Zustand. TQ handles server state (fetch/cache), Zustand handles UI state. |
| **TypeScript Support** | Excellent — graphql-request has built-in TypeScript support. Can use graphql-codegen for full type safety. |
| **Flexibility** | Agnostic to backend (REST, GraphQL, gRPC). Easy to switch if needed. |
| **Normalization** | None built-in. Good if frontend doesn't need normalized cache. |
| **When to Use** | Most projects, especially if you want minimal dependencies and control over state shape. |

**Example**:
```typescript
import { useQuery } from '@tanstack/react-query'
import { graphQLClient } from '@/lib/graphql'
import { useStore } from '@/store' // Zustand

export function SearchResults() {
  const { query } = useStore() // UI state in Zustand

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => graphQLClient.request(SEARCH_QUERY, { query })
  })

  return <div>{/* ... */}</div>
}
```

---

### **Apollo Client** (Enterprise, Bundle Overhead)

| Aspect | Detail |
|--------|--------|
| **Bundle Size** | ~30KB. 2.5x larger than TQ+graphql-request. |
| **State Management** | Built-in normalized cache. Automatic data synchronization across queries. |
| **Learning Curve** | Steep — caching rules, cache.modify, reactive vars. Complexity overhead. |
| **TypeScript Support** | Excellent — code generation via Apollo Codegen. Full type safety. |
| **Normalization** | Automatic. Objects deduplicated by `__typename` + `id`. |
| **When to Use** | Large enterprise apps needing sophisticated cache invalidation, real-time subscriptions, or if already invested in Apollo ecosystem. |

**Trade-off**: Apollo's normalized cache is powerful but adds complexity you may not need. TQ is simpler.

---

### **urql** (Lightweight, Underrated)

| Aspect | Detail |
|--------|--------|
| **Bundle Size** | ~12KB. Smallest dedicated GraphQL client. |
| **State Management** | Normalized cache available (optional plugin). Simpler API than Apollo. |
| **Learning Curve** | Low-moderate. Straightforward hooks API. Less magic than Apollo. |
| **TypeScript Support** | Good — graphql-codegen integration available. |
| **When to Use** | Projects wanting native GraphQL support (vs generic TQ) without Apollo's complexity. Strong Next.js plugin. |

**Verdict**: urql is solid but TQ + graphql-request is more flexible and equally lightweight.

---

## 4. GraphQL Advantages for Your BFF Use Case

### **Why GraphQL Shines Here**

Your scenario: Legacy API has deeply nested responses. Frontend needs different shapes (search results vs offer details).

| Advantage | How It Helps |
|-----------|------------|
| **Data Transformation Layer** | BFF can flatten legacy API's nested response (`data.response.items[].details.nested`) into clean shape frontend expects. GraphQL is *made* for this. |
| **"Ask for What You Need"** | Frontend queries only fields it uses. No over-fetching. Reduces payload size for mobile. |
| **Single Endpoint** | Legacy API scattered across `/api/search`, `/api/offers/{id}`, etc. GraphQL BFF consolidates into one `/graphql` endpoint. |
| **Self-Documenting Schema** | GraphQL Explorer is interactive docs. No separate Swagger file to maintain. Schema = docs. |
| **Polymorphism** | Use GraphQL unions/interfaces to support different search result types (Product, Article, Event) — harder in REST BFF. |
| **Frontend Autonomy** | Once BFF is up, frontend team can request new fields without waiting for backend. Developers own their queries. |

### **Is It Overkill?**

**Not** if:
- Legacy API is messy/deeply nested (you have this).
- Frontend needs multiple different data shapes (you have this).
- Team wants to reduce API documentation burden.
- Mobile/bandwidth is a concern.

**Possibly overkill** if:
- Legacy API is already well-designed, REST responses match frontend needs 1:1.
- Team has no GraphQL experience and just wants to ship.

**Verdict**: For your use case, GraphQL is **justified**, not overkill.

---

## 5. GraphQL Playground/Explorer vs Swagger/OpenAPI

| Aspect | GraphQL Explorer (GraphiQL) | Swagger/OpenAPI |
|--------|---------------------------|-----------------|
| **Interaction** | Interactive query builder. Select fields, see schema tree. No docs to write. | Static endpoint list. Must write request/response examples. |
| **Learning Curve** | Intuitive for new users. Click-to-explore. | Requires reading YAML/JSON schema. |
| **Maintenance** | Zero — schema is docs. | Developers forget to update when APIs change. |
| **IDE Integration** | Good — LSP support, VS Code extensions. | Good — OpenAPI specs can generate SDKs. |
| **Discovery** | Excellent — schema introspection is built-in. | Requires separate tooling (Swagger UI). |
| **Export** | Can export queries as code. | Can generate REST clients, but no GraphQL-aware tools. |
| **Assessment Fit** | **Better for API assessment**. Live schema, interactive testing. No docs to fall out of sync. | Good if evaluators prefer traditional REST examples. |

**Recommendation**: GraphQL Explorer is **superior for documentation** in a BFF context. API is always correct (schema is live), and technical reviewers can explore interactively.

---

## 6. REST vs GraphQL BFF Trade-offs

### **When REST BFF Wins**

| Scenario | Why |
|----------|-----|
| Endpoints already match frontend shapes 1:1 | Minimal transformation needed. Simple adapter layer. |
| Team has no GraphQL experience, velocity matters | REST BFF faster to prototype. Schema setup overhead in GraphQL. |
| Caching patterns straightforward (GET = cache, POST = no cache) | REST HTTP semantics align with HTTP caches, CDNs. |
| Legacy API is performant, minimal over-fetching | No payload reduction benefit to GraphQL. |

**Example**: Wrapping a single REST endpoint that returns exactly what frontend needs.

---

### **When GraphQL BFF Wins** ← Your Case

| Scenario | Why |
|----------|-----|
| Legacy API deeply nested, inconsistent response shapes | GraphQL flattens, transforms, normalizes. |
| Frontend needs different data shapes per page/feature | GraphQL queries are page-specific. No one-size-fits-all response. |
| Team wants self-documenting API (no separate docs maintenance) | Schema = docs. GraphQL Explorer = live API reference. |
| Multiple frontend consumers (web, mobile, admin) with different needs | Each client queries only what it needs. |
| Frequent legacy API changes, want decoupling | BFF absorbs changes, frontend-facing schema stable. |

**Example**: Your use case (nested legacy data, varied frontend shapes).

---

### **Hybrid Pattern (2025/2026 Trend)**

Many orgs use **REST for backend-to-backend** (microservices, webhooks) and **GraphQL for frontend** (BFF). Best of both:

- Microservices expose REST APIs (simpler contracts).
- BFF exposes GraphQL to frontend (flexible, self-documented).
- GraphQL Federation can compose multiple upstream REST APIs.

---

## 7. Recommended Architecture

```
Legacy REST API (messy, nested)
         ↓
  FastAPI BFF (Python)
  - Strawberry GraphQL
  - Async resolvers
  - DataLoaders for N+1 prevention
  - Custom error handling
         ↓
GraphQL Endpoint (/graphql)
         ↓
Next.js Frontend
  - TanStack Query or urql
  - graphql-request client
  - Zustand for local state
         ↓
GraphQL Explorer (GraphiQL)
   (API docs, live testing)
```

---

## 8. Consensus vs Experimental

| Approach | Status | Notes |
|----------|--------|-------|
| **Strawberry + FastAPI** | Stable, 2025 consensus | Recommended. High adoption, active maintenance. |
| **Ariadne + FastAPI** | Stable, viable alternative | Schema-first preference. Also recommended. |
| **TanStack Query + graphql-request** | Stable, best practice 2025 | Lightweight, flexible. Recommended for frontend. |
| **Apollo Client** | Stable but overkill | Works, but adds unnecessary complexity for most BFFs. |
| **urql** | Stable, underrated | Good option, slightly less ecosystem than Apollo. |
| **GraphQL Federation for BFF** | Emerging | If composing multiple upstream services, Federation is powerful. Not needed for single legacy API. |
| **Subscription (WebSocket)** | Stable in both Strawberry/Ariadne | Only if frontend needs real-time. Adds complexity. Skip for initial BFF. |

---

## 9. Code Example: Wrapping Legacy API

**Legacy API Response** (messy):
```json
{
  "meta": { "count": 100 },
  "data": {
    "results": [
      {
        "id": "1",
        "nested": {
          "details": {
            "title": "Offer",
            "pricing": { "amount": 99.99, "currency": "USD" }
          }
        }
      }
    ]
  }
}
```

**Strawberry BFF** (flattens):
```python
import strawberry
from httpx import AsyncClient

@strawberry.type
class Offer:
    id: str
    title: str
    amount: float
    currency: str

@strawberry.type
class Query:
    @strawberry.field
    async def search_offers(self, query: str) -> list[Offer]:
        async with AsyncClient() as client:
            response = await client.get(
                "https://legacy-api.com/api/search",
                params={"q": query}
            )
            data = response.json()

        # Flatten nested response
        offers = [
            Offer(
                id=item["id"],
                title=item["nested"]["details"]["title"],
                amount=item["nested"]["details"]["pricing"]["amount"],
                currency=item["nested"]["details"]["pricing"]["currency"]
            )
            for item in data["data"]["results"]
        ]
        return offers

schema = strawberry.Schema(Query)
```

**Next.js Frontend**:
```typescript
import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'

const SEARCH_QUERY = `
  query SearchOffers($query: String!) {
    searchOffers(query: $query) {
      id
      title
      amount
      currency
    }
  }
`

export function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['offers', searchTerm],
    queryFn: () =>
      request('http://localhost:8000/graphql', SEARCH_QUERY, {
        query: searchTerm
      })
  })

  return (
    <div>
      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      {isLoading && <p>Loading...</p>}
      {data?.searchOffers.map(offer => (
        <div key={offer.id}>
          <h3>{offer.title}</h3>
          <p>${offer.amount} {offer.currency}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## 10. Quick Decision Table

| Question | Answer | Evidence |
|----------|--------|----------|
| **Should we use GraphQL for BFF?** | Yes | Flattens nested legacy data, supports varied frontend shapes, self-documenting. |
| **Strawberry or Ariadne?** | Strawberry (code-first) preferred | Better FastAPI alignment, steeper adoption curve if schema-first. Both excellent. |
| **Frontend client?** | TanStack Query + graphql-request | Smallest bundle, works with any backend, pairs well with Zustand. |
| **Apollo Client?** | Skip unless you need normalized cache | Overkill for most BFFs. Adds 30KB overhead. |
| **GraphQL Explorer adequate for assessment?** | Yes, superior | Live schema, interactive, self-documenting. Better than manual Swagger docs. |
| **Is GraphQL overkill for simple adapters?** | No, justified | Deeply nested legacy data + varied frontend needs = GraphQL is the right tool. |

---

## Unresolved Questions

1. **DataLoader batching**: Does your legacy API support batch requests (e.g., `/api/offers?ids=1,2,3`), or must N queries be made separately? This affects N+1 prevention strategy.
2. **Legacy API latency**: What's the p99 response time? If >1s, GraphQL's request collapsing will help. If <100ms, overhead negligible.
3. **Real-time needs**: Does frontend need subscriptions (WebSocket)? Both Strawberry and Ariadne support it, but adds complexity. Skip if not needed.
4. **Rate limits on legacy API**: Are there per-IP or per-user limits? If so, GraphQL's ability to coalesce queries is valuable.
5. **Error handling semantics**: Does legacy API use HTTP status codes meaningfully (4xx, 5xx), or always 200 with error flag in body? Affects how BFF translates to GraphQL errors.

---

## Sources

- [Strawberry GraphQL Docs](https://strawberry.rocks/) — Official documentation, FastAPI integration guide
- [Ariadne GraphQL Docs](https://ariadnegraphql.org/) — Official docs, schema-first approach, FastAPI integration
- [FastAPI GraphQL How-To](https://fastapi.tiangolo.com/how-to/graphql/) — Official FastAPI guidance, Strawberry recommended
- [Top 3 Python Libraries for GraphQL](https://blog.graphqleditor.com/top-3-python-libraries-for-graphql) — 2025 comparison
- [Building GraphQL APIs with Python: Strawberry and Ariadne](https://dasroot.net/posts/2025/12/building-graphql-apis-python-strawberry-ariadne/) — 2025 practical guide
- [Using GraphQL with Strawberry, FastAPI, and Next.js](https://blog.logrocket.com/using-graphql-strawberry-fastapi-next-js/) — Full-stack example
- [Apollo Client vs urql vs TanStack Query](https://github.com/dotansimha/graphql-code-generator/discussions/9482) — Official comparison discussion
- [Why I Switched to urql from Apollo Client](https://blog.logrocket.com/why-i-finally-switched-to-urql-from-apollo-client/) — Bundle size, simplicity
- [Not Just Apollo Client: React Query Recommended for GraphQL](https://reearth.engineering/posts/graphql-react-query/) — Why TQ + graphql-request is preferred
- [GraphQL as BFF (Backend-For-Frontends)](https://kapilvij.medium.com/graphql-as-bff-backend-for-frontends-ceecd6a4143b) — Pattern explanation, use cases
- [Optimizing Frontend Development with BFF and GraphQL](https://piembsystech.com/optimizing-frontend-development-with-bff-and-graphql/) — BFF advantages
- [GraphQL vs REST: Real Trade-offs & Benchmarks](https://medium.com/@connect.hashblock/graphql-vs-rest-real-tradeoffs-benchmarks-25ba1a6e94a1) — 2025 analysis
- [REST BFF vs GraphQL: Practical Field Guide](https://medium.com/@keshavagrawal/why-rest-bff-patterns-beat-graphql-when-they-should-a-practical-field-guide-970db1526322) — When each approach wins
- [GraphQL Explorer vs Swagger/OpenAPI Comparison](https://tailcall.run/blog/graphql-vs-openapi-part-1/) — Documentation trade-offs
- [GraphQL Playground/Explorer Benefits](https://www.geeksforgeeks.org/python/documenting-graphql-apis-with-swagger/) — API documentation patterns

---

## Verdict

**ACTIONABLE**

✓ **Use Strawberry GraphQL + FastAPI** for the BFF wrapper. Code-first, native FastAPI integration, excellent async support, self-documenting via GraphQL Explorer.

✓ **Use TanStack Query + graphql-request** on Next.js frontend. Minimal bundle, pairs naturally with Zustand, gives frontend team control over data shapes.

✓ **GraphQL is justified** (not overkill) because your legacy API is deeply nested and frontend needs vary by page.

✓ **Start without subscriptions** — add WebSocket support later if real-time features emerge.

✓ **Use DataLoaders** to prevent N+1 queries against legacy API.

✓ **GraphQL Explorer sufficient** for API documentation during assessment. No Swagger maintenance needed.

---

**Next steps**: Prototype Strawberry BFF wrapping 1–2 legacy API endpoints. Measure latency impact. Assess DataLoader benefit if legacy API doesn't support batch requests.
