# Observability Playbook

Goal: every release leaves the system more searchable and self-documenting
than it found it.

## 1. Structured JSON logging

Logs that are not JSON are invisible in ELK / Datadog. The rule is: **no
free-form `console.log` on the server.**

### Logger contract

Every server log line is a single JSON object with at minimum:

```ts
{
  ts: string;            // ISO8601 with milliseconds
  level: "debug"|"info"|"warn"|"error"|"fatal";
  service: string;       // "bff" | "cms" | "frontend-ssr" | "<adapter>"
  event: string;         // dot.case event name, e.g. "hotels.search.start"
  traceId: string;       // propagated per request (UUID v4)
  correlationId?: string;// from <originSystem>-<apiCall>-<errorNumber> when available
  errorId?: string;      // present on level >= warn if mapped
  tenantId?: string;
  userId?: string;
  durationMs?: number;
  // arbitrary domain fields below — keys snake_case or camelCase, choose one and stick
}
```

### Implementation steps

- [ ] One logger module per app, exporting a singleton (`apps/bff/src/lib/logger.ts`,
      `cms/src/lib/logger.ts`). Use `pino` for Node (fastest, JSON-native) unless an
      existing logger is already in place.
- [ ] Replace `console.log/error/warn` in changed files with `logger.<level>({...})`.
      Do not do a project-wide sweep in this skill — only files touched this release.
- [ ] Add a `traceId` middleware that pulls from `X-Trace-Id` header or
      generates a UUID v4. Attach to `req.ctx` or AsyncLocalStorage so deep
      callers can read it without prop-drilling.
- [ ] Verify against a running container: `docker logs <bff> | tail -20 | jq .`
      should parse every line.

## 2. OpenAPI / Swagger from code

Hand-written API docs drift the moment someone forgets. Generate from code.

- [ ] BFF: if using Express, adopt `zod-to-openapi` or `express-zod-api`. If
      using NestJS, the `@nestjs/swagger` decorators are the source of truth.
- [ ] CMS (Payload): Payload exposes `/api/openapi` natively in recent
      versions — verify and snapshot it.
- [ ] CI step: `pnpm run gen:openapi` writes to `docs/api/openapi.yaml`.
      A second CI step diffs the generated file against the committed copy
      and fails if they differ. This is the anti-drift latch.
- [ ] On every release run, execute `pnpm run gen:openapi` and commit the
      diff if any. If the script does not exist, create it as a permanent
      piece of release tooling — do not skip.

## 3. Flow diagrams (Diagram Drawer skill)

Six canonical flows, each lives under `docs/`:

| Flow | Doc target |
|---|---|
| Homepage | `docs/homepage-flow.{md,svg}` |
| Flights | `docs/flights-flow.{md,svg}` |
| Hotels | `docs/hotels-flow.{md,svg}` (UML companion: `hotels-booking-flow-uml.md`) |
| Packages | `docs/packages-flow.{md,svg}` |
| Transport | `docs/transport-flow.{md,svg}` |
| Activities | `docs/activities-flow.{md,svg}` (existing: `activities-flow.html`) |

Process:
1. Determine which flows were touched this release. Use git: `git diff
   --name-only <prev-tag>..HEAD | grep -E '(HotelListing|Flight|Package|Transfer|Activit|Homepage)'`.
2. For each touched flow, invoke the Diagram Drawer skill with the flow name
   and let it produce/update the diagram. If the skill is not available in
   this environment, record a `blocker` memory and queue a follow-up — do
   **not** hand-draft the diagram inside this run.
3. Diff each updated diagram in the release log so reviewers can see the
   shape change at a glance.

## 4. Record results

| Check | Status | Notes |
|---|---|---|
| Structured logs in changed files | PASS / FAIL | files swept |
| Logger contract present | PASS / FAIL | path |
| traceId middleware wired | PASS / FAIL | … |
| OpenAPI regenerated | PASS / FAIL | diff size |
| OpenAPI drift CI gate | PASS / FAIL / TBD | … |
| Diagrams refreshed | list of flows | path |
