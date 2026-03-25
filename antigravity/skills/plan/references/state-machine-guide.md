# State Machine Modeling Guide

## ASCII Notation

| Symbol | Meaning |
|--------|---------|
| `[STATE_NAME]` | State |
| `──(event)──▸` | Transition with trigger |
| `──◇ condition ──▸` | Decision/guard |
| `◉ [DONE]` | Terminal (success) |
| `✖ [FAILED]` | Terminal (error) |

## Template

```
[INITIAL]
    │
  (start)
    ▼
[STATE_A] ──(error)──▸ [ERROR] ──(retry)──▸ [STATE_A]
    │                     │
  (success)           (max retries)
    ▼                     ▼
[STATE_B]              ✖ [FAILED]
    │
  (complete)
    ▼
◉ [DONE]
```

## Common Patterns

### Auth Flow
```
[UNAUTHENTICATED] ──(login)──▸ [AUTHENTICATING]
    ▲                              │
    │                      ┌──(success)──(failure)──┐
    │                      ▼                        ▼
    │               [AUTHENTICATED]           [AUTH_ERROR]
    │                      │                        │
    └─────(logout)─────────┘          (retry)───────┘
```

### Async Data Loading
```
[IDLE] ──(fetch)──▸ [LOADING] ──(success)──▸ [LOADED]
                        │                       │
                    (error)                 (refetch)
                        ▼                       │
                    [ERROR] ◄───────────────────┘
                        │
                    (retry)──▸ [LOADING]
                    (give up)──▸ ✖ [FAILED]
```

### Form Wizard
```
[STEP_1] ──(next)──▸ [STEP_2] ──(next)──▸ [STEP_3]
    ▲                    │ ▲                   │
    └──(back)────────────┘ └──(back)───────────┘
                                               │
                                           (submit)
                                               ▼
                                        [SUBMITTING]
                                          │       │
                                      (success) (error)
                                          ▼       ▼
                                     ◉ [DONE]  [ERROR]
```

## Validation Checklist

- [ ] Every state has ≥1 exit transition (no orphans)
- [ ] Every state reachable from INITIAL
- [ ] Error states explicitly handled (not silently ignored)
- [ ] Timeout/cancel paths exist for async states
- [ ] Guard conditions are exhaustive (no gaps)
- [ ] Concurrent state mutations are safe
- [ ] Terminal states clearly marked
- [ ] No implicit states hiding between explicit ones

## When to Generate

**DO** generate when:
- Feature has ≥3 distinct states
- Async operations with loading/error/success
- Multi-step user flows (wizards, checkout)
- Connection/session management
- Retry/backoff logic

**DON'T** generate when:
- Simple CRUD operations
- Stateless utility functions
- Pure data transformations
- Single request/response APIs
