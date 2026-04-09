# Cook Parallel Mode

Parallel implementation — split multi-module features across independent subsystems.

<feature>$ARGUMENTS</feature>

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task.

## Process

1. **Analyze** — identify independent modules/subsystems in the feature
2. **Split** — create task groups that can be implemented in parallel
3. **Implement** — execute each group with separate agents simultaneously
4. **Integrate** — connect the independently built modules
5. **Test** — run integration tests across modules

## Quality Gates

1. **Type Check**: No compilation errors across all modules
2. **Test Execution**: All unit + integration tests pass

## Rules

- Always write tests for new code
- Module interfaces must be clearly defined before parallel work
- Integration tests required after combining modules
