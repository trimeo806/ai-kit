# TanStack Start — Deployment

## Platform Adapters

Each deployment target needs its own Vite plugin. Add it **before** `tanstackStart()`:

| Platform | Package | Status |
|----------|---------|--------|
| Netlify | `@netlify/vite-plugin-tanstack-start` | Official partner |
| Cloudflare | `@cloudflare/vite-plugin` | Official partner |
| Vercel | Built-in Nitro adapter | Supported |
| Node.js | Built-in `node-server` | Built-in |
| Bun | Built-in `bun` | Built-in |

## Netlify

```bash
npm install -D @netlify/vite-plugin-tanstack-start
# Requires Netlify CLI v17.31+
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import netlifyPlugin from '@netlify/vite-plugin-tanstack-start/vite'
import tanstackStart from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    netlifyPlugin(),    // First
    tanstackStart(),
    viteReact(),
  ],
})
```

```bash
netlify deploy --build    # Deploy to preview
netlify deploy --prod     # Deploy to production
```

No `netlify.toml` needed — the plugin auto-configures build settings.

## Cloudflare Workers / Pages

```bash
npm install -D @cloudflare/vite-plugin wrangler
```

```ts
// vite.config.ts
import cloudflarePlugin from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    cloudflarePlugin(),  // First — auto-detects Workers vs Pages
    tanstackStart(),
    viteReact(),
  ],
})
```

```toml
# wrangler.toml
name = "my-app"
compatibility_date = "2024-01-01"
```

```bash
wrangler deploy
```

**Cloudflare limits**: No Node.js built-ins by default. Use `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` if needed.

## Vercel

No extra plugin needed — Vercel auto-detects TanStack Start via the Nitro adapter:

```bash
vercel deploy
```

For advanced config:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        preset: 'vercel',
      },
    }),
    viteReact(),
  ],
})
```

## Node.js (self-hosted)

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackStart({
      server: {
        preset: 'node-server',
      },
    }),
    viteReact(),
  ],
})
```

```bash
npm run build
node .output/server/index.mjs
```

Set `PORT` env var to control listening port (default 3000).

## Bun

```ts
tanstackStart({
  server: { preset: 'bun' },
})
```

```bash
npm run build
bun .output/server/index.mjs
```

## Environment Variables

| Variable | Access | Notes |
|----------|--------|-------|
| `process.env.SECRET_KEY` | Server only (server functions) | Never expose in loaders |
| `process.env.PUBLIC_API_URL` | Both | Safe for client bundle |
| `import.meta.env.VITE_PUBLIC_*` | Client bundle only | Vite-prefixed vars |

Always use `createServerFn` to read secrets — never read them in `loader` functions which run client-side too.

## Pre-Deploy Checklist

- [ ] `tsc --noEmit` passes with zero errors
- [ ] No secrets read in `loader` functions (only in `createServerFn`)
- [ ] All required env vars set on platform
- [ ] Platform adapter plugin installed and first in plugins array
- [ ] `npm run build` completes successfully locally
- [ ] Auth redirect URLs updated for production domain
