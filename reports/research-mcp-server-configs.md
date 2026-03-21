# Research: Official MCP Server Configurations

**Date**: 2026-03-15
**Researcher**: researcher
**Scope**: MCP configuration for Vercel, Supabase, Stripe, and TanStack services
**Status**: Complete

---

## Executive Summary

Researched official MCP server configurations for four services. Vercel, Supabase, and Stripe have official MCP servers with well-documented JSON configurations. TanStack does not have an official MCP server from the core team, but a community-maintained alternative exists. All configurations, required environment variables, and capabilities are documented below.

---

## Findings by Service

### 1. Vercel MCP

**Status**: ✅ Official
**NPM Package**: Built-in (remote HTTP endpoint)
**GitHub Repo**: N/A (hosted service)
**Remote URL**: `https://mcp.vercel.com`

#### MCP Configuration Block

For `.cursor/mcp.json` (Cursor IDE):
```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

For VS Code with Copilot (add via Command Palette or manually):
```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

For Windsurf:
```json
{
  "mcpServers": {
    "vercel": {
      "serverUrl": "https://mcp.vercel.com"
    }
  }
}
```

For Gemini Code Assist / Gemini CLI:
```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.vercel.com"]
    }
  }
}
```

#### Project-Specific URL (Optional)
```
https://mcp.vercel.com/<teamSlug>/<projectSlug>
```
Provides automatic context; find slugs in Vercel dashboard → Settings → General.

#### Environment Variables
- **None required** — uses OAuth-based authentication (user clicks "Needs login" prompt)
- No API keys needed in config

#### Authentication
- OAuth-based with explicit user consent
- Supported clients: Claude, Claude Desktop, Cursor, VS Code, ChatGPT, Devin, Raycast, Windsurf, Gemini Code Assist

#### Tools/Capabilities
- Search Vercel documentation
- Manage projects and deployments
- Analyze deployment logs
- Public tools (no auth) and authenticated tools (require Vercel sign-in)

---

### 2. Supabase MCP

**Status**: ✅ Official
**NPM Package**: N/A (hosted remote service)
**GitHub Repo**: [supabase-community/supabase-mcp](https://github.com/supabase-community/supabase-mcp)
**Remote URL**: `https://mcp.supabase.com/mcp?project_ref=<project-ref>`
**Local Dev URL**: `http://localhost:54321/mcp` (via Supabase CLI)

#### MCP Configuration Block

Standard HTTP remote server:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

For local development with Supabase CLI:
```json
{
  "mcpServers": {
    "supabase-local": {
      "type": "http",
      "url": "http://localhost:54321/mcp"
    }
  }
}
```

#### Environment Variables
- `SUPABASE_PROJECT_REF` — Your Supabase project reference (e.g., `abcdefghijklmnop`)
- `SUPABASE_ACCESS_TOKEN` — Personal access token (PAT) or dynamic client registration token

#### Authentication
- **Two methods**:
  1. **Dynamic client registration** (recommended): OAuth flow via browser (no PAT needed)
  2. **Personal Access Token (PAT)**: Required for CI environments where browser auth isn't possible

#### Optional Query Parameters
- `read_only=true` — Restrict to read-only operations
- `features=database,docs,storage` — Specify which tool groups to enable

Available features: `account`, `docs`, `database`, `debugging`, `development`, `functions`, `storage`, `branching`

#### Tools/Capabilities
- Database query execution (read & write)
- Edge Functions management
- Storage management
- Logs and debugging
- Development tools
- Branching (preview databases)
- Documentation search

---

### 3. Stripe MCP

**Status**: ✅ Official
**NPM Package**: [@stripe/mcp](https://www.npmjs.com/package/@stripe/mcp)
**GitHub Repo**: [mcp/com.stripe/mcp](https://github.com/mcp/com.stripe/mcp)
**Latest Version**: 0.3.1 (published ~1 month ago)
**Remote URL**: `https://mcp.stripe.com` (hosted option)

#### MCP Configuration Block

For Claude Code / Claude Desktop:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp@latest"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```

Alternative with inline API key argument:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--api-key=sk_test_..."]
    }
  }
}
```

For connected account:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--api-key=sk_test_...", "--stripe-account=CONNECTED_ACCOUNT_ID"]
    }
  }
}
```

#### Environment Variables
- `STRIPE_SECRET_KEY` — Your Stripe secret API key (begins with `sk_test_` or `sk_live_`)
- `STRIPE_ACCOUNT` (optional) — Connected account ID for multi-account operations

#### API Key Options
- **Secret API Key** (`sk_test_...` or `sk_live_...`) — Full access
- **Restricted API Key (RAK)** (preferred) — Limited permissions per tool; create at https://dashboard.stripe.com/apikeys

#### Tools/Capabilities
- Customer management
- Payment intent handling
- Invoice operations
- Subscription management
- Charge operations
- Refund processing
- Connected account management
- Tool permissions controlled by RAK restrictions

---

### 4. TanStack MCP

