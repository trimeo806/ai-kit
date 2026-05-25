# QA Test Instructions Template

When you finish implementing code, append this section at the end of your response.

## Why

This lets Hermes Agent (a companion AI) automatically run browser tests against your changes on `localhost:8080` using Puppeteer + Chromium.

## Template

```markdown
## QA Test Instructions

### Fast Checks
1. Page loads: GET http://localhost:8080/PATH → expect 200
2. Contains text: GET http://localhost:8080/PATH → expect 200, "expected text on page"
3. API endpoint: GET http://localhost:8080/api/ENDPOINT → expect 200

### Browser Checks
1. Go to http://localhost:8080/START-PATH
2. Fill #SELECTOR with "VALUE"
3. Fill #SELECTOR with "VALUE"
4. Click BUTTON-SELECTOR
5. Wait .RESULT-SELECTOR visible
6. Assert "expected text on page" visible
7. Assert .KEY-ELEMENT visible
8. Screenshot: feature-name
```

## Guidelines for writing instructions

- **Fast Checks** — For every page/endpoint that changed, add a GET check with expected status and optionally expected text/JSON key.
- **Browser Checks** — Simulate the happy path user flow. Think: "what would a human click and type to verify this works?"
- **Screenshots** — Add at the end of every browser check section. Name them descriptively (e.g., `search-results`, `booking-form`, `filtered-list`).
- **Selectors** — Use `#id` or `.class-name` selectors. Avoid complex CSS chains. The parser doesn't handle XPath.
- **Text assertions** — Use quoted text for content checks: `Assert "Ticket booked" visible`. Use unquoted selectors for DOM element checks: `Assert .confirmation-card visible`.
- **Wait** — Add waits before clicking or filling elements that appear dynamically (loaded via API).
- **Error screenshots** — The runner auto-captures a screenshot on any step failure.