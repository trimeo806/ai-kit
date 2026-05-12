---
phase: 9
title: "Production Hardening"
effort: 45h
depends: [5, 6, 7, 8]
---

# Overview
Make the roadmap production-shaped by adding security scanning, observability, progressive delivery, rollback checks, and cost awareness.

## Agent & Skills
- **Agent**: `devops-engineer`
- **Skills**: `cloud-architect`, `infra-cloud`
- **Handoffs**:
  - After completion -> `security-auditor`
  - After security review topics -> `docs-manager`

## Goals
- Add release safety, visibility, and operational discipline
- Show you understand more than just "pipeline runs green"
- Prepare one portfolio artifact that looks production-aware

## Topics
- Test reporting and quality gates
- SAST, DAST, dependency scanning, container scanning
- Canary, blue/green, traffic splitting, rollback verification
- Logs, metrics, alerts, dashboards
- Build/runtime cost control

---

## Step-by-Step Learning Path

### Step 1 — Static Application Security Testing (SAST) in CI (7h)
Security scanning should happen at commit time, not after a breach. Understand what SAST catches and what it doesn't.
- Understand: SAST = analyse source code for vulnerability patterns without running the code; catches XSS, SQLi, hardcoded secrets, insecure dependencies
- Tools: **Semgrep** (fast, flexible, free OSS), **CodeQL** (GitHub-native, powerful on GitHub Actions), **Snyk Code** (free tier)
- Secrets scanning: **truffleHog** or **gitleaks** — scan for accidentally committed secrets in git history
- GitHub Advanced Security: CodeQL, secret scanning, dependency review — free for public repos
- What SAST does NOT catch: runtime vulnerabilities, auth logic errors, business logic flaws
- Practice: add Semgrep and CodeQL to your GitHub Actions workflow; review findings; set a policy — fail on `error` severity, warn on `warning`
- Practice: run `gitleaks detect` on your repo; fix any findings before moving on

### Step 2 — Dependency and Container Scanning (6h)
Most breaches come from third-party code, not first-party bugs. Scan both layers.
- **Dependency scanning**: Snyk (`snyk test`), OWASP Dependency-Check, GitHub Dependabot — check `package.json`, `go.mod`, `requirements.txt` for CVEs
- **Container scanning**: Trivy (`trivy image`), Snyk Container, AWS ECR scan-on-push, GCP Container Analysis
- CVE severity: CRITICAL and HIGH should block merge to main; MEDIUM requires a fix-by deadline; LOW is informational
- Suppression: maintain a `.trivyignore` or Snyk `.snyk` file for accepted false positives — document why each is suppressed
- SBOMs (Software Bill of Materials): `trivy sbom --format cyclonedx` — generate a list of all components in your image; increasingly required in enterprise
- Practice: add Trivy image scan to your Phase 3 build pipeline; set `exit-code: 1` on CRITICAL; review and suppress one legitimate false positive

### Step 3 — Test Quality Gates (5h)
"Tests passed" is not the same as "quality is sufficient." Add gates that enforce minimum standards.
- Code coverage thresholds: set a minimum coverage % (`--coverage-threshold-lines 80`) — fail pipeline below threshold
- Test reporting: output results as JUnit XML; upload to GitHub Actions test reporter, CodeBuild reports, or Datadog CI Visibility
- Performance tests: `k6` or `locust` for load testing — add a p95 latency gate to your CI (fail if > 500ms under 10 RPS)
- Mutation testing (optional): `stryker` (JS) or `mutmut` (Python) — verifies that tests actually catch bugs, not just run them
- Practice: add a JUnit XML test report upload to your GitHub Actions workflow; view the test tab in the Actions UI
- Practice: add a coverage gate — fail the pipeline if coverage drops below your current baseline

### Step 4 — Progressive Delivery: Canary and Blue/Green (8h)
Progressive delivery reduces blast radius. Learn the patterns before picking the tooling.
- **Canary deploy**: route a small % of traffic to new version; watch error rates and latency; promote to 100% if healthy; rollback if not
- **Blue/green deploy**: run two identical environments; switch load balancer target; instant rollback by switching back
- Implementation options:
  - ECS blue/green: AWS CodeDeploy + ECS (built-in support); configure shift timing (linear, canary, all-at-once)
  - Cloud Run traffic splitting: `--traffic=NEW=10,STABLE=90` — per-revision weight; trivially easy
  - Kubernetes: `Argo Rollouts` or `Flagger` for automated canary based on metrics; or manual via two Deployments + Service
- Feature flags: `LaunchDarkly` (paid), `Growthbook` (free OSS), or a simple env var pattern — decouple deploy from release
- Practice: implement Cloud Run 10/90 traffic split; promote to 100% after 15 minutes if error rate < 1%
- Practice: configure ECS blue/green via CodeDeploy for one service

### Step 5 — Observability: Logs, Metrics, Alerts (8h)
You can't verify a production deploy without observability. This step connects your pipeline to runtime visibility.
- **Structured logging**: JSON logs with `level`, `message`, `timestamp`, `trace_id` — always use structured, never `console.log('error happened')`
- AWS observability: CloudWatch Logs (log ingestion), CloudWatch Metrics (custom + built-in), CloudWatch Alarms (SNS notification on threshold breach)
- GCP observability: Cloud Logging (structured log ingestion), Cloud Monitoring (metrics, uptime checks), Cloud Alerting
- Distributed tracing: AWS X-Ray or Cloud Trace — trace a request across your Lambda/ECS/Cloud Run services
- Dashboards: create a CloudWatch or Cloud Monitoring dashboard with: request rate, error rate, p50/p95 latency, deployment event markers
- Deploy markers: annotate dashboards with "deploy v1.2.3 at 14:30" — enables fast correlation between deploys and regressions
- Practice: add CloudWatch Alarms for your ECS service: 5xx error rate > 1%, p95 latency > 1s; route to an SNS topic (mock email)

