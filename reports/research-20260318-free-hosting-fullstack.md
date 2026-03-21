# Research: Free Hosting Options for Full-Stack Assessment Project

**Date:** 2026-03-18
**Agent:** researcher
**Scope:** Compare free hosting tiers for Next.js frontend + Python FastAPI backend; evaluate CI/CD, repository structure, and secrets management
**Status:** ACTIONABLE

---

## Research Question

What are the best free hosting options for deploying a working full-stack application (Next.js frontend + Python FastAPI backend) for a take-home assessment? What are the constraints, trade-offs, and optimal deployment patterns?

---

## Executive Summary

**Recommended Stack:**
- **Frontend:** Vercel (free tier) — purpose-built for Next.js, unlimited bandwidth, native SSR support
- **Backend:** Google Cloud Run (free tier) — generous compute minutes, scale-to-zero, no auto-sleep concerns
- **CI/CD:** GitHub Actions (free for public repos) — unlimited standard runners, no minute limits
- **Repository:** Monorepo pattern — simplifies deployment coordination and environment variable management for assessment

**Bottom Line:** This combination costs $0/month, requires no credit card for frontend/CI-CD, provides production-quality performance, and demonstrates full-stack competency to reviewers.

---

## 1. Frontend Hosting (Next.js)

### Platform Comparison

| Aspect | Vercel | Netlify | Cloudflare Pages |
|--------|--------|---------|------------------|
| **Free Tier Bandwidth** | 100 GB/month | 100 GB/month | Unlimited (pay-as-you-go after) |
| **SSR Support** | Native (optimized) | Requires OpenNext adapter | Limited (static/ISR) |
| **Serverless Functions** | 100,000 invocations/month | 125,000 invocations/month | Limited |
| **Custom Domains** | Yes | Yes | Yes |
| **Build Minutes** | Unlimited | 100/month (reduced in 2025) | Unlimited |
| **Cold Starts** | Fast (~100-200ms) | Slower (~400-600ms) | Very fast (edge) |
| **Next.js Features** | First-class (gets features first) | Good (via OpenNext) | Limited |
| **Environment Variables** | Secure, encrypted storage | Encrypted storage | Encrypted storage |
| **Auto-deploy on Push** | Yes | Yes | Yes |
| **Commercial Use** | No (Hobby tier personal-only) | Yes | Yes |

### Verdict for Assessment

**Vercel** is the clear winner:
- Next.js is built by Vercel — native SSR, streaming, edge middleware all work optimally
- 100 GB bandwidth easily handles assessment traffic
- Zero cost, no strings attached (assessments are non-commercial personal projects)
- Automatic deployments on git push to main
- Environment variables easily configurable via dashboard or CLI

**Caveat:** Vercel's Hobby tier (free) is "for personal, non-commercial projects only." Assessments fall into this category. If your assessment becomes a portfolio/commercial piece, upgrade to Pro ($20/month) later.

**Alternative:** Cloudflare Pages if you need unlimited bandwidth, but static/ISR-only (not ideal for dynamic Next.js features).

---

## 2. Backend Hosting (Python FastAPI)

### Platform Comparison

| Aspect | Google Cloud Run | Render | Fly.io | Koyeb | Railway |
|--------|------------------|--------|--------|-------|---------|
| **Free Tier Status (2025-2026)** | Generous | Yes | $5 credit monthly | Yes | Discontinued |
| **Compute/RAM** | 4 GB memory, 2 CPU | 512 MB RAM, shared CPU | $5 credit worth ~10 hrs/month | 1 vCPU, 512 MB RAM | N/A |
| **Docker Support** | Yes | Yes | Yes | Yes | N/A |
| **Cold Starts** | ~1-2s (scale-to-zero) | ~3-5s (free tier sleeps after 15 min) | Moderate (~2-3s) | ~2-3s | N/A |
| **Auto-sleep** | No (scale-to-zero) | **Yes (15 min inactivity)** | No | No | N/A |
| **PostgreSQL** | Free tier available | Deleted after 90 days (free) | $5 credit covers usage | Via add-on | N/A |
| **Environment Variables** | Via Secret Manager (free) | Dashboard + CLI | Dashboard | Dashboard | N/A |
| **Pricing Model** | Pay-per-use (free tier covers most hobby use) | Fixed tier (free tier, paid tiers start $7) | Credit-based | Fixed tiers | N/A |
| **Best For** | Scale-to-zero, global | Simple deployments | Low-latency global | Quick prototypes | — |

