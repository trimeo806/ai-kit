# Skill Template

**Purpose:** Scaffold for creating new agentskills.io-compliant skills.

## Usage

```bash
# Copy template to create new skill
cp -r templates/skill-template/ packages/[package-name]/skills/[skill-name]/

# Update SKILL.md:
# - Replace 'skill-name' with actual skill name (lowercase-hyphens)
# - Update description with specific trigger phrases
# - Fill in workflow steps and best practices

# Create additional directories as needed:
mkdir -p packages/[package-name]/skills/[skill-name]/assets    # For .json, templates
mkdir -p packages/[package-name]/skills/[skill-name]/scripts   # For .sh/.py/.js
```

## agentskills.io Compliance

This template follows agentskills.io standard (2026-02-10):

✅ SKILL.md in root (only .md file in root)
✅ references/ for aspect .md files
✅ Name field: lowercase-hyphens (no `/`)
✅ Ready for assets/ and scripts/ (create as needed)

## Directory Structure

```
skill-template/
├── SKILL.md              # Main skill file (required)
├── references/           # Aspect files (required, even if empty)
│   ├── .gitkeep
│   └── patterns.md       # Example reference file
└── README.md             # This file (delete after copying)
```

**Optional directories** (create when needed):
- `assets/` - .json schemas, templates, config files
- `scripts/` - Executable utilities (.sh, .py, .js)

## After Copying

1. Delete this README.md
2. Update SKILL.md frontmatter (name, description)
3. Fill in skill content
4. Add reference files to references/
5. Add assets/ and scripts/ as needed
6. Test skill triggers correctly
7. Update package.yaml `provides.skills` array

## Related Documents

- `packages/meta-kit-design/skills/agents/claude/skill-development/SKILL.md` - Full skill development guide
- `packages/core/skills/core/references/documentation-standards.md` - Documentation standards
