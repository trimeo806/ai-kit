# Language lens — language-specific correctness checks

Read the section for each language in the review set, in any mode. It is the language-specific half
of the correctness question, kept out of the main files so a review only pays for the languages it
touches. Subagents can't resolve this path: read it here and paste the matching section into the
`code-reviewer` prompt.

Apply it **in addition to** the general correctness questions — error handling, edge cases,
off-by-one and boundary conditions, performance, N+1 — not instead of them. **Project rules win**:
the Stack, Conventions and Testing sections of the repo's `AGENTS.md` name the framework, versions
and house rules; where they say something different from this file, follow them. A language not
listed here: apply the general questions and the project rules only.

## Java / Kotlin (JVM)

- **Error handling** — unchecked null risks (`Optional.get()` on request data), swallowed `catch`
  blocks, a domain error with no exception type the caller can act on.
- **Transactions** — multi-step writes inside one transaction; read-only paths marked so; no
  annotation-driven transaction on a `private` method or a self-invoked call (proxy skipped); no
  long-running I/O inside a transaction; a checked exception that should roll back actually does.
- **Data access** — N+1 (a repository call per element, a lazy association resolved in a loop or
  stream); new queries filtering or sorting on unindexed columns; list endpoints without pagination.
- **Concurrency** — shared mutable state in singletons; `parallelStream` without an isolated pool;
  blocking calls on a reactive or event-loop thread.
- **Caching** — every cache has an invalidation or TTL story.
- **Migrations** — backward compatible (nullable column → backfill → constraint), re-runnable, no
  destructive change without a rollout plan.

## TypeScript / JavaScript

- **Types** — no `any`, no unchecked `as` casts on external data; validate request and response
  shapes at the boundary.
- **Async** — every promise awaited or deliberately detached; independent awaits run in parallel;
  errors from `fetch` and non-2xx responses handled.
- **Frontend** — `code-review-guidelines.md` § 4; effects with correct dependencies; stable list keys.
- **Server** — auth checked in the handler or a middleware that really covers the route; no secret
  in a public env variable.

## Python

- **Errors** — no bare `except:` / `except Exception` that hides a failed write; context managers for
  files, connections and locks.
- **Mutability** — no mutable default arguments; no shared module-level state mutated per request.
- **Async** — no blocking I/O inside `async def`; tasks awaited or tracked.
- **Data access** — N+1 through ORM lazy loading; queries built with parameters, never f-strings.
- **Types** — type hints on public functions when the repo uses a type checker.

## Go

- **Errors** — every `err` checked and wrapped with context (`%w`); no `panic` for expected failures.
- **Concurrency** — goroutines have an owner and a stop path (`context`); no data race on shared maps;
  channels closed by the sender only.
- **Resources** — `defer` closes bodies, rows and files right after the error check.
- **Context** — request `context.Context` passed down, not replaced with `context.Background()`.

## C# / .NET

- **Async** — no `.Result` / `.Wait()` on async code; `CancellationToken` passed through.
- **Disposal** — `using` for disposables; `HttpClient` from a factory, not per request.
- **Data access** — EF Core N+1, missing `AsNoTracking` on read paths, unbounded queries.

## Unit tests (every language)

New logic has a test that exercises the branch the change introduced, not only the happy path.
