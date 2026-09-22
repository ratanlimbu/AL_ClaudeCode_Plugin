# Warnings: a delta gate, not a count

## Why the gate is a delta

Demanding zero warnings breaks instantly on a brownfield repository that already has
hundreds. Demanding nothing destroys the discipline of one that has none. So **the gate is
the change in warnings, not the total**.

| `build.warningPolicy` | Fails on | Suits |
|---|---|---|
| `no-new` (default) | any warning not in the baseline set | any repository, on any day |
| `zero` | any warning at all | a repository that already holds a true zero |
| `ignore` | errors only — the delta is still reported | a project not ready to care yet |

## The baseline must be captured first

Run the build **before touching anything** and keep the warning set. A delta cannot be
reconstructed from a build you ran only at the end — that gives you the total, which is the
number this gate deliberately ignores.

Compare by identity, not by count. `47 -> 47` hides one warning fixed and a different one
introduced. Match on file, line-adjacent code, rule ID and message.

## No analyzer IDs are bundled

This plugin ships **no hardcoded list of analyzer rule IDs**. Which cops run differs per
project — AppSource versus per-tenant, plus whatever third-party analyzers a team has added —
so a bundled list would be wrong somewhere and stale everywhere.

The codes come from the compiler the project actually runs. The plugin supplies only the
discipline of comparing before with after.

## Check the exit code before reading the warning list

**An error aborts the build before the analyzers finish.** A short warning list after a failed
build is not good news; it is a truncated list. Read the exit code first, every time, and
never report a warning count from a build that did not complete.

## A warning is a finding, not lint

The ones that matter most read as pedantry:

- An unused variable is often a removed feature that left its declaration behind, or a
  dependency someone meant to call and did not.
- An unused parameter on a public procedure is a contract nobody is honouring.
- A shadowed name is a bug waiting for the two meanings to diverge.
- A missing `ApplicationArea` is an object nobody can reach.

Each of those compiles, ships and does nothing visible. That is what makes them worth reading.

## Never suppress to make a gate green

No `#pragma warning disable`, no suppression file entry, no rule downgraded in the ruleset,
to get past this gate. If new code cannot be made warning-free, **report the warning with the
reason** and let the human decide.

A suppression added to pass a gate is a defect in its own right, and it is invisible in every
later build — which is precisely why it is tempting.

## Analyzer coverage is a project decision

If the profile records no analyzers, say so in the report. A build with no cops running
produces a clean warning list that means nothing, and a `no-new` gate over it is theatre.
That is a finding about the project's setup, not about the change — report it once, do not
fix it, and do not edit the project's settings to turn cops on.
