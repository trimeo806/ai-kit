# Security Review Report

**Component**: `CommentDisplay.tsx` + `useAuth.ts`
**Date**: 2026-03-15

## Summary

Two high-severity vulnerabilities were found: a Cross-Site Scripting (XSS) issue and insecure auth token storage. They chain together — XSS enables direct token theft.

## Vulnerability 1 — XSS via dangerouslySetInnerHTML

**File**: `src/components/CommentDisplay.tsx`, line 11
**Severity**: High

`dangerouslySetInnerHTML={{ __html: commentHtml }}` renders raw HTML into the DOM without sanitization. If `commentHtml` contains user-supplied content, an attacker can inject `<script>` tags or event-handler attributes that execute in other users' browsers, stealing tokens, cookies, or session data.

**Fix**: Either render as plain text (`<p>{commentHtml}</p>`, React auto-escapes it), or sanitize with DOMPurify before passing to `dangerouslySetInnerHTML`.

## Vulnerability 2 — Auth Token in localStorage

**File**: `src/hooks/useAuth.ts`, lines 10-11
**Severity**: High

`localStorage` is readable by any JavaScript on the page. An XSS payload can call `localStorage.getItem('auth_token')` and send it to an attacker's server. The token also persists indefinitely with no expiry.

**Fix**: Store the token in an `HttpOnly` cookie set by the server. `HttpOnly` cookies are invisible to JavaScript regardless of XSS.

Also missing: `Content-Type: application/json` header on the fetch call.

## Issue 3 — Missing Error Handling (Minor)

`res.json()` is called without checking `res.ok`, which can silently store `undefined` as the token on login failure.

**Fix**: Check `if (!res.ok) throw new Error('Login failed')` before parsing JSON.

## Summary Table

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | CommentDisplay.tsx:11 | XSS via unsanitized dangerouslySetInnerHTML | High |
| 2 | useAuth.ts:10-11 | Auth token in localStorage (XSS-readable) | High |
| 3 | useAuth.ts:8-13 | No HTTP error check before JSON parse | Low |
