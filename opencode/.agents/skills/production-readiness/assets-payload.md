# Asset & Payload Minimization Playbook

Goal: ship the smallest correct bytes over the wire on every release.

## 1. JS / CSS minification

**Verify, don't re-add.** Vite/esbuild minify by default in production.

- [ ] `apps/spa/vite.config.ts`: confirm no `build.minify: false` and no
      `esbuild: { minify: false }` overrides.
- [ ] `apps/bff` (if it ships a bundle): same check on its build config.
- [ ] Run `pnpm --filter frontend build` and inspect `dist/assets/*.js` —
      filenames should be hashed and contents single-line minified.
- [ ] CSS: confirm Tailwind's `content` paths are tight (no glob to
      `node_modules`) so purge actually drops unused classes. Check the
      built CSS bundle is < ~80 KB gzipped for the FE.

If a file is intentionally not minified (e.g. a debug bundle), document why
in the release log.

## 2. Gzip & Brotli at the edge

We compress at nginx, not at the app.

- [ ] `nginx/` config: `gzip on; gzip_types ...; brotli on; brotli_types ...;`
      for `application/javascript`, `text/css`, `application/json`,
      `image/svg+xml`, `text/html`.
- [ ] Validate against a deployed environment (staging is fine):
      ```bash
      curl -sI -H 'Accept-Encoding: br' https://<host>/assets/<hashed>.js \
        | grep -i content-encoding   # expect: br
      curl -sI -H 'Accept-Encoding: gzip' https://<host>/assets/<hashed>.js \
        | grep -i content-encoding   # expect: gzip
      ```
- [ ] If the CDN (CloudFront / equivalent) is in front of nginx, verify
      `Compress objects automatically = Yes` and that the origin's
      `Vary: Accept-Encoding` is preserved.

## 3. Image optimization (WebP) + lazy loading

- [ ] CMS media pipeline: confirm Payload's image sizes config emits WebP for
      every responsive size. Check `cms/src/collections/Media.ts` (or
      equivalent) for an `imageSizes` array with `formatOptions: { format: 'webp' }`.
- [ ] Static images shipped from the FE repo: re-encode to `.webp` with a
      `.png/.jpg` fallback only where required (email templates, social meta).
- [ ] Lazy-load non-critical `<img>`: every `<img>` outside the LCP element
      should have `loading="lazy"` and `decoding="async"`.
- [ ] Lazy-load heavy modules. Prefer `React.lazy` + `Suspense` (or dynamic
      `import()`) for: Hotel details gallery, Activities gallery,
      `EditTransferDrawer`, `EditFlightDrawer`, any chart/maps libs.
- [ ] Run the FE build and inspect the bundle report (Vite plugin
      `rollup-plugin-visualizer` if installed; otherwise enable it for the
      run). No single chunk > 250 KB gzipped without justification.

## 4. API response trimming

The BFF is the chokepoint. Audit each endpoint touched this release.

For each endpoint:
1. Grep for its consumer in `apps/spa` to enumerate fields actually read.
2. Compare to the response shape produced in `apps/bff`.
3. Drop fields the FE never reads. Document removals — they are breaking
   changes for any other consumer.
4. For list endpoints, prefer field selection (`?fields=...`) over a fat
   default payload.

Heuristic: if a field is only logged or stored on the BFF for debugging,
it should not leave the BFF.

## 5. Record results

In the per-run release log, fill the table:

| Check | Status | Notes |
|---|---|---|
| JS/CSS minified | PASS / FAIL / N/A | … |
| Brotli serving | PASS / FAIL / N/A | curl evidence |
| Gzip serving | PASS / FAIL / N/A | curl evidence |
| Images WebP | PASS / FAIL / N/A | converted N images |
| Lazy-loading | PASS / FAIL / N/A | new lazy boundaries |
| API payload trim | PASS / FAIL / N/A | endpoints + dropped fields |
