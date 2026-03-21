## Setting Up With Your Project

To use this kit with an existing project, copy the core files into your project root:

```bash
# From the tri-ai-kit directory, copy into your target project
cp -r .claude /path/to/your-project/
cp CLAUDE.md /path/to/your-project/
cp WORKFLOW.md /path/to/your-project/
```

Then open your project in Claude Code — the agents, skills, and hooks will load automatically on session start.
You can use slash commands in Claude Code to activate agents.

**What gets installed:**
- `.claude/` — agents, skills, hooks, and slash commands
- `CLAUDE.md` — routing rules and orchestration instructions Claude Code reads on startup
- `WORKFLOW.md` — 15-phase production delivery workflow reference

# tri-ai-kit

Multi-agent development toolkit for Claude Code. Specialized agents handle each phase of the software lifecycle — from problem definition to post-launch monitoring.

> See [WORKFLOW.md](./WORKFLOW.md) for the full 15-phase production delivery workflow.

---

## What It Is

tri-ai-kit installs a set of agents, skills, and hooks into your Claude Code workspace. The main conversation acts as the orchestrator — it reads context, routes to the right agent, and merges results. Agents do not spawn other agents.

**Core loop:**
```
/brainstorm → /plan → /cook → /review → /test → /git
```

---

## Agents

### Planning & Coordination
| Agent | Role |
|-------|------|
| `planner` | Creates phased implementation plans; orchestrates backend/frontend architects for fullstack features |
| `backend-architect` | API contracts, data models, service boundaries, auth strategy, DB schema |
| `frontend-architect` | Page/screen structure, routing hierarchy, component architecture, state management |
| `researcher` | Technical research, best practices, technology comparison |
| `brainstormer` | Problem definition, approach evaluation, tradeoff analysis |
| `project-manager` | Progress tracking, roadmap updates, milestone documentation |

### Implementation
| Agent | Role |
|-------|------|
| `developer` | Fullstack dispatcher — routes to frontend/backend specialist based on task scope |
| `frontend-developer` | React, Next.js, TanStack Start, TypeScript UI, state management, E2E testing, UI/UX design, design systems |
| `backend-developer` | Go, Node.js, Python/FastAPI, REST/GraphQL APIs, PostgreSQL, microservices, authentication |
| `devops-engineer` | Docker, Kubernetes, Terraform, GitHub Actions, cloud deployments, observability |
| `design-specialist` | Brand identity, logo design, design systems, design tokens, UI/UX mockups, banners, social media assets, pitch decks |

### Quality & Review
| Agent | Role |
|-------|------|
| `code-reviewer` | Code quality, security, performance, and architecture audits |
| `security-auditor` | OWASP Top 10 audits, secrets scanning, access control reviews, CVE checks |
| `tester` | Test strategy, test writing, coverage analysis |
| `debugger` | Root cause analysis, stack trace investigation, fix validation |
| `muji` | UI design system audits, design token enforcement, component API reviews |
| `a11y-specialist` | WCAG 2.1 AA audits, remediation guidance — web, iOS VoiceOver, Android TalkBack |

### Knowledge & Workflow
| Agent | Role |
|-------|------|
| `docs-manager` | Documentation writing, maintenance, and reorganization |
| `git-manager` | Staged commits, PR creation, branch management |
| `journal-writer` | Development journals and decision logs |
| `mcp-manager` | MCP server integration and tool discovery |

---

## Slash Commands

### Planning & Research
| Command | What It Does |
|---------|-------------|
| `/brainstorm` | Structured analysis — pros/cons, risks, recommended direction |
| `/research` | Deep dive on technology, patterns, or prior art |
| `/plan` | Phased implementation plan from codebase analysis + research |
| `/plan-hard` | Deep plan with sequential research for complex features |

### Implementation
| Command | What It Does |
|---------|-------------|
| `/cook` | Platform-aware feature implementation from active plan |
| `/fix` | Identify error type and apply platform-appropriate fix |

### Quality & Review
| Command | What It Does |
|---------|-------------|
| `/review` | Code quality, a11y, or general improvement review |
| `/audit` | Unified audit — auto-detects UI, a11y, or code audit type |
| `/audit --ui <Component>` | UI/design system component audit via muji |
| `/audit --a11y` | WCAG 2.1 AA violations on staged changes |
| `/audit --code` | Security, performance, and code quality review |
| `/test` | Run tests, add tests, or analyze coverage |
| `/debug` | Root cause analysis with platform-specific debugging tools |

### Infrastructure & Deployment
| Command | What It Does |
|---------|-------------|
| `/cloud-architect` | Cloud architecture decisions, cost optimization, DR strategies |
| `/infra-docker` | Dockerfiles, docker-compose, containerization |
| `/infra-cloud` | GCP infrastructure — Terraform, Cloud Build, Cloud Run, GKE |
| `/git` | Commit, push, PR creation, branch management |

