# Backend & API Security Checklist

Based on roadmap.sh API security best practices and OWASP Top 10.

---

## 1. Authentication & JWT

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| No Basic Auth | `Authorization: Basic` over HTTP, or Basic Auth as primary mechanism | A07 |
| Strong JWT secret | JWT secret shorter than 32 chars, or hardcoded in source | A02 |
| Short JWT TTL | `expiresIn` set to days/weeks without refresh token logic | A07 |
| Algorithm not from header | `jwt.verify(token, secret, { algorithms: ['HS256'] })` missing explicit alg | A07 |
| No sensitive data in payload | PII, passwords, or secrets stored in JWT payload | A02 |
| Algorithm confusion prevented | Code that trusts `alg` field from token header (e.g., accepts `none`) | A07 |

**Code patterns to search:**
- `jwt.verify(` — check for `{ algorithms: [...] }` option
- `jwt.sign(` — check `expiresIn` value and payload contents
- `process.env.JWT_SECRET` length / hardcoded strings
- `Buffer.from(` with `base64` for auth (Basic Auth indicator)

---

## 2. OAuth 2.0

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| redirect_uri validated server-side | No check that redirect_uri matches registered values | A01 |
| State parameter used | OAuth flow without `state` param (CSRF vector) | A01 |
| Code exchange (not token response) | `response_type=token` in OAuth flow (implicit grant) | A07 |
| Scope defined and validated | No scope validation; accepting any scope | A01 |

**Code patterns to search:**
- OAuth callback handlers — check for `state` parameter validation
- `response_type=token` in auth URLs
- `redirect_uri` — check if it's validated against a whitelist

---

## 3. Session Management

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Max retry / lockout | Login endpoint with no rate limit or lockout after N fails | A07 |
| Short session TTL | Sessions that never expire | A07 |
| Session invalidation on logout | Logout that only clears client-side token, not server-side session | A07 |
| Secure session cookies | `session` cookies without `HttpOnly`, `Secure`, `SameSite` flags | A07 |

