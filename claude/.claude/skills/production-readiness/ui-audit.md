# Playbook: UI Audit

Run when a release touches frontend code or the user requests "UI audit",
"frontend audit", "lighthouse pass", or any of: overlaps, render-blocking
CSS/fonts/Tailwind, unused JS/CSS, design-system adherence, mobile visibility.

**Runtime-first**: live Lighthouse + Chrome DevTools MCP against a running
dev server. Static review is the follow-up, not the substitute.

---

## Required tooling

- `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` (navigate, screenshot,
  snapshot, lighthouse_audit, performance_start_trace, list_console_messages,
  list_network_requests, resize_page).
- A running dev server. Default `:3000`. If Docker holds it without the Clerk
  key (app crashes "Missing Publishable Key" → Lighthouse NO_FCP/score 0),
  run on `:3010`:

  ```bash
  PORT=3010 npm run dev > /tmp/frontend-audit-dev.log 2>&1 &
  ```

  Verify with `curl -s http://localhost:3010/demo/en/ | head` before driving Chrome.

---

## Audit checklist (five pillars)

### 1. Render-blocking / payload (Lighthouse Performance + perf trace)
- [ ] No `<script src="https://cdn.tailwindcss.com...">` in `index.html`.
      Tailwind must be bundled via PostCSS (`tailwind.config.ts`,
      `postcss.config.js`, single `app/styles.css` with three `@tailwind`
      directives). Dev deps `tailwindcss`, `@tailwindcss/postcss`, `postcss`,
      `autoprefixer` wired up.
- [ ] Google Fonts URLs include `&display=swap`.
- [ ] Critical fonts `<link rel="preload" as="font" type="font/woff2" crossorigin>`d.
- [ ] Material Symbols variable axis restricted to `wght`/`FILL` values
      actually rendered.
- [ ] No `<script type="importmap">` shipping React/router/SDKs from `esm.sh`
      when Vite already bundles them — pick one path.
- [ ] HTML + static assets served with Brotli at the edge. Verify Lighthouse
      `uses-text-compression` against the **prod build**, not dev.

### 2. Visibility & overlap (desktop + mobile)
- [ ] Header responsive: brand `<h1>` has `truncate` + `min-w-0`; right cluster
      has `flex-shrink-0`; icon-only buttons have `flex-shrink-0`. Verify at
      390 px.
- [ ] No fixed-position bars (PreviewBar, sticky CTAs, cookie banners) overlap
      page content without compensating padding/margin.
- [ ] Hero text over photos has explicit overlay (`activeTheme.hero.overlay`)
      or `text-shadow` fallback. Lighthouse `color-contrast` passes.
- [ ] Sane `z-index`: header `z-50`, modals `z-[100]`, preview/devtools
      `z-[9999]`. No bare `z-[100000]` arms races.
- [ ] Screenshots at **390 × 844** (iPhone 14) and **414 × 896** (iPhone Plus):
      no text clipped, no flow-tab cut off, no button < 48 px tap target.
- [ ] Horizontally-scrollable rows (search-tab strips, filter chips, gallery
      thumbs) have a visible scroll affordance — fade gradient or visible
      scrollbar. `overflow-x-auto` alone is not a UX.
- [ ] `scrollbar-hide` and other custom utilities resolve under the project's
      Tailwind config (silently no-op if only present via the CDN plugin set).
- [ ] Debug toggles (`Show Keys`, dev banners) gated behind `import.meta.env.DEV`
      or a tenant flag — must not persist for end users.

### 3. Lighthouse (a11y + best practices + SEO)
Run for each of the six core flows: Home, Hotels, Flights, Activities,
Transport, Packages.

```text
mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit(
  device="mobile", mode="navigation",
  outputDirPath="/tmp/lh/<flow>"
)
```

Score targets (mobile): **A11y ≥ 90, Best Practices ≥ 90, SEO ≥ 90**. Common
offenders:
- `button-name` — icon-only buttons need `aria-label`.
- `select-name` — `<select>` needs label or `aria-label`.
- `target-size` — interactive controls < 48 × 48 px on mobile.
- `color-contrast` — usually hero text or low-contrast pill borders.
- `errors-in-console` — Clerk dev-keys, CMS cache aborts, Tailwind CDN warning.
- `meta-description` + `robots-txt` — present and valid.

### 4. Unused JS / CSS
- [ ] Lighthouse `unused-javascript` + `unused-css-rules` against **prod build**
      (`npm run build && npm run preview`). Goal < 30% unused per route on
      first load.
- [ ] Routes code-split with `lazy(() => import(...))`.
- [ ] Heavy modals/drawers (Edit Flight/Hotel/Transfer drawers, hotel-detail
      gallery) dynamically imported.
- [ ] Dead scripts not deployed — keep `*.cjs`, `pw_*.spec.ts`, `download-*.cjs`,
      `update-*.cjs`, stray `.log`/`.png` out of the Docker image.

### 5. Design-system adherence
- [ ] No inline `style={{ color: "#…", padding: "Xpx" }}` for tokenized props
      — use Tailwind tokens (`text-primary`, `p-4`). Allowed: positional
      one-offs (`top: 0`).
- [ ] No arbitrary `text-[Npx]` when a token (`text-xs`/`sm`/…/`display-...`)
      fits.
- [ ] No hard-coded palette (`bg-green-500`, `text-blue-600`) when a semantic
      token exists (`bg-success`, `text-info`).
- [ ] Pill controls use one of `rounded-button` / `rounded-pill` /
      `rounded-full` consistently per role.
- [ ] Icons via `<Icon name="..." />`, not raw
      `<span class="material-symbols-outlined">…</span>`.

---

## Output

Write findings to `docs/releases/<YYYY-MM-DD>-ui-audit.md`. One row per
finding, per-pillar table: ID, severity, finding, location (`file:line`).
Keep it grep-friendly so reviewers can search `Header.tsx:27`.

End with:
1. **Surgical fixes applied this pass** — each fix traceable to a finding ID.
2. **Deferred fixes needing approval** — bigger blast-radius items
   (Tailwind-CDN migration, importmap rip, design-system sweeps). Spell out
   scope + visual-regression plan.

Append a row to `docs/releases/PROD-READINESS-LOG.md` referencing the report.

Log a memory:

```text
graph_add_memory(
  type="fact",
  content="UI audit on <branch>: <N> critical/<M> high findings; <K> surgical fixes applied",
  tags=["ui-audit", "production-readiness"],
  files=["docs/releases/<YYYY-MM-DD>-ui-audit.md"]
)
```

---

## Re-test after deferred fixes land

1. `npm run build && npm run preview` — verify no Tailwind classes missing
   after PostCSS migration.
2. Re-run mobile + desktop Lighthouse on all six flows; record before/after.
3. Visual diff (Playwright snapshots) at 390 / 768 / 1280 widths per flow.
4. Manual a11y: keyboard-only tab through header + first-fold; VoiceOver/NVDA
   verifies aria-labels.
