# Skills README

This directory contains the passive skill modules for `tri-ai-kit`.

## Purpose

Use this doc as the skill-side index when deciding:

- which skill to load for a task
- how skills differ from agents
- where the skill catalog lives
- what belongs in a skill vs a root instruction file

## Table of Contents

| Section | Focus |
|--------|-------|
| Skill Catalog | How the catalog is organized |
| Loading Rules | When to load a skill |
| Separation of Concerns | What stays in skills vs agents |
| Related Docs | Where the deeper references live |

## Skill Catalog

- `skill-index.json` is the discovery catalog for Codex skills.
- Each skill lives in its own directory under `.agents/skills/`.
- Skill docs own the procedure, reference material, and task-specific guidance.

## Loading Rules

- Load the narrowest skill that matches the task.
- Prefer direct match over category match.
- Skills augment an agent; they do not replace routing.
- Keep shared routing policy out of individual skills unless the policy is skill-specific.

## Separation of Concerns

| Keep in skills | Keep out of skills |
|----------------|--------------------|
| Task procedures | Global routing policy |
| Topic references | Agent selection rules |
| Local scripts and examples | Repo-wide authority matrix |
| Domain checklists | Cross-agent orchestration |

## Related Docs

- `../../AGENTS.md`
- `../../.codex/agents/README.md`
- `skill-index.json`
