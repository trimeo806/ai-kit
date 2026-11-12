---
name: arch/cloud/gcp-patterns
description: "GCP service patterns"
---

# GCP infrastructure patterns

General defaults; the project rules win where they differ.

## Building blocks

| Service | Typical use | Managed with |
|---------|-------------|--------------|
| Cloud Run | Stateless HTTP services and jobs | Terraform |
| GKE | Workloads that need Kubernetes | Terraform + Helm / Kustomize |
| Cloud SQL / AlloyDB | Managed PostgreSQL / MySQL | Terraform |
| Cloud Storage | Object storage | Terraform |
| Cloud Build / Cloud Deploy | CI/CD | `cloudbuild.yaml`, delivery pipelines |
| Artifact Registry | Container images, language packages | Terraform |
| Pub/Sub | Async messaging | Terraform |
| Secret Manager | Secrets | Terraform (secret, not value) |
| Cloud Logging / Monitoring | Observability | Terraform + dashboards |

## Infrastructure as code

- **State**: GCS backend with object versioning; one state per environment and stack.
- **Modules**: shared modules versioned and pinned.
- **Environments**: one project per environment (`dev`, `staging`, `prod`) is the safest boundary.

## CI/CD

```yaml
steps:
  - name: '<build image for the stack>'
    entrypoint: '<build tool>'
    args: ['<build command from the project rules>']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '$_IMAGE', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '$_IMAGE']
```

Deploy by image digest, not a mutable tag.

## Naming

- Projects: `<org>-<env>-<system>`
- Resources: `<service>-<env>-<resource>`
- Images: `<region>-docker.pkg.dev/<project>/<repo>/<image>`

## Security

- Workload Identity (GKE) or a dedicated service account per Cloud Run service; no exported keys.
- Workload Identity Federation for CI (GitHub, GitLab, Azure DevOps) instead of service-account keys.
- VPC Service Controls for a data perimeter where data sensitivity needs it.
- Binary Authorization for signed images where supply-chain policy needs it.
- Secret Manager for every credential, mounted or read at runtime; never in env files in the repo.
