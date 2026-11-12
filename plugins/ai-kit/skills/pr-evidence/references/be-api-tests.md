# API evidence — test results for new endpoints and fields

Use the API test tool the **Testing** section names. Default: a Postman collection run with the
Postman CLI, or `newman` (same collection format). Everything here runs on local collection
files; no cloud workspace is required.

## 1. What to prove — from the diff only

List, from `DIFF_FILE`:

- new or changed endpoints — method + path, from route declarations in whatever framework the
  repo uses (annotations, router calls, file-based route handlers, OpenAPI specs);
- new or changed request / response fields (DTOs, records, schemas), with type and whether
  required;
- new validation rules and error responses (status + error code);
- changed behaviour of an existing endpoint (filter, sort, default).

Each item becomes at least one assertion. Unchanged endpoints are out of scope.

## 2. Collection

1. Reuse first: an existing collection in the repo or `DOCS_DIR` for this service. Copy it into
   `EV_DIR` and extend the copy — don't edit repo files unless the user asks.
2. Otherwise write `EV_DIR/collection.json` (Postman schema v2.1), one folder per endpoint.
3. Tests per request — specific, not just "200":
   ```js
   pm.test("returns 201", () => pm.response.to.have.status(201));
   const body = pm.response.json();
   pm.test("has new field status", () => pm.expect(body).to.have.property("status"));
   pm.test("status is a known value", () => pm.expect(["DRAFT", "SENT"]).to.include(body.status));
   ```
   Error cases assert the status **and** the error code / message key.
4. Environment `EV_DIR/local.postman_environment.json` holds `baseUrl` only. Tokens and passwords
   never go in a file: pass them at run time with `--env-var` from an environment variable the
   user has set.

## 3. Service running

Health-check the base URL first. Not running → offer to start it with the run command from the
**Commands** section (ask first when startup is slow). The user declines or it won't start → no
rows, reason in the report.

Local or explicitly allowed development targets only. Never run against an environment the
**Security & data** section forbids, and never against production.

## 4. Run

```bash
postman collection run "$EV_DIR/collection.json" \
  -e "$EV_DIR/local.postman_environment.json" --env-var "token=$API_TOKEN" \
  --reporters cli,json --reporter-json-export "$EV_DIR/api-report-raw.json"
```

- The CLI asks to log in → that is the user's step (`postman login`); never enter an API key.
- No Postman CLI → ask before `npx newman run` (it downloads newman) with the same flags
  (`-r cli,json --reporter-json-export`).
- A failing assertion is a result, not a reason to edit the test until it passes. Fix the test
  only when the test itself is wrong, and say so.

## 5. Redact, then summarise

```bash
python3 -I "${CLAUDE_PLUGIN_ROOT}/scripts/pr-review/redact_json.py" \
  "$EV_DIR/api-report-raw.json" "$EV_DIR/api-report.json"
```

It masks every header, variable and field whose name looks like a credential (authorization,
cookie, token, password, secret, api key) and replaces request and response bodies with
`<omitted>`. What stays: requests, statuses, timings, assertion names and results. Attach only
`api-report.json` and the collection, never the raw report. When a reviewer needs a response
shape, put field names (not values) in the "what it proves" text.

Fill `EV_DIR/api-tests.tsv` from the run — one row per request:

```
POST /orders	201	4/4	creates an order and returns the new status field
GET /orders?status=FOO	400	2/2	rejects an unknown status with ORDER_STATUS_INVALID
```

Totals must match the runner's own summary. Manifest entries:

```
file	<EV_DIR>/collection.json	API test collection for the new endpoints
file	<EV_DIR>/api-report.json	API test run report (redacted)
```
