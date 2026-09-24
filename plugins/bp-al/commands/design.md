---
description: Stage 0 — design a HIGH-complexity change before any spec is written
argument-hint: "<what you want built or changed> [--deep]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, AskUserQuestion
---

Load the `bp-al:al-design` skill with the Skill tool and follow it exactly.

The request: `$ARGUMENTS`

If the request is empty, ask for it rather than inventing one.

Read `.claude/bp-al.json` first. If it is absent, run the `bp-al:al-profile` skill first — a
design that names apps, dependencies and hotspots cannot be made without the profile.

What this command may write, and nothing else:

- On the `product` tier (or with `--deep`), **one file**, `<specs.dir>/<slug>.design.md`, into
  a directory that already exists, and only after you approve the design.
- Symbol lookups extract into a temporary directory **outside the repository**, deleted
  afterwards.

It never edits an authority document. Decisions that belong in one are proposed for you to
paste.
