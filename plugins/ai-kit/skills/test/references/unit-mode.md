# Unit mode

Fast, isolated tests of one unit — a function, hook, component, route handler, service or class —
with its collaborators at the edges replaced. They should run in seconds and fail with a message
that names the broken behavior.

## 1. Find the runner and the single-file command

The repo's Commands section names the single-test command; use it. Without one, detect it:

| Stack | Signal | Run one file |
| :-- | :-- | :-- |
| Nx + Jest | `jest.config.ts` with `getJestProjects()`, `jest.preset.js` | `npx jest --runTestsByPath "<path/to/file.spec.ts>"` from the repo root; or `npx nx test <project> --testFile=<file>` |
| Jest | `jest.config.*` | `npx jest --runTestsByPath "<path>"` |
| Vitest | `vitest.config.*` | `npx vitest run <path>` |
| Maven + JUnit 5 | `pom.xml`, `src/test/java` | `./mvnw test -Dtest=<ClassName>` (or `<ClassName>#<method>`) |
| Gradle | `build.gradle*` | `./gradlew test --tests <fqcn>` |
| pytest | `pytest.ini`, `pyproject.toml` | `pytest <path>::<test>` |
| Go | `go.mod` | `go test ./<pkg> -run <TestName>` |

A bare `npx jest <path>` treats the path as a regex. Next.js route folders like `[locale]` and
`(auth)` are regex syntax, so the bare form silently matches no tests — `--runTestsByPath` takes
the path literally. In a multi-repo workspace, run inside the repo that owns the test. On Windows, use `mvnw.cmd` /
`gradlew.bat` outside a POSIX shell.

## 2. Mirror the closest sibling test

Before writing, open the nearest existing test for the same kind of unit (another hook, another
route handler, another service) and copy its setup: render helpers, providers, mock factories,
test data builders, framework test annotations vs plain JUnit.

File naming and location come from the repo's Testing section first, then from existing files —
old code often predates the rule. When the rule and old files disagree, adding cases to an existing
file for the same unit is fine; a *new* file follows the rule. Common defaults when no rule exists:
- JS/TS: beside the source or a `tests/` mirror, whichever the repo already uses.
- Java: `src/test/java/<same package>/<Class>Test.java`.

## 3. Choose the cases

Cover behavior, starting with what the change is about:

- **Happy path** — the main input and its expected output or rendered result.
- **Boundaries** — empty, zero, one, max, off-by-one, missing optional field.
- **Error paths** — thrown errors, rejected promises, non-2xx responses, validation failures;
  assert the error the caller sees.
- **Branches the change added** — each new `if`, `switch` arm or early return.
- **State transitions** — for hooks/reducers/state machines, each transition including error and
  timeout.
- **Regression** — for a bug fix, the exact input that broke, named after the bug.

Skip tests that only restate the implementation (asserting a mock was called with the same
arguments the code obviously passes) unless that call *is* the behavior (e.g. "sends the audit
event").

## 4. Write it well

- **Name the behavior:** `returns empty list when tenant has no contacts`,
  `shows error banner when upload fails`. One behavior per test.
- **Arrange / Act / Assert**, visibly separated. Keep each test readable on its own; a little
  duplication beats a maze of shared `beforeEach` state.
- **Mock at the boundary, not inside.** Mock HTTP (`fetch`, `FetchBuilder`, REST clients), DB
  repositories, clocks, randomness and env — not the unit's own helpers. Over-mocking makes tests
  pass while production breaks.
- **React components:** React Testing Library. Query by role and accessible name
  (`getByRole('button', { name: /save/i })`), then label, then text; `data-testid` last. Drive
  with `userEvent`, await with `findBy*` / `waitFor`. Assert what the user sees, not state or
  props.
- **Hooks:** `renderHook` with the same providers the app uses.
- **Next.js route handlers:** call the exported handler with a constructed `Request`; assert
  status, body and that auth wrappers reject when they should.
- **Java:** plain JUnit 5 + Mockito for pure logic; a framework-booting test (`@SpringBootTest`,
  `@QuarkusTest`, …) only when wiring matters. AssertJ-style assertions if the repo uses them. Test the transactional or N+1-prone
  path with realistic data sizes when that's the risk.
- **Deterministic:** fake timers or injected clocks; fixed seeds; no network; no reliance on test
  order.

## 5. Run and read the result

1. Run the new tests before the implementation exists (or with the bug present): they must fail
   for the expected reason. A failure from a typo or missing import isn't RED — fix and rerun.
2. After the implementation: the targeted files pass. Show the command and the summary lines.
3. Flaky (passes on rerun)? Treat as a bug: find the shared state or timing assumption. Don't add
   retries.

## Anti-patterns

| Smell | Why it hurts | Instead |
| :-- | :-- | :-- |
| Snapshot of a whole component | Passes any change after `-u`; reviews nothing | Assert the specific text/role/state that matters |
| Testing private functions or internal state | Breaks on refactor, misses real bugs | Test through the public API |
| `expect(true).toBe(true)`, assertions in `catch` only | Can't fail | Assert the outcome; `expect(...).rejects` |
| Mocking the module under test | Tests the mock | Mock its dependencies |
| `setTimeout`/`sleep` to wait | Flaky, slow | `findBy*`, `waitFor`, fake timers |
| One test checking five behaviors | First failure hides the rest | Split |
