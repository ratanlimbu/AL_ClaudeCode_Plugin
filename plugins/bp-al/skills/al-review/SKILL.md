---
name: al-review
description: Stage 3 of the bp-al pipeline — verify an AL change against its spec independently, re-running the build, recomputing the warning delta, and checking criteria, forbidden patterns, hotspots and reachability. Blocking versus advisory follows the profile's policy block. Used by /bp-al:review and /bp-al:go, and in no-spec mode by /bp-al:check.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash, Agent, Task
---

# Stage 3 — review

You verify the result. **Not the reasoning** — the result.

## Where the work happens

- **`product` tier** — dispatch the `bp-al:al-reviewer` agent. Give it the repository root,
  the spec, the warning baseline and how to obtain the diff. **Do not give it the
  implementer's transcript**, or a summary of one, or your own account of why a choice was
  made. If the reviewer can see the reasoning, it reviews the reasoning.
- **`customisation` tier** — a review pass in this context. The independence is weaker and
  you say so in the verdict; the alternative on a three-object change is a subagent that
  costs more than the change did.

## Checks — each performed, not accepted

1. **Re-run the build yourself.** Do not trust a reported exit code, including one written a
   moment ago in this conversation.
2. **Recompute the warning delta** against the baseline. If no baseline exists, report
   `UNVERIFIED` for warnings rather than a number you inferred.
3. **Every acceptance criterion, one at a time** — `MET`, `NOT MET` or `UNVERIFIED`, each with
   file:line evidence. A criterion you could not check did not pass.
4. **`forbidden` patterns over the diff.** Every hit is a `forbidden` finding.
5. **Performance** (`performance`), as a dimension in its own right — load the `performance`
   theme from `bp-al:al-conventions` and check the diff against it. Slow AL compiles and
   passes tests; nothing else in this pipeline catches it.
6. **Hotspots** (`hotspot`) — any `hotspots` glob the diff touches is flagged for human
   review whether or not you found anything wrong there.
7. **Reachability** (`reachability`) — every new object and public procedure needs a call
   path, a subscription, an interface implementation, or an exemption below. Follow the chain
   back to an entry point.
8. **Scope** (`scope`) — anything in the diff that no criterion asked for.
9. **Tests** — if `tests.runCommand` is set, run it and report the result. If a test app is
   present and there is no run command, report `present, not run`. Never infer a test result.

### Why reachability is its own check

A complete, correct, reviewed object that **nothing calls** compiles clean, raises no warning,
and passes every mechanical check a repository normally has. Static analysis flags an unused
local variable, not an uncalled object; an internal one raises nothing at all. Documentation
describes the intended pipeline while the code runs a shorter one, and nothing compares the
two. **This check is the comparison.** Do not shorten it.

#### Public surface is not unreachable

Some AL is uncalled inside the repository **by design** — it exists for the platform or for a
consumer you cannot see. Report these as `PUBLIC SURFACE`, not `UNREFERENCED`, and do not ask
for a note:

- `[IntegrationEvent]`, `[BusinessEvent]` and `[InternalEvent]` publishers
- `[EventSubscriber]` procedures, and `[Test]` and handler procedures — the platform calls them
- codeunits with `Subtype = Install` or `Subtype = Upgrade`
- `PermissionSet` and `PermissionSetExtension` objects
- pages with `PageType = API` and queries with `QueryType = API`
- procedures implementing an `interface` the object declares
- public surface of an app that declares `internalsVisibleTo`, or that another app in this
  repository depends on — its callers are outside what you can grep

Everything else still needs a call path. **An exemption is a category, not a judgement call**:
if a new codeunit is not on that list, it is `UNREFERENCED`, whatever it looks like it is for.

## No-spec mode — `/bp-al:check`

`/bp-al:check` runs these checks against a diff that has no contract behind it. Everything
above applies except the two checks that need one:

- **Criteria** — there are none. Report `no spec` on that line. Do not invent criteria from the
  diff and then mark them met; a criterion derived from the code it is checking is a tautology
  with a tick beside it.
- **Scope** — unreportable for the same reason. Nothing said what the change was for.

Every other check runs unchanged, and the verdict rules are unchanged. `VERIFIED` in this mode
means *nothing blocking was found in this diff*, and **not** that the change is right — nobody
said what right was. Say that in the output rather than leaving the word to carry a weight it
cannot.

No-spec mode never gates. It is a report.

## The verdict follows the profile's policy, not your judgement

Tag every finding with one of the nine categories, then read `policy` from the profile.
`blockOn` categories decide the verdict; `advisory` categories are reported and counted and do
not. If the profile has no `policy` block, use the `al-profile` defaults and say you did.

| Category | A finding here is |
|---|---|
| `error` · `forbidden` · `criterion-not-met` · `warning-delta` | blocking by default |
| `scope` · `reachability` · `performance` · `hotspot` · `style` | advisory by default |

**Advisory is not silent.** Every finding is reported at full detail with its category,
whichever list it is in. The policy decides what stops the pipeline, never what you look for
or what you say. Downgrading a finding you were asked to report is the one thing this stage
cannot do and remain worth running.

Never re-tag a finding to change the outcome. If `forbidden` blocks and you think it should
not, say so in `NOTES` — the profile is the human's to edit, not yours.

## Out

```
BUILD        <exit code from YOUR run, and the command>
WARNINGS     <baseline -> after, recomputed | UNVERIFIED + reason>
TESTS        <run + result | present, not run | none present>
CRITERIA     <each: MET | NOT MET | UNVERIFIED — evidence>
BLOCKING     <file:line  category  defect  how it fails, concretely>
ADVISORY     <same shape; "none" if none>
HOTSPOTS     <each hotspot glob touched>
REACHABILITY <each new object/procedure: call path, PUBLIC SURFACE, or UNREFERENCED>
OVERRIDES    <where project authority overrode the baseline>
VERDICT      VERIFIED | BLOCKED | UNVERIFIED
BECAUSE      <for BLOCKED, which blocking findings; for UNVERIFIED, what could not be
              checked and why>
```

Three verdicts, tested in this order — the first that applies wins:

1. **`UNVERIFIED`** — a check could not run at all: no `build.command`, no warning baseline,
   a criterion nothing could decide, or `policy.requireTests` is `true` and the tests were not
   run. Uncertainty outranks everything; you cannot block on what you did not see.
2. **`BLOCKED`** — every check ran, and at least one finding sits in a `blockOn` category, or
   a criterion is `NOT MET`.
3. **`VERIFIED`** — every check ran, every criterion is `MET`, nothing blocking stands.
   Advisories may exist; list them.

**Say what is true.** With `requireTests: false` a change can be `VERIFIED` while its tests
never ran — so `TESTS` is on the report whatever the policy says, and "compiles and was
reviewed" never gets written as "passes".