### Documentation & Knowledge
| Command | What It Does |
|---------|-------------|
| `/docs` | Write, update, or reorganize documentation |
| `/ask` | Answer questions about the codebase |
| `/sequential-thinking` | Step-by-step breakdown for complex problems |

---

## Skills (Passive Knowledge)

Skills load platform-specific expertise on demand. They are not slash commands — they enhance agent behavior automatically.

**Language & Framework:**
`typescript-pro` · `javascript-pro` · `react-expert` · `nextjs-developer` · `golang-pro` · `tanstack-start` · `fastapi-python`

**Architecture:**
`microservices-architect` · `graphql-architect` · `api-designer` · `architecture-designer` · `fullstack-guardian`

**Infrastructure:**
`terraform-engineer` · `kubernetes-specialist` · `postgres-pro` · `websocket-engineer` · `infra-docker` · `infra-cloud`

**Testing:**
`playwright-expert` · `web-testing`

**Frontend:**
`web-frontend` · `web-i18n`

**Design & UI/UX:**
`ui-ux-pro-max` · `design` · `design-system` · `banner-design` · `brand` · `slides` · `ui-styling`

**Security & Resilience:**
`security-reviewer` · `fullstack-guardian` · `error-recovery`

**Analysis & Reasoning:**
`problem-solving` · `sequential-thinking` · `knowledge-retrieval` · `knowledge-capture` · `skill-discovery` · `subagent-driven-development`

**Kit Meta:**
`tri-ai-kit` · `skill-creator` · `auto-improvement` · `core`

---

## Project Structure

```
tri-ai-kit/
├── .claude/
│   ├── agents/          # 21 specialized agents
│   ├── skills/          # Passive skill modules (56)
│   ├── hooks/           # Session hooks, build gates, notifications
│   └── output-styles/   # Response style levels (ELI5 → Lead)
├── packages/
│   ├── core/            # Core hooks, scout-block, notification providers
│   └── domains/         # Domain-specific packages
├── templates/           # Repo and workspace CLAUDE.md templates
├── CLAUDE.md            # Project-level agent instructions
├── WORKFLOW.md          # 15-phase production delivery workflow
└── README.md            # This file
```

---

## Hooks

The toolkit ships hooks that run automatically during Claude Code sessions:

| Hook | Purpose |
|------|---------|
| **Session Init** | Loads project context, detects platform, checks active plans |
| **Scout Block** | Prevents overly broad file scans that waste context |
| **Privacy Block** | Blocks accidental reads of `.env` and credential files |
| **Build Gate** | Verifies build passes before marking work complete |
| **Notifications** | Sends Discord/Slack/Telegram alerts on session events |

---

## Routing Logic

The orchestrator classifies every prompt before acting:

| Intent | Examples | Routes To |
|--------|----------|-----------|
| Build / Create (frontend) | "add a button", "build a form", "React component" | `frontend-developer` |
| Build / Create (backend) | "add an endpoint", "write a migration", "REST API" | `backend-developer` |
| Build / Create (generic) | "implement X", "continue the plan" | `developer` |
| Architecture (backend) | "design the API", "data model", "auth strategy" | `backend-architect` |
| Architecture (frontend) | "routing structure", "component hierarchy" | `frontend-architect` |
| Fix / Debug | "this crashes", "why does X fail" | `debugger` |
| Plan / Design | "how should we build X", "let's plan" | `planner` |
| Research | "best practices for", "compare A vs B" | `researcher` |
| Review / Audit | "check my code", "review before merge" | `code-reviewer` |
| Security | "security audit", "harden this", "OWASP" | `security-auditor` |
| Infra / CI/CD | "set up CI/CD", "deploy this", "Docker", "Terraform" | `devops-engineer` |
| UI / Design System | "audit this component", "design tokens" | `muji` |
| UI/UX Design | "design a page", "create a brand", "logo", "banner", "color palette" | `design-specialist` |
| Accessibility | "WCAG audit", "screen reader", "a11y" | `a11y-specialist` |
| Test | "add tests", "validate this works" | `tester` |
| Docs | "document this", "update the docs" | `docs-manager` |
| Git | "commit", "push", "create a PR" | `git-manager` |

---

## Output Style Levels

Configure verbosity by referencing output style levels:

| Level | Style |
|-------|-------|
| 0 — ELI5 | Plain language, no jargon |
| 1 — Junior | Step-by-step with explanations |
| 2 — Mid | Balanced detail |
| 3 — Senior | Terse, pattern-focused |
| 4 — Lead | Architecture and trade-offs only |
| 5 — God | Maximum density, no hand-holding |

---

## Notifications Setup

Configure delivery channels in `.claude/hooks/notifications/.env`:

```bash
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## Related Docs

- [WORKFLOW.md](./WORKFLOW.md) — Full 15-phase production workflow with exit criteria
- [CLAUDE.md](./CLAUDE.md) — Agent routing rules and orchestration protocol
- [.claude/hooks/docs/README.md](./.claude/hooks/docs/README.md) — Hooks reference
