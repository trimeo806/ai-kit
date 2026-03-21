---
name: environment-safety
description: Pre-execution verification and file safety rules.
---

# Environment Safety

## Purpose

Pre-execution verification rules to prevent errors and ensure safe operations in the development environment.

## Table of Contents

- [Pre-Execution Checks](#pre-execution-checks)
- [File Operations](#file-operations)
- [Path Handling](#path-handling)
- [Error Prevention](#error-prevention)

## Pre-Execution Checks

**Before terminal operations:**
- Verify terminal/shell availability
- Check current working directory
- Confirm command exists and is available
- Validate environment variables if required

**Before file operations:**
- Check file/directory existence
- Verify read/write permissions
- Confirm file is not locked or in use
- Validate file format matches operation

## File Operations

**Safe file creation:**
- Check parent directory exists
- Verify no naming conflicts
- Confirm write permissions
- Use relative paths from project root

**Safe file modification:**
- Read file first to understand structure
- Check for existing patterns/conventions
- Verify file is not generated/auto-managed
- Preserve existing structure unless refactoring

**Safe file deletion:**
- Deletion requires approval (see `decision-boundaries.md`)
- Check for dependencies/references
- Verify file is not critical (configs, auth, etc.)
- Confirm with user before proceeding

## Path Handling

**Always use:**
- Relative paths from project root
- Workspace-relative paths for file operations
- Standardized path separators (OS-agnostic when possible)

**Never use:**
- Hardcoded absolute paths
- User home directory assumptions (`~`)
- Platform-specific paths without checks

## Error Prevention

**When checks fail:**
- Provide clear error message
- Explain what was checked
- Suggest resolution steps
- Ask for clarification if needed

**Graceful degradation:**
- Handle missing files gracefully
- Provide alternatives when possible
- Never crash or leave operations incomplete

## Related Documents

- `SKILL.md` — Core rules index
- `decision-boundaries.md` — When to proceed vs ask
