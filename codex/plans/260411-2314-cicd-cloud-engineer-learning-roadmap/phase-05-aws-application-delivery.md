---
phase: 5
title: "AWS Application Delivery"
effort: 40h
depends: [4]
---

# Overview
Expand AWS delivery from static assets to backend workloads: containers, serverless, approvals, and rollback-aware deployment.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `cloud-architect`, `infra-docker`
- **Handoffs**:
  - On security concern -> `security-auditor`
  - After completion -> `devops-engineer` for GCP delivery

## Goals
- Deliver backend workloads on AWS
- Understand tradeoffs among `ECS`, `Lambda`, and `EKS`
- Learn safe rollout and DB change awareness

## Topics
- ECS/Fargate deployment flow
- Lambda deployment flow and traffic shifting basics
- CodePipeline approval and promotion stages
- RDS blue/green concepts and schema-change caution
- Rollback design and smoke-test gating

---

## Step-by-Step Learning Path

### Step 1 — ECS and Fargate Concepts (6h)
Understand the architectural model before running a single deploy. ECS vs EC2 vs Fargate is one of the most common AWS interview topics.
- Understand: ECS cluster → service → task definition → container; Fargate = serverless compute (no EC2 to manage)
- Concepts: task definition (vCPU, memory, image, env vars, port mappings, IAM task role), service (desired count, rolling update), cluster (logical grouping)
- Launch types: Fargate (AWS manages the host), EC2 (you manage the host), External (on-prem)
- Service auto-scaling: target tracking (CPU %, request count via ALB)
- Networking: VPC, subnets, security groups for ECS tasks; Application Load Balancer
- Read: ECS Getting started, Fargate task definition basics

### Step 2 — Deploy a Containerized API to ECS Fargate (8h)
Take the `hello-api` container from Phase 3 and ship it to Fargate.
- Create an ECS cluster (Fargate type) in the AWS Console
- Create a task definition pointing to your ECR image
- Create an ECS service with 1 desired task, behind an Application Load Balancer
- Understand: `awsvpc` networking mode (each task gets its own ENI), security group rules
- Deploy an update: push a new image to ECR, update the task definition, trigger a service update
- Rolling update: ECS default — new tasks launch before old ones stop; confirm `minimumHealthyPercent` and `maximumPercent` settings
- Practice: break the new image on purpose (bad startup), watch ECS fail the health check, confirm it rolls back to the previous task

### Step 3 — CI/CD Pipeline for ECS (6h)
Automate what you did manually in Step 2 using GitHub Actions.
- Write a GitHub Actions workflow: `build → push to ECR → render new task definition → deploy to ECS service`
- Use `aws-actions/amazon-ecs-render-task-definition` and `aws-actions/amazon-ecs-deploy-task-definition`
- Understand: the task definition JSON file — what changes per deploy (image URI), what stays static
- Add a smoke-test step after deploy: `curl` the ALB endpoint, check HTTP 200, fail the pipeline if unhealthy
- Add a CodePipeline/manual-approval equivalent using GitHub Actions environments (`environment: production` with required reviewers)

### Step 4 — Lambda Deployment (6h)
Lambda is AWS's serverless compute. It's the fastest path to "just run this function" without managing any infrastructure.
- Concepts: function, handler, runtime, memory (128MB–10GB), timeout (max 15min), invocation types (sync, async, event source)
- Deployment modes: ZIP upload, container image (for larger workloads), Lambda layers (shared libraries)
- Traffic shifting: Lambda aliases + weighted routing (`alias → 90% stable, 10% new`) — canary deploys for serverless
- Event sources: API Gateway (HTTP trigger), S3 events, SQS, EventBridge, CloudWatch Events
- Practice: create one Lambda function with an API Gateway trigger; deploy via GitHub Actions using `aws lambda update-function-code`
- Understand: Lambda cold start (first invocation latency) — why it matters and mitigation (provisioned concurrency)

### Step 5 — RDS Safety and DB Migration Patterns (4h)
Most teams wreck their first production deployment by mishandling the database. Learn the safe patterns before you need them.
- Understand: RDS Multi-AZ vs read replica; synchronous vs asynchronous replication
- Schema change risks: adding a NOT NULL column without a default; long-running migrations that lock tables; rename column breaks live app
- Safe migration sequence: expand → migrate → contract (backward-compatible changes first)
- AWS RDS blue/green deployments: AWS feature for near-zero-downtime RDS changes (MySQL, PostgreSQL)
- Checklist: before every DB deploy — backup, test migration in staging, define rollback query, set maintenance window
- Practice: write a `db-migration-checklist.md` with 10 items you check before any schema change

