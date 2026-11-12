# UI capture — demo GIFs and screenshots

Browser: whatever automation this session has — a Chrome extension MCP (`claude-in-chrome`,
which records GIFs), the Playwright MCP, or the agent's built-in browser. Load the tools in one
search when they are deferred.

## 1. App running

1. Find how the app starts: the **Commands** section of the project rules first, then the repo's
   `package.json` scripts / task runner targets, README, or `.claude/launch.json`. Ask when two
   apps could own the change.
2. Start it in a background terminal or the session's dev-server tool, never a blocking shell
   call, and wait until it answers on localhost.
3. The app needs a backend: use the environment the rules (or `.env.example` / README) name for
   local development. Missing → ask; don't invent one. Never point it at an environment the
   **Security & data** section forbids.
4. Sign-in: use test accounts from the project's seed / fixture / example-config files only. If
   the app needs the user's own account, ask them to sign in in the browser and wait. Never type
   a real password, token or production credential.

Can't get it running in reasonable time → stop UI capture, `EVIDENCE` reason
`app not runnable locally: <why>`.

## 2. Script each functionality

Per functionality bullet, write 3–8 steps a reviewer would do: start page → action → visible
result. Cover the **happy path** and, when the bullet is about validation or an error state, that
state. Use test data that reads naturally (`Acme Ltd`, `Test order 01`) — never real customer data.

Dry-run the steps once without recording; fix selectors and timing first.

## 3. Record

Window: a stable size (1280×800) so every clip matches.

**GIF per functionality** (and the single-walkthrough variant, recorded once in bullet order),
with a recorder such as `gif_creator`:

1. Navigate to the start page, wait for content.
2. Start recording, take a first-frame screenshot.
3. Run the steps, with a short wait after each visible change so the frame shows it.
4. Last-frame screenshot, stop recording.
5. Export as `NN-<kebab-name>.gif`, watermark off, click indicators on.
6. Move the file from the browser's download folder into `EV_DIR` under the same name.

Keep each clip under ~30 s and ~10 MB: fewer waits, lower quality, or split the flow.

**Screenshots:** save a screenshot to disk at each key state (before / after, empty / filled,
error) and move it into `EV_DIR` as `NN-<kebab-name>.png`. Zoom into a region for detail.

## 4. When no GIF recorder is available

Say so in one line. Offer screenshots only, or — when the repo has E2E specs for the flow — run
that spec with video recording on and attach the video as a `demo` item (it renders as a link,
not inline).

## 5. Before handing back

- Every file opened and looked at: right screen, feature visible, no error state by accident.
- No personal data, real people's emails, tokens, or internal URLs with secrets in frame.
- Names in bullet order (`01-…`, `02-…`) so the comment reads in the Solution's order.
- Stop the dev server only if this skill started it.
