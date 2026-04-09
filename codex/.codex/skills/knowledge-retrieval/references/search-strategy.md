# Search Strategy Reference

How to search each knowledge source effectively.

## Level 1: docs/ Search

### Step 1 — Discover All Registries

**Discover registries:**
```
Glob: **/docs/index.json
```

Read each result to understand its scope (project, library, package) from its `description` field. The structure will be self-evident from the paths returned.

**Priority rule**: Prefer the registry whose path is closest to the files being worked on. For cross-cutting concerns, query all registries.

**No registry found?** Prompt the user:
> No `docs/index.json` found. Run `/docs` to initialize a knowledge base. This enables consistent knowledge retrieval across sessions and agents.

---

### Step 2 — Query Registries

Run these queries against each discovered `docs/index.json`:

**Filter by agentHint relevance** (most useful — start here):
```bash
jq '.entries[] | select(.agentHint | test("routing|pages"; "i"))' docs/index.json
```

**Filter by category**:
```bash
jq '.entries[] | select(.category == "pattern")' docs/index.json
```

**Filter by tag**:
```bash
jq '.entries[] | select(.tags[] | contains("react"))' docs/index.json
```

**Filter by status**:
```bash
jq '.entries[] | select(.status == "accepted")' docs/index.json
```

**Full-text title search**:
```bash
jq '.entries[] | select(.title | test("error.*boundary"; "i"))' docs/index.json
```

**Get entry path**:
```bash
jq -r '.entries[] | select(.id == "ADR-0001") | .path' docs/index.json
```

**Follow related entries**:
```bash
# Get related IDs
jq -r '.entries[] | select(.id == "ADR-0001") | .related[]' docs/index.json

# Resolve related entries
jq '.entries[] | select(.id | IN("PATTERN-003", "FINDING-012"))' docs/index.json
```

### Content Search (fallback when index query returns nothing)

**Grep across all entries**:
```bash
grep -r "Server Component" docs/ --include="*.md"
```

**Search specific category**:
```bash
grep -r "authentication" docs/decisions/ --include="*.md"
```

## Level 2: RAG System Search

### Query Structure

```typescript
query({
  query: string,           // Natural language or keywords
  filters: {
    component?: string,    // Component name
    topic?: string,        // Topic/domain
    category?: string,     // Pattern, guide, reference
    file_type?: string,    // tsx, ts, scss, json, md
    scope?: string,        // Library scope filter
    path?: string          // File path pattern
  },
  limit?: number          // Max results (default 10)
})
```

### Scope Filter

Limit results to a specific library:

| Scope | Content |
|-------|---------|
| `klara-theme` | Design system components, tokens, styles |
| `luz-components` | Shared UI components |
| `luz-services` | Backend service layer |
| `luz-utils` | Utilities, Redux, state management |
| `libs` | All library scopes combined |
| `all` | No filtering (default) |

**Usage**:
```typescript
// Search only in klara-theme
query({ query: "Button variants", filters: { scope: "klara-theme" } })

// Search all shared libraries
query({ query: "shared hooks", filters: { scope: "libs" } })

// Search everything (default)
query({ query: "authentication flow" })
```

### Effective Queries

**Broad topic**:
```typescript
query({
  query: "authentication flow",
  filters: { topic: "auth" }
})
```

**Specific component**:
```typescript
query({
  query: "Login button implementation",
  filters: { component: "LoginButton", file_type: "tsx", scope: "klara-theme" }
})
```

**Pattern search**:
```typescript
query({
  query: "error boundary usage",
  filters: { category: "pattern", file_type: "tsx" }
})
```

**File path filter**:
```typescript
query({
  query: "navigation hooks",
  filters: { path: "app/hooks/*" }
})
```

### Platform-Specific Ports

| Platform | Port | Content |
|----------|------|---------|
| Web | 2636 | Next.js, React, TypeScript, libs |
| iOS | 2637 | Swift, SwiftUI, UIKit |

### Other MCP Tools

| Tool | Purpose |
|------|---------|
| `status` | Check RAG server health, indexed file counts per scope |
| `navigate` | Get URL to view source in Storybook or GitHub |

## Level 3: Skills Index Search

### Index Query

**File**: `.agents/skills/skill-index.json`

**Find by keyword**:
```bash
jq '.skills[] | select(.keywords[] | contains("debug"))' .agents/skills/skill-index.json
```

**Find by trigger**:
```bash
jq '.skills[] | select(.triggers[] | contains("/debug"))' .agents/skills/skill-index.json
```

**Find by agent**:
```bash
jq '.skills[] | select(.["agent-affinity"][] | contains("developer"))' .agents/skills/skill-index.json
```

**Get skill path**:
```bash
jq -r '.skills[] | select(.name == "debugging") | .path' .agents/skills/skill-index.json
```

### Aspect Files

After finding skill, check for aspect files:

```bash
# List aspect files
ls .agents/skills/debugging/references/

# Read aspect
cat .agents/skills/debugging/references/root-cause-analysis.md
```

## Level 4: Codebase Search

### Grep Patterns

**Find function usage**:
```bash
grep -r "useAuth" --include="*.tsx" app/
```

**Find imports**:
```bash
grep -r "from '@/components/ErrorBoundary'" --include="*.ts*" .
```

**Find pattern with context**:
```bash
grep -r -A 3 -B 3 "ErrorBoundary" --include="*.tsx" app/
```

**Case-insensitive**:
```bash
grep -ri "authentication" --include="*.ts" .
```

### Glob Patterns

**Find all components**:
```
**/*.tsx in app/components/
```

**Find test files**:
```
**/*.test.ts in app/
```

**Find by naming convention**:
```
**/use*.ts in app/hooks/
```

### Read Strategy