### Step 6 — Rollback Automation and Smoke Tests (5h)
Deployments don't end when the pipeline turns green. Smoke tests verify the live system.
- Smoke test: a lightweight test suite that runs against the **deployed environment**, not a mocked version; covers the top 3 user paths
- Implementation: `curl` with status code check, `Playwright` in CI, `k6` quick load test, health endpoint (`/healthz`)
- Auto-rollback pattern: `deploy → wait 60s → run smoke test → if exit code != 0: rollback`
- Rollback tooling: ECS `update-service --task-definition {previous}`, Cloud Run `gcloud run services update-traffic --to-revisions={stable}=100`, Kubernetes `kubectl rollout undo deployment/app`
- Alerting on rollback events: send Slack notification when a pipeline triggers a rollback
- Practice: add a smoke test job to your ECS deploy workflow; test a bad deploy and verify the auto-rollback triggers

### Step 7 — Cost Awareness (4h)
Cloud costs are an engineering responsibility, not just a finance one. Know your pipeline and runtime costs.
- Pipeline costs: GitHub Actions minutes (calculate your monthly usage), CodeBuild build-minutes, Cloud Build minutes — optimise slow pipelines first
- Runtime costs: ECS Fargate (vCPU × memory × hours), Lambda (requests + GB-seconds), Cloud Run (requests + CPU allocation)
- Spot/Preemptible/Spot instances for CI runners: 70% cost reduction; acceptable for CI but not for production workloads
- Cost anomaly detection: AWS Cost Anomaly Detection (free) and GCP Budget alerts — prevent surprises
- Practice: review your AWS and GCP billing consoles; estimate the monthly cost of keeping your Phase 5 and Phase 6 labs running; document what you'd turn off between sessions

---

## Resources & Documentation

| Resource | Type | URL | Cost |
|----------|------|-----|------|
| Semgrep — Getting started | Official Docs | https://semgrep.dev/docs/getting-started/ | Free |
| CodeQL — GitHub Actions integration | Official Docs | https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/configuring-advanced-setup-for-code-scanning | Free |
| Gitleaks — Detect secrets | GitHub Repo | https://github.com/gitleaks/gitleaks | Free |
| Trivy — Container scanning | Official Docs | https://trivy.dev/latest/docs/target/container_image/ | Free |
| Snyk — Free tier | Product | https://snyk.io | Free tier |
| AWS CodeDeploy — Blue/green with ECS | Official Docs | https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html | Free |
| Cloud Run — Traffic migration (canary) | Official Docs | https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration | Free |
| Argo Rollouts — Getting started | Official Docs | https://argo-rollouts.readthedocs.io/en/stable/getting-started/ | Free |
| AWS CloudWatch — Create alarms | Official Docs | https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html | Free |
| GCP Cloud Monitoring — Alerting policies | Official Docs | https://cloud.google.com/monitoring/alerts/using-alerting-ui | Free |
| k6 — Getting started | Official Docs | https://grafana.com/docs/k6/latest/get-started/running-k6/ | Free |
| GrowthBook — OSS Feature Flags | Official Docs | https://docs.growthbook.io | Free (OSS) |
| AWS Cost Anomaly Detection | Official Docs | https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html | Free |

---

## What to Read

| Read | Focus | When |
|------|-------|------|
| Semgrep Getting started | Rule basics, CI integration | Before Step 1 |
| CodeQL Actions integration | GitHub SAST setup | During Step 1 |
| Trivy container scanning docs | Scan command, exit codes | Before Step 2 |
| AWS CodeDeploy blue/green with ECS | Blue/green configuration | During Step 4 |
| Cloud Run traffic migration | Revision-based canary | During Step 4 |
| CloudWatch create alarms | Alarm thresholds, SNS | During Step 5 |
| GCP Cloud Monitoring alerting | Alert policies, notification channels | During Step 5 |
| k6 Getting started | Load test syntax, thresholds | During Step 3 |

---

## Where to Practice

| Platform | What to do | Cost |
|----------|-----------|------|
| **GitHub.com** — Code Scanning | Enable CodeQL on a public repo; free with Advanced Security | Free |
| **Semgrep** (local CLI + CI) | `semgrep scan --config=auto .` — run against your repos | Free |
| **Trivy** (local CLI) | Scan your images before push | Free |
| **Snyk** (free tier) | Connect GitHub repo; view dependency vulnerabilities | Free |
| **Grafana Play** — https://play.grafana.org | Explore dashboards without an account | Free |
| **k6** (local) | Write and run load tests against local or cloud services | Free |
| **GrowthBook** (free OSS) | Self-host feature flag service for progressive delivery practice | Free |
| **AWS Console** — CloudWatch | Create alarms, dashboards for Phase 5 services | Free tier |
| **GCP Console** — Cloud Monitoring | Create alerting policy for Phase 6 Cloud Run | Free tier |

---

## Hands-On
- Add one SAST tool and one container scan to a pipeline
- Add one smoke test after deployment
- Create one canary or traffic-splitting demo
- Build one small dashboard or alert checklist

## Deliverables
- `prod-ready-cicd` demo
- One security and observability checklist
- One cost note on pipeline/runtime tradeoffs

## Validation
- Can explain why deployment success is not the same as release safety
- Can show how a pipeline verifies, not just deploys
- Can explain the rollback path for at least one advanced flow

## Exit Criteria
- You have at least one portfolio artifact with real production concerns addressed

## Notes
- Keep the hardening set opinionated and small. Depth beats checkbox sprawl.
