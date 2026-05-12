---
phase: 1
title: "Foundation And CI Fundamentals"
effort: 40h
depends: []
---

# Overview
Build the baseline needed for every later phase: Git workflow, YAML fluency, Linux CLI comfort, Docker basics, and the mental model of a CI/CD pipeline.

## Agent & Skills
- **Agent**: `planner`
- **Skills**: `plan`, `knowledge-retrieval`, `research`
- **Handoffs**:
  - After completion -> `researcher`

## Goals
- Understand `commit -> PR -> CI -> artifact -> deploy -> verify -> rollback`
- Be comfortable in `bash`, `git`, `docker`, and YAML-based configuration
- Explain the difference between `cache`, `artifact`, `image`, and `registry`

## Topics
- Git branching, PR flow, trunk-based development
- YAML syntax, environment variables, quoting, indentation errors
- Bash basics, exit codes, pipes, `curl`, `jq`
- Dockerfile basics, image build/tag/push, registry concepts
- CI/CD fundamentals: trigger, job, step, stage, approval, rollback

---

## Step-by-Step Learning Path

### Step 1 — Git Basics & Branching Model (6h)
Learn the mechanics behind every pipeline: a commit triggers everything. Focus on branching strategy first — trunk-based development is the dominant model in CI/CD-heavy orgs.
- Read chapters 1–3 of *Pro Git* (free online) — working tree, staging, commits, remotes
- Practice: create a repo, make 3 branches, open a PR, review the diff, merge
- Understand: `git rebase` vs `git merge`, when each is appropriate
- Write in your own words: what is the difference between `origin/main` and `main`?

### Step 2 — YAML Syntax Deep Enough to Debug (4h)
Every pipeline config is YAML. A misplaced space breaks your build. Learn to read and write YAML confidently — not just copypaste it.
- Read the YAML spec cheatsheet (see Resources below)
- Practice: deliberately break YAML in 5 different ways and fix it — wrong indent, missing quote, wrong anchor, tab vs spaces, special character
- Understand: scalar types (string, int, bool, null), block vs flow style, multiline strings (`|` vs `>`)
- Tool: use `yamllint` to validate locally before committing

### Step 3 — Linux CLI and Bash Essentials (8h)
CI runners are Linux. You need to read scripts, write one-liners, and debug exit codes without guessing.
- Core commands: `ls`, `cd`, `cat`, `grep`, `find`, `chmod`, `env`, `export`, `echo`
- Pipes and redirects: `|`, `>`, `>>`, `2>&1`
- Exit codes: `$?`, `set -e`, `set -o pipefail` — why they matter in CI
- Tools you'll use constantly: `curl`, `jq`, `sed`, `awk`, `xargs`
- Practice: write a bash script that fetches a URL, extracts a JSON field with `jq`, and prints a coloured pass/fail message

### Step 4 — Docker Fundamentals (10h)
Containers are the universal delivery unit. This step covers everything from writing your first Dockerfile to pushing to a registry.
- Understand: image vs container vs layer vs volume vs registry
- Write a `Dockerfile` for a simple Node/Python app (multi-stage preferred)
- Run and inspect: `docker build`, `docker run`, `docker ps`, `docker logs`, `docker exec`, `docker inspect`
- Tag and push: `docker tag`, `docker push` to Docker Hub or GitHub Container Registry
- Understand build cache: why layer order matters, what invalidates the cache
- Practice: write a Dockerfile that intentionally has a bad layer order, then fix it and compare build times

### Step 5 — CI/CD Mental Model (6h)
Before writing pipelines, understand the conceptual shape they share across all tools.
- Learn the pipeline vocabulary: trigger, job, step/task, stage, runner/agent, artifact, environment, approval
- Map: `commit -> branch check -> lint -> test -> build artifact -> deploy to staging -> approve -> deploy to production -> smoke test -> rollback if needed`
- Understand: what "green CI" actually means vs "safe to ship"
- Read: the Continuous Delivery book (intro chapters) or the Google SRE chapter on release engineering
- Write: a 1-page glossary in your own words (`cicd-foundations-cheatsheet.md`)

### Step 6 — First GitHub Actions Workflow (6h)
Put all the above together in one running example.
- Create a repo with a tiny app (Node `hello-world` is fine)
- Write a `.github/workflows/ci.yml` that: triggers on push to `main`, installs dependencies, runs a lint step, runs a test step, uploads an artifact
- Add one caching step for `node_modules` or pip packages
- Break it on purpose (bad secret reference, wrong path) and debug from the Actions log
- Understand: `on`, `jobs`, `steps`, `uses`, `run`, `env`, `secrets`, `with`, `needs`

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| Pro Git Book (chapters 1–3, 5) | Book (free) | https://git-scm.com/book/en/v2 | Free |
| GitHub Actions — Quickstart | Official Docs | https://docs.github.com/en/actions/writing-workflows/quickstart | Free |
| GitHub Actions — Workflow syntax reference | Official Docs | https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions | Free |
| YAML cheatsheet by yaml.org | Reference | https://yaml.org/refcard.html | Free |
| yamllint — YAML linter | Tool | https://yamllint.readthedocs.io | Free |
| Docker Get Started guide (parts 1–4) | Official Docs | https://docs.docker.com/get-started/ | Free |
| Docker — Dockerfile reference | Official Docs | https://docs.docker.com/reference/dockerfile/ | Free |
| The Missing Semester of Your CS Ed — Shell & Bash | Course | https://missing.csail.mit.edu/2020/shell-tools/ | Free |
| Trunk-Based Development site | Article | https://trunkbaseddevelopment.com | Free |
| Google SRE Book — Chapter 8: Release Engineering | Book (free) | https://sre.google/sre-book/release-engineering/ | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Pro Git Ch 1–3 | Core git mental model | Before Step 1 |
| Pro Git Ch 5 | Distributed workflows, PR flow | After Step 1 |
| GitHub Actions Quickstart | First workflow | Before Step 6 |
| GitHub Actions — Understanding workflow syntax | Syntax reference to keep open | During Step 6 |
| Docker Get Started Part 1–4 | Build, run, publish, compose | During Step 4 |
| Missing Semester — Shell Tools & Scripting | Bash, pipes, exit codes | During Step 3 |
| Trunk-Based Development site | Branching model rationale | During Step 1 |
| Google SRE Ch 8 | Release mental model | During Step 5 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GitHub.com** (free account) | Create `hello-ci` repo, author GitHub Actions workflows, use free 2,000 min/month | Free |
| **Play with Docker** — https://labs.play-with-docker.com | Browser-based Docker environment, no install needed | Free |
| **KillerCoda** — https://killercoda.com | Interactive Linux/Docker/K8s scenarios in browser | Free tier |
| **Docker Desktop** (local) | Full local Docker environment for image building | Free |
| **GitHub Container Registry** (ghcr.io) | Free image registry for public repos | Free |

---

## Hands-On
- Create a small `hello-ci` repo
- Add one fake lint/test workflow in GitHub Actions
- Build and tag one Docker image locally
- Write a short glossary for CI/CD terms in your own words

## Deliverables
- `hello-ci` demo repo
- One passing GitHub Actions workflow
- One Docker image built locally
- One notes document: `cicd-foundations-cheatsheet.md`

## Validation
- Can explain a pipeline without reading notes
- Can debug a broken YAML indentation problem
- Can describe when to use cache vs artifact

## Exit Criteria
- Git, YAML, CLI, and Docker no longer feel like blockers
- Ready to compare pipeline systems instead of just memorizing tool syntax

## Notes
- Keep this phase tool-light. Do not chase advanced AWS/GCP topics yet.