### Step 6 — Rollback Design (6h)
Deployment success rate is meaningless without rollback speed. This is what production-readiness actually means.
- ECS rollback: update the service to use the previous task definition — takes 1 CLI command
- Lambda rollback: route alias traffic back to stable version — instant with weighted routing
- S3 + CloudFront (frontend): covered in Phase 4 — redeploy previous artifact
- Pipeline-level rollback: if smoke test fails, auto-trigger a rollback deploy job
- Understand: blue/green deployment model on ECS — two ECS services, switch ALB target group weights
- Practice: implement a GitHub Actions pipeline with: deploy → smoke test → auto-rollback on smoke-test failure

### Step 7 — CodePipeline Integration (4h)
Experience the full AWS-native pipeline through this backend case.
- Build one CodePipeline: Source (GitHub via CodeStar connection) → Build (CodeBuild, outputs new image tag) → Deploy (ECS deploy action)
- Add a manual approval action before production deploy
- Understand: CodePipeline `artifact` passing between stages — how CodeBuild output becomes CodeDeploy input
- Compare: GitHub Actions workflow vs CodePipeline for the same ECS deploy — note operational tradeoffs

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| AWS ECS — Getting started with Fargate | Official Docs | https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html | Free |
| AWS ECS — Task definition parameters | Official Docs | https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html | Free |
| AWS ECS — Rolling update deployments | Official Docs | https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html | Free |
| AWS Lambda — Getting started | Official Docs | https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html | Free |
| AWS Lambda — Traffic shifting with aliases | Official Docs | https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html | Free |
| GitHub Action — amazon-ecs-deploy-task-definition | GitHub Marketplace | https://github.com/aws-actions/amazon-ecs-deploy-task-definition | Free |
| GitHub Action — amazon-ecs-render-task-definition | GitHub Marketplace | https://github.com/aws-actions/amazon-ecs-render-task-definition | Free |
| AWS CodePipeline — Tutorial: deploy to ECS | Official Docs | https://docs.aws.amazon.com/codepipeline/latest/userguide/tutorials-ecs-ecr-codedeploy.html | Free |
| AWS RDS — Blue/green deployments | Official Docs | https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html | Free |
| AWS Skill Builder — Amazon ECS Getting Started | Course | https://explore.skillbuilder.aws/learn/course/91 | Free |
| AWS Skill Builder — AWS Lambda Foundations | Course | https://explore.skillbuilder.aws/learn/course/99 | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| ECS — Getting started with Fargate | Task def, service, cluster | Before Step 1 |
| ECS — Task definition parameters | All config options | During Step 2 |
| ECS — Rolling update deployments | How ECS handles updates | During Step 2 |
| Lambda — Getting started | Function, runtime, handler | Before Step 4 |
| Lambda — Traffic shifting with aliases | Canary deploy for Lambda | During Step 4 |
| RDS — Blue/green deployments | Safe DB change patterns | During Step 5 |
| CodePipeline ECS tutorial | Full pipeline walkthrough | During Step 7 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **AWS Free Tier** — ECS Fargate | 750h vCPU + 1.5GB memory on Fargate Spot per month | Free |
| **AWS Free Tier** — Lambda | 1M requests + 400,000 GB-seconds/month free forever | Free |
| **AWS Skill Builder** — ECS course | Guided hands-on labs in sandbox AWS account | Free |
| **AWS Skill Builder** — Lambda Foundations | Lambda fundamentals + practice | Free |
| **AWS Workshops** — https://ecsworkshop.com | ECS Workshop — full step-by-step | Free |
| **GitHub.com** | Author full ECS + Lambda deploy pipelines | Free |

---

## Hands-On
- Deploy one containerized API to ECS or Fargate
- Deploy one small serverless function to Lambda
- Add manual approval before a simulated production stage
- Write a DB migration checklist for AWS delivery

## Deliverables
- `backend-aws-delivery` demo
- One ECS or Fargate pipeline
- One Lambda deployment example
- One runbook: `aws-release-and-rollback.md`

## Validation
- Can explain when to pick ECS vs Lambda
- Can describe how CodePipeline stages map to release control
- Can state at least three DB deployment safety rules

## Exit Criteria
- You can ship and explain AWS application delivery, not just static hosting

## Notes
- Do not start Kubernetes yet. Master workload delivery patterns first.
