# Canonical Error Schema (v1)

This file is referenced — do **not** edit per-release. Bump the version and
update consumers if the envelope changes.

## Envelope

Every error response (BFF / CMS / adapters) and every error log line uses:

```json
{
  "errorId":       "BFF-UPSTREAM-0007",
  "traceId":       "f0c4e2a8-3b1b-4a4a-9a8b-7c5d2e1f0a99",
  "correlationId": "EGDS-hotels.avails-0007",
  "timestamp":     "2026-05-02T14:33:21.482Z",
  "message":       "Upstream provider returned 502",
  "userMessage":   "We couldn't reach our hotel partner. Please try again.",
  "severity":      "error",
  "context": {
    "tenantId": "...",
    "userId":   "...",
    "request":  { "path": "/api/hotels/search", "method": "POST" },
    "input":    { "destination": "MAD", "checkin": "..." }
  }
}
```

PII rule: `context.input` MUST NOT contain raw payment details, raw passport
numbers, or full passwords. Hash or omit.

## Field semantics

| Field | Type | Generated where | Stable? |
|---|---|---|---|
| `errorId` | `string` | Code, at the throw site (constant per error class) | **Yes** — same for every occurrence |
| `traceId` | UUID v4 | Request middleware | **No** — unique per throw |
| `correlationId` | `<originSystem>-<apiCall>-<errorNumber>` | Composed in the AppError constructor | Stable per (system+call+errorId) tuple |
| `timestamp` | ISO8601 ms | AppError constructor | unique per throw |
| `message` | `string` | Code (English, technical) | yes |
| `userMessage` | `string` | Resolved at surface from CMS by `errorId` | yes (CMS-editable) |
| `severity` | `info`\|`warn`\|`error`\|`fatal` | Code | yes |
| `context` | object | Code, populated by catch boundary | per throw |

## ERRORID format

```
<SERVICE>-<CATEGORY>-<NUMBER>
```

- `SERVICE`  ∈ { `BFF`, `CMS`, `FE`, `EGDS`, `DUFFEL`, `PAYLOAD`, ... }
- `CATEGORY` ∈ { `VAL`, `AUTH`, `UPSTREAM`, `CFG`, `NF`, `INT`, ... }
- `NUMBER`   = zero-padded 4-digit, monotonically allocated per category

Examples:
- `BFF-VAL-0001` — missing `destination` in hotels search
- `BFF-UPSTREAM-0007` — EasyGDS 502 on `/products/hotels/avails`
- `FE-AUTH-0002` — refresh-token expired in browser

Allocation: when introducing a new error class, take the next free number in
its `(SERVICE, CATEGORY)` pair. The CMS verifier script enforces uniqueness.

## CorrelationID format

```
<ORIGIN>-<API_CALL>-<ERROR_NUMBER>
```

- `ORIGIN`       = where the error originated (the system that *threw* it,
                   not necessarily the system that *surfaced* it)
- `API_CALL`     = short dotted slug for the call site (e.g. `hotels.avails`)
- `ERROR_NUMBER` = the numeric tail of `errorId`

Examples:
- `EGDS-hotels.avails-0007`
- `BFF-hotels.search-0001`
- `FE-checkout.submit-0003`

## Runtime helpers (target API)

```ts
class AppError extends Error {
  errorId: string;          // stable
  traceId: string;          // UUID v4
  correlationId: string;    // composed
  timestamp: string;        // ISO8601 ms
  severity: Severity;
  context: Record<string, unknown>;

  constructor(args: {
    errorId: string;
    originSystem: string;
    apiCall: string;
    severity?: Severity;
    message?: string;
    cause?: unknown;
    context?: Record<string, unknown>;
  });

  toJSON(): ErrorEnvelope;  // emits the envelope above (sans userMessage)
}
```

Surface layer (BFF response, FE toast) is responsible for resolving
`userMessage` from the CMS by `errorId`.

## Versioning

- v1 — initial. Anything that breaks this envelope is a v2.
