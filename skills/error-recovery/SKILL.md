---
name: error-recovery
description: Retry strategies, circuit breakers, fallbacks, and graceful degradation patterns for handling transient and persistent failures
user-invocable: false

metadata:
  agent-affinity: [debugger, developer, backend-developer]
  keywords: [retry, timeout, circuit-breaker, fallback, resilience, error-handling, backoff, graceful-degradation]
  platforms: [all]
  triggers: ["retry logic", "timeout handling", "circuit breaker", "fallback strategy", "transient error", "error recovery"]
  connections:
    enhances: [debug, problem-solving]
---

# Error Recovery

Patterns for handling transient failures, persistent errors, and graceful degradation.

## Retry Strategies

### Exponential Backoff
Use for transient network/service errors. Never retry immediately.

```
attempt 1: wait 1s
attempt 2: wait 2s
attempt 3: wait 4s
attempt N: wait min(2^N seconds, maxDelay)
```

**Rules**:
- Max 3–5 attempts for user-facing operations
- Max 10 attempts for background jobs
- Add jitter (±20%) to prevent thundering herd
- Do NOT retry on: 4xx client errors, auth failures, validation errors

### Linear Backoff
Use when you need predictable retry intervals (e.g., polling for async job completion).

```
wait = baseDelay * attemptNumber
```

## Circuit Breaker

Prevent cascading failures when a downstream service is degraded.

```
CLOSED → (failure threshold exceeded) → OPEN → (timeout elapsed) → HALF-OPEN → (probe succeeds) → CLOSED
                                                                              → (probe fails) → OPEN
```

**Thresholds** (adjust per SLA):
- Open after: 5 failures in 60s window
- Half-open after: 30s in OPEN state
- Close after: 2 consecutive successes in HALF-OPEN

## Fallback Patterns

| Scenario | Fallback |
|----------|---------|
| External API unavailable | Return cached/stale data with `stale: true` flag |
| Database read timeout | Return from read replica or cache |
| Feature service down | Degrade gracefully — disable feature, show placeholder |
| Auth service unreachable | Fail closed (reject requests), never fail open |
| Search unavailable | Fall back to DB query or show "search unavailable" |

## Timeout Budgets

Set timeouts at every I/O boundary:

| Operation | Recommended Timeout |
|-----------|-------------------|
| External HTTP call | 5–10s (with retry) |
| DB query (OLTP) | 3s |
| DB query (reporting) | 30s |
| File I/O | 5s |
| Cache read | 100ms |
| Internal service call | 2s |

**Cascade protection**: Total request timeout must be less than the sum of all nested timeouts. Use context propagation to pass deadlines through the call chain.

## Error Classification

Before deciding on recovery strategy, classify the error:

| Type | Examples | Recovery |
|------|---------|---------|
| Transient | Network blip, 503, timeout | Retry with backoff |
| Rate limit | 429 | Retry after `Retry-After` header |
| Client error | 400, 422, validation fail | Do NOT retry — fix the request |
| Auth error | 401, 403 | Do NOT retry — escalate to user |
| Persistent | DB down, disk full | Circuit breaker + fallback + alert |
| Logic error | NPE, assertion fail | Do NOT retry — fix the code |

## Graceful Degradation Checklist

When a component fails, verify:
- [ ] Error is logged with correlation ID
- [ ] User sees a meaningful message (not a stack trace)
- [ ] Partial results returned where possible (not empty response)
- [ ] Health check endpoint reflects degraded state
- [ ] Downstream services are notified if relevant
- [ ] On-call is alerted for Critical/High severity

## Related Skills
- `problem-solving` — Root cause analysis when recovery fails
- `debug` — Tracing error origins in logs and execution paths
