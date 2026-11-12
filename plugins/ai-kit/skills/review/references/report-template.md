# Review report

One report per review, in the session. Grade on the shared scale
(`references/shared/severity-guide.md`), which also maps to the PR labels.

| Severity | PR label | Verdict effect |
| :-- | :-- | :-- |
| `security` | Must fix · security | Request changes |
| `blocking` | Must fix | Request changes |
| `should-fix` | Should fix | Comment (or Request changes when many) |
| `nit` | Nit | no effect |

```markdown
## Review — <scope or PR title>  (local | pr <url> @ <commit> | story <TICKET> @ <base>)

**Intent:** <one sentence>
**Verdict:** Request changes | Comment | Approve — <first reason>
  (story mode: Ready for PR | Fix, then re-review | Back to implement — <first reason>)
**Counts:** S security · B blocking · F should-fix · N nit

### Passes
| Pass | Ran by | Status |
<one row per pass or agent group: ran · skipped (reason) · unavailable · failed (what broke). Story mode lists every plan row>

### Acceptance criteria (story mode, or when a spec exists)
| # | Criterion | Code | Test | Status |

### Must fix
| # | Sev | file:line | Finding (what breaks, when) | Rule | Fix |
<security findings add two columns: OWASP (A01–A10) · Confidence (Confirmed / Likely / Possible)>

### Should fix
| # | Sev | file:line | Finding | Rule | Fix |

### Nits
<max 5; "+N more" beyond>

### Done well
- <specific pattern worth keeping>

### Questions for the author
- <clarification the review couldn't settle>

### Methodology
- Files reviewed: … (diff range or file list)
- Rules applied: project rules …, checklist § …, language lens …, code-review standards (default | full pass)
- Spec checked against: <plan / ticket / solution.md> | none
- Not covered / unavailable: …
- PR comments (pr mode): posted N inline + M general, skipped K duplicates | not posted (declined)
```

Rules:
- Every finding cites a rule: an ID (`SEC-001`), a checklist §, or a project-rules section.
- Praise is specific or left out.
- A pass that didn't run is never shown as clean: an admitted hole beats an invented clean bill.
- Story mode: carry a project review skill's confirm-or-flag lines verbatim, name the passes
  a narrowed `--focus` left out, print the hand-off directory and `DIFF_SHA` when one was written,
  and end by asking which findings to fix.
- Security mode: the verdict line names the overall risk (highest severity present); items that
  need runtime or infra knowledge to confirm go under "Questions for the author"; end with a
  prioritised next-steps list, `security` first.
- Unresolved questions always end the report.
