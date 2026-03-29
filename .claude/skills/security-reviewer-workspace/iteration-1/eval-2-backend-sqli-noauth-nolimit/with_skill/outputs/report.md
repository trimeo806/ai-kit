# Security Review Report
**Date**: 2026-03-15
**Scope**: Backend
**Files Reviewed**: 1 file (`routes/users.js`)

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 3 |
| 🟡 Medium | 3 |
| 🔵 Low | 1 |
| ⚠️ Needs Verification | 3 |

**Overall Risk**: Critical

---

## Findings

### SQL Injection — Login Endpoint · 🔴 Critical · A03 Injection

**Location**: `routes/users.js:8`
**Confidence**: Confirmed

**Issue**: User-supplied `email` and `password` are concatenated directly into a SQL query string.

**Evidence**:
```js
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`
);
```

**Risk**: Authentication bypass with `' OR '1'='1`, full table dump, or OS command execution depending on DB privileges.

**Fix**:
```js
db.query('SELECT * FROM users WHERE email = $1 AND password_hash = $2', [email, hashedPassword])
```

---

### SQL Injection — Profile Endpoint · 🔴 Critical · A03 Injection

**Location**: `routes/users.js:16`
**Confidence**: Confirmed

**Issue**: `req.params.id` interpolated directly into a SQL query.

**Evidence**:
```js
`SELECT * FROM users WHERE id = ${req.params.id}`
```

**Fix**:
```js
db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
```

---

### SQL Injection — Update Endpoint · 🔴 Critical · A03 Injection

**Location**: `routes/users.js:21-22`
**Confidence**: Confirmed

**Issue**: Three injection points in a single UPDATE query.

**Evidence**:
```js
`UPDATE users SET name='${name}', bio='${bio}' WHERE id=${req.params.id}`
```

**Fix**:
```js
db.query('UPDATE users SET name = $1, bio = $2 WHERE id = $3', [name, bio, req.params.id])
```

---

### Plaintext Password Storage/Comparison · 🟠 High · A02 Cryptographic Failures

**Location**: `routes/users.js:8`
**Confidence**: Confirmed

**Issue**: Login query compares raw password input directly against the DB column, indicating plaintext storage.

**Risk**: Database breach immediately exposes all user passwords.

**Fix**:
```js
// Registration
const hash = await bcrypt.hash(password, 12);
// Login
const match = await bcrypt.compare(inputPassword, user.password_hash);
```

---

### No Authentication on Profile and Update Endpoints · 🟠 High · A01 Broken Access Control

**Location**: `routes/users.js:15`, `routes/users.js:20`
**Confidence**: Confirmed

**Issue**: Both endpoints lack any authentication middleware — anyone can access them without a token.

**Fix**: Add `authenticateToken` middleware using `jwt.verify` and apply to both routes.

---

### IDOR — Any User Can Update Any Account · 🟠 High · A01 Broken Access Control

**Location**: `routes/users.js:20-23`
**Confidence**: Confirmed

**Issue**: No ownership check — the target `id` comes from the URL with no verification it belongs to the caller.

**Fix**:
```js
if (req.user.userId !== parseInt(req.params.id, 10)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

### Hardcoded JWT Secret · 🟡 Medium · A02 Cryptographic Failures

**Location**: `routes/users.js:10`
**Confidence**: Confirmed

**Issue**: JWT signed with `'mysecret123'` — hardcoded, short, guessable.

**Fix**: `process.env.JWT_SECRET` with a randomly generated value of at least 32 bytes.

---

### Excessive JWT Expiry (30 Days, No Revocation) · 🟡 Medium · A07 Authentication Failures

**Location**: `routes/users.js:10`
**Confidence**: Confirmed

**Fix**: Reduce TTL to 15–60 minutes; implement refresh-token revocation.

---

### No Rate Limiting on Login Endpoint · 🟡 Medium · A04 Insecure Design

**Location**: `routes/users.js:6`
**Confidence**: Confirmed

**Fix**: Apply `express-rate-limit` (max 10 requests per 15 minutes) to the `/login` route.

---

### Missing Explicit JWT Algorithm on Verification · 🔵 Low · A07 Authentication Failures

**Location**: `routes/users.js` (no `jwt.verify` present yet)
**Confidence**: Likely

**Issue**: When `jwt.verify` is added, omitting `{ algorithms: ['HS256'] }` enables `alg: none` attacks.

**Fix**:
```js
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
```

---

## What Looks Good ✅

- Consistent `async/await` usage avoids callback-era error-swallowing.
- Unified error message on login (`'Invalid email or password'`) prevents username enumeration — though negated by the SQLi.
- Modular `express.Router()` structure makes adding middleware straightforward.

## Needs Verification ⚠️

- **Global security headers**: Verify `app.use(helmet())` is present in `app.js`.
- **CORS configuration**: Verify CORS is not `origin: '*'` with `credentials: true`.
- **Error handling**: No `try/catch` blocks — verify a global error handler prevents DB stack traces reaching responses.

## Recommended Next Steps

1. **Immediately** — Replace all 3 string-concatenated SQL queries with parameterized queries.
2. **Immediately** — Hash passwords with `bcrypt` (cost ≥ 12).
3. **Before go-live** — Add auth middleware + ownership check on update endpoint.
4. **Before go-live** — Move JWT secret to `process.env.JWT_SECRET`.
5. **Before go-live** — Add `express-rate-limit` to login.
6. **Post-launch** — Reduce JWT TTL; implement refresh-token revocation.
7. **Ongoing** — Add `npm audit` to CI pipeline.
