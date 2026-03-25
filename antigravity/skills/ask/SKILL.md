---
name: ask
description: Use when user asks questions about the codebase — how does X work, where is Y used, what's the architecture of Z, why is this implemented this way
user-invocable: true
metadata:
  argument-hint: "[question about codebase]"
  agent-affinity:
    - researcher
    - developer
  keywords:
    - ask
    - question
    - how
    - where
    - what
    - why
    - codebase
    - explain
    - understand
    - architecture
  platforms:
    - all
  triggers:
    - /ask
    - how does
    - where is
    - what is
    - explain this
    - why is
---

# Ask — Codebase Q&A

Get answers about your codebase.

## Usage

```
/ask [question]
/ask how does [feature] work?
/ask where is [component] used?
/ask why is [thing] implemented this way?
```

## Process

1. Parse the question from `$ARGUMENTS`
2. Activate `docs-seeker` skill for documentation lookup
3. Search for relevant files:
   - Grep for keyword/symbol search
   - Glob for file patterns
   - Read documentation first (docs/, README.md)
4. Analyze code and architecture
5. Cross-reference with latest docs
6. Formulate comprehensive answer

## Answer Format

- Direct answer first
- Relevant files with clickable paths (file:line)
- Code examples if helpful
- Line numbers for reference

## Common Questions

- How does X work?
- Where is Y used?
- What's the architecture of Z?
- Why is this implemented this way?
- What does this file/function do?

<question>$ARGUMENTS</question>
