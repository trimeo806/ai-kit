---
name: production-readiness
description: "Run the per-release production-readiness sweep — asset/payload minimization, structured logging + OpenAPI sync, error handling standardization (ERRORID/TRACEID/toast), UI/Lighthouse audit, and flow diagram refresh. Trigger when cutting a release, hardening for production, or when the user says 'production readiness', 'release prep', 'pre-release sweep', 'UI audit', 'lighthouse pass', or invokes /production-readiness."
metadata:
  argument-hint: "[release tag or branch]"
  triggers: "/production-readiness, production readiness, release prep, pre-release sweep, UI audit, lighthouse pass, harden for prod, asset audit, payload check, bundle size, logging audit, openapi sync, error standardization"
  agents: "developer, frontend-developer, backend-developer, devops-engineer, tester"
  platforms: "all"
---

<objective>
Run the standing production-readiness sweep across the stack so every release
ships with the same minimum bar for performance, observability, and operability.
The sweep is idempotent — re-running on a clean release reports "no changes needed".
</objective>

<when_to_run>
- Before tagging any release branch (`stg`, `release/*`, `main`).
- After any phase touching: API endpoints, CMS collections, FE bundle config,
  error surfaces, or core application flows.
- On demand via `/production-readiness` or trigger phrases above.
</when_to_run>

<process>

## Phase 0 — Frame the run (always)

1. Capture the release tag/branch and today's date. Name the release log
   `docs/releases/<YYYY-MM-DD>-<branch>-prod-readiness.md`.
2. **Determine which phases to run** from the trigger phrase or by asking. Map:

   | Trigger / intent | Phases |
   |---|---|
   | "release prep", "production sweep", "harden for prod", `/production-readiness` (no args) | 1, 2, 3, 4 |
   | "UI audit", "lighthouse pass", "frontend audit", "mobile audit" | 4 |
   | "asset audit", "payload check", "bundle size" | 1 |
   | "logging audit", "openapi sync", "diagram refresh" | 2 |
   | "error standardization", "errorId sweep", "toast audit" | 3 |

3. **Read only the playbook(s) for the phases in scope** — do not read the
   others. Reading all five eagerly burns tokens; lazy-load on demand.

   - Phase 1 → `assets-payload.md`
   - Phase 2 → `observability.md`
   - Phase 3 → `error-handling.md` (+ `error-schema.md` only if introducing a
     new error class or changing the envelope)
   - Phase 4 → `ui-audit.md`

4. Materialize a task checklist for the phases in scope. Tick each off
   as you go — don't batch.

## Phases 1–4 — Run scoped playbooks

For each in-scope phase, follow its playbook end-to-end. Pass criteria,
checklists, commands, and output tables live in the playbook — do not
duplicate them here. The playbook is the source of truth.

- **Phase 1 — Asset & payload minimization** → `assets-payload.md`
- **Phase 2 — Maintainability & observability** → `observability.md`
- **Phase 3 — Error handling standardization** → `error-handling.md`
  (canonical envelope: `error-schema.md`, reference-only)
- **Phase 4 — UI / Lighthouse audit** → `ui-audit.md`

## Phase 5 — Capture learnings (always)

- For each non-trivial fix or surprise, record it in the release log under
  `## Learnings`.
- If a recurring pattern emerges, update the relevant dev skill or queue a
  follow-up task.
- Append a row to `docs/releases/PROD-READINESS-LOG.md`: date, release tag,
  phases run, # findings, # fixes, link to per-run log.

## Phase 6 — Wrap up

1. Show the user the per-run release log path + top findings.
2. List deliberate deferrals with reason.
3. Offer to schedule any deferred item with a real deadline.

</process>

<output_contract>
At the end of a run the skill must produce:
1. `docs/releases/<YYYY-MM-DD>-<branch>-prod-readiness.md` — per-run log.
2. Updated diagrams under `docs/` for any flow touched (Phase 2).
3. Updated `docs/api/openapi.yaml` if APIs changed (Phase 2).
4. A row appended to `docs/releases/PROD-READINESS-LOG.md`.

Any phase skipped (whether out of scope or excluded) MUST be stated in the log.
</output_contract>

<rules>
- Idempotency first. Already-passing checks → record "PASS" and move on.
- Don't change error envelopes or ERRORID values without bumping the schema
  version in `error-schema.md`.
- All new server logs MUST be JSON. If a code path resists structured logging,
  log a note in the release log; don't leave a TODO comment.
- Diagram Drawer skill is the only sanctioned way to (re)generate flow
  diagrams. If unavailable, write a stub in the release log + queue follow-up.
</rules>

<failure_modes>
- Release log already exists for today → append a timestamped section, don't
  overwrite.
- OpenAPI generator script missing → record as finding; don't hand-fabricate.
- `verify:error-ids` script missing → create it as part of this run.
</failure_modes>
