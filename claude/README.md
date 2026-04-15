# tri-ai-kit for Claude Code

Multi-agent development toolkit providing custom agents, skills, and hooks for Claude Code. Specialized agents handle each phase of the software lifecycle — from problem definition to post-launch monitoring.

## ⚡ Setup Instructions

> **Please refer to [claude-setup-instructions.md](./claude-setup-instructions.md) to install the kit into your Claude Code workspace.**

See [WORKFLOW.md](./WORKFLOW.md) for the full 15-phase production delivery workflow using these agents.

---

## What It Is

tri-ai-kit installs a set of agents, skills, and hooks into your Claude Code workspace. The main conversation acts as the orchestrator — it reads context, routes to the right agent, and merges results. Agents do not spawn other agents.

**Core loop:**
```
/brainstorm → /plan → /cook → /review → /test → /git
```

---

## Agents

The custom agents defined below operate as conversational entities in Claude Code.

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
| `frontend-developer` | React, Next.js, TanStack Start, TypeScript UI, state management, E2E testing, design-system integration |
| `backend-developer` | Go, Node.js, Python/FastAPI, REST/GraphQL APIs, PostgreSQL, microservices, authentication |
| `devops-engineer` | Docker, Kubernetes, Terraform, GitHub Actions, cloud deployments, observability |

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
| `git-manager` | Staged commits, PR creation, branch management |
| `mcp-manager` | MCP server integration and tool discovery |

---

## Slash Commands

Custom slash commands are specifically supported in Claude Code via `.claude/hooks`.

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
| `/ask` | Answer questions about the codebase |
| `/sequential-thinking` | Step-by-step breakdown for complex problems |

---

## Project Structure

```
claude/
├── .claude/
│   ├── agents/          # 18 specialized agents
│   ├── skills/          # Passive skill modules (48)
│   ├── hooks/           # Session hooks, build gates, notifications
│   └── output-styles/   # Response style levels (ELI5 → Lead)
├── AGENTS.md            # Project-level agent instructions
├── WORKFLOW.md          # 15-phase production delivery workflow
└── claude-setup-instructions.md
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
- [AGENTS.md](./AGENTS.md) — Agent routing rules and orchestration protocol
- [Hooks Reference](./.claude/hooks/docs/README.md) — Hooks reference
