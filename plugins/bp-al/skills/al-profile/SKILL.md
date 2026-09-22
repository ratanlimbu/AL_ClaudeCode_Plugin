---
name: al-profile
description: Detect what a Business Central repository actually is — its apps, prefixes, analyzers, build and test commands, authority documents and tier — and record it in .claude/bp-al.json. Used by /bp-al:scan.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

# Profiling a repository

You describe the repository you found. You do not prescribe one.

**Write exactly one file: `.claude/bp-al.json`.** Create the `.claude` directory if needed.
Create nothing else. Move nothing. Rename nothing. Edit no file you did not create — not
`CLAUDE.md`, not `README`, not `app.json`.

What you cannot determine is `null`. **Never guess a value into the profile**; a wrong build
command or a wrong prefix is worse than an absent one, because every later stage trusts it.

## Detection order

Each step falls through to the next when it finds nothing.

**Apps** — glob `**/app.json`, excluding `.alpackages`, `node_modules`, `.git`, and any
`out`/`bin` directory. Each match is one app. Take `name`, `publisher`, `id`, `idRanges`,
`dependencies`, `internalsVisibleTo` from it. The app's `path` in the profile is the
directory holding `app.json`, relative to the repository root.

**Test apps** — an app is a test app if its `app.json` has `"target": "Test"`, or it depends
on a Microsoft test library (`Library Assert`, `Any`, `Library Variable Storage`,
`Tests-TestLibraries`), or its name matches `*Test*`.

**Prefix / affix** — `AppSourceCop.json`'s `mandatoryPrefix` or `mandatoryAffixes` if present.
Otherwise derive it: list the quoted object names across `.al` files, take the most common
leading token, and only record it if it covers a clear majority. A prefix you had to squint
at is `null`.

**Analyzers** — `al.codeAnalyzers` in `.vscode/settings.json`, plus the presence of
`AppSourceCop.json` or `PerTenantExtensionCop.json`. Record the names, so the warning gate
knows what the compiler will actually emit. **Record no analyzer rule IDs** — see
`al-conventions`, theme `warnings`.

**Build command** — in order: an AL build task in `.vscode/tasks.json`; a `build.ps1` /
`build.cmd` / `build.sh` at the repository root; a resolvable `alc.exe`; otherwise `null`.
**Always show the candidate to the human and get confirmation before writing it.** Build
invocations go stale — compiler paths move between extension versions — so this field is
never inferred silently, even when a candidate looks obvious.

**Tests** — whether a test app exists and its path, then `tests.runCommand`, in order: a task
in `.vscode/tasks.json` whose label or command names tests; an `al-test-runner.*` block in
`.vscode/settings.json`; a `Run-AlTests` / `Invoke-ALTestRunner` / `Run-TestsInBcContainer`
call in a script at the repository root; otherwise `null`.

**Confirm it with the human exactly as you confirm `build.command`, and for the same reason** —
a stale test invocation fails in a way that reads like a broken test suite and is not. A
repository whose tests only run in CI has no local command; that is `null`, not a guess at
what the workflow does.

`null` here is not a failure. It means stage 3 reports `present, not run` instead of a result,
which is the truth.

**AppSource** — `appsource.target` is `appsource` when `AppSourceCop.json` exists or
`AppSourceCop` is in the analyzer list, `pte` when `PerTenantExtensionCop.json` or its cop is,
and `null` when neither says. An app can be heading for AppSource without either; `null` means
undetermined, not "no".

`appsource.previousVersionPath` is the previously published `.app`, without which no
breaking-change analysis can run. Look in `.alpackages` and in `al.packageCachePath` for a
package matching this app's publisher and name at a lower version. **Confirm the candidate with
the human** — a stale previous version silently compares against the wrong thing, which is
worse than comparing against nothing. Otherwise `null`.

**Authority documents** — `CLAUDE.md`, `CONVENTIONS.md`, `ARCHITECTURE.md`, `DECISIONS.md`,
`CONTRIBUTING.md`, and any per-folder architecture notes. Record **paths in precedence
order**, `CLAUDE.md` first. **Record paths, never content.** A copied rule drifts from its
source and is then confidently wrong; a pointer cannot drift.

**Spec directory** — an existing `docs/specs`, then `docs/adr`, then `docs/`. If none exists,
set `specs.mode` to `inline` and `specs.dir` to `null`. **Never create the directory.**

**Tier** — `product` if any of: more than one app; a test app is present; a dependency on a
non-Microsoft app; more than 100 `.al` files. Otherwise `customisation`.

**Hotspots and forbidden** — leave both `[]`. They are yours to fill in; a small project that
leaves them empty loses nothing. Offer one line saying what they are for, and move on.

**Policy** — write the defaults below verbatim. **Detect nothing here**; a strictness setting
inferred from a repository's current state would ratchet a project tighter the cleaner it got,
which is exactly backwards. It starts loose and the human tightens it.

```json
"policy": {
  "blockOn":  ["error", "forbidden", "criterion-not-met", "warning-delta"],
  "advisory": ["scope", "reachability", "performance", "hotspot", "style"],
  "requireTests": false
}
```

Every category sits in exactly one list. The nine are `error`, `warning-delta`, `forbidden`,
`criterion-not-met`, `scope`, `reachability`, `performance`, `hotspot`, `style`. A category in
neither list is a profile error; report it rather than picking one.

`blockOn` decides only **stage 3's verdict**. It does not relax stage 2 — `build.warningPolicy`
still governs the iterate-to-clean loop, and an advisory category is still found, still
reported and still counted. Advisory means *stated, not silenced*.

## Refreshing an existing profile

`scan` is idempotent and **never overwrites a field a human has edited**. When
`.claude/bp-al.json` already exists:

1. Compute what you would detect now.
2. Show every field that differs, as `field: current -> proposed`.
3. Ask which to apply. Apply only those. Leave the rest exactly as they are.

`policy`, `hotspots` and `forbidden` are **never proposed on a refresh**. They hold human
judgement, not detection, and a rescan that re-suggests defaults over them is a rescan that
quietly loosens a project someone deliberately tightened. The one exception: if the category
vocabulary has grown since the profile was written, name the missing categories and ask where
they go — an unassigned category is otherwise invisible.

## Reporting

After writing, report in this shape:

```
TIER        <tier, and which rule selected it>
APPS        <name, path, id range, prefix, test/not — one line each>
BUILD       <the command, and that a human confirmed it | null>
TESTS       <test app path and run command, both confirmed | present, no run command | none>
AUTHORITY   <paths, in precedence order | none found>
SPECS       <mode, dir>
APPSOURCE   <target, and whether a previous version is available to compare against>
POLICY      <blockOn categories; advisory categories; requireTests>
GAPS        <every field left null, and what it costs you>
```

**The `GAPS` section is the point of the report, not a footnote.** A `null` build command
means every later stage returns `UNVERIFIED`; say that in those words rather than leaving the
human to work it out. Then state the one-line uninstall: delete `.claude/bp-al.json`.

`docs/PROFILE.md` in this plugin's repository documents every field and its shape.