**Status**: ⚠️ Community-maintained (no official TanStack core team MCP)
**NPM Package**: [@g7aro/tanstack-mcp](https://www.npmjs.com/package/@g7aro/tanstack-mcp)
**GitHub Repo**: [zPeppOz/tanstack-mcp](https://github.com/zPeppOz/tanstack-mcp)
**Alternative (TanStack Start specific)**: [mcp-tanstack-start](https://github.com/codyde/mcp-tanstack-start)
**Note**: TanStack removed built-in MCP from `@tanstack/cli` v7+

#### MCP Configuration Block

Using community @g7aro/tanstack-mcp:
```json
{
  "mcpServers": {
    "tanstack": {
      "command": "npx",
      "args": ["-y", "@g7aro/tanstack-mcp"]
    }
  }
}
```

Or with node directly:
```json
{
  "mcpServers": {
    "tanstack": {
      "command": "node",
      "args": ["/absolute/path/to/tanstack-mcp/dist/index.js"]
    }
  }
}
```

For TanStack Start applications (embedded MCP):
```typescript
// src/routes/api/mcp.ts
import { createMcpServer } from 'mcp-tanstack-start'

const mcp = createMcpServer({
  name: 'my-tanstack-app',
  version: '1.0.0',
  tools: [/* tool definitions */],
  instructions: 'Optional guidance...'
})
```

Then configure in client:
```json
{
  "mcpServers": {
    "tanstack-embedded": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/api/sse"]
    }
  }
}
```

#### Environment Variables
- **None required** — Wrapper around `@tanstack/cli`; respects TanStack CLI environment

#### Installation Options
```bash
# Interactive installation (pick clients)
npx @g7aro/tanstack-mcp --install

# Install to all detected clients
npx @g7aro/tanstack-mcp --install --all

# Install to specific clients
npx @g7aro/tanstack-mcp --install cursor codex
```

#### Tools/Capabilities
- `listTanStackAddOns` — List available TanStack add-ons
- `getAddOnDetails` — Get details on specific add-on
- `createTanStackApplication` — Scaffold new TanStack app
- `tanstack_list_libraries` — List all TanStack libraries (Query, Router, Start, etc.)
- `tanstack_doc` — Fetch documentation for libraries
- `tanstack_search_docs` — Search TanStack documentation
- `tanstack_ecosystem` — View TanStack ecosystem info

#### TanStack Start Embedded Alternative
If building a TanStack Start app with embedded MCP:
- Use `mcp-tanstack-start` package
- Create MCP in API route with `createMcpServer()`
- Supports stateless (default) and stateful (session) modes
- Exposes `/api/sse` endpoint for remote connections

---

## Source Verification Table

| Service | Source | Credibility | Last Updated |
|---------|--------|-------------|--------------|
| Vercel | [Official Docs](https://vercel.com/docs/agent-resources/vercel-mcp) | High | 2026-03 |
| Supabase | [Official Docs](https://supabase.com/docs/guides/getting-started/mcp) | High | 2026-03 |
| Stripe | [Official Docs](https://docs.stripe.com/mcp) & [npm](https://www.npmjs.com/package/@stripe/mcp) | High | 2026-03 |
| TanStack | [GitHub (@g7aro)](https://github.com/zPeppOz/tanstack-mcp) & [LobeHub Registry](https://lobehub.com/mcp/zpeppoz-tanstack-mcp) | Medium | 2026-03 |

---

## Configuration Quick Reference

| Service | Command | Args | Env Vars | Auth Type |
|---------|---------|------|----------|-----------|
| Vercel | N/A | N/A | None | OAuth |
| Supabase | N/A (HTTP) | N/A | `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` | Bearer token / OAuth |
| Stripe | npx | `@stripe/mcp` | `STRIPE_SECRET_KEY` | API key |
| TanStack | npx | `@g7aro/tanstack-mcp` | None | Wrapper (no auth) |

---

## Key Differences

- **Vercel**: Remote HTTP only, no command needed, OAuth-based, built-in client detection
- **Supabase**: Remote HTTP, requires project ref + token, supports local dev, feature flags available
- **Stripe**: Local npm package execution, requires secret API key or RAK, supports connected accounts
- **TanStack**: Community wrapper around CLI, no auth needed, no official MCP from core team

---

## Unresolved Questions

1. Does TanStack plan to reinstate an official MCP server or recommend the community package?
2. What is the exact lifespan/EOL for `@g7aro/tanstack-mcp` if TanStack restores official support?
3. Does Supabase MCP support edge function invocation via MCP tools, or read-only querying?
4. Can Stripe RAK permissions be scoped per connected account?

---

## Recommendations

✅ **Use official packages** where available:
- Vercel: Remote endpoint (no install)
- Supabase: Hosted remote + local CLI option
- Stripe: NPM package `@stripe/mcp`

⚠️ **TanStack**: Community option `@g7aro/tanstack-mcp` is actively maintained but unofficial. Monitor for official reinstatement.

**Security best practices**:
- Use Stripe RAK (Restricted API Key) instead of full secret key
- Store all API keys in environment variables, never in `.mcp.json`
- Use local Supabase MCP for development (`http://localhost:54321/mcp`)
- Test configurations in `.cursor/mcp.json` or dev environment first

---

## Sources

- [Vercel MCP Official Docs](https://vercel.com/docs/agent-resources/vercel-mcp)
- [Supabase MCP Getting Started](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase MCP Enable Guide](https://supabase.com/docs/guides/self-hosting/enable-mcp)
- [Stripe MCP Documentation](https://docs.stripe.com/mcp)
- [Stripe MCP NPM Package](https://www.npmjs.com/package/@stripe/mcp)
- [TanStack CLI GitHub](https://github.com/TanStack/cli)
- [TanStack MCP Community (@g7aro)](https://github.com/zPeppOz/tanstack-mcp)
- [MCP TanStack Start Library](https://github.com/codyde/mcp-tanstack-start)
- [TanStack Start MCP Example (jherr)](https://github.com/jherr/ts-mcp)
- [LobeHub MCP Registry](https://lobehub.com/)
