---
name: al-implement
description: Stage 2 of the bp-al pipeline — write the AL for an approved spec, run the project's own build, and iterate until errors are zero and the warning delta satisfies the profile's policy. Used by /bp-al:implement and /bp-al:go.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Agent, Task, AskUserQuestion
---

# Stage 2 — implement

You implement an **approved** spec. If it has not been approved, stop.

## Where the work happens

- **`customisation` tier** — directly in this context. **No subagents.** The change is small
  enough that isolating it costs more than it saves.
- **`product` tier** — dispatch the `bp-al:al-implementer` agent with the repository root,
  the spec, and the profile contents. It returns the output shape in its own definition.
  Relay that result; do not re-do its work.

`--quick` forces the first, `--deep` the second.

## The warning baseline comes first

**Run `build.command` before touching anything** and record every warning. A delta cannot be
reconstructed afterwards from a build you did not run, and a build run only at the end tells
you the total, which is the number this pipeline deliberately does not gate on.

If `build.command` is `null`: skip it, and know that your verdict is `UNVERIFIED` no matter
how the code turns out.

## Writing the AL

Load `bp-al:al-conventions` and read **only the themes this change touches**. Its index says
which is which; reading the set is a token cost with no benefit.

Precedence, highest first:

1. The project's `forbidden` patterns — absolute, whatever the code's justification.
2. The authority documents the spec names.
3. The shipped AL baseline in `al-conventions`.

**When 2 contradicts 3, the project wins, and you record the override** rather than conforming
silently. Generic Business Central advice is sometimes precisely wrong for a given project —
a helper that is best practice platform-wide can be forbidden where a regulator requires
something else.

Beyond that: match the surrounding code's idiom, naming and comment density. Claim object IDs
by the project's own rule, and **edit the document that records claimed IDs in the same
change** — an unrecorded claim is indistinguishable from a free ID.

## Iterate to clean

Re-run `build.command`. **Check the exit code before reading the warning list** — an error
aborts the build before the analyzers finish, so a short warning list can mean failure rather
than success.

Iterate until errors are zero and the delta satisfies `build.warningPolicy`:

| Policy | Fails on |
|---|---|
| `no-new` | any warning not in the baseline set |
| `zero` | any warning at all |
| `ignore` | errors only; the delta is still reported |

**Never suppress a warning to make the gate go green.** A warning is a finding, not lint. One
you cannot fix is reported with its reason; a pragma that hides it is a defect in its own
right.

The profile's `policy` block governs **stage 3's verdict**, not this loop. Nothing there
relaxes `build.warningPolicy`, and a category marked `advisory` is still fixed here if you
can fix it — advisory decides what stops the pipeline, not what you leave behind.

## Then run the tests

If `tests.runCommand` is set, run it and report what it said. A failing test is a blocking
result here exactly as an error is — the spec is not implemented while its tests are red.

If it is `null`, report `present, not run` or `none present` and move on. **Never infer a test
result**, and never describe a change as tested because its tests exist.

A test you had to change to make pass is a finding about the change, not about the test. Say
which tests you edited and why, in `NOTES`.

## Out

```
FILES        <path — one line each, with what changed>
BUILD        <exit code, and the command actually run>
TESTS        <command, pass/fail counts | present, not run | none present>
ERRORS       <count; then each, file:line + message>
WARNINGS     <baseline -> after>
  NEW        <each warning not in the baseline>
  RESOLVED   <each baseline warning now gone>
IDS CLAIMED  <IDs taken, and where the claim is recorded>
OVERRIDES    <each place the project's authority overrode the baseline>
VERDICT      DONE | BLOCKED | UNVERIFIED
```

## Gate

Stop. The human approves the diff, the build result and the warning delta before stage 3.
