# Condition-Based Waiting Patterns

## The Problem

Agents commonly use `sleep` for async operations:
```typescript
// BAD — arbitrary delay, flaky, wastes time
await sleep(5000);
const result = await checkStatus();
```

This fails intermittently: too short on slow systems, wasteful on fast ones.

## The Pattern: Poll with Condition

Replace sleep with condition-based polling:

```typescript
// GOOD — condition-based, deterministic
async function waitForCondition(
  check: () => Promise<boolean>,
  options: { timeout?: number; interval?: number; label?: string } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500, label = 'condition' } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`Timeout waiting for ${label} after ${timeout}ms`);
}

// Usage
await waitForCondition(
  () => fetch('/api/status').then(r => r.json()).then(s => s.ready),
  { timeout: 10000, label: 'API ready' }
);
```

## Shell Pattern: Polling Loop

```bash
# Wait for port to be available
wait_for_port() {
  local port=$1 timeout=${2:-30} elapsed=0
  while ! nc -z localhost "$port" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge $timeout ]; then
      echo "Timeout waiting for port $port" >&2
      return 1
    fi
  done
}

wait_for_port 3000
```

## Flaky Test Isolation: Find-Polluter Script

When tests pass alone but fail in suite, find the polluting test:

```bash
#!/bin/bash
# find-polluter.sh — Binary search for flaky test polluter
# Usage: ./find-polluter.sh "test-that-fails" "test-suite-file"

FAILING_TEST="$1"
SUITE="$2"

# Get all test names
TESTS=$(grep -n 'it\|test(' "$SUITE" | head -50)
TOTAL=$(echo "$TESTS" | wc -l)

echo "Searching $TOTAL tests for polluter of: $FAILING_TEST"

# Binary search: run first half + failing test, then second half + failing test
# Whichever fails contains the polluter
LOW=1
HIGH=$TOTAL

while [ $((HIGH - LOW)) -gt 1 ]; do
  MID=$(( (LOW + HIGH) / 2 ))
  echo "Testing range $LOW-$MID..."

  # Run subset + failing test (implementation depends on test framework)
  # If fails: polluter is in LOW..MID
  # If passes: polluter is in MID+1..HIGH

  # Adjust bounds based on result
  # LOW=$MID or HIGH=$MID
done

echo "Polluter is test #$LOW"
```

## When to Use

- Waiting for server/service startup → poll health endpoint
- Waiting for file creation → poll with `fs.existsSync`
- Waiting for CI job → poll status API
- Waiting for database migration → poll schema version
- NEVER use bare `sleep()` for async coordination

## Anti-Pattern Catalog

| Anti-Pattern | Replacement |
|-------------|-------------|
| `sleep(5000)` then check | `waitForCondition` with 500ms interval |
| `setTimeout` with fixed delay | Event listener or condition poll |
| Retry with fixed sleep | Exponential backoff with jitter |
| `sleep` in test setup | Wait for readiness condition |
| Polling without timeout | Always set max timeout |
