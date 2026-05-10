# Production Readiness — <RELEASE TAG>

- **Date**: <YYYY-MM-DD>
- **Branch**: <branch>
- **Run by**: <human / agent>
- **Previous release tag**: <prev tag>

---

## Phase 1 — Asset & payload minimization

| Check | Status | Notes |
|---|---|---|
| JS/CSS minified |  |  |
| Brotli at edge |  | curl evidence |
| Gzip at edge |  | curl evidence |
| Images WebP |  | N images converted |
| Lazy-loading boundaries |  | files |
| API payload trim |  | endpoints + dropped fields |

## Phase 2 — Observability

| Check | Status | Notes |
|---|---|---|
| Structured logs in changed files |  | files swept |
| Logger contract present |  | path |
| traceId middleware |  |  |
| OpenAPI regenerated |  | diff size |
| OpenAPI drift CI gate |  |  |
| Diagrams refreshed |  | flows |

## Phase 3 — Error handling

| Check | Status | Notes |
|---|---|---|
| AppError hierarchy |  |  |
| catch blocks updated |  | count |
| traceId attached |  |  |
| CMS ErrorMessages |  | row count |
| `verify:error-ids` script |  | exit code |
| Toast flag wired |  | path |
| Toast verified live |  | flow |

## Phase 4 — Learnings

- (DGC memory) ...
- (Skill update) ...

## Deferred / blockers

- ...

## Sign-off

- [ ] All checks PASS or have a recorded justification.
- [ ] Release tag can proceed.
