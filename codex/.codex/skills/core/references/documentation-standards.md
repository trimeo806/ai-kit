---
name: documentation-standards
description: Formatting and structure requirements for all documentation.
---

# Documentation Standards

## Purpose

Standards for creating, formatting, and maintaining documentation files to ensure consistency, scannability, and token efficiency.

## Table of Contents

- [Formatting Rules](#formatting-rules)
- [Required Structure](#required-structure)
- [Skill Structure Compliance](#skill-structure-compliance)
- [Content Guidelines](#content-guidelines)
- [Size Limits](#size-limits)
- [Auto-Update Behavior](#auto-update-behavior)

## Formatting Rules

> These rules apply to documentation files. Agent response formatting is defined in `.codex/output-styles/`.

**Style:**
- **Tables** not paragraphs
- **Bullets** not sentences
- **Keywords** not full explanations
- **Numbers** not words ("16px" not "sixteen pixels")

**Target:**
- Keep component docs under 3KB each
- Short, keyword-rich, scannable content
- Token-efficient writing

## Required Structure

**All documentation files must include:**

1. **Purpose** (top of file)
   - Brief description of file contents

2. **Table of Contents**
   - Anchored links (`#section-name`)

3. **Related Documents**
   - Relative paths to related files
   - Brief description of relationship

4. **Content Sections**
   - Use `##` for main sections
   - Use `###` for subsections
   - Maintain heading hierarchy

## Skill Structure Compliance

**agentskills.io Standard** (mandatory as of 2026-02-10):

All skills MUST follow this directory layout:

```
skill-name/
├── SKILL.md              # ONLY .md file in root
├── references/           # All other .md files go here
│   ├── pattern-one.md
│   └── pattern-two.md
├── assets/               # .json, templates, config (optional)
│   └── schema.json
└── scripts/              # Executable .sh/.py/.js (optional)
    └── validate.sh
```

**Compliance Rules:**

| Rule | Requirement | Example |
|------|-------------|---------|
| Name field | Lowercase + hyphens only (NO `/`) | `arch-cloud` ✓, `arch/cloud` ✗ |
| SKILL.md location | Skill root directory ONLY | `skill-name/SKILL.md` ✓ |
| Aspect files (.md) | `references/` subdirectory | `references/patterns.md` ✓, `patterns.md` ✗ |
| Data files (.json) | `assets/` subdirectory | `assets/schema.json` ✓, `schema.json` ✗ |
| Scripts (.sh/.py/.js) | `scripts/` subdirectory | `scripts/validate.sh` ✓, `validate.sh` ✗ |

**Directory vs Name:**
- Directory path: `skills/muji/klara-theme/` (nested OK)
- Name field: `muji-klara-theme` (flattened required)

**Migration Context:**
- Feb 2026: Migrated 18 of 36 tri-ai-kit skills to this structure
- Script: `scripts/migrate-skills.mjs` for batch compliance
- All new skills MUST start compliant (no migration needed)

## Content Guidelines

**Documentation content:**
- Exact specs: dimensions, tokens, effects
- Cross-reference links (relative paths)
- Concrete examples or referenced files
- Avoid vague guidance

**Code examples:**
- Use code references for existing code (`startLine:endLine:filepath`)
- Use markdown code blocks for new/proposed code
- Include minimal necessary context

**Rule generation:**
- Keep rules under 500 lines
- Split large rules into composable modules
- Provide concrete examples
- Write like clear internal docs

## Size Limits

| Content Type | Limit |
|--------------|-------|
| Component docs | Under 3KB |
| Rule files | Under 500 lines |
| Memory files | Under 2KB (consolidate when exceeded) |

**When limits exceeded:**
- Split into multiple files
- Consolidate redundant information
- Remove outdated content
- Prioritize actionable information

## Auto-Update Behavior

**When using Context7 or external sources:**
- If any MD file contains outdated information discovered via lookup, **automatically update** without asking
- Update related files that reference the outdated information
- Preserve file structure and formatting while updating content
- Update cross-references and line numbers in TOC if content shifts

**Update triggers:**
- Context7 query reveals newer API patterns or best practices
- Documentation references deprecated methods or outdated examples
- Related files contain stale references to updated content

**Update process:**
1. Identify outdated content via external lookup
2. Locate all MD files containing the outdated information
3. Update content to reflect latest information
4. Update cross-references and TOC line numbers
5. Verify formatting consistency
6. Brief confirmation required for content changes (per `decision-boundaries.md`). Auto-update without asking only for: formatting fixes, TOC updates, broken link repairs

## Related Documents

- `SKILL.md` — Core rules index
- `decision-boundaries.md` — When auto-updates are allowed
