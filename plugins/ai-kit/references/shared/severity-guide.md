# Severity guide

How `ai-kit:pr-submit` and `ai-kit:review` grade a finding. Both use this one guide, so a
finding keeps its severity when a `/ai-kit:review story` hand-off is reused on the PR. The checklist
(`code-review-guidelines.md`, the repo's project rules, or a repo's own review guide) decides **what**
is a finding; this guide decides **how bad** it is. Severity drives the PR verdict, so it has to be
the same call on every run and in every module:

| Severity | PR verdict it forces | One-line test |
|---|---|---|
| `security` | ⛔ Blocked | An attacker or an unauthorised user can reach it through this diff. |
| `blocking` | ⛔ Blocked | Merged as-is, it misbehaves in production for a realistic input. |
| `should-fix` | ⚠️ Needs attention | It works, but it will cost someone later: a defect waiting for a trigger, a gap in proof, a maintenance trap. |
| `nit` | none (✅ if nothing else) | Changing it would not change behaviour, safety or how hard the code is to change. |

## How to decide

Ask these in order and stop at the first **yes**:

1. **Can someone exploit it?** Untrusted input reaches a query, command, template, file path,
   deserializer or redirect; an endpoint or action lacks an authorization check; a secret is
   in the diff. And the path is reachable from how the code is actually called → `security`.
2. **Will it go wrong in production?** A realistic input, state or timing makes it return the
   wrong result, lose or corrupt data, crash, hang, or break a caller → `blocking`.
3. **Is it a real problem that is not firing yet?** It needs an unusual trigger, it hides a
   future failure, it leaves the change unproven, or it makes the next change harder or
   riskier → `should-fix`.
4. Otherwise → `nit`.

Then two sanity checks:

- **Would you refuse to approve over it?** If yes, it is `security` or `blocking`. If you
  would approve and leave a comment, it is not.
- **Can you name the input or state that triggers it?** A `blocking` finding's sentence must
  say *when* it breaks ("NPE when the tenant has no address"). If you can't say when, it is
  `should-fix` at most — or not a finding yet.

## Raise or lower

Start from the default in the table below, then adjust **one step** for each factor that
applies. Say which factor moved it only if the sentence would otherwise mislead.

Raise (↑) when:

- **The path is hot** — per request, per row, in a loop, on a list endpoint, in a batch job.
- **Data is written** — a write, delete, migration or message publish, not only a read.
- **It is hard to undo** — a DB migration, a published API/event contract, stored data format.
- **Input is external** — it comes from a user, a request, a file upload or another system.
- **Failure is silent** — wrong data is saved or returned with no error or log.

Lower (↓) when:

- **The path is cold or internal** — admin-only tooling, a one-off script, test code, a
  feature flag that is off.
- **Something else already guards it** — validation upstream, a DB constraint, a framework
  default. Check that the guard really exists before lowering.
- **It is pre-existing** — the diff only moves or touches the line without changing its
  behaviour. Report it only if the diff makes it worse; otherwise it is not a finding.

Never lower `security` because the path is cold — if it is reachable, it stays `security`.
Never raise a `nit` above `should-fix` — style does not break production.

## Default severity per checklist item

The starting point for each item in `code-review-guidelines.md`. A severity the project rules give
a rule overrides these defaults.

### Clean code

| Finding | Default | Raise to `blocking` when | Lower to `nit` when |
|---|---|---|---|
| Null / missing value not handled | `should-fix` | a realistic input reaches it (optional field, empty result, missing relation) | the value is guaranteed non-null by the type or a constraint |
| Exception swallowed or caught too broadly | `should-fix` | the swallow hides a failed write or returns success to the caller | — |
| Wrong exception type / message | `nit` | — | — |
| Debug log / `console.log` left in | `nit` | it logs a secret or personal data → `security` | — |
| Commented-out or stale comment | `nit` | — | — |
| New code has no unit test | `should-fix` | — (a missing test never blocks on its own; the build status covers that) | the change is trivial wiring, config or a rename |
| Test exists but does not assert the behaviour | `should-fix` | — | — |
| Unintended side effect | `blocking` | — | the effect is harmless and local (↓ to `should-fix`) |
| Duplicated code | `should-fix` | — | the copy is small (a few lines) and unlikely to change |
| Magic number / hardcoded string | `should-fix` | the value is environment-specific (URL, id, credential) and breaks outside one env | the literal is self-explanatory (`0`, `1`, `""`, an HTTP status in a test) |
| Naming, formatting, unused import | `nit` | — | — |

### Pull request

| Finding | Default | Notes |
|---|---|---|
| Tests fail | not a finding | The build status carries it and already blocks the verdict. |
| PR summary missing or wrong | `nit` | `should-fix` if it describes behaviour the diff does not have. |
| UI change without screenshots | `nit` | |
| PR too large to review properly | `should-fix` | Location `-`. Say what it should be split into. |

### Performance & data

| Finding | Default | Raise to `blocking` when | Lower to `nit` when |
|---|---|---|---|
| N+1 query | `should-fix` | on a list endpoint, a per-request path or a batch over unbounded rows | — |
| Missing index on a queried column | `should-fix` | the table is large or growing and the query is on a hot path | — |
| Transaction missing on a multi-step write | `blocking` | — | — |
| Read-only / read-write transaction flag wrong | `should-fix` | marked read-only on a method that writes | — |
| Lazy load outside an open session or context (ORM lazy-init error) | `blocking` | — | — |
| Unbounded fetch / no pagination on a list endpoint | `should-fix` | the table grows with users or tenants | the set is small and fixed (enum-like lookup) |
| Cache without invalidation or TTL | `should-fix` | it serves stale data that is written by this same change | — |
| DB migration not following the repo's migration rules | `should-fix` | it is not backward compatible, drops or renames a column in use, or cannot be re-run | — |

