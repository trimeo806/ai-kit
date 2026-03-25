---
name: code-review-standards
description: "Use when reviewing code for security, performance, type safety, logic, architecture, or state machine issues"
user-invocable: false
disable-model-invocation: true
---

# Code Review Standards

Authoritative, enforceable rules for general code reviews. Each rule has a unique ID, severity, pass criterion, and fail criterion. Used by code-reviewer during `/review` and `/audit --code` to evaluate backend services, API layers, shared utilities, and web logic outside UI components.

**Scope**: General code — backend, services, API routes, hooks, utilities, state management. For UI component rules (tokens, props, structure, design system), see `packages/design-system/skills/ui-lib-dev/references/audit-standards.md`.

**Severity scale:**
- `critical` — security vulnerability, data loss, or breaking behaviour
- `high` — type safety violation, significant logic error, high performance impact
- `medium` — code smell, maintainability concern, minor logic gap
- `low` — style inconsistency, minor optimization opportunity

---

## SEC: Security

**Scope**: Backend, API routes, services, data access layers, any code with network I/O or credential handling. Covers OWASP Top 10 patterns relevant to server-side and general application code.

**Activation gate**: Always check SEC rules when reviewing API routes, controllers, services, or any file that handles authentication, user input, or external data.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| SEC-001 | No SQL/NoSQL injection — user input parameterized or escaped | critical | Parameterized queries (`?` placeholders, ORM queries) | String interpolation in query: `"SELECT * FROM users WHERE id = " + userId` |
| SEC-002 | No command injection — shell commands never include unsanitized user input | critical | Shell args escaped via `child_process` with args array form; no template strings passed to exec | `exec("ls " + userInput)` or `eval(userProvidedCode)` |
| SEC-003 | No XSS — user-generated content sanitized before rendering | critical | HTML sanitization library used (DOMPurify, sanitize-html) before setting innerHTML | `element.innerHTML = userContent` without sanitization |
| SEC-004 | No secrets or credentials in source code or environment variable logs | critical | Credentials via env vars; no `console.log(process.env)` or full config dumps | API key, password, or token literal in source; env object logged wholesale |
| SEC-005 | Auth checks present on protected routes — no endpoint reachable without authorization | critical | Every protected route/handler checks auth token/session before processing | Handler calls data layer without auth guard; `if (token)` check bypassed |
| SEC-006 | Input validation at all external boundaries — request body, query params, path params validated | high | Zod/Joi/class-validator schema applied to all incoming data before use | Request body used directly: `const { userId } = req.body` with no schema check |
| SEC-007 | SSRF prevention — URL arguments validated against allowlist before outbound fetch | high | URL parsed, hostname checked against allowlist; user-supplied URLs proxied server-side only | `fetch(req.query.url)` or `axios.get(userProvidedUrl)` with no origin check |
| SEC-008 | Sensitive data not logged — PII, credentials, tokens excluded from logs | high | Log statements sanitize or omit sensitive fields | `logger.info("User login", { password, token })` with raw sensitive values |

---

## PERF: Performance

**Scope**: General code performance — database access patterns, algorithmic efficiency, bundle imports, async handling. Component render performance (re-renders, memoization) is covered by `audit-standards.md` REACT rules.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| PERF-001 | No N+1 queries — related data loaded in batch or joined, not per-item | high | Single query with JOIN or batch fetch (`WHERE id IN (...)`) | Loop calling `findById(item.id)` for each item in a collection |
| PERF-002 | No unbounded queries — all list/search queries have limit/pagination | high | `LIMIT`, `take`, `pageSize` applied; cursor or offset pagination | `findAll()` or `db.collection.find({})` with no limit on potentially large datasets |
| PERF-003 | Inefficient O(n²) or worse loops replaced with set/map lookups | medium | O(n) lookup structures for deduplication, membership tests | Nested loops for deduplication: `arr.forEach(x => result.filter(y => y.id === x.id))` |
| PERF-004 | Expensive operations behind appropriate caching layer | medium | Redis, in-memory cache, or memoization applied to expensive deterministic operations | `computeExpensiveReport(userId)` called on every request with no cache |
| PERF-005 | Large library imports use named or path imports, not full barrel imports | medium | `import { specific } from 'lodash/specific'` or `import specific from 'lodash/specific'` | `import _ from 'lodash'` when only one utility is used |
| PERF-006 | Heavy modules loaded lazily where applicable | low | Dynamic `import()` for large optional features; code-split by route in web app context | Synchronous top-level import of large library only needed in one feature path |

---

## TS: Type Safety

