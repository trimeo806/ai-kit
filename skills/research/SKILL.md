---
name: research
description: Use when user asks to research, compare options, find best practices, or investigate a technology
user-invocable: false

metadata:
  agent-affinity:
    - researcher
    - planner
    - mcp-manager
  keywords:
    - research
    - investigation
    - documentation
    - sources
    - validation
    - best-practices
    - how-to
    - compare
    - evaluate
    - library
  platforms:
    - all
  triggers:
    - /research
    - research
    - best practices
    - how to
---

# Research Skill

## Delegation — REQUIRED

This skill MUST run via the `researcher` agent, not inline.

**When research intent is detected:**
1. Use the **Agent tool** to spawn `researcher`
2. Pass the research topic + scope + report path (`reports/research-{date}-{slug}.md`)
3. Do NOT conduct research inline in the main conversation

---

## Purpose
Multi-source information gathering and synthesis. Provide strategic technical intelligence that enables informed decision-making.

Honoring **YAGNI**, **KISS**, and **DRY**. Be honest, be brutal, straight to the point, concise.

## When Active
User asks for research, best practices, comparison, technology evaluation, solution design.

---

## Research Phases

### Phase 1: Scope Definition

Clearly define scope before searching:
- Identify key terms and concepts to investigate
- Determine recency requirements (how current must information be)
- Establish evaluation criteria for sources
- Set boundaries for research depth

### Phase 2: Information Gathering

**Check active engine** (set by session-init, default: `websearch`):

```bash
echo $tri-ai-kit_RESEARCH_ENGINE   # gemini | websearch
```

**Engine invocation (max 5 parallel queries — think carefully before each):**

#### Engine: context7 MCP (library documentation — use first for known packages)

When the task involves a **specific library or framework**, fetch authoritative docs via context7 before falling back to web search:

1. `mcp__context7__resolve-library-id { libraryName: "<package>" }` → get `libraryId`
2. `mcp__context7__query-docs { context7CompatibleLibraryID: "<id>", topic: "<topic>" }` → get docs

Trigger when: package name is known, API accuracy matters, or web results are outdated.
Counts as 2 tool calls — budget accordingly.

See `references/engines.md` for full invocation details.

#### Engine: gemini

```bash
echo "<research query>" | gemini -y -m "$tri-ai-kit_GEMINI_MODEL"
```

Availability check: `which gemini` — if not found, log coverage gap and fall back to WebSearch.

#### Engine: websearch (default / fallback)

Use Claude's built-in `WebSearch` tool with precise queries:
- Include terms like "best practices", "2024/2025", "security", "performance"
- Craft multiple related queries and run in parallel
- Prioritize official docs, GitHub repos, authoritative blogs

**Fallback chain:**
1. Invoke configured engine
2. If unavailable (binary missing / exit code 2): add to Methodology `coverageGaps[]`
3. Fall back to `WebSearch` automatically — do not block or ask user

See `references/engines.md` for full invocation details, model options, and exit codes.

**Deep content analysis**: For GitHub repos found, use `docs-seeker` to read them
- Focus on README, API references, changelogs, release notes
- Review version-specific information

**Cross-reference validation**:
- Verify across multiple independent sources
- Check publication dates for currency
- Identify consensus vs. controversial approaches
- Note conflicting information

### Phase 3: Analysis and Synthesis

- Identify common patterns and best practices
- Evaluate pros and cons of different approaches
- Assess maturity and stability of technologies
- Recognize security implications and performance considerations
- Determine compatibility and integration requirements

### Phase 4: Report Generation

Save report to path provided by caller (`reports/research-{date}-{slug}.md`).

Use `references/report-template.md` for output structure. Report Methodology section must include:
- **Knowledge Tiers**: which engine was used (Gemini, Perplexity, WebSearch)
- **Coverage Gaps**: if configured engine was unavailable and fallback fired

Report must also:
- Include timestamp of when research was conducted
- Provide table of contents for longer reports
- Use code blocks with appropriate syntax highlighting
- Include diagrams (mermaid or ASCII art) where helpful
- Conclude with specific, actionable next steps
- List unresolved questions at the end

---

## Source Priority

1. Official documentation (highest)
2. Official examples/tutorials
3. Well-known community resources
4. GitHub repositories with recent activity
5. Stack Overflow (for specific issues)

---

## Quality Standards

| Standard | Requirement |
|---|---|
| **Accuracy** | Verified across multiple sources |
| **Currency** | Prefer last 12 months; note when using older material |
| **Completeness** | Cover all aspects requested |
| **Actionability** | Practical, implementable recommendations |
| **Clarity** | Define technical terms, provide examples |
| **Attribution** | Always cite sources with links and dates |

---

## Special Considerations

- **Security topics**: Check for recent CVEs and security advisories
- **Performance topics**: Look for benchmarks and real-world case studies
- **New technologies**: Assess community adoption and support levels
- **APIs**: Verify endpoint availability and authentication requirements
- **Older technologies**: Always note deprecation warnings and migration paths

---

## Advanced Techniques

### Query Fan-Out
- Ask multiple related questions in parallel
- "What is X?" + "How to use X?" + "Best practices for X?"
- Reduces total research time

### Source Validation
- Cross-reference claims across 3+ sources
- Check if multiple sources cite same research
- Look for contradictions and note them
- Verify dates (prefer sources <2 years old)

### Technology Trend Identification
- Check GitHub stars and recent activity
- Review recent changelog/updates
- Look at community sentiment in forums
- Note if project is actively maintained
- Watch for deprecation notices

### Code Example Validation
- Test examples in isolated environment
- Verify version matches your target
- Check example handles error cases
- Look for performance implications

---

## Best Practices
- Prioritize official docs
- Check publication dates (prefer <2 years)
- Verify code examples work
- Note version-specific info clearly
- Cite sources with URLs and dates
- Cross-validate findings
- Document contradictions
- Track confidence level per finding
- Sacrifice grammar for concision in reports

---

## Knowledge-First Research

Before external research, check internal knowledge:
1. Search `docs/` for prior research on the topic
2. Check skill aspect files for existing domain knowledge
3. Search agent memory for related past sessions
4. Only proceed to external sources if internal knowledge is insufficient

Use `knowledge-retrieval` skill for the full priority chain.

Use `knowledge-capture` skill to persist learnings after this task.

---

## Sub-Skill Routing

When this skill is active and user intent matches a sub-skill, delegate:

| Intent | Sub-Skill / Tool | When |
|--------|-----------------|------|
| Explore codebase | `scout` | `/scout`, "explore", "find in codebase" |
| Library/framework docs | `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` | Package name known, API accuracy matters, fast-moving library |
| Search docs | `docs-seeker` | External documentation search |
| Export context | `repomix` | `/repomix`, bundle code for external review |
| Gemini search | `gemini` CLI via Bash | `$tri-ai-kit_RESEARCH_ENGINE = gemini` |
| Web search | `WebSearch` tool | `$tri-ai-kit_RESEARCH_ENGINE = websearch` or fallback |

### Related Skills
- `knowledge-retrieval` — Internal-first search protocol
- `knowledge-capture` — Post-task capture workflow