### Frontend

| Finding | Default | Raise when | Lower to `nit` when |
|---|---|---|---|
| Unoptimized or unsized image (e.g. `<img>` instead of `next/image`) | `nit` | — | — |
| Client-rendered component where server rendering would do (`"use client"`) | `should-fix` | — | the component is tiny and leaf-level |
| Client-side fetch that belongs on the server | `should-fix` | — | — |
| Sequential awaits that could be `Promise.all` | `should-fix` | — | — |
| `useEffect` with no dependency array | `should-fix` | it sets state → render loop → `blocking` | — |
| Missing or wrong dependency in `useEffect` / `useMemo` | `should-fix` | it causes stale data shown to the user → `blocking` | — |
| List `key` is the array index | `should-fix` | the list is reordered or items are removed and have state → `blocking` | the list is static |
| `useMemo` / `useCallback` without a measured need | `nit` | — | — |
| Heavy component not lazy-loaded | `nit` | — | — |
| Direct DOM access (`document.getElementById`) | `should-fix` | it breaks on server render → `blocking` | — |
| Missing `alt` / `aria-label` | `should-fix` | — | the image is decorative |
| `any` type | `should-fix` | — | test code, or a third-party type gap that is commented |
| Secret exposed through a public env prefix (`NEXT_PUBLIC_`, `VITE_`, …) | `security` | — | — |

### Project conventions

| Finding | Default | Raise to `blocking` when | Lower to `nit` when |
|---|---|---|---|
| File misplaced per the repo's folder structure, or wrong naming | `should-fix` | the project rules mark the rule as hard | a single private constant used once, or a private helper of 3 lines or fewer |
| Import crossing a layer or module boundary the Architecture section forbids | `should-fix` | the project rules mark the boundary as hard | — |
| Hand-built UI where the mandated UI library already ships the component | `should-fix` | — | — |
| Styling bypasses the mandated design tokens (raw hex, arbitrary values) | `should-fix` | the build drops it so it renders unstyled | — |

### Security

Everything in this group is `security` when it is reachable from the code the diff adds or
changes. If you cannot show that it is reachable, it is `should-fix` — say what would make it
reachable.

| Finding | Default |
|---|---|
| SQL / command / template / path injection | `security` |
| Unsafe deserialization of external data | `security` |
| External input used without validation in something dangerous | `security` |
| Secret, token or credential in the diff (including tests and config) | `security` |
| Missing authorization or authentication check on an endpoint or action | `security` |
| Personal or sensitive data written to logs | `security` |
| Validation missing but the value only reaches safe code | `should-fix` |

## Findings that are not in the checklist

Anything the checklist does not name — a logic bug, a wrong condition, an off-by-one, a race
— goes through the four questions under **How to decide**. Logic bugs a realistic input
triggers are `blocking`; that is the most common `blocking` finding and the checklist does
not list it because it cannot.

Findings about the change as a whole, which `ai-kit:review story` raises from its own passes:

| Finding | Default | Notes |
|---|---|---|
| Acceptance criterion with no implementation | `blocking` | The story does not do what it promised. |
| Acceptance criterion implemented but not tested | `should-fix` | |
| Production build fails | `blocking` | |
| Comment describes behaviour the code no longer has | `blocking` | The next reader trusts it. |
| i18n conflict that will revert this diff's wording on the next sync | `blocking` | |
| i18n key deleted unintentionally | `should-fix` | `blocking` if a screen now shows a raw key. |
| Test cases in the plan disagree with the criteria | `should-fix` | The cross-tester works from those rows. |
| Complexity hotspot / module boundary violated | `should-fix` | |
| Dead code left behind by the change | `should-fix` | `nit` if it is a line or two. |
| Scratch `.md` file left in the working tree | `should-fix` | |
| Wording, redundant comment, small cleanup | `nit` | |

## From another review skill

When a repo's own review guide or tool produced the findings, keep its judgment of *what* is wrong
and re-grade *how bad* with this guide. Its own labels are a hint, not the answer: "critical"
or "must" usually means `blocking`, "major" or "should" means `should-fix`, "minor",
"optional" or "suggestion" means `nit` — but check each against the four questions, because
the labels drift between skills.

## Borderline examples

| Finding | Severity | Why |
|---|---|---|
| `findById(id).get()` where the id comes from the request | `blocking` | A deleted or wrong id is a realistic request → 500. |
| `findById(id).get()` on an id read back from a row just saved in the same transaction | `nit` or nothing | It cannot be empty. |
| `catch (Exception e) { log.warn(...) }` around a read that has a fallback | `should-fix` | Works, but hides the cause. |
| `catch (Exception e) { log.warn(...) }` around a save, method still returns OK | `blocking` | The caller is told the data was saved when it was not. |
| N+1 in an admin export that runs once a month | `should-fix` | Real, but cold. |
| N+1 in the list endpoint behind the main table | `blocking` | Runs on every page load and grows with data. |
| New service method with no test | `should-fix` | Unproven, not broken. |
| `String sql = "... WHERE name = '" + name + "'"`, `name` from the request | `security` | Reachable injection. |
| Same string build, `name` is an enum constant | `should-fix` | Not reachable today; one change away from it. |
| Hardcoded `"https://staging.example.com"` in production code | `blocking` | Breaks every environment except one. |
| Hardcoded `30` as a timeout | `should-fix` | Works; a trap for the next change. |
| Variable named `data2` | `nit` | |
