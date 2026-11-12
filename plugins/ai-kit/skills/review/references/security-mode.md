# Security mode — dedicated security review / OWASP audit

Runs when the user asks for a security review or audit ("security review", "is this secure",
"OWASP audit", "check for vulnerabilities", "check auth"), or pastes code and the concern is
whether it can be exploited. Read-only: it reports, it never edits code.

The same checklists also run as a **lens** inside local and pr mode on security-sensitive files
(auth, sessions/tokens, input handling, DB queries, API routes, templates rendering user data,
config/secrets). There they add findings to the normal review; this mode is the standalone audit.

## 1. Scope

Parse the arguments: `--frontend`, `--backend`, `--full` (default). Without a flag, infer:
- `.tsx/.jsx/.vue/.html` or UI layers → frontend
- `.go/.py/.java`, `routes/`, `controllers/`, `api/`, `middleware/`, `app/api/**/route.ts` → backend
- both present → full

Targets: named files or directories (glob, excluding `node_modules`, `dist`, `build`, `.git`),
pasted code, or — when nothing is named — local mode's diff scope. Still nothing → ask which
files to audit. Confirm the scope in one sentence before scanning.

On a large codebase, prioritise: auth and session code, input handling, DB queries, route
definitions, config and secret handling, templates rendering user data.

## 2. Load the checklists

- frontend → `security-frontend.md`
- backend → `security-backend.md`
- full → both
- plus the SEC rules of `code-review-standards.md`, the checklist's Security section
  (`${CLAUDE_PLUGIN_ROOT}/references/shared/code-review-guidelines.md`), and the repo's own rules
  (Security & data section: its auth wrappers, HTTP client, input guards, secret handling).

## 3. Scan

Walk every checklist item against the code:
- violated → finding;
- satisfied → note internally, mention the notable ones under "Done well";
- can't be decided from the code (runtime config, infra, upstream guard) → a question under
  "Questions for the author", phrased as what to verify and where.

**Map auth coverage before judging individual checks.** A guard can be correct and still protect
the wrong set of routes, and that gap is invisible if you only ask "is this check right?". For
every auth mechanism in scope — Next.js `middleware.ts` `matcher`, Express `router.use`, Spring
Security / JAX-RS `@RolesAllowed`, route-wrapper helpers, gateway path rules — write down which
paths or handlers it covers, then list the routes in scope it does *not* cover. An uncovered
route that serves data or mutates state is a finding (A01), not a question: state the assumption
it rests on ("no other guard is shown for `/api/*`") and grade it like missing auth. Ask a
question only when the code in scope shows another guard might exist.

Every finding is anchored to real code. No generic "use HTTPS" findings without evidence. For
injection, show the untrusted value flowing into the sink. For missing headers, name where the
response is built. State any assumption the finding depends on ("assuming this route is public").

For a large scope, split by area into at most 6 `ai-kit:code-reviewer` agents, pasting
the matching checklist sections into each prompt, as local mode step 5 does.

## 4. Grade

Grade on the shared scale with `severity-guide.md` — one scale for every review. Start from:

| Exploitability | Team severity |
|---|---|
| Direct exploitation path: hardcoded secret, injection via string concat, auth bypass, RCE | `security` |
| Significant risk with moderate effort: missing auth on an endpoint, broken JWT validation, unsanitised stored data | `security` |
| Widens the attack surface: missing security headers, no rate limiting, verbose errors leaking internals | `should-fix` (raise to `security` when reachable and exploitable in this code) |
| Best-practice deviation: no SRI on CDN scripts, contextual cookie flag, debug logging on a cold path | `nit` or `should-fix` per the guide |

Add per security finding:
- **OWASP**: A01–A10
  - A01 Broken Access Control — missing auth, IDOR, path traversal
  - A02 Cryptographic Failures — plaintext secrets, weak password hashing, no TLS
  - A03 Injection — SQL/NoSQL/LDAP/OS command, XSS via unsanitised DOM insertion
  - A04 Insecure Design — no rate limiting, predictable IDs
  - A05 Security Misconfiguration — debug on, default creds, stack traces, wrong CORS
  - A06 Vulnerable Components — dependencies with known CVEs
  - A07 Auth Failures — weak sessions, JWT `alg:none`, long-lived tokens
  - A08 Software & Data Integrity — no SRI, unsigned artifacts, unsafe deserialisation
  - A09 Logging Failures — credentials in logs, no audit trail
  - A10 SSRF — unvalidated server-side URL fetch
- **Confidence**: Confirmed / Likely / Possible
- **Fix**: corrected code or pseudocode; name the library when the fix needs one (`helmet`,
  `bcrypt`, `DOMPurify`, parameterised queries via the ORM). Never include working exploit code.

## 5. Report

`report-template.md`, with the security columns filled (OWASP, Confidence) and the overall risk
in the verdict line: the highest severity present. End with a prioritised next-steps list,
`security` items first. In pr mode the same findings become drafts per `pr-mode.md`.
