# Step `clarify` — resolve open questions in `spec.md`

Runs in the main conversation, because it asks the user (`AskUserQuestion`, or plain chat where it is unavailable).

**Runs when** `spec.md` has `status: draft`, or still contains a `[NEEDS CLARIFICATION]` marker, or on `plan clarify`.

Besides the markers, scan the spec for:
- vague words with no number (fast, large, secure, intuitive);
- stories without an independent test;
- ACs that are not observable;
- edge cases missing for errors, empty states, permissions and limits.

Also ask the open `[Gap]` items from `checklists/*.md` if `/ai-kit:review checklist` already ran.

When `[NEEDS CLARIFICATION]` markers or real ambiguities remain, ask at most 5 questions in one `AskUserQuestion` round, each with a recommended answer. Write the answers back into `spec.md` under `## Clarifications` and into the affected requirement. Then set `status: clarified`.

**Story has a `decision-log.md`** (written by `ai-kit:brainstormer`): it is the record of every AC
decision. Append each answer to it as a new `DEC-nnn` (format:
`${CLAUDE_PLUGIN_ROOT}/skills/brainstormer/references/decision-log.md`), resolve the matching `OQ-*`, and
make the `## Clarifications` line and the changed spec line cite that DEC. Never renumber or rewrite
an existing DEC; a changed decision supersedes it.

No plan is written while a `[NEEDS CLARIFICATION]` marker remains.