1. **Start broad**: Glob to find files
2. **Filter**: Grep for specific patterns
3. **Read**: Read identified files
4. **Trace**: Follow imports/exports

## Level 5: External Search

### Context7

**Resolve Library**:
```typescript
resolve-library-id("library-name")
// Returns: "/org/project/version"
```

**Common libraries**:
- `react` -> `/facebook/react`
- `next` -> `/vercel/next.js`
- `typescript` -> `/microsoft/TypeScript`

**Fetch Docs**:
```typescript
get-library-docs(
  context7CompatibleLibraryID: "/facebook/react",
  topic: "hooks",
  tokens: 5000
)
```

**Topic examples**:
- "hooks"
- "server-components"
- "error-boundaries"
- "performance"

### WebSearch

**Documentation**:
```
"[library] [version] [feature] documentation"
```

**Error resolution**:
```
"[error message] [context]"
```

**Best practices**:
```
"[technology] best practices 2026"
```

**Comparison**:
```
"[A] vs [B] [year]"
```

## Keyword Expansion Techniques

### Server-Side vs Agent-Side Expansion

RAG servers auto-expand queries before embedding. Know what each side handles:

| Expansion Type | Who Does It | When |
|---------------|-------------|------|
| Synonym expansion | RAG server (auto) | Every query — "btn"->"button", "a11y"->"accessibility" |
| Component recognition | RAG server (auto) | When alias in query — "TextField" injects "text-field" |
| Multi-word phrases | Web RAG server (auto) | "design token" -> klara-theme, scss variable, etc. |
| Punctuation stripping | Web RAG server (auto) | "(color, typography)" -> both words expanded |
| HyDE passage | Agent (manual) | Conceptual queries — server can't generate code |
| Structural variants | Agent (manual) | When < 3 results — different angle, not synonyms |
| Filter extraction | Agent (manual) | Always — use canonical names from component-mappings.md |

**Rule**: Don't duplicate server-side expansions. Agent effort should go to HyDE and structural variants.
**See**: `web-rag/references/synonym-groups.md`, `ios-rag/references/synonym-groups.md` for what's auto-expanded.

### Synonyms (agent-side, for non-RAG searches only)

| Original | Synonyms |
|----------|----------|
| error | exception, failure, bug, crash |
| state | data, store, model, context |
| component | module, widget, element, view |
| hook | custom hook, use*, lifecycle |
| route | path, navigation, link, page |

### Broader/Narrower

**Broader**: "authentication" -> "auth" -> "security"
**Narrower**: "auth" -> "OAuth" -> "OAuth 2.0 PKCE flow"

### Related Terms

| Term | Related |
|------|---------|
| Server Component | async, streaming, Suspense, RSC |
| Error boundary | componentDidCatch, fallback, error handling |
| Hook | useState, useEffect, custom hook, lifecycle |
| Routing | navigation, Link, useRouter, dynamic routes |

## Multi-Source Correlation

When results found in multiple sources, correlate:

**Example**: Error boundary pattern

1. **docs/**: `PATTERN-0005: Error boundary for async components`
2. **RAG**: `app/components/ErrorBoundary.tsx` (implementation)
3. **Skills**: `debugging/SKILL.md` (when error boundaries don't catch)
4. **Codebase**: 12 usages via grep
5. **Context7**: React official error boundary docs

**Synthesized answer**:
- **Pattern**: Wrap async Server Components (team convention)
- **Implementation**: `ErrorBoundary.tsx` using react-error-boundary
- **Usage**: 12 components following pattern
- **Limitation**: Doesn't catch event handler errors (per debugging skill)
- **Reference**: React official docs for API details

## Result Quality Assessment

### Score Interpretation

| Score Range | Quality | Action |
|-------------|---------|--------|
| 0.7+ | High | Use directly, high confidence |
| 0.5–0.7 | Medium | Usable but verify against source file |
| 0.3–0.5 | Low | Expand query or fall through to next level |
| < 0.3 | Noise | Discard, rephrase query entirely |

### Confidence Heuristics

| Signal | Confidence | Meaning |
|--------|-----------|---------|
| Top result > 0.7, multiple results from same module | **High** | Strong match, consistent context |
| Top result 0.5–0.7, results from diverse files | **Medium** | Partial match, verify in context |
| All results < 0.5 | **Low** | Poor match, broaden or fall through |
| Single result > 0.7, rest < 0.3 | **Medium** | Isolated match, check for completeness |

### Fall-Through Protocol

When RAG results are insufficient:

1. **Broaden query**: Remove filters, try synonyms, alternate casing
2. **Web RAG**: Try `enforce_scope: false` equivalent (remove scope filter)
3. **iOS RAG**: Try `enforce_scope: false` to search all three repos
4. **Fall to L4**: Grep/Glob codebase search
5. **Fall to L5**: Context7 or WebSearch for external docs
6. **Never**: Return low-confidence results as authoritative answers

**Rule**: If best score < 0.3 after broadening, explicitly state "RAG did not find relevant results" and proceed to next level. Do not guess from noise.

## Search Optimization Tips

1. **Start specific, broaden if needed**: `"useAuth hook"` -> `"auth hook"` -> `"authentication"`
2. **Check index before content**: Index is faster, prevents full file reads
3. **Use agentHint**: Match hint text against current task for fast relevance filtering
4. **Use filters aggressively**: Category, tag, file_type, scope narrow results
5. **Follow relationships**: `related` field in knowledge entries, imports in code
6. **Cache results**: Don't re-search same query in single session
7. **Combine tools**: Grep finds files, Read gets content, index provides metadata
8. **Verify dates**: Prefer recent content, note stale entries

## Related References

- `priority-matrix.md` — When to use which source
- `knowledge-base.md` — Knowledge system structure, index schema, capture guidelines
