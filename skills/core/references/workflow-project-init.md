# Workflow: Project Initialization

Bootstrap a new project or module with structure, docs, and initial commit.

## Steps

### 1. Bootstrap
**Agent**: developer (via `/bootstrap`)

- Detect project type from context or ask user
- Recommend tech stack based on project requirements
- Create project structure (dirs, configs, initial files)
- Set up build tooling, linting, testing framework

### 2. Documentation
**Agent**: docs-manager

- Create `docs/` KB structure:
  - `README.md` — project overview (<300 lines)
  - `code-standards.md` — codebase conventions
  - `system-architecture.md` — architecture overview
  - `docs/index.json` — knowledge base index
- Generate codebase summary

### 3. Git
**Agent**: git-manager

- `git init` (if needed)
- Initial commit with all bootstrapped files
- Set up `.gitignore`

## Integration

This workflow is also triggered by:
- `/get-started` skill — when onboarding to existing project
- `/bootstrap` skill — when scaffolding new module within existing project
