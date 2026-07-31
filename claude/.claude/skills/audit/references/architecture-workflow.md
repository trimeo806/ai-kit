# Architecture Audit — Deepening Opportunities

> Adapted from [`mattpocock/skills`](https://github.com/mattpocock/skills) → `skills/engineering/improve-codebase-architecture` (MIT, © 2026 Matt Pocock). Output paths re-bound to this kit's `references/output-contract.md`.

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. Aim: testability and AI-navigability.

Runs **inline in the main conversation** (it dispatches `Explore` sub-agents, and sub-agents cannot spawn sub-agents).

## Vocabulary — Use Exactly

| Term | Meaning |
|------|---------|
| **module** | Unit with an interface and an implementation behind it |
| **interface** | The surface a caller must understand |
| **implementation** | What the module hides |
| **depth** | Ratio of hidden implementation to interface surface. Deep = small interface, large implementation |
| **shallow** | Interface nearly as complex as the implementation |
| **seam** | Boundary where an implementation can be substituted |
| **adapter** | A concrete implementation behind a seam |
| **leverage** | One interface change, N call sites benefit |
| **locality** | Related complexity concentrated in one place |

**Never substitute**: component / service / unit (for module) · API / signature (for interface) · boundary (for seam) · layer / wrapper (for module).

Principles:
- **Deletion test** — would deleting this module *concentrate* complexity, or just move it? "Concentrates" is the signal.
- **The interface is the test surface.**
- **One adapter = hypothetical seam; two = real seam.**

Cross-reference `/plan` for system-level patterns and ADR authoring. This workflow is module-level.

## Process

### 0. Session folder

```
mkdir -p reports/{YYMMDD-HHMM}-{slug}-architecture-audit/
```

Per `references/output-contract.md`. `{slug}` = the scoped module/subsystem, kebab-case.

### 1. Explore

**Scope before you scan — YAGNI.** Deepening pays off on code that keeps changing. Decide *where* to look before looking:

- User named a direction (module, subsystem, pain point)? Take it — skip the inference below.
- Otherwise walk back a good stretch of `git log --oneline` for hot spots — files and areas that keep coming up — and let those paths pull your attention first. Scattered changes with no hot spot → widen the net.

Read the domain glossary (`CONTEXT.md`) and any ADRs in the area first — see `prompt-refinement/references/context-format.md` and `adr-format.md`.

Then dispatch `Agent` with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you hit friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow**?
- Where were pure functions extracted for testability while the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow.

Activate `knowledge-retrieval` first, same as every other audit mode (L1 `docs/`, L2 RAG, L4 Grep/Glob fallback).

### 2. Present candidates

Two artifacts in the session folder:

| File | Content |
|------|---------|
| `report.md` | Markdown candidate list + methodology block (required by `SKILL.md` → Methodology Tracking) |
| `report.html` | Self-contained visual report — see [architecture-html-report.md](./architecture-html-report.md) |

Open the HTML for the user (`xdg-open` / `open` / `start`) and give the absolute path.

Each candidate carries:

- **Files** — modules involved
- **Problem** — one sentence, what hurts
- **Solution** — one sentence, what changes
- **Wins** — bullets in glossary terms (locality, leverage, interface shrinks). Not "cleaner code".
- **Before / After diagram** — the centrepiece (HTML only)
- **Recommendation strength** — `Strong` | `Worth exploring` | `Speculative`

End with a **Top recommendation** — which one you'd tackle first, and why.

**Use `CONTEXT.md` vocabulary for the domain and the table above for the architecture.** If `CONTEXT.md` defines "Order", say "the Order intake module" — not "the FooBarHandler", not "the Order service".

**ADR conflicts**: surface a candidate that contradicts an existing ADR only when the friction is real enough to warrant reopening it. Mark it in the card (`contradicts ADR-0007 — worth reopening because…`). Don't list every theoretical refactor an ADR forbids.

**Do NOT propose interfaces yet.** After the files are written, ask: *"Which of these would you like to explore?"*

### 3. Grilling loop

Once the user picks a candidate, run the loop in `prompt-refinement/references/grilling.md` — constraints, dependencies, the shape of the deepened module, what sits behind the seam, which tests survive.

Side effects happen inline as decisions crystallize:

| Trigger | Action |
|---------|--------|
| Deepened module named after a concept absent from `CONTEXT.md` | Add the term to `CONTEXT.md` (create the file lazily) |
| A fuzzy term gets sharpened mid-conversation | Update `CONTEXT.md` right there |
| User rejects a candidate with a load-bearing reason | Offer an ADR: *"Record this so future architecture audits don't re-suggest it?"* Only when a future explorer would actually need it — skip ephemeral ("not now") and self-evident reasons |
| Want alternative interfaces for the deepened module | Escalate to `/plan --arch` |

### 4. Close out

1. Write `session.json` (`type: "architecture-audit"`) per `references/session-json-schema.md`.
2. Update `reports/index.json`.
3. Persist accepted candidates to `reports/known-findings/code.json` with `ARCH` prefix — never write to another agent's DB.
4. Run **Plan Phase Update** (see `SKILL.md`) if an active plan exists.

## Boundaries

| This mode does | This mode does NOT |
|----------------|--------------------|
| Propose deepenings, grill one to a decision | Apply the refactor — that's `/cook` or `/fix-deep` |
| Module-level structure | Line-level defects — that's `/audit --code` |
| Design vocabulary and seams | New system architecture — that is `/plan --arch` |

For a quick, read-only, no-HTML version, use `/review --architecture`.
