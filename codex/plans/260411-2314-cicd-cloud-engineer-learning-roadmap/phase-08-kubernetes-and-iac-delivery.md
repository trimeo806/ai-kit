---
phase: 8
title: "Kubernetes And IaC Delivery"
effort: 50h
depends: [5, 6, 7]
---

# Overview
Add the two big architect-level dimensions: cluster delivery and infrastructure as code.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `terraform-engineer`, `kubernetes-specialist`, `cloud-architect`
- **Handoffs**:
  - After completion -> `devops-engineer` for production hardening

## Goals
- Understand `EKS` and `GKE` delivery at a practical level
- Manage infra changes with `Terraform`
- Learn CloudFormation change sets and GCP Infrastructure Manager as supporting tools

## Topics
- Kubernetes deployment basics, rollout control, manifests
- EKS and GKE deployment flow
- Terraform plan/apply workflow and environment separation
- Remote state and reviewable infra changes
- CloudFormation change sets and Infrastructure Manager overview

---

## Step-by-Step Learning Path

### Step 1 — Kubernetes Core Concepts (10h)
Kubernetes has a steep initial learning curve. Learn the object model before touching a cluster.
- Core objects: `Pod`, `Deployment`, `ReplicaSet`, `Service`, `Ingress`, `ConfigMap`, `Secret`, `Namespace`
- `Deployment` → `ReplicaSet` → `Pod` hierarchy — this is how rolling updates work
- `kubectl` basics: `apply`, `get`, `describe`, `logs`, `exec`, `delete`, `rollout status`, `rollout undo`
- Rolling update strategy: `maxUnavailable`, `maxSurge` — understand how Kubernetes controls the rate of update
- Readiness probes and liveness probes — why they matter for zero-downtime deploys
- Services: `ClusterIP` (internal), `NodePort` (dev only), `LoadBalancer` (cloud load balancer), `ExternalName`
- Resource requests and limits: `requests.cpu`, `requests.memory` — critical for scheduler decisions
- Practice: use KillerCoda or a local `kind` cluster to deploy, update, and roll back a Deployment

### Step 2 — Writing and Managing Kubernetes Manifests (6h)
Manifests are the IaC for Kubernetes. Writing clean, idiomatic YAML is half the skill.
- Write a `Deployment` YAML for your `hello-api` with proper labels, resource requests, and readiness probe
- Write a `Service` YAML (ClusterIP) and `Ingress` YAML
- Understand: `kubectl apply -f` vs `kubectl create -f` — idempotency matters
- Namespaces for environment separation: `dev`, `staging`, `production` namespaces in the same cluster (or separate clusters)
- ConfigMaps and Secrets: `envFrom.configMapRef`, `envFrom.secretRef`, volume mounts
- Kustomize basics: `kustomization.yaml` with `patches` for per-environment config overrides (preferred over raw YAML duplication)
- Practice: maintain two Kustomize overlays — `base/`, `overlays/dev/`, `overlays/production/` — with different replica counts and image tags

### Step 3 — EKS or GKE in Practice (8h)
Pick one (EKS or GKE) for your hands-on work; understand both conceptually.
- **EKS**: managed Kubernetes control plane on AWS; worker nodes = EC2 (self-managed node group) or Fargate (serverless nodes)
  - eksctl: `eksctl create cluster` — fastest setup for learning
  - IAM Roles for Service Accounts (IRSA): Kubernetes pod assumes AWS IAM role via OIDC — the K8s version of OIDC from Phase 7
  - ALB Ingress Controller: maps Kubernetes Ingress to AWS Application Load Balancer
- **GKE**: managed Kubernetes on GCP; Autopilot mode (fully managed nodes) vs Standard mode
  - Workload Identity: GKE equivalent of IRSA — bind Kubernetes service account to GCP service account
  - Built-in load balancing: Kubernetes LoadBalancer Service creates a GCP HTTP(S) load balancer automatically
- Practice: create a cluster (EKS via `eksctl` or GKE Autopilot via Console), deploy your app, expose it via a LoadBalancer Service, access it via the external IP

### Step 4 — Terraform Fundamentals (10h)
Terraform is the dominant IaC tool used in nearly every cloud-aware engineering team. Master the workflow before the syntax.
- Core concepts: provider, resource, variable, output, state, module, workspace
- Workflow: `terraform init` → `terraform plan` (review) → `terraform apply` (execute) — the plan step is the safety gate
- State: stored as JSON; tracks what Terraform manages; `terraform.tfstate` — never commit to git
- Remote state: S3 + DynamoDB (AWS) or GCS (GCP) — enables team collaboration and state locking
- Providers: `hashicorp/aws`, `hashicorp/google` — configure with region and credentials
- Write: one Terraform module that creates an S3 bucket or GCS bucket — basic resource lifecycle
- Variables: `variable {}` with type + description; `terraform.tfvars` for values; environment variables (`TF_VAR_*`)
- Understand: `terraform import` (bring existing resources under management), `terraform state rm` (remove from state without destroying)

### Step 5 — Terraform Multi-Environment Pattern (8h)
One of the most asked Terraform interview topics. There are two main approaches — understand both.
- **Workspaces approach**: same config, multiple `terraform workspace` contexts — simple but can lead to state confusion; use for small, identical environments
- **Directory-per-environment approach** (recommended): `environments/dev/main.tf`, `environments/staging/main.tf`, `environments/prod/main.tf` — explicit, auditable, less shared blast radius
- Shared module pattern: `modules/vpc/`, `modules/ecs-service/` — reuse via `module {}` blocks with different variables
- Remote state referencing: `data "terraform_remote_state"` — one environment reads outputs from another's state file
- `plan → PR review → apply` workflow: run `terraform plan` in CI, post output to PR as a comment, require approval before `terraform apply` in prod
- Practice: create a `terraform-environments` project with `dev/` and `staging/` directories sharing a `modules/storage-bucket/` module

