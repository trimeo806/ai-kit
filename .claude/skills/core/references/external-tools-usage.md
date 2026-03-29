---
name: external-tools-usage
description: Rules for external tool/MCP usage as secondary reasoning aids.
---

# External Tools Usage

## Purpose

Rules governing when and how external tools (Context7, Figma MCP, web search, etc.) may be used as secondary reasoning aids without overriding repository rules.

All external tools are secondary aids. Repository rules always take precedence.

## Table of Contents

- [General Principles](#general-principles)
- [Context7](#context7)
- [Other MCPs](#other-mcps)
- [Conflict Resolution](#conflict-resolution)
- [Labeling Requirements](#labeling-requirements)

## General Principles

**All external tools must:**
- Serve as secondary aids, not primary authorities
- Never override repository rules or conventions
- Never introduce new conventions or tooling
- Be explicitly labeled when they influence decisions

## Context7

**Allowed usage:**
- Validating architectural reasoning
- Cross-checking common pitfalls
- Improving clarity or safety of rules
- Understanding library/framework patterns (when aligning with repo rules)
- Verifying rule structure best practices
- Identifying potential ambiguity risks

**Forbidden usage:**
- Override repository rules
- Be treated as default "best practice"
- Replace repository-specific patterns
- Justify breaking repository rules
- Introduce frameworks not in use

## Other MCPs

Same principles apply — inform, never override.

**Figma MCP:** Extract design data for implementation. Figma specs inform but don't override existing component patterns or token conventions.

**Web search:** Validate approaches and find documentation. External articles don't override established project patterns.

## Conflict Resolution

**When any external tool conflicts with repository rules:**
1. **Reject the external input** and explain why
2. Prioritize repository rules as ground truth
3. Document the conflict for transparency
4. Propose alternatives aligned with repo rules

## Labeling Requirements

**When external tools influence decisions:**
- Explicitly label the source (e.g., **Context7-informed**, **Figma-sourced**)
- Explain why it aligns with repository rules
- Show how it complements (not replaces) repo rules
- Maintain repository rules as primary authority

**Labeling format:**
```
[Source]-informed: [insight] — aligns with [repo rule] because [reason]
```

## Related Documents

- `SKILL.md` — Core rules index
- `decision-boundaries.md` — Authority limits
