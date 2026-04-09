# Security Review Report
**Date**: 2026-03-15
**Scope**: Full-stack (Next.js API route, middleware, config)
**Files Reviewed**: 3 files (app/api/auth/route.ts, next.config.js, middleware.ts)

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 2 |
| 🟡 Medium | 3 |
| 🔵 Low | 1 |
| ⚠️ Needs Verification | 3 |

**Overall Risk**: Critical

---

## Findings

### Password Stored in JWT Payload · 🔴 Critical · A02 Cryptographic Failures

**Location**: `app/api/auth/route.ts:10`
**Confidence**: Confirmed

**Issue**: The user's plaintext password is included in the JWT payload, making it readable by anyone who holds the token.

**Evidence**:
```ts
const token = jwt.sign(
  { username, role: 'admin', password },  // include password for convenience
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);
```

**Risk**: Any client, proxy, CDN log, or JavaScript running on the page can decode the JWT and extract the plaintext password. Combined with XSS, this gives an attacker permanent credential access.

**Fix**: Remove `password` from the payload — only include non-sensitive identity claims (`username`, `role`).

---

### Hardcoded Credentials Used as Authentication Source · 🔴 Critical · A07 Authentication Failures

**Location**: `app/api/auth/route.ts:7–8`
**Confidence**: Confirmed

**Issue**: Authentication is performed against a hardcoded `admin`/`admin123` credential pair with a TODO comment.

**Evidence**:
```ts
// TODO: replace with real DB check
if (username === 'admin' && password === 'admin123') {
```

**Risk**: Any repository reader has production credentials. The password appears in all common credential-stuffing wordlists.

---

### Wildcard CORS Combined with Credentials Allowed · 🔴 Critical · A05 Security Misconfiguration

**Location**: `next.config.js:6–11`
**Confidence**: Confirmed

**Issue**: `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` are set simultaneously.

**Evidence**:
```js
{ key: 'Access-Control-Allow-Origin', value: '*' },
{ key: 'Access-Control-Allow-Credentials', value: 'true' },
```

**Risk**: Malicious third-party sites can make authenticated requests to the API on behalf of logged-in users, completely undermining cookie-based session security.

**Fix**: Replace `*` with an explicit origin allowlist. Never combine wildcard origin with `Allow-Credentials: true`.

---

### JWT Algorithm Not Pinned · 🟠 High · A07 Authentication Failures

**Location**: `middleware.ts:10`
**Confidence**: Confirmed

**Issue**: `jwt.verify()` called without the `algorithms` option, leaving algorithm selection to library default and enabling algorithm confusion attacks.

**Evidence**:
```ts
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
```

**Fix**:
```ts
const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
```

---

### 7-Day JWT with No Revocation Mechanism · 🟠 High · A07 Authentication Failures

**Location**: `app/api/auth/route.ts:11`
**Confidence**: Confirmed

**Issue**: Tokens have a 7-day TTL with no server-side revocation, no refresh token pattern, and no logout invalidation. A stolen token cannot be cancelled.

**Fix**: Reduce TTL to 15 minutes; implement refresh tokens with server-side revocation.

---

### No Security Headers (CSP, HSTS, X-Frame-Options, etc.) · 🟡 Medium · A05 Security Misconfiguration

**Location**: `next.config.js`
**Confidence**: Confirmed

**Issue**: The `headers()` block contains only CORS headers. No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` are defined.

**Fix**: Add to `next.config.js`:
```js
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'Content-Security-Policy', value: "default-src 'self'" },
{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
```

---

### No Rate Limiting on Login Endpoint · 🟡 Medium · A04 Insecure Design

**Location**: `app/api/auth/route.ts`
**Confidence**: Confirmed

**Issue**: No rate limiting, leaving the endpoint open to unlimited brute-force.

**Fix**: Apply rate limiting (e.g., `@upstash/ratelimit`, 5 attempts/minute per IP).

---

### No Input Validation or Body Size Limit · 🔵 Low · A04 Insecure Design

**Location**: `app/api/auth/route.ts:5`
**Confidence**: Confirmed

**Issue**: `req.json()` called with no schema validation and no body size cap.

**Fix**: Add `zod` schema validation and a body size guard.

---

## What Looks Good ✅

- `process.env.JWT_SECRET` used for signing/verification — secret not hardcoded.
- `jwt.verify` wrapped in try/catch — malformed tokens handled gracefully.
- 401 response doesn't expose stack traces or internal error details.
- Unauthenticated middleware requests redirect rather than returning 200 with error body.

## Needs Verification ⚠️

- **JWT_SECRET strength**: Verify runtime value is at least 32 random bytes.
- **Middleware matcher coverage**: Confirms `/dashboard/:path*` — verify all protected routes are covered.
- **Client-side token storage**: JWT returned in response body — verify client stores in `httpOnly` cookie, not `localStorage`.

## Recommended Next Steps

1. **[Critical — Immediate]** Remove `password` from JWT payload.
2. **[Critical — Immediate]** Replace hardcoded credentials with DB lookup + `bcrypt.compare()`.
3. **[Critical — Before deploy]** Fix CORS: explicit origin allowlist, remove wildcard + credentials combo.
4. **[High — This sprint]** Pin JWT algorithm: `{ algorithms: ['HS256'] }` in `jwt.verify()`.
5. **[High — This sprint]** Reduce JWT TTL to 15 min; implement refresh token revocation.
6. **[Medium — This sprint]** Add rate limiting to login endpoint.
7. **[Medium — This sprint]** Add security headers block to `next.config.js`.
8. **[Low — Before launch]** Add `zod` schema + body size limit to login handler.
