# <Workspace name> — workspace rules

Applies to every repository below this folder. A repository's own `AGENTS.md` overrides these rules.

## Overview
<What this workspace is, the product, who owns it.>

## Repositories
| Repo | Purpose | Stack | Owner |
|---|---|---|---|
| `<path>` | <purpose> | <stack> | <team> |

## Architecture & boundaries
- <How the repos talk to each other: APIs, events, shared libraries, contracts.>
- <Which repo owns which data / domain.>

## Git & PR
- Branches: `<pattern>` from `<default branch>`.
- Commits: <convention, e.g. Conventional Commits>.
- PRs: <template, required reviewers, merge strategy, CI gates>.

## Tracker
- <Tracker, ticket key format, definition of ready / done, status workflow.>

## Security & data
- <Secrets handling, environments the agent must never touch, PII rules.>

## Do / Don't
- <Short hard rules that apply everywhere.>
