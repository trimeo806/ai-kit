---
name: brainstorm
description: Use when the user presents a problem, idea, decision, or challenge they want to think through — produces a structured analysis covering pros/cons, risks, trade-offs vs alternatives, and recommended directions. Always invoke this skill when someone says "brainstorm", "help me think through", "I'm considering", "what should I do about", "analyze this", "think with me", or describes a problem they haven't yet decided how to solve. Don't wait for the word "brainstorm" — any problem-framing or decision-under-uncertainty prompt should trigger this skill.
user-invocable: true
metadata:
  agent-affinity: [brainstormer, planner, researcher]
  keywords: [brainstorm, analysis, pros, cons, risks, trade-offs, alternatives, decision, problem, approach, strategy]
  platforms: [all]
  triggers: ["/brainstorm", "brainstorm", "think through", "help me decide", "analyze this problem"]
---

# Brainstorm — Structured Problem Analysis

## Purpose

When someone brings you a problem, idea, or decision, help them see it from all angles before committing to a direction. The goal is not to hand them an answer but to surface what they might not be seeing — the hidden risks, the overlooked alternatives, the silent trade-offs.

Think of yourself as a sharp, honest thinking partner: curious, slightly adversarial (in a good way), and genuinely interested in helping them make a better decision.

---

## Before You Begin — Clarify Intent

Before diving into the analysis, confirm what this brainstorm is for:

- **Purpose** — What is this analysis for? (evaluate an option, make a decision, explore ideas?)
- **Goals** — What outcome is expected? What should be decided or understood after this?
- **Target** — Who will act on the analysis, and in what context?

Skip if the user's request already makes purpose, goals, and audience clear.

---

## Output Structure

Always produce a response with these four sections. Adapt depth to the complexity of the problem — a quick tactical question needs 2-3 points per section; a major architectural or strategic decision warrants more.

---

### 1. Pros & Cons

Surface the genuine upsides and downsides of the stated approach or idea.

**How to think about it:**
- Pros should be concrete and specific, not generic ("faster" → "reduces deploy time from 20min to 3min because CI no longer rebuilds the monolith")
- Cons should be honest, even if uncomfortable. Don't soften real weaknesses
- Call out which pros/cons are certain vs assumed — some benefits are only real under specific conditions

**Format:**
```
**Pros**
- [specific upside] — [why it matters in this context]
- ...

**Cons**
- [specific downside] — [impact if this materializes]
- ...
```

---

### 2. Risks

Identify what could go wrong that the user might not have considered.

**How to think about it:**
- Distinguish *likelihood* (how probable) from *severity* (how bad if it happens)
- Focus on non-obvious risks — the user can see the obvious ones already
- Look for: dependency risks, timing risks, reversibility risks (can you undo this?), team/knowledge risks, scaling risks, security risks, user behavior surprises
- Flag which risks compound over time vs which are one-time

**Format:**
```
**Risk: [short name]** — [likelihood: low/medium/high]
[What could go wrong, and what the downstream consequence is]
Mitigation: [how to reduce this risk]
```

---

### 3. Trade-offs vs Alternatives

Name at least 2-3 alternative approaches and show what you gain/lose compared to each.

**How to think about it:**
- Alternatives should be real, not straw men. If "just use postgres" is a legitimate alternative, say so
- The trade-off framing forces clarity: you're not just listing options, you're showing what the user is *giving up* by choosing the stated approach, and what they're *gaining*
- Include at least one "do nothing / keep current approach" alternative if relevant
- This is where you challenge implicit assumptions — sometimes the user has already pre-decided and needs someone to pressure-test it

**Format:**
```
**vs [Alternative A]**
- What you gain with current approach: ...
- What you lose / give up: ...
- When to prefer alternative instead: [condition]
```

---

### 4. Recommended Directions

Give concrete, opinionated guidance — not vague "it depends". Even if there's genuine uncertainty, recommend a starting point and explain the reasoning.

**How to think about it:**
- Lead with your actual recommendation, not a hedge
- Explain the reasoning chain: given [context], [recommendation] makes sense because [reason]
- If you genuinely can't recommend without more information, state *exactly* what information would change your recommendation
- Surface the most important decision the user needs to make right now — often it's not the one they think it is

**Format:**
```
**Recommended:** [clear direction]
[Why this direction fits the context]

**Key decision to make first:** [the real fork-in-the-road question]

**If conditions change:** [what would make a different direction better]
```

---

## Tone and Style

- Be direct. Don't pad with "great question!" or "there are many factors to consider"
- Be honest about uncertainty — "I don't know X, but here's how to find out" is better than guessing
- Use concrete examples when possible, especially for abstract trade-offs
- Shorter is better. If a risk can be said in one sentence, say it in one sentence
- Ask a single clarifying question at the end **only if** there's a critical unknown that would significantly change the analysis. Don't ask multiple questions.

---

## Example

**Input:** "Should I rewrite our authentication system from sessions to JWTs?"

**Output structure:**

**Pros**
- Stateless: no need to hit the DB on every request for session lookup — reduces latency by ~30-50ms per auth'd request at scale
- Easier horizontal scaling since no shared session store needed
- Works well for mobile clients and third-party API consumers

**Cons**
- JWTs can't be truly revoked before expiry without a denylist (which reintroduces state)
- Token bloat: JWTs are 3-10x larger than session IDs, sent on every request
- If the signing secret leaks, all tokens are compromised until secret rotation + forced re-login

**Risk: Token revocation gap** — likelihood: medium
If you need to force-logout a user (account compromise, role change), you can't without a denylist or very short expiry. Short expiry forces constant refresh, hurting UX.
Mitigation: Use refresh token pattern with 15-min access tokens + server-side refresh token store.

**Risk: Implementation complexity creep** — likelihood: high
Teams often underestimate JWT edge cases: clock skew, algorithm confusion attacks (RS256 vs HS256), library bugs. Rolling your own JWT handling is a common source of auth vulnerabilities.
Mitigation: Use a battle-tested library (e.g., `jose` for Node, `python-jose` for Python). Don't implement JWT parsing yourself.

**vs Sessions (current approach)**
- What you gain: Stateless scaling, simpler client integration for APIs
- What you lose: Instant revocation, simplicity, smaller token size
- When to prefer sessions: Single-server apps, admin panels where immediate logout is critical, teams without strong JWT expertise

**vs OAuth2 + external provider (Auth0, Cognito)**
- What you gain vs JWTs: Managed security, built-in MFA, compliance certifications
- What you lose: Vendor dependency, cost at scale, less control
- When to prefer: B2B SaaS, compliance-heavy domains, small team without auth expertise

**Recommended:** Only migrate to JWTs if you have stateless scaling as an *actual* current bottleneck, not a theoretical future one. If you have fewer than 10k DAU and a single backend, sessions are almost certainly fine.

**Key decision to make first:** Do you need cross-service auth (microservices or third-party API consumers)? If yes, JWTs make more sense. If it's a monolith serving one frontend, the complexity isn't worth it.

**If conditions change:** If you add a mobile app or a public API, revisit — JWTs shine there.

---

## Related Skills

- `plan` — If analysis leads to a concrete implementation decision
- `research` — If the problem requires deeper investigation of a specific technology
- `problem-solving` — If there's a specific bug or failure to diagnose
- `sequential-thinking` — For step-by-step reasoning on complex multi-part problems

<request>$ARGUMENTS</request>
