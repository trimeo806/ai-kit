# Workflow: Architecture Review

Brainstorm → Research → Decide → Document. For evaluating trade-offs and making architectural decisions.

## Steps

### 1. Brainstorm
**Agent**: brainstormer

- Generate multiple solution approaches
- Consider caching, lazy loading, CDN, code splitting
- Evaluate trade-offs for each approach
- Suggest unconventional solutions
- Prioritize by impact vs effort

**Example**: "Need to improve app performance?" → brainstorms multiple optimization strategies → considers caching, lazy loading, CDN, code splitting → evaluates trade-offs → helps prioritize based on impact vs effort

### 2. Research
**Agent**: researcher (spawn 2-3 in parallel)

- Researcher 1: Implementation patterns and best practices
- Researcher 2: Security and compliance implications
- Researcher 3: Performance benchmarks and comparisons
- All report back to planner for decision-making

**Example**: "Need payment integration?" → 3 researchers: Stripe patterns, security best practices, PCI compliance requirements

### 3. Decide
**Agent**: planner

- Synthesize brainstormer output + researcher findings
- Create ADR (Architecture Decision Record) via `knowledge-capture`
- Define implementation plan if decision is approved

### 4. Document
**Agent**: journal-writer

- Record decision rationale, alternatives considered
- Document performance benchmarks before/after
- Track decisions for future context continuity
- Create searchable history for future reference

## When to Use

- Technology migration decisions ("REST → GraphQL?")
- New system component design
- Performance optimization strategy
- Security architecture changes
- Infrastructure scaling decisions
