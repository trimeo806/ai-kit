# Code craft — comments, complexity, reuse

Paste this file into every developer and code-reviewer prompt. It binds the code the task writes;
the reviewer grades against it.

The user's standing requirement, in their words:

> "AI lefts a lot of long comments, very specific to the asked problem, these comments are not
> useful for others to read and understand the real idea of, let say this method"
>
> "The generated code violate a lot of Sonar cognatic problems, it's usually too complex,
> duplicated, do not reuse"

Both have one root: code that reads like a transcript of the conversation that produced it. The
file is read by people who never saw the request. **The goal is code that a reader who never saw
the ticket can follow once and trust.**

**Scope.** These rules bind the code this task writes or edits. Simplifying a function you wrote
minutes ago is part of writing it. Restructuring code you did not touch is a drive-by fix and stays
forbidden: log it as an out-of-scope observation. One edge case: if your change pushes an existing
function over the threshold below, that function is yours now.

## Comments

**Default: no comments** unless the user asked for them. A comment that survives must carry what the
code cannot: a constraint from outside the file, a rejected alternative, a workaround for someone
else's bug.

The test: **would this sentence still make sense to someone who has never seen the ticket?** If it
only makes sense to the person who asked, it belongs in the commit body or the step report.

**No doc comments.** No Javadoc, JSDoc/TSDoc, docstrings, KDoc or XML doc in implementation or test
code. The code says it itself: a name, a type or an extracted function replaces the doc block.

**No plan or spec references.** Code, comments, test names, `describe` blocks, `@DisplayName`, log
and error messages never cite the plan, spec, tasks or ticket (`AC-1`, `S2-AC3`, `T1-AC1`, `FR-3`,
`PROJ-123`, "per the spec"). Name tests by the behavior they prove:

```ts
it('S2-AC3 rename folder', ...)                       // means nothing once the plan is gone
it('rejects the rename when the folder is locked', ...) // reads as the behavior it proves
```

The spec point → test link lives in the tracker's AC map and the plan's test plan.

Delete on sight:

```ts
// PROJ-123: add rename support as requested        // git blame already knows this
// We now also handle the private tenant (new)        // "new" is true for about a week
// Updated: previously returned void                  // a changelog; git log has it
// Loop through folders and check each one            // restates the line below
/** Renames a folder. @param id The folder id */      // the signature already says it
```

Keep:

```ts
// The backend returns 409 for both a name clash and a locked folder; only the body
// distinguishes them, so we can't branch on status alone.
```

A comment explaining *what* a block does is a naming problem. Extract instead:

```ts
const visible = folders.filter(isUserEditable);
```

## Complexity: 15 is the trigger, structure is the fix

Keep every function under **cognitive complexity 15** (Sonar's default). Nothing in the toolchain
enforces it here: Sonar is advisory and lint has no complexity rule.

Counting: +1 per `if` / `else` / `for` / `while` / `catch` / `case` group / ternary /
`&&`-or-`||` sequence, **plus one per level of nesting you are already inside**.

- Nesting depth 3 is the ceiling.
- Guards exit early; the happy path is never the innermost block.
- No `else` after `return` or `throw`.
- One concern per function. "It does X *and then* Y": the `and then` is the extraction point.
- No boolean parameters. `submit(true)` is two functions in a trenchcoat.
- A condition with two or more operators gets a name: `if (canManage(folder, user))`.

```ts
async function renameFolder(id: string, name: string) {
  if (!session) throw new UnauthorizedError();

  const folder = await repo.find(id);
  if (!folder) throw new NotFoundError(id);
  if (folder.system) throw new ForbiddenError('system folder');
  if (name.length > MAX_FOLDER_NAME) throw new ValidationError('name too long');

  return repo.rename(id, name);
}
```

Flat guards line up one-to-one with the AC guard scenarios, which makes the AC → test mapping
mechanical.

Past roughly **40 lines, five decisions or three levels of nesting**, either extract the seam you can
name or state why the shape is right. These buy a sentence, not a failed task: a 40-line function
split into two 20-line ones with a single call site is a worse function wearing a better number.

## Search before you write a helper

Before adding any function not specific to this task's domain (formatter, parser, type guard), grep
the concept and two or three likely names, check the `utils/` layer and the sibling's imports.
Something nearly right is a hit: use it as-is. If making it fit would change behaviour for its
existing callers, that is out of scope: log it rather than widening a shared function for one call
site. The expensive failure is **parallel reimplementation**: two functions that agree today and
diverge the day one gets a bug fix. "Did I just rewrite something that exists?" is only answerable
if you searched *before* writing.

## Moves that cost the next reader

| Move | What it costs |
| :-- | :-- |
| A ticket, spec or AC ID in code, a comment or a test name | Pins the file to a tracker nobody opens in two years. |
| "as requested" / "we now" / "new" / "updated" | Narration of a change. Stale by the next commit. |
| A comment restating the line below | Two sources of truth; the reader trusts the wrong one. |
| Any doc comment (Javadoc, JSDoc, docstring) | Repeats the signature and goes stale; a name or type says it instead. |
| A comment apologising for the code | Fix it, or log it as out of scope. |
| A function past ~40 lines or complexity 15 | The reviewer stops reading and starts trusting. |
| A helper written without searching first | Two implementations, one fix. |
| An extra parameter on a shared helper "just for this case" | Every existing caller must be re-read. |

## The Craft line

The developer measures the shape **with the diff still open**, after `simplify`, and reports one
line. It cannot be answered "none":

```
Craft — reuse: <what this task is built on, path:line — or "none" plus what was searched> ·
peak: <worst added/changed function, by name> <lines>/<decisions>/<nesting> · comments added: <n> (<why each>)
```

If simplification changed the shape, show it as before → after:
`peak: 41/9/4 → 18/3/2 (extracted assertSystemFolder)`. A name is something the user can open; a
number alone is easy to guess low.
