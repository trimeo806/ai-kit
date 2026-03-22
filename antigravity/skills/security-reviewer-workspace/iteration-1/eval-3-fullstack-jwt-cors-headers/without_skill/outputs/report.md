# Security Review Report — Next.js Auth & API Setup

**Date**: 2026-03-15
**Scope**: Authentication route, Next.js configuration, and middleware

---

## Executive Summary

The submitted code contains **critical and high-severity security vulnerabilities** across all three files. Several issues could lead to full account compromise, credential exposure, and cross-origin data theft. None of this code is production-ready. A complete rewrite of the auth flow is recommended before deployment.

---

## Findings

### CRITICAL-1 — Hardcoded Credentials

**File**: `app/api/auth/route.ts`

The authentication check is a hardcoded `admin`/`admin123` comparison. There is no database lookup, no hashing, and no account management.

**Fix**: Replace with a real DB lookup. Store passwords as salted hashes (bcrypt, argon2id, or scrypt). Never compare plaintext.

---

### CRITICAL-2 — Password Included in JWT Payload

**File**: `app/api/auth/route.ts`

The plaintext password is embedded in the JWT payload: `{ username, role: 'admin', password }`. JWT payloads are Base64-encoded but not encrypted — anyone who holds the token can decode the password immediately.

**Fix**: Remove `password` from the payload entirely. Only include non-sensitive identity claims.

---

### CRITICAL-3 — Wildcard CORS with Credentials Allowed

**File**: `next.config.js`

`Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true` is both spec-violating (browsers reject it) and dangerous in intent. Any origin would be permitted to make credentialed API requests.

**Fix**: Set `Allow-Origin` to a specific trusted origin. Never combine wildcard with credentials.

---

### HIGH-1 — JWT Secret Not Validated at Startup

**Files**: `app/api/auth/route.ts`, `middleware.ts`

`process.env.JWT_SECRET!` suppresses TypeScript's check but does not prevent `undefined` at runtime. Some versions of `jsonwebtoken` accept `undefined` as a secret, making tokens trivially forgeable.

**Fix**: Validate `JWT_SECRET` at startup; fail fast if absent or too short (minimum 32 bytes of entropy).

---

### HIGH-2 — Long-Lived Tokens with No Revocation

**File**: `app/api/auth/route.ts`

`expiresIn: '7d'` with no refresh token pattern and no revocation mechanism means a stolen token is valid for a week with no way to invalidate it.

**Fix**: Use short-lived access tokens (15–60 min) paired with rotating refresh tokens stored in HttpOnly cookies.

---

### HIGH-3 — Token Returned in JSON Body (XSS-Accessible)

**File**: `app/api/auth/route.ts`

Returning the token in the response body forces client-side storage (localStorage/sessionStorage), both readable by JavaScript. Any XSS vulnerability becomes a full session hijack.

**Fix**: Set the token as an `HttpOnly; Secure; SameSite=Strict` cookie.

---

### MEDIUM-1 — No Rate Limiting on Auth Endpoint

No rate limiting or lockout exists on the login route, making it fully open to brute-force and credential stuffing attacks.

**Fix**: Apply rate limiting at middleware or infra level. Use exponential backoff or account lockout after repeated failures.

---

### MEDIUM-2 — Potential Timing-Based Username Enumeration

Ensure login code paths for invalid username vs. invalid password take the same amount of time to prevent timing attacks that enumerate valid usernames.

---

### MEDIUM-3 — JWT Claims Not Inspected in Middleware

**File**: `middleware.ts`

The decoded payload is never examined — a structurally valid token with missing or unexpected claims passes through unconditionally.

**Fix**: Validate required claims (`sub`, `role`) after verification and forward them to downstream handlers.

---

### LOW-1 — HTTPS Not Enforced

Neither config nor middleware enforces HTTPS, risking plaintext token transmission in non-prod or misconfigured environments.

---

### LOW-2 — No CSRF Protection

No CSRF token validation for state-changing endpoints. Compounded by the CORS misconfiguration.

---

## Summary Table

| ID | Severity | Title |
|----|----------|-------|
| CRITICAL-1 | Critical | Hardcoded credentials |
| CRITICAL-2 | Critical | Password embedded in JWT payload |
| CRITICAL-3 | Critical | Wildcard CORS with credentials |
| HIGH-1 | High | JWT secret not validated at startup |
| HIGH-2 | High | Long-lived tokens with no revocation |
| HIGH-3 | High | Token in response body (XSS-accessible) |
| MEDIUM-1 | Medium | No rate limiting |
| MEDIUM-2 | Medium | Timing-based username enumeration |
| MEDIUM-3 | Medium | JWT claims not validated in middleware |
| LOW-1 | Low | HTTPS not enforced |
| LOW-2 | Low | No CSRF protection |
