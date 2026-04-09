# Orchestration Protocol

Rules for agent delegation, context passing, execution modes, and escalation.

## Context Passing

Every subagent invocation MUST include:

```
Task: [specific task description]
Work context: [project path]
Reports: [reports/ path]
Plans: [plans/ path]
Platform: [detected platform or "all"]
Active plan: [plan path if exists, or "none"]
```

Hooks inject most of this automatically. Agents must verify context is present before starting work.

## Delegation Config

### Who Delegates
- **Main conversation** — only context that orchestrates multi-agent workflows
- **project-manager** — router used by the main conversation for multi-step workflows
- **developer** — specialist selected by the main conversation for implementation dispatch
- **Subagents** — execute assigned work only; they do not delegate further

### Delegation Rules
1. Include full context (see above)
2. One clear task per subagent (no multi-intent delegation)
3. Subagent gets fresh context — don't assume it knows prior conversation
4. Wait for subagent result before next step (unless the main conversation has confirmed parallel-safe ownership)
5. Review subagent output before presenting to user

## Execution Modes

### Smart Detection (Default)

Analyze task to auto-select mode:

| Signal | Mode |
|---|---|
| Plan has phases with non-overlapping file ownership | Parallel |
| Plan has sequential dependencies between phases | Sequential |
| 3+ independent tasks in plan | Subagent-driven (per-task dispatch) |
| Single task or tightly-coupled work | Direct execution (no subagents) |
| Cross-platform work (iOS + Android + Web) | Parallel (one agent per platform) |

### Force Override
- `--parallel` — force parallel execution (user confirms file ownership is safe)
- `--sequential` — force sequential (when uncertain about conflicts)

### Parallel Execution Rules
1. Extract file ownership from phase files
2. Verify NO overlap between any two phases
3. If overlap → warn user, suggest resolution, or fall back to sequential
4. Each subagent works in isolation — no shared state
5. Reviewer checks for ownership violations after all phases complete

## Subagent-Driven Development Integration

For plans with 3+ independent tasks, use the `subagent-driven-development` skill:

```
Per task:
  1. Dispatch implementer subagent (fresh context + task spec)
  2. Spec review subagent (does code match spec?)
  3. Quality review subagent (code quality check)
  4. Fix loop (max 3 iterations if review fails)
  5. Mark task done, move to next
```

This gives each task a clean context window and two-stage review.

## Consensus-Voting Pattern (Advanced)

For high-stakes decisions where no clear best practice exists, use consensus voting across independent agents.

**When to use:**
- Architecture tradeoffs with significant long-term impact
- Multi-perspective analysis where domain bias matters
- Design decisions where feasibility, performance, and maintainability conflict

**When NOT to use:**
- Single-option tasks (only one viable path)
- Time-sensitive fixes (clear best practice exists)
- CRUD or routine implementation work

**Flow** (all spawned from the main conversation — never from within a subagent):

```
Main conversation → `spawn_agent(brainstormer)`   (generates 3 independent options)
Main conversation → `spawn_agent(researcher)`     (evaluates options against criteria)
Main conversation → `spawn_agent(planner)`        (selects winner, writes implementation spec)
```

**Evaluation criteria template:**

| Dimension | Weight | What to assess |
|-----------|--------|----------------|
| Feasibility | High | Can we build it given current constraints? |
| Maintenance | High | How hard is ongoing upkeep? |
| Performance | Medium | Does it meet latency/throughput requirements? |
| Alignment | High | Does it match our architecture patterns? |
| Risk | Medium | What can go wrong, and how bad is it? |

**Output**: planner produces a spec with the selected option, rationale, and rejected alternatives. The spec becomes the input for the next implementation phase.

**Constraint**: Respects subagent spawn constraint — all three agents are dispatched independently from the main context, not chained.

## Subagent Spawn Constraint

Subagents (agents spawned via `spawn_agent`) **cannot spawn further subagents**. They do not orchestrate further agent chains.

**Implication**: Multi-agent workflows (hybrid audit, parallel research) must be orchestrated from the **main conversation context**, not from within a subagent.

**Pattern**:
```
Main conversation → `spawn_agent(specialist-1)` (independent subagent)
Main conversation → `spawn_agent(specialist-2)` (independent subagent)
Main conversation reads both results and merges
```

**Anti-pattern** (will fail):
```
Main conversation → `spawn_agent(agent-A)` (subagent)
                 agent-A → `spawn_agent(agent-B)`  ❌ BLOCKED
```

Skills that orchestrate multi-agent workflows (e.g., `audit/SKILL.md` hybrid mode) must NOT use `context: fork` — they run inline in the main context.

## Skill Execution Mode

When you load a skill, check its frontmatter before executing:

| Frontmatter | How to execute |
|-------------|---------------|
| `context: fork` + `agent: {name}` | **MUST** spawn `{name}` from the main conversation via `spawn_agent`. Do NOT execute inline. Do NOT use raw Bash. |
| `context: inline` | Execute the skill content directly in the main conversation. |
| No `context` field | Execute inline (default). |

**Iron Law**: A skill with `context: fork` is a dispatch instruction, not a script to run yourself. Seeing `context: fork` means: stop, spawn the named agent, pass it the task.

**Common failure mode**: Skipping the Skill tool entirely and running raw Bash/shell commands instead. This bypasses routing, skips build gates, skips all skill-level safety checks. Never do this for git, research, planning, or any workflow that has a dedicated agent.

## Escalation Rules

| Situation | Action |
|---|---|
| Test failure | debugger investigates → fix → re-test (max 3 loops) |
| Review rejection | implement fix → re-review (max 3 loops) |
| 3 consecutive failures | Escalate to user with findings summary |
| Ambiguous request | Ask user (max 1 question) |
| Multi-intent request | Route to project-manager for decomposition |
| File ownership conflict | Ask user to resolve before parallel execution |
| Build/CI failure | Route to debugger with error logs |

## Report Output

- Location: `reports/{agent}-{date}-{slug}.md`
- Naming: kebab-case, descriptive, self-documenting
- Content: concise, bullets over paragraphs, unresolved questions at end
- Max: 150 lines (research reports), 80 lines (status reports)

## Commit Convention

| Type | When |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring (no behavior change) |
| `test:` | Tests only |
| `chore:` | Build, config, tooling |

No "Generated with Codex" or AI attribution in commits or PRs.
