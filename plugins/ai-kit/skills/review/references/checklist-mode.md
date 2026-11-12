# Checklist mode — unit tests for the spec

Reviews the **requirements**, not the code. If `spec.md` is code written in English, a checklist is
its unit test suite. Each item asks whether the requirements are complete, clear, consistent and
measurable for one domain. Adapted from Spec Kit `/checklist`.

Run it after `/ai-kit:plan` writes `spec.md` and `plan.md`, before the plan's review gate.
It is recommended when `plan.md` has `risk: high`.

## What an item is — and is not

| ✅ Tests the requirement | ❌ Tests the implementation (not this mode) |
| :-- | :-- |
| "Is the error response defined for every failure in FR-003?" | "Verify the API returns 404" |
| "Is 'fast' in SC-001 quantified (p95, data size)?" | "Check the page loads quickly" |
| "Are keyboard-navigation requirements defined for US2?" | "Test tab order works" |
| "Does the spec say what happens when the upload exceeds the size limit?" | "Confirm upload limit is enforced" |

## Inputs

- The plan dir: `<docsDir>/<intention-name>/` with `spec.md` (required), `plan.md` and `contracts/` when present.
  A ticket plan (`<docsDir>/<TICKET-KEY>/plan.md`) works too: its acceptance criteria are the spec.
- Domains. They come from the arguments (`checklist security api`) or are inferred from the spec:

| Domain | Pick it when the spec has |
| :-- | :-- |
| `requirements` | always: completeness, clarity, measurability, conflicts |
| `ux` | screens, flows, states, copy |
| `a11y` | any web UI (WCAG 2.1 AA) |
| `api` | contracts, endpoints, events, error responses, versioning |
| `security` | auth, permissions, personal data, input from users or other systems, secrets |
| `data` | entities, migrations, retention, consistency |
| `perf` | SC-* with latency/volume, large lists, batch jobs |

Run at most 4 domains per call. Ask (one `AskUserQuestion`, or plain chat where it is unavailable) only if the domain choice is genuinely
unclear.

## Steps

1. Read `spec.md` (and `plan.md`, `contracts/`) in this session. A `code-reviewer` subagent may draft
   the items. Give it the spec text and the domain list, never the plan's narrative.
2. Per domain, write 8–20 items. Each item:
   - is a question about the requirements, ending in `?`;
   - names its quality dimension: `[Completeness]`, `[Clarity]`, `[Consistency]`, `[Measurability]`,
     `[Coverage]`, `[Edge case]`;
   - cites what it tests, either a spec ID (`US1-AC2`, `FR-003`, `SC-001`) or `[Gap]` when the spec
     has nothing to cite.
   Drop items the spec already answers unambiguously. A checklist of passes is noise.
3. Write `<plan dir>/checklists/<domain>.md`:

```markdown
# Checklist: <domain> — <feature>
Spec: ../spec.md · Created: YYYY-MM-DD · Owner: reviewer

- [ ] CHK001 [Clarity] Is "large file" in FR-004 given a size in MB? (FR-004)
- [ ] CHK002 [Edge case] Does the spec define behavior when the session expires mid-upload? ([Gap])
```

   An existing file gets new items appended with the next CHK numbers. Existing items and their
   checkmarks are never changed.
4. Report in the session, in this order:
   - the item count per domain;
   - the `[Gap]` items first, because those are missing requirements;
   - a pointer: answers go back into `spec.md` (via the plan skill's Clarify step).

## Rules

- **The reviewer owns the checkmarks.** This mode never marks an item `[x]`. `[x]` means a human
  judged that requirement quality is met. It never means the code is done.
- **Read-only on the spec.** Never edit `spec.md`, `plan.md` or `tasks.md` here. Fixes go through
  the plan skill so the spec stays the single source of truth.
- `/ai-kit:tdd-dev-workflow` treats unchecked items in `checklists/` as a gate. It reports
  them and asks before implementing.
