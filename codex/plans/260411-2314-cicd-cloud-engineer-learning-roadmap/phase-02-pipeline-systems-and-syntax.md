---
phase: 2
title: "Pipeline Systems And Syntax"
effort: 30h
depends: [1]
---

# Overview
Learn to read and write minimal pipelines across the major systems named in the research: GitHub Actions, GitLab CI, Jenkins, CodeBuild, and Cloud Build.

## Agent & Skills
- **Agent**: `researcher`
- **Skills**: `research`, `docs-seeker`, `knowledge-retrieval`
- **Handoffs**:
  - After completion -> `devops-engineer`

## Goals
- Understand the shared pipeline shape across tools
- Author minimal working examples in each system
- Know which tool fits which context

## Topics
- `on`, `jobs`, `steps`, permissions, secrets, caching in GitHub Actions
- `stages`, `rules`, `artifacts`, `cache`, `environments` in GitLab CI
- Declarative `Jenkinsfile` structure
- `buildspec.yml` in CodeBuild
- `cloudbuild.yaml` and `steps` in Cloud Build

---

## Step-by-Step Learning Path

### Step 1 — GitHub Actions Deep Dive (8h)
GitHub Actions is your primary authoring surface. Master it end-to-end before touching anything else.
- Concepts: `workflow`, `job`, `step`, `action` — understand how they nest
- Triggers: `push`, `pull_request`, `workflow_dispatch`, `schedule`, `workflow_call` — learn each one
- Context & expressions: `github.*`, `env.*`, `steps.*`, `needs.*`, `if:` conditionals
- Reusing workflow logic: `uses:` for community actions, `workflow_call` for reusable workflows
- Caching: `actions/cache` — cache `node_modules`, pip, Go modules; understand key design
- Secrets: `${{ secrets.MY_SECRET }}` — how scoping works (repo → environment → org)
- Permissions: `permissions: id-token: write` — why you need this for OIDC (comes back in Phase 7)
- Matrices: run the same job across multiple OS/Node versions
- Practice: write 3 workflows — a plain CI, a matrix build, and a workflow with a reusable workflow call

### Step 2 — GitLab CI Literacy (5h)
GitLab CI is heavily used in enterprise and European orgs. You need to read and reason about `.gitlab-ci.yml` confidently.
- Core structure: `stages`, `jobs`, `script`, `before_script`, `after_script`
- Rules and conditions: `rules: if:` — more powerful than `only/except` (which is legacy)
- Artifacts: `artifacts: paths:` — how files pass between jobs
- Caching: `cache: key:` — per-branch caching pattern
- Environments: `environment: name:` — deployment tracking in GitLab UI
- Runners: GitLab-hosted (SaaS), self-managed — understand the difference
- Practice: create a `.gitlab-ci.yml` in a free GitLab.com project with 3 stages: lint, test, build

### Step 3 — Jenkins Declarative Pipeline (5h)
Jenkins is legacy in many orgs but commonly tested in interviews and widely deployed. Focus on Declarative (not Scripted).
- Core structure: `pipeline { agent any stages { stage('Name') { steps { ... } } } }`
- Environment variables: `environment { MY_VAR = 'value' }`
- Post actions: `post { always { } success { } failure { } }`
- Credentials: `withCredentials([ ... ])` block — never hardcode
- Build triggers: poll SCM, webhooks, `triggers { pollSCM(...) }`
- Understand: Jenkins master vs agent, executor slots, queue
- Practice: run Jenkins locally via Docker (`docker run -p 8080:8080 jenkins/jenkins:lts`), create one Declarative pipeline from a `Jenkinsfile`

### Step 4 — AWS CodeBuild + buildspec.yml (4h)
CodeBuild is the execution engine behind CodePipeline. The `buildspec.yml` is its workflow file.
- Core structure: `version`, `phases` (`install`, `pre_build`, `build`, `post_build`), `artifacts`, `cache`
- Environment variables: standard vars + `parameter-store` and `secrets-manager` integrations
- Build image selection: AWS-managed images vs custom Docker images
- Reports: unit test result reporting (JUnit XML format)
- Practice: create one CodeBuild project in the AWS Console (free tier), point it at a GitHub repo, run a build via `buildspec.yml`

