---
name: infra-docker
description: Use when writing or reviewing Dockerfiles, docker-compose files, .dockerignore, container images, local container dev setups, or containerized deployments; also when an image is too big, a build is slow to cache, or a container fails to start
user-invocable: false

metadata:
  agent-affinity: [developer, planner]
  keywords: [docker, container, dockerfile, compose, deployment, devops]
  platforms: [all]
  triggers: ["Dockerfile", "docker-compose.yml", "container", "docker"]
---

# Docker Skill

## Purpose
Containerization for development and deployment.

## Load project rules first
If not already in context, read `.ai-kit/workspace.json` and the `AGENTS.md` chain, per
`${CLAUDE_PLUGIN_ROOT}/references/project-rules-contract.md`. Base images, registry, runtime
versions, build and run commands come from **Stack**, **Commands** and **Security & data**; follow
the repo's existing Dockerfiles before these patterns. Missing → ask once and suggest saving it
with `/ai-kit:setup-rules`. Build images only when the user asks; pushing to a registry always
needs an explicit yes.

## Expertise

### Dockerfile Patterns
- Multi-stage builds
- Layer optimization
- Caching strategies
- Security scanning

### Docker Compose
- Service definition
- Volume management
- Network configuration
- Environment variables

### Build Optimization
- Layer ordering
- .dockerignore
- BuildKit features
- Cache mounts

### Production Patterns
- Minimal base images
- Non-root user
- Health checks
- Signal handling

### Volume Management
- Named volumes
- Bind mounts
- Volume drivers
- Backup strategies

### Network Configuration
- Bridge networks
- Overlay networks
- Service discovery
- Load balancing

## Patterns

### Multi-stage Node.js Build
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

### Development Compose
```yaml
services:
  app:
    build: .
    volumes:
      - .:/app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
  db:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=secret

volumes:
  postgres-data:
```

### Production Compose
```yaml
services:
  app:
    image: registry.example.com/app:1.4.2
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
```

### .dockerignore
```
node_modules
npm-debug.log
.git
.env
*.md
```

## Best Practices
- Use specific version tags (or digests), never `latest` in production
- Run as non-root user
- Minimize layers
- COPY before RUN for cache
- Use health checks
- Don't bundle development dependencies
- No secrets in the image or build args; use runtime secrets or BuildKit `--secret`

## Dependencies
- Docker Engine 20+
- Docker Compose v2
