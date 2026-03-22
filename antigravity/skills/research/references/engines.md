# Research Engine Reference

## Engine: gemini

### Installation

```bash
npm install -g gemini-cli
gemini --version
```

### Authentication (one-time)

```bash
gemini auth login
# OR: export GEMINI_API_KEY=<your-key> in shell / .env
```

### MCP Symlink Setup (recommended)

Enables Gemini CLI to use the same MCP tools as Claude Code:

```bash
mkdir -p .gemini
ln -sf ../.claude/.mcp.json .gemini/settings.json
echo ".gemini/settings.json" >> .gitignore
```

### CRITICAL: Use Stdin Piping, NOT -p Flag

```bash
# ✅ CORRECT — initializes MCP servers
echo "<research query>" | gemini -y -m "$tri-ai-kit_GEMINI_MODEL"

# ❌ WRONG — deprecated, skips MCP init, tools unavailable
gemini -y -p "<research query>"
gemini -y --model "$tri-ai-kit_GEMINI_MODEL" -p "<research query>"
```

The `-p` flag runs in "quick mode" — it bypasses MCP server connection initialization.
Always use stdin piping to ensure MCP tools are available.

### Invocation

```bash
echo "$RESEARCH_PROMPT" | gemini -y -m "$tri-ai-kit_GEMINI_MODEL"
```

- Requires: `gemini` CLI installed and authenticated
- System prompt: loaded from `GEMINI.md` at project root
- Output: plain Markdown (for research)
- Fallback trigger: `gemini` binary not found → log coverage gap → use WebSearch

### Availability Check

```bash
which gemini
```
Non-zero exit = engine unavailable → fall back to WebSearch.

### Models

| Model | Speed | Use case |
|-------|-------|----------|
| `gemini-2.5-flash-preview-04-17` | Fast | General research (default) |
| `gemini-2.5-pro-preview` | Slower | Deep investigation |

### Flags

- `-y`: Skip confirmation prompts (auto-approve tool execution)
- `-m <model>`: Model selection

---

## Engine: websearch

Built-in Claude `WebSearch` tool. Always available.
No configuration required.

Use with precise queries:
- Include terms like "best practices", "2024/2025", "security", "performance"
- Run multiple related queries in parallel (max 5)

---

---

## Engine: context7 (MCP — library documentation)

Built-in MCP tool. Always available when context7 MCP server is configured.

Use when researching a **specific library or framework** to get up-to-date, version-accurate API documentation.

### When to trigger

- User mentions a package by name (e.g., "React 19", "Drizzle ORM", "tRPC", "Next.js 15")
- Task requires accurate API signatures, options, or migration guides
- WebSearch results are outdated or contradictory for a fast-moving library

### Two-step invocation

```
Step 1 — Resolve the library ID:
  mcp__context7__resolve-library-id  { libraryName: "<package-name>" }
  → returns { libraryId: "/org/repo" }

Step 2 — Query documentation:
  mcp__context7__query-docs  { context7CompatibleLibraryID: "/org/repo", topic: "<topic>" }
  → returns structured markdown docs
```

### Notes

- Always resolve the library ID first; never hardcode IDs
- `topic` should match the sub-feature being researched (e.g., "server actions", "migrations", "hooks")
- Counts as **1 tool call per step** — budget 2 calls total per library

---

## Fallback Chain

```
context7 (library docs) → gemini → (if unavailable) → websearch
```

When the configured engine is unavailable:

1. Log to Methodology: `coverageGaps: ["gemini CLI not found in PATH — fell back to WebSearch"]`
2. Continue with WebSearch silently (no user prompt needed)
3. Final report Methodology section must disclose the fallback

Do NOT:
- Block the research waiting for the user to fix the engine
- Retry the engine more than once
- Omit the fallback from Methodology