### Step 5 — Google Cloud Build + cloudbuild.yaml (4h)
Cloud Build is GCP's fully managed CI execution service. Its config model is distinct from GitHub Actions.
- Core structure: `steps` array — each step is a container image + `args`
- Built-in builders: `gcr.io/cloud-builders/gcloud`, `docker`, `npm`, `gradle`
- Substitution variables: `$PROJECT_ID`, `$BRANCH_NAME`, `$SHORT_SHA`
- Secrets: Secret Manager integration via `secretEnv`
- Triggers: push to branch, PR, manual — set up in Cloud Build Triggers UI
- Artifacts: uploading to GCS or Artifact Registry
- Practice: create a Cloud Build trigger in GCP Console (free tier), connect to GitHub, run a build with a simple `cloudbuild.yaml`

### Step 6 — Cross-Tool Comparison (4h)
Now synthesise. This is where interview-readiness gets built.
- Build a comparison table: trigger model, secret model, runner/execution model, artifact model, best-fit scenario
- Answer: "Which would you use for a startup with 5 engineers?" vs "Which for an enterprise AWS shop?"
- Understand cost models: GitHub Actions minutes, GitLab minutes, CodeBuild build-minutes, Cloud Build minutes
- Write a 1-page decision note: why GitHub Actions is your primary surface and what would change that

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| GitHub Actions — Understanding GitHub Actions | Official Docs | https://docs.github.com/en/actions/about-github-actions/understanding-github-actions | Free |
| GitHub Actions — Workflow syntax reference | Official Docs | https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions | Free |
| GitHub Actions — Reusing workflows | Official Docs | https://docs.github.com/en/actions/sharing-automations/reusing-workflows | Free |
| GitHub Actions — Caching dependencies | Official Docs | https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows | Free |
| GitLab CI/CD — Reference | Official Docs | https://docs.gitlab.com/ee/ci/yaml/ | Free |
| GitLab CI/CD — Getting started | Official Docs | https://docs.gitlab.com/ee/ci/quick_start/ | Free |
| Jenkins — Pipeline Syntax | Official Docs | https://www.jenkins.io/doc/book/pipeline/syntax/ | Free |
| Jenkins — Docker image (local run) | Docker Hub | https://hub.docker.com/r/jenkins/jenkins | Free |
| AWS CodeBuild — buildspec reference | Official Docs | https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html | Free |
| AWS CodeBuild — Getting started | Official Docs | https://docs.aws.amazon.com/codebuild/latest/userguide/getting-started.html | Free |
| Cloud Build — Configuring builds | Official Docs | https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration | Free |
| Cloud Build — Built-in substitutions | Official Docs | https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values | Free |
| Cloud Build — Quickstart | Official Docs | https://cloud.google.com/build/docs/build-push-docker-image | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| GitHub Actions — Understanding GitHub Actions | Core concepts before writing | Before Step 1 |
| GitHub Actions Workflow Syntax | Reference while authoring | During Step 1 |
| GitHub Actions — Reusing workflows | For reusable workflow step | During Step 1 |
| GitLab CI YAML reference | Full keyword list | During Step 2 |
| Jenkins Pipeline Syntax | Declarative structure | During Step 3 |
| CodeBuild buildspec reference | Phase/artifact structure | During Step 4 |
| Cloud Build — Create basic configuration | Step structure and builders | During Step 5 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GitHub.com** (free) | Author all GitHub Actions workflows with 2,000 min/month | Free |
| **GitLab.com** (free tier) | Create project, add `.gitlab-ci.yml`, run pipelines (400 CI min/month) | Free |
| **Jenkins via Docker** (local) | `docker run -p 8080:8080 jenkins/jenkins:lts` — full Jenkins locally | Free |
| **AWS Console — CodeBuild** (free tier) | 100 build-minutes/month on `general1.small` | Free |
| **GCP Console — Cloud Build** (free tier) | 120 build-minutes/day | Free |

---

## Hands-On
- Write one minimal config per tool that prints environment info and runs a fake test
- Create a comparison table: trigger model, secret model, runner model, best fit
- Practice reading one official doc page per tool and extracting only the core blocks

## Deliverables
- `5` tiny pipeline files
- One comparison sheet: `pipeline-systems-comparison.md`
- One decision note on why GitHub Actions is your primary authoring surface

## Validation
- Can identify what a broken pipeline is doing from the config alone
- Can explain the difference between GitHub-hosted, self-hosted, and cloud-managed execution
- Can compare GitHub Actions vs GitLab CI vs Jenkins in interview form

## Exit Criteria
- You can author minimal YAML or Jenkinsfile examples from memory
- You know enough syntax to stop being blocked by tool unfamiliarity

## Notes
- Aim for breadth plus core fluency, not equal depth across all tools.