### Analysis of Each

**Google Cloud Run (RECOMMENDED)**
- Free tier: 2M requests/month, 360K vCPU-seconds, 1M GB-seconds
- Typical FastAPI assessment uses <10K requests/month (easily in free tier)
- Scale-to-zero means no auto-sleep penalties
- No credit card required to start
- Proven, production-grade Google infrastructure
- Cold starts ~1-2s, acceptable for assessment
- Secret Manager integration for API keys

**Render**
- Simpler to set up than Cloud Run (fewer CLI steps)
- **Major downside:** Free tier puts services to sleep after 15 minutes of inactivity
- Cold start after sleep: 3-5 seconds + wake-up latency = 5-10s total
- Problematic for assessment review (reviewer visits app, waits 10s for cold start)
- PostgreSQL on free tier deleted after 90 days (ok for ephemeral assessment)
- Build minutes: included

**Fly.io**
- No free tier (replaced with $5/month credit)
- Suitable if you want global deployment for demonstrating edge capability
- Cold starts moderate (~2-3s)
- Less ideal for "zero cost" assessment

**Koyeb**
- Free tier: 1 vCPU, 512 MB RAM, 1 GB/day bandwidth
- Quick setup, good documentation
- Bandwidth limit (1 GB/day) is tight for assessment with multiple reviewers
- Viable as third choice if Cloud Run/Render unavailable

**Railway**
- Free tier discontinued (August 2023)
- Not recommended

### Verdict for Assessment

**Google Cloud Run** is the clear winner:
- Free tier generous enough for assessment traffic
- No auto-sleep penalty
- Simple Docker-based deployment
- Handles environment variables securely
- Demonstrates cloud-native (containerized) deployment