### Step 6 — CloudFormation Change Sets and Infrastructure Manager (4h)
You need literacy in the native IaC tools even if Terraform is your primary tool.
- **CloudFormation**: AWS-native IaC; YAML or JSON templates; deploy as a Stack or StackSet
  - Change sets: preview changes before applying — equivalent to `terraform plan`; always use before `stack update`
  - Rollback: CloudFormation auto-rolls back on deploy failure; configure stack rollback triggers
  - Drift detection: compare deployed stack vs current template — understand what drift means
- **GCP Infrastructure Manager**: GCP's managed Terraform service (formerly Config Connector/Deployment Manager replacement)
  - Uses Terraform configs, executes them in a managed GCP environment
  - Understand: when to use Infrastructure Manager vs running Terraform in CI yourself
- Practice: create one small CloudFormation stack (e.g., S3 + CloudFront); create and execute a change set

### Step 7 — CI/CD for Infrastructure Changes (4h)
Infrastructure changes in CI need the same promotion and approval model as application changes — but with extra caution.
- Pattern: PR → `terraform plan` (CI posts plan output) → review → merge → `terraform apply` (CD applies in target environment)
- Separate pipelines per environment: never let a failed staging apply block prod; isolate blast radius
- Terraform in GitHub Actions: `hashicorp/setup-terraform` action; `run: terraform plan -out=tfplan`; upload plan as artifact
- Atlantis (optional): Terraform PR automation — `atlantis plan` / `atlantis apply` as PR comments; worth knowing about
- Practice: write a GitHub Actions workflow that runs `terraform plan` on PR and `terraform apply` on merge to `main`

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| Kubernetes — Concepts overview | Official Docs | https://kubernetes.io/docs/concepts/ | Free |
| Kubernetes — Deployments | Official Docs | https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ | Free |
| Kubernetes — kubectl cheatsheet | Official Docs | https://kubernetes.io/docs/reference/kubectl/cheatsheet/ | Free |
| Kustomize documentation | Official Docs | https://kustomize.io | Free |
| AWS EKS — Getting started with eksctl | Official Docs | https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html | Free |
| AWS EKS — IRSA (IAM Roles for Service Accounts) | Official Docs | https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html | Free |
| GKE — Quickstart with Autopilot | Official Docs | https://cloud.google.com/kubernetes-engine/docs/quickstarts/deploy-app-container-image | Free |
| GKE — Workload Identity | Official Docs | https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity | Free |
| Terraform — Getting started with AWS | Official Docs | https://developer.hashicorp.com/terraform/tutorials/aws-get-started | Free |
| Terraform — Getting started with GCP | Official Docs | https://developer.hashicorp.com/terraform/tutorials/gcp-get-started | Free |
| Terraform — Remote state | Official Docs | https://developer.hashicorp.com/terraform/language/state/remote | Free |
| Terraform — Module structure | Official Docs | https://developer.hashicorp.com/terraform/language/modules/develop/structure | Free |
| hashicorp/setup-terraform action | GitHub Marketplace | https://github.com/hashicorp/setup-terraform | Free |
| AWS CloudFormation — Change sets | Official Docs | https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Kubernetes Concepts overview | Objects, control plane | Before Step 1 |
| Kubernetes Deployments docs | Rolling update mechanics | During Step 1 |
| kubectl cheatsheet | Quick command reference | During Steps 1–3 |
| EKS Getting started with eksctl | Cluster creation | Before Step 3 |
| EKS IRSA docs | Pod-level IAM permissions | During Step 3 |
| GKE Autopilot quickstart | Managed node model | During Step 3 |
| Terraform AWS getting started tutorial | Resource, state, variable basics | Before Step 4 |
| Terraform Remote state | S3/GCS backend config | During Step 5 |
| Terraform Module structure | Module authoring pattern | During Step 5 |
| CloudFormation change sets | Plan-then-apply for stacks | During Step 6 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **KillerCoda — Kubernetes** | https://killercoda.com/kubernetes — interactive K8s scenarios | Free |
| **kind** (local cluster) | https://kind.sigs.k8s.io — Kubernetes in Docker, no cloud needed | Free |
| **AWS EKS** (free tier) | 0.10/hr for EKS control plane — keep clusters short-lived to minimize cost | ~$0.10/hr |
| **GKE Autopilot** (free tier) | Free cluster management fee; pay only for pods | ~$0.10/hr for pods |
| **Terraform Cloud** (free tier) | Remote state, plan UI, 500 resource applies/month free | Free |
| **HashiCorp Learn** | https://developer.hashicorp.com/terraform/tutorials — interactive Terraform tutorials | Free |
| **AWS CloudFormation Console** | Change sets practice with free resources (S3, IAM) | Free |

---

## Hands-On
- Deploy one sample app to `EKS` or `GKE`
- Create a small Terraform stack with `dev` and `staging`
- Run `plan -> review -> apply` for one infra change
- Capture one rollback note for cluster deployment

## Deliverables
- `k8s-delivery` demo
- `terraform-environments` example
- One ADR on Terraform vs native cloud IaC tools

## Validation
- Can explain why Kubernetes is not the first deployment skill to learn
- Can describe Terraform state, drift, and review flow
- Can explain rolling update vs blue/green at a high level

## Exit Criteria
- You can manage both app release paths and infra change paths

## Notes
- Keep Kubernetes scope modest. Learn delivery and ops basics, not full platform engineering.
