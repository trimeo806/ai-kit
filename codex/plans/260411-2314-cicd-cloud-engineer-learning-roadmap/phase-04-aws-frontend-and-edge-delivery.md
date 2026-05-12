---
phase: 4
title: "AWS Frontend And Edge Delivery"
effort: 30h
depends: [1, 2, 3]
---

# Overview
Start cloud delivery on the easiest high-value path: static frontend delivery to `S3 + CloudFront`, backed by pipeline automation.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `cloud-architect`, `infra-cloud`
- **Handoffs**:
  - After completion -> `devops-engineer` for AWS app delivery

## Goals
- Understand AWS static hosting delivery
- Handle cache invalidation and asset versioning correctly
- Learn the shape of CodePipeline/CodeBuild through a frontend case

## Topics
- S3 static hosting vs S3 as origin
- CloudFront distribution, cache behavior, invalidation, versioned filenames
- Origin Access Control
- CodeBuild buildspec basics
- CodePipeline stages and manual approval basics

---

## Step-by-Step Learning Path

### Step 1 — AWS Account Setup and IAM Basics (4h)
Before deploying anything, establish safe access patterns. Long-lived access keys in CI are the #1 bad habit to avoid.
- Create a free-tier AWS account if you don't have one
- Understand IAM: users, roles, policies, least-privilege principle
- Create an IAM role for deployments (not an IAM user with keys — roles are safer)
- Enable MFA on the root account and your IAM user
- Install AWS CLI v2 and configure with `aws configure` using short-lived credentials
- Understand: regions, availability zones, console vs CLI vs SDK

### Step 2 — S3 Static Hosting (4h)
S3 is the foundational storage service. Static hosting is its simplest use case and a great entry point.
- Create an S3 bucket; upload a static HTML/CSS app
- Understand: public bucket policy vs bucket-website-endpoint vs CloudFront restriction
- Enable static website hosting on the bucket — understand the HTTP endpoint
- Understand: the security risk of direct public buckets (bucket ACLs, public access blocks)
- Best practice: disable public access on bucket; serve only through CloudFront with Origin Access Control (OAC)
- Practice: upload files, access via the S3 website endpoint, then disable public access and observe the difference

### Step 3 — CloudFront Distribution (6h)
CloudFront is the CDN that fronts S3 (and other origins). Understanding it is essential for any frontend delivery role.
- Create a CloudFront distribution with S3 as the origin
- Configure Origin Access Control (OAC) — the modern replacement for Origin Access Identity (OAI)
- Understand: edge location, cache TTL, cache behaviors, viewer protocol policy (HTTPS redirect)
- Cache headers: `Cache-Control: max-age`, `no-cache`, `no-store` — how browsers and CloudFront interpret them
- Cache invalidation: `aws cloudfront create-invalidation --paths "/*"` — when to use it and its cost ($0.005/path after 1,000/month free)
- Versioned assets strategy: rename files with content hash (`app.abc123.js`) → no invalidation needed, old files served until cache expires naturally
- Custom domain + ACM certificate: request a cert in `us-east-1` (required for CloudFront), attach to distribution
- Practice: set up one full CloudFront + S3 distribution, test with and without invalidation

### Step 4 — Automate Frontend Delivery with GitHub Actions (6h)
Replace manual uploads with a repeatable, pipline-driven flow.
- Write a GitHub Actions workflow that: builds your frontend app (`npm run build`), runs `aws s3 sync ./dist s3://your-bucket-name`, runs a CloudFront invalidation
- Use `aws-actions/configure-aws-credentials` action — start with short-lived role assumption (IAM user secret for now; OIDC in Phase 7)
- Understand: `aws s3 sync` — only uploads changed files; `--delete` removes old files from bucket
- Add a deployment environment (GitHub `environment: production`) with manual approval (preview for Phase 7)
- Practice: push a change, watch CI run, verify CloudFront serves the new version

