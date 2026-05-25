---
name: docs-init
description: "Scan codebase and generate structured KB documentation"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "[--migrate | scan and generate KB docs]"
  keywords:
    - docs-init
    - documentation
    - generate-docs
    - scaffold-docs
  agent-affinity:
    - docs-manager
  platforms:
    - all
  connections:
    requires: [knowledge-retrieval]
---

# Docs: Init

Scan codebase and generate structured Knowledge Base documentation following the `knowledge-retrieval` skill format.

## Usage
```
/docs-init              # Generate KB structure from codebase analysis
/docs-init --migrate    # Convert existing flat docs to KB structure
```

## Mode Detection

- `$ARGUMENTS` contains `--migrate` → **Migration Mode**
- Otherwise → **Generation Mode**

## Index Update Rule (applies to ALL modes)

After any mode completes:

| Index | When to update | What to update |
|-------|---------------|----------------|
| `docs/index.json` | After generating or migrating any doc file | `entries[]` (all generated/migrated entries), `updatedAt` |
| `reports/index.json` | After writing the task completion report | Append entry per `core/references/index-protocol.md` |

**Never finish without a complete `docs/index.json`.** Every generated or migrated file must have a corresponding entry before you stop.

---

## Generation Mode

### 1. Scan the Codebase
- Use Glob to explore directory structure
- Use Grep to find key patterns (imports, exports, types, routes)
- Read key files (package.json, pom.xml, tsconfig, configs, Dockerfile, CI configs)
- Identify: framework, language, database, deployment, major deps, modules

### 2. Create KB Directory Structure

```
docs/
├── index.json
├── decisions/
├── architecture/
├── patterns/
├── conventions/
├── features/
├── findings/
│   └── .gitkeep
└── guides/
    └── .gitkeep
```

### 3. Auto-Generate Documents

Use templates from `knowledge-retrieval` skill. Generate based on detected signals:

#### ADRs (from major dependencies)
For each major framework/library detected (e.g., Next.js, Redux, Hibernate):
- `ADR-NNNN-{dep-name}.md` — why this dep was chosen
- Infer context from package.json/pom.xml version, config files, usage patterns
- Set `status: accepted`, write Decision Drivers from config evidence

#### ARCH (from project structure)
- `ARCH-0001-overview.md` — project overview, tech stack, directory structure, data flow
- Additional ARCH docs for detected subsystems (e.g., ARCH-0002-api-layer.md if API routes found)

#### CONVs (from linting/config)
- Detect from: eslint/prettier configs, tsconfig strictness, naming patterns in code
- `CONV-NNNN-{convention}.md` — with Correct/Incorrect examples from actual code

#### FEATs (from route groups/modules)
- Detect from: route files, module directories, feature folders
- `FEAT-NNNN-{feature}.md` — What/Why/How for each major feature area

#### PATTERNs (from recurring code)
- Detect from: provider wrappers, HOC usage, custom hooks, middleware chains
- `PATTERN-NNNN-{pattern}.md` — with actual code examples from the codebase

#### FINDINGs
- Create `findings/.gitkeep` only — findings are populated during debugging, not init

#### GUIDEs (from setup/workflow signals)
- Detect from: Dockerfile, docker-compose, Makefile, CI configs, .env.example, README setup sections
- `GUIDE-NNNN-{topic}.md` — step-by-step operational how-to (local dev setup, backend integration, deployment, CI/CD)
- Focus on commands and environment — not architecture (that's ARCH) or rules (that's CONV)
- Create `guides/.gitkeep` if no setup signals detected

### 4. Generate index.json

Create `docs/index.json` with all generated entries:

```json
{
  "schemaVersion": "1.0.0",
  "description": "Project documentation registry",
  "updatedAt": "{today YYYY-MM-DD}",
  "categories": {
    "decision": "Architectural choices and reasoning (ADRs)",
    "architecture": "System structure, libs, data flow",
    "pattern": "Reusable code patterns with examples",
    "convention": "Coding rules and constraints",
    "feature": "Deep-dive guides for specific features",
    "finding": "Discovered gotchas and debug insights",
    "guide": "Operational how-to guides for dev setup, integration, and workflows"
  },
  "entries": [
    {
      "id": "ADR-0001",
      "title": "...",
      "category": "decision",
      "status": "accepted",
      "audience": ["agent", "human"],
      "path": "docs/decisions/ADR-0001-title.md",
      "tags": [],
      "agentHint": "check before ...",
      "related": []
    }
  ]
}
```

Key rules for `agentHint`:
- Start with "check before..." — tells agents *when* to read this doc
- Be specific: "check before choosing routing strategy" not "routing docs"

### 5. Report

```markdown
## Documentation Generated

| Category | Count | Files |
|----------|-------|-------|
| ADR | N | ADR-0001, ADR-0002, ... |
| ARCH | N | ARCH-0001, ... |
| CONV | N | CONV-0001, ... |
| FEAT | N | FEAT-0001, ... |
| PATTERN | N | PATTERN-0001, ... |
| FINDING | 0 | (populated during debugging) |
| GUIDE | N | GUIDE-0001, ... |

**Total**: N entries in `docs/index.json`
**Next**: Run `/docs-update --verify` to validate content accuracy
```

## Migration Mode (`--migrate`)

Convert existing flat docs to KB structure.

### 1. Read Existing Flat Docs
Read all files in `docs/*.md` (top-level only, not subdirectories).

### 2. Map Content to KB Categories

| Flat File | Target | Category |
|-----------|--------|----------|
| `codebase-summary.md` | `ARCH-0001-overview.md` | architecture |
| `code-standards.md` | Split into `CONV-NNNN-*.md` entries | convention |
| `system-architecture.md` | `ARCH-0002-system-architecture.md` | architecture |
| `api-routes.md` | `FEAT-NNNN-api-routes.md` | feature |
| `data-models.md` | `ARCH-NNNN-data-models.md` | architecture |
| `deployment-guide.md` | `GUIDE-NNNN-deployment.md` | guide |
| `setup-guide.md`, `getting-started.md` | `GUIDE-NNNN-local-dev.md` | guide |
| `integration-guide.md` | `GUIDE-NNNN-integration.md` | guide |
| `project-overview-pdr.md` | `ARCH-NNNN-project-overview.md` | architecture |
| Other `.md` files | Classify by content → appropriate category | varies |

### 3. Reformat Content
- Apply KB templates from `knowledge-retrieval` skill
- Add `## Status`, `## Tags` sections where appropriate
- Split large files if > 800 LOC

### 4. Supplement with Codebase Scan
After migrating existing content, scan codebase for gaps:
- Missing ADRs for major deps → generate
- No patterns documented → detect and generate
- No conventions → detect from config

### 5. Create index.json
Build `docs/index.json` with all migrated + newly generated entries.

### 6. Clean Up
- Delete original flat files (they've been migrated)
- One bulk commit with all changes

## Analysis Rules
- Scan EVERYTHING — don't skip directories
- Look for config files (package.json, tsconfig.json, .env.example)
- Check for Docker files, CI configs
- Find test files to understand testing approach
- Examine imports/exports to understand dependencies
- **Evidence-based only** — verify functions/classes/routes exist before documenting
- Keep files under 800 LOC (docs.maxLoc)
