---
name: docs-component
description: "Document a design-system component (Figma data + prop mapping)"
user-invocable: false
disable-model-invocation: true
metadata:
  argument-hint: "<componentKey> [nodeId]"
  connections:
    requires: [web-ui-lib, figma]
---

# /docs-component

Document a design-system component by extracting Figma data and creating prop mappings.

## Usage

```
/docs-component <componentKey> [nodeId]
```

## Arguments

- `componentKey` (required): Component identifier (e.g., `button`, `select`, `dialog`)
- `nodeId` (optional): Figma node ID. If not provided, will be looked up from manifest or user will be prompted.

## Examples

```bash
# Document a component (nodeId from manifest)
/docs-component button

# Document with explicit Figma node ID
/docs-component select 207:134939

# Batch document all pending components
/docs-component --batch

# Batch document components in a category
/docs-component --batch forms
```

## Process

1. **Route**: Command routes to `docs-manager`
2. **Detect**: Documenter detects design-system context
3. **Delegate**: Delegates to `developer` with:
   - `componentKey`: The component to document
   - `workflow`: `document-component`
4. **Execute**: Implementer follows `ui-lib-dev/references/document-component.md` skill aspect:
   - Extract Figma data via `figma/references/extraction-procedure.md`
   - Cross-reference with codebase
   - Write `<componentKey>.figma.json`
   - Write `<componentKey>.mapping.json`
   - Update manifest status
   - Validate against schemas

## Output

- `libs/{design-system}/figma-data/components/<componentKey>.figma.json` — Figma component data
- `libs/{design-system}/figma-data/mappings/<componentKey>.mapping.json` — Prop mappings
- `libs/{design-system}/figma-data/manifest.json` — Updated status

## Related

- Skill: `.agents/skills/ui-lib-dev/references/document-component.md`
- Extraction: `.agents/skills/figma/references/extraction-procedure.md`
- Manifest: `libs/{design-system}/figma-data/manifest.json`
- Schemas: `libs/{design-system}/figma-data/schema/`
