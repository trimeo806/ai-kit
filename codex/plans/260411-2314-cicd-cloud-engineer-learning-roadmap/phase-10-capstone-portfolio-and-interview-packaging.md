---
phase: 10
title: "Capstone Portfolio And Interview Packaging"
effort: 25h
depends: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Overview
Turn the roadmap into visible proof: a flagship capstone, smaller supporting labs, clean documentation, and interview-ready explanations.

## Agent & Skills
- **Agent**: `docs-manager`
- **Skills**: `doc-coauthoring`, `knowledge-capture`, `research`
- **Handoffs**:
  - During progress tracking -> `project-manager`

## Goals
- Package learning into a strong portfolio signal
- Produce assets that explain decisions, tradeoffs, and operations clearly
- Prepare concise interview stories around architecture and delivery choices

## Topics
- Capstone scoping
- Architecture diagrams
- Runbooks and rollback notes
- Portfolio narration and README quality
- Interview question prep on tooling tradeoffs

---

## Step-by-Step Learning Path

### Step 1 — Select and Scope the Flagship Capstone (4h)
One coherent story beats five half-finished projects. Scope it hard and finish it completely.
- Criteria for a good capstone: end-to-end pipeline, multi-environment, security-aware, observable, rollback-capable
- Suggested scope (choose one and adapt):
  - **Option A — Full-stack CI/CD on AWS**: `hello-api` containerised backend + React frontend → ECS Fargate + S3/CloudFront + CodePipeline (or GitHub Actions) with OIDC auth, SAST scan, Trivy scan, CloudWatch alarms, smoke test gate, dev→staging→prod environments, Terraform for infra
  - **Option B — GCP-first with Cloud Run**: same backend → Cloud Run + Cloud Storage/CDN + Cloud Build + WIF auth + Container Analysis scan + Cloud Monitoring, dev→staging→prod with Cloud Run traffic split as canary
  - **Option C — Polyglot pipeline story**: GitHub Actions for CI → push to ECR (AWS) and Artifact Registry (GCP) → parallel ECS and Cloud Run deploys → single observability view; emphasises multi-cloud and pipeline comparison
- Resolve: which option tells your best career story? Write a 3-sentence scope statement before building

### Step 2 — Build the Capstone (8h)
Execute it cleanly. Focus on demonstrating breadth-with-depth, not feature count.
- Plan the repo structure first: `infra/`, `app/`, `.github/workflows/` or `cloudbuild.yaml`, `docs/`
- Implement in this order: pipeline (CI runs and passes) → registry push → deploy to dev → promote to staging → deploy to prod with approval gate → smoke test → rollback demo
- Check each item against the plan success criteria:
  - ✅ At least one OIDC/WIF keyless auth flow
  - ✅ At least one container workload deployed
  - ✅ At least one environment promotion with approval gate
  - ✅ Security scan in pipeline (SAST or container scan)
  - ✅ Observable (logs + one alert configured)
  - ✅ Rollback documented and demonstrated

### Step 3 — Supporting Labs Selection (2h)
Pick 2–3 smaller labs from your earlier phase work that add diversity to the portfolio.
- Recommended selection criteria: each lab covers a different tool, platform, or pattern than the flagship
- Suggested picks:
  - Lab 1: GitLab CI pipeline from Phase 2 (shows multi-tool literacy)
  - Lab 2: Terraform multi-environment stack from Phase 8 (shows IaC depth)
  - Lab 3: Cloud Run 10/90 canary from Phase 9 (shows progressive delivery)
- For each lab: clean up the repo, add a `README.md`, add a one-paragraph "what I learned and what I would do differently"

### Step 4 — Architecture Diagrams (3h)
A diagram communicates in 30 seconds what a README takes 5 minutes to explain.
- Draw one diagram for the flagship capstone: end-to-end flow from developer push to deployed workload (include CI, registry, cloud, monitoring)
- Tools: **Excalidraw** (free, hand-drawn style, easy), **draw.io/diagrams.net** (free, professional style), **Mermaid** in README (no image needed, renders on GitHub)
- Minimum diagram elements: developer laptop → git push → CI trigger → build → registry → deploy → load balancer → runtime → monitoring → alert
- Include an environment flow diagram: dev → staging → prod with approval gate marker
- Save as SVG or PNG in `docs/diagrams/`; embed in the README

### Step 5 — Write the Release Runbook (2h)
A runbook is a concise, step-by-step reference for a specific operational task. It's one of the clearest ways to show production maturity in a portfolio.
- Write `docs/runbooks/release-and-rollback.md`:
  - Pre-release checklist (5–8 items): all tests passing, staging smoke test green, migration script reviewed, on-call aware, rollback command ready
  - Release steps: numbered steps, specific commands, expected outputs at each step
  - Rollback steps: exact commands for each service (ECS, Cloud Run, Kubernetes)
  - Verification: how to confirm the rollback succeeded (smoke test, log check, metric check)
