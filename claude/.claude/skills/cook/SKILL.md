---
name: cook
description: Use when user says "implement", "build", "add a feature", "cook", "make this work", or "continue the plan" — dispatches platform-aware feature implementation for web, iOS, Android, or backend
user-invocable: true
agent: developer
metadata:
  argument-hint: "[feature description or plan file]"
---

# Cook — Unified Implementation Command

Implement features with automatic platform detection and plan-aware agent/skill dispatch.

## Step 0 — Active Plan Resolution (when args are empty)

**If `$ARGUMENTS` is empty**, resolve the active plan before asking the user for a task:

1. Run: `node .claude/scripts/get-active-plan.cjs`
2. **If result ≠ `none`**: read the plan's `plan.md`, identify the first phase with `status: pending`, then proceed to **Step 0A**.
3. **If result = `none`**: scan `plans/*/plan.md` for the most recently created plan with `status: pending` (plans just created by `/plan` that haven't been activated yet). Sort by directory name descending; take the first match.
4. **If still nothing**: ask the user for a task description.

When a plan is found via step 3 (frontmatter scan), run `node .claude/scripts/set-active-plan.cjs <plan-dir>` to activate it before proceeding.

### Step 0A — Plan-Aware Agent & Skill Resolution

**When a plan is loaded**, extract agent and skill assignments from the plan before executing:

1. **Read the `## Agents & Skills` table** in `plan.md`. Find the row for the target phase.
2. **Read the phase file** (e.g. `phase-1-scaffold-db.md`) and look for an `## Agent & Skills` block.
3. **Resolve the assigned agent and skills** using this priority order:
   - Phase file `## Agent & Skills` block (most specific)
   - Plan `## Agents & Skills` table row for the phase
   - Fall back to platform detection (Step 3 below)

4. **If agent or skills are missing from both sources** — do NOT fall back silently. Instead:
   > Ask the user: "Phase [N] — [phase name] has no agent or skill assignment in the plan. Which agent should handle it? (e.g. `backend-developer`, `frontend-developer`, `tester`) And which skills should be activated?"
   >
   > Alternatively: "Should I use the default workflow for this phase type (backend / frontend / test)?"
   >
   > Wait for the user's answer before dispatching.

5. **Architecture Gate** — before dispatching the implementation agent, run an architecture review:
   - **Backend phase** → dispatch `backend-architect` with the phase file and plan context; it produces API contracts, data models, and ADRs
   - **Frontend phase** → dispatch `frontend-architect` with the phase file and plan context; it produces routing hierarchy, component architecture, and state strategy
   - **Test phase (P7)** → skip this gate, proceed directly to step 6
   - Present the architecture output to the user with a clear summary
   - **Wait for explicit user approval** (reply "yes", "approved", "looks good", or similar)
   - If the user asks questions or requests more detail, answer them (the architecture agent may be re-queried) then re-present for approval
   - If the user rejects, revise and loop back to this step
   - Do NOT proceed to implementation without approval

6. **Dispatch** the resolved implementation agent via Agent tool, passing:
   - The phase file path and its full content
   - The skills list to activate
   - The plan context (plan title, phase number, overall goal)
   - The approved architecture output as additional context

## Step 1 — Flag Override

If `$ARGUMENTS` starts with `--fast`: skip auto-detection, load `references/fast-mode.md` and execute directly. Remaining args are the task description.
If `$ARGUMENTS` starts with `--parallel`: skip auto-detection, load `references/parallel-mode.md` and execute directly. Remaining args are the task description.
Otherwise: continue to Platform Detection.

## Aspect Files

| File | Purpose |
|------|---------|
| `references/fast-mode.md` | Direct implementation — skip plan question, implement immediately |
| `references/parallel-mode.md` | Parallel implementation for multi-module features |

## Platform Detection

Detect platform per `skill-discovery` protocol.

## Complexity → Variant

- Single file or clear task → fast (skip plan question)
- Multi-file, one module → fast
- Multi-module or unknowns → parallel
- Has existing plan in ./plans/ → follow plan (use Step 0A agent/skill resolution)
- Plan with 3+ independent tasks → consider subagent-driven mode (see `subagent-driven-development` skill)

## Execution

**With plan**: Use Step 0A resolution — dispatch the plan-assigned agent with its skills pre-loaded.

**Without plan**: Route to the detected platform agent with feature description and platform context.

<feature>$ARGUMENTS</feature>

**IMPORTANT:** When executing from a plan, load the skills listed in the plan's `## Agents & Skills` table for the active phase. When executing without a plan, analyze the skills catalog and activate the skills needed for the detected platform.

## Phase-by-Phase Cooking

When the user says "cook phase N" or "implement phase N":

1. Read `plan.md` → find phase N row in the phases table → get the phase file path and assigned agent
2. Read the phase file → extract the `## Agent & Skills` block
3. If agent or skills are absent → ask the user (see Step 0A rule 4 above)
4. **Architecture Gate** (skip for test phases):
   - Backend phase → dispatch `backend-architect`; frontend phase → dispatch `frontend-architect`
   - Pass the phase file content and plan context to the architect agent
   - Present the architecture output to the user and **wait for explicit approval**
   - User may ask questions or request more detail — answer, then re-present for approval
   - On rejection → revise with the architect and loop; on approval → proceed
5. Dispatch the implementation agent with approved architecture as additional context
6. After phase completion → update the phase status to `done` in both `plan.md` and the phase file frontmatter
