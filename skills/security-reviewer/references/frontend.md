# Frontend Security Checklist

Based on roadmap.sh frontend security best practices and OWASP Top 10.

---

## 1. Transport Security

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| HTTPS enforced | `http://` hardcoded URLs; mixed content loads | A02 |
| No mixed content | HTTP resources loaded on HTTPS pages | A02 |
| HSTS header set | Missing `Strict-Transport-Security` in response headers | A02 |

**Code patterns to search:**
- `http://` in fetch/axios/XHR calls (flag if not localhost/dev)
- `Content-Security-Policy` header value — check if `upgrade-insecure-requests` is present

---

## 2. Content Security Policy (CSP)

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| CSP header present | No `Content-Security-Policy` header defined | A05 |
| No `unsafe-inline` scripts | `'unsafe-inline'` in script-src directive | A03 |
| No `unsafe-eval` | `'unsafe-eval'` in script-src | A03 |
| Nonces/hashes for inline scripts | Inline `<script>` tags without nonce | A03 |
| Restrictive default-src | `default-src *` or missing default | A05 |

**Code patterns to search:**
- `unsafe-inline`, `unsafe-eval` in CSP strings
- Inline `<script>` blocks without `nonce=` attribute
- `meta http-equiv="Content-Security-Policy"` (weaker than header; note it)

---

## 3. XSS (Cross-Site Scripting)

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| No raw `innerHTML` with user data | `element.innerHTML = userInput` | A03 |
| No `dangerouslySetInnerHTML` with untrusted data | React `dangerouslySetInnerHTML={{ __html: userInput }}` | A03 |
| No `document.write` with user data | `document.write(userInput)` | A03 |
| No unsafe `eval` of user data | `eval(userInput)`, `new Function(userInput)` | A03 |
| URL parameters sanitized before DOM insertion | `location.search` or `URLSearchParams` directly into innerHTML | A03 |
| Output encoding applied | User data rendered without escaping in templates | A03 |

**Code patterns to search:**
- `innerHTML\s*=` — check RHS for user-controlled variables
- `dangerouslySetInnerHTML`
- `document.write(`
- `eval(` — check if argument can be user-controlled
- `new Function(`

---

## 4. CSRF (Cross-Site Request Forgery)

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| CSRF token on state-changing requests | POST/PUT/DELETE without CSRF token | A01 |
| SameSite cookie attribute | Cookies set without `SameSite=Strict` or `SameSite=Lax` | A01 |
| Custom header for API requests | Non-simple requests lack custom header (e.g., `X-Requested-With`) | A01 |

**Code patterns to search:**
- Cookie set calls without `SameSite` attribute
- Form submissions without hidden CSRF token field
- Fetch/axios calls to state-changing endpoints — check for CSRF header

---

## 5. Sensitive Data in Client

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| No secrets in frontend code | API keys, secrets, tokens hardcoded in JS | A02 |
| No sensitive data in localStorage | Auth tokens, PII stored in `localStorage` | A02 |
| Tokens in httpOnly cookies | JWT/session tokens in non-httpOnly cookies (accessible via JS) | A07 |
| No sensitive data in URL params | Passwords, tokens passed as query strings | A02 |

**Code patterns to search:**
- `localStorage.setItem` — check if value contains token/auth/key/secret patterns
- `sessionStorage.setItem` — same check
- `REACT_APP_SECRET`, `VITE_SECRET_KEY`, any env var with `SECRET`/`KEY`/`TOKEN` in frontend bundle
- Query params containing `token=`, `password=`, `secret=`

---

## 6. Third-Party Dependencies & Scripts

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Subresource Integrity (SRI) on CDN scripts | `<script src="https://cdn...">` without `integrity=` attribute | A08 |
| No pinned but outdated dependencies | `package.json` with `*` or very wide version ranges | A06 |
| Known-vulnerable packages | Dependencies with documented CVEs | A06 |

**Code patterns to search:**
- `<script src="https://` without `integrity="`
- `<link href="https://` without `integrity="`
- `package.json` — flag packages known to have security advisories (check versions)

---

## 7. Authentication & Session (Frontend Layer)

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Tokens not exposed in source | JWT/tokens visible in frontend JS bundle | A07 |
| Login form over HTTPS | Login form action pointing to HTTP | A07 |
| No autocomplete on password fields | `<input type="password">` without `autocomplete="new-password"` | A07 |
| Session cleared on logout | Logout handler clears localStorage/cookies | A07 |

---

## 8. Security Headers (Frontend-Relevant)

These headers should be set by the server but are detectable in frontend-adjacent config files (Next.js `next.config.js`, `_headers` files, nginx config, etc.):

| Header | Expected Value | OWASP |
|--------|----------------|-------|
| `X-Content-Type-Options` | `nosniff` | A05 |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | A05 |
| `Content-Security-Policy` | Defined, restrictive | A03 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` or stricter | A05 |
| `Permissions-Policy` | Restricts camera/mic/geo where not needed | A05 |

**Where to check in frontend code:**
- `next.config.js` → `headers()` function
- `netlify.toml` / `vercel.json` → headers section
- `.htaccess` or `nginx.conf`
- Framework middleware (Express, Fastify with `helmet`)

---

## 9. CORS Configuration

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Specific origins only | `Access-Control-Allow-Origin: *` on credentialed requests | A05 |
| Credentials not sent to wildcard | `withCredentials: true` with wildcard CORS | A01 |

---

## 10. Input Validation

| Check | What to Look For | OWASP |
|-------|-----------------|-------|
| Client-side validation present | No validation before form submission | A03 |
| Not relying solely on client-side | Only frontend validation (note: server must also validate) | A03 |
| File upload type validation | `<input type="file">` without `accept=` restriction | A03 |
| File size limits | No size limit on file uploads | A04 |