**Scope**: TypeScript files across all platforms. Rules apply to all `.ts` and `.tsx` files outside UI component internals.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| TS-001 | No unsafe `any` — max 1 per file, documented with justification comment | high | Types are specific; `any` used sparingly with `// justification:` comment | `as any`, `: any`, `any[]` used repeatedly across file without comment |
| TS-002 | No unvalidated type casts at external boundaries | critical | Runtime validation (Zod, io-ts, type guard function) before `as MyType` on external data | `response.data as UserData` or `JSON.parse(str) as Config` with no schema validation |
| TS-003 | Type guards present at all trust boundaries — API responses, file reads, message bus payloads | high | `isUser(data): data is User` type guard or schema parse before consuming external data | Function accepts `unknown` from external source and immediately casts to domain type |
| TS-004 | Generic constraints are as tight as the usage requires | medium | `<T extends Record<string, string>>` where only string-keyed objects make sense | `<T>` (unconstrained) used when caller intent clearly requires a narrower shape |
| TS-005 | Non-null assertions (`!`) only when null is logically impossible and documented | high | `element!` annotated with comment explaining why null is impossible here | `userId!` used without comment on value that could plausibly be null/undefined |
| TS-006 | No `strict: false` or `noImplicitAny: false` suppressions added to tsconfig for a module | critical | `tsconfig.json` maintains strict mode settings; no per-file `// @ts-nocheck` except documented legacy files | New file adds `// @ts-nocheck` or tsconfig has strict checks disabled for a new path |

---

## LOGIC: Logic & Correctness

**Scope**: All files. Checks algorithmic correctness, null safety, error path completeness, and async safety.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| LOGIC-001 | Null/undefined handled at all call sites — optional chaining or explicit null checks | high | `user?.profile?.avatar` or `if (user && user.profile)` before access | `user.profile.avatar` without guard when `user` or `profile` can be null/undefined |
| LOGIC-002 | Edge cases handled — empty array, zero, empty string, missing optional field | medium | Function tested/guarded for empty collections, zero values, and absent optionals | `items[0].id` used without checking `items.length > 0`; division without zero check |
| LOGIC-003 | All error paths return or throw — no silent swallowing of exceptions | high | `catch` block either rethrows, returns error result, or logs + returns safe fallback | Empty `catch {}` or `catch (e) { /* ignored */ }` with no downstream effect |
| LOGIC-004 | Race conditions guarded in async flows — concurrent mutations protected | high | Optimistic locking, atomic DB operations, or mutex used where concurrent writes are possible | Two async handlers update same record without a transaction or version check |
| LOGIC-005 | Array/string index arithmetic correct — no off-by-one errors | medium | Boundary conditions verified: `i < arr.length` not `i <= arr.length`; `slice(0, n)` not `slice(1, n)` for first n | Loop iterates one past end; slice/substring bounds shifted by 1 |
| LOGIC-006 | Equality comparisons use strict `===` — no coercive `==` in typed code | medium | All comparisons use `===` and `!==` | `== null` outside intentional null-or-undefined check; `== false` instead of `=== false` |

---

## DEAD: Dead Code

**Scope**: All files. Checks for unreachable code, unused exports, and orphaned utilities.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| DEAD-001 | No unreachable code after unconditional return or throw | medium | All statements after `return`/`throw`/`break` are removed | Code block after `return value;` that can never execute |
| DEAD-002 | No unused exports — exported identifiers are imported somewhere in the project | medium | Every exported function/class/const used by at least one consumer | `export function helperFoo()` with zero import sites across the codebase |
| DEAD-003 | No orphaned utility files — all utility modules have active importers | low | Every file in `utils/`, `helpers/`, `lib/` imported by at least one module | Utility file exists but no other file imports from it |

---

## ARCH: Architecture

**Scope**: Module structure, dependency direction, and boundary compliance. Apply when reviewing multi-file changes or new modules.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| ARCH-001 | Single responsibility per module — each file has one clear, nameable purpose | medium | File contains one cohesive concept: one service, one hook, one utility domain | File mixes unrelated concerns: data fetching + formatting + routing in one module |
| ARCH-002 | Module boundaries respected — internal module files not imported from outside the module | high | External code imports only from module's public `index.ts` barrel | `import { helper } from '../auth/internal/token-parser'` — bypasses `auth/index.ts` |
| ARCH-003 | No circular dependencies between modules | critical | Import graph is a DAG; no cycle between two or more modules | Module A imports Module B which imports Module A (even transitively) |
| ARCH-004 | Layer violations absent — UI/presentation layer does not import from data/infra layer directly | high | UI components receive data via props, hooks, or context — never import repositories or ORMs | React component imports `UserRepository` from data layer directly |
| ARCH-005 | Dependency direction follows domain layering: UI → Domain → Data → Infra | high | Higher layers depend on lower; lower layers never import from higher | Database entity imports from a React component or a Next.js page route |