- Keep it under 2 pages — runbooks used in an incident must be fast to read

### Step 6 — Polish READMEs for Public Consumption (3h)
Your portfolio repos will be read by engineers spending 2 minutes deciding whether to keep reading. Make the first 10 lines count.
- Flagship README structure:
  1. One-line description ("End-to-end CI/CD pipeline for a containerised API, deployed to ECS Fargate on AWS with OIDC auth, security scanning, and automated rollback")
  2. Architecture diagram
  3. What was built (bullet list of system components)
  4. Pipeline overview (flow from commit to production)
  5. Key technical decisions + why (link to ADRs or decision notes)
  6. How to run locally (if applicable)
  7. Lessons learned / what I would change
- Review checklist: no credentials in history, no hardcoded account IDs, no unexplained TODOs, no broken links

### Step 7 — Interview Prep: Tradeoff Questions (3h)
The questions below are the most commonly asked CI/CD and cloud engineering interview topics. Prepare a 2-minute answer for each.

**Pipeline tradeoffs**:
- "Why did you choose GitHub Actions over GitLab CI?" (tool fit, team size, GitHub native)
- "How would you handle a pipeline that takes 30 minutes to run?" (caching, parallelism, test splitting, incremental builds)
- "When would you use CodePipeline instead of GitHub Actions?" (all-AWS shop, native integrations, compliance needs)

**Deployment tradeoffs**:
- "When would you use ECS vs Lambda vs EKS?" (container app vs function vs cluster platform engineering)
- "Explain blue/green vs canary deploy. Which did you use and why?" (canary = gradual traffic shift + metrics gate; blue/green = pre-warmed parallel env + instant switch)
- "How do you do a zero-downtime database migration?" (expand-migrate-contract; backward-compatible DDL; separate migration job from app deploy)

**Security**:
- "What's wrong with storing AWS access keys in GitHub Secrets?" (long-lived, reused, leaked in forks/logs — OIDC eliminates the key)
- "What is OIDC in CI/CD context?" (short-lived token exchange between CI platform and cloud IAM; no static credential stored)

**Observability**:
- "How do you know a deployment was successful?" (smoke test + metrics baseline, not "pipeline green")
- "Describe your rollback procedure for [service]." (specific commands, timing, verification step)

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| Excalidraw — Architecture diagrams | Tool | https://excalidraw.com | Free |
| draw.io / diagrams.net | Tool | https://app.diagrams.net | Free |
| Mermaid — GitHub-native diagrams | Docs | https://mermaid.js.org/intro/ | Free |
| GitHub — Writing a good README | Guide | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes | Free |
| gitleaks — Scan repo history for secrets | Tool | https://github.com/gitleaks/gitleaks | Free |
| LinkedIn — DevOps/Cloud Engineering profiles | Reference | https://www.linkedin.com | Free |
| Levels.fyi — salary benchmarks for DevOps/SRE | Reference | https://www.levels.fyi | Free |
| DevOps Roadmap (roadmap.sh) | Reference | https://roadmap.sh/devops | Free |
| ADR Tools — Architecture Decision Records | Tool | https://github.com/npryce/adr-tools | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Mermaid intro | Diagram syntax for READMEs | Before Step 4 |
| GitHub README guide | What makes a good README | Before Step 6 |
| DevOps roadmap.sh | Validate your coverage against the field standard | During Step 7 |
| ADR Tools README | How to write Architecture Decision Records | Before writing capstone ADRs |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GitHub.com** (public repos) | Host capstone and all lab repos publicly for portfolio visibility | Free |
| **Excalidraw** | Draw architecture diagrams; export as SVG for README | Free |
| **GitHub Gist** | Host standalone runbooks and cheatsheets | Free |
| **LinkedIn** | Write a short post about each project as you complete it — real-world signal | Free |
| **Pramp / Interviewing.io** | Practice the interview stories and tradeoff questions out loud | Free tier |

---

## Hands-On
- Build one flagship end-to-end project
- Select `2-3` smaller labs as supporting artifacts
- Write one release runbook and one incident response note
- Record answers for common CI/CD and cloud tradeoff questions

## Deliverables
- One flagship capstone repo
- Portfolio README set
- Architecture diagram pack
- Interview prep sheet with tradeoff answers

## Validation
- A reviewer can understand your capstone without a live walkthrough
- You can defend tool choices and non-choices in plain language
- Your portfolio shows progression from basics to production-grade delivery

## Exit Criteria
- You are ready to apply for CI/CD, DevOps, platform, or cloud-engineering roles with proof of work

## Notes
- Do not overload the capstone. One coherent story is stronger than many partial projects.
