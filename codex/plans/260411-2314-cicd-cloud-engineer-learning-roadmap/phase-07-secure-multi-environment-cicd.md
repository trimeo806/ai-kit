---
phase: 7
title: "Secure Multi Environment CI/CD"
effort: 35h
depends: [4, 5, 6]
---

# Overview
Turn single-environment delivery into real CI/CD with environment promotion, short-lived auth, and secrets discipline.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `cloud-architect`, `infra-cloud`, `research`
- **Handoffs**:
  - On security concern -> `security-auditor`
  - After completion -> `devops-engineer` for Kubernetes and IaC

## Goals
- Replace long-lived CI secrets with `OIDC/WIF`
- Model `dev -> staging -> prod` promotion clearly
- Add approval and environment protection without overengineering

## Topics
- GitHub OIDC to AWS
- Workload Identity Federation to GCP
- Secret stores and environment scoping
- Promotion workflows and approval gates
- Minimal GitLab and Jenkins credential literacy

---

## Step-by-Step Learning Path

### Step 1 — Why Static Cloud Keys in CI Are Dangerous (3h)
Before writing any OIDC config, internalise *why* this matters. This context makes you credible in interviews and security discussions.
- Understand: static IAM access keys never expire; they're secrets that can leak in logs, PRs, forks, or git history
- Attack vectors: leaked keys in `.env` committed to git, exposed in GitHub Actions logs, stolen from a fork's workflow
- Case study: read about any public S3 bucket breach — almost always traces back to leaked AWS keys
- Principle: CI credentials should be short-lived, scoped to minimum permissions, and never stored as long-lived secrets
- Write: a 5-bullet `secrets-discipline.md` capturing your own threat model understanding

### Step 2 — GitHub OIDC to AWS (8h)
OIDC lets GitHub Actions get a temporary AWS session token without storing any AWS key in GitHub Secrets. This is the modern standard.
- Understand: OIDC flow — GitHub issues a JWT, AWS validates it against GitHub's JWKS endpoint, AWS issues temporary credentials
- Setup AWS side: create an IAM OIDC provider for `token.actions.githubusercontent.com`; create an IAM role with a trust policy scoped to your org/repo
- Trust policy conditions: `StringLike` on `token.actions.githubusercontent.com:sub` — scope to specific repo and branch
- Setup GitHub Actions side: `permissions: id-token: write` in workflow; use `aws-actions/configure-aws-credentials` with `role-to-assume`
- Test: print `aws sts get-caller-identity` to confirm the correct role is assumed
- Scope the role: use separate roles for dev, staging, prod — never one role for everything
- Practice: rewrite one of your Phase 4/5 pipelines to use OIDC instead of stored access keys

### Step 3 — Workload Identity Federation to GCP (7h)
GCP's equivalent of GitHub OIDC to AWS. The concept is identical; the setup is slightly different.
- Understand: Workload Identity Pool → Provider (maps GitHub OIDC → GCP identity) → Service Account impersonation
- Setup GCP side: create Workload Identity Pool, add GitHub OIDC provider with attribute mapping (`attribute.repository`, `attribute.ref`)
- Service account binding: bind the WIF pool to a GCP service account; grant the CI service account only the permissions needed
- Setup GitHub Actions side: use `google-github-actions/auth` with `workload_identity_provider` and `service_account`
- Test: run `gcloud projects list` in the GitHub Actions step to confirm authenticated identity
- Practice: rewrite one Phase 6 Cloud Run deploy pipeline to use WIF instead of a service account JSON key

### Step 4 — Multi-Environment Promotion Model (8h)
`dev → staging → prod` is the standard environment model. Implement it with real access control, not just naming conventions.
- Understand: environments serve different purposes — dev (fast iteration, noisy), staging (production mirror, slower), prod (controlled, real users)
- GitHub Actions environments: create `dev`, `staging`, `production` environments in repo settings; add protection rules (required reviewers, wait timer, branch restrictions)
- Secrets scoping: environment-level secrets override repo-level secrets — use different cloud accounts or IAM roles per environment
- Pipeline design: `deploy-dev` (auto on PR merge) → `deploy-staging` (auto on main push) → `deploy-production` (requires manual approval)
- Promote the same artifact: never rebuild for prod — use the same image SHA that passed staging
- Practice: implement a 3-environment GitHub Actions workflow with environment protection on `production`

