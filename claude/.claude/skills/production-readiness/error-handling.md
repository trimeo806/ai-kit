# Error Handling Standardization Playbook

Goal: every error in TravelAgentPro is identifiable, traceable, configurable,
and visible.

The canonical envelope and ID format live in `error-schema.md`. This playbook
is the per-release checklist that makes the schema real.

## 1. Specific exception classes

Banned: `throw new Error("something went wrong")` and `catch (e) { /* swallow */ }`.

Required base class hierarchy (per service):

```
AppError                       // abstract, has errorId, traceId, correlationId, context
├─ ValidationError             // input validation failures
├─ AuthError                   // auth/authz failures
├─ UpstreamError               // adapter / 3rd-party failures (subclassed per provider)
│   ├─ EasyGdsError
│   ├─ DuffelError
│   └─ PayloadError
├─ ConfigError                 // missing env / misconfig
├─ NotFoundError
└─ InternalError               // genuine 500s
```

Each subclass:
- Has a stable `errorId` (e.g. `BFF-VAL-0001`).
- Generates a fresh `traceId` (UUID v4) per throw.
- Captures `context` (the inputs / IDs needed to debug — never PII).
- Captures `timestamp` (ISO8601 ms).

### Steps

- [ ] If `apps/bff/src/lib/errors/AppError.ts` (or equivalent) does not exist,
      create it. Same for CMS and any standalone adapter.
- [ ] Convert all touched-this-release `throw new Error(...)` calls to a
      typed subclass.
- [ ] Convert all touched-this-release `catch (e)` blocks to either re-throw
      a typed error or map the upstream error to one.

## 2. ERRORID + TRACEID generation

See `error-schema.md` for the canonical format. The runtime must:

- [ ] Generate `traceId` once per inbound request (middleware) and propagate
      it through AsyncLocalStorage / `ctx`.
- [ ] When an `AppError` is thrown, attach the request's `traceId` to it.
- [ ] Generate `correlationId` as `<originSystem>-<apiCall>-<errorNumber>`
      where:
      - `originSystem` ∈ { `BFF`, `CMS`, `FE`, `EGDS`, `DUFFEL`, ... }
      - `apiCall`     = a short slug for the call site (e.g. `hotels.avails`)
      - `errorNumber` = the numeric tail of the `errorId`
- [ ] `errorId` is always the stable code (e.g. `BFF-UPSTREAM-0007`) — same
      for every occurrence of the same logical error.

## 3. CMS-driven error message mapping

Every `errorId` the code can emit must have a row in the CMS so non-engineers
can edit user-facing copy without a deploy.

- [ ] Collection: `cms/src/collections/ErrorMessages.ts`. Fields:
      ```
      errorId        (text, unique, indexed)
      defaultMessage (text)         # English fallback
      translations   (relationship → Translations)
      severity       (select: info|warn|error|fatal)
      userActionable (checkbox)     # "is there something the user can do?"
      docsUrl        (text, optional)
      ```
- [ ] Seed all known `errorId`s. Add to the seeding script so a fresh CMS
      starts with the full set.
- [ ] **Verifier script**: `pnpm --filter cms run verify:error-ids`. It must:
      1. Walk the codebase for all `errorId` literals.
      2. Fetch all CMS `ErrorMessages` rows.
      3. Fail (non-zero exit) if any code-emitted `errorId` is missing in CMS,
         or any orphan exists in CMS that no code path emits.
- [ ] Wire the verifier into CI as a release-blocking step.

## 4. Frontend toast surface

Every error must surface as a toast in addition to whatever inline UI exists.
Even when a flow has a graceful fallback, the user (and our debug session)
benefits from seeing the error happened.

- [ ] Global config flag (e.g. `apps/spa/app/config/appConfig.ts`):
      ```ts
      export const appConfig = {
        errors: {
          alwaysToastOnError: true,   // leave true for now
        },
      };
      ```
- [ ] Central error handler / API client interceptor reads the flag. When
      `true`, every caught error → `toast.error(<resolved message>)` keyed
      by `errorId` so duplicate errors do not stack.
- [ ] Toast content shows the user-facing message (resolved from CMS) and a
      collapsible "Details" with `errorId`, `traceId`, `correlationId`,
      `timestamp` — copyable for support.
- [ ] Verify on at least one happy and one failing flow per release.

## 5. Logging integration

When an `AppError` is thrown:

- [ ] The catch boundary logs with level `error` (or `warn` for expected
      validation failures), passing the full envelope.
- [ ] No double-logging: log once at the boundary, not at every layer
      between throw and surface.

## 6. Record results

| Check | Status | Notes |
|---|---|---|
| AppError hierarchy present | PASS / FAIL | service(s) |
| Catch blocks updated | count | files |
| traceId middleware | PASS / FAIL | … |
| ErrorMessages collection | PASS / FAIL | row count |
| `verify:error-ids` script | PASS / FAIL | exit code |
| Toast flag wired | PASS / FAIL | path |
| Toast verified live | PASS / FAIL | flow tested |
