---
title: "CI/CD Cloud Engineer Learning Roadmap"
status: active
created: 2026-04-11
updated: 2026-04-11
effort: 365h
phases: 10
platforms: [all]
breaking: false
---

# CI/CD Cloud Engineer Learning Roadmap

## Purpose
Build a practical learning path for a frontend developer moving toward DevOps/cloud engineering with strong CI/CD depth across AWS and GCP.

## Inputs
- [deep-research-report.md](/mnt/c/private/ai-kit/codex/deep-research-report.md)
- [deep-research-report (1).md](/mnt/c/private/ai-kit/codex/deep-research-report%20(1).md)

## Assumptions
- Pace: `8-10h/week`
- Primary goal: practical CI/CD capability, not certification-first study
- Primary authoring tool: `GitHub Actions`
- Secondary literacy targets: `GitLab CI`, `Jenkins`, `AWS CodePipeline/CodeBuild`, `Google Cloud Build`

## Success Criteria
- Build and explain `5` pipeline systems: GitHub Actions, GitLab CI, Jenkins, CodePipeline/CodeBuild, Cloud Build
- Deliver `3+` portfolio-grade artifacts across AWS, GCP, and Kubernetes/IaC or production hardening
- Use `OIDC/WIF` in at least one AWS flow and one GCP flow
- Deploy `1` container workload, `1` serverless workload, and `1` Kubernetes workload with rollback notes
- Show environment separation, reviewed infra changes, observability, and security scanning in the capstone

## Agents & Skills

| Phase | Agent | Skills Activated |
|-------|-------|------------------|
| P1 — Foundation | `planner` | `plan`, `knowledge-retrieval`, `research` |
| P2 — Pipeline Syntax | `researcher` | `research`, `docs-seeker`, `knowledge-retrieval` |
| P3 — Containers | `devops-engineer` | `infra-docker`, `cloud-architect` |
| P4 — AWS Frontend Delivery | `devops-engineer` | `cloud-architect`, `infra-cloud` |
| P5 — AWS App Delivery | `devops-engineer` | `cloud-architect`, `infra-docker` |
| P6 — GCP App Delivery | `devops-engineer` | `infra-cloud`, `cloud-architect` |
| P7 — Secure Promotion | `devops-engineer` | `cloud-architect`, `infra-cloud`, `research` |
| P8 — Kubernetes + IaC | `devops-engineer` | `terraform-engineer`, `kubernetes-specialist`, `cloud-architect` |
| P9 — Production Hardening | `devops-engineer` | `cloud-architect`, `infra-cloud` |
| P10 — Capstone | `docs-manager` | `doc-coauthoring`, `knowledge-capture`, `research` |

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Foundation And CI Fundamentals | 40h | pending | [phase-01](./phase-01-foundation-and-ci-fundamentals.md) |
| 2 | Pipeline Systems And Syntax | 30h | pending | [phase-02](./phase-02-pipeline-systems-and-syntax.md) |
| 3 | Artifacts Containers And Registries | 30h | pending | [phase-03](./phase-03-artifacts-containers-and-registries.md) |
| 4 | AWS Frontend And Edge Delivery | 30h | pending | [phase-04](./phase-04-aws-frontend-and-edge-delivery.md) |
| 5 | AWS Application Delivery | 40h | pending | [phase-05](./phase-05-aws-application-delivery.md) |
| 6 | GCP Application Delivery | 40h | pending | [phase-06](./phase-06-gcp-application-delivery.md) |
| 7 | Secure Multi Environment CI/CD | 35h | pending | [phase-07](./phase-07-secure-multi-environment-cicd.md) |
| 8 | Kubernetes And IaC Delivery | 50h | pending | [phase-08](./phase-08-kubernetes-and-iac-delivery.md) |
| 9 | Production Hardening | 45h | pending | [phase-09](./phase-09-production-hardening.md) |
| 10 | Capstone Portfolio And Interview Packaging | 25h | pending | [phase-10](./phase-10-capstone-portfolio-and-interview-packaging.md) |

## Phase Structure (per file)
Each phase file now contains four enriched sections in addition to the original goals, hands-on, deliverables, and validation blocks:

| Section | What it contains |
|---------|-----------------|
| **Step-by-Step Learning Path** | Sequential numbered steps with specific actions, not just topics |
| **Resources & Documentation** | Table of official docs, tools, courses — with direct URLs and cost |
| **What to Read** | Prioritised reading list with focus area and timing (before/during step N) |
| **Where to Practice** | Platforms, sandboxes, free-tier services for hands-on work |

## Sequencing Notes
- Learn `AWS` before `GCP` to reduce context switching.
- Treat `GitHub Actions` as the main pipeline authoring surface.
- Delay `Kubernetes` until ECS, Cloud Run, and Lambda/Functions feel routine.
- Keep scope tight: `1` flagship capstone and `2-3` smaller labs.

## Risks
- Weak Linux/YAML/Docker fundamentals will slow all later phases.
- Static cloud keys in CI create bad habits; start with short-lived auth.
- Too many parallel tools can create shallow knowledge instead of usable skill.

## Validation
- End each phase with a demo artifact, short writeup, and checklist-based self-review.
- Revisit the plan after phases `3`, `6`, and `9` to rebalance time and depth.

## Free Practice Platform Summary

| Platform | Phases | URL |
|----------|--------|-----|
| GitHub.com (free) | All | https://github.com |
| KillerCoda | 1, 8 | https://killercoda.com |
| Play with Docker | 1, 3 | https://labs.play-with-docker.com |
| AWS Free Tier | 3–5, 7–9 | https://aws.amazon.com/free |
| GCP Free Tier + $300 credit | 3, 6–9 | https://cloud.google.com/free |
| GitLab.com (free) | 2 | https://gitlab.com |
| Jenkins via Docker | 2 | docker run jenkins/jenkins:lts |
| Terraform Cloud (free) | 8 | https://app.terraform.io |
| HashiCorp Learn | 8 | https://developer.hashicorp.com/terraform/tutorials |
| Google Cloud Skills Boost | 6 | https://cloudskillsboost.google |
| AWS Skill Builder | 4, 5 | https://explore.skillbuilder.aws |
| Excalidraw | 10 | https://excalidraw.com |