### Step 5 — AWS CodePipeline + CodeBuild for Frontend (6h)
Experience the native AWS CI/CD tooling through the simpler frontend case before applying it to backend workloads.
- Understand CodePipeline stages: `Source → Build → Deploy` — how stages pass artifacts via S3
- Create a CodeBuild project with a `buildspec.yml` that runs `npm install && npm run build` and outputs to an S3 artifact bucket
- Connect to CodePipeline: source (GitHub connection or CodeCommit), build (CodeBuild), deploy (S3 direct deploy)
- Add a manual approval action between `Build` and `Deploy To Production`
- Understand CodeBuild environment: build image, compute type (CPU/RAM), VPC configuration (if needed)
- Practice: run one end-to-end pipeline with a real commit trigger

### Step 6 — Rollback and Incident Pattern (4h)
Understanding rollback is what separates a junior from a senior deployment skill.
- S3 versioning: enable on the bucket — keeps previous file versions, enables restore
- CloudFront rollback option A: redeploy previous artifact version + invalidate cache
- CloudFront rollback option B: versioned assets — just keep old filenames, rollback = update `index.html` to reference old hashes
- Write a 1-page runbook: `aws-frontend-rollback.md` — steps to revert in under 5 minutes
- Practice: deploy v1, deploy v2 (breaking change), perform rollback to v1

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| AWS S3 — Hosting a static website | Official Docs | https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html | Free |
| AWS CloudFront — Getting started with a static website | Official Docs | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/getting-started-secure-static-website-cloudformation-template.html | Free |
| AWS CloudFront — Invalidating files | Official Docs | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html | Free |
| AWS CloudFront — Origin Access Control | Official Docs | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html | Free |
| AWS CodeBuild — buildspec reference | Official Docs | https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html | Free |
| AWS CodePipeline — Getting started | Official Docs | https://docs.aws.amazon.com/codepipeline/latest/userguide/getting-started-codepipeline.html | Free |
| AWS CodePipeline — Adding a manual approval | Official Docs | https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html | Free |
| GitHub Action — configure-aws-credentials | GitHub Marketplace | https://github.com/aws-actions/configure-aws-credentials | Free |
| AWS Skill Builder — AWS Technical Essentials | Course | https://explore.skillbuilder.aws/learn/course/1851 | Free |
| AWS Free Tier reference | AWS Pricing | https://aws.amazon.com/free/ | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| S3 Static website hosting | S3 website endpoint, bucket policies | Before Step 2 |
| CloudFront Getting started | Distribution setup, cache behaviors | Before Step 3 |
| CloudFront — Origin Access Control | Secure bucket access pattern | During Step 3 |
| CloudFront — Invalidating files | When/how to run invalidations | During Step 3 |
| CodeBuild buildspec reference | Phase structure, artifact paths | During Step 5 |
| CodePipeline Getting started | Pipeline stages, action types | During Step 5 |
| configure-aws-credentials README | Action inputs, role assumption | During Step 4 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **AWS Free Tier** — S3 | Host a static site (5GB storage, unlimited GET requests free) | Free |
| **AWS Free Tier** — CloudFront | 1TB data transfer + 10M requests/month free for 12 months | Free |
| **AWS Free Tier** — CodeBuild | 100 build-minutes/month on `general1.small` | Free |
| **AWS Skill Builder** | AWS Technical Essentials course (free, 4h) | Free |
| **GitHub.com** | GitHub Actions workflows running `aws s3 sync` | Free |
| **AWS Workshops** — https://workshops.aws | Static website workshop, CDN patterns | Free |

---

## Hands-On
- Deploy one static frontend to S3 + CloudFront
- Automate build and upload with GitHub Actions or CodeBuild
- Run one CloudFront invalidation flow
- Document the faster and safer versioned-assets alternative

## Deliverables
- `frontend-aws-static` demo
- Deployment diagram
- One rollback note for broken frontend deployment

## Validation
- Can explain why direct public bucket hosting is weaker than CloudFront + restricted origin
- Can describe when to invalidate cache vs use versioned asset names
- Can show a full frontend delivery path from commit to CDN

## Exit Criteria
- AWS frontend delivery feels routine and reproducible

## Notes
- This phase is about delivery mechanics, not advanced frontend framework work.