### Step 5 — Secret Stores and Scoping (5h)
Move secrets out of CI environment variables and into managed secret stores.
- AWS Secrets Manager: store DB passwords, API keys; access from Lambda, ECS, CodeBuild via IAM permissions (no key in code)
- AWS Parameter Store (SSM): for non-sensitive config + secrets; hierarchy `/app/dev/db_password` — cheaper than Secrets Manager
- GCP Secret Manager: GCP's equivalent; access via `gcloud secrets versions access` or client library
- Principle: never store secrets in `docker build --build-arg`; they appear in layer history
- CI secret access pattern: pipeline assumes role with `secretsmanager:GetSecretValue` permission → fetches at runtime → exports to env
- Practice: move one hardcoded value in your pipeline to AWS SSM Parameter Store or GCP Secret Manager; fetch it at runtime

### Step 6 — Approval Gates and Release Control (4h)
Manual approval is the simplest and most widely used release gate. Implement it correctly and it's genuinely effective.
- GitHub Actions: `environment: production` + required reviewers — workflow pauses, sends email/Slack, waits for click-to-approve
- Approval timeout: set a deadline; expired deployments should not auto-proceed
- What to gate: production deploys, database migrations, infra changes — not dev or staging
- Audit trail: GitHub Actions logs every approval with who approved and when — this is your audit log
- Combine with status checks: require green CI, passing security scan, and passing staging smoke test before approving prod
- Practice: add a required-reviewer approval gate to your production deploy workflow; test by triggering and approving

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| GitHub Docs — OIDC security hardening | Official Docs | https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect | Free |
| GitHub Docs — OIDC with AWS | Official Docs | https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services | Free |
| GitHub Docs — OIDC with GCP | Official Docs | https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform | Free |
| AWS Docs — Creating OIDC provider | Official Docs | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html | Free |
| AWS Action — configure-aws-credentials (OIDC) | GitHub Marketplace | https://github.com/aws-actions/configure-aws-credentials | Free |
| GCP — Workload Identity Federation | Official Docs | https://cloud.google.com/iam/docs/workload-identity-federation | Free |
| GCP — WIF with GitHub Actions | Official Docs | https://cloud.google.com/blog/products/identity-security/enabling-keyless-authentication-from-github-actions | Free |
| google-github-actions/auth | GitHub Marketplace | https://github.com/google-github-actions/auth | Free |
| GitHub Docs — Using environments for deployment | Official Docs | https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment | Free |
| AWS Docs — Secrets Manager | Official Docs | https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html | Free |
| GCP — Secret Manager overview | Official Docs | https://cloud.google.com/secret-manager/docs/overview | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| GitHub OIDC — About security hardening with OIDC | End-to-end conceptual model | Before Step 2 |
| GitHub OIDC — Configuring for AWS | AWS-specific setup steps | During Step 2 |
| GitHub OIDC — Configuring for GCP | GCP-specific setup steps | During Step 3 |
| GCP Workload Identity Federation docs | Pool, provider, attribute mapping | During Step 3 |
| GitHub — Using environments | Environment setup, protection rules | During Step 4 |
| AWS Secrets Manager intro | Concepts, access patterns | During Step 5 |
| GCP Secret Manager overview | Concepts, IAM access | During Step 5 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GitHub.com** — Environments | Create dev/staging/production environments; add required reviewers | Free |
| **AWS IAM Console** | Create OIDC provider, role, trust policy | Free |
| **GCP Console — IAM** | Create Workload Identity Pool + Provider | Free |
| **AWS SSM Parameter Store** | Store + retrieve parameters from pipeline | Free (standard tier) |
| **GCP Secret Manager** | Create secret, access from Cloud Build | Free (6 active secrets free) |
| **GitHub Actions** | Rewrite existing pipelines to use keyless auth | Free |

---

## Hands-On
- Implement one AWS OIDC pipeline
- Implement one GCP WIF pipeline
- Split one project into `dev`, `staging`, and `prod`
- Add a protected production approval step

## Deliverables
- One keyless AWS auth setup
- One keyless GCP auth setup
- One environment promotion diagram
- One secrets policy checklist

## Validation
- Can explain why static cloud keys in CI are a bad default
- Can map which secrets belong in CI, cloud secret stores, or runtime config
- Can explain protected environments and approval gates

## Exit Criteria
- Your pipelines use safer auth and production release control

## Notes
- This phase matters more than collecting more tools. Security habits compound.