**Runner-up:** Render (if simpler UI preferred, but accept 10s cold start on reviewer's first visit)

---

## 3. CI/CD Pipeline

### GitHub Actions (Free for Public Repos)

**Status (2025-2026):** Remains free and unlimited for public repositories.

**Free Tier Details:**
- Standard GitHub-hosted runners: unlimited minutes (no changes as of 2026)
- Self-hosted runners: unlimited (but only on public repos)
- Larger runners: always cost extra (not needed for assessment)
- 11.5B total Actions minutes run on public projects in 2025 — GitHub's commitment to open source

**Recommended Pipeline:**

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Frontend
      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Lint frontend
        run: cd frontend && npm run lint

      - name: Test frontend
        run: cd frontend && npm run test

      # Backend
      - name: Install backend dependencies
        run: cd backend && pip install -r requirements.txt

      - name: Lint backend (ruff/pylint)
        run: cd backend && ruff check .

      - name: Test backend
        run: cd backend && pytest

  deploy-frontend:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy backend-service \
            --source . \
            --region us-central1 \
            --allow-unauthenticated \
            --set-env-vars DUFFEL_API_KEY=${{ secrets.DUFFEL_API_KEY }}
```

**Benefits:**
- Lint → Test → Build → Deploy workflow
- Auto-deploy on push to main
- Free, unlimited standard runners
- Secrets stored securely in GitHub (never exposed in logs)
- Parallel job execution for frontend and backend

---

## 4. Monorepo vs. Separate Repositories

### Comparison

| Aspect | Monorepo | Separate Repos |
|--------|----------|---|
| **Atomic Changes** | ✓ Single commit spans frontend+backend | ✗ Requires coordinated commits |
| **Shared Code** | ✓ Data models, validation logic, enums | ✗ Code duplication likely |
| **Build Performance** | ✗ Both build even if only one changed | ✓ Independent builds |
| **Environment Variables** | ✓ Single CI/CD pass manages both | ✗ Must sync secrets across repos |
| **Team Collaboration** | ✓ Clear contract between layers | ✗ Requires external coordination tools |
| **Repo Size** | ✗ Grows faster | ✓ Smaller per-repo |
| **Access Control** | ✗ All-or-nothing | ✓ Fine-grained per-repo |

### For Assessment Context

**Monorepo is strongly recommended** because:

1. **Simplifies Reviewer Experience:** One repo to clone, one CI/CD to watch
2. **Shared Types:** Define API contract in shared TypeScript (e.g., Zod schema)
   ```typescript
   // shared/schemas.ts
   export const BookingSchema = z.object({
     id: z.string(),
     passengerName: z.string(),
     flightId: z.string(),
     bookedAt: z.date(),
   });
   ```
   - Backend validates with same schema
   - Frontend types are automatically correct
3. **Single CI/CD Pipeline:** Easier to manage secrets (one `.env` build matrix)
4. **Atomic Refactoring:** Rename a field in the schema, update both layers in one commit
5. **Demonstrates Full-Stack Maturity:** Shows understanding of modern full-stack architecture

**Repository Structure:**
```
project-root/
├── frontend/                 # Next.js app
│   ├── src/
│   ├── package.json
│   ├── vercel.json          # Vercel config
│   └── .env.local
├── backend/                  # FastAPI app
│   ├── src/
│   ├── requirements.txt
│   ├── Dockerfile           # For Cloud Run
│   └── main.py
├── shared/                   # TypeScript types, schemas
│   ├── schemas.ts           # Zod schemas for type safety
│   ├── types.ts
│   └── package.json
├── .github/workflows/        # CI/CD
│   └── deploy.yml
├── .gitignore
└── README.md
```

---

## 5. Environment Variables & Secrets Management

### Best Practices

**Rule 1: Never Commit Secrets**
- Add `.env`, `.env.local`, `*.pem`, `credentials.json` to `.gitignore`
- Use `.env.example` to document structure
  ```
  # .env.example
  DUFFEL_API_KEY=<paste-your-key-here>
  LEGACY_API_BASE_URL=https://api.legacy.example.com
  DATABASE_URL=postgresql://user:pass@localhost/db
  ```

**Rule 2: Platform-Specific Injection**

| Platform | How to Set Secrets | Location |
|----------|-------------------|----------|
| **Vercel (Frontend)** | Dashboard → Settings → Environment Variables | Encrypted at rest in Vercel |
| **Google Cloud Run (Backend)** | `gcloud run deploy --set-env-vars KEY=value` OR Secret Manager | Injected at deploy time |
| **GitHub Actions (CI/CD)** | Repository → Settings → Secrets → Actions | Encrypted, masked in logs |

**Rule 3: Principle of Least Privilege**
- Frontend should NOT see Duffel API key (keep on backend only)
- Backend needs Duffel key, legacy API URL
- Separate secrets for local dev vs. staging vs. production

**Example Setup:**

Backend FastAPI with Pydantic settings:
```python
# backend/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    duffel_api_key: str  # From env var DUFFEL_API_KEY
    legacy_api_base_url: str = "https://api.legacy.example.com"
    database_url: str  # From DATABASE_URL

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
```

Frontend (.env.local — never committed):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_TIMEOUT=30000
```

In CI/CD (GitHub Actions):
```yaml
env:
  DUFFEL_API_KEY: ${{ secrets.DUFFEL_API_KEY }}
  LEGACY_API_BASE_URL: ${{ secrets.LEGACY_API_BASE_URL }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Rule 4: Rotation & Monitoring**
- For assessments: Create dedicated API keys for the test environment
- Rotate keys every 90 days in production (not critical for temporary assessment)
- Monitor API key usage in provider dashboards (Duffel dashboard, etc.)

---

## Recommended Deployment Architecture

```
┌─────────────────┐
│   Git (Main)    │  ← Push code here
└────────┬────────┘
         │
         ├─→ GitHub Actions CI/CD
         │   ├─ Lint (frontend + backend)
         │   ├─ Test (both layers)
         │   └─ Deploy if tests pass
         │
         ├─────────────────────────────────────┐
         │                                       │
         ▼                                       ▼
    ┌─────────────┐                    ┌──────────────────┐
    │   Vercel    │                    │ Google Cloud Run │
    │ (Frontend)  │                    │   (Backend)      │
    │ Static +    │  ◀────────────────▶│  FastAPI + DB    │
    │ SSR Next.js │   REST/gRPC        │  (Containerized) │
    │             │                    │                  │
    └─────────────┘                    └──────────────────┘
         │                                      │
         │ .env variables injected             │ .env variables injected
         │ via Vercel dashboard                │ via gcloud deploy
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                      Public URL
                     (assessment link)
```

---

## Cost Breakdown (Monthly)

| Component | Cost | Notes |
|-----------|------|-------|
| Vercel (Next.js frontend) | $0 | 100 GB bandwidth, unlimited builds |
| Google Cloud Run (FastAPI) | $0 | Covers typical assessment traffic |
| GitHub Actions CI/CD | $0 | Unlimited standard runners on public repo |
| Custom domain (optional) | $10-15/year | Namecheap, Cloudflare Registrar, etc. |
| **Total** | **$0/month** | Completely free for assessment |

---

## Deployment Checklist

### Before First Deploy

- [ ] Create GitHub repo (public or private, both work)
- [ ] Set up monorepo structure (frontend/, backend/, shared/)
- [ ] Create `.env.example` (no real secrets)
- [ ] Connect Vercel to GitHub repo
- [ ] Create Vercel environment variables (DUFFEL_API_KEY, LEGACY_API_BASE_URL, etc.)
- [ ] Create Google Cloud project
- [ ] Enable Cloud Run API
- [ ] Create service account for GitHub Actions
- [ ] Add GitHub Actions secrets (DUFFEL_API_KEY, GCP_SA_KEY, etc.)
- [ ] Test local deployment (docker build, npm run dev)

### First Deploy

- [ ] Push to main (triggers GitHub Actions)
- [ ] Watch Actions logs for lint/test results
- [ ] Verify frontend deployed to Vercel URL
- [ ] Verify backend deployed to Cloud Run URL
- [ ] Test API calls from frontend to backend
- [ ] Verify environment variables are injected correctly
- [ ] Test error handling (invalid API key, etc.)

### Final Checks

- [ ] Add deployed URLs to README
- [ ] Add setup instructions (how to run locally)
- [ ] Document API endpoints
- [ ] Verify reviewers can access without additional setup
- [ ] Test on fresh clone (no .env needed for reviewer)

---

## Cold Start Impact & Mitigation

| Platform | Cold Start | Impact on Assessment | Mitigation |
|----------|-----------|----------------------|------------|
| Vercel (frontend) | ~100-200ms | Negligible | N/A |
| Google Cloud Run | ~1-2s | Minor (first request slower) | Service is ready after, no re-sleep |
| GitHub Actions | N/A | Builds take ~2-3 min | Parallel jobs, caching helps |
| Render (alternative) | ~5-10s after 15 min sleep | **Noticeable if idle** | Not recommended for cold start reasons |

**For Assessment:** Cloud Run's cold start is acceptable. Reviewers typically access the app immediately after deployment, so cold start penalty is minimal. Render's auto-sleep is problematic if reviewer returns hours later.

---

## Security Checklist

- [ ] No `.env` files in git (add to .gitignore)
- [ ] All API keys in GitHub Secrets and Vercel/GCP environment variables
- [ ] API key rotation if using personal account (use test/ephemeral keys)
- [ ] CORS configured on backend (allow frontend domain)
- [ ] HTTPS everywhere (automatic on Vercel, Cloud Run)
- [ ] No sensitive logs exposed in GitHub Actions
- [ ] Public repo okay for assessment (no auth required)

---

## Unresolved Questions

1. **Database for Assessment:** Will the assessment require persistent data (PostgreSQL)? If yes, Cloud Run's free tier includes Cloud SQL allowance; Render's PostgreSQL is deleted after 90 days (fine for assessment but not production-like).

2. **Image/File Storage:** If the app uploads files, use Cloud Storage (free tier) or rely on database BLOBs.

3. **Third-Party Service Limits:** Duffel API free tier limits (requests/day, read-only vs. mutations)? Verify before assessment.

4. **Reviewer Authentication:** Is the assessment app public (anyone can access) or private (reviewer given credentials)? Public is simpler for deployment.

5. **Async Job Processing:** Does the assessment need background jobs (Celery, etc.)? Simple assessment: no. Complex: may need Cloud Tasks or Google Pub/Sub (free tier sufficient).

---

## Sources

- [Vercel vs Netlify vs Cloudflare Pages: 2025 Comparison for Developers](https://www.ai-infra-link.com/vercel-vs-netlify-vs-cloudflare-pages-2025-comparison-for-developers/)
- [Next.js Hosting Options Compared: Vercel, Netlify, Cloudflare, AWS, GCP, Azure (2025)](https://www.nandann.com/blog/nextjs-hosting-options-comparison)
- [Python Hosting Options Compared: Vercel, Fly.io, Render, Railway, AWS, GCP, Azure (2025)](https://www.nandann.com/blog/python-hosting-options-comparison)
- [Railway vs Fly.io vs Render: Which Cloud Gives You the Best ROI? (2025)](https://medium.com/ai-disruption/railway-vs-fly-io-vs-render-which-cloud-gives-you-the-best-roi-2e3305399e5b)
- [Koyeb Free Tier – Pricing & Limits (2025)](https://www.freetiers.com/directory/koyeb)
- [GitHub Actions · GitHub Features](https://github.com/features/actions)
- [Pricing changes for GitHub Actions · GitHub](https://resources.github.com/actions/2026-pricing-changes-for-github-actions/)
- [Frontend Monorepos: A Comprehensive Guide - DEV Community](https://dev.to/tecvanfe/frontend-monorepos-a-comprehensive-guide-2d31)
- [Choosing Between Monorepo and Multi-Repo Architectures in Software Development](https://medium.com/@kazimozkabadayi/choosing-between-monorepo-and-multi-repo-architectures-in-software-development-5b9357334ed2)
- [Managing Environment Variables in FastAPI Applications – Dev Central](https://dev.turmansolutions.ai/2025/07/08/managing-environment-variables-in-fastapi-applications/)
- [Secure FastAPI Environment Variables on Cloud Run with Secret Manager](https://davidmuraya.com/blog/fastapi-cloud-run-secret-manager/)
- [Rotating environment variables - Vercel](https://vercel.com/docs/environment-variables/rotating-secrets/)
- [FastAPI: Settings and Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)
- [Advanced Performance Tuning for FastAPI on Google Cloud Run](https://davidmuraya.com/blog/fastapi-performance-tuning-on-google-cloud-run/)
- [Make your Take-Home Coding Assignment stand out](https://eliya-b.medium.com/make-your-take-home-coding-assignment-stand-out-477f6f1efa81)
- [Crack the Take-Home: How to Ace Technical Test Assignments](https://maxim-gorin.medium.com/crack-the-take-home-how-to-ace-technical-test-assignments-d6f9771b687b)

---

## Verdict: ACTIONABLE

This research provides a complete, zero-cost deployment strategy with clear trade-offs documented. Proceed with **Vercel + Google Cloud Run + GitHub Actions + Monorepo pattern**. All components are proven, free, and production-grade for assessment purposes.
