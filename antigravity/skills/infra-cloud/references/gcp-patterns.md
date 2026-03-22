---
name: arch/cloud/gcp-patterns
description: "GCP service patterns for tri-ai-kit infrastructure"
---

# GCP Infrastructure Patterns

## Services Used

| Service | Purpose | Config |
|---------|---------|--------|
| Cloud Run | Stateless services | Terraform |
| GKE | Stateful workloads | Terraform + Helm |
| Cloud SQL | PostgreSQL managed | Terraform |
| Cloud Storage | Object storage | Terraform |
| Cloud Build | CI/CD pipelines | cloudbuild.yaml |
| Artifact Registry | Container images, Maven artifacts | Terraform |
| Cloud Pub/Sub | Async messaging | Terraform |
| Secret Manager | Secrets management | Terraform |
| Cloud Monitoring | Observability | Terraform + dashboards |

## Infrastructure as Code

- **Tool**: Terraform (HCL)
- **State**: GCS backend with state locking
- **Modules**: Shared Terraform modules in `modules/`
- **Environments**: dev, staging, prod (workspace-based)

## CI/CD

```yaml
# cloudbuild.yaml pattern
steps:
  - name: 'maven:3-openjdk-8'
    entrypoint: mvn
    args: ['clean', 'package', '-DskipTests']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '$_IMAGE', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '$_IMAGE']
```

## Naming Conventions

- Projects: `tri-ai-kit-<env>-<service>`
- Resources: `<service>-<env>-<resource>`
- Images: `<region>-docker.pkg.dev/<project>/<repo>/<image>`

## Security

- Workload Identity for GKE → GCP service accounts
- VPC Service Controls for data perimeter
- Binary Authorization for container signing
- Secret Manager for all credentials (never env vars in code)