**Code patterns to search:**
- `res.cookie(` — check flags: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`
- Session store — check TTL configuration
- Logout handler — does it call `session.destroy()` or equivalent?

---

## 4. Input Validation & Injection

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| SQL injection | String concatenation in SQL queries | A03 |
| NoSQL injection | Unsanitized MongoDB/Redis operators from user input | A03 |
| Command injection | `exec()`, `spawn()`, `system()` with user input | A03 |
| Path traversal | File paths built from user input without normalization | A01 |
| XXE prevention | XML parsing without entity expansion disabled | A03 |
| YAML deserialization | `yaml.load()` (unsafe) vs `yaml.safeLoad()` | A08 |
| Input bounds checking | No max length on string inputs; no numeric range validation | A03 |

**Code patterns to search:**
- SQL: `query(` with template literals or string concat — `"SELECT * FROM users WHERE id = " + req.params.id`
- MongoDB: `findOne({ $where: userInput })`, `find(req.body)` (unparsed object injection)
- `exec(`, `execSync(`, `child_process.spawn(` — check if args include user data
- `path.join(` or `fs.readFile(` with `req.params` or `req.query`
- `xml2js.parseString(` without `{ explicitArray: false, explicitCharkey: false }` disabled entities
- `yaml.load(` — should be `yaml.safeLoad(` or `yaml.load(str, { schema: yaml.SAFE_SCHEMA })`

---

## 5. Access Control & Authorization

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| All endpoints authenticated | Routes without auth middleware | A01 |
| RBAC/ABAC enforced | Resource access without ownership check | A01 |
| IDOR prevention | `findById(req.params.id)` without verifying ownership | A01 |
| UUID over auto-increment IDs | Sequential integer IDs in public-facing APIs | A04 |
| Private APIs IP-whitelisted | Admin/internal endpoints accessible from any IP | A01 |
| Directory listing disabled | Web server serving directory indexes | A05 |

**Code patterns to search:**
- Route definitions without middleware — `app.get('/admin/', handler)` (no auth middleware)
- `findById(req.params.id)` — check if followed by ownership verification
- Auto-increment IDs in API responses (look for sequential `id: 1, id: 2` patterns)
- Admin routes — check they have role checks

---

## 6. Rate Limiting & DDoS Protection

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Rate limiting on auth endpoints | Login/register/password-reset without rate limit | A04 |
| Global rate limiting | No rate limit middleware applied globally | A04 |
| Large payload protection | No body size limit on request parsing | A04 |
| No HTTP blocking on heavy ops | Synchronous blocking operations in request handlers | A04 |

**Code patterns to search:**
- `express-rate-limit`, `ratelimit`, `throttle` — check if applied to auth routes
- `bodyParser.json({ limit: '...' })` — check if limit is set
- `app.use(rateLimit(...))` — check scope (global vs route-specific)

---

## 7. Sensitive Data & Secrets

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| No hardcoded secrets | API keys, DB passwords, JWT secrets in source code | A02 |
| Env vars for all credentials | Credentials not using `process.env` / OS env | A02 |
| No credentials in logs | `console.log(req.body)` logging passwords | A09 |
| No credentials in responses | Password hashes or tokens returned in API responses | A02 |
| No credentials in URLs | Tokens/passwords in query string (logged by proxy/server) | A02 |
| Password hashed properly | Passwords stored or compared in plaintext; use of MD5/SHA for passwords | A02 |

**Code patterns to search:**
- Hardcoded strings matching: `/api[_-]?key/i`, `/secret/i`, `/password/i`, `/token/i` — not using `process.env`
- `console.log(req.body`, `console.log(password`, `logger.info({ ...user }`
- `SELECT password FROM users` — check if hash returned in response
- `md5(password)`, `sha1(password)`, `sha256(password)` for password storage (not hashing-with-salt)
- `bcrypt.hash(` or `argon2.hash(` — check this IS being used for passwords

---

## 8. Security Headers (Backend)

Server responses should include these headers. Check middleware configuration:

| Header | Expected | Where to Look | OWASP |
|--------|----------|---------------|-------|
| `X-Content-Type-Options` | `nosniff` | `helmet()`, manual `res.setHeader` | A05 |
| `X-Frame-Options` | `DENY` | `helmet()` or nginx | A05 |
| `Content-Security-Policy` | Defined, restrictive | `helmet.contentSecurityPolicy()` | A03 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | `helmet.hsts()` | A02 |
| `X-Powered-By` | Must be **removed** | `app.disable('x-powered-by')` | A05 |
| `Server` | Must be **removed/obscured** | Nginx `server_tokens off;` | A05 |

**Code patterns to search:**
- `require('helmet')` — is it being used? Any disabled features?
- `app.disable('x-powered-by')` — present?
- `res.setHeader('X-Powered-By', ...)` — should not exist

---

## 9. CORS Configuration

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Specific origins only | `origin: '*'` with credentials | A05 |
| Origin validated server-side | Dynamic CORS that blindly reflects `req.headers.origin` | A05 |
| Credentials only to trusted origins | `credentials: true` combined with wildcard origin | A01 |

**Code patterns to search:**
- `cors({ origin: '*' })` — flag if credentials are also enabled
- `origin: (origin, callback) => callback(null, origin)` — reflects all origins (dangerous)
- `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`

---

## 10. Error Handling & Information Disclosure

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Stack traces not exposed | Error handler returning `err.stack` to client | A05 |
| Debug mode disabled in prod | `NODE_ENV !== 'production'` checks absent | A05 |
| Generic error messages | Specific error messages revealing DB schema, file paths, or user existence | A05 |
| 404 vs 403 for unauthorized | Returning 404 for auth-failed resource access (prevents enumeration) | A01 |

**Code patterns to search:**
- `res.json({ error: err.stack })` or `res.json(err)`
- `app.use(errorHandler())` — check what it exposes
- `if (process.env.NODE_ENV !== 'production')` guard on debug features

---

## 11. Logging & Monitoring

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Authentication events logged | Login success/failure not logged | A09 |
| Sensitive data not logged | Passwords, tokens, PII in log output | A09 |
| Centralized logging configured | Only `console.log` with no structured logging library | A09 |
| Log injection prevention | User input included raw in log messages | A09 |

**Code patterns to search:**
- Auth routes — is there a `logger.info('Login attempt...')` or similar?
- `logger.info(req.body)` — logs entire request body including password
- `console.log(user.password)`

---

## 12. Dependency & Build Security

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| No known-vulnerable packages | `npm audit`, `yarn audit` output | A06 |
| Lock files committed | Missing `package-lock.json` or `yarn.lock` | A06 |
| No unused dependencies | Large number of unused packages increases attack surface | A06 |
| CI/CD security analysis | No SAST/SCA tooling configured | A06 |

**Where to check:**
- `package.json` — look for pinned versions vs `^` / `~` ranges on security-critical packages
- `package-lock.json` — present? Up to date?
- CI config (`.github/workflows/`, `Jenkinsfile`) — `npm audit`, `snyk`, or `trivy` steps
