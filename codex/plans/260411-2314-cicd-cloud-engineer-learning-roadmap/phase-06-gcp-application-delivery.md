---
phase: 6
title: "GCP Application Delivery"
effort: 40h
depends: [3, 4]
---

# Overview
Mirror the core delivery patterns on GCP so you can compare platforms instead of treating one cloud as the default answer.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `infra-cloud`, `cloud-architect`
- **Handoffs**:
  - After completion -> `devops-engineer` for secure promotion

## Goals
- Deliver static and app workloads on GCP
- Understand `Cloud Build`, `Cloud Run`, `Cloud Functions`, and `Cloud SQL` integration basics
- Compare AWS and GCP delivery ergonomics

## Topics
- Cloud Storage + CDN basics
- Cloud Build triggers and steps
- Cloud Run deployment and revision model
- Cloud Functions deployment flow
- Cloud SQL connectivity and migration job patterns

---

## Step-by-Step Learning Path

### Step 1 — GCP Account Setup and Core Concepts (3h)
GCP has a different organisational model from AWS. Understanding the hierarchy saves hours of confusion later.
- Create a free GCP account (receives $300 credits for 90 days)
- Understand: Organisation → Folder → Project — every GCP resource lives inside a Project
- Enable billing on your project; set a budget alert at $10 to avoid surprise charges
- Enable the APIs you'll use: Cloud Build API, Cloud Run API, Artifact Registry API, Cloud Functions API
- Install `gcloud` CLI and run `gcloud init` to configure project, region, and account
- Understand: IAM roles in GCP — predefined roles vs custom roles; service accounts (the GCP equivalent of IAM roles for workloads)

### Step 2 — Cloud Storage + Cloud CDN for Static Frontend (5h)
GCP's equivalent of S3 + CloudFront. Very similar concept, different ergonomics.
- Create a Cloud Storage bucket, upload a static app
- Enable uniform bucket-level access (not per-object ACLs — best practice)
- Make the bucket publicly readable via IAM policy (or restrict to load balancer only)
- Cloud CDN: attach to an HTTP(S) load balancer (not directly to GCS — requires a backend bucket)
- Understand: backend bucket vs backend service; CDN cache key; signed URLs for private content
- Compare with AWS: Cloud Storage ≈ S3, Cloud CDN ≈ CloudFront, but CDN setup requires a load balancer layer
- Practice: deploy a static app, configure Cloud CDN, observe cache-hit headers (`Age` header, `X-Cache-Hit`)

### Step 3 — Cloud Build (6h)
Cloud Build is GCP's fully managed CI execution engine. Unlike GitHub Actions, each step runs in its own container.
- Understand: `cloudbuild.yaml` — `steps` array, each step = container + `args`
- Built-in builders: `gcr.io/cloud-builders/gcloud`, `gcr.io/cloud-builders/docker`, `node`, `npm`, `gradle`, `maven`
- Substitution variables: `$PROJECT_ID`, `$REPO_NAME`, `$BRANCH_NAME`, `$SHORT_SHA`, `$TAG_NAME`
- Triggers: connect GitHub repo; trigger on push to branch, push to tag, or PR
- Secrets: integrate Cloud Build with Secret Manager via `secretEnv`
- Artifacts: upload build outputs to Cloud Storage; push Docker images to Artifact Registry
- Service account: Cloud Build runs as a service account — grant it exactly the permissions it needs (IAM least privilege)
- Practice: create a Cloud Build trigger that builds and pushes your `hello-api` image to Artifact Registry on every push to `main`

### Step 4 — Cloud Run (8h)
Cloud Run is GCP's preferred serverless container runtime. It is the most direct competitor to AWS Lambda containers and sidesteps ECS cluster management.
- Understand: Cloud Run = container on demand; scales to zero; request-driven or continuous mode
- Deployment model: push new container image → deploy new revision → traffic routing between revisions
- Revision model: every deploy creates a new revision; traffic can be split between revisions (canary/rollback)
- Traffic splitting: 90%/10% split between stable and new revision; instant rollback by routing 100% to old revision
- Concurrency: per-container request concurrency; scale-out vs scaling up with concurrency
- Cloud SQL connection: Cloud SQL proxy or private IP via VPC connector — understand both approaches
- Environment variables and mounts: `--set-env-vars`, Secret Manager via `--set-secrets`
- Practice: deploy `hello-api` to Cloud Run; push two versions; do a 90/10 traffic split; roll back to 100% old

