# Security Audit Report — Express API (routes/users.js)

**Date**: 2026-03-15
**Risk Rating**: CRITICAL — Do not go live without addressing the issues below.

## Executive Summary

Every route in this file is affected by at least one critical vulnerability. The most severe are SQL injection on all three endpoints and a hardcoded JWT secret. This code must not go to production in its current state.

---

## Critical Findings

**1. SQL Injection — All Three Endpoints**

All queries concatenate user input directly into SQL strings. An attacker can bypass login entirely with `' OR '1'='1' --`, dump arbitrary data via the profile endpoint, and corrupt records via the update endpoint. Fix: use parameterized queries on every `db.query()` call — `$1`, `$2` placeholders with values as a separate array.

**2. Hardcoded JWT Secret (`'mysecret123'`)**

This is committed in source code, trivially guessable, and short. Anyone with repo access can forge tokens for any user ID. Fix: move to `process.env.JWT_SECRET` using a cryptographically random 256-bit value. Rotate immediately if this has been in any shared repo.

**3. Plaintext Password Comparison**

The login query compares passwords directly in SQL, implying they are stored in plaintext or reversibly encoded. A DB breach exposes all user passwords. Fix: hash with `bcrypt` (cost 12+) or `argon2` at registration; use `bcrypt.compare()` at login.

---

## High Findings

**4. No Authentication or Authorization on `/profile/:id` and `/update/:id`**

Both endpoints are fully unauthenticated. Anyone can read any profile or overwrite any user's data by guessing an integer ID (IDOR). Fix: add JWT verification middleware; assert the token's `userId` matches the requested `id`.

**5. `SELECT *` Overexposes Sensitive Columns**

The profile query returns every column including the password field. Fix: explicitly select only the columns needed (id, name, email, bio, created_at).

---

## Medium Findings

**6. 30-Day JWT Expiry with No Revocation** — stolen tokens are valid for a month with no way to invalidate them. Reduce to 15–60 min with refresh tokens.

**7. No Input Validation** — no type, format, or length checks on any field. Use `zod`, `joi`, or `express-validator`.

**8. No Rate Limiting on Login** — the endpoint is brute-forceable with no throttle. Apply `express-rate-limit` (5–10 attempts / 15 min per IP).

---

## Low Findings

**9. Unhandled Async Errors** — no `try/catch` on any handler; unhandled rejections may crash the process or leak stack traces. Wrap all handlers and return generic `500` responses.

---

## Summary Table

| # | Finding | Severity | OWASP |
|---|---------|----------|-------|
| 1 | SQL Injection (Login) | Critical | A03 Injection |
| 2 | SQL Injection (Profile) | Critical | A03 Injection |
| 3 | SQL Injection (Update) | Critical | A03 Injection |
| 4 | Hardcoded JWT Secret | Critical | A02 Crypto Failures |
| 5 | Plaintext Passwords | Critical | A02 Crypto Failures |
| 6 | No Auth / IDOR | High | A01 Broken Access Control |
| 7 | SELECT * Data Overexposure | High | A02 Crypto Failures |
| 8 | Excessive JWT Expiry | Medium | A07 Auth Failures |
| 9 | No Input Validation | Medium | A03 Injection |
| 10 | No Rate Limiting | Medium | A07 Auth Failures |
| 11 | Unhandled Errors | Low | A05 Misconfiguration |

**Remediation order**: SQLi fixes first, then secret rotation, then password hashing (needs data migration), then auth middleware, then the remaining medium/low items. Retest before launch.
