---
description: Report how ready this app is for AppSource submission — never gates, never writes
argument-hint: "[app path, or omit for every app in the profile]"
allowed-tools: Skill, Read, Glob, Grep, Bash
---

Load the `bp-al:al-appsource` skill with the Skill tool and follow it exactly.

Scope: `$ARGUMENTS` — one app path, or every non-test app in the profile when omitted.

Two rules specific to this command:

- **It writes nothing.** Not a fix, not a permission set, not a translation file, not a
  corrected `app.json`. It reports. Submission readiness is a list of decisions someone has to
  make, several of them commercial, and a command that starts editing `app.json` to satisfy a
  checklist is a command that has started guessing at those decisions.
- **It never gates.** There is no verdict, no `BLOCKED`, no exit condition. It is a status
  report you run as often as you like, including on an app that is nowhere near ready — which
  is when it is most useful and when a gate would be most annoying.

Read `.claude/bp-al.json` first. If it is absent, run `bp-al:al-profile` first; without the
profile there is no `appsource.previousVersionPath`, so the breaking-change section reports
`UNVERIFIED` and the most expensive check is the one you skipped.

If the profile's `appsource.target` is `pte`, say so once and run anyway — the checks are still
informative, and an app's target changes.
