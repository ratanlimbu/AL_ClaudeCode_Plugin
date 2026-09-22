---
name: al-appsource
description: Report how ready a Business Central app is for AppSource submission — manifest completeness, affix coverage, ID ranges, breaking changes, obsolete discipline, translations, permission sets, dependencies and telemetry. Reports only; never gates, never writes. Used by /bp-al:appsource.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash
---

# AppSource readiness

You produce a status report. **You write nothing and you gate nothing.**

Most of what fails a submission fails it silently during development: the affix that covers the
objects but not the fields, the translation file nobody regenerated, the permission set that
exists but grants nothing. None of it breaks a build. All of it is cheap now and expensive the
week you submit.

## Mark each check, and do not round up

`OK` · `GAP` (found, with what and where) · `UNVERIFIED` (could not be checked, with why).

**`UNVERIFIED` is not a soft `OK`.** The breaking-change check is the one that most often
cannot run, and it is also the one whose failure costs a version number — so it is reported as
what it is rather than left off the list.

## 1 — Manifest

Read each app's `app.json`. Report every field that is missing or empty:

`id` · `name` · `publisher` · `brief` · `description` · `version` · `privacyStatement` ·
`EULA` · `help` · `url` · `logo` · `contextSensitiveHelpUrl` · `application` · `platform` ·
`runtime` · `idRanges` · `target`

`brief` has a length limit and is the line shown in search results; a `brief` that duplicates
`name` is a gap worth reporting even though it is populated. The URL fields must resolve —
check they are not placeholders from a template.

`target` is `Cloud` for AppSource. `OnPrem` does not submit.

## 2 — Affix and prefix coverage

From `AppSourceCop.json`: `mandatoryPrefix` or `mandatoryAffixes`. If neither is set, that is
the first gap and every check below it is weaker.

Coverage is **not just object names**. Report misses in each of: object names · field names ·
field groups · keys · actions · page controls and groups · permission set names · enum values
you added to an existing enum · report layouts · profile names.

Fields and actions added to *base* objects are the usual miss — a table extension's own name
carries the affix while the fields inside it do not, and nothing in a normal build says so.

## 3 — ID ranges

Every object ID sits inside one of the app's declared `idRanges`. No two apps in the repository
claim the same ID. Report each object outside its range with the range it should be in.

A range large enough today is a range someone widens under pressure later; report how much of
each range is used, not just whether it fits.

## 4 — Breaking changes

This is the check that costs most when skipped, and the plugin does not reimplement it:
AppSourceCop does it, given the previously published version to compare against.

- `AppSourceCop` present in `al.codeAnalyzers` → otherwise `GAP`, and everything the cop would
  have caught is unchecked.
- `appsource.previousVersionPath` set and the file present → otherwise `UNVERIFIED`, and say
  plainly that no breaking-change analysis has run on this app at all.
- With both: report that the build must be run with the previous version available, and what
  the cop reported when it was.

Consult the `upgrade` theme in `bp-al:al-conventions` for what counts as breaking and for the
two-version obsolete path out of it.

## 5 — Obsolete discipline

Every `ObsoleteState = Pending` carries `ObsoleteReason` and `ObsoleteTag`. Report any that do
not.

Anything at `ObsoleteState = Removed` that was never shipped as `Pending` is a breaking change
wearing a deprecation's clothes — report it as such, whatever its reason says.

## 6 — Translations

- `"features": ["TranslationFile"]` in `app.json`, or captions are not extracted at all.
- The generated base `.xlf` is current: if the change added user-facing text and the base file
  does not contain it, the file was not regenerated.
- One `.xlf` per language the listing claims to support, each with no empty or missing
  `<target>`.
- `Locked = true` on labels that must not be translated — codes, URLs, format strings.

A string literal passed to `Error()` or `Message()` never reaches a translation file at all.
That is a `correctness` finding as well as this one; report it here with its file:line.

## 7 — Permission sets

At least one permission set object, and every new object covered by one. `Assignable = true`
belongs only on the leaf sets a customer actually assigns, never on an intermediate layer.

Count objects against grants and report the difference. Pages, codeunits, reports and queries
raise no analyzer warning when they are missed; only some `tabledata` omissions do.

The `permissions` theme in `bp-al:al-conventions` has the layering rules and the direct-versus-
indirect distinction this check assumes.

## 8 — Dependencies and packaging

- Every dependency is Microsoft's or is itself on AppSource. **A dependency on a per-tenant
  extension cannot ship**, and it is the kind of thing that arrives via a shared library nobody
  thought of as a dependency.
- The shipped app does not depend on a test library, and the test app is not part of the
  submitted artifact.
- `application` and `platform` floors are versions Microsoft still supports.

## 9 — Telemetry

`applicationInsightsConnectionString` in `app.json`. Without it there is no signal from a
production tenant, and the first you hear of a defect is the support ticket.

Report its absence as a gap even though submission does not require it — everything else on
this list is about the submission, and this one is about the year after it.

The `telemetry` theme covers what to emit once it is configured, and the rule that decides most
of it: nothing identifying a customer ever leaves their tenant.

## Out

```
APP          <name, version, target>
MANIFEST     <OK | each missing or placeholder field>
AFFIX        <OK | each miss, with file:line and what kind of element it is>
ID RANGES    <OK | each out-of-range object; then usage per range>
BREAKING     <OK | GAP | UNVERIFIED + why>
OBSOLETE     <OK | each Pending without reason/tag; each Removed that skipped Pending>
TRANSLATION  <OK | each gap>
PERMISSIONS  <objects vs grants, and each uncovered object>
PACKAGING    <OK | each dependency or artefact problem>
TELEMETRY    <OK | absent>
SUMMARY      <count of OK / GAP / UNVERIFIED, and the three gaps worth fixing first>
```

End with the three, ranked by what they cost to fix later rather than by how many there are.
A missing affix on one field and an unrunnable breaking-change check are not the same size of
problem, and a flat list invites treating them as though they were.
