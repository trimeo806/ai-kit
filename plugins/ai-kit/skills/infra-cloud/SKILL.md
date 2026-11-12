---
name: infra-cloud
description: "Use when working with cloud infrastructure on AWS, GCP or Azure — Terraform or other IaC, CI/CD pipelines, serverless and container platforms (Lambda, Cloud Run, App Service, ECS, GKE, AKS), IAM, secrets, environments, or reading deployed-service logs. Covers operational patterns; cloud, accounts and environments come from project rules."
user-invocable: false

metadata:
  agent-affinity: [devops-engineer, planner, debugger]
  keywords: [aws, gcp, azure, terraform, iac, ci-cd, cloud-run, lambda, kubernetes, gke, eks, aks, infrastructure, deployment-pipeline]
  platforms: [all]
  connections:
    related: [infra-docker]
---

# Cloud infrastructure

## 0. Load project rules

If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain, per
`${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Which cloud, accounts / projects /
subscriptions, regions, environments, IaC tool, pipeline tool and naming come from **Stack**,
**Commands**, **Architecture** and **Security & data**. Environments listed there as never to touch
stay untouched. Missing → ask once and suggest saving it with `/ai-kit:setup-rules`. Never guess an
account, project or cluster name.

## Rules

- **Read-only by default.** Describe, plan, diff and read logs freely. `apply`, `deploy`, `delete`,
  IAM or secret changes run only on the user's explicit yes, never against production unless they
  name it, and always after showing the plan output.
- **IaC is the source of truth.** Change Terraform (or the project's IaC), not the console. A manual
  fix is reported as drift to fold back into code.
- **Secrets** live in the cloud's secret manager and reach workloads through identity, never in code,
  images, CI variables printed to logs, or state outputs.
- **Least privilege.** Workload identities per service; no long-lived keys where federation exists.
- **Environments are isolated** (separate accounts / projects / subscriptions or at least separate
  state and IAM boundaries). Promotion goes through the pipeline, not by hand.

## Service map

| Need | AWS | GCP | Azure |
|---|---|---|---|
| Stateless containers | ECS Fargate, App Runner | Cloud Run | Container Apps |
| Kubernetes | EKS | GKE | AKS |
| Functions | Lambda | Cloud Functions | Functions |
| Managed SQL | RDS / Aurora | Cloud SQL / AlloyDB | Azure SQL / PostgreSQL Flexible |
| Object storage | S3 | Cloud Storage | Blob Storage |
| Messaging | SQS / SNS / EventBridge | Pub/Sub | Service Bus / Event Grid |
| Secrets | Secrets Manager | Secret Manager | Key Vault |
| Image registry | ECR | Artifact Registry | ACR |
| CI/CD (native) | CodeBuild / CodePipeline | Cloud Build / Cloud Deploy | Azure Pipelines |
| Logs & metrics | CloudWatch | Cloud Logging / Monitoring | Azure Monitor / Log Analytics |
| Workload identity | IAM roles (IRSA, task roles) | Workload Identity | Managed Identity |

## Infrastructure as code

- One state per environment and stack, in a remote backend with locking (S3 + lock table, GCS,
  Azure Storage, or the IaC vendor's backend).
- Shared modules versioned and pinned; provider versions pinned.
- `plan` output reviewed in the PR; `apply` from the pipeline.
- Tag or label every resource with service, environment and owner.

## CI/CD

- Build once, promote the same artifact (image digest) through environments.
- Run tests and IaC validation (`fmt`, `validate`, policy checks) before build; never skip them to
  ship.
- The pipeline authenticates with short-lived federated credentials (OIDC), not stored keys.
- Rollback = redeploy the previous artifact; keep it one command.

## Reading logs of a deployed service (for debugging)

Use the log source the project rules name. Otherwise, read-only:

| Cloud | Command shape |
|---|---|
| AWS | `aws logs tail <log-group> --since 1h --filter-pattern ERROR` |
| GCP | `gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' --project <project> --freshness 1h` |
| Azure | `az monitor log-analytics query -w <workspace-id> --analytics-query "<KQL>"` |
| Kubernetes | `kubectl logs deploy/<name> -n <ns> --since=1h` |

Not logged in → ask the user to log in; never handle their credentials.

## Aspects

| Aspect | File | Purpose |
|--------|------|---------|
| GCP patterns | references/gcp-patterns.md | GCP building blocks, CI/CD and security defaults |
