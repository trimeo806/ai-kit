# tri-ai-kit for Antigravity

Multi-agent development toolkit providing skills, and workflows tailored for **Antigravity**. Specialized workflows handle each phase of the software lifecycle — from problem definition to post-launch monitoring.

## ⚡ Setup Instructions

> **Please read [`ANTIGRAVITY.md`](./ANTIGRAVITY.md) to install the kit and configure the routing logic into your Antigravity workspace.**

See [`WORKFLOW.md`](./WORKFLOW.md) for the full 15-phase production delivery workflow using these workflows.

---

## What It Is

tri-ai-kit installs a set of workflows and skills into your Antigravity workspace. The main conversation acts as the orchestrator — it reads context, routes to the right workflow, and merges results. 

**Core loop:**
```
/brainstorm → /plan → /cook → /review → /test → /git
```

**Ecosystem Behavior**: In Antigravity, the capabilities are packaged and formatted as standalone **Workflows** (`_agents/workflows/`) and **Skills** (`skills/`). The execution engine uses these capabilities passively via index lookup, or natively through explicitly invoked slash commands.

---

## Workflows (Antigravity)

The custom agents are modeled as structured workflows in Antigravity.

### Triggering Workflows in Antigravity

Antigravity natively tracks and references the `.md` workflow files. A workflow is executed in Antigravity via two primary methods:

1. **Slash Commands**: You can explicitly trigger any workflow by typing a slash command matching the file's name. For example, typing `/code-reviewer` or `/devops-engineer` will instruct Antigravity to fetch the exact workflow logic from `_agents/workflows/code-reviewer.md`.
2. **Autonomous Triggers**: The underlying Antigravity system prompt has built-in awareness of the workflows directory. When a user prompt matches the description of an existing workflow, Antigravity can autonomously choose to read the corresponding `.md` workflow file to ensure structured execution.

> 💡 **Important Setup Note:** To ensure Antigravity fully understands your routing logic, agent intents, and architecture boundaries, you **must** load the instructions defined in `ANTIGRAVITY.md` into your Antigravity System Prompt (User Rules/Instructions). Make sure your environment is configured to read this file!

### Planning & Coordination
| Workflow | Role |
|-------|------|
| `planner` | Creates phased implementation plans; orchestrates backend/frontend architects for fullstack features |
| `backend-architect` | API contracts, data models, service boundaries, auth strategy, DB schema |
| `frontend-architect` | Page/screen structure, routing hierarchy, component architecture, state management |
| `researcher` | Technical research, best practices, technology comparison |
| `brainstormer` | Problem definition, approach evaluation, tradeoff analysis |
| `project-manager` | Progress tracking, roadmap updates, milestone documentation |

### Implementation
| Workflow | Role |
|-------|------|
| `developer` | Fullstack dispatcher — routes to frontend/backend specialist based on task scope |
| `frontend-developer` | React, Next.js, TanStack Start, TypeScript UI, state management, E2E testing, UI/UX design, design systems |
| `backend-developer` | Go, Node.js, Python/FastAPI, REST/GraphQL APIs, PostgreSQL, microservices, authentication |
| `devops-engineer` | Docker, Kubernetes, Terraform, GitHub Actions, cloud deployments, observability |

### Quality & Review
| Workflow | Role |
|-------|------|
| `code-reviewer` | Code quality, security, performance, and architecture audits |
| `security-auditor` | OWASP Top 10 audits, secrets scanning, access control reviews, CVE checks |
| `tester` | Test strategy, test writing, coverage analysis |
| `debugger` | Root cause analysis, stack trace investigation, fix validation |
| `muji` | UI design system audits, design token enforcement, component API reviews |
| `a11y-specialist` | WCAG 2.1 AA audits, remediation guidance — web, iOS VoiceOver, Android TalkBack |

### Knowledge & Workflow
| Workflow | Role |
|-------|------|
| `git-manager` | Staged commits, PR creation, branch management |

---

## Skills (Passive Knowledge)

Skills load platform-specific expertise on demand. They are not slash commands — they enhance agent behavior automatically when domain signals are matched. Antigravity discovers them through `skills/skill-index.json`.

**Language & Framework:**
`typescript-pro` · `javascript-pro` · `react-expert` · `nextjs-developer` · `golang-pro` · `tanstack-start` · `fastapi-python`

**Architecture:**
`microservices-architect` · `graphql-architect` · `api-designer` · `architecture-designer` · `fullstack-guardian`

**Infrastructure:**
`terraform-engineer` · `kubernetes-specialist` · `postgres-pro` · `infra-docker` · `infra-cloud`

**Testing:**
`playwright-expert` · `web-testing`

**Frontend:**
`web-frontend` · `web-i18n`

**Design System:**
`design-system`

**Security & Resilience:**
`security-reviewer` · `fullstack-guardian` · `error-recovery`

**Analysis & Reasoning:**
`problem-solving` · `sequential-thinking` · `knowledge-retrieval` · `skill-discovery` · `subagent-driven-development`

**Kit Meta:**
`tri-ai-kit` · `skill-creator` · `core`

---

## Project Structure

```
antigravity/
├── _agents/
│   └── workflows/       # 18 specialized auto-generated workflows
├── skills/              # Passive skill modules and skill-index.json
├── ANTIGRAVITY.md       # Project-level agent instructions and routing bounds
└── WORKFLOW.md          # 15-phase production delivery workflow
```

---

## Related Docs
- [WORKFLOW.md](./WORKFLOW.md) — Full 15-phase production workflow with exit criteria
- [ANTIGRAVITY.md](./ANTIGRAVITY.md) — Agent routing rules, orchestration protocol, and setup instructions.
