# Profile setup — one round, only when no profile exists

Runs only when step 0 of brainstormer found neither a profile nor enough in project rules, and the user
agreed to create one.

1. **Read before asking.** Start from `.ai-kit/workspace.json` and the `AGENTS.md` chain, then
   `CONTRIBUTING.md`, `<docsDir>/conventions/` and i18n config (locales). Pre-fill what they state, citing
   the file. Never guess a value.
2. **Ask once, one round,** for what is still empty, using `references/profiles/_template.md` as the
   field list. Every field names the brainstormer step that consumes it — don't ask for a field no step
   reads. Recommend a value where the material suggests one.
3. **Constitution is never empty.** If the user gives none, write the template's defaults, labelled
   `Source: defaults`, and say so.
4. **Write** project-wide facts (tracker, actors, conventions) into project rules via
   `/ai-kit:setup-rules`; write brainstormer-only fields (domain axes, constitution, AC conventions,
   decision owners, question budget) to `.ai-kit/brainstormer-profile.md` at the workspace root. Tell the
   user to commit both so the whole team grills against the same profile.
5. **Corrections** later: confirm the specific field before rewriting it. One-off exceptions ("skip
   the i18n check for this story") go into that story's decision log as a DEC, never into the profile.