### Step 5 — Cloud Functions (5h)
Cloud Functions (2nd gen, based on Cloud Run) is GCP's function-as-a-service. Use it for event-driven, lightweight tasks.
- Understand: 1st gen vs 2nd gen (prefer 2nd gen — built on Cloud Run; better cold starts, more config)
- Runtimes: Node.js, Python, Go, Java, .NET, Ruby, PHP
- Triggers: HTTP (direct URL), Pub/Sub, Cloud Storage events, Firestore events, Cloud Scheduler
- Deploy: `gcloud functions deploy my-func --gen2 --runtime nodejs20 --trigger-http`
- Secrets: use Secret Manager; never hardcode credentials
- Compare with Lambda: very similar model; GCP 2nd gen is slightly more ergonomic for HTTP-triggered functions
- Practice: deploy one HTTP-triggered Cloud Function; connect a Pub/Sub trigger to another

### Step 6 — Cloud SQL Integration Patterns (4h)
Production apps on GCP always involve a managed database. The connection patterns are different from AWS RDS.
- Understand: Cloud SQL instances — PostgreSQL, MySQL, SQL Server; public IP vs private IP
- Cloud SQL Auth Proxy: recommended for local dev and Cloud Run — handles IAM auth + encrypted connection; no password needed
- Private IP (recommended for production): Cloud Run → VPC Serverless Connector → Cloud SQL private IP
- Migrations in pipeline: run migrations as a Cloud Run Job or Cloud Build step before new revision gets traffic
- Practice: create a Cloud SQL PostgreSQL instance; connect from Cloud Run using the Auth Proxy; run one schema migration

### Step 7 — AWS vs GCP Delivery Comparison (5h)
Synthesise. This is the phase exit deliverable that demonstrates cloud-agnostic thinking.
- Build a comparison note: Cloud Run vs ECS Fargate, Cloud Build vs CodeBuild, Cloud Functions vs Lambda, Artifact Registry vs ECR
- Document tradeoffs: managed infra, pricing model, cold start behaviour, networking model, IAM/auth ergonomics
- Answer: "If you had to deploy a containerized API today quickly, which would you choose and why?"
- Practice: fill in a `aws-vs-gcp-delivery-ergonomics.md` table with real data from your phase work

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| GCP — Cloud Run quickstart | Official Docs | https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service | Free |
| GCP — Cloud Run traffic splitting | Official Docs | https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration | Free |
| GCP — Cloud Build quickstart | Official Docs | https://cloud.google.com/build/docs/build-push-docker-image | Free |
| GCP — Cloud Build triggers | Official Docs | https://cloud.google.com/build/docs/triggers | Free |
| GCP — Cloud Build substitutions | Official Docs | https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values | Free |
| GCP — Cloud Functions 2nd gen overview | Official Docs | https://cloud.google.com/functions/docs/concepts/overview | Free |
| GCP — Cloud SQL Auth Proxy | Official Docs | https://cloud.google.com/sql/docs/postgres/sql-proxy | Free |
| GCP — Artifact Registry Docker quickstart | Official Docs | https://cloud.google.com/artifact-registry/docs/docker/quickstart | Free |
| GCP — Cloud CDN overview | Official Docs | https://cloud.google.com/cdn/docs/overview | Free |
| Google Cloud Skills Boost | Labs & Courses | https://cloudskillsboost.google | Free tier (some labs free) |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Cloud Run quickstart | First deploy, traffic splitting | Before Step 4 |
| Cloud Run — Traffic splitting | Revision model, rollbacks | During Step 4 |
| Cloud Build quickstart | Step structure, trigger setup | Before Step 3 |
| Cloud Build substitutions | Variable reference | During Step 3 |
| Cloud Functions 2nd gen overview | Differences from 1st gen | Before Step 5 |
| Cloud SQL Auth Proxy | Connection security pattern | During Step 6 |
| Cloud CDN overview | Backend bucket vs backend service | During Step 2 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GCP Free Tier** — Cloud Run | 2M requests/month + 360,000 GB-seconds/month free | Free |
| **GCP Free Tier** — Cloud Build | 120 build-minutes/day free | Free |
| **GCP Free Tier** — Cloud Functions | 2M invocations/month free | Free |
| **GCP $300 credit** | New accounts get $300 for 90 days — use for Cloud SQL and heavier workloads | Free |
| **Google Cloud Skills Boost** | Qwiklabs — guided interactive labs in a real GCP sandbox | Free tier |
| **GCP Codelabs** — https://codelabs.developers.google.com | Cloud Run, Cloud Build codelabs | Free |

---

## Hands-On
- Deploy one static frontend path on GCP
- Deploy one API to Cloud Run
- Deploy one small function
- Write a comparison note: `AWS vs GCP delivery ergonomics`

## Deliverables
- `frontend-gcp-static` demo
- `backend-gcp-delivery` demo
- One architecture note comparing Cloud Run and ECS

## Validation
- Can explain revision-based rollout on Cloud Run
- Can compare CodeBuild/CodePipeline with Cloud Build
- Can describe how app delivery changes when Cloud SQL is involved

## Exit Criteria
- You can speak credibly about CI/CD on both AWS and GCP

## Notes
- Treat deprecated `Deployment Manager` as historical only; focus on current tooling.