---

## STATE: State Management

**Scope**: Redux slices, Zustand stores, XState machines, React context, and any stateful service. Apply when reviewing state-related files.

| Rule ID | Rule | Severity | Pass | Fail |
|---------|------|----------|------|------|
| STATE-001 | State machine completeness — every state has at least one defined exit transition | high | All states listed in transitions map; no terminal state without explicit `done`/`error` exit | Loading state has no transition to error or success — machine can get stuck |
| STATE-002 | Error and timeout states explicitly modelled | high | `error` state and `timeout` state present in machine definition with appropriate transitions | Happy-path-only machine; network error or slow response leaves UI in loading forever |
| STATE-003 | Transition guards present where required — guarded transitions have explicit conditions | medium | `guard: (ctx, event) => ctx.retryCount < 3` on conditional transitions | Transition fires unconditionally when the business rule requires a condition check |
| STATE-004 | No concurrent mutations on shared state — reducers/actions are pure; side effects isolated | critical | Reducers are pure functions; side effects in middleware (redux-thunk, redux-saga, effects) only | Reducer directly mutates external state or calls `fetch()` inside a reducer body |

---

# Mode Applicability

| Section | Lightweight Review | Escalated Review (knowledge-retrieval active) | Notes |
|---------|--------------------|-----------------------------------------------|-------|
| SEC | OWASP surface scan (SEC-001–008) | + auth flow trace, input validation chain | Always check; skip for pure utility functions with no I/O |
| PERF | Obvious N+1, unbounded queries (PERF-001–002) | + bundle impact, caching strategy audit | Full check on 10+ files or any file >300 LOC |
| TS | Basic `any` and cast checks (TS-001–003) | + generic constraints, tsconfig audit | Always check in TypeScript files |
| LOGIC | Null checks, error paths (LOGIC-001–003) | + cross-module impact, race condition trace | Always check |
| DEAD | Unreachable code (DEAD-001) | + unused exports across project, orphaned files | Full check on escalated pass only |
| ARCH | Circular imports (ARCH-003) | + full layer violation scan, boundary audit | Full check on multi-file or new module changes |
| STATE | Machine completeness (STATE-001–002) | + concurrent mutation audit, guard coverage | Check when state files in scope |

---

# Lightweight vs Escalated Reference

| Rule IDs | Lightweight (default) | Escalated only |
|----------|-----------------------|----------------|
| SEC-001–005 | Yes | — |
| SEC-006–008 | — | Yes |
| PERF-001–002 | Yes | — |
| PERF-003–006 | — | Yes |
| TS-001–003 | Yes | — |
| TS-004–006 | — | Yes |
| LOGIC-001–003 | Yes | — |
| LOGIC-004–006 | — | Yes |
| DEAD-001 | Yes | — |
| DEAD-002–003 | — | Yes |
| ARCH-003 | Yes | — |
| ARCH-001–002, ARCH-004–005 | — | Yes |
| STATE-001–002 | Yes | — |
| STATE-003–004 | — | Yes |

**Rule**: Lightweight review checks only the "Lightweight" column. Escalate to audit when a Critical finding is detected, activating the full column.

---

# Anti-Patterns

Known violations from production code reviews:

| Anti-Pattern | Description | Rule Violations |
|-------------|-------------|-----------------|
| Direct query interpolation | `"SELECT * FROM " + tableName + " WHERE id = " + id` — SQL injection risk | SEC-001 |
| Wholesale env dump | `console.log(process.env)` or `logger.debug(config)` exposing secrets | SEC-004 |
| Unguarded external cast | `const user = response.data as User` with no Zod/validation before the cast | TS-002, SEC-006 |
| Unbounded `findAll` | `repository.findAll()` on a growing dataset — memory and latency risk | PERF-002 |
| Empty catch | `try { ... } catch (e) {}` — silently swallows errors, hides failures | LOGIC-003 |
| Cross-module internal import | `import { x } from '../payments/internal/stripe-utils'` — bypasses module contract | ARCH-002 |
| Reducer side effect | `fetch(url)` or `setState(...)` inside a Redux reducer body | STATE-004 |
| Orphaned helper | `utils/string-helpers.ts` with zero imports after a refactor | DEAD-003 |
| Missing auth guard | Route handler processes request before checking `req.session.userId` | SEC-005 |
| Looping DB call | `for (const id of ids) { await db.find(id) }` — N+1 pattern | PERF-001 |
| Unsafe non-null assertion | `user!.profile.avatar` where `user` comes from an API response | TS-005, LOGIC-001 |
| Stuck state machine | `loading` state with no `error` transition — UI freezes on network failure | STATE-002 |
