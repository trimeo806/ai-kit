# Security Review Report
**Date**: 2026-03-15
**Scope**: Frontend
**Files Reviewed**: 2 files (inline — `src/components/CommentDisplay.tsx`, `src/hooks/useAuth.ts`)

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 1 |
| 🟡 Medium | 1 |
| 🔵 Low | 1 |
| ⚠️ Needs Verification | 2 |

**Overall Risk**: High

---

## Findings

### Unsanitized HTML Rendered via dangerouslySetInnerHTML · 🟠 High · A03 Injection (XSS)

**Location**: `src/components/CommentDisplay.tsx:13`
**Confidence**: Confirmed

**Issue**: The `commentHtml` prop is rendered directly into the DOM using `dangerouslySetInnerHTML` without sanitization, enabling stored XSS if the value originates from user input or an untrusted API.

**Evidence**:
```tsx
<div dangerouslySetInnerHTML={{ __html: commentHtml }} />
```

**Risk**: If `commentHtml` contains attacker-controlled content, the browser executes any embedded `<script>` tags, inline event handlers (`onerror`, `onload`), or `javascript:` URIs. This allows session hijacking (stealing the auth token from `localStorage`), account takeover, phishing redirects, and full DOM manipulation on behalf of the victim.

**Fix**: Install `dompurify` and sanitize before rendering:
```tsx
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(commentHtml);
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```
If rich HTML is not required, remove `dangerouslySetInnerHTML` and use `<div>{commentHtml}</div>` — React escapes it automatically.

---

### Auth Token Stored in localStorage · 🟡 Medium · A07 Auth Failures

**Location**: `src/hooks/useAuth.ts:9`
**Confidence**: Confirmed

**Issue**: The JWT is stored in `localStorage`, which is readable by any JavaScript running on the page — including XSS payloads.

**Evidence**:
```ts
localStorage.setItem('auth_token', token);
```

**Risk**: An XSS attacker calls `localStorage.getItem('auth_token')` and exfiltrates the token to authenticate remotely as the victim. Combined with the XSS finding above, full account takeover is a two-step exploit.

**Fix**: Store tokens in `httpOnly; Secure; SameSite=Strict` cookies set by the server. The frontend never reads the token — cookies are sent automatically and are inaccessible to JavaScript.

---

### Missing Content-Type Header on Login Fetch · 🔵 Low · A05 Security Misconfiguration

**Location**: `src/hooks/useAuth.ts:5–8`
**Confidence**: Confirmed

**Issue**: The login `fetch` sends a JSON body without `Content-Type: application/json`, which can cause server-side body misparse or bypass type-based validation.

**Fix**: Add `headers: { 'Content-Type': 'application/json' }` to the fetch options.

---

## What Looks Good ✅

- `username` renders as `{username}` — React auto-escapes it, no XSS risk.
- `logout()` removes the token from storage.
- No hardcoded secrets or credentials are present.

## Needs Verification ⚠️

- Whether the backend sanitizes `commentHtml` before storing it (defence in depth).
- Whether `/api/login` enforces CSRF protection once cookies are adopted.

## Recommended Next Steps

1. Add `DOMPurify.sanitize()` around every `dangerouslySetInnerHTML` use, or eliminate it in favour of plain text rendering.
2. Move auth token storage to `httpOnly` cookies (coordinate with backend team).
3. Add `Content-Type: application/json` to the login fetch.
4. Verify server-side HTML sanitization and CSRF enforcement.
