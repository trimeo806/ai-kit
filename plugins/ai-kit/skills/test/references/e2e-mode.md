# E2E mode

End-to-end tests drive the real app in a real browser, through the same UI and APIs a user hits.
They are slow and depend on environments and data, so keep them few and aimed at flows that
matter: login, the main path of a feature, and cross-page or cross-service handoffs that unit
tests can't see.

Two paths. Pick from the request:

| Path | When | Output |
| :-- | :-- | :-- |
| **A. Playwright spec** | "write/fix an E2E test", "add Playwright coverage", a failing `*.spec.ts` under the Playwright `testDir` | a committed spec, run green |
| **B. Exploratory check** | "test this flow in the browser", "check it works on localhost", verify a fix by hand | a pass/fail report with screenshots, no spec |

Path B often comes first: walking the flow once tells you what the spec should assert.

## A. Playwright spec

### 1. Read the repo's setup

- `playwright.config.*`: `testDir`, `baseURL`, projects and their `dependencies` (auth setup
  projects), `maxFailures`, workers, reporters.
- The repo's Testing section and any E2E guide it points to (auth setup per suite, env/user
  selection, wrapper scripts). They win over this file.
- The closest existing spec and its helpers: page models, API helpers, shared waits, suite folders.
  Reuse them; don't write a second login helper.

### 2. Run one spec

Use the E2E command from the Commands section; default `npx playwright test <path>` with the
repo's config. Some repos wrap it to select environment and test user (e.g.
`npm run e2e -- <spec> --env=dev --user=0`).

- When the wrapper takes an environment and a test user, pass both every time: the user often picks
  the tenant and its seeded data, so a run without it may not reproduce.
- Specs that depend on auth setup projects run with `--project=<project>` so their setup runs first.
- `maxFailures: 1` stops at the first failure — read that one before rerunning.
- `-g "<test name>"` runs one test; `--headed` or `--ui` to watch locally.

Running against a deployed env (dev/test/staging) uses real accounts and data. Use the test users
the repo's config or guide defines; never type real personal credentials. Ask before running
specs that create or delete data outside a cleanup-managed suite.

### 3. Write the spec

- **One user goal per test**, named for it: `sends an invoice to a saved customer`.
- **Locators the user would use:** `getByRole(…, { name })`, `getByLabel`, `getByText`;
  `getByTestId` only when nothing accessible exists. No CSS chains or XPath tied to layout.
- **Web-first assertions** that auto-wait: `await expect(locator).toBeVisible()`,
  `toHaveText`, `toHaveURL`. Never `page.waitForTimeout` — wait for a locator, a response
  (`page.waitForResponse`) or a URL.
- **Auth through storage state** from the setup project, not by logging in inside every test.
- **Own your data:** create what the test needs via the repo's API helpers and remove it in teardown or the cleanup project; give it unique names so parallel workers
  don't collide. Never depend on another test having run.
- **Assert outcomes the user cares about** (the invoice appears in the sent list with status X),
  not intermediate DOM.
- **Page models** for flows reused across specs; keep assertions in the spec, not the model.
- **No `test.only`** left behind (`forbidOnly` fails CI), no committed `test.skip` without a
  ticket reference.
- **Make sure the spec is picked up.** Check the new file matches a project's `testMatch` /
  `testDir` in `playwright.config.*` (some repos list specs per project); if not, register it in
  the right project with its auth setup dependency. A spec no project matches never runs, and
  `--project=<name>` silently reports zero tests.

### 4. Debug a failing spec

1. Read the error and the step it failed on. Open the trace / screenshot / video from
   `test-results/` and `playwright-report/` (`npx playwright show-trace <trace.zip>`).
2. Decide: product bug, test bug (locator, timing, data), or environment (auth expired, env
   down, data missing). Rerun auth setup when storage state is stale.
3. Product bug → `ai-kit:debug`. Test bug → fix the locator or the wait condition, not
   by adding timeouts or retries.

## B. Exploratory browser check

1. Start the app with the run command from the Commands section, or use the deployed env URL the
   user names.
2. Drive it with whatever browser automation the session has (a browser extension, a built-in
   browser pane, Playwright MCP, or a throwaway Playwright script). None available → give the user
   the steps to walk and ask for the results.
3. Know which screen changed before driving it. If the diff, branch or commit doesn't show what
   was fixed and several screens match the description, ask which one — checking the wrong
   dialog produces a confident PASS that means nothing.
4. Walk the flow step by step from the acceptance criteria: happy path, then the edge cases
   (empty state, validation error, permission denied, slow/failed request).
5. At each step check what the user sees, the console (errors/warnings) and the network calls
   (status, payload) for the step.
6. Sign-in pages: the user signs in; never enter real passwords. Test credentials only on local or
   named test environments, per the session's rules.
7. Report each step PASS/FAIL with evidence (screenshot, console line, request). Offer to turn the
   walked flow into a Playwright spec (path A) when it's worth keeping.

## What not to cover in E2E

Validation permutations, formatting, every error code, pure logic — those are unit tests. E2E
covers that the pieces are wired: one happy path and the one or two failures a user would
actually hit.
