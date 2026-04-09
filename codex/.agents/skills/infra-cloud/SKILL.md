---
name: infra-cloud
description: Use when working with GCP infrastructure — Terraform, Cloud Build, Cloud Run, GKE, deployment pipelines. Scope: GCP-specific operational patterns. For multi-cloud architecture strategy and design, use cloud-architect instead.
user-invocable: false

metadata:
  agent-affinity: [devops-engineer, planner]
  keywords: [gcp, terraform, cloud-build, cloud-run, gke, infrastructure, deployment-pipeline]
  platforms: [all]
  connections:
    related: [cloud-architect, infra-docker, terraform-engineer]
---

> **Scope boundary**: `infra-cloud` = GCP-specific operational patterns (Cloud Run configs, Cloud Build triggers, GKE workloads, IAM). For architecture strategy, multi-cloud design, cost modeling, or disaster recovery across AWS/Azure/GCP, use `cloud-architect`.

# Cloud Architecture Knowledge

## Aspects

| Aspect | File | Purpose |
|--------|------|---------|
| GCP Patterns | references/gcp-patterns.md | GCP service usage patterns and conventions |
