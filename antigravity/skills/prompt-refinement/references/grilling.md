# Grilling — The Interview Loop

> Adapted from [`mattpocock/skills`](https://github.com/mattpocock/skills) → `skills/productivity/grilling` (MIT, © 2026 Matt Pocock).

The reusable questioning engine. `prompt-refinement` supplies **what** to ask about (Steps 1–6); this file defines **how** to ask.

Other skills may run this loop directly — see [Reuse](#reuse).

## The Loop

Interview the user relentlessly about every aspect of the topic until you reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one at a time.

| Rule | Detail |
|------|--------|
| **One question at a time** | Ask, then wait for the answer before the next. Batching questions is bewildering. |
| **Always recommend** | Every question ships with your recommended answer and one line of why. |
| **Facts vs decisions** | A *fact* discoverable in the environment (filesystem, git, tools, docs) — look it up, never ask. A *decision* is the user's — put it to them and wait. |
| **Dependency order** | Resolve upstream decisions first; a downstream question whose premise is unsettled is wasted. |
| **No premature action** | Do not implement, plan, or write files until the user confirms shared understanding. |

## Question Shape

```
[Context: one line — what you found in the code / why this matters]
Q: [single, specific, answerable question]
Recommend: [your answer] — [one-line rationale]
```

Bad: "How should we handle errors, and also what about retries and the timeout?"
Good: "Q: On a payment gateway timeout, do we retry or fail the Order? Recommend: fail — retrying risks a double charge without an idempotency key."

## Termination

Loop ends when one of these is true:

- **Shared understanding reached** — user confirms. Proceed.
- **Decision tree exhausted** — no unresolved branches remain.
- **User goes AFK / defers** — stop asking. Continue with explicitly stated assumptions (see `prompt-refinement` Step 7 fallback), and list the unanswered branches as Open Questions.

Never loop past the point where remaining questions no longer change the output.

## Reuse

| Caller | Uses the loop for |
|--------|-------------------|
| `prompt-refinement` | Step 7 — resolving ambiguity in a rough request |
| `audit --architecture` | Step 3 — walking the decision tree on a chosen deepening candidate |
| `review --architecture` | Escalation path only (defers to `/audit --architecture`) |
| `plan` | Optional — before locking phase boundaries |

When calling from another skill, read this file and run the loop as-is. Do not restate or paraphrase the rules — the loop is the contract.
