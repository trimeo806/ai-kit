---
name: security-reviewer
description: "Use when doing a security review or audit of web application code — frontend (React, Vue, Next.js, HTML/JS), backend (Node.js, Go, Python, Java), or both. Always invoke when user says 'security review', 'check for vulnerabilities', 'OWASP audit', 'is this secure', 'security audit', 'find security issues', 'check auth', 'pen test', or pastes code they want security-vetted. Also invoke when the user asks about XSS, CSRF, injection attacks, JWT security, authentication flaws, insecure headers, secrets leakage, or dependency vulnerabilities in their code. Do NOT wait for an explicit 'security' keyword — any time code is shared and the concern is about whether it can be exploited, use this skill."
user-invocable: true
metadata:
  argument-hint: "[path or description] [--frontend | --backend | --full]"
  keywords: [security, owasp, xss, csrf, injection, sqli, jwt, auth, vulnerability, audit, pentest, headers, csp, cors, secrets]
  platforms: [web, backend, all]
  agent-affinity: [security-auditor, code-reviewer]
  connections:
    enhances: [code-reviewer, fullstack-guardian]
    requires: []
---

# Security Reviewer

Systematic security audit for web application code, based on roadmap.sh security best practices and OWASP Top 10.

## When to Use Reference Files

Load the relevant reference file(s) before scanning:
- Frontend code (`.tsx`, `.jsx`, `.vue`, `.html`, `.js` in UI layers) → read `references/frontend.md`
- Backend code (API routes, controllers, DB queries, auth logic) → read `references/backend.md`
- Both layers present → read both files

---

## Step 0 — Scope Detection

Parse `$ARGUMENTS` for flags:
- `--frontend` → frontend only
- `--backend` → backend only
- `--full` → both (default when no flag)

If no arguments, infer from context:
- File extensions `.tsx/.jsx/.vue/.html` → frontend
- File extensions `.go/.py/.java`, or paths like `routes/`, `controllers/`, `api/`, `middleware/` → backend
- Both present, or `$ARGUMENTS` describes "full stack" → both

Confirm scope in one sentence before proceeding.

---

## Step 1 — Discovery

Identify the files to review:
1. If specific files/paths provided → use them
2. If a directory path → glob for source files (exclude `node_modules`, `dist`, `build`, `.git`)
3. If code pasted inline → treat as the target
4. If nothing specified → ask: "Which files or directories should I audit?"

Read a reasonable subset of files. For large codebases, prioritize:
- Authentication / session management code
- Input handling (form handlers, query params, request body parsers)
- Database queries
- API route definitions
- Configuration files (env handling, secrets)
- HTML templates / JSX rendering user data

---

## Step 2 — Systematic Scan

Work through each checklist category from the reference file(s). For each item:
- Search the code for the relevant pattern
- If the item is violated → record a finding
- If the item is satisfied → note it as ✅ (skip in final report, but track internally)
- If the item cannot be determined from visible code → mark as ⚠️ Needs Verification

Do not generate generic "you should use HTTPS" findings without evidence from the actual code.

---

## Step 3 — Classify Findings

For each finding, assign:

| Field | Options |
|-------|---------|
| **Severity** | 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low |
| **OWASP** | A01–A10 (see mapping below) |
| **Location** | `file.ts:42` or inline snippet |
| **Confidence** | Confirmed / Likely / Possible |

**Severity guide:**
- 🔴 Critical — Direct exploitation path: hardcoded secrets, SQL injection via string concat, auth bypass, RCE
- 🟠 High — Significant risk with moderate effort: missing auth on endpoint, broken JWT validation, no input sanitization on stored data
- 🟡 Medium — Security gap that increases attack surface: missing security headers, no rate limiting, verbose error messages leaking internals
- 🔵 Low — Best practice deviation: no SRI on CDN scripts, missing httpOnly flag but risk is contextual, debug logging in non-critical path

**OWASP Top 10 quick mapping:**
- A01 Broken Access Control → missing auth, IDOR, path traversal
- A02 Cryptographic Failures → plaintext secrets, weak hashing (MD5/SHA1 for passwords), no TLS
- A03 Injection → SQL/NoSQL/LDAP/OS command injection, XSS via unsanitized DOM insertion
- A04 Insecure Design → no rate limiting, predictable resource IDs, missing threat model
- A05 Security Misconfiguration → debug mode on, default creds, exposed stack traces, wrong CORS
- A06 Vulnerable Components → outdated deps with CVEs, known-vulnerable versions
- A07 Auth Failures → weak password policy, no MFA path, insecure session management, JWT alg:none
- A08 Software & Data Integrity → no SRI, unsigned artifacts, unvalidated deserialization
- A09 Logging Failures → no audit log, logging credentials, no alerting
- A10 SSRF → unvalidated URLs fetched server-side, cloud metadata endpoint exposure

---

## Step 4 — Generate Report

Output a structured markdown report. Use this exact template:

---

# Security Review Report
**Date**: {today}
**Scope**: {frontend / backend / full-stack}
**Files Reviewed**: {count} files

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟠 High | N |
| 🟡 Medium | N |
| 🔵 Low | N |
| ⚠️ Needs Verification | N |

**Overall Risk**: {Critical / High / Medium / Low — determined by highest severity present}

---

## Findings

### [FINDING TITLE] · {Severity emoji} {Severity} · {OWASP Category}

**Location**: `path/to/file.ts:42`
**Confidence**: Confirmed / Likely / Possible

**Issue**: One-sentence description of what's wrong.

**Evidence**:
```{lang}
// The problematic code snippet
```

**Risk**: What an attacker can do if this is exploited.

**Fix**:
```{lang}
// The corrected version or pseudocode showing the fix
```

---

*(repeat for each finding, ordered Critical → High → Medium → Low)*

---

## What Looks Good ✅

Brief bullets for security items that are correctly implemented (3–5 items max). This gives the developer a balanced picture.

## Needs Verification ⚠️

Items that require runtime/environment knowledge to confirm (e.g., "Rate limiting appears implemented in middleware — verify it's also applied to `/api/auth/login`").

## Recommended Next Steps

Prioritized action list, starting with Critical fixes.

---

## Tips for Good Findings

- Always anchor findings to actual code lines — don't flag theoretical risks
- For injection vulnerabilities, show the specific unsanitized variable flowing into the dangerous sink
- For missing headers, note where the response is constructed so the fix location is clear
- If a finding depends on an assumption (e.g., "this endpoint is public"), state the assumption explicitly
- When a fix requires a library change, name the recommended library (e.g., `helmet` for Node.js security headers, `bcrypt` for password hashing)
