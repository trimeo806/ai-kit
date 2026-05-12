---
phase: 3
title: "Artifacts Containers And Registries"
effort: 30h
depends: [1, 2]
---

# Overview
Move from toy pipelines to build outputs that matter: artifacts, container images, caches, and registries.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `infra-docker`, `cloud-architect`
- **Handoffs**:
  - After completion -> `devops-engineer` for AWS delivery

## Goals
- Build production-shaped artifacts, not just run steps
- Understand image tagging, promotion, and registry flow
- Learn where caching improves speed and where it creates confusion

## Topics
- Artifact lifecycle
- Docker build layers and cache behavior
- Tagging with commit SHA, branch, semantic version
- ECR and Artifact Registry basics
- Container scan basics and immutable artifact promotion

---

## Step-by-Step Learning Path

### Step 1 — Understand Docker Layer Caching (5h)
Layer caching is the most misunderstood Docker topic. Get it right and build times drop 80%. Get it wrong and cache misses cost you minutes on every commit.
- Understand: each `RUN`, `COPY`, `ADD` creates a layer; layers are cached by hash of instruction + parent
- Rule: put rarely changing instructions first (`FROM`, `RUN apt install`), frequently changing last (`COPY . .`)
- Practice: build the same image with good and bad layer order; compare times
- Understand: what `--no-cache` does; why CI may need it for security scans but not for speed builds
- Multi-stage builds: `FROM node:20 AS builder` → `FROM node:20-alpine` — reduce final image size

### Step 2 — Image Tagging Strategy (4h)
One of the most consequential decisions in a CI pipeline. Consistency here prevents deploy confusion and rollback failures.
- Tag patterns: `latest` (avoid in production), `main-abc1234` (commit SHA), `v1.2.3` (semver release), `pr-42` (PR preview)
- Immutability rule: never overwrite an existing image tag once deployed — it breaks rollback and auditability
- Practice: write a GitHub Actions step that builds and tags using `${{ github.sha }}` and `${{ github.ref_name }}`
- Understand: how to promote the same image tag from staging to prod (no rebuild)

### Step 3 — AWS ECR (Elastic Container Registry) (6h)
ECR is the go-to registry for images deployed to ECS, Lambda, or EKS.
- Concepts: private registry per AWS account + region, repository per app, image tags
- Auth: `aws ecr get-login-password | docker login` — understand why the token expires every 12 hours
- Lifecycle policies: automatically expire old images to control cost
- Cross-account access: when apps in one account pull images from another account's ECR
- Practice: create one ECR private repository in AWS Console; push an image from CLI and from a GitHub Actions workflow using OIDC (preview for Phase 7)
- Image scanning: enable on push to catch known CVEs before deployment

### Step 4 — GCP Artifact Registry (4h)
Artifact Registry is GCP's unified store for Docker images, npm packages, Maven JARs, and more.
- Concepts: repository = region + format + name; Docker images live in `{region}-docker.pkg.dev/{project}/{repo}/{image}:{tag}`
- Auth: `gcloud auth configure-docker {region}-docker.pkg.dev` or Workload Identity (Phase 7)
- Cleanup policies: auto-delete untagged images older than N days
- Vulnerability scanning: Container Analysis API — enable per repo
- Practice: create one Docker repository in GCP Console; push the same image you built for ECR

### Step 5 — Artifact Promotion Pattern (5h)
The core principle: build once, promote everywhere. Never rebuild the same code for staging vs prod.
- Understand: why rebuilding for prod introduces subtle risk (different dependencies, different build env state)
- Promotion flow: `build → push to ECR/AR with commit SHA → test → approve → tag the same image as 'production' → deploy`
- Practice: implement a GitHub Actions workflow with two jobs — `build-and-push` (commits SHA tag) and `promote` (copies the SHA tag to `stable` or `v1.x.x` using `docker tag`)
- CI caching with registries: pull the `latest` tag before building to warm layer cache (`--cache-from`)

### Step 6 — Container Scanning Basics (6h)
Add security to the build pipeline before cloud deployment phases.
- Tools: Trivy (open source, fast), Snyk (free tier), Docker Scout (free for public images), AWS ECR scan-on-push
- What they scan: OS packages, language dependencies, misconfigurations
- Severity levels: CRITICAL, HIGH, MEDIUM, LOW — define what blocks the pipeline
- Practice: run `trivy image {your-image}` locally; add a Trivy scan GitHub Actions step; fail the pipeline on CRITICAL
- Understand: the difference between scan-at-build-time and continuous registry scanning

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| Docker — Dockerfile best practices | Official Guide | https://docs.docker.com/build/building/best-practices/ | Free |
| Docker — Multi-stage builds | Official Docs | https://docs.docker.com/build/building/multi-stage/ | Free |
| Docker — Layer caching | Official Docs | https://docs.docker.com/build/cache/ | Free |
| AWS ECR — Getting started | Official Docs | https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-console.html | Free |
| AWS ECR — Private registry auth | Official Docs | https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html | Free |
| AWS ECR — Lifecycle policies | Official Docs | https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html | Free |
| GCP Artifact Registry — Quickstart | Official Docs | https://cloud.google.com/artifact-registry/docs/docker/quickstart | Free |
| GCP Artifact Registry — Cleanup policies | Official Docs | https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy | Free |
| Trivy — Installation & usage | Official Docs | https://trivy.dev/latest/getting-started/installation/ | Free |
| Trivy — GitHub Actions integration | Official Docs | https://github.com/aquasecurity/trivy-action | Free |
| GitHub Actions — Build and push Docker images (with GHCR) | Community Action | https://github.com/docker/build-push-action | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Docker best practices guide | Layer order, multi-stage | Before Step 1 |
| Docker multi-stage builds | Size reduction technique | During Step 1 |
| Docker layer caching docs | Cache invalidation rules | During Step 1 |
| ECR Getting started | Create registry, push image | Before Step 3 |
| ECR registry authentication | Token-based auth flow | During Step 3 |
| Artifact Registry Docker quickstart | Push to GCP | Before Step 4 |
| Trivy documentation | Scan commands and output | During Step 6 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **Docker Desktop** (local) | Build layers, test caching, multi-stage builds | Free |
| **GitHub Container Registry** (ghcr.io) | Push images from GitHub Actions workflows | Free |
| **AWS Console + ECR** (free tier) | Create private repo, push image, enable scan | Free (500MB/month storage free) |
| **GCP Console + Artifact Registry** (free tier) | Create Docker repo, push image, test scanning | Free (0.5GB/month free) |
| **Trivy** (local CLI) | `trivy image` — scan your own images | Free |
| **KillerCoda — Docker scenarios** | https://killercoda.com/docker | Free |

---

## Hands-On
- Containerize one small API
- Push image to one registry on AWS and one on GCP
- Add a pipeline that builds, tags, and publishes the image
- Record build duration before and after caching

## Deliverables
- One `hello-api` container project
- One registry push flow
- One writeup on artifact promotion and image immutability

## Validation
- Can explain why rebuild-on-promote is risky
- Can trace an artifact from commit to registry
- Can debug a failed image push or auth error

## Exit Criteria
- You have a repeatable build-and-publish flow ready for cloud deployment phases

## Notes
- Keep one simple app throughout the roadmap when possible to reduce noise.
