# Exit check — before the human gate

Three passes over `spec.md` + `decision-log.md`. Passes 1 and 2 decide the spec status. Pass 3 never
blocks.

## 1. Clarify scan (same as `ai-kit:plan clarify`)

Because brainstormer may set `status: clarified`, which makes `plan` skip its clarify step, run the scan
that step would have run. Source of truth: `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/step-clarify.md`.

- [ ] No vague word without a number (fast, large, secure, intuitive, user-friendly, etc.).
- [ ] Every user story has an **Independent test**.
- [ ] Every AC is observable: a tester can check it without reading code (what is shown, stored,
      returned, refused).
- [ ] One behavior per AC; no "and also" chains of unrelated outcomes.
- [ ] Edge cases exist for errors, empty states, permissions and limits — or the axis coverage says
      `n/a` with a reason.
- [ ] Every in-scope action has its refusal case (who must not, and what they get).
- [ ] At least one `FR-U-*` / `AC (unchanged)` when the change touches an existing flow.
- [ ] No AC states an implementation (component, endpoint, table) instead of a behavior.

## 2. Traceability

- [ ] Every AC / EC / FR / OOS cites ≥1 `DEC-*` or `A-*`.
- [ ] Every accepted DEC has a non-empty `Affects:` (else: missing AC, or withdraw it).
- [ ] No behavior is both in a story and in `OOS-*`.
- [ ] Every `[assumed — confirm]` AC is listed at the gate.
- [ ] `[NEEDS CLARIFICATION]` ≤ 3, and none is an ambiguity.

Any box unticked in pass 1 or 2 → fix it now if it needs no new decision; otherwise it becomes a
frontier question (one more round) or the spec stays `status: draft` with the reason. `clarified`
needs every box ticked **and zero** `[NEEDS CLARIFICATION]` markers — plan writes no design while one
remains.

## 3. Constitution + critique (advisory)

**Constitution** — for each user story × each item of the profile's **Constitution**:
`Pass` (already covered by AC-x) · `Add` (new AC needed → propose it, it needs a DEC) · `N/A — <why>`.
Write the table into the log's `## Critique` section.

**Critique**, 1–5 each, scored on function, not prose:

| Dimension | Question |
|---|---|
| Grounding | Every AC traces to a decision, a stated assumption or cited material? |
| Completeness | Every axis decided, assumed or n/a with a reason? |
| Traceability | Every DEC followable to the ACs it shaped, and back? |
| Testability | Could a cross-tester execute every AC as written? |

Most first drafts score 3–4. Name the single weakest part in about 60 words, concretely (the actual
AC, the actual missing axis). Grounding or Traceability ≤ 2 → fix that before the gate (one retry).
Low Completeness or Testability → show it at the gate; the human decides.
